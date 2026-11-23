/**
 * SCORMSimulator - Contrôleur modulaire du simulateur enseignant SCORM 1.2
 * Gère la communication bidirectionnelle postMessage avec l'iframe d'activité élève,
 * la navigation directe, le mode corrigé et l'export du package.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  let currentQuestions = [];
  let corrigeVisible = false;
  let appConfig = {
    activityUrl: './index.html',
    title: 'Activité SCORM',
    container: '#scormAppRoot'
  };

  const DEFAULT_SCORM_LAYOUT = `
  <div class="scorm-sim-wrapper">
    <!-- EN-TÊTE ÉTROIT & CLAIR (48px) CONFORME MOTEUR-UI -->
    <header class="app-header" role="banner">
      <div class="header-left">
        <span class="brand-title" id="scormAppTitle">Activité SCORM</span>
        <span class="brand-badge">Simulateur enseignant</span>
      </div>

      <div class="header-right">
        <button type="button" id="btnToggleCorrige" class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem;">
          Consulter le corrigé
        </button>
        <button type="button" id="btnNarration" class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem;" hidden>
          Enregistrer la narration
        </button>
        <button type="button" id="btnExportZip" class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem;">
          Exporter le package
        </button>
        <button type="button" id="btnResetSim" class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.8125rem;">
          Réinitialiser
        </button>
      </div>
    </header>

    <!-- CONTENEUR PRINCIPAL DU SIMULATEUR -->
    <div class="sim-shell">
      
      <!-- VUE CENTRALE : ACTIVITÉ SCORM ÉLÈVE DANS LE CADRE SÉCURISÉ -->
      <main class="sim-viewport">
        <iframe id="activityFrame" src="./index.html" title="Activité SCORM élève"></iframe>
      </main>

      <!-- PANNEAU ENSEIGNANT LATÉRAL : NAVIGATION DIRECTE & CORRIGÉS -->
      <aside class="sim-drawer-side" aria-label="Outils et corrigés enseignant">
        <div>
          <div class="sim-section-header">Questions (Accès direct)</div>
          <div id="questionsList" class="sim-q-grid" style="margin-top: 0.6rem;">
            <!-- Injecté dynamiquement par le script -->
          </div>
        </div>

        <div id="corrigeContainer" style="display: none;">
          <div class="sim-section-header">Solution et démarche attendue</div>
          <div id="corrigeDetails" class="sim-corrige-box" style="margin-top: 0.6rem;">
            Sélectionnez une question pour afficher sa résolution.
          </div>
        </div>
      </aside>
    </div>
  </div>
  `;

  function reloadActivity() {
    const frame = document.getElementById('activityFrame');
    if (frame) {
      lockSimulatorFrameDimensions(frame);
      frame.src = appConfig.activityUrl + (appConfig.activityUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    }
  }

  /**
   * Sécurise les dimensions de l'iframe dans le simulateur enseignant.
   * Empêche toute boucle d'expansion infinie déclenchée par scorm_api.js
   * (window.frameElement.style.setProperty('height', ...) / min-height)
   * tout en garantissant un défilement vertical fluide du contenu élève
   * et en conservant 100% intactes les règles de dimensionnement pour Moodle.
   */
  function lockSimulatorFrameDimensions(frame) {
    if (!frame || frame._scormDimensionsLocked) return;
    frame._scormDimensionsLocked = true;

    // 1. Intercepter setProperty sur frame.style pour neutraliser 'height' et 'min-height'
    const origSetProperty = frame.style.setProperty.bind(frame.style);
    frame.style.setProperty = function(property, value, priority) {
      if (property === 'height' || property === 'min-height') {
        // Ignorer dans le simulateur : l'iframe est fixée à 100% de la hauteur du viewport
        return;
      }
      return origSetProperty(property, value, priority);
    };

    // 2. Verrouiller les setters directs frame.style.height, minHeight, maxHeight
    try {
      Object.defineProperty(frame.style, 'height', {
        get() { return '100%'; },
        set() { /* ignoré dans le simulateur */ },
        configurable: true
      });
      Object.defineProperty(frame.style, 'minHeight', {
        get() { return '0px'; },
        set() { /* ignoré dans le simulateur */ },
        configurable: true
      });
      Object.defineProperty(frame.style, 'maxHeight', {
        get() { return '100%'; },
        set() { /* ignoré dans le simulateur */ },
        configurable: true
      });
    } catch (e) {}

    // 3. Forcer les dimensions initiales de l'iframe
    origSetProperty('width', '100%', 'important');
    origSetProperty('height', '100%', 'important');
    origSetProperty('min-height', '0px', 'important');
    origSetProperty('max-height', '100%', 'important');
    origSetProperty('border', 'none', 'important');
    origSetProperty('display', 'block', 'important');

    // 4. Intercepter setAttribute pour scrolling
    const origSetAttribute = frame.setAttribute.bind(frame);
    frame.setAttribute = function(name, value) {
      if (name === 'scrolling' && value === 'no') {
        return origSetAttribute('scrolling', 'auto');
      }
      return origSetAttribute(name, value);
    };

    frame._simSetStyle = origSetProperty;

    // 5. Observer de mutations pour parer à tout écrasement d'attribut 'style'
    try {
      const observer = new MutationObserver(() => {
        if (frame._simHauteurAuto) return; // mode de repli : hauteur pilotée par postMessage
        if (frame.style.height !== '100%') {
          origSetProperty('height', '100%', 'important');
        }
        if (frame.style.minHeight !== '0px') {
          origSetProperty('min-height', '0px', 'important');
        }
        if (frame.style.maxHeight !== '100%') {
          origSetProperty('max-height', '100%', 'important');
        }
      });
      observer.observe(frame, { attributes: true, attributeFilter: ['style'] });
    } catch (e) {}

    // 6. Assurer le défilement fluide du document élève
    const enableChildScrolling = () => {
      try {
        const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        if (doc && doc.body) {
          doc.documentElement.style.setProperty('overflow-y', 'auto', 'important');
          doc.body.style.setProperty('overflow-y', 'auto', 'important');
        }
      } catch (e) {}
    };

    frame.addEventListener('load', () => {
      enableChildScrolling();
      setTimeout(enableChildScrolling, 50);
      setTimeout(enableChildScrolling, 150);
      setTimeout(enableChildScrolling, 300);
    });
  }

  /** Mode de repli du simulateur : hauteur de l'iframe = hauteur du contenu élève, défilement du panneau. */
  function appliquerHauteurAuto(frame, hauteur) {
    const h = Math.ceil(Number(hauteur));
    if (!h || h < 100 || h > 100000) return;
    const setStyle = frame._simSetStyle || frame.style.setProperty.bind(frame.style);
    frame._simHauteurAuto = true;
    document.body.classList.add('sim-hauteur-auto');
    setStyle('height', h + 'px', 'important');
    setStyle('min-height', h + 'px', 'important');
    setStyle('max-height', 'none', 'important');
  }

  function renderQuestionsList(questions) {
    currentQuestions = questions || [];
    const container = document.getElementById('questionsList');
    if (!container) return;
    container.innerHTML = '';

    currentQuestions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sim-q-btn' + (idx === 0 ? ' active' : '');
      btn.innerHTML = `<span>Question ${idx + 1}</span><span style="font-size:0.75rem; color:var(--text-subtle);">${q.points || 1} pt</span>`;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sim-q-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const frame = document.getElementById('activityFrame');
        if (frame && frame.contentWindow) {
          try {
            frame.contentWindow.postMessage({ type: 'GOTO_QUESTION', index: idx }, '*');
          } catch (e) {}
        }
        showQuestionSolution(q);
      });
      container.appendChild(btn);
    });

    if (currentQuestions.length > 0) {
      showQuestionSolution(currentQuestions[0]);
    }
  }

  function highlightCurrentQuestion(idx) {
    const btns = document.querySelectorAll('.sim-q-btn');
    btns.forEach((b, i) => {
      b.classList.toggle('active', i === idx);
    });
    if (currentQuestions[idx]) {
      showQuestionSolution(currentQuestions[idx]);
    }
  }

  function showQuestionSolution(q) {
    const box = document.getElementById('corrigeDetails');
    if (!box) return;
    if (!q || !q.solution) {
      box.innerHTML = 'Aucune démarche détaillée enregistrée pour cette question.';
      return;
    }
    box.innerHTML = `
      <strong>Réponse attendue :</strong> ${q.reponseCorrecte || ''}<br><br>
      <strong>Démarche scientifique (PFEQ) :</strong>
      <code>${q.solution}</code>
      ${q.explication ? `<br><em>${q.explication}</em>` : ''}
    `;
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([box]);
    }
  }

  function setupControls() {
    const btnToggleCorrige = document.getElementById('btnToggleCorrige');
    const corrigeContainer = document.getElementById('corrigeContainer');
    const frame = document.getElementById('activityFrame');
    const btnResetSim = document.getElementById('btnResetSim');
    const btnExportZip = document.getElementById('btnExportZip');

    if (btnToggleCorrige) {
      btnToggleCorrige.addEventListener('click', () => {
        corrigeVisible = !corrigeVisible;
        if (corrigeContainer) corrigeContainer.style.display = corrigeVisible ? 'block' : 'none';
        btnToggleCorrige.textContent = corrigeVisible ? 'Masquer le corrigé' : 'Consulter le corrigé';

        if (frame && frame.contentWindow) {
          try {
            frame.contentWindow.postMessage({ type: 'TOGGLE_CORRIGE', visible: corrigeVisible }, '*');
          } catch (e) {}
        }
      });
    }

    if (btnResetSim) {
      btnResetSim.addEventListener('click', reloadActivity);
    }

    const btnNarration = document.getElementById('btnNarration');
    if (btnNarration && window.NarrationRecorder) {
      window.NarrationRecorder.init({
        panneau: '.sim-drawer-side',
        allerA: (index) => {
          const f = document.getElementById('activityFrame');
          if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'GOTO_QUESTION', index: index, page: 'presentation' }, '*');
        },
        audioMisAJour: (station) => {
          const f = document.getElementById('activityFrame');
          if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'NARRATION_AUDIO_MAJ', src: station.audio }, '*');
        }
      });
      btnNarration.addEventListener('click', () => {
        const actif = window.NarrationRecorder.basculer();
        btnNarration.textContent = actif ? 'Quitter la narration' : 'Enregistrer la narration';
        btnNarration.setAttribute('aria-pressed', actif ? 'true' : 'false');
      });
    }

    if (btnExportZip) {
      btnExportZip.addEventListener('click', async () => {
        if (typeof window.exportScormZip === 'function') {
          window.exportScormZip();
        } else {
          // Serveur local : reconstruire d'abord le package pour y inclure les derniers fichiers (ex. narrations)
          if (location.protocol.indexOf('http') === 0) {
            const dossier = decodeURIComponent(location.pathname.replace(/\/[^/]*$/, ''));
            try {
              const r = await fetch('/api/reconstruire_package?dossier=' + encodeURIComponent(dossier), { method: 'POST' });
              const j = await r.json();
              if (r.ok && j.zip) appConfig.zipFilename = j.zip;
            } catch (e) { /* package existant téléchargé tel quel */ }
          }
          // Déclencher le téléchargement direct du package SCORM avec son titre accentué
          const zipName = (appConfig.zipFilename || (appConfig.title ? appConfig.title + '.zip' : 'scorm.zip'))
            .replace(/[/\\?%*:|"<>]/g, '-');
          const link = document.createElement('a');
          link.href = './' + encodeURIComponent(zipName);
          link.download = zipName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
    }

    // Écoute des messages envoyés par l'activité iframe
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'ACTIVITY_READY' && event.data.questions) {
        renderQuestionsList(event.data.questions);
        const btnN = document.getElementById('btnNarration');
        if (btnN && window.NarrationRecorder) btnN.hidden = !window.NarrationRecorder.definirStations(event.data.questions);
      }
      if (event.data.type === 'QUESTION_CHANGED') {
        highlightCurrentQuestion(event.data.index);
        if (window.NarrationRecorder) window.NarrationRecorder.suivre(event.data.index);
      }
      if (event.data.type === 'ACTIVITY_SUBMITTED') {
        const titleBadge = document.querySelector('.brand-badge');
        if (titleBadge) {
          titleBadge.textContent = 'Tentative soumise ✓ (' + event.data.score + '/' + event.data.total + ' pts)';
          titleBadge.style.background = '#dcfce7';
          titleBadge.style.color = '#15803d';
        }
      }
      if (event.data.type === 'scorm_resize' || event.data.type === 'resize' || event.data.type === 'setHeight') {
        // Redimensionnement SCORM Moodle reçu : garantir le défilement dans le simulateur
        const frame = document.getElementById('activityFrame');
        if (frame) {
          let accessible = false;
          try {
            const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (doc && doc.body) {
              doc.documentElement.style.setProperty('overflow-y', 'auto', 'important');
              doc.body.style.setProperty('overflow-y', 'auto', 'important');
              accessible = true;
            }
          } catch (e) {}
          // Document élève inaccessible (ex. ouverture file:/// dans Chrome) : on ne peut pas rétablir
          // son défilement interne. Repli : l'iframe prend la hauteur annoncée par l'activité, comme
          // dans Moodle, et c'est le panneau du simulateur qui défile. L'activité n'est pas modifiée.
          if (!accessible && event.data.height) appliquerHauteurAuto(frame, event.data.height);
        }
      }
    });
  }

  function init(options) {
    options = options || {};
    Object.assign(appConfig, options);

    const root = document.querySelector(appConfig.container) || document.body;
    if (!root.querySelector('.scorm-sim-wrapper')) {
      root.innerHTML = DEFAULT_SCORM_LAYOUT;
    }

    const titleEl = document.getElementById('scormAppTitle');
    if (titleEl) titleEl.textContent = appConfig.title || 'Activité SCORM';

    const frame = document.getElementById('activityFrame');
    if (frame) {
      lockSimulatorFrameDimensions(frame);
      if (appConfig.activityUrl) {
        frame.src = appConfig.activityUrl;
      }
    }

    setupControls();
  }

  window.SCORMSimulator = {
    init: init,
    reloadActivity: reloadActivity,
    renderQuestionsList: renderQuestionsList,
    highlightCurrentQuestion: highlightCurrentQuestion,
    showQuestionSolution: showQuestionSolution
  };

  // Alias globaux
  window.reloadActivity = reloadActivity;

})();
