/**
 * MoodleSimulator - Contrôleur principal de l'application de simulation de banque Moodle XML
 * Gère l'initialisation, le chargement dynamique du XML, l'état global, la navigation,
 * l'affichage du score, le mode d'édition et la persistance sur disque (/api/save_json).
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  // État global partagé de l'application
  window.quizData = window.quizData || [];
  window.currentIndex = window.currentIndex || 0;
  window.isEditing = window.isEditing || false;
  window.userAnswers = window.userAnswers || {};
  window.validationStates = window.validationStates || {};
  window.isDirty = window.isDirty || false;
  window.modeCorrige = window.modeCorrige || false;
  window.optionsShuffleMap = window.optionsShuffleMap || {};

  var quizData = window.quizData;
  var currentIndex = window.currentIndex;
  var isEditing = window.isEditing;
  var userAnswers = window.userAnswers;
  var validationStates = window.validationStates;
  var isDirty = window.isDirty;
  var modeCorrige = window.modeCorrige;
  var optionsShuffleMap = window.optionsShuffleMap;

  let appConfig = {
    xmlSource: './questions_moodle.xml',
    fallbackData: null,
    container: '#moodleAppRoot',
    title: 'Banque de questions Moodle XML'
  };

  const DEFAULT_LAYOUT = "<!-- EN-T\u00caTE 48px CLAIR CONFORME MOTEUR-UI -->\n  <header class=\"app-header\" role=\"banner\">\n    <div class=\"header-left\">\n      <span class=\"brand-title\">Syst\u00e8me Respiratoire (ST 3\u1d49 secondaire)</span>\n      <span class=\"brand-badge\">Simulateur Moodle XML</span>\n    </div>\n\n    <div class=\"header-right\">\n\n      <button type=\"button\" id=\"btnExportXml\" class=\"btn\" style=\"padding: 0.35rem 0.75rem; font-size: 0.8125rem;\">\n        Exporter XML\n      </button>\n      <button type=\"button\" id=\"btnSaveQuiz\" class=\"btn btn-primary\" style=\"padding: 0.35rem 0.75rem; font-size: 0.8125rem;\">\n        Enregistrer\n      </button>\n      <button type=\"button\" id=\"btnResetQuiz\" class=\"btn\" style=\"padding: 0.35rem 0.75rem; font-size: 0.8125rem;\">\n        R\u00e9initialiser\n      </button>\n      <div style=\"height: 20px; width: 1px; background: var(--border-color); margin: 0 0.25rem;\"></div>\n      <label class=\"moodle-switch-wrap\" for=\"btnToggleEdit\" title=\"Activer / d\u00e9sactiver le mode d'\u00e9dition\">\n        <span class=\"moodle-switch-text\">Mode d\u2019\u00e9dition</span>\n        <span class=\"moodle-switch\">\n          <input type=\"checkbox\" id=\"btnToggleEdit\" role=\"switch\">\n          <span class=\"moodle-switch-slider\"></span>\n        </span>\n      </label>\n    </div>\n  </header>\n\n  <!-- CONTENEUR PRINCIPAL DU SIMULATEUR -->\n  <div class=\"sim-shell\">\n    \n    <!-- NAVIGATION LAT\u00c9RALE DES QUESTIONS -->\n    <aside class=\"sim-sidebar\" aria-label=\"Liste des questions Moodle\">\n      <div class=\"sim-sidebar-header\">\n        <span>Questions (<span id=\"totalQuestionsCount\">0</span>)</span>\n        <span id=\"scoreOverview\" style=\"font-variant-numeric: tabular-nums; font-weight: 700;\">Score: 0 / 0</span>\n      </div>\n      <div id=\"sidebarQuestionsList\" class=\"sim-sidebar-list\">\n        <!-- Rendu dynamique des boutons de questions -->\n      </div>\n    </aside>\n\n    <!-- ZONE CENTRALE D'INTERACTION ET TEST -->\n    <main class=\"sim-content\" id=\"main-content\">\n      <div class=\"sim-card\">\n        \n        <!-- En-t\u00eate de la question (Mode Consultation) -->\n        <div class=\"sim-card-header\" id=\"viewCardHeader\">\n          <div>\n            <div id=\"qTypeBadge\" class=\"moodle-type-badge multichoice\">QCM</div>\n            <h1 id=\"qTitle\" class=\"sim-card-title\" style=\"margin-top: 0.4rem;\">Titre de la question</h1>\n          </div>\n          <div class=\"sim-card-meta\">\n            <span id=\"qPointsBadge\" class=\"brand-badge\">1.0 pt</span>\n          </div>\n        </div>\n\n        <!-- ZONE CONSULTATION & TEST -->\n        <div id=\"viewModeContainer\">\n          <!-- \u00c9nonc\u00e9 / Consigne -->\n          <div id=\"qText\" class=\"sim-enonce\">\n            \u00c9nonc\u00e9 de la question...\n          </div>\n\n          <!-- Composant interactif selon le type de question (1 \u00e0 9) -->\n          <div id=\"qInteractionBox\" class=\"moodle-interaction-box\">\n            <!-- Inject\u00e9 dynamiquement selon type -->\n          </div>\n\n          <!-- R\u00e9troaction Didactique / Validation -->\n          <div id=\"qFeedbackBox\" style=\"display: none;\"></div>\n\n          <!-- Bloc D\u00e9marche Corrig\u00e9e (Mode Corrig\u00e9 ou apr\u00e8s validation) -->\n          <div id=\"qSolutionBox\" class=\"moodle-solution-card\" style=\"display: none;\"></div>\n\n          <!-- Actions de navigation inf\u00e9rieure -->\n          <div class=\"sim-bottom-actions\">\n            <button type=\"button\" id=\"btnPrev\" class=\"btn\">\n              Pr\u00e9c\u00e9dent\n            </button>\n            <div style=\"display: flex; gap: 0.5rem;\">\n              <button type=\"button\" id=\"btnCheck\" class=\"btn btn-primary\">\n                V\u00e9rifier ma r\u00e9ponse\n              </button>\n              <button type=\"button\" id=\"btnFillCorrect\" class=\"btn\" style=\"padding: 0.35rem 0.75rem; font-size: 0.8125rem; background: var(--bg-surface-subtle); border: 1px solid var(--border-color); color: var(--text-main);\" title=\"Compl\u00e9ter toutes les bonnes r\u00e9ponses de cette question (Shift+Clic pour tout le test)\">\n                Compl\u00e9ter toutes les bonnes r\u00e9ponses\n              </button>\n              <button type=\"button\" id=\"btnNext\" class=\"btn\">\n                Suivant\n              </button>\n            </div>\n          </div>\n        </div>\n\n        <!-- ZONE \u00c9DITION EN DIRECT (Affich\u00e9e en Mode \u00c9dition) -->\n        <div id=\"editModeContainer\" style=\"display: none;\">\n          <!-- Inject\u00e9 dynamiquement en mode \u00e9dition -->\n        </div>\n\n      </div>\n    </main>\n  </div>\n  <div id=\"saveToast\"></div>\n\n  \n  <!-- MODAL DE RETOUCHE D'ILLUSTRATION (CANVAS NATIF MOTEUR-UI) -->";

  function setupGlobalControls() {
      document.getElementById('btnPrev').addEventListener('click', () => {
        if (currentIndex > 0) {
          if (isEditing && typeof saveCurrentEditFields === 'function') {
            saveCurrentEditFields();
          }
          loadQuestion(currentIndex - 1);
        }
      });
      document.getElementById('btnNext').addEventListener('click', () => {
        if (currentIndex < quizData.length - 1) {
          if (isEditing && typeof saveCurrentEditFields === 'function') {
            saveCurrentEditFields();
          }
          loadQuestion(currentIndex + 1);
        }
      });
      document.getElementById('btnCheck').addEventListener('click', () => {
        validateCurrentQuestion();
      });
      const btnFillCorrect = document.getElementById('btnFillCorrect');
      if (btnFillCorrect) {
        btnFillCorrect.addEventListener('click', (e) => {
          if (e && e.shiftKey) {
            quizData.forEach(q => {
              fillQuestionCorrectAnswers(q);
              validateQuestion(q);
            });
            loadQuestion(currentIndex);
            renderSidebar();
            updateScore();
            showToast('Toutes les questions du test ont été complétées et validées !');
            return;
          }
          const currentQ = quizData[currentIndex];
          fillQuestionCorrectAnswers(currentQ);
          loadQuestion(currentIndex);
          validateCurrentQuestion();
          showToast('Bonnes réponses complétées et validées !');
        });
      }
      document.getElementById('btnResetQuiz').addEventListener('click', () => {
        if (confirm('Voulez-vous réinitialiser toutes vos réponses de test ?')) {
          for (let k in userAnswers) delete userAnswers[k];
          for (let k in validationStates) delete validationStates[k];
          renderSidebar();
          loadQuestion(currentIndex);
          updateScore();
        }
      });
      
      const editSwitch = document.getElementById('btnToggleEdit');
      if (editSwitch) {
        editSwitch.addEventListener('change', () => {
          toggleEditMode(editSwitch.checked);
        });
      }
      document.getElementById('btnExportXml').addEventListener('click', () => {
        exportMoodleXml();
      });
      document.getElementById('btnSaveQuiz').addEventListener('click', () => {
        saveQuizToDisk();
      });
    }

    function toggleEditMode(forceState) {
      const editSwitch = document.getElementById('btnToggleEdit');
      isEditing = (typeof forceState === 'boolean') ? forceState : (editSwitch ? editSwitch.checked : !isEditing);
      if (editSwitch && editSwitch.checked !== isEditing) {
        editSwitch.checked = isEditing;
      }
      document.body.classList.toggle('edit-mode-active', isEditing);
      document.getElementById('viewModeContainer').style.display = isEditing ? 'none' : 'block';
      document.getElementById('viewCardHeader').style.display = isEditing ? 'none' : 'flex';
      document.getElementById('editModeContainer').style.display = isEditing ? 'block' : 'none';

      if (isEditing) {
        renderEditMode();
      } else {
        loadQuestion(currentIndex);
      }
    }

    function showToast(message) {
      let toast = document.getElementById('saveToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'saveToast';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.style.display = 'flex';
      if (toast._timer) clearTimeout(toast._timer);
      toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 2800);
    }

    function renderSidebar() {
      const list = document.getElementById('sidebarQuestionsList');
      list.innerHTML = '';
      quizData.forEach((q, idx) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'sim-q-item' + (idx === currentIndex ? ' active' : '');
        
        let dotClass = 'status-dot';
        if (validationStates[q.id]) {
          dotClass += validationStates[q.id].isCorrect ? ' correct' : ' incorrect';
        }

        item.innerHTML = `
          <div>
            <span class="${dotClass}"></span>
            <span>${idx + 1}. ${escapeHtml(getCleanTitle(q.name))}</span>
          </div>
          <span class="moodle-type-badge ${q.type}" style="font-size:0.65rem;">${getTypeLabel(q.type)}</span>
        `;
        item.addEventListener('click', () => {
          if (isEditing && typeof saveCurrentEditFields === 'function') {
            saveCurrentEditFields();
          }
          loadQuestion(idx);
        });
        list.appendChild(item);
      });
    }

    
    function getCleanTitle(name) {
      if (!name) return 'Question sans titre';
      return String(name).replace(/^(?:Q\s*\d+|Question\s*\d+|\d+)[\.\s\-:]+/i, '').trim();
    }

    function getTypeLabel(type) {
      const map = {
        'multichoice': 'QCM',
        'gapselect': 'Trous',
        'matching': 'Paires',
        'ddimage': 'Glisser-déposer',
        'ddimageortext': 'Glisser-déposer',
        'ddwtos': 'Glisser-déposer',
        'numerical': 'Numérique',
        'ordering': 'Ordre',
        'truefalse': 'Vrai/Faux',
        'shortanswer': 'Courte',
        'cloze': 'Cloze'
      };
      return map[type] || type;
    }

    // =========================================================================
    // CHARGEMENT EN MODE CONSULTATION / TEST
    // =========================================================================
    function loadQuestion(index) {
      currentIndex = window.currentIndex = index;
      quizData = window.quizData;
      const q = quizData[index];
      if (!q) return;

      // Mise à jour visuelle de la sélection dans la sidebar
      document.querySelectorAll('.sim-q-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });

      if (isEditing) {
        if (typeof renderEditMode === 'function') {
          renderEditMode();
        } else if (window.MoodleEditor && window.MoodleEditor.renderEditMode) {
          window.MoodleEditor.renderEditMode();
        }
        return;
      }

      // Mise à jour de la sidebar
      document.querySelectorAll('.sim-q-item').forEach((el, i) => {
        el.classList.toggle('active', i === index);
      });

      // Badges et titres
      const badge = document.getElementById('qTypeBadge');
      badge.className = 'moodle-type-badge ' + q.type;
      badge.textContent = getTypeLabel(q.type);
      document.getElementById('qTitle').textContent = getCleanTitle(q.name);
      document.getElementById('qPointsBadge').textContent = (q.defaultgrade || 1) + ' pt';
      const conceptBadge = document.getElementById('qConceptBadge');
      if (conceptBadge) {
        const cleanTag = q.tag ? q.tag.trim().split(/\s+/)[0].toLowerCase() : '';
        conceptBadge.style.display = 'inline-block';
        conceptBadge.style.cursor = 'pointer';
        if (cleanTag) {
          conceptBadge.textContent = '#' + cleanTag;
          conceptBadge.title = 'Tag PFEQ : #' + cleanTag + ' — Cliquez pour modifier';
        } else {
          conceptBadge.textContent = '+ Tag PFEQ';
          conceptBadge.title = 'Cliquez pour définir le tag de concept PFEQ';
        }
        conceptBadge.onclick = () => {
          const currentTag = q.tag || '';
          const newTag = prompt('Modifier le tag de concept PFEQ (un seul mot sans espace) :', currentTag);
          if (newTag !== null) {
            const clean = newTag.trim().split(/\s+/)[0].toLowerCase();
            q.tag = clean;
            markDirty();
            renderSidebar();
            loadQuestion(currentIndex);
            const editTagInp = document.getElementById('editQTag');
            if (editTagInp) editTagInp.value = clean;
            showToast('Tag mis à jour : #' + (clean || 'aucun'));
          }
        };
      }

      // Badge ShuffleAnswers
      const shuffleBadge = document.getElementById('qShuffleBadge');
      if (shuffleBadge) {
        if (['multichoice', 'matching', 'ordering', 'gapselect'].includes(q.type)) {
          const isShuffled = q.shuffleanswers !== false;
          shuffleBadge.style.display = 'inline-block';
          shuffleBadge.textContent = isShuffled ? '🔀 Choix aléatoires' : '📋 Ordre fixe';
          shuffleBadge.title = isShuffled ? 'Moodle mélangera aléatoirement les choix (<shuffleanswers>true</shuffleanswers>)' : 'L\'ordre des choix restera fixe dans Moodle (<shuffleanswers>false</shuffleanswers>)';
          shuffleBadge.className = 'shuffle-badge ' + (isShuffled ? 'active' : 'fixed');
        } else {
          shuffleBadge.style.display = 'none';
        }
      }

      // Énoncé
      const qText = document.getElementById('qText');
      if (q.type === 'cloze') {
        qText.style.display = 'block';
        // Rendu interactif visuel des shortcodes Cloze dans l'énoncé
        const renderClozeFn = window.renderClozeInteractiveText || (window.MoodleViewer && window.MoodleViewer.renderCloze);
        if (typeof renderClozeFn === 'function') {
          qText.innerHTML = renderClozeFn(q);
        } else {
          qText.innerHTML = q.questionText || '';
        }
        const attachFn = window.attachClozeEventListeners || (window.MoodleViewer && window.MoodleViewer.attachClozeEventListeners);
        if (typeof attachFn === 'function') {
          attachFn(q, qText);
        }
      } else if (q.type === 'gapselect') {
        // En gapselect, le texte intégrant directement les menus déroulants est affiché dans qInteractionBox
        // Masquage de qText pour éviter la répétition du texte et l'exposition des balises brutes [[1]]
        qText.style.display = 'none';
        qText.innerHTML = '';
      } else {
        qText.style.display = 'block';
        qText.innerHTML = q.questionText || '';
      }

      // Boutons de navigation
      document.getElementById('btnPrev').disabled = (index === 0);
      document.getElementById('btnNext').disabled = (index === quizData.length - 1);

      // Zone d'interaction
      const box = document.getElementById('qInteractionBox');
      box.innerHTML = '';
      if (q.type !== 'cloze') {
        renderInteractionComponent(q, box);
      }

      // Feedback & Solution
      const fbBox = document.getElementById('qFeedbackBox');
      const solBox = document.getElementById('qSolutionBox');

      if (modeCorrige) {
        fbBox.style.display = 'none';
        solBox.style.display = 'block';
        solBox.innerHTML = `
          <strong>Correction et Démarche type :</strong><br>
          <div style="margin-top: 0.5rem;">${q.generalFeedback || 'Aucune rétroaction enregistrée.'}</div>
        `;
      } else if (validationStates[q.id]) {
        showFeedback(validationStates[q.id]);
      } else {
        fbBox.style.display = 'none';
        solBox.style.display = 'none';
      }

      // MathJax re-render
      if (window.MathJax && window.MathJax.typesetPromise) {
        const qTitle = document.getElementById('qTitle');
        window.MathJax.typesetPromise([qTitle, qText, box, solBox, fbBox].filter(Boolean));
      }
    }

    // =========================================================================
    // RENDU DES 9 COMPOSANTS D'INTERACTION EN MODE TEST
    // =========================================================================
    

  function validateCurrentQuestion() {
      const q = quizData[currentIndex];
      const res = validateQuestion(q);
      showFeedback(validationStates[q.id]);
      renderSidebar();
      updateScore();
    }

    function showFeedback(state) {
      const fbBox = document.getElementById('qFeedbackBox');
      fbBox.className = 'moodle-feedback-card ' + (state.isCorrect ? 'correct' : 'incorrect');
      fbBox.style.display = 'block';
      fbBox.innerHTML = `<strong>${state.isCorrect ? 'Succès :' : 'À revoir :'}</strong> ${state.feedback}`;
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([fbBox]);
      }
    }

    function updateScore() {
      let earned = 0;
      let total = 0;
      quizData.forEach(q => {
        const pts = parseFloat(q.defaultgrade || 1);
        total += pts;
        if (validationStates[q.id]?.isCorrect) earned += pts;
      });
      document.getElementById('scoreOverview').textContent = `Score: ${earned} / ${total}`;
    }

    // =========================================================================
    // MODE ÉDITION EN DIRECT (TOUS TYPES, IMAGES, CLOZE & GLISSER-DÉPOSER)
    // =========================================================================
    
    // =========================================================================
    // ÉDITEUR RICHTEXT QUILL & REDIMENSIONNEMENT D'IMAGE INTERACTIF
    // (Porté directement depuis generateur_test_Moodle_IAG/RichTextEditor.tsx)
    // =========================================================================
    let quillInstance = null;
    let selectedImage = null;

    

  function setSaveState(dirty) {
      isDirty = window.isDirty = dirty;
      const btn = document.getElementById('btnSaveQuiz');
      btn.classList.toggle('btn-save-dirty', dirty);
      btn.textContent = dirty ? 'Enregistrer les modifications' : 'Enregistrer';
      btn.title = dirty ? 'Des modifications ne sont pas encore enregistrées sur le disque' : '';
    }

    function markDirty() {
      setSaveState(true);
    }

    function saveCurrentEditFields() {
      const q = quizData[currentIndex];
      if (!q) return;
      const tagInp = document.getElementById('editQTag');
      if (tagInp) {
        q.tag = tagInp.value.trim().split(/\s+/)[0].toLowerCase();
      }
      const shuffleInp = document.getElementById('editQShuffle');
      if (shuffleInp) {
        q.shuffleanswers = shuffleInp.checked;
      }
      const nameInp = document.getElementById('editQName');
      if (nameInp) {
        q.name = getCleanTitle(nameInp.value);
      }
      const gradeInp = document.getElementById('editQGrade');
      if (gradeInp) {
        q.defaultgrade = parseFloat(gradeInp.value) || 1;
      }
      const fbInp = document.getElementById('editQFeedback');
      if (fbInp) {
        q.generalFeedback = fbInp.value;
      }
    }

    // =========================================================================
    // EXPORT ET ENREGISTREMENT SUR LE DISQUE
    // =========================================================================
    function generateMoodleXml() {
      return window.MoodleParser.serializeXml(quizData);
    }

    function exportMoodleXml() {
      saveCurrentEditFields();
      const xml = generateMoodleXml();
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions_moodle.xml';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export questions_moodle.xml téléchargé !');
    }

    async function saveQuizToDisk() {
      saveCurrentEditFields();
      const xml = generateMoodleXml();

      // Détecter le chemin relatif selon l'URL courante
      let relPath = window.location.pathname.replace(/^\//, '');
      let xmlRelPath = relPath.replace(/simulateur\.html$/, 'questions_moodle.xml');

      const payload = {
        path: xmlRelPath,
        content: xml,
        xml_path: xmlRelPath,
        xml_content: xml,
        json_content: quizData
      };

      try {
        const resp = await fetch('/api/save_json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (resp.ok) {
          setSaveState(false);
          showToast('Enregistré sur le disque.');
        } else {
          showToast('⚠️ Erreur lors de l\'enregistrement local.');
        }
      } catch (err) {
        console.warn('Erreur réseau /api/save_json', err);
        // Fallback téléchargement direct
        exportMoodleXml();
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function escapeXml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }
  

  // Initialisation modulaire principale
  function init(options) {
    options = options || {};
    Object.assign(appConfig, options);

    const root = document.querySelector(appConfig.container) || document.body;
    if (!root.querySelector('.moodle-app-container')) {
      root.innerHTML = DEFAULT_LAYOUT;
    }

    setupGlobalControls();

    // 1. Tenter le chargement dynamique depuis le fichier XML
    if (appConfig.xmlSource) {
      fetch(appConfig.xmlSource, { cache: 'no-cache' })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(xmlText => {
          if (window.MoodleParser) {
            window.quizData = window.MoodleParser.parseXml(xmlText);
          }
          startApp();
        })
        .catch(err => {
          console.warn('Chargement XML dynamique non disponible (mode file:/// ou fichier introuvable) :', err);
          useFallbackData();
        });
    } else {
      useFallbackData();
    }
  }

  function useFallbackData() {
    if (appConfig.fallbackData && Array.isArray(appConfig.fallbackData) && appConfig.fallbackData.length > 0) {
      window.quizData = appConfig.fallbackData;
      startApp();
    } else if (window.EMBEDDED_QUIZ_DATA && Array.isArray(window.EMBEDDED_QUIZ_DATA)) {
      window.quizData = window.EMBEDDED_QUIZ_DATA;
      startApp();
    } else {
      showToast('Aucune question chargée. Vous pouvez importer un fichier XML.');
    }
  }

    function startApp() {
    quizData = window.quizData;
    currentIndex = window.currentIndex = 0;
    userAnswers = window.userAnswers;
    validationStates = window.validationStates;
    if (!quizData || quizData.length === 0) return;
    document.getElementById('totalQuestionsCount').textContent = quizData.length;
    renderSidebar();
    loadQuestion(0);
    updateScore();
  }

  window.getTypeLabel = getTypeLabel;
  window.showToast = showToast;
  window.markDirty = markDirty;
  window.loadQuestion = loadQuestion;
  window.toggleEditMode = toggleEditMode;
  window.validateCurrentQuestion = validateCurrentQuestion;
  window.updateScore = updateScore;
  window.renderSidebar = renderSidebar;
  window.MoodleSimulator = {
    init: init,
    loadQuestion: loadQuestion,
    toggleEditMode: toggleEditMode,
    validateCurrentQuestion: validateCurrentQuestion,
    showToast: showToast
  };

})();
