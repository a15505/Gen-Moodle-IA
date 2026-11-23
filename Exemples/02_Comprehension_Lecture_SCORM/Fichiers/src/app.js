/**
 * App.js - Contrôleur de l'Activité Élève SCORM 1.2
 * Sujet : Le système digestif et la nutrition — Exercice de compréhension de lecture
 * Modèle Navigation Haut / Bas conforme moteur-ui (Archétype 2)
 * Scoring cumulatif débutant obligatoirement à 0 / 24 pts (0 %)
 * Ordre aléatoire obligatoire des options (Fisher-Yates stabilisé par session)
 * Remédiation adaptative immédiate avec points de récupération partiels
 */
(function() {
  'use strict';

  const questions = window.QUESTIONS_DATA || [];
  const TOTAL_POINTS = 24;
  let currentIndex = 0;
  let score = 0; // Départ strict à 0 pt
  const userAnswers = {};
  const validatedQuestions = {};
  const remediationAnswers = {};
  const validatedRemediations = {};
  const pointsParQuestion = {};
  let modeCorrigeActive = false;

  // Mémoire de mélange aléatoire pour les questions (stabilisée par session)
  const sessionShuffledChoices = {};

  function getShuffledChoices(key, choices) {
    if (!choices || !Array.isArray(choices)) return [];
    if (!sessionShuffledChoices[key]) {
      const copy = [...choices];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      sessionShuffledChoices[key] = copy;
    }
    return sessionShuffledChoices[key];
  }

  // Initialisation SCORM silencieuse
  if (window.ScormAPI) {
    window.ScormAPI.init();
    window.ScormAPI.setScore(0, 0, TOTAL_POINTS);
  }

  function initApp() {
    renderStepBar();
    loadQuestion(0);
    setupBottomNav();
    setupCoachToggle();
    setupImageLightbox();

    // Signalement au simulateur enseignant
    notifyParent({
      type: 'ACTIVITY_READY',
      questions: questions.map((q, idx) => ({
        index: idx,
        points: q.points,
        titre: q.titre,
        solution: q.solution,
        reponseCorrecte: (q.choices.find(c => c.correct) || {}).text || '',
        explication: q.explication
      }))
    });
  }

  // -------------------------------------------------------------
  // Stepper supérieur (Pastilles 1 à N)
  // -------------------------------------------------------------
  function renderStepBar() {
    const bar = document.getElementById('stepPillBar');
    if (!bar) return;
    bar.innerHTML = '';

    questions.forEach((q, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'step-pill';
      pill.setAttribute('aria-label', `Défi ${idx + 1} : ${q.titre}`);
      pill.textContent = idx + 1;

      if (idx === currentIndex) pill.classList.add('active');

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

      pill.addEventListener('click', () => {
        loadQuestion(idx);
      });

      bar.appendChild(pill);
    });

    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    const badge = document.getElementById('hudScoreBadge');
    if (badge) {
      const percent = Math.round((score / TOTAL_POINTS) * 100);
      badge.textContent = `Score : ${score} / ${TOTAL_POINTS} pts (${percent} %)`;
    }
  }

  // -------------------------------------------------------------
  // Chargement et affichage de la question active
  // -------------------------------------------------------------
  function loadQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentIndex = index;
    const q = questions[currentIndex];

    // Mise à jour visuelle des pastilles
    document.querySelectorAll('.step-pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === currentIndex);
    });

    // En-tête de question
    const titleEl = document.getElementById('questionTitle');
    if (titleEl) titleEl.textContent = `Défi ${q.defi} — ${q.titre}`;

    const pointsBadge = document.getElementById('questionPointsBadge');
    if (pointsBadge) pointsBadge.textContent = `${q.points} points`;

    const citationBox = document.getElementById('citationBox');
    if (citationBox) {
      citationBox.innerHTML = `
        <div class="citation-header">
          <span class="citation-tag">Extrait du texte</span>
          <span class="citation-ref">${escapeHtml(q.citationRef || '')}</span>
        </div>
        <blockquote class="citation-text">« ${escapeHtml(q.citation)} »</blockquote>
      `;
    }

    // Zone d'énoncé et interaction principale
    const workspace = document.getElementById('questionWorkspace');
    if (!workspace) return;
    workspace.innerHTML = '';

    const isValidated = !!validatedQuestions[currentIndex];

    // Agencement avec ou sans schéma
    const hasImage = !!q.image;
    const layout = document.createElement('div');
    layout.className = hasImage ? 'question-with-figure-layout' : 'question-single-layout';

    if (hasImage) {
      const figureCard = document.createElement('div');
      figureCard.className = 'question-figure-card';
      figureCard.innerHTML = `
        <div class="figure-frame">
          <button type="button" class="btn-zoom-trigger" data-full="${q.image}" data-caption="${escapeHtml(q.imageCaption || q.titre)}" aria-label="Agrandir l'illustration" title="Cliquer pour agrandir">
            <img src="${q.image}" alt="${escapeHtml(q.imageCaption || q.titre)}" class="figure-img">
            <span class="zoom-badge">Agrandir</span>
          </button>
        </div>
        ${q.imageCaption ? `<div class="figure-caption">${escapeHtml(q.imageCaption)}</div>` : ''}
      `;
      layout.appendChild(figureCard);
    }

    const interactiveCol = document.createElement('div');
    interactiveCol.className = 'interactive-column';

    // Intitulé "Pourquoi ... ?"
    const qText = document.createElement('p');
    qText.className = 'question-prompt-text';
    qText.innerHTML = `<strong>${escapeHtml(q.question)}</strong>`;
    interactiveCol.appendChild(qText);

    // Liste des choix mélangés aléatoirement
    const choiceList = document.createElement('div');
    choiceList.className = 'choice-list';
    const shuffledChoices = getShuffledChoices(q.id, q.choices);

    shuffledChoices.forEach(choice => {
      const item = document.createElement('label');
      item.className = 'choice-item' + (userAnswers[q.id] === choice.id ? ' selected' : '');
      if (isValidated) {
        if (choice.correct) item.classList.add('correct');
        else if (userAnswers[q.id] === choice.id) item.classList.add('incorrect');
      }

      item.innerHTML = `
        <input type="radio" name="choice_${q.id}" value="${choice.id}" ${userAnswers[q.id] === choice.id ? 'checked' : ''} ${isValidated ? 'disabled' : ''}>
        <span class="choice-text">${escapeHtml(choice.text)}</span>
      `;

      if (!isValidated) {
        item.querySelector('input').addEventListener('change', () => {
          userAnswers[q.id] = choice.id;
          choiceList.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          updateBottomNavState();
        });
      }

      choiceList.appendChild(item);
    });
    interactiveCol.appendChild(choiceList);

    // Carte de remédiation adaptative (si erreur sur question principale)
    const remCard = document.createElement('div');
    remCard.id = `remediationCard_${q.id}`;
    remCard.className = 'remediation-card' + (shouldShowRemediation(q) ? ' visible' : '');
    if (shouldShowRemediation(q)) {
      renderRemediationContent(q, remCard);
    }
    interactiveCol.appendChild(remCard);

    // Panneau de rétroaction formative
    const feedbackBox = document.createElement('div');
    feedbackBox.id = 'feedbackPanel';
    feedbackBox.className = 'feedback-panel' + (isValidated ? ' visible' : '');
    if (isValidated) {
      renderFeedbackContent(q, feedbackBox);
    }
    interactiveCol.appendChild(feedbackBox);

    layout.appendChild(interactiveCol);
    workspace.appendChild(layout);

    // Mise à jour de la barre inférieure
    updateBottomNavState();

    // Rendu mathématique si MathJax présent
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([workspace]).catch(() => {});
    }
  }

  function shouldShowRemediation(q) {
    if (!validatedQuestions[currentIndex]) return false;
    const selected = q.choices.find(c => c.id === userAnswers[q.id]);
    return selected && !selected.correct && q.remediation;
  }

  // -------------------------------------------------------------
  // Affichage du volet de remédiation adaptative (2e chance)
  // -------------------------------------------------------------
  function renderRemediationContent(q, container) {
    const rem = q.remediation;
    if (!rem) return;
    const isRemValidated = !!validatedRemediations[q.id];

    let html = `
      <div class="remediation-badge">Deuxième chance — Question guidée (${rem.points} point)</div>
      <p class="remediation-prompt"><strong>${escapeHtml(rem.question)}</strong></p>
      <div class="choice-list remediation-choice-list">
    `;

    const shuffledRemChoices = getShuffledChoices(`${q.id}_rem`, rem.choices);
    container.innerHTML = html;
    const list = container.querySelector('.remediation-choice-list');

    shuffledRemChoices.forEach(choice => {
      const item = document.createElement('label');
      item.className = 'choice-item' + (remediationAnswers[q.id] === choice.id ? ' selected' : '');
      if (isRemValidated) {
        if (choice.correct) item.classList.add('correct');
        else if (remediationAnswers[q.id] === choice.id) item.classList.add('incorrect');
      }

      item.innerHTML = `
        <input type="radio" name="rem_choice_${q.id}" value="${choice.id}" ${remediationAnswers[q.id] === choice.id ? 'checked' : ''} ${isRemValidated ? 'disabled' : ''}>
        <span class="choice-text">${escapeHtml(choice.text)}</span>
      `;

      if (!isRemValidated) {
        item.querySelector('input').addEventListener('change', () => {
          remediationAnswers[q.id] = choice.id;
          list.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          updateBottomNavState();
        });
      }

      list.appendChild(item);
    });

    if (isRemValidated) {
      const chosen = rem.choices.find(c => c.id === remediationAnswers[q.id]);
      const resBox = document.createElement('div');
      resBox.className = 'remediation-result ' + (chosen && chosen.correct ? 'success' : 'fail');
      resBox.innerHTML = `
        <strong>${chosen && chosen.correct ? 'Récupération réussie (+1 point) !' : 'Réponse incorrecte.'}</strong>
        <p>${escapeHtml((chosen ? chosen.feedback : '') || rem.solution)}</p>
      `;
      container.appendChild(resBox);
    }
  }

  // -------------------------------------------------------------
  // Panneau de rétroaction formative
  // -------------------------------------------------------------
  function renderFeedbackContent(q, container) {
    const selected = q.choices.find(c => c.id === userAnswers[q.id]);
    const isSuccess = selected && selected.correct;
    const pts = pointsParQuestion[currentIndex] || 0;

    let html = `
      <div class="feedback-badge ${isSuccess ? 'success' : 'alert'}">
        ${isSuccess ? `Excellent ! +${pts} points` : (pts > 0 ? `Défi validé avec récupération (+${pts} point)` : `Défi terminé (+0 point)`)}
      </div>
      <div class="feedback-content">
        <p class="feedback-direct">${escapeHtml(selected ? selected.feedback : '')}</p>
        <div class="feedback-didactic-box">
          <strong>Explication didactique :</strong>
          <p>${escapeHtml(q.explication)}</p>
        </div>
      </div>
    `;
    container.innerHTML = html;
  }

  // -------------------------------------------------------------
  // Validation de la question
  // -------------------------------------------------------------
  function validateCurrentQuestion() {
    const q = questions[currentIndex];
    if (validatedQuestions[currentIndex]) {
      // Si question principale validée et remédiation active non validée
      if (shouldShowRemediation(q) && !validatedRemediations[q.id]) {
        validateRemediation(q);
      }
      return;
    }

    const ansId = userAnswers[q.id];
    if (ansId === undefined || ansId === null) return;

    const opt = q.choices.find(c => c.id === ansId);
    let pointsGagnes = 0;

    if (opt && opt.correct) {
      pointsGagnes = q.points; // 3 points direct (sans-faute)
    } else {
      pointsGagnes = 0;
    }

    pointsParQuestion[currentIndex] = pointsGagnes;
    score += pointsGagnes;
    validatedQuestions[currentIndex] = true;

    // Mise à jour SCORM
    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      if (currentIndex === questions.length - 1 && (!shouldShowRemediation(q) || validatedRemediations[q.id])) {
        window.ScormAPI.setStatus(score >= 15 ? 'passed' : 'incomplete');
      }
    }

    // Notification simulateur
    notifyParent({
      type: 'SCORE_UPDATE',
      score: score,
      total: TOTAL_POINTS,
      questionIndex: currentIndex,
      pointsGagnes: pointsGagnes
    });

    renderStepBar();
    loadQuestion(currentIndex);

    // Mise à jour de l'Assistant
    updateCoachWidget(q, opt && opt.correct, pointsGagnes);
  }

  function validateRemediation(q) {
    const rem = q.remediation;
    if (!rem) return;
    const remAnsId = remediationAnswers[q.id];
    if (remAnsId === undefined || remAnsId === null) return;

    const chosen = rem.choices.find(c => c.id === remAnsId);
    let ptsRem = 0;
    if (chosen && chosen.correct) {
      ptsRem = rem.points || 1;
    }

    pointsParQuestion[currentIndex] = (pointsParQuestion[currentIndex] || 0) + ptsRem;
    score += ptsRem;
    validatedRemediations[q.id] = true;

    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      if (currentIndex === questions.length - 1) {
        window.ScormAPI.setStatus(score >= 15 ? 'passed' : 'incomplete');
      }
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

  // -------------------------------------------------------------
  // Assistant & Contrôles d'affichage (Deuxième couche)
  // -------------------------------------------------------------
  function setupCoachToggle() {
    const coach = document.getElementById('coachWidget');
    const btnToggle = document.getElementById('btnToggleCoach');
    const btnClose = document.getElementById('btnCloseCoach');

    function setCoachVisible(visible) {
      if (!coach) return;
      if (visible) {
        coach.classList.remove('hidden');
        coach.removeAttribute('hidden');
        if (btnToggle) {
          btnToggle.setAttribute('aria-expanded', 'true');
          btnToggle.classList.add('active');
        }
      } else {
        coach.classList.add('hidden');
        coach.setAttribute('hidden', '');
        if (btnToggle) {
          btnToggle.setAttribute('aria-expanded', 'false');
          btnToggle.classList.remove('active');
        }
      }
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        setCoachVisible(false);
        if (btnToggle) btnToggle.focus();
      });
    }

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const isCurrentlyHidden = coach ? coach.classList.contains('hidden') : false;
        setCoachVisible(isCurrentlyHidden);
      });
    }

    window.setCoachVisible = setCoachVisible;
  }

  function updateCoachWidget(q, isCorrect, points) {
    const coachMsg = document.getElementById('coachActiveMsg');
    if (!coachMsg) return;

    if (isCorrect) {
      coachMsg.innerHTML = `
        <strong>Bravo ! Défi n° ${q.defi} réussi (+${points} pts)</strong>
        <p>${escapeHtml(q.solution)}</p>
      `;
    } else {
      coachMsg.innerHTML = `
        <strong>Attention aux détails du texte.</strong>
        <p>${q.remediation ? 'Complète la question guidée de remédiation ci-dessous pour récupérer 1 point !' : escapeHtml(q.explication)}</p>
      `;
    }
  }

  // -------------------------------------------------------------
  // Dispositif convivial d'agrandissement d'image (Lightbox)
  // -------------------------------------------------------------
  function setupImageLightbox() {
    const modal = document.getElementById('imageLightboxModal');
    const modalImg = document.getElementById('lightboxImg');
    const modalCaption = document.getElementById('lightboxCaption');
    const btnClose = document.getElementById('btnCloseLightbox');
    const backdrop = modal ? modal.querySelector('.lightbox-backdrop') : null;
    let lastActiveTrigger = null;

    function openLightbox(src, caption, triggerEl) {
      if (!modal || !modalImg) return;
      lastActiveTrigger = triggerEl || null;
      modalImg.src = src;
      modalImg.alt = caption || 'Illustration scientifique agrandie';
      if (modalCaption) modalCaption.textContent = caption || '';
      modal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      if (btnClose) btnClose.focus();
    }

    function closeLightbox() {
      if (!modal) return;
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
      if (modalImg) modalImg.src = '';
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }

    // Délégation d'événements pour tous les déclencheurs de zoom
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.btn-zoom-trigger');
      if (trigger) {
        const fullSrc = trigger.dataset.full;
        const caption = trigger.dataset.caption;
        openLightbox(fullSrc, caption, trigger);
      }
    });

    if (btnClose) {
      btnClose.addEventListener('click', closeLightbox);
    }
    if (backdrop) {
      backdrop.addEventListener('click', closeLightbox);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeLightbox();
      }
    });
  }

  // -------------------------------------------------------------
  // Barre de navigation inférieure
  // -------------------------------------------------------------
  function setupBottomNav() {
    const btnPrev = document.getElementById('btnBottomPrev');
    const btnNext = document.getElementById('btnBottomNext');
    const btnValidate = document.getElementById('btnBottomValidate');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentIndex > 0) loadQuestion(currentIndex - 1);
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentIndex < questions.length - 1) loadQuestion(currentIndex + 1);
      });
    }

    if (btnValidate) {
      btnValidate.addEventListener('click', () => {
        validateCurrentQuestion();
      });
    }
  }

  function updateBottomNavState() {
    const q = questions[currentIndex];
    const isValidated = !!validatedQuestions[currentIndex];
    const isRemValidated = !!validatedRemediations[q.id];
    const hasPendingRemediation = shouldShowRemediation(q) && !isRemValidated;

    const btnPrev = document.getElementById('btnBottomPrev');
    const btnNext = document.getElementById('btnBottomNext');
    const btnValidate = document.getElementById('btnBottomValidate');
    const statusText = document.getElementById('bottomStatusText');

    if (btnPrev) btnPrev.disabled = (currentIndex === 0);

    // Le bouton Suivant est débloqué si la question est validée et qu'il n'y a pas de remédiation en attente
    if (btnNext) {
      btnNext.disabled = !isValidated || hasPendingRemediation;
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
      if (!isValidated) {
        statusText.textContent = userAnswers[q.id] !== undefined 
          ? 'Clique sur « Valider la réponse ».' 
          : 'Sélectionne une option pour valider.';
      } else if (hasPendingRemediation) {
        statusText.textContent = 'Réponds à la question guidée pour marquer 1 point de récupération.';
      } else {
        statusText.textContent = (currentIndex === questions.length - 1)
          ? 'Activité terminée ! Consulte tes résultats.'
          : 'Défi complété. Passe à la question suivante.';
      }
    }
  }

  // -------------------------------------------------------------
  // Utilitaires et communication Simulateur Enseignant
  // -------------------------------------------------------------
  function notifyParent(data) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  }

  window.addEventListener('message', (event) => {
    if (!event.data) return;
    const msg = event.data;

    if (msg.type === 'GOTO_QUESTION' && typeof msg.index === 'number') {
      loadQuestion(msg.index);
    } else if (msg.type === 'MODE_CORRIGE_ON') {
      activateModeCorrige();
    } else if (msg.type === 'MODE_CORRIGE_OFF') {
      deactivateModeCorrige();
    }
  });

  function activateModeCorrige() {
    modeCorrigeActive = true;
    document.body.classList.add('mode-corrige');
    // Dévoile toutes les solutions
    questions.forEach((q, idx) => {
      const correctChoice = q.choices.find(c => c.correct);
      if (correctChoice) userAnswers[q.id] = correctChoice.id;
      validatedQuestions[idx] = true;
      pointsParQuestion[idx] = q.points;
    });
    score = TOTAL_POINTS;
    renderStepBar();
    loadQuestion(currentIndex);
  }

  function deactivateModeCorrige() {
    modeCorrigeActive = false;
    document.body.classList.remove('mode-corrige');
    loadQuestion(currentIndex);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Démarrage de l'application
  window.addEventListener('DOMContentLoaded', initApp);
})();
