/**
 * scorm_runtime.js — Moteur universel SCORM 1.2
 * Motorisé par moteur-ui. Zéro Framework externe. Conforme Loi 25 / WCAG 2.1 AAA.
 *
 * Lit window.QUESTIONS_DATA et window.SCORM_ACTIVITY_CONFIG.
 * Supporte deux modes :
 *   - 'corrige'       : Corrigé interactif (types radio, shortanswer, compound_radio,
 *                       compound_select_text, glandes_grid, etapes_matching, nutrition_compound)
 *   - 'comprehension' : Exercice de compréhension de lecture avec remédiation adaptative
 *
 * Anti-boucle Moodle : jamais de 100vh / height:100% sur html/body.
 * Score démarre obligatoirement à 0.
 * Fisher-Yates session-stable (sessionStorage) pour les choix QCM.
 * Assistant nommé strictement « Assistant ».
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────
     CONFIG & STATE
  ───────────────────────────────────────────────────────────────── */
  const config = window.SCORM_ACTIVITY_CONFIG || {
    mode: 'corrige',
    titre: 'Activité SCORM',
    totalPoints: 0,
    zipFilename: 'activite_scorm.zip'
  };
  const MODE = config.mode || 'corrige';
  const TOTAL_POINTS = config.totalPoints || 0;

  const questions = window.QUESTIONS_DATA || [];

  let currentIndex = 0;
  let score = 0; // Départ strict à 0 pt
  const userAnswers = {};
  const validatedQuestions = {};
  let modeCorrigeActive = false;
  let isWelcomeActive = true;
  let isSubmittedToMoodle = false;
  let isEcranFinActive = false; // écran de fermeture « Résumé de la tentative »

  // Mode 'comprehension' only
  const remediationAnswers = {};
  const validatedRemediations = {};
  const pointsParQuestion = {};

  // Présentation optionnelle : le contenu d'abord, la question sur demande
  // 'deux-pages' : une page de présentation plein écran, puis une page de question distincte
  const DEUX_PAGES = config.presentation === 'deux-pages';
  const AVEC_NARRATION = DEUX_PAGES && questions.some(function (q) { return Array.isArray(q.narration) && q.narration.length; });
  const CONTENU_PUIS_QUESTION = config.presentation === 'contenu-puis-question' || DEUX_PAGES;
  const questionsRevelees = {};

  /* ─────────────────────────────────────────────────────────────────
     UTILITAIRES
  ───────────────────────────────────────────────────────────────── */

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Fisher-Yates stabilisé par session (sessionStorage).
   * La même clé retourne toujours le même ordre dans la session courante.
   */
  function getShuffledChoices(key, choices) {
    if (!choices || !Array.isArray(choices)) return [];
    const storageKey = 'scorm_shuffle_' + key;
    let cached = null;
    try {
      cached = sessionStorage.getItem(storageKey);
    } catch (e) {
      /* Accès restreint ou désactivé dans l'iframe Moodle */
    }
    if (cached) {
      try {
        const indices = JSON.parse(cached);
        // Reconstruire le tableau dans l'ordre mémorisé
        return indices.map(function (i) { return choices[i]; });
      } catch (e) { /* ignore, recalculate */ }
    }
    const copy = choices.slice();
    const indices = copy.map(function (_, i) { return i; });
    // Fisher-Yates
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(indices));
    } catch (e) {
      /* Accès restreint ou désactivé dans l'iframe Moodle */
    }
    return indices.map(function (i) { return choices[i]; });
  }

  /** Envoie un message au simulateur enseignant parent (postMessage). */
  function notifyParent(data) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(data, '*');
      }
    } catch (e) {}
  }

  /* ─────────────────────────────────────────────────────────────────
     STEPPER & SCORE
  ───────────────────────────────────────────────────────────────── */

  function renderStepBar() {
    const bar = document.getElementById('stepPillBar');
    if (!bar) return;
    bar.innerHTML = '';

    questions.forEach(function (q, idx) {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'step-pill' + (!isWelcomeActive && !isEcranFinActive && idx === currentIndex ? ' active' : '');
      pill.setAttribute('aria-label', (idx + 1) + '. ' + q.titre);
      pill.textContent = idx + 1;

      if (MODE === 'corrige') {
        if (validatedQuestions[idx]) {
          pill.classList.add(validatedQuestions[idx].success ? 'completed' : 'partial');
        }
      } else {
        // Mode compréhension
        if (validatedQuestions[idx]) {
          const pts = pointsParQuestion[idx] || 0;
          if (pts === q.points) {
            pill.classList.add('completed');
          } else if (pts > 0) {
            pill.classList.add('partial');
          } else {
            pill.classList.add('incorrect');
          }
        }
      }

      pill.addEventListener('click', function () {
        if (isWelcomeActive) {
          isWelcomeActive = false;
          const welcome = document.getElementById('welcomeScreen');
          if (welcome) welcome.style.display = 'none';
        }
        loadQuestion(idx);
      });
      bar.appendChild(pill);
    });

    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    const badge = document.getElementById('hudScoreBadge');
    const scoreVal = document.getElementById('scoreValue');
    const pct = TOTAL_POINTS > 0 ? Math.round((score / TOTAL_POINTS) * 100) : 0;
    if (badge) {
      badge.textContent = 'Score\u00a0: ' + score + '\u00a0/ ' + TOTAL_POINTS + '\u00a0pts (' + pct + '\u00a0%)';
    }
    if (scoreVal) {
      scoreVal.textContent = score + ' / ' + TOTAL_POINTS + ' pts (' + pct + ' %)';
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     COACH (ASSISTANT) — 2e couche, position fixe
  ───────────────────────────────────────────────────────────────── */

  /*
   * Aucun message générique dans l'Assistant (ex. « Lis attentivement l'énoncé… ») : il distrait
   * l'élève. L'Assistant ne parle que pour une rétroaction réelle ou une solution ; sinon il reste
   * vide et fermé.
   */
  const COACH_VIDE = '<p class="coach-vide">Aucun message pour le moment.</p>';

  function getDefaultCoachMessage() {
    const q = questions[currentIndex];
    if (q && MODE !== 'comprehension' && (modeCorrigeActive || validatedQuestions[currentIndex])) {
      return '<strong>Solution attendue :</strong>' +
        '<pre class="coach-solution-text">' + escapeHtml(q.solution || '') + '</pre>' +
        '<strong>Rappel conceptuel :</strong>' +
        '<p style="margin-top:0.35rem; font-size:0.875rem;">' + escapeHtml(explicationTexte(q)) + '</p>';
    }
    return COACH_VIDE;
  }

  function ensureCoachWidget() {
    let coach = document.getElementById('coachWidget');
    if (!coach) {
      coach = document.createElement('aside');
      coach.id = 'coachWidget';
      coach.className = 'coach-assistant-widget';
      coach.setAttribute('role', 'complementary');
      coach.setAttribute('aria-label', 'Assistant');
      coach.innerHTML =
        '<div class="coach-header">' +
          '<span class="coach-title">Assistant</span>' +
          '<button type="button" id="btnCloseCoach" class="btn-close-coach" aria-label="Fermer l\'assistant" title="Fermer l\'assistant">✕</button>' +
        '</div>' +
        '<div id="coachActiveMsg" class="coach-body">' +
          getDefaultCoachMessage() +
        '</div>';

      const content = document.getElementById('activity-content') || document.body;
      const header = content.querySelector('.top-nav-bar');
      if (header && header.nextSibling) {
        content.insertBefore(coach, header.nextSibling);
      } else {
        content.appendChild(coach);
      }
    }
    return coach;
  }

  function setCoachVisible(visible) {
    const coach = ensureCoachWidget();
    const btnToggle = document.getElementById('btnToggleCoach');
    if (!coach) return;

    if (visible) {
      coach.classList.remove('hidden', 'retracted');
      coach.removeAttribute('hidden');
      coach.style.display = 'block';
      if (btnToggle) {
        btnToggle.setAttribute('aria-expanded', 'true');
        btnToggle.classList.add('active');
      }
    } else {
      coach.classList.add('hidden', 'retracted');
      coach.setAttribute('hidden', '');
      coach.style.display = 'none';
      if (btnToggle) {
        btnToggle.setAttribute('aria-expanded', 'false');
        btnToggle.classList.remove('active');
      }
    }
  }

  function updateCoachForCurrentQuestion() {
    const coach = ensureCoachWidget();
    const coachMsg = document.getElementById('coachActiveMsg');
    if (!coachMsg) return;
    const q = questions[currentIndex];
    if (modeCorrigeActive || (validatedQuestions[currentIndex] && MODE === 'corrige')) {
      showCoachSolution(q);
    } else if (MODE === 'comprehension' && validatedQuestions[currentIndex]) {
      if (validatedRemediations[q.id] && q.remediation) {
        const rem = q.remediation;
        const chosen = (rem.choices || []).find(function (c) { return c.id === remediationAnswers[q.id]; });
        updateCoachWidgetRemediation(q, chosen && chosen.correct, (chosen ? chosen.feedback : '') || rem.solution);
      } else {
        const selected = (q.choices || []).find(function (c) { return c.id === userAnswers[q.id]; });
        const isCorrect = selected && selected.correct;
        const pts = pointsParQuestion[currentIndex] !== undefined ? pointsParQuestion[currentIndex] : (isCorrect ? q.points : 0);
        updateCoachWidgetComprehension(q, isCorrect, pts);
      }
    } else {
      // Aucune rétroaction à donner : l'Assistant reste fermé, sans consigne générique.
      coachMsg.innerHTML = getDefaultCoachMessage();
      if (coachMsg.innerHTML === COACH_VIDE || coachMsg.querySelector('.coach-vide')) setCoachVisible(false);
    }
    // La page de présentation se lit sans l'assistant, même pour une question déjà validée
    if (DEUX_PAGES && isQuestionMasquee()) setCoachVisible(false);
  }

  function setupCoachToggle() {
    ensureCoachWidget();

    // Délégation globale pour la fermeture via ✕
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('#btnCloseCoach');
      if (btn) {
        e.preventDefault();
        setCoachVisible(false);
        const btnToggle = document.getElementById('btnToggleCoach');
        if (btnToggle) btnToggle.focus();
      }
    });

    // Bascule via le bouton [Assistant] de la barre supérieure
    const btnToggle = document.getElementById('btnToggleCoach');
    if (btnToggle) {
      btnToggle.addEventListener('click', function (e) {
        e.preventDefault();
        const coach = ensureCoachWidget();
        const isHidden = !coach ||
          coach.classList.contains('hidden') ||
          coach.classList.contains('retracted') ||
          coach.hasAttribute('hidden') ||
          coach.style.display === 'none' ||
          (window.getComputedStyle && window.getComputedStyle(coach).display === 'none');
        setCoachVisible(isHidden);
      });
    }

    window.setCoachVisible = setCoachVisible;
  }

  /* ─────────────────────────────────────────────────────────────────
     LIGHTBOX
  ───────────────────────────────────────────────────────────────── */

  function setupImageLightbox() {
    const modal = document.getElementById('imageLightboxModal');
    const modalImg = document.getElementById('lightboxImg');
    const modalCaption = document.getElementById('lightboxCaption');
    const modalHtml = document.getElementById('lightboxHtmlContent');
    const btnClose = document.getElementById('btnCloseLightbox');
    const backdrop = modal ? modal.querySelector('.lightbox-backdrop') : null;
    let lastActiveTrigger = null;

    function openLightbox(src, caption, triggerEl, htmlContent) {
      if (!modal) return;
      lastActiveTrigger = triggerEl || null;
      if (modalCaption) modalCaption.textContent = caption || 'Fiche repère';

      if (htmlContent) {
        if (modalImg) { modalImg.style.display = 'none'; modalImg.src = ''; }
        if (modalHtml) {
          modalHtml.innerHTML = htmlContent;
          modalHtml.style.display = 'block';
        }
      } else if (src) {
        if (modalHtml) { modalHtml.style.display = 'none'; modalHtml.innerHTML = ''; }
        if (modalImg) {
          modalImg.style.display = 'block';
          modalImg.src = src;
          modalImg.alt = caption || 'Illustration scientifique agrandie';
        }
      }

      modal.removeAttribute('hidden');
      if (btnClose) btnClose.focus();
    }

    function closeLightbox() {
      if (!modal) return;
      modal.setAttribute('hidden', '');
      if (modalImg) { modalImg.src = ''; modalImg.style.display = 'none'; }
      if (modalHtml) { modalHtml.innerHTML = ''; modalHtml.style.display = 'none'; }
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    // Délégation d'événements pour tous les déclencheurs de zoom / fiche repère
    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('.btn-zoom-trigger');
      if (trigger) {
        const q = (MODE === 'comprehension') ? questions[currentIndex] : null;
        const html = (q && q.referenceHtml) ? q.referenceHtml : (trigger.dataset.html || null);
        const title = (q && q.referenceTitle) ? q.referenceTitle : (trigger.dataset.caption || '');
        openLightbox(trigger.dataset.full, title, trigger, html);
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('btn-zoom-trigger')) {
        e.preventDefault();
        e.target.click();
      }
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeLightbox();
      }
    });

    if (btnClose) btnClose.addEventListener('click', closeLightbox);
    if (backdrop) backdrop.addEventListener('click', closeLightbox);
  }

  /* ─────────────────────────────────────────────────────────────────
     MODE CORRIGÉ (commandes depuis simulateur enseignant)
  ───────────────────────────────────────────────────────────────── */

  function activateModeCorrige() {
    modeCorrigeActive = true;
    document.body.classList.add('mode-corrige');
    if (MODE === 'comprehension') {
      // Dévoile toutes les solutions
      questions.forEach(function (q, idx) {
        const correctChoice = q.choices.find(function (c) { return c.correct; });
        if (correctChoice) userAnswers[q.id] = correctChoice.id;
        validatedQuestions[idx] = true;
        pointsParQuestion[idx] = q.points;
      });
      score = TOTAL_POINTS;
    } else {
      modeCorrigeActive = true;
    }
    renderStepBar();
    renderCurrentQuestion();
  }

  function deactivateModeCorrige() {
    modeCorrigeActive = false;
    document.body.classList.remove('mode-corrige');
    renderCurrentQuestion();
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉCRAN D'ACCUEIL DIDACTIQUE (PANNEAU ÉPURÉ)
  ───────────────────────────────────────────────────────────────── */

  function renderWelcomeScreen() {
    arreterNarration();
    isWelcomeActive = true;
    masquerEcranFin();
    const welcome = document.getElementById('welcomeScreen');
    const qHeader = document.getElementById('questionHeader');
    const citation = document.getElementById('citationBox');
    const qContainer = document.getElementById('questionContainer');
    const qWorkspace = document.getElementById('questionWorkspace');
    const indicator = document.getElementById('currentQuestionIndicator');
    const btnPrev = document.getElementById('btnBottomPrev');
    const btnNext = document.getElementById('btnBottomNext');
    const btnValidate = document.getElementById('btnBottomValidate');
    const statusText = document.getElementById('bottomStatusText');

    if (qHeader) qHeader.style.display = 'none';
    if (citation) citation.style.display = 'none';
    if (qContainer) qContainer.style.display = 'none';
    if (qWorkspace) qWorkspace.style.display = 'none';
    if (btnValidate) btnValidate.style.display = 'none';
    setCoachVisible(false);

    if (indicator) indicator.textContent = 'Accueil';
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) {
      btnNext.disabled = false;
      btnNext.textContent = 'Commencer l\'activité →';
      btnNext.classList.remove('btn-moodle-confirm');
    }
    if (statusText) {
      statusText.textContent = 'Prenez connaissance des consignes, puis commencez l\'activité.';
    }

    if (!welcome) return;
    welcome.style.display = 'flex';

    const customIntro = config.welcomeIntro || 'Cette activité d\'apprentissage vous guide pas à pas dans l\'assimilation des concepts scientifiques, l\'application des démarches de calcul et l\'analyse critique des erreurs fréquentes.';
    const customTitle = config.titre || 'Activité d\'apprentissage interactif';

    welcome.innerHTML = `
      <div class="welcome-badge">Activité d'apprentissage didactique</div>
      <h1 class="welcome-title">${escapeHtml(customTitle)}</h1>
      <p class="welcome-intro">${customIntro}</p>
      ${AVEC_NARRATION ? `
      <div class="welcome-deroulement">
        <h2>Comment avancer</h2>
        <ol>
          <li>Sur chaque page illustrée, clique sur <strong>Écouter l'explication</strong> et regarde l'image pendant que tu écoutes. Tu peux mettre en pause et réécouter.</li>
          <li>Quand l'explication est terminée, clique sur <strong>Passer à la question</strong>, en bas de la page, à droite.</li>
        </ol>
        <p>Pas d'écouteurs ? Ouvre <strong>Lire la transcription</strong> sous l'encadré « À retenir ».</p>
      </div>` : ''}
      ${aIntentionsAccueil() ? '' : `
      <div class="welcome-instructions-grid">
        <div class="welcome-instruction-item">
          <span class="welcome-step-num">1</span>
          <div>
            <strong>${questions.length} stations interactives</strong>
            <p>Résolvez chaque mise en situation en appliquant les règles scientifiques et les démarches pas-à-pas.</p>
          </div>
        </div>
        <div class="welcome-instruction-item">
          <span class="welcome-step-num">2</span>
          <div>${DEUX_PAGES ? `
            <strong>Une page pour comprendre, une page pour répondre</strong>
            <p>Chaque station s'ouvre sur une présentation illustrée ${AVEC_NARRATION ? 'à écouter et à observer' : 'à lire et à observer'}. Passez ensuite à la question ; le bouton <strong>Précédent</strong> vous ramène à la présentation.</p>` : `
            <strong>Fiches repères méthodologiques</strong>
            <p>Utilisez le bouton <strong>⛶ Agrandir</strong> pour visualiser les tableaux de proportions et le biffage des unités.</p>`}
          </div>
        </div>
        <div class="welcome-instruction-item">
          <span class="welcome-step-num">3</span>
          <div>
            <strong>Droit à l'erreur & Remédiation</strong>
            <p>En cas de méprise, une question guidée d'aide vous permet de comprendre votre erreur et de récupérer des points.</p>
          </div>
        </div>
        <div class="welcome-instruction-item">
          <span class="welcome-step-num">4</span>
          <div>
            <strong>Transmission officielle à Moodle</strong>
            <p>Après la dernière question, un écran de fin s'affiche. Votre note n'est transmise à Moodle que lorsque vous cliquez sur <strong>« Terminer et envoyer »</strong>.</p>
          </div>
        </div>
      </div>`}

      ${welcomeIntentionsHtml()}

      <div class="welcome-action-box">
        <button type="button" id="btnStartActivity" class="btn btn-primary btn-start-welcome">
          Commencer l'activité →
        </button>
      </div>
    `;

    const btnStart = document.getElementById('btnStartActivity');
    if (btnStart) {
      btnStart.addEventListener('click', function() {
        startFirstQuestion();
      });
    }

    renderStepBar();
  }

  /** Vrai si l'activité fournit des intentions ou des critères : ils remplacent alors les 4 étapes de l'accueil. */
  function aIntentionsAccueil() {
    return (config.intentions || []).length > 0 || (config.criteres || []).length > 0;
  }

  /** Intentions d'apprentissage et critères de réussite (facultatifs) affichés à l'accueil. */
  function welcomeIntentionsHtml() {
    const intentions = config.intentions || [];
    const criteres = config.criteres || [];
    if (!intentions.length && !criteres.length) return '';
    function liste(items) {
      return '<ul>' + items.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>';
    }
    return '<div class="welcome-intentions">' +
        (intentions.length ? '<section class="welcome-intentions-col" aria-labelledby="welcomeIntentionsTitle">' +
          '<h2 id="welcomeIntentionsTitle">Ce que j\'apprends</h2>' + liste(intentions) + '</section>' : '') +
        (criteres.length ? '<section class="welcome-intentions-col" aria-labelledby="welcomeCriteresTitle">' +
          '<h2 id="welcomeCriteresTitle">Je sais que j\'ai réussi quand…</h2>' + liste(criteres) + '</section>' : '') +
      '</div>';
  }

  function startFirstQuestion() {
    isWelcomeActive = false;
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.style.display = 'none';
    loadQuestion(0);
  }

  /* ─────────────────────────────────────────────────────────────────
     MODAL DE SOUMISSION FINALE (STYLE TESTS MOODLE)
  ───────────────────────────────────────────────────────────────── */

  function setupMoodleSubmitModal() {
    const modal = document.getElementById('moodleSubmitModal');
    const backdrop = document.getElementById('moodleSubmitBackdrop');
    const btnClose = document.getElementById('btnCloseMoodleModal');
    const btnCancel = document.getElementById('btnCancelSubmit');
    const btnConfirm = document.getElementById('btnConfirmSubmit');

    function closeModal() {
      if (!modal) return;
      modal.setAttribute('hidden', '');
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (btnConfirm) {
      btnConfirm.addEventListener('click', function () {
        submitAttemptToMoodle();
      });
    }
  }

  function openMoodleSubmitModal() {
    const modal = document.getElementById('moodleSubmitModal');
    const body = document.getElementById('moodleDialogBody');
    const footer = document.getElementById('moodleDialogFooter');
    const modalTitle = document.getElementById('moodleDialogTitle');
    if (!modal || !body) return;

    if (isSubmittedToMoodle) {
      showSubmissionConfirmation();
      modal.removeAttribute('hidden');
      return;
    }

    if (modalTitle) modalTitle.textContent = 'Confirmation';
    if (footer) footer.style.display = 'flex';

    const nonRepondues = questions.filter(function (q, idx) { return !validatedQuestions[idx]; }).length;
    body.innerHTML = `
      <p class="moodle-confirm-question">
        Une fois cette tentative envoyée, vous ne pourrez plus modifier vos réponses. Votre note de
        <strong>${score} / ${TOTAL_POINTS} points (${pourcentageScore()} %)</strong> sera enregistrée dans le carnet de notes de Moodle.
      </p>
      ${nonRepondues ? `<div class="moodle-warning-callout"><strong>Attention :</strong> ${nonRepondues} question${nonRepondues > 1 ? 's sont' : ' est'} sans réponse.</div>` : ''}
    `;

    modal.removeAttribute('hidden');
    const btnConfirm = document.getElementById('btnConfirmSubmit');
    if (btnConfirm) btnConfirm.focus();
  }

  function pourcentageScore() {
    return TOTAL_POINTS > 0 ? Math.round((score / TOTAL_POINTS) * 100) : 0;
  }

  /** Tableau d'état des questions et note cumulative (écran de fin). */
  function recapitulatifTentativeHtml() {
    const pct = pourcentageScore();
    let rowsHtml = '';
    questions.forEach(function (q, idx) {
      const val = validatedQuestions[idx];
      const stateText = val ? 'Réponse enregistrée ✓' : 'Non répondue';
      const ptsObt = (MODE === 'comprehension')
        ? (pointsParQuestion[idx] !== undefined ? pointsParQuestion[idx] : (val ? q.points : 0))
        : (val ? val.pointsObtenus : 0);
      const ptsText = val ? (ptsObt + ' / ' + q.points + ' pt') : ('0 / ' + q.points + ' pt');
      rowsHtml += `
        <tr>
          <td><strong>Station ${idx + 1}</strong> — ${escapeHtml(q.titre || '')}</td>
          <td class="moodle-td-state${val ? '' : ' moodle-td-state-vide'}">${stateText}</td>
          <td class="moodle-td-points">${ptsText}</td>
        </tr>
      `;
    });

    return `
      <table class="moodle-summary-table">
        <thead>
          <tr>
            <th>Question</th>
            <th>État</th>
            <th style="text-align:right;">Points</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="moodle-score-total-banner">
        <span>Note cumulative finale :</span>
        <span>${score} / ${TOTAL_POINTS} points (${pct} %)</span>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────────────────────────
     ÉCRAN DE FERMETURE (STYLE « RÉSUMÉ DE LA TENTATIVE » DE MOODLE)
     Des élèves quittent l'activité sans l'envoyer : leur note n'est
     alors jamais transmise. Cet écran plein format, impossible à
     manquer, rappelle que l'envoi reste à faire et porte le bouton
     « Terminer et envoyer ».
  ───────────────────────────────────────────────────────────────── */

  function getEcranFin() {
    let ecran = document.getElementById('ecranFin');
    if (ecran) return ecran;
    // Coquilles antérieures : la section est créée à côté de l'accueil
    ecran = document.createElement('section');
    ecran.id = 'ecranFin';
    ecran.className = 'welcome-screen-card ecran-fin-card';
    ecran.setAttribute('aria-labelledby', 'ecranFinTitre');
    ecran.style.display = 'none';
    const welcome = document.getElementById('welcomeScreen');
    const main = document.getElementById('main-scorm-content') || document.querySelector('main') || document.body;
    if (welcome && welcome.parentNode) {
      welcome.parentNode.insertBefore(ecran, welcome.nextSibling);
    } else {
      main.insertBefore(ecran, main.firstChild);
    }
    return ecran;
  }

  function masquerEcranFin() {
    isEcranFinActive = false;
    const ecran = document.getElementById('ecranFin');
    if (ecran) ecran.style.display = 'none';
  }

  function renderEcranFin() {
    arreterNarration();
    isEcranFinActive = true;
    isWelcomeActive = false;
    ['welcomeScreen', 'questionHeader', 'citationBox', 'questionContainer', 'questionWorkspace'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    setCoachVisible(false);

    const ecran = getEcranFin();
    ecran.style.display = 'flex';

    if (isSubmittedToMoodle) {
      const passed = score >= Math.ceil(TOTAL_POINTS * 0.6);
      ecran.innerHTML = `
        <h1 class="welcome-title" id="ecranFinTitre" tabindex="-1">Tentative envoyée</h1>
        <div class="ecran-fin-envoyee" role="status">
          <strong>✅ Votre tentative a été transmise avec succès !</strong>
          <span>Note enregistrée : ${score} / ${TOTAL_POINTS} points (${pourcentageScore()} %) — statut ${passed ? 'réussi' : 'complété'}.</span>
        </div>
        ${recapitulatifTentativeHtml()}
        <p class="welcome-intro">Vous pouvez maintenant fermer cette fenêtre ou revenir à votre cours.</p>
      `;
    } else {
      ecran.innerHTML = `
        <h1 class="welcome-title" id="ecranFinTitre" tabindex="-1">Résumé de la tentative</h1>
        <div class="ecran-fin-alerte" role="alert">
          <strong>Votre tentative n'est pas encore envoyée.</strong>
          <span>Votre note ne sera transmise à Moodle que lorsque vous aurez cliqué sur « Terminer et envoyer ». Si vous fermez la fenêtre avant, votre résultat sera perdu.</span>
        </div>
        ${recapitulatifTentativeHtml()}
        <div class="ecran-fin-actions">
          <button type="button" id="btnEcranFinRetour" class="btn">Retourner à la tentative</button>
          <button type="button" id="btnEcranFinEnvoyer" class="btn btn-moodle-confirm btn-ecran-fin-envoyer">Terminer et envoyer</button>
        </div>
      `;
      document.getElementById('btnEcranFinRetour').addEventListener('click', function () {
        loadQuestion(questions.length - 1, 'question');
      });
      document.getElementById('btnEcranFinEnvoyer').addEventListener('click', openMoodleSubmitModal);
    }

    // Barre du bas : le bouton principal reste « Terminer et envoyer »
    const indicator = document.getElementById('currentQuestionIndicator');
    const btnPrev = document.getElementById('btnBottomPrev');
    const btnNext = document.getElementById('btnBottomNext');
    const btnValidate = document.getElementById('btnBottomValidate');
    const statusText = document.getElementById('bottomStatusText');
    if (indicator) indicator.textContent = 'Fin de la tentative';
    if (btnValidate) btnValidate.style.display = 'none';
    if (btnPrev) btnPrev.disabled = isSubmittedToMoodle;
    if (btnNext) {
      btnNext.disabled = isSubmittedToMoodle;
      btnNext.textContent = isSubmittedToMoodle ? 'Transmis à Moodle ✓' : 'Terminer et envoyer';
      btnNext.classList.toggle('btn-moodle-confirm', !isSubmittedToMoodle);
    }
    if (statusText) {
      statusText.textContent = isSubmittedToMoodle
        ? '✅ Résultats enregistrés et transmis à Moodle avec succès !'
        : 'Votre tentative n\'est pas encore envoyée.';
    }

    renderStepBar();
    const titre = document.getElementById('ecranFinTitre');
    if (titre) titre.focus();
    notifyParent({ type: 'ECRAN_FIN' });
    if (window.ScormAPI && typeof window.ScormAPI.adjustParentIframeHeight === 'function') {
      setTimeout(function () { window.ScormAPI.adjustParentIframeHeight(32); }, 50);
    }
  }

  function submitAttemptToMoodle() {
    isSubmittedToMoodle = true;
    const passed = score >= Math.ceil(TOTAL_POINTS * 0.6);

    // Synchronisation SCORM officielle définitive
    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      window.ScormAPI.setStatus(passed ? 'passed' : 'completed');
      window.ScormAPI.commit();
      window.ScormAPI.finish();
    }

    notifyParent({
      type: 'ACTIVITY_SUBMITTED',
      score: score,
      total: TOTAL_POINTS,
      passed: passed
    });

    if (isEcranFinActive) renderEcranFin(); // l'écran de fin passe à l'état « envoyée »
    showSubmissionConfirmation();

    // Mettre à jour la barre de navigation inférieure
    const btnNext = document.getElementById('btnBottomNext');
    const statusText = document.getElementById('bottomStatusText');
    if (btnNext) {
      btnNext.disabled = true;
      btnNext.textContent = 'Transmis à Moodle ✓';
      btnNext.classList.remove('btn-moodle-confirm');
    }
    if (statusText) {
      statusText.textContent = '✅ Résultats enregistrés et transmis à Moodle avec succès !';
    }
  }

  function showSubmissionConfirmation() {
    const body = document.getElementById('moodleDialogBody');
    const footer = document.getElementById('moodleDialogFooter');
    const modalTitle = document.getElementById('moodleDialogTitle');
    if (modalTitle) modalTitle.textContent = 'Tentative transmise';
    if (footer) footer.style.display = 'none';
    if (!body) return;

    const pct = TOTAL_POINTS > 0 ? Math.round((score / TOTAL_POINTS) * 100) : 0;
    const passed = score >= Math.ceil(TOTAL_POINTS * 0.6);

    body.innerHTML = `
      <div class="moodle-confirm-box">
        <div class="confirm-icon">✅</div>
        <h2 class="confirm-title">Tentative transmise avec succès !</h2>
        <p class="confirm-text">
          Votre note officielle de <strong>${score} / ${TOTAL_POINTS} points (${pct} %)</strong> a été enregistrée et transmise au carnet de notes de Moodle.
        </p>
        <div class="confirm-badge-status">
          Statut Moodle : <strong>${passed ? 'Réussi (Passed)' : 'Complété (Completed)'}</strong>
        </div>
        <p class="confirm-subtext">
          Vous pouvez désormais fermer cette fenêtre ou revenir à votre cours en toute sécurité.
        </p>
        <div style="margin-top: 1.25rem;">
          <button type="button" id="btnCloseAfterSubmit" class="btn btn-primary" style="padding:0.55rem 1.5rem; font-weight:700;">
            Fermer cette boîte
          </button>
        </div>
      </div>
    `;

    const btnCloseAfter = document.getElementById('btnCloseAfterSubmit');
    if (btnCloseAfter) {
      btnCloseAfter.addEventListener('click', function () {
        const modal = document.getElementById('moodleSubmitModal');
        if (modal) modal.setAttribute('hidden', '');
      });
      btnCloseAfter.focus();
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     NAVIGATION
  ───────────────────────────────────────────────────────────────── */

  /**
   * @param {number} index
   * @param {string} [page] En mode deux pages : 'question' pour ouvrir directement la page
   *   de question ; par défaut, la station s'ouvre sur sa page de présentation.
   */
  function loadQuestion(index, page) {
    if (index < 0 || index >= questions.length) return;
    // Un simple rafraîchissement de la station courante (après validation) garde la page affichée
    if (DEUX_PAGES && (page !== undefined || index !== currentIndex || isWelcomeActive)) {
      questionsRevelees[index] = (page === 'question');
    }
    if (isWelcomeActive) {
      isWelcomeActive = false;
    }
    masquerEcranFin();
    const welcome = document.getElementById('welcomeScreen');
    if (welcome) welcome.style.display = 'none';

    const qHeader = document.getElementById('questionHeader');
    const citation = document.getElementById('citationBox');
    const qContainer = document.getElementById('questionContainer');
    const qWorkspace = document.getElementById('questionWorkspace');

    if (qHeader) qHeader.style.display = 'flex';
    if (citation) citation.style.display = 'block';

    if (MODE === 'corrige') {
      if (qContainer) qContainer.style.display = 'block';
      if (qWorkspace) qWorkspace.style.display = 'none';
    } else {
      if (qWorkspace) qWorkspace.style.display = 'block';
      if (qContainer) qContainer.style.display = 'none';
    }

    const changeDeQuestion = index !== currentIndex;
    currentIndex = index;
    renderStepBar();
    renderCurrentQuestion();
    updateCoachForCurrentQuestion();
    // Arrivée sur une autre question : l'Assistant se referme (son message reste à jour). Il ne
    // s'ouvre que sur une action de l'élève ; le corrigé affiché par l'enseignant le garde ouvert.
    if (changeDeQuestion && !modeCorrigeActive) setCoachVisible(false);

    updateQuestionIndicator();
    const oldInd = document.getElementById('questionIndicator');
    if (oldInd) {
      oldInd.textContent = 'Question ' + (currentIndex + 1) + ' sur ' + questions.length;
    }

    if (MODE === 'corrige') {
      updateBottomNavCorrige();
    } else {
      updateBottomNavComprehension();
    }

    notifyParent({ type: 'QUESTION_CHANGED', index: currentIndex });

    const mainBox = document.getElementById('questionContainer') || document.getElementById('questionWorkspace');
    if (mainBox) mainBox.focus();

    // Redimensionnement Moodle fluide
    if (window.ScormAPI && typeof window.ScormAPI.adjustParentIframeHeight === 'function') {
      setTimeout(function () {
        window.ScormAPI.adjustParentIframeHeight(32);
      }, 50);
    }
  }

  function updateQuestionIndicator() {
    const qInd = document.getElementById('currentQuestionIndicator');
    if (!qInd || isWelcomeActive || isEcranFinActive) return;
    let texte = 'Question ' + (currentIndex + 1) + ' sur ' + questions.length;
    if (DEUX_PAGES && !modeCorrigeActive) texte += isQuestionMasquee() ? ' · présentation' : ' · question';
    qInd.textContent = texte;
  }

  /* ─────────────────────────────────────────────────────────────────
     BARRE DE NAVIGATION INFÉRIEURE — Commune (boutons HTML de la coquille)
  ───────────────────────────────────────────────────────────────── */

  function setupBottomNav() {
    const btnPrev = document.getElementById('btnBottomPrev') || document.getElementById('btnNavPrev');
    const btnNext = document.getElementById('btnBottomNext') || document.getElementById('btnNavNext');
    const btnValidate = document.getElementById('btnBottomValidate');

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        if (isWelcomeActive) return;
        if (isEcranFinActive) {
          loadQuestion(questions.length - 1, 'question');
          return;
        }
        if (DEUX_PAGES && !modeCorrigeActive) {
          if (!isQuestionMasquee()) {
            // Page de question → retour à la présentation de la même station
            questionsRevelees[currentIndex] = false;
            afficherPageCourante();
          } else if (currentIndex === 0) {
            renderWelcomeScreen();
          } else {
            loadQuestion(currentIndex - 1, 'question');
          }
          return;
        }
        if (currentIndex === 0) {
          renderWelcomeScreen();
        } else {
          loadQuestion(currentIndex - 1);
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        if (isWelcomeActive) {
          startFirstQuestion();
          return;
        }
        if (isEcranFinActive) {
          openMoodleSubmitModal();
        } else if (currentIndex < questions.length - 1) {
          loadQuestion(currentIndex + 1);
        } else {
          renderEcranFin();
        }
      });
    }
    if (btnValidate) {
      btnValidate.addEventListener('click', function () {
        validateCurrentAnswer();
      });
    }
  }

  function updateBottomNavCorrige() {
    const btnPrev = document.getElementById('btnBottomPrev') || document.getElementById('btnNavPrev');
    const btnNext = document.getElementById('btnBottomNext') || document.getElementById('btnNavNext');
    const btnValidate = document.getElementById('btnBottomValidate');
    const statusText = document.getElementById('bottomStatusText') || document.getElementById('navStatusHint');
    const isValidated = !!validatedQuestions[currentIndex];
    const isLastQuestion = (currentIndex === questions.length - 1);

    if (btnPrev) btnPrev.disabled = false;
    if (btnNext) {
      if (isLastQuestion) {
        btnNext.textContent = isSubmittedToMoodle ? 'Transmis à Moodle ✓' : 'Terminer l\'activité';
        if (!isSubmittedToMoodle) {
          btnNext.classList.add('btn-moodle-confirm');
        } else {
          btnNext.classList.remove('btn-moodle-confirm');
        }
      } else {
        btnNext.textContent = 'Suivant';
        btnNext.classList.remove('btn-moodle-confirm');
      }
      btnNext.disabled = isSubmittedToMoodle;
    }
    // Corrigé affiché par l'enseignant : rien à valider, les bonnes réponses sont déjà inscrites.
    const corrigeAffiche = modeCorrigeActive && !isValidated;
    if (btnValidate) {
      btnValidate.style.display = (isValidated || corrigeAffiche) ? 'none' : 'inline-flex';
      btnValidate.disabled = false;
    }
    if (statusText) {
      if (isSubmittedToMoodle) {
        statusText.textContent = '✅ Résultats enregistrés et transmis à Moodle avec succès !';
      } else if (isValidated) {
        statusText.textContent = isLastQuestion
          ? 'Toutes les questions sont complétées ! Cliquez sur « Terminer l\'activité », puis sur « Terminer et envoyer ».'
          : 'Question validée — passez à la suivante.';
      } else if (corrigeAffiche) {
        statusText.textContent = 'Corrigé affiché : les bonnes réponses sont en vert.';
      } else {
        statusText.textContent = 'Valide ta réponse pour débloquer la suite.';
      }
    }
  }

  function updateBottomNavComprehension() {
    const q = questions[currentIndex];
    if (!q) return;
    const isValidated = !!validatedQuestions[currentIndex];
    const isRemValidated = !!validatedRemediations[q.id];
    const hasPendingRemediation = shouldShowRemediation(q) && !isRemValidated;
    const isLastQuestion = (currentIndex === questions.length - 1);

    const btnPrev = document.getElementById('btnBottomPrev');
    const btnNext = document.getElementById('btnBottomNext');
    const btnValidate = document.getElementById('btnBottomValidate');
    const statusText = document.getElementById('bottomStatusText');

    if (btnPrev) btnPrev.disabled = false;
    if (btnNext) {
      if (isLastQuestion) {
        btnNext.disabled = !isValidated || hasPendingRemediation || isSubmittedToMoodle;
        btnNext.textContent = isSubmittedToMoodle ? 'Transmis à Moodle ✓' : 'Terminer l\'activité';
        if (isValidated && !hasPendingRemediation && !isSubmittedToMoodle) {
          btnNext.classList.add('btn-moodle-confirm');
        } else {
          btnNext.classList.remove('btn-moodle-confirm');
        }
      } else {
        btnNext.disabled = !isValidated || hasPendingRemediation;
        btnNext.textContent = 'Suivant';
        btnNext.classList.remove('btn-moodle-confirm');
      }
    }
    if (isQuestionMasquee()) {
      if (btnValidate) {
        btnValidate.style.display = 'inline-flex';
        btnValidate.disabled = false;
        btnValidate.textContent = 'Passer à la question';
      }
      if (statusText) {
        statusText.textContent = DEUX_PAGES
          ? (isValidated ? 'Question déjà validée. Relis la présentation ou passe à la suite.' : (Array.isArray(q.narration) && q.narration.length ? 'Écoute l\'explication, puis passe à la question.' : 'Lis la présentation, puis passe à la question.'))
          : 'Lis le contenu, puis passe à la question.';
      }
      return;
    }
    if (btnValidate) {
      if (!isValidated) {
        btnValidate.style.display = 'inline-flex';
        btnValidate.disabled = (userAnswers[q.id] === undefined || userAnswers[q.id] === null);
        btnValidate.textContent = 'Valider la réponse';
      } else if (hasPendingRemediation) {
        btnValidate.style.display = 'inline-flex';
        btnValidate.disabled = (remediationAnswers[q.id] === undefined || remediationAnswers[q.id] === null);
        btnValidate.textContent = 'Valider la remédiation';
      } else {
        btnValidate.style.display = 'none';
      }
    }
    if (statusText) {
      if (isSubmittedToMoodle) {
        statusText.textContent = '✅ Résultats enregistrés et transmis à Moodle avec succès !';
      } else if (!isValidated) {
        statusText.textContent = userAnswers[q.id] !== undefined
          ? 'Clique sur « Valider la réponse ».'
          : 'Sélectionne une option pour valider.';
      } else if (hasPendingRemediation) {
        statusText.textContent = 'Réponds à la question guidée pour marquer 1 point de récupération.';
      } else if (isLastQuestion) {
        statusText.textContent = 'Toutes les questions sont complétées ! Cliquez sur « Terminer l\'activité », puis sur « Terminer et envoyer ».';
      } else {
        statusText.textContent = 'Question complétée. Passe à la suivante.';
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     RENDU — Routeur principal
  ───────────────────────────────────────────────────────────────── */

  function renderCurrentQuestion() {
    if (MODE === 'corrige') {
      renderQuestionCorrige();
    } else {
      renderQuestionComprehension();
    }
    typesetMath(document.getElementById('main-scorm-content') || document.body);
  }

  /* ─────────────────────────────────────────────────────────────────
     MODE 1 : CORRIGÉ INTERACTIF
  ───────────────────────────────────────────────────────────────── */

  function renderQuestionCorrige() {
    const q = questions[currentIndex];
    const container = document.getElementById('questionContainer');
    if (!q || !container) return;
    container.style.display = 'block';

    let contentHtml =
      '<div class="partie-badge">' + escapeHtml(q.partie) + '</div>' +
      '<div class="question-header">' +
        '<h2 class="question-title">' + (currentIndex + 1) + '. ' + escapeHtml(q.titre) + '</h2>' +
        '<span class="points-badge">' + q.points + ' point' + (q.points > 1 ? 's' : '') + '</span>' +
      '</div>' +
      '<div class="enonce-box"><p>' + q.question + '</p></div>' +
      '<div class="interaction-zone" id="interactionZone"></div>' +
      '<div class="feedback-card" id="questionFeedback" style="display:none;"></div>';

    if (q.image) {
      container.innerHTML =
        '<div class="question-with-figure-layout">' +
          '<aside class="question-figure-card" aria-label="Schéma didactique de référence">' +
            '<div class="figure-frame">' +
              '<button type="button" class="btn-zoom-trigger" data-full="' + q.image + '" data-caption="' + escapeHtml(q.imageAlt || q.imageCaption || 'Schéma de référence') + '" aria-label="Agrandir l\'illustration" title="Cliquer pour agrandir">' +
                '<img src="' + q.image + '" alt="' + escapeHtml(q.imageAlt || q.imageCaption || 'Schéma de référence') + '" class="figure-img">' +
                '<span class="zoom-badge">Agrandir</span>' +
              '</button>' +
            '</div>' +
            (q.imageCaption ? '<div class="figure-caption">' + escapeHtml(q.imageCaption) + '</div>' : '') +
          '</aside>' +
          '<div class="question-main-content">' + contentHtml + '</div>' +
        '</div>';
    } else {
      container.innerHTML = contentHtml;
    }

    renderInteractiveComponent(q, document.getElementById('interactionZone'));

    if (validatedQuestions[currentIndex]) {
      showQuestionFeedbackCorrige(q, validatedQuestions[currentIndex]);
    } else if (modeCorrigeActive) {
      afficherDemarcheCorrige(q);
    }
    if (modeCorrigeActive) {
      showCoachSolution(q);
    }
  }

  function renderInteractiveComponent(q, container) {
    if (!container) return;
    const isValidated = !!validatedQuestions[currentIndex];

    switch (q.type) {
      case 'radio': {
        const list = document.createElement('div');
        list.className = 'choice-list';
        const choicesList = getShuffledChoices(q.id, q.choices);
        choicesList.forEach(function (choice) {
          const item = document.createElement('label');
          item.className = 'choice-item' + (userAnswers[q.id] === choice.id ? ' selected' : '');
          if (isValidated) {
            if (choice.correct) item.classList.add('correct');
            else if (userAnswers[q.id] === choice.id) item.classList.add('incorrect');
          }
          item.innerHTML =
            '<input type="radio" name="choice_' + q.id + '" value="' + choice.id + '" ' +
              (userAnswers[q.id] === choice.id ? 'checked ' : '') +
              (isValidated ? 'disabled ' : '') + '>' +
            '<span class="choice-text">' + escapeHtml(choice.text) + '</span>';
          if (!isValidated) {
            item.querySelector('input').addEventListener('change', function () {
              userAnswers[q.id] = choice.id;
              list.querySelectorAll('.choice-item').forEach(function (el) { el.classList.remove('selected'); });
              item.classList.add('selected');
              enableValidateButtonCorrige();
            });
          }
          list.appendChild(item);
        });
        container.appendChild(list);
        break;
      }

      case 'shortanswer': {
        const wrap = document.createElement('div');
        wrap.className = 'form-group';
        wrap.style.maxWidth = '420px';
        wrap.innerHTML =
          '<label class="form-label" for="input_' + q.id + '">Votre réponse&nbsp;:</label>' +
          '<input type="text" id="input_' + q.id + '" class="form-input" placeholder="' + escapeHtml(q.placeholder || 'Votre réponse...') + '" value="' + escapeHtml(userAnswers[q.id] || '') + '" ' + (isValidated ? 'disabled' : '') + '>';
        const input = wrap.querySelector('input');
        if (isValidated) {
          marquerReponse(input, reponseTexteJuste(userAnswers[q.id], q.acceptedAnswers), reponseAttendueAffichee(q.acceptedAnswers));
        }
        if (!isValidated) {
          input.addEventListener('input', function (e) {
            userAnswers[q.id] = e.target.value.trim();
            enableValidateButtonCorrige();
          });
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
              const btn = document.getElementById('btnValidateQuestion');
              if (btn && !btn.disabled) btn.click();
            }
          });
        }
        container.appendChild(wrap);
        break;
      }

      case 'compound_radio': {
        const wrap = document.createElement('div');
        wrap.className = 'compound-grid';
        userAnswers[q.id] = userAnswers[q.id] || {};

        (q.subQuestions || []).forEach(function (sub) {
          const subCard = document.createElement('div');
          subCard.className = 'sub-card';
          subCard.innerHTML = '<h3 class="sub-card-title">' + escapeHtml(sub.label) + ' (' + sub.points + ' pt)</h3>';
          const subList = document.createElement('div');
          subList.className = 'choice-list';
          const subChoicesList = getShuffledChoices(q.id + '_' + sub.id, sub.choices);
          subChoicesList.forEach(function (c) {
            const item = document.createElement('label');
            item.className = 'choice-item' + (userAnswers[q.id][sub.id] === c.id ? ' selected' : '');
            if (isValidated) {
              if (c.correct) item.classList.add('correct');
              else if (userAnswers[q.id][sub.id] === c.id) item.classList.add('incorrect');
            }
            item.innerHTML =
              '<input type="radio" name="sub_' + q.id + '_' + sub.id + '" value="' + c.id + '" ' +
                (userAnswers[q.id][sub.id] === c.id ? 'checked ' : '') +
                (isValidated ? 'disabled ' : '') + '>' +
              '<span class="choice-text">' + escapeHtml(c.text) + '</span>';
            if (!isValidated) {
              item.querySelector('input').addEventListener('change', function () {
                userAnswers[q.id][sub.id] = c.id;
                subList.querySelectorAll('.choice-item').forEach(function (el) { el.classList.remove('selected'); });
                item.classList.add('selected');
                enableValidateButtonCorrige();
              });
            }
            subList.appendChild(item);
          });
          subCard.appendChild(subList);
          wrap.appendChild(subCard);
        });
        container.appendChild(wrap);
        break;
      }

      case 'compound_select_text': {
        const wrap = document.createElement('div');
        wrap.className = 'form-grid-2col';
        userAnswers[q.id] = userAnswers[q.id] || {};

        (q.subQuestions || []).forEach(function (sub) {
          const row = document.createElement('div');
          row.className = 'sub-card form-group';
          if (sub.type === 'select') {
            row.innerHTML =
              '<label class="form-label" for="sel_' + q.id + '_' + sub.id + '">' + escapeHtml(sub.label) + ' (' + sub.points + ' pt)</label>' +
              '<select id="sel_' + q.id + '_' + sub.id + '" class="form-select" ' + (isValidated ? 'disabled' : '') + '>' +
                sub.options.map(function (opt) {
                  return '<option value="' + opt + '" ' + (userAnswers[q.id][sub.id] === opt ? 'selected' : '') + '>' + opt + '</option>';
                }).join('') +
              '</select>';
            const sel = row.querySelector('select');
            if (isValidated) marquerReponse(sel, userAnswers[q.id][sub.id] === sub.correct, sub.correct);
            if (!isValidated) {
              sel.addEventListener('change', function (e) {
                userAnswers[q.id][sub.id] = e.target.value;
                enableValidateButtonCorrige();
              });
            }
          } else {
            row.innerHTML =
              '<label class="form-label" for="inp_' + q.id + '_' + sub.id + '">' + escapeHtml(sub.label) + ' (' + sub.points + ' pt)</label>' +
              '<input type="text" id="inp_' + q.id + '_' + sub.id + '" class="form-input" placeholder="' + escapeHtml(sub.placeholder || '') + '" value="' + escapeHtml(userAnswers[q.id][sub.id] || '') + '" ' + (isValidated ? 'disabled' : '') + '>';
            const inp = row.querySelector('input');
            if (isValidated) {
              marquerReponse(inp, reponseTexteJuste(userAnswers[q.id][sub.id], sub.acceptedAnswers), reponseAttendueAffichee(sub.acceptedAnswers));
            }
            if (!isValidated) {
              inp.addEventListener('input', function (e) {
                userAnswers[q.id][sub.id] = e.target.value.trim();
                enableValidateButtonCorrige();
              });
            }
          }
          wrap.appendChild(row);
        });
        container.appendChild(wrap);
        break;
      }

      case 'glandes_grid': {
        const wrap = document.createElement('div');
        wrap.className = 'glandes-table-wrap';
        userAnswers[q.id] = userAnswers[q.id] || {};

        let tableHtml =
          '<div class="fonctions-reference-box">' +
            '<strong>Banque des fonctions (A, B, C, D)&nbsp;:</strong>' +
            '<ul>' +
              '<li><strong>A&nbsp;:</strong> ' + q.fonctions.A + '</li>' +
              '<li><strong>B&nbsp;:</strong> ' + q.fonctions.B + '</li>' +
              '<li><strong>C&nbsp;:</strong> ' + q.fonctions.C + '</li>' +
              '<li><strong>D&nbsp;:</strong> ' + q.fonctions.D + '</li>' +
            '</ul>' +
          '</div>' +
          '<div class="table-responsive" style="margin-top:1rem;">' +
            '<table class="data-table">' +
              '<thead><tr>' +
                '<th style="width:20%;">Repère</th>' +
                '<th style="width:45%;">Nom de la glande / organe (1 pt)</th>' +
                '<th style="width:35%;">Fonction (1 pt)</th>' +
              '</tr></thead>' +
              '<tbody>';

        (q.items || []).forEach(function (item, idx) {
          userAnswers[q.id][idx] = userAnswers[q.id][idx] || {};
          tableHtml +=
            '<tr>' +
              '<td><strong>' + escapeHtml(item.label) + '</strong></td>' +
              '<td>' +
                '<select class="form-select sel-nom" data-idx="' + idx + '" ' + (isValidated ? 'disabled' : '') + '>' +
                  item.nomOptions.map(function (opt) {
                    return '<option value="' + opt + '" ' + (userAnswers[q.id][idx].nom === opt ? 'selected' : '') + '>' + opt + '</option>';
                  }).join('') +
                '</select>' +
              '</td>' +
              '<td>' +
                '<select class="form-select sel-lettre" data-idx="' + idx + '" ' + (isValidated ? 'disabled' : '') + '>' +
                  item.lettreOptions.map(function (opt) {
                    return '<option value="' + opt + '" ' + (userAnswers[q.id][idx].lettre === opt ? 'selected' : '') + '>' + opt + '</option>';
                  }).join('') +
                '</select>' +
              '</td>' +
            '</tr>';
        });

        tableHtml += '</tbody></table></div>';
        wrap.innerHTML = tableHtml;

        if (!isValidated) {
          wrap.querySelectorAll('.sel-nom').forEach(function (sel) {
            sel.addEventListener('change', function (e) {
              const i = e.target.dataset.idx;
              userAnswers[q.id][i] = userAnswers[q.id][i] || {};
              userAnswers[q.id][i].nom = e.target.value;
              enableValidateButtonCorrige();
            });
          });
          wrap.querySelectorAll('.sel-lettre').forEach(function (sel) {
            sel.addEventListener('change', function (e) {
              const i = e.target.dataset.idx;
              userAnswers[q.id][i] = userAnswers[q.id][i] || {};
              userAnswers[q.id][i].lettre = e.target.value;
              enableValidateButtonCorrige();
            });
          });
        }
        container.appendChild(wrap);
        break;
      }

      case 'etapes_matching': {
        const wrap = document.createElement('div');
        wrap.className = 'matching-list';
        userAnswers[q.id] = userAnswers[q.id] || {};

        (q.statements || []).forEach(function (stmt) {
          const row = document.createElement('div');
          row.className = 'matching-item';
          row.innerHTML =
            '<div class="matching-text"><strong>(' + stmt.id.toUpperCase() + ')</strong> ' + escapeHtml(stmt.text) + '</div>' +
            '<div class="matching-select-wrap">' +
              '<select class="form-select sel-etape" data-id="' + stmt.id + '" ' + (isValidated ? 'disabled' : '') + '>' +
                q.options.map(function (opt) {
                  return '<option value="' + opt + '" ' + (userAnswers[q.id][stmt.id] === opt ? 'selected' : '') + '>' + opt + '</option>';
                }).join('') +
              '</select>' +
            '</div>';
          if (isValidated) marquerReponse(row.querySelector('select'), userAnswers[q.id][stmt.id] === stmt.correct, stmt.correct);
          if (!isValidated) {
            row.querySelector('select').addEventListener('change', function (e) {
              userAnswers[q.id][stmt.id] = e.target.value;
              enableValidateButtonCorrige();
            });
          }
          wrap.appendChild(row);
        });
        container.appendChild(wrap);
        break;
      }

      case 'nutrition_compound': {
        const wrap = document.createElement('div');
        wrap.className = 'nutrition-wrap';
        userAnswers[q.id] = userAnswers[q.id] || { table: {}, rapide: {} };

        let tHtml =
          '<h3 class="sub-card-title">1. Constituants alimentaires principaux (4 points)</h3>' +
          '<div class="table-responsive">' +
            '<table class="data-table">' +
              '<thead><tr>' +
                '<th style="width:40%;">Aliment du repas</th>' +
                '<th style="width:60%;">Constituant alimentaire principal</th>' +
              '</tr></thead>' +
              '<tbody>';

        (q.tableData || []).forEach(function (row, rIdx) {
          tHtml +=
            '<tr>' +
              '<td><strong>' + escapeHtml(row.aliment) + '</strong></td>' +
              '<td>' +
                '<select class="form-select sel-nutriment" data-idx="' + rIdx + '" ' + (isValidated ? 'disabled' : '') + '>' +
                  row.options.map(function (opt) {
                    return '<option value="' + opt + '" ' + (userAnswers[q.id].table[rIdx] === opt ? 'selected' : '') + '>' + opt + '</option>';
                  }).join('') +
                '</select>' +
              '</td>' +
            '</tr>';
        });

        tHtml +=
          '</tbody></table></div>' +
          '<div class="sub-card" style="margin-top:1.25rem;">' +
            '<h3 class="sub-card-title">2. Source d\'énergie rapidement accessible (1 point)</h3>' +
            '<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">' + escapeHtml(q.sourceRapide.contexte) + '</p>' +
            '<div class="form-grid-2col">' +
              '<div class="form-group">' +
                '<label class="form-label" for="selRapideConstituant">Constituant énergétique rapide&nbsp;:</label>' +
                '<select id="selRapideConstituant" class="form-select" ' + (isValidated ? 'disabled' : '') + '>' +
                  q.sourceRapide.constituantOptions.map(function (opt) {
                    return '<option value="' + opt + '" ' + (userAnswers[q.id].rapide.constituant === opt ? 'selected' : '') + '>' + opt + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="selRapideAliment">Aliment associé dans le repas&nbsp;:</label>' +
                '<select id="selRapideAliment" class="form-select" ' + (isValidated ? 'disabled' : '') + '>' +
                  q.sourceRapide.alimentOptions.map(function (opt) {
                    return '<option value="' + opt + '" ' + (userAnswers[q.id].rapide.aliment === opt ? 'selected' : '') + '>' + opt + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
            '</div>' +
          '</div>';

        wrap.innerHTML = tHtml;

        if (!isValidated) {
          wrap.querySelectorAll('.sel-nutriment').forEach(function (sel) {
            sel.addEventListener('change', function (e) {
              userAnswers[q.id].table[e.target.dataset.idx] = e.target.value;
              enableValidateButtonCorrige();
            });
          });
          const selConst = wrap.querySelector('#selRapideConstituant');
          if (selConst) {
            selConst.addEventListener('change', function (e) {
              userAnswers[q.id].rapide.constituant = e.target.value;
              enableValidateButtonCorrige();
            });
          }
          const selAlim = wrap.querySelector('#selRapideAliment');
          if (selAlim) {
            selAlim.addEventListener('change', function (e) {
              userAnswers[q.id].rapide.aliment = e.target.value;
              enableValidateButtonCorrige();
            });
          }
        }
        container.appendChild(wrap);
        break;
      }
    }

    // Bouton de validation sous l'interaction (mode corrigé)
    const actionRow = document.createElement('div');
    actionRow.className = 'action-validate-row';
    actionRow.innerHTML =
      '<button type="button" id="btnValidateQuestion" class="btn btn-primary" ' + (isValidated ? 'disabled' : '') + '>' +
        (isValidated ? 'Validé ✓' : 'Valider ma réponse') +
      '</button>' +
      '<button type="button" id="btnToggleGuide" class="btn" style="display:' + (isValidated ? 'inline-block' : 'none') + ';">' +
        'Voir l\'explication didactique' +
      '</button>';

    const btnVal = actionRow.querySelector('#btnValidateQuestion');
    btnVal.addEventListener('click', validateCurrentAnswer);

    const btnGuide = actionRow.querySelector('#btnToggleGuide');
    if (btnGuide) {
      btnGuide.addEventListener('click', function () {
        const coach = document.getElementById('coachWidget');
        if (coach) {
          const isShown = !coach.classList.contains('hidden') && !coach.hasAttribute('hidden');
          setCoachVisible(!isShown);
          btnGuide.textContent = isShown ? 'Voir l\'explication didactique' : 'Masquer l\'explication';
        }
      });
    }

    container.appendChild(actionRow);

    if (modeCorrigeActive && !isValidated) afficherBonnesReponses(q, container);
  }

  /**
   * « Consulter le corrigé » sur une question non validée : les bonnes réponses sont cochées ou
   * inscrites, sur fond vert, et les champs verrouillés. Les réponses de l'élève (userAnswers) ne
   * changent pas : en masquant le corrigé, la question redevient telle qu'il l'avait laissée.
   */
  function afficherBonnesReponses(q, container) {
    function cocher(nom, choix) {
      container.querySelectorAll('input[name="' + nom + '"]').forEach(function (inp) {
        const c = (choix || []).find(function (x) { return String(x.id) === inp.value; });
        const item = inp.closest('.choice-item');
        inp.checked = !!(c && c.correct);
        inp.disabled = true;
        if (item) {
          item.classList.remove('selected', 'incorrect');
          if (c && c.correct) item.classList.add('correct');
        }
      });
    }
    function inscrire(champ, valeur) {
      if (!champ) return;
      champ.value = valeur || '';
      champ.disabled = true;
      champ.classList.add('reponse-juste');
      const note = document.createElement('p');
      note.className = 'reponse-statut est-juste';
      note.textContent = '✓ Réponse attendue';
      champ.insertAdjacentElement('afterend', note);
    }

    switch (q.type) {
      case 'radio':
        cocher('choice_' + q.id, q.choices);
        break;
      case 'compound_radio':
        (q.subQuestions || []).forEach(function (sub) { cocher('sub_' + q.id + '_' + sub.id, sub.choices); });
        break;
      case 'shortanswer':
        inscrire(container.querySelector('#input_' + q.id), reponseAttendueAffichee(q.acceptedAnswers));
        break;
      case 'compound_select_text':
        (q.subQuestions || []).forEach(function (sub) {
          if (sub.type === 'select') inscrire(container.querySelector('#sel_' + q.id + '_' + sub.id), sub.correct);
          else inscrire(container.querySelector('#inp_' + q.id + '_' + sub.id), reponseAttendueAffichee(sub.acceptedAnswers));
        });
        break;
      case 'etapes_matching':
        (q.statements || []).forEach(function (stmt) {
          inscrire(container.querySelector('select[data-id="' + stmt.id + '"]'), stmt.correct);
        });
        break;
    }
    const btn = container.querySelector('#btnValidateQuestion');
    if (btn) btn.disabled = true;
  }

  /** Même règle que la validation : texte comparé sans tenir compte de la casse ni des espaces autour. */
  function reponseTexteJuste(saisie, acceptees) {
    const txt = String(saisie || '').trim().toLowerCase();
    return !!txt && (acceptees || []).some(function (acc) { return txt === String(acc).toLowerCase(); });
  }

  /** Réponse attendue à montrer : de préférence la forme écrite avec son unité (« 32 g/L » plutôt que « 32 »). */
  function reponseAttendueAffichee(acceptees) {
    const liste = acceptees || [];
    return liste.find(function (a) { return /\s/.test(a) && /[^\d\s.,]/.test(a); }) || liste[0] || '';
  }

  /**
   * Après validation, colore le champ (vert : juste, rouge : erroné) et ajoute dessous un libellé
   * texte, pour que le statut ne dépende pas de la seule couleur.
   */
  function marquerReponse(champ, juste, attendue) {
    if (!champ) return;
    champ.classList.add(juste ? 'reponse-juste' : 'reponse-erronee');
    const note = document.createElement('p');
    note.className = 'reponse-statut ' + (juste ? 'est-juste' : 'est-erronee');
    note.textContent = juste ? '✓ Bonne réponse'
      : '✗ Réponse erronée' + (attendue ? ' — réponse attendue : ' + attendue : '');
    champ.insertAdjacentElement('afterend', note);
  }

  function enableValidateButtonCorrige() {
    const btn = document.getElementById('btnValidateQuestion');
    if (btn && !validatedQuestions[currentIndex]) {
      btn.disabled = false;
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     VALIDATION — MODE CORRIGÉ
  ───────────────────────────────────────────────────────────────── */

  function validateCorrige() {
    const q = questions[currentIndex];
    if (!q || validatedQuestions[currentIndex]) return;

    let pointsGagnes = 0;
    let feedbackDetails = '';

    switch (q.type) {
      case 'radio': {
        const ansId = userAnswers[q.id];
        if (ansId === undefined) { alert('Veuillez sélectionner une réponse avant de valider.'); return; }
        const opt = q.choices.find(function (c) { return c.id === ansId; });
        if (opt && opt.correct) {
          pointsGagnes = q.points;
          feedbackDetails = opt.feedback || 'Bonne réponse !';
        } else {
          feedbackDetails = opt ? opt.feedback : 'Réponse incorrecte.';
        }
        break;
      }
      case 'shortanswer': {
        const txt = (userAnswers[q.id] || '').trim().toLowerCase();
        if (!txt) { alert('Veuillez inscrire une réponse.'); return; }
        const isMatch = (q.acceptedAnswers || []).some(function (acc) { return txt === acc.toLowerCase(); });
        if (isMatch) {
          pointsGagnes = q.points;
          feedbackDetails = q.feedbackCorrect || 'Bonne réponse !';
        } else {
          feedbackDetails = q.feedbackIncorrect || 'Réponse incorrecte. Consultez la solution dans l\'Assistant.';
        }
        break;
      }
      case 'compound_radio': {
        const ans = userAnswers[q.id] || {};
        const allAnswered = (q.subQuestions || []).every(function (sub) { return ans[sub.id] !== undefined; });
        if (!allAnswered) { alert('Veuillez répondre à tous les volets avant de valider.'); return; }
        (q.subQuestions || []).forEach(function (sub) {
          const opt = sub.choices.find(function (c) { return c.id === ans[sub.id]; });
          if (opt && opt.correct) pointsGagnes += sub.points;
        });
        feedbackDetails = pointsGagnes + ' / ' + q.points + ' point(s) obtenu(s).';
        break;
      }
      case 'compound_select_text': {
        const ans = userAnswers[q.id] || {};
        const subLet = (q.subQuestions || []).find(function (s) { return s.id === 'lettre'; });
        const subNom = (q.subQuestions || []).find(function (s) { return s.id === 'nom'; });
        if (!ans.lettre || ans.lettre === '(Choisir)' || !ans.nom) {
          alert('Veuillez sélectionner la lettre et inscrire le nom.');
          return;
        }
        if (subLet && ans.lettre === subLet.correct) pointsGagnes += subLet.points;
        if (subNom) {
          const nomNorm = ans.nom.trim().toLowerCase();
          if ((subNom.acceptedAnswers || []).some(function (a) { return nomNorm === a.toLowerCase(); })) {
            pointsGagnes += subNom.points;
          }
        }
        feedbackDetails = pointsGagnes + ' / ' + q.points + ' point(s) obtenu(s).';
        break;
      }
      case 'glandes_grid': {
        const ans = userAnswers[q.id] || {};
        (q.items || []).forEach(function (item, idx) {
          const userG = ans[idx] || {};
          if (userG.nom === item.nomCorrect) pointsGagnes += 1;
          if (userG.lettre === item.lettreCorrecte) pointsGagnes += 1;
        });
        feedbackDetails = pointsGagnes + ' élément(s) correct(s) sur ' + (q.items.length * 2) + '.';
        break;
      }
      case 'etapes_matching': {
        const ans = userAnswers[q.id] || {};
        (q.statements || []).forEach(function (stmt) {
          if (ans[stmt.id] === stmt.correct) pointsGagnes += 1;
        });
        feedbackDetails = pointsGagnes + ' étape(s) correctement associée(s) sur ' + q.statements.length + '.';
        break;
      }
      case 'nutrition_compound': {
        const ans = userAnswers[q.id] || { table: {}, rapide: {} };
        let rawPts = 0;
        (q.tableData || []).forEach(function (row, rIdx) {
          if (ans.table[rIdx] === row.correct) rawPts += (4 / q.tableData.length);
        });
        rawPts = Math.round(rawPts);
        if (ans.rapide.constituant === q.sourceRapide.constituantCorrect &&
            ans.rapide.aliment === q.sourceRapide.alimentCorrect) {
          rawPts += 1;
        }
        pointsGagnes = rawPts;
        feedbackDetails = pointsGagnes + ' point(s) obtenu(s) sur 5 pour l\'analyse nutritionnelle.';
        break;
      }
    }

    score += pointsGagnes;
    score = Math.min(TOTAL_POINTS, Math.max(0, score));

    validatedQuestions[currentIndex] = {
      pointsObtenus: pointsGagnes,
      success: pointsGagnes === q.points,
      details: feedbackDetails
    };

    renderStepBar();
    // Redessine les choix : fond vert (bonne réponse) ou rouge (réponse choisie erronée) dès la validation.
    const zone = document.getElementById('interactionZone');
    if (zone) {
      zone.innerHTML = '';
      renderInteractiveComponent(q, zone);
    }
    showQuestionFeedbackCorrige(q, validatedQuestions[currentIndex]);
    showCoachSolution(q);

    // Synchronisation SCORM : score provisoire enregistré, tentative « incomplete ». Le statut final
    // et la fermeture de la session (LMSFinish) n'ont lieu qu'à « Tout envoyer et terminer »
    // (submitAttemptToMoodle) : une session fermée ici empêcherait l'envoi depuis l'écran de fin.
    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      window.ScormAPI.setStatus('incomplete');
      window.ScormAPI.commit();
    }

    const btnGuide = document.getElementById('btnToggleGuide');
    if (btnGuide) btnGuide.style.display = 'inline-block';
    const btnVal = document.getElementById('btnValidateQuestion');
    if (btnVal) { btnVal.disabled = true; btnVal.textContent = 'Validé ✓'; }

    updateBottomNavCorrige();

    notifyParent({
      type: 'SCORE_UPDATE',
      score: score,
      total: TOTAL_POINTS,
      questionIndex: currentIndex,
      pointsGagnes: pointsGagnes
    });
  }

  function showQuestionFeedbackCorrige(q, valResult) {
    const box = document.getElementById('questionFeedback');
    if (!box) return;
    box.style.display = 'block';
    box.className = 'feedback-card ' + (valResult.success ? 'correct' : 'partial');
    box.innerHTML =
      '<div style="font-weight:700; font-size:0.95rem; margin-bottom:0.3rem;">' +
        (valResult.success ? '✓ Bravo ! Rétroaction validée' : 'Rétroaction formative') +
        ' (+' + valResult.pointsObtenus + '\u00a0/\u00a0' + q.points + '\u00a0pt)' +
      '</div>' +
      '<div>' + valResult.details + '</div>' +
      (valResult.success ? '' : explicationCorrigeHtml(q));
    if (!valResult.success) typesetMath(box);
  }

  /**
   * Mode corrigé, réponse erronée ou partielle (ou corrigé affiché par l'enseignant) : explication
   * didactique détaillée sous la question, avec la démarche en produit croisé (formule originale en
   * première ligne, valeur encerclée, unités biffées, résultat encadré). Sur bonne réponse, rien ici :
   * la rétroaction concise reste dans l'Assistant.
   */
  function explicationCorrigeHtml(q) {
    const texte = explicationTexte(q);
    if (!texte && !q.explicationDemarche) return '';
    return '<div class="feedback-didactic-box" style="margin-top:0.75rem;">' +
        '<div class="feedback-badge alert">Explication didactique pour t\'aider</div>' +
        formatDidacticExplanation(texte) +
        (q.explicationDemarche ? demarcheHtml(q.explicationDemarche) : '') +
      '</div>';
  }

  /** Corrigé affiché par l'enseignant sur une question non validée : la démarche sous la question. */
  function afficherDemarcheCorrige(q) {
    const box = document.getElementById('questionFeedback');
    const html = explicationCorrigeHtml(q);
    if (!box || !html) return;
    box.style.display = 'block';
    box.className = 'feedback-card partial';
    box.innerHTML = html;
  }

  function showCoachSolution(q) {
    const coachMsg = document.getElementById('coachActiveMsg');
    if (coachMsg) {
      const val = validatedQuestions[currentIndex];
      const lireDessous = val && !val.success && (explicationTexte(q) || q.explicationDemarche);
      coachMsg.innerHTML =
        (lireDessous ? '<p style="margin:0 0 0.5rem;"><strong>Lis l\'explication d\u00e9taill\u00e9e sous la question avant de continuer.</strong></p>' : '') +
        '<strong>Solution attendue\u00a0:</strong>' +
        '<pre class="coach-solution-text">' + escapeHtml(q.solution) + '</pre>' +
        '<strong>Rappel conceptuel\u00a0:</strong>' +
        '<p style="margin-top:0.35rem; font-size:0.875rem;">' + escapeHtml(explicationTexte(q)) + '</p>';
    }
    setCoachVisible(true);
  }

  /* ─────────────────────────────────────────────────────────────────
     MODE 2 : COMPRÉHENSION DE LECTURE
  ───────────────────────────────────────────────────────────────── */

  function renderQuestionComprehension() {
    const q = questions[currentIndex];
    arreterNarration();
    if (!q) return;

    // En-tête de question
    const titleEl = document.getElementById('questionTitle');
    const questionHeaderEl = document.getElementById('questionHeader');
    if (questionHeaderEl) questionHeaderEl.style.display = 'flex';
    if (titleEl) titleEl.textContent = q.titre;

    const pointsBadge = document.getElementById('questionPointsBadge');
    if (pointsBadge) pointsBadge.textContent = q.points + ' points';

    // Citation
    const citationBox = document.getElementById('citationBox');
    const mainEl = document.getElementById('main-scorm-content');
    if (DEUX_PAGES) {
      const surPresentation = isQuestionMasquee();
      if (mainEl) mainEl.classList.toggle('page-presentation', surPresentation);
      if (citationBox) {
        if (surPresentation || modeCorrigeActive) {
          renderPresentation(q, citationBox);
        } else {
          citationBox.style.display = 'none';
          citationBox.innerHTML = '';
        }
      }
      // Présentation : information à consommer, sans assistant. Question : l'élève l'ouvre s'il le souhaite.
      if (surPresentation) setCoachVisible(false);
    } else if (citationBox && CONTENU_PUIS_QUESTION) {
      renderContenu(q, citationBox);
    } else if (citationBox) {
      citationBox.style.display = 'block';
      citationBox.innerHTML =
        '<div class="citation-header">' +
          '<span class="citation-tag">Extrait du texte</span>' +
          '<span class="citation-ref">' + escapeHtml(q.citationRef || '') + '</span>' +
        '</div>' +
        '<blockquote class="citation-text">\u00ab\u00a0' + escapeHtml(q.citation) + '\u00a0\u00bb</blockquote>';
    }

    // Zone de travail
    const workspace = document.getElementById('questionWorkspace');
    if (!workspace) return;
    workspace.style.display = 'block';
    workspace.innerHTML = '';

    if (isQuestionMasquee()) {
      if (DEUX_PAGES) workspace.style.display = 'none';
      updateBottomNavComprehension();
      return;
    }

    const isValidated = !!validatedQuestions[currentIndex];
    const figureSrc = CONTENU_PUIS_QUESTION ? q.questionImage : q.image;
    const figureCaption = CONTENU_PUIS_QUESTION ? q.questionImageCaption : q.imageCaption;
    const figureAlt = CONTENU_PUIS_QUESTION ? q.questionImageAlt : q.imageAlt;
    const hasImage = !!figureSrc;
    const hasReference = !!(q.referenceHtml || hasImage);
    const layout = document.createElement('div');
    layout.className = hasReference ? 'question-with-figure-layout' : 'question-single-layout';

    if (hasReference) {
      const figureCard = document.createElement('div');
      figureCard.className = 'question-figure-card' + (q.referenceHtml ? ' question-reference-card' : '');
      if (q.referenceHtml) {
        figureCard.innerHTML = referenceCardHtml(q);
      } else {
        figureCard.innerHTML = figureHtml(figureSrc, figureCaption, figureAlt || figureCaption || q.titre);
      }
      layout.appendChild(figureCard);
    }

    const interactiveCol = document.createElement('div');
    interactiveCol.className = 'interactive-column';

    // Intitulé de la question
    const qText = document.createElement('p');
    qText.id = 'questionPrompt';
    qText.tabIndex = -1;
    qText.className = 'question-prompt-text';
    qText.innerHTML = '<strong>' + escapeHtml(q.question) + '</strong>';
    interactiveCol.appendChild(qText);

    // Liste de choix mélangés
    const choiceList = document.createElement('div');
    choiceList.className = 'choice-list';
    const shuffledChoices = getShuffledChoices(q.id, q.choices);

    shuffledChoices.forEach(function (choice) {
      const item = document.createElement('label');
      item.className = 'choice-item' + (userAnswers[q.id] === choice.id ? ' selected' : '');
      if (isValidated) {
        if (choice.correct) item.classList.add('correct');
        else if (userAnswers[q.id] === choice.id) item.classList.add('incorrect');
      }
      item.innerHTML =
        '<input type="radio" name="choice_' + q.id + '" value="' + choice.id + '" ' +
          (userAnswers[q.id] === choice.id ? 'checked ' : '') +
          (isValidated ? 'disabled ' : '') + '>' +
        '<span class="choice-text">' + escapeHtml(choice.text) + '</span>';
      if (!isValidated) {
        item.querySelector('input').addEventListener('change', function () {
          userAnswers[q.id] = choice.id;
          choiceList.querySelectorAll('.choice-item').forEach(function (el) { el.classList.remove('selected'); });
          item.classList.add('selected');
          updateBottomNavComprehension();
        });
      }
      choiceList.appendChild(item);
    });
    interactiveCol.appendChild(choiceList);

    // Carte de remédiation adaptative
    const remCard = document.createElement('div');
    remCard.id = 'remediationCard_' + q.id;
    remCard.className = 'remediation-card' + (shouldShowRemediation(q) ? ' visible' : '');
    if (shouldShowRemediation(q)) {
      renderRemediationContent(q, remCard);
    }
    interactiveCol.appendChild(remCard);

    // Panneau de rétroaction
    const feedbackBox = document.createElement('div');
    feedbackBox.id = 'feedbackPanel';
    feedbackBox.className = 'feedback-panel' + (isValidated ? ' visible' : '');
    if (isValidated) {
      renderFeedbackContent(q, feedbackBox);
    }
    interactiveCol.appendChild(feedbackBox);

    layout.appendChild(interactiveCol);
    workspace.appendChild(layout);

    updateBottomNavComprehension();
  }

  /** Vrai tant que l'élève n'a pas demandé la question après avoir lu le contenu. */
  function isQuestionMasquee() {
    if (DEUX_PAGES) return !modeCorrigeActive && !questionsRevelees[currentIndex];
    return CONTENU_PUIS_QUESTION && !modeCorrigeActive && !validatedQuestions[currentIndex] && !questionsRevelees[currentIndex];
  }

  function referenceCardHtml(q) {
    const title = q.referenceTitle || 'Fiche repère';
    const preview = q.referencePreview || q.referenceHtml || '';
    return '<div class="reference-card-box">' +
        '<div class="reference-card-header">' +
          '<span class="reference-badge">Fiche repère</span>' +
          '<button type="button" class="btn-zoom-trigger btn-ref-expand" data-caption="' + escapeHtml(title) + '" aria-label="Agrandir la fiche repère en très grand format" title="Afficher en très grand format">' +
            '<span>⛶</span> Agrandir' +
          '</button>' +
        '</div>' +
        '<div class="reference-card-preview btn-zoom-trigger" data-caption="' + escapeHtml(title) + '" role="button" tabindex="0" aria-label="Agrandir la fiche repère" title="Cliquer pour afficher en très grand format">' +
          preview +
        '</div>' +
        '<div class="reference-card-footer btn-zoom-trigger" data-caption="' + escapeHtml(title) + '">' +
          '<span>🔍 Cliquer pour afficher en grand format</span>' +
        '</div>' +
      '</div>';
  }

  function figureHtml(src, caption, alt) {
    return '<div class="figure-frame">' +
        '<button type="button" class="btn-zoom-trigger" data-full="' + escapeHtml(src) + '" data-caption="' + escapeHtml(caption || alt) + '" aria-label="Agrandir l\'illustration" title="Cliquer pour agrandir">' +
          '<img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" class="figure-img">' +
          '<span class="zoom-badge">Agrandir</span>' +
        '</button>' +
      '</div>' +
      (caption ? '<div class="figure-caption' + (CONTENU_PUIS_QUESTION ? ' figure-caption-phrase' : '') + '">' + escapeHtml(caption) + '</div>' : '');
  }

  function renderContenu(q, box) {
    const paragraphes = (q.contenu || []).map(function (texte) {
      return '<p>' + escapeHtml(texte) + '</p>';
    }).join('');
    box.style.display = 'block';
    box.setAttribute('aria-label', 'Contenu à lire');
    box.innerHTML =
      '<div class="contenu-layout">' +
        '<div class="contenu-texte">' +
          paragraphes +
          (q.formule ? '<p class="contenu-formule">' + escapeHtml(q.formule) + '</p>' : '') +
          (q.citationRef ? '<p class="contenu-reference">' + escapeHtml(q.citationRef) + '</p>' : '') +
        '</div>' +
        (q.image ? '<div class="question-figure-card contenu-figure">' + figureHtml(q.image, q.imageCaption, q.imageAlt || q.imageCaption || q.titre) + '</div>' : '') +
      '</div>';
  }

  /** Mise en forme minimale des textes de présentation : **gras** seulement, après échappement. */
  function texteEnrichi(texte) {
    return escapeHtml(texte).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /** Page de présentation plein écran : représentation SVG et information à lire, sans clic requis.
   *  Avec « narration » (principes de Mayer) : l'explication est écoutée, la zone de droite garde
   *  les mots clés et « À retenir », la transcription est repliée et la démarche apparaît à la fin
   *  de la narration (ou sur demande de l'élève). */
  function renderPresentation(q, box) {
    const avecNarration = Array.isArray(q.narration) && q.narration.length > 0;
    const paragraphes = (q.contenu || []).map(function (texte) {
      return '<p>' + texteEnrichi(texte) + '</p>';
    }).join('');
    const alt = q.imageAlt || q.imageCaption || q.titre;
    const demarcheDifferee = avecNarration && !!q.demarche && !modeCorrigeActive &&
      !demarchesRevelees[q.id] && narrationPossible(q);
    const motsCles = (q.motsCles || []).map(function (m) {
      return '<dt>' + escapeHtml(m.terme) + '</dt><dd>' + texteEnrichi(m.definition) + '</dd>';
    }).join('');
    box.style.display = 'block';
    box.setAttribute('aria-label', 'Présentation à lire');
    box.innerHTML =
      '<div class="presentation-layout">' +
        (q.image ?
          '<figure class="presentation-figure">' +
            '<img src="' + escapeHtml(q.image) + '" alt="' + escapeHtml(alt) + '" class="presentation-img">' +
            (q.imageCaption ? '<figcaption>' + escapeHtml(q.imageCaption) + '</figcaption>' : '') +
          '</figure>' : '') +
        '<div class="presentation-texte">' +
          (avecNarration ? narrationLecteurHtml(q) : paragraphes) +
          (motsCles ? '<div class="presentation-motscles"><h2>Mots clés</h2><dl>' + motsCles + '</dl></div>' : '') +
          (q.aRetenir ? '<div class="presentation-retenir"><h2>À retenir</h2><p>' + texteEnrichi(q.aRetenir) + '</p></div>' : '') +
          (q.reflexe && !avecNarration ? '<div class="presentation-reflexe"><h2>Le réflexe à prendre</h2><p>' + texteEnrichi(q.reflexe) + '</p></div>' : '') +
          (avecNarration ?
            '<details class="presentation-transcription"><summary>Lire la transcription</summary>' +
              q.narration.map(function (t) { return '<p>' + texteEnrichi(t) + '</p>'; }).join('') +
            '</details>' : '') +
          (q.citationRef ? '<p class="contenu-reference">' + escapeHtml(q.citationRef) + '</p>' : '') +
        '</div>' +
      '</div>' +
      (q.demarche ?
        (demarcheDifferee ?
          '<div class="demarche-acces"><button type="button" class="btn" data-demarche="afficher">Afficher la démarche</button></div>' : '') +
        '<section class="presentation-demarche" aria-labelledby="demarcheTitre_' + escapeHtml(q.id) + '"' + (demarcheDifferee ? ' hidden' : '') + '>' +
          '<h2 id="demarcheTitre_' + escapeHtml(q.id) + '">La démarche, en produit croisé</h2>' +
          demarcheHtml(q.demarche) +
        '</section>' : '');
    if (avecNarration) brancherNarration(q, box);
  }

  /* ── Narration des pages de présentation ─────────────────────────────────────
     Source 1 : fichier audio local (q.audio, ex. ./src/audio/p1.mp3), voix humaine ou neuronale.
     Source 2 (provisoire, si le fichier est absent) : synthèse vocale de l'appareil, voix française
     locale seulement (aucun envoi du texte à un service externe, Loi 25).
     La démarche apparaît au début du dernier paragraphe (synthèse), à q.audioDemarcheSec ou à la
     fin du fichier audio. */

  const demarchesRevelees = {};
  const audioDisponible = {};
  let narration = null;
  let voixLocales = [];

  function chargerVoix() {
    if (!('speechSynthesis' in window)) return;
    voixLocales = window.speechSynthesis.getVoices().filter(function (v) {
      return v.localService && /^fr/i.test(v.lang);
    });
  }
  if ('speechSynthesis' in window) {
    chargerVoix();
    window.speechSynthesis.addEventListener('voiceschanged', chargerVoix);
  }
  window.addEventListener('pagehide', arreterNarration);

  function voixFrancaise() {
    chargerVoix();
    return voixLocales.find(function (v) { return /^fr-CA/i.test(v.lang); }) || voixLocales[0] || null;
  }

  /** Vérifie à l'avance si le fichier audio existe, pour choisir la source avant le clic. */
  function sonderAudio(src) {
    if (!src || src in audioDisponible) return;
    audioDisponible[src] = null;
    const a = new Audio();
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', function () { audioDisponible[src] = true; });
    a.addEventListener('error', function () { audioDisponible[src] = false; });
    a.src = src;
  }

  /** Fichier audio de la narration : q.audio, sinon ./src/audio/<id>.mp3 (convention du mode narration). */
  function cheminAudio(q) {
    if (!Array.isArray(q.narration) || !q.narration.length) return null;
    return q.audio || ('./src/audio/' + q.id + '.mp3');
  }

  function narrationPossible(q) {
    if (cheminAudio(q) && audioDisponible[cheminAudio(q)] !== false) return true;
    return 'speechSynthesis' in window;
  }

  function narrationLecteurHtml(q) {
    sonderAudio(cheminAudio(q));
    if (!narrationPossible(q)) return '';
    return '<div class="narration-lecteur">' +
        '<button type="button" class="btn btn-primary" data-narration="basculer">Écouter l\'explication</button>' +
        '<button type="button" class="btn" data-narration="recommencer" hidden>Recommencer</button>' +
        '<p class="narration-etat" aria-live="polite"></p>' +
      '</div>';
  }

  function brancherNarration(q, box) {
    const bascule = box.querySelector('[data-narration="basculer"]');
    const recommencer = box.querySelector('[data-narration="recommencer"]');
    const afficher = box.querySelector('[data-demarche="afficher"]');
    const transcription = box.querySelector('.presentation-transcription');
    if (bascule) bascule.addEventListener('click', function () {
      if (narration && narration.box === box) {
        if (narration.etat === 'lecture') return pauseNarration(narration);
        if (narration.etat === 'pause') return reprendreNarration(narration);
      }
      demarrerNarration(q, box);
    });
    if (recommencer) recommencer.addEventListener('click', function () { demarrerNarration(q, box); });
    if (afficher) afficher.addEventListener('click', function () { revelerDemarche(q, box); });
    if (transcription) transcription.addEventListener('toggle', function () {
      if (transcription.open) revelerDemarche(q, box);
    });
  }

  function majLecteur(n, etat, message) {
    n.etat = etat;
    const bascule = n.box.querySelector('[data-narration="basculer"]');
    const recommencer = n.box.querySelector('[data-narration="recommencer"]');
    const zone = n.box.querySelector('.narration-etat');
    const libelles = { lecture: 'Mettre en pause', pause: 'Reprendre', fin: 'Réécouter l\'explication' };
    if (bascule) bascule.textContent = libelles[etat] || 'Écouter l\'explication';
    if (recommencer) recommencer.hidden = etat === 'fin';
    if (zone && message !== undefined) zone.textContent = message;
  }

  function texteParle(t) {
    return String(t).replace(/\*\*/g, '').replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1');
  }

  function demarrerNarration(q, box) {
    arreterNarration();
    const n = { q: q, box: box, etat: 'lecture' };
    narration = n;

    const src = cheminAudio(q);
    if (src && audioDisponible[src] !== false) {
      n.mode = 'audio';
      n.audio = new Audio(src);
      n.audio.addEventListener('timeupdate', function () {
        if (narration === n && q.audioDemarcheSec != null && n.audio.currentTime >= q.audioDemarcheSec) revelerDemarche(q, box);
      });
      n.audio.addEventListener('ended', function () {
        if (narration !== n) return;
        revelerDemarche(q, box);
        majLecteur(n, 'fin', 'Écoute terminée.');
      });
      n.audio.addEventListener('error', function () {
        if (narration !== n) return;
        audioDisponible[src] = false;
        narration = null;
        demarrerNarration(q, box);
      });
      majLecteur(n, 'lecture', 'Lecture en cours.');
      n.audio.play().catch(function () {});
      return;
    }

    const voix = voixFrancaise();
    if (!voix) {
      narration = null;
      const zone = box.querySelector('.narration-etat');
      if (zone) zone.textContent = 'Aucune voix française n\'est installée sur cet appareil. La transcription est affichée.';
      const transcription = box.querySelector('.presentation-transcription');
      if (transcription) transcription.open = true;
      revelerDemarche(q, box);
      return;
    }
    n.mode = 'voix';
    const derniere = q.narration.length - 1;
    q.narration.forEach(function (paragraphe, i) {
      const u = new SpeechSynthesisUtterance(texteParle(paragraphe));
      u.voice = voix;
      u.lang = voix.lang;
      u.rate = 0.95;
      if (i === derniere) {
        u.addEventListener('start', function () { if (narration === n) revelerDemarche(q, box); });
        u.addEventListener('end', function () {
          if (narration !== n) return;
          revelerDemarche(q, box);
          majLecteur(n, 'fin', 'Écoute terminée.');
        });
      }
      window.speechSynthesis.speak(u);
    });
    majLecteur(n, 'lecture', 'Lecture en cours (voix provisoire de l\'appareil).');
  }

  function pauseNarration(n) {
    if (n.mode === 'audio') n.audio.pause();
    else window.speechSynthesis.pause();
    majLecteur(n, 'pause', 'En pause.');
  }

  function reprendreNarration(n) {
    if (n.mode === 'audio') n.audio.play().catch(function () {});
    else window.speechSynthesis.resume();
    majLecteur(n, 'lecture', 'Lecture en cours.');
  }

  function arreterNarration() {
    const n = narration;
    narration = null;
    if (!n) return;
    if (n.audio) n.audio.pause();
    if (n.mode === 'voix' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function revelerDemarche(q, box) {
    if (!q.demarche) return;
    const section = box.querySelector('.presentation-demarche');
    if (!section || !section.hidden) return;
    demarchesRevelees[q.id] = true;
    section.hidden = false;
    const acces = box.querySelector('.demarche-acces');
    if (acces) acces.hidden = true;
    const zone = box.querySelector('.narration-etat');
    if (zone) zone.textContent = 'La démarche est affichée sous l\'image.';
    if (window.ScormAPI && typeof window.ScormAPI.adjustParentIframeHeight === 'function') {
      window.ScormAPI.adjustParentIframeHeight(32);
    }
  }

  /* ── Démarches en LaTeX (rendu MathJax local ./src/mathjax.js) ───────────────
     Mini-syntaxe des données : [[mL]] = unité biffée (iffer, commande locale), [L] = unité qui reste.
     Un mot qui suit un nombre est une unité (\text) ; une lettre seule est une variable (italique). */

  /** Texte inséré dans \text{…} : on retire les caractères spéciaux de LaTeX. */
  function texTexte(t) {
    return String(t).replace(/[\\{}$&#^_%~]/g, '');
  }

  /** Nombre français pour LaTeX : virgule décimale 0{,}5 et espace des milliers 1\,000. */
  function texNombre(n) {
    return n.trim().replace(/,/g, '{,}').replace(/[\s  ]+/g, '\\,');
  }

  /** Convertit une expression des données (« 15 [g] × 1 [[L]] », « 0,5 L », « x ») en LaTeX. */
  function texExpr(texte) {
    const src = String(texte == null ? '' : texte);
    const re = /\[\[(.+?)\]\]|\[(.+?)\]|(\d(?:[\d,]|[\s\u00a0\u202f](?=\d))*)|([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\/[A-Za-zÀ-ÖØ-öø-ÿ]+)?)|(×|÷|⟶|→|=|\+|−|-|\(|\))|(\s+)|(.)/g;
    const operateurs = { '×': ' \\times ', '÷': ' \\div ', '⟶': ' \\quad\\longrightarrow\\quad ', '→': ' \\quad\\longrightarrow\\quad ', '−': ' - ' };
    let out = '';
    let apresNombre = false;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[1]) { out += '\\ \\biffer{\\text{' + texTexte(m[1]) + '}}'; apresNombre = false; }
      else if (m[2]) { out += '\\ \\text{' + texTexte(m[2]) + '}'; apresNombre = false; }
      else if (m[3]) { out += texNombre(m[3]); apresNombre = true; }
      else if (m[4]) {
        if (apresNombre) out += '\\ \\text{' + texTexte(m[4]) + '}';
        else if (m[4].length > 1) out += '\\text{' + texTexte(m[4]) + '}';
        else out += m[4];
        apresNombre = false;
      }
      else if (m[5]) { out += operateurs[m[5]] || (' ' + m[5] + ' '); apresNombre = false; }
      else if (m[7]) { out += texTexte(m[7]); apresNombre = false; }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function texFraction(num, den) {
    return '\\dfrac{' + texExpr(num) + '}{' + texExpr(den) + '}';
  }

  /** Bloc d'affichage MathJax ; le LaTeX est échappé pour l'insertion HTML. */
  function texBloc(tex, classe) {
    return '<div class="demarche-tex' + (classe ? ' ' + classe : '') + '">\\[ ' + escapeHtml(tex) + ' \\]</div>';
  }

  /** Formules prêtes à l'emploi : fraction verticale avec indices et légende « où ». */
  const FORMULES = {
    concentration: {
      gauche: 'C',
      num: ['m', 'soluté'],
      den: ['V', 'solution'],
      legende: [
        [['C', ''], 'concentration en grammes par litre (g/L)'],
        [['m', 'soluté'], 'masse de soluté en grammes (g)'],
        [['V', 'solution'], 'volume de la solution en litres (L)']
      ]
    }
  };

  function texVariable(v) {
    // Indice en italique, comme dans la référence .agents/skills/eval_pfeq/resources/reference_formule_concentration.png
    return texTexte(v[0]) + (v[1] ? '_{\\mathit{' + texTexte(v[1]) + '}}' : '');
  }

  /**
   * Formule originale, en première ligne : soit une formule nommée de FORMULES (ex. « concentration »),
   * rendue C = \dfrac{m_{\text{soluté}}}{V_{\text{solution}}} avec sa légende « où »,
   * soit une équivalence simple (ex. « 1 L = 1 000 mL »).
   */
  function formuleHtml(f) {
    const def = (typeof f === 'string') ? FORMULES[f] : f;
    if (!def) return texBloc(texExpr(f), 'demarche-formule');
    return '<div class="demarche-formule formule-math">' +
        texBloc(texTexte(def.gauche) + ' = \\dfrac{' + texVariable(def.num) + '}{' + texVariable(def.den) + '}', 'formule-ligne') +
        (def.legende ? '<p class="formule-ou">où</p><dl class="formule-legende">' +
          def.legende.map(function (l) {
            return '<div><dt>\\( ' + escapeHtml(texVariable(l[0])) + ' \\)</dt><dd>: ' + escapeHtml(l[1]) + '</dd></div>';
          }).join('') + '</dl>' : '') +
      '</div>';
  }

  /** Substitution dans la formule : C = (valeurs de la 1re ligne) = (valeurs de la 2e ligne). */
  function substitutionHtml(e, def) {
    const lignes = e.lignes || [];
    if (lignes.length < 2) return '';
    return texBloc(texTexte(def ? def.gauche : 'C') + ' = ' + texFraction(lignes[0][0], lignes[0][1]) +
      ' = ' + texFraction(lignes[1][0], lignes[1][1]), 'formule-substitution');
  }

  /**
   * Démarche en produit croisé, à la manière d'un humain : formule originale en première ligne,
   * inconnue déclarée, substitution dans la fraction, tableau de correspondance avec unités,
   * calcul LaTeX avec unités biffées (\biffer) et résultat encadré (\boxed) avec son unité.
   * d = { formule, etapes: [{ titre, inconnue, rapport, entetes: [g, d], lignes: [[g, d], [g, d]], symbole,
   *       calcul: { num, den, intermediaire: { num, den } }, resultat, suite, biffage }], verification }
   */
  /**
   * Transformation à l'intérieur du produit croisé, toujours écrite en LaTeX (jamais en tableau fléché) :
   * chaque ligne de données forme une fraction, lignes[r][0] / lignes[r][1]. Quand l'inconnue est au
   * numérateur, son dénominateur (« mobile ») est encerclé et passe de l'autre côté du signe =, au
   * numérateur, où il multiplie. Positions [ligne, colonne] ; null si la forme ne s'y prête pas.
   */
  function deplacementProduitCroise(e) {
    const l = e.lignes;
    if (!e.symbole || !l || l.length !== 2 || l[0].length !== 2 || l[1].length !== 2) return null;
    let pos = null;
    [0, 1].forEach(function (r) { [0, 1].forEach(function (c) { if (l[r][c] === e.symbole) pos = [r, c]; }); });
    if (!pos || pos[1] !== 0) return null;
    const r = pos[0], o = 1 - pos[0];
    return { inconnue: pos, mobile: [r, 1], cible: [o, 0], diviseur: [o, 1] };
  }

  /** Valeur encerclée : commande locale \cercle{} définie dans la configuration MathJax de la coquille. */
  function texCercle(tex) {
    return '\\cercle{' + tex + '}';
  }

  /** Égalité des deux rapports, puis déplacement de la valeur encerclée, en une ligne LaTeX. */
  function transformationTex(e, dep) {
    const l = e.lignes;
    const frac = function (r) {
      const den = (dep && dep.mobile[0] === r) ? texCercle(texExpr(l[r][1])) : texExpr(l[r][1]);
      return '\\dfrac{' + texExpr(l[r][0]) + '}{' + den + '}';
    };
    let tex = frac(0) + ' = ' + frac(1);
    if (dep) {
      const v = function (rc) { return texExpr(l[rc[0]][rc[1]]); };
      tex += ' \\quad \\xrightarrow[\\text{il multiplie } ' + v(dep.cible) + ']{' + v(dep.mobile) + '\\text{ change de côté}} \\quad ' +
        texExpr(e.symbole) + ' = \\dfrac{' + v(dep.cible) + ' \\times ' + texCercle(v(dep.mobile)) + '}{' + v(dep.diviseur) + '}';
    }
    return tex;
  }

  /** Encercle, dans le numérateur LaTeX, la valeur qui s'est déplacée (avec son unité, biffée ou non). */
  function texEncercler(tex, valeur) {
    const nombre = (String(valeur).match(/\d(?:[\d,]|[\s  ](?=\d))*/) || [])[0];
    if (!nombre) return tex;
    const n = texNombre(nombre).replace(/[\\{}^$.*+?()[\]|]/g, '\\$&');
    // Nombre complet (« 1 » n'encercle pas le début de « 10 g ») ; la valeur placée après « × » est
    // préférée, car c'est là que la transformation l'a fait monter.
    const corps = '(' + n + '(?![0-9]|\\{,\\}|\\\\,)(?:\\\\ \\\\biffer\\{\\\\text\\{[^}]*\\}\\}|\\\\ \\\\text\\{[^}]*\\})?)';
    const encercler = function (_, avant, valeurTex) { return avant + texCercle(valeurTex); };
    const apresFois = new RegExp('(\\\\times )' + corps);
    if (apresFois.test(tex)) return tex.replace(apresFois, encercler);
    return tex.replace(new RegExp('(^)' + corps), encercler);
  }

  /**
   * Démarche en produit croisé, à la manière d'un humain, entièrement en LaTeX : formule originale en
   * première ligne, inconnue déclarée, substitution dans la fraction, égalité des rapports avec la
   * valeur encerclée qui change de côté, calcul avec unités biffées (\biffer) et résultat encadré (\boxed).
   * d = { formule, etapes: [{ titre, inconnue, rapport, lignes: [[num, den], [num, den]], symbole,
   *       calcul: { num, den, intermediaire: { num, den } }, resultat, suite, biffage }], verification }
   */
  function demarcheHtml(d) {
    let html = '<div class="human-sheet">';
    const defFormule = (typeof d.formule === 'string') ? FORMULES[d.formule] : d.formule;
    if (d.formule) html += formuleHtml(d.formule);
    (d.etapes || []).forEach(function (e, i) {
      html += '<div class="resolution-step-card">' +
        '<span class="step-label-pill">Étape ' + (i + 1) + ' : ' + escapeHtml(e.titre || '') + '</span>';
      if (e.inconnue) html += '<p class="step-instruction">' + texteEnrichi(e.inconnue) + '</p>';
      // Calcul tiré de la formule originale : on remplace les lettres par les valeurs dans la fraction
      if (e.rapport) {
        html += '<p class="step-instruction">On remplace les lettres de la formule par les valeurs, avec leurs unités :</p>' +
          substitutionHtml(e, defFormule);
      }
      const dep = deplacementProduitCroise(e);
      if (e.lignes && e.lignes.length === 2) {
        const val = function (rc) { return '\\( ' + escapeHtml(texExpr(e.lignes[rc[0]][rc[1]])) + ' \\)'; };
        html += '<p class="step-instruction">' + (e.rapport ? 'On garde l\'égalité des deux fractions' : 'On écrit l\'égalité des deux rapports') +
          (dep ? ', puis on encercle ' + val(dep.mobile) + ', sous ' + val(dep.inconnue) +
            ' : cette valeur change de côté du signe =, monte au numérateur et multiplie ' + val(dep.cible) +
            '. Rien d\'autre ne bouge.' : ' :') + '</p>' +
          texBloc(transformationTex(e, dep), 'demarche-transformation');
      }
      if (e.calcul) {
        const numTex = dep ? texEncercler(texExpr(e.calcul.num), e.lignes[dep.mobile[0]][dep.mobile[1]]) : texExpr(e.calcul.num);
        html += '<p class="step-instruction">On calcule en biffant les unités qui s\'annulent :</p>' +
          texBloc(texExpr(e.symbole || '') + ' = \\dfrac{' + numTex + '}{' + texExpr(e.calcul.den) + '}' +
          (e.calcul.intermediaire ? ' = ' + texFraction(e.calcul.intermediaire.num, e.calcul.intermediaire.den) : '') +
          ' = \\boxed{' + texExpr(e.resultat || '') + '}' +
          (e.suite ? ' ' + texExpr(e.suite) : ''), 'demarche-calcul');
      }
      if (e.biffage) {
        html += '<div class="unit-simplif-callout"><span class="simplif-badge">Unités biffées</span><span>' + texteEnrichi(e.biffage) + '</span></div>';
      }
      html += '</div>';
    });
    if (d.verification) {
      html += '<div class="human-tip-box"><strong>Vérification de bon sens :</strong> ' + texteEnrichi(d.verification) + '</div>';
    }
    return html + '</div>';
  }

  /** Rendu MathJax (bundle local) d'une zone qui vient d'être réécrite. */
  function typesetMath(el, essai) {
    const mj = window.MathJax;
    if (!el) return;
    // MathJax pas encore prêt : on réessaie brièvement
    if (!mj || !mj.startup || !mj.startup.promise || typeof mj.typesetPromise !== 'function') {
      if ((essai || 0) < 600) setTimeout(function () { typesetMath(el, (essai || 0) + 1); }, 100);
      return;
    }
    // File d'attente : les rendus successifs ne se chevauchent jamais
    mj.startup.promise = mj.startup.promise.then(function () {
      if (!el.isConnected) return null;
      if (typeof mj.typesetClear === 'function') mj.typesetClear([el]);
      return mj.typesetPromise([el]);
    }).then(function () {
      if (window.ScormAPI && typeof window.ScormAPI.adjustParentIframeHeight === 'function') {
        window.ScormAPI.adjustParentIframeHeight(32);
      }
    }).catch(function (err) {
      if (window.console) console.warn('MathJax :', err && err.message);
    });
  }

  /** Mode deux pages : réaffiche la page courante (présentation ou question) en haut de l'écran. */
  function afficherPageCourante() {
    renderCurrentQuestion();
    updateCoachForCurrentQuestion();
    updateQuestionIndicator();
    try { window.scrollTo(0, 0); } catch (e) {}
    const cible = isQuestionMasquee() ? document.getElementById('main-scorm-content') : document.getElementById('questionPrompt');
    if (cible) cible.focus();
    if (window.ScormAPI && typeof window.ScormAPI.adjustParentIframeHeight === 'function') {
      setTimeout(function () { window.ScormAPI.adjustParentIframeHeight(32); }, 50);
    }
  }

  function revelerQuestion() {
    questionsRevelees[currentIndex] = true;
    if (DEUX_PAGES) {
      afficherPageCourante();
      return;
    }
    renderCurrentQuestion();
    updateCoachForCurrentQuestion();
    const prompt = document.getElementById('questionPrompt');
    if (prompt) prompt.focus();
  }

  function shouldShowRemediation(q) {
    if (!validatedQuestions[currentIndex]) return false;
    const selected = q.choices.find(function (c) { return c.id === userAnswers[q.id]; });
    return selected && !selected.correct && q.remediation;
  }

  function renderRemediationContent(q, container) {
    const rem = q.remediation;
    if (!rem) return;
    const isRemValidated = !!validatedRemediations[q.id];

    let html =
      '<div class="remediation-badge">Deuxième chance — Question guidée (' + rem.points + '\u00a0point)</div>' +
      '<p class="remediation-prompt"><strong>' + escapeHtml(rem.question) + '</strong></p>' +
      (rem.image ? '<div class="question-figure-card remediation-figure">' + figureHtml(rem.image, rem.imageCaption, rem.imageAlt || rem.imageCaption || q.titre) + '</div>' : '') +
      '<div class="choice-list remediation-choice-list"></div>';
    container.innerHTML = html;

    const list = container.querySelector('.remediation-choice-list');
    const shuffledRemChoices = getShuffledChoices(q.id + '_rem', rem.choices);

    shuffledRemChoices.forEach(function (choice) {
      const item = document.createElement('label');
      item.className = 'choice-item' + (remediationAnswers[q.id] === choice.id ? ' selected' : '');
      if (isRemValidated) {
        if (choice.correct) item.classList.add('correct');
        else if (remediationAnswers[q.id] === choice.id) item.classList.add('incorrect');
      }
      item.innerHTML =
        '<input type="radio" name="rem_choice_' + q.id + '" value="' + choice.id + '" ' +
          (remediationAnswers[q.id] === choice.id ? 'checked ' : '') +
          (isRemValidated ? 'disabled ' : '') + '>' +
        '<span class="choice-text">' + escapeHtml(choice.text) + '</span>';
      if (!isRemValidated) {
        item.querySelector('input').addEventListener('change', function () {
          remediationAnswers[q.id] = choice.id;
          list.querySelectorAll('.choice-item').forEach(function (el) { el.classList.remove('selected'); });
          item.classList.add('selected');
          updateBottomNavComprehension();
        });
      }
      list.appendChild(item);
    });

    if (isRemValidated) {
      const chosen = rem.choices.find(function (c) { return c.id === remediationAnswers[q.id]; });
      const resBox = document.createElement('div');
      resBox.className = 'remediation-result ' + (chosen && chosen.correct ? 'success' : 'fail');
      resBox.innerHTML =
        '<strong>' + (chosen && chosen.correct ? 'Récupération réussie (+1\u00a0point)&nbsp;!' : 'Réponse incorrecte.') + '</strong>' +
        '<p>' + escapeHtml((chosen ? chosen.feedback : '') || rem.solution) + '</p>';
      container.appendChild(resBox);
    }
  }

  function formatDidacticExplanation(text) {
    if (!text) return '';
    const paragraphs = String(text).split(/\n\s*\n/);
    return paragraphs.map(function(p) {
      return '<p style="margin: 0.4rem 0; line-height: 1.55;">' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function renderFeedbackContent(q, container) {
    if (!container) return;
    const selected = (q.choices || []).find(function (c) { return c.id === userAnswers[q.id]; });
    const isSuccess = selected && selected.correct;

    if (isSuccess) {
      // Réponse correcte : la rétroaction concise est dans l'Assistant, aucune explication superflue en bas (évite d'allonger la page)
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    // Réponse erronée : afficher l'explication didactique détaillée en bas
    container.style.display = 'block';
    const trois = q.explication && typeof q.explication === 'object';
    container.innerHTML =
      '<div class="feedback-badge alert">Explication didactique pour t\'aider</div>' +
      '<div class="feedback-content">' +
        '<div class="feedback-didactic-box">' +
          (trois ? explicationTroisTempsHtml(q, selected) :
            formatDidacticExplanation(q.explication) +
            (q.explicationDemarche ? demarcheHtml(q.explicationDemarche) : '')) +
        '</div>' +
      '</div>';
  }

  /* Explication en trois temps (Hattie) : analyse cognitive de la réponse choisie, puis
     savoir que (connaissance déclarative), savoir comment (procédure, avec la démarche) et
     savoir avec (transfert : quand, pourquoi et comment l'utiliser dans une autre situation). */
  const TYPES_ERREUR = {
    conception: 'Conception erronée',
    procedure: 'Erreur de procédure',
    strategie: 'Erreur de stratégie',
    transfert: 'Erreur de transfert',
    execution: 'Erreur d\'exécution'
  };

  function explicationTroisTempsHtml(q, selected) {
    const e = q.explication;
    let html = '';
    if (selected && !selected.correct) {
      const type = TYPES_ERREUR[selected.erreur] || '';
      html += '<section class="expl-temps expl-analyse">' +
        '<h3>Analyse de ton raisonnement</h3>' +
        '<p class="expl-choix">Ton choix : « ' + escapeHtml(selected.text) + ' »</p>' +
        (type ? '<p><strong>' + escapeHtml(type) + '.</strong> ' + escapeHtml(selected.analyse || selected.feedback || '') + '</p>'
              : '<p>' + escapeHtml(selected.analyse || selected.feedback || '') + '</p>') +
      '</section>';
    }
    if (e.savoirQue) {
      html += '<section class="expl-temps"><h3>1. Savoir que : ce qui est vrai</h3>' +
        formatDidacticExplanation(e.savoirQue) +
        (e.image ? '<figure class="expl-figure"><img src="' + escapeHtml(e.image) + '" alt="' + escapeHtml(e.imageAlt || '') + '">' +
          (e.imageCaption ? '<figcaption>' + escapeHtml(e.imageCaption) + '</figcaption>' : '') + '</figure>' : '') +
        '</section>';
    }
    if (e.savoirComment || q.explicationDemarche) {
      html += '<section class="expl-temps"><h3>2. Savoir comment : la démarche</h3>' +
        formatDidacticExplanation(e.savoirComment || '') +
        (q.explicationDemarche ? demarcheHtml(q.explicationDemarche) : '') +
        '</section>';
    }
    if (e.savoirAvec) {
      html += '<section class="expl-temps"><h3>3. Savoir avec : l\'utiliser ailleurs</h3>' +
        formatDidacticExplanation(e.savoirAvec) + '</section>';
    }
    return html;
  }

  /** Texte brut de l'explication (chaîne ou trois temps), pour l'Assistant enseignant et le simulateur. */
  function explicationTexte(q) {
    const e = q && q.explication;
    if (!e) return '';
    if (typeof e === 'string') return e;
    return [e.savoirQue, e.savoirComment, e.savoirAvec].filter(Boolean).join('\n\n');
  }

  /* ─────────────────────────────────────────────────────────────────
     VALIDATION — MODE COMPRÉHENSION
  ───────────────────────────────────────────────────────────────── */

  function validateComprehension() {
    const q = questions[currentIndex];
    if (!q) return;

    if (isQuestionMasquee()) {
      revelerQuestion();
      return;
    }

    if (validatedQuestions[currentIndex]) {
      if (shouldShowRemediation(q) && !validatedRemediations[q.id]) {
        validateRemediation(q);
      }
      return;
    }

    const ansId = userAnswers[q.id];
    if (ansId === undefined || ansId === null) return;

    const opt = q.choices.find(function (c) { return c.id === ansId; });
    const pointsGagnes = (opt && opt.correct) ? q.points : 0;

    pointsParQuestion[currentIndex] = pointsGagnes;
    score += pointsGagnes;
    validatedQuestions[currentIndex] = true;

    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      // Statut final seulement à l'envoi (écran de fin) ; ici, score provisoire.
      window.ScormAPI.setStatus('incomplete');
      window.ScormAPI.commit();
    }

    notifyParent({
      type: 'SCORE_UPDATE',
      score: score,
      total: TOTAL_POINTS,
      questionIndex: currentIndex,
      pointsGagnes: pointsGagnes
    });

    renderStepBar();
    loadQuestion(currentIndex);
  }

  function validateRemediation(q) {
    const rem = q.remediation;
    if (!rem) return;
    const remAnsId = remediationAnswers[q.id];
    if (remAnsId === undefined || remAnsId === null) return;

    const chosen = rem.choices.find(function (c) { return c.id === remAnsId; });
    const ptsRem = (chosen && chosen.correct) ? (rem.points || 1) : 0;

    pointsParQuestion[currentIndex] = (pointsParQuestion[currentIndex] || 0) + ptsRem;
    score += ptsRem;
    validatedRemediations[q.id] = true;

    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      // Statut final seulement à l'envoi (écran de fin) ; ici, score provisoire.
      window.ScormAPI.setStatus('incomplete');
      window.ScormAPI.commit();
    }

    notifyParent({
      type: 'SCORE_UPDATE',
      score: score,
      total: TOTAL_POINTS,
      questionIndex: currentIndex,
      pointsGagnes: pointsParQuestion[currentIndex]
    });

    renderStepBar();
    loadQuestion(currentIndex);
  }

  function updateCoachWidgetComprehension(q, isCorrect, points) {
    const coachMsg = document.getElementById('coachActiveMsg');
    if (!coachMsg) return;
    const selected = (q.choices || []).find(function (c) { return c.id === userAnswers[q.id]; });
    const directFeedback = selected && selected.feedback
      ? selected.feedback
      : (isCorrect ? (q.solution || 'Bonne réponse !') : 'Cette option ne correspond pas aux données scientifiques.');

    if (isCorrect) {
      coachMsg.innerHTML =
        '<div class="coach-feedback-header coach-feedback-success">' +
          '<span class="coach-feedback-icon">✓</span>' +
          '<span>Bravo\u00a0! Réponse validée (+' + points + '\u00a0pt' + (points > 1 ? 's' : '') + ')</span>' +
        '</div>' +
        '<div class="coach-feedback-body">' +
          escapeHtml(directFeedback) +
        '</div>';
    } else {
      coachMsg.innerHTML =
        '<div class="coach-feedback-header coach-feedback-alert">' +
          '<span class="coach-feedback-icon">⚠️</span>' +
          '<span>Ce n\'est pas tout à fait ça (+0 pt)</span>' +
        '</div>' +
        '<div class="coach-feedback-body">' +
          escapeHtml(directFeedback) +
        '</div>' +
        '<div class="coach-read-advice">' +
          '<strong>💡 Conseil de l\'Assistant\u00a0:</strong> Prends le temps de lire l\'explication détaillée affichée en bas de la page ' +
          (q.remediation ? 'avant de tenter la question guidée ci-dessous.' : 'pour bien comprendre cette notion.') +
        '</div>';
    }
    setCoachVisible(true);
  }

  function updateCoachWidgetRemediation(q, isCorrect, feedbackText) {
    const coachMsg = document.getElementById('coachActiveMsg');
    if (!coachMsg) return;
    const pts = isCorrect ? (q.remediation && q.remediation.points ? q.remediation.points : 1) : 0;
    coachMsg.innerHTML =
      '<div class="coach-feedback-header ' + (isCorrect ? 'coach-feedback-success' : 'coach-feedback-alert') + '">' +
        '<span class="coach-feedback-icon">' + (isCorrect ? '✓' : '⚠️') + '</span>' +
        '<span>' + (isCorrect ? 'Deuxième chance réussie (+' + pts + '\u00a0pt) !' : 'Deuxième chance non récupérée (+0 pt)') + '</span>' +
      '</div>' +
      '<div class="coach-feedback-body">' +
        escapeHtml(feedbackText || '') +
      '</div>';
    setCoachVisible(true);
  }

  /* ─────────────────────────────────────────────────────────────────
     VALIDATION — Routeur
  ───────────────────────────────────────────────────────────────── */

  function validateCurrentAnswer() {
    if (MODE === 'corrige') {
      validateCorrige();
    } else {
      validateComprehension();
    }
  }

  /* ─────────────────────────────────────────────────────────────────
     LISTENER postMessage (depuis simulateur enseignant)
  ───────────────────────────────────────────────────────────────── */

  window.addEventListener('message', function (event) {
    if (!event.data) return;
    const msg = event.data;
    if (msg.type === 'GOTO_QUESTION' && typeof msg.index === 'number') {
      if (isWelcomeActive) {
        isWelcomeActive = false;
        const welcome = document.getElementById('welcomeScreen');
        if (welcome) welcome.style.display = 'none';
      }
      loadQuestion(msg.index, msg.page);
    } else if (msg.type === 'NARRATION_AUDIO_MAJ') {
      // Le simulateur vient d'enregistrer un fichier : on oublie le résultat de la sonde et on réaffiche.
      arreterNarration();
      if (msg.src) delete audioDisponible[msg.src];
      if (!isWelcomeActive) renderCurrentQuestion();
    } else if (msg.type === 'TOGGLE_CORRIGE') {
      modeCorrigeActive = !!msg.visible;
      document.body.classList.toggle('mode-corrige-active', modeCorrigeActive);
      renderCurrentQuestion();
      if (MODE === 'corrige') updateBottomNavCorrige();
    } else if (msg.type === 'MODE_CORRIGE_ON') {
      activateModeCorrige();
    } else if (msg.type === 'MODE_CORRIGE_OFF') {
      deactivateModeCorrige();
    }
  });

  /* ─────────────────────────────────────────────────────────────────
     INITIALISATION
  ───────────────────────────────────────────────────────────────── */

  function initApp() {
    // Ouverture directe (hors Moodle et hors simulateur) : aucune iframe à agrandir, la page doit défiler
    if (window.parent === window) {
      document.body.style.setProperty('overflow-y', 'auto', 'important');
    }

    // Initialisation SCORM silencieuse
    if (window.ScormAPI) {
      window.ScormAPI.init();
      window.ScormAPI.setScore(0, 0, TOTAL_POINTS);
    }

    renderStepBar();
    setupCoachToggle();
    setCoachVisible(false); // jamais ouvert au démarrage avec le message générique
    setupImageLightbox();
    setupMoodleSubmitModal();
    setupBottomNav();

    // Démarrage par défaut sur l'écran d'accueil épuré
    if (config.skipWelcome) {
      isWelcomeActive = false;
      loadQuestion(0);
    } else {
      isWelcomeActive = true;
      renderWelcomeScreen();
    }

    // Signal au simulateur enseignant
    notifyParent({
      type: 'ACTIVITY_READY',
      questions: questions.map(function (q, idx) {
        var reponseCorrecte;
        if (MODE === 'comprehension') {
          reponseCorrecte = (q.choices.find(function (c) { return c.correct; }) || {}).text || '';
        } else {
          reponseCorrecte = getCorrectSummaryCorrige(q);
        }
        return {
          index: idx,
          points: q.points,
          titre: q.titre,
          solution: q.solution,
          reponseCorrecte: reponseCorrecte,
          explication: explicationTexte(q),
          id: q.id,
          narration: q.narration || null,
          audio: cheminAudio(q)
        };
      })
    });
  }

  function getCorrectSummaryCorrige(q) {
    if (q.solution) return q.solution;
    switch (q.type) {
      case 'radio': {
        const correct = (q.choices || []).find(function (c) { return c.correct; });
        return correct ? correct.text : '';
      }
      case 'shortanswer': return (q.acceptedAnswers || [])[0] || '';
      default: return '';
    }
  }

  // Démarrage au chargement du DOM
  document.addEventListener('DOMContentLoaded', function () {
    initApp();
  });

})();
