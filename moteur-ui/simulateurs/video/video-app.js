/**
 * VideoSimulator - Contrôleur principal du simulateur de vidéo interactive H5P
 * Gère l'initialisation, le chargement dynamique du JSON, la navigation,
 * les fenêtres modales surgissantes, le mode d'édition et la persistance sur disque (/api/save_json).
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  // État partagé de l'application vidéo
  window.videoConfig = window.videoConfig || {};
  window.sourceData = window.sourceData || { titre_video: '', duree_video_sec: 180, questions: [] };
  window.questions = window.questions || [];
  window.isEditMode = window.isEditMode || false;
  window.modeCorrige = window.modeCorrige || false;
  window.hasUnsavedChanges = window.hasUnsavedChanges || false;
  window.answeredStates = window.answeredStates || {};

  let currentModalQuestion = null;
  let currentModalIndex = -1;
  // Questions déjà surgies : état de lecture, jamais écrit dans questions_video.json
  const triggeredQuestions = new WeakSet();
  let appConfig = {
    jsonSource: './questions_video.json',
    fallbackData: null,
    container: '#videoAppRoot',
    title: 'Vidéo interactive'
  };

  const DEFAULT_VIDEO_LAYOUT = `
  <div class="video-app-wrapper">
    <!-- EN-TÊTE 48px CLAIR CONFORME MOTEUR-UI -->
    <header class="app-header" role="banner">
      <div class="header-left">
        <span class="brand-title" id="appVideoTitle">Vidéo interactive</span>
        <span class="brand-badge">Vidéo interactive H5P</span>
        <span id="editModeIndicator" class="brand-badge" style="display: none; background: #fef3c7; color: #92400e; border-color: #fde68a;">
          Mode Édition Actif
        </span>
        <span id="unsavedBadge" class="brand-badge" style="display: none; background: #fee2e2; color: #991b1b; border-color: #fca5a5;">
          Modifications non enregistrées
        </span>
      </div>

      <div class="header-right">
        <button type="button" id="btnToggleQuestions" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.8125rem;">
          Questions
        </button>
        <button type="button" id="btnExportH5P" class="btn" style="padding: 0.35rem 0.85rem; font-size: 0.8125rem;">
          Exporter H5P
        </button>
        <button type="button" id="btnSaveChanges" class="btn btn-primary" style="padding: 0.35rem 0.85rem; font-size: 0.8125rem; font-weight: 600;">
          Enregistrer
        </button>
        <div style="height: 20px; width: 1px; background: var(--border-color); margin: 0 0.25rem;"></div>
        <label class="moodle-switch-wrap" for="btnToggleEdit" title="Activer / désactiver le mode d'édition">
          <span class="moodle-switch-text">Mode d’édition</span>
          <span class="moodle-switch">
            <input type="checkbox" id="btnToggleEdit" role="switch">
            <span class="moodle-switch-slider"></span>
          </span>
        </label>
      </div>
    </header>

    <!-- CONTENEUR PRINCIPAL DU SIMULATEUR -->
    <div class="sim-shell">
      
      <!-- PANNEAU LATÉRAL D'ACCÈS DIRECT AUX QUESTIONS & TIMESTAMPS -->
      <aside class="sim-sidebar" aria-label="Liste des questions synchronisées">
        <div class="sim-sidebar-header">
          <span>Questions (<span id="questionsCount">0</span>)</span>
          <span style="font-variant-numeric: tabular-nums;" id="globalScoreBadge">0 validée(s)</span>
        </div>
        <div id="sidebarQuestionsList" class="sim-sidebar-list">
          <!-- Rendu dynamique des boutons de questions -->
        </div>
      </aside>

      <!-- ZONE CENTRALE : LECTEUR VIDÉO, FRISE TEMPORELLE ET MODAL -->
      <main class="sim-main-stage" id="main-content">
        
        <!-- INVITATION À ENREGISTRER LORS DE MODIFICATIONS -->
        <div id="savePromptBanner" class="save-prompt-banner" style="display: none;">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
            <span>Des modifications ont été apportées. Enregistrez pour actualiser le fichier JSON et synchroniser le parcours.</span>
          </div>
          <button type="button" id="btnBannerSave" class="btn btn-primary" style="padding: 0.35rem 0.85rem; font-size: 0.8125rem; font-weight: 600;">
            Enregistrer
          </button>
        </div>

        <!-- AVERTISSEMENT ERREUR 153 YOUTUBE EN MODE FILE:/// -->
        <div id="localFileBanner" class="local-file-notice" style="display: none;">
          <div>
            <strong>Avis d'exécution locale :</strong> Si la vidéo affiche <code>Erreur 153</code>, c'est que YouTube bloque l'en-tête de référence sous le protocole <code>file:///</code>. Servez ce dossier via le serveur local multi-threadé (<code>python server.py 8080</code>) ou testez vos questions via le <strong>Mode Questions / Corrigé</strong>.
          </div>
          <button type="button" onclick="document.getElementById('localFileBanner').style.display='none'" class="btn" style="padding:2px 8px; font-size:0.75rem;">Fermer</button>
        </div>

        <!-- CONTENEUR DU LECTEUR VIDÉO AVEC COUCHE MODALE -->
        <div class="video-player-container" id="playerWrapper">
          <div class="video-stage">
            <div id="videoPlayerTarget"></div>
            <div id="videoClickShield" class="video-click-shield"></div>

            <div id="videoStartOverlay" class="video-start-overlay">
              <button type="button" id="btnStartVideo" class="video-start-button" aria-label="Démarrer la vidéo" title="Démarrer la vidéo">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>

            <!-- MODAL INTERACTIF DE QUESTION H5P -->
            <div id="videoModalOverlay" class="video-modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="modalQuestionTitle">
              <div class="video-modal-card" id="videoModalCard" tabindex="-1">
                <div class="video-modal-body">
                  <!-- Repères de minutage : mode d'édition seulement -->
                  <div class="video-modal-meta">
                    <span class="brand-badge" id="modalQuestionBadge">Question interactive</span>
                    <div id="modalTimingContainer" style="display: flex; align-items: center; gap: 0.4rem;"></div>
                  </div>

                  <h2 id="modalQuestionTitle" class="video-modal-question editable-field">Pourquoi ... ?</h2>

                  <div id="modalAnswersList" class="video-answers-list">
                    <!-- Choix injectés dynamiquement -->
                  </div>
                </div>

                <div id="modalFooter" class="video-modal-footer">
                  <!-- Rétroaction Didactique -->
                  <div id="modalFeedbackBox" class="video-feedback-card hidden" role="status" aria-live="polite"></div>

                  <!-- Alerte de remédiation adaptative -->
                  <div id="modalRemediationBox" class="video-remediation-notice hidden">
                    <span>↺</span>
                    <span id="modalRemediationText">En cas d'erreur, retour automatique à [00:00] pour réviser la notion.</span>
                  </div>

                  <div class="video-modal-actions">
                    <div id="modalScore" class="video-score hidden" role="img">
                      <div class="video-score-track"><div class="video-score-fill"></div></div>
                      <svg class="video-score-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.6 6.8-.8z"/></svg>
                      <span id="modalScoreText" class="video-score-text" aria-hidden="true">0/1</span>
                    </div>
                    <button type="button" id="btnModalSubmit" class="video-modal-submit">
                      Valider la réponse
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BARRE DE CONTRÔLE -->
          <div class="video-controls">
            <button type="button" id="btnPlayPause" class="video-control-btn is-play" aria-label="Lire" title="Lire">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path id="iconPlayPause" d="M7 4v16l13-8z"/></svg>
            </button>
            <div class="video-timeline-bar-container">
              <input type="range" id="videoTimelineRange" class="video-timeline-range" value="0" min="0" max="100" step="0.2" aria-label="Position dans la vidéo">
              <div id="videoTimelineMarkers" class="video-timeline-markers"></div>
            </div>
            <div class="video-time-display">
              <span id="currentTimeDisplay">0:00</span>
              <span class="video-time-total">/</span>
              <span id="totalDurationDisplay" class="video-time-total">0:00</span>
            </div>
            <div class="video-popup-wrap">
              <button type="button" id="btnSpeed" class="video-control-btn" aria-label="Vitesse de lecture" title="Vitesse de lecture" aria-expanded="false" aria-controls="speedMenu">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8.5v7l5.5-3.5z"/><path d="M12 3a9 9 0 0 1 0 18v-2a7 7 0 0 0 0-14zM8.6 3.7l.8 1.8a7 7 0 0 0-1.2.7L7 4.7a9 9 0 0 1 1.6-1zM5.1 6.2l1.5 1.3c-.3.4-.6.7-.8 1.1l-1.7-1c.3-.5.6-1 1-1.4zM3.1 10.3l2 .3a7 7 0 0 0 0 1.4l-2 .2a9 9 0 0 1 0-1.9zM3.5 14.8l1.9-.6c.1.4.3.9.6 1.2l-1.8 1a9 9 0 0 1-.7-1.6zM5.9 18.5l1.3-1.5c.4.3.7.6 1.1.8l-1 1.7c-.5-.3-1-.6-1.4-1z"/></svg>
              </button>
              <div id="speedMenu" class="video-popup hidden"></div>
            </div>
            <button type="button" id="btnMute" class="video-control-btn" aria-label="Couper le son" title="Couper le son" aria-pressed="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path id="iconMute" d="M4 9v6h4l5 5V4L8 9zM15.5 8.5v7a4 4 0 0 0 0-7zM15.5 4.6v2.1a6 6 0 0 1 0 10.6v2.1a8 8 0 0 0 0-14.8z"/></svg>
            </button>
            <button type="button" id="btnCaptions" class="video-control-btn" aria-label="Sous-titres" title="Sous-titres" aria-pressed="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm7 5.5V10H6.5v4H11v-.5H8v-3zm7 0V10h-4.5v4H18v-.5h-3v-3z" fill-rule="evenodd"/></svg>
            </button>
            <button type="button" id="btnFullscreen" class="video-control-btn" aria-label="Plein écran" title="Plein écran">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z"/></svg>
            </button>
          </div>
        </div>

        <!-- PANNEAU MODE CORRIGÉ / INSPECTION ENSEIGNANT -->
        <div id="corrigeInspectionPanel" class="sim-corrige-panel" style="display: none;">
          <div style="border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <h2 style="font-size: 1.125rem; font-weight: 700; margin: 0;">Fiche Pédagogique Complète (Mode Corrigé)</h2>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0.25rem 0 0 0;">
                Aperçu exhaustif des minutages, questions formulées en « Pourquoi », réponses en « Parce que », et repères de remédiation.
              </p>
            </div>
            <div id="editHintBadge" style="font-size: 0.8rem; color: var(--brand-accent); font-weight: 600; display: none;">
              ✏️ Cliquez directement sur n'importe quel texte pour l'éditer.
            </div>
          </div>
          <div id="corrigeItemsContainer" style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Injecté dynamiquement -->
          </div>
        </div>

      </main>
    </div>

    <!-- TOAST DE CONFIRMATION DE SAUVEGARDE -->
    <div id="saveToast" class="save-toast">Modifications enregistrées.</div>
  </div>
  `;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.round(seconds || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  // Format de la barre de contrôle H5P : 2:04
  function formatClock(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function shuffled(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function updateTimeline(curTime) {
    const range = document.getElementById('videoTimelineRange');
    if (range) {
      const max = parseFloat(range.max) || 1;
      range.value = curTime;
      range.style.setProperty('--pos', Math.min(1, curTime / max));
    }
    const curDisplay = document.getElementById('currentTimeDisplay');
    if (curDisplay) curDisplay.textContent = formatClock(curTime);
  }

  function setTimelineDuration(dur) {
    const durDisplay = document.getElementById('totalDurationDisplay');
    if (durDisplay) durDisplay.textContent = formatClock(dur);
    const range = document.getElementById('videoTimelineRange');
    if (range) range.max = dur;
    renderTimelineMarkers(dur);
  }

  function hideStartOverlay() {
    const start = document.getElementById('videoStartOverlay');
    if (start) start.classList.add('hidden');
  }

  function parseTime(str) {
    if (!str) return 0;
    str = String(str).trim();
    if (str.includes(':')) {
      const parts = str.split(':');
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return (m * 60) + s;
    }
    return parseInt(str, 10) || 0;
  }

  function markUnsavedChanges() {
    window.hasUnsavedChanges = true;
    updateSaveUiState(false);
  }

  function updateSaveUiState(justSaved) {
    justSaved = !!justSaved;
    const btnHeaderSave = document.getElementById('btnSaveChanges');
    const banner = document.getElementById('savePromptBanner');
    const badge = document.getElementById('unsavedBadge');

    if (window.hasUnsavedChanges) {
      if (btnHeaderSave) {
        btnHeaderSave.textContent = 'Enregistrer';
        btnHeaderSave.style.background = '#2563eb';
        btnHeaderSave.style.borderColor = '#1d4ed8';
        btnHeaderSave.style.color = '#ffffff';
      }
      if (banner) banner.style.display = 'flex';
      if (badge) badge.style.display = 'inline-block';
    } else {
      if (banner) banner.style.display = 'none';
      if (badge) badge.style.display = 'none';

      if (justSaved && btnHeaderSave) {
        btnHeaderSave.textContent = 'Enregistré ✓';
        btnHeaderSave.style.background = '#16a34a';
        btnHeaderSave.style.borderColor = '#15803d';
        btnHeaderSave.style.color = '#ffffff';
        setTimeout(() => {
          if (!window.hasUnsavedChanges && btnHeaderSave) {
            btnHeaderSave.textContent = 'Enregistrer';
            btnHeaderSave.style.background = '';
            btnHeaderSave.style.borderColor = '';
            btnHeaderSave.style.color = '';
          }
        }, 2500);
      } else if (btnHeaderSave) {
        btnHeaderSave.textContent = 'Enregistrer';
        btnHeaderSave.style.background = '';
        btnHeaderSave.style.borderColor = '';
        btnHeaderSave.style.color = '';
      }
    }
  }

  function showSaveToast(msg) {
    let toast = document.getElementById('saveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'saveToast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    if (msg) toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  function syncAndSaveData() {
    // Trier les questions chronologiquement par temps d'apparition
    window.questions.sort((a, b) => a.temps_apparition_sec - b.temps_apparition_sec);

    // Synchronisation du bloc aiJsonInput
    window.sourceData.questions = window.questions;
    window.videoConfig.aiJsonInput = JSON.stringify(window.sourceData, null, 2);

    // Synchronisation du bloc editorContent.interactiveVideo.assets.interactions si présent
    if (window.videoConfig.editorContent && window.videoConfig.editorContent.interactiveVideo) {
      const assets = window.videoConfig.editorContent.interactiveVideo.assets;
      if (assets && assets.interactions) {
        window.questions.forEach((q, idx) => {
          if (assets.interactions[idx]) {
            const inter = assets.interactions[idx];
            inter.duration.from = q.temps_apparition_sec;
            inter.duration.to = q.temps_apparition_sec;
            if (inter.action && inter.action.params) {
              inter.action.params.question = `<p>${q.question}</p>`;
              if (inter.action.params.answers) {
                inter.action.params.answers = (q.reponses || []).map((rep, rIdx) => ({
                  text: `<p>${rep}</p>`,
                  correct: (rIdx === q.index_bonne_reponse),
                  tipsAndFeedback: { tip: "", chosenFeedback: "", notChosenFeedback: "" }
                }));
              }
            }
            if (inter.adaptivity && inter.adaptivity.wrong) {
              inter.adaptivity.wrong.seekTo = q.retour_en_arriere_si_erreur_sec;
            }
          }
        });
        assets.interactions.sort((a, b) => a.duration.to - b.duration.to);
      }
    }

    try {
      const storageKey = 'video_h5p_draft_' + encodeURIComponent(window.videoConfig.context?.videoUrl || 'default');
      localStorage.setItem(storageKey, JSON.stringify(window.videoConfig));
    } catch (e) {}

    renderSidebar();
    const dur = window.VideoPlayer ? window.VideoPlayer.getDuration() : 180;
    renderTimelineMarkers(dur);
  }

  async function saveAndActualiseJson() {
    syncAndSaveData();
    const jsonStr = JSON.stringify(window.videoConfig, null, 2);
    let savedDirectly = false;

    // 1. Tentative d'enregistrement direct via l'API locale /api/save_json
    try {
      let relPath = window.location.pathname.replace(/^\//, '');
      if (relPath.endsWith('simulateur.html')) {
        relPath = relPath.replace('simulateur.html', 'questions_video.json');
      } else if (!relPath.endsWith('questions_video.json')) {
        relPath = (relPath.replace(/\/$/, '') + '/questions_video.json').replace(/^\//, '');
      }

      const resp = await fetch('/api/save_json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: relPath,
          content: jsonStr
        })
      });

      if (resp.ok) {
        const resData = await resp.json();
        if (resData.status === 'ok') {
          savedDirectly = true;
        }
      }
    } catch (err) {}

    // 2. Fallback showSaveFilePicker
    if (!savedDirectly && window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: 'questions_video.json',
          types: [{ description: 'Fichiers JSON (*.json)', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        savedDirectly = true;
      } catch (err) {
        if (err.name === 'AbortError') savedDirectly = true;
      }
    }

    // 3. Fallback téléchargement Blob
    if (!savedDirectly && !window.showSaveFilePicker) {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'questions_video.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    window.hasUnsavedChanges = false;
    updateSaveUiState(true);
    showSaveToast(savedDirectly ? 'Modifications enregistrées sur le disque !' : 'Modifications enregistrées !');
  }

  function renderSidebar() {
    const list = document.getElementById('sidebarQuestionsList');
    if (!list) return;
    list.innerHTML = '';
    let correctCount = 0;

    window.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sim-q-btn' + (idx === currentModalIndex ? ' active' : '');

      const isAnswered = window.answeredStates[idx];
      let statusColor = '#94a3b8';
      if (isAnswered) {
        if (isAnswered.isCorrect) { statusColor = '#22c55e'; correctCount++; }
        else statusColor = '#ef4444';
      }

      btn.innerHTML = `
        <div class="sim-q-btn-header">
          <span><span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor}; margin-right:5px;"></span>Question ${idx + 1}</span>
          <span class="video-time-badge">${formatTime(q.temps_apparition_sec)}</span>
        </div>
        <div class="sim-q-btn-title">${escapeHtml(q.question)}</div>
        <div style="font-size:0.7rem; color:var(--text-subtle); margin-top:2px;">
          Recul adaptatif : ${formatTime(q.retour_en_arriere_si_erreur_sec)}
        </div>
      `;

      btn.addEventListener('click', () => {
        jumpToQuestion(idx);
      });

      if (!window.isEditMode) {
        list.appendChild(btn);
        return;
      }

      // Mode d'édition : moments modifiables et suppression, sous le bouton de la question
      const item = document.createElement('div');
      item.className = 'sim-q-item';
      item.appendChild(btn);
      const edit = document.createElement('div');
      edit.className = 'sim-q-edit';
      edit.innerHTML = `
        <label>Apparition
          <input type="text" class="time-input" inputmode="numeric" data-field="temps_apparition_sec"
            value="${formatTime(q.temps_apparition_sec)}" aria-label="Moment d'apparition de la question ${idx + 1} (mm:ss)">
        </label>
        <button type="button" class="btn sim-q-mini" data-act="capturer"
          aria-label="Faire apparaître la question ${idx + 1} à la position actuelle de la vidéo">Position actuelle</button>
        <label>Recul
          <input type="text" class="time-input" inputmode="numeric" data-field="retour_en_arriere_si_erreur_sec"
            value="${formatTime(q.retour_en_arriere_si_erreur_sec)}" aria-label="Retour en arrière en cas d'erreur, question ${idx + 1} (mm:ss)">
        </label>
        <button type="button" class="btn sim-q-mini sim-q-supprimer" data-act="supprimer"
          aria-label="Supprimer la question ${idx + 1}">Supprimer</button>
      `;
      edit.querySelectorAll('.time-input').forEach(input => {
        input.addEventListener('change', () => {
          modifierMoment(q, input.dataset.field, parseTime(input.value));
        });
      });
      edit.querySelector('[data-act="capturer"]').addEventListener('click', () => {
        const sec = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
        modifierMoment(q, 'temps_apparition_sec', sec);
      });
      edit.querySelector('[data-act="supprimer"]').addEventListener('click', () => supprimerQuestion(q));
      item.appendChild(edit);
      list.appendChild(item);
    });

    if (window.isEditMode) {
      const cur = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn sim-q-ajouter';
      add.textContent = `Ajouter une question à ${formatTime(cur)}`;
      add.title = 'La question est placée à la position actuelle de la vidéo.';
      add.addEventListener('click', ajouterQuestion);
      list.prepend(add);
    }

    const qCount = document.getElementById('questionsCount');
    if (qCount) qCount.textContent = window.questions.length;

    const scoreBadge = document.getElementById('globalScoreBadge');
    if (scoreBadge) {
      scoreBadge.textContent = `${correctCount} / ${window.questions.length} validée(s)`;
    }
  }

  /**
   * Remet les questions en ordre chronologique en conservant l'état de réponse
   * et la question ouverte, puis rafraîchit la liste, la frise et le corrigé.
   */
  function reordonnerQuestions() {
    const etats = new Map();
    window.questions.forEach((q, i) => { if (window.answeredStates[i]) etats.set(q, window.answeredStates[i]); });
    window.questions.sort((a, b) => a.temps_apparition_sec - b.temps_apparition_sec);
    window.answeredStates = {};
    window.questions.forEach((q, i) => { if (etats.has(q)) window.answeredStates[i] = etats.get(q); });
    currentModalIndex = currentModalQuestion ? window.questions.indexOf(currentModalQuestion) : -1;
    const badge = document.getElementById('modalQuestionBadge');
    if (badge && currentModalIndex >= 0) badge.textContent = `Question ${currentModalIndex + 1} / ${window.questions.length}`;
    renderSidebar();
    renderTimelineMarkers(window.VideoPlayer ? window.VideoPlayer.getDuration() : (window.sourceData.duree_video_sec || 180));
    renderCorrigePanel();
  }

  function focusChampSidebar(q, field) {
    const idx = window.questions.indexOf(q);
    const items = document.querySelectorAll('#sidebarQuestionsList .sim-q-item');
    const champ = items[idx] && items[idx].querySelector(`[data-field="${field}"]`);
    if (champ) champ.focus();
  }

  function modifierMoment(q, field, sec) {
    q[field] = Math.max(0, sec);
    markUnsavedChanges();
    reordonnerQuestions();
    focusChampSidebar(q, field);
  }

  function ajouterQuestion() {
    const t = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
    const q = {
      temps_apparition_sec: t,
      question: 'Pourquoi … ?',
      reponses: ['Parce que …', 'Parce que …', 'Parce que …', 'Parce que …'],
      index_bonne_reponse: 0,
      feedback: '',
      retour_en_arriere_si_erreur_sec: Math.max(0, t - 30)
    };
    window.questions.push(q);
    // Garde editorContent aligné sur les questions (même nombre d'interactions)
    const inter = window.videoConfig.editorContent?.interactiveVideo?.assets?.interactions;
    if (inter && inter.length) inter.push(JSON.parse(JSON.stringify(inter[inter.length - 1])));
    markUnsavedChanges();
    reordonnerQuestions();
    jumpToQuestion(window.questions.indexOf(q));
    showSaveToast('Question ajoutée : remplacez les « … » dans la fenêtre de la question.');
  }

  function supprimerQuestion(q) {
    const idx = window.questions.indexOf(q);
    if (idx < 0) return;
    const resume = (q.question || '').slice(0, 90);
    if (!confirm(`Supprimer la question ${idx + 1} (${formatTime(q.temps_apparition_sec)}) ?\n\n${resume}`)) return;
    const etats = new Map();
    window.questions.forEach((x, i) => { if (window.answeredStates[i]) etats.set(x, window.answeredStates[i]); });
    window.questions.splice(idx, 1);
    const inter = window.videoConfig.editorContent?.interactiveVideo?.assets?.interactions;
    if (inter && inter.length > window.questions.length) inter.splice(Math.min(idx, inter.length - 1), 1);
    window.answeredStates = {};
    window.questions.forEach((x, i) => { if (etats.has(x)) window.answeredStates[i] = etats.get(x); });
    if (currentModalQuestion === q) {
      const overlay = document.getElementById('videoModalOverlay');
      if (overlay) overlay.classList.add('hidden');
      currentModalQuestion = null;
    }
    markUnsavedChanges();
    reordonnerQuestions();
    showSaveToast('Question supprimée.');
    const reste = document.querySelector('#sidebarQuestionsList .sim-q-btn, #sidebarQuestionsList .sim-q-ajouter');
    if (reste) reste.focus();
  }

  function renderCorrigePanel() {
    const container = document.getElementById('corrigeItemsContainer');
    if (!container) return;
    container.innerHTML = '';

    window.questions.forEach((q, idx) => {
      const item = document.createElement('div');
      item.className = 'sim-corrige-item';
      
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <strong>Question ${idx + 1}</strong>
            <span style="font-size:0.8rem; color:var(--text-muted);">Surgit à :</span>
            ${window.isEditMode ? 
              `<input type="text" class="time-input" value="${formatTime(q.temps_apparition_sec)}" data-idx="${idx}" data-field="temps_apparition_sec" style="width:65px;">
               <button type="button" class="btn btn-capture-time" data-idx="${idx}" style="padding:2px 8px; font-size:0.725rem; background:#eff6ff; border-color:#bfdbfe; color:#1e40af;" title="Capturer la position actuelle de la vidéo">⏱️ Capturer</button>` : 
              `<span class="video-time-badge">${formatTime(q.temps_apparition_sec)}</span>`
            }
          </div>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span style="font-size:0.8rem; color:var(--text-muted);">Retour si erreur :</span>
            ${window.isEditMode ? 
              `<input type="text" class="time-input" value="${formatTime(q.retour_en_arriere_si_erreur_sec)}" data-idx="${idx}" data-field="retour_en_arriere_si_erreur_sec" style="width:65px;">` : 
              `<span class="video-time-badge" style="background:#fffbeb; border-color:#fde68a; color:#92400e;">${formatTime(q.retour_en_arriere_si_erreur_sec)}</span>`
            }
          </div>
        </div>

        <div class="editable-field" contenteditable="${window.isEditMode}" data-idx="${idx}" data-field="question" style="font-weight:600; margin-bottom:0.75rem; color:var(--text-main); font-size:1rem;">
          ${escapeHtml(q.question)}
        </div>

        <div style="display:flex; flex-direction:column; gap:0.35rem; margin-bottom:0.75rem;">
          ${(q.reponses || []).map((rep, rIdx) => `
            <div style="display:flex; align-items:center; gap:0.5rem; padding:0.45rem 0.65rem; border-radius:4px; font-size:0.875rem; ${rIdx === q.index_bonne_reponse ? 'background:#f0fdf4; border:1px solid #bbf7d0; color:#166534;' : 'background:#f8fafc; border:1px solid #e2e8f0; color:#475569;'}">
              ${window.isEditMode ? `<input type="radio" name="corrige_correct_${idx}" value="${rIdx}" ${rIdx === q.index_bonne_reponse ? 'checked' : ''} title="Définir comme bonne réponse">` : (rIdx === q.index_bonne_reponse ? '✓ ' : '✗ ')}
              <div class="editable-field" contenteditable="${window.isEditMode}" data-idx="${idx}" data-ridx="${rIdx}" data-field="reponse" style="flex:1;">
                ${escapeHtml(rep)}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="video-feedback-card correct" style="margin-top:0.5rem;">
          <strong>Rétroaction didactique :</strong>
          <div class="editable-field" contenteditable="${window.isEditMode}" data-idx="${idx}" data-field="feedback" style="margin-top:0.3rem;">
            ${escapeHtml(q.feedback || '')}
          </div>
        </div>
      `;

      if (window.isEditMode) {
        const qInput = item.querySelector('[data-field="question"]');
        if (qInput) {
          const onQ = () => { q.question = qInput.innerText.trim(); markUnsavedChanges(); };
          qInput.addEventListener('input', onQ);
          qInput.addEventListener('blur', onQ);
        }

        const fbInput = item.querySelector('[data-field="feedback"]');
        if (fbInput) {
          const onFb = () => { q.feedback = fbInput.innerText.trim(); markUnsavedChanges(); };
          fbInput.addEventListener('input', onFb);
          fbInput.addEventListener('blur', onFb);
        }

        item.querySelectorAll('[data-field="reponse"]').forEach(el => {
          const onRep = () => {
            const rIdx = parseInt(el.dataset.ridx, 10);
            q.reponses[rIdx] = el.innerText.trim();
            markUnsavedChanges();
          };
          el.addEventListener('input', onRep);
          el.addEventListener('blur', onRep);
        });

        item.querySelectorAll(`input[name="corrige_correct_${idx}"]`).forEach(radio => {
          radio.addEventListener('change', (e) => {
            q.index_bonne_reponse = parseInt(e.target.value, 10);
            markUnsavedChanges();
            renderCorrigePanel();
          });
        });

        item.querySelectorAll('.time-input').forEach(input => {
          input.addEventListener('change', (e) => {
            const field = e.target.dataset.field;
            const sec = parseTime(e.target.value);
            q[field] = sec;
            e.target.value = formatTime(sec);
            markUnsavedChanges();
            reordonnerQuestions();
          });
        });

        item.querySelectorAll('.btn-capture-time').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const qIndex = parseInt(btn.dataset.idx, 10);
            const curSec = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
            window.questions[qIndex].temps_apparition_sec = curSec;
            markUnsavedChanges();
            reordonnerQuestions();
          });
        });
      }

      container.appendChild(item);
    });

    if (!window.isEditMode && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container]);
    }
  }

  function renderTimelineMarkers(duration) {
    const markers = document.getElementById('videoTimelineMarkers');
    if (!markers) return;
    markers.innerHTML = '';
    if (!duration || duration <= 0) return;

    window.questions.forEach((q, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'video-timeline-marker' + (window.answeredStates[idx] ? ' answered' : '');
      const pos = q.temps_apparition_sec / duration;
      dot.style.left = `calc(8px + (100% - 16px) * ${pos})`;
      dot.title = `Question ${idx + 1} (${formatTime(q.temps_apparition_sec)})`;
      dot.setAttribute('aria-label', dot.title);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToQuestion(idx);
      });
      markers.appendChild(dot);
    });
  }

  function jumpToQuestion(idx) {
    const q = window.questions[idx];
    if (!q) return;
    hideStartOverlay();
    currentModalIndex = idx;
    window.questions.forEach(other => {
      if (other.temps_apparition_sec <= q.temps_apparition_sec) triggeredQuestions.add(other);
      else triggeredQuestions.delete(other);
    });
    renderSidebar();
    if (window.VideoPlayer) {
      window.VideoPlayer.seekTo(q.temps_apparition_sec);
      window.VideoPlayer.pause();
    }
    triggerQuestionModal(q, idx);
  }

  function triggerQuestionModal(q, qIdx) {
    currentModalQuestion = q;
    currentModalIndex = qIdx;

    const overlay = document.getElementById('videoModalOverlay');
    const qTitle = document.getElementById('modalQuestionTitle');
    const ansList = document.getElementById('modalAnswersList');
    const fbBox = document.getElementById('modalFeedbackBox');
    const remBox = document.getElementById('modalRemediationBox');
    const submitBtn = document.getElementById('btnModalSubmit');
    const timingContainer = document.getElementById('modalTimingContainer');
    const footer = document.getElementById('modalFooter');
    const score = document.getElementById('modalScore');

    if (!overlay) return;

    if (timingContainer) {
      if (window.isEditMode) {
        const curTime = window.VideoPlayer ? Math.round(window.VideoPlayer.getCurrentTime()) : 0;
        timingContainer.innerHTML = `
          <span style="font-size: 0.75rem; color: var(--text-muted);">Surgit à :</span>
          <input type="text" class="time-input" id="modalApparitionInput" value="${formatTime(q.temps_apparition_sec)}" style="width:65px; font-weight:600; padding:2px 4px; text-align:center;">
          <button type="button" id="btnModalCaptureTime" class="btn" style="padding:2px 8px; font-size:0.75rem; background:#eff6ff; border-color:#bfdbfe; color:#1e40af;" title="Capturer la position actuelle de la vidéo">⏱️ Capturer (${formatTime(curTime)})</button>
        `;

        const modalApparitionInput = document.getElementById('modalApparitionInput');
        if (modalApparitionInput) {
          modalApparitionInput.addEventListener('change', (e) => {
            const newSec = parseTime(e.target.value);
            q.temps_apparition_sec = newSec;
            e.target.value = formatTime(newSec);
            markUnsavedChanges();
            reordonnerQuestions();
          });
        }

        const btnModalCaptureTime = document.getElementById('btnModalCaptureTime');
        if (btnModalCaptureTime) {
          btnModalCaptureTime.addEventListener('click', () => {
            const curSec = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
            q.temps_apparition_sec = curSec;
            if (modalApparitionInput) modalApparitionInput.value = formatTime(curSec);
            btnModalCaptureTime.textContent = `⏱️ Capturé (${formatTime(curSec)})`;
            markUnsavedChanges();
            reordonnerQuestions();
          });
        }
      } else {
        timingContainer.innerHTML = '';
      }
    }

    const badge = document.getElementById('modalQuestionBadge');
    if (badge) badge.textContent = `Question ${qIdx + 1} / ${window.questions.length}`;

    qTitle.innerHTML = escapeHtml(q.question);
    qTitle.contentEditable = window.isEditMode ? "true" : "false";
    if (window.isEditMode) {
      const onQ = () => { q.question = qTitle.innerText.trim(); markUnsavedChanges(); };
      qTitle.oninput = onQ;
      qTitle.onblur = onQ;
    }

    ansList.innerHTML = '';
    ansList.classList.remove('is-validated');
    fbBox.className = 'video-feedback-card hidden';
    remBox.className = 'video-remediation-notice hidden';
    footer.classList.toggle('is-band', window.isEditMode);
    score.className = 'video-score hidden';

    submitBtn.textContent = window.isEditMode ? 'Fermer' : 'Valider la réponse';
    submitBtn.disabled = false;
    // Comme dans H5P : le bouton n'apparaît qu'une fois une réponse choisie
    submitBtn.hidden = !window.isEditMode;

    let selectedOriginalIdx = null;

    // Ordre mélangé pour l'élève, ordre d'origine pour l'édition
    const answerOrder = (q.reponses || []).map((rep, idx) => idx);
    (window.isEditMode ? answerOrder : shuffled(answerOrder)).forEach((idx) => {
      const rep = q.reponses[idx];
      const item = document.createElement('label');
      item.className = 'video-answer-item';
      item.innerHTML = `
        <input type="radio" name="video_answer_choice" value="${idx}" ${window.isEditMode && idx === q.index_bonne_reponse ? 'checked' : ''}>
        <span class="video-answer-mark" aria-hidden="true"></span>
        <span class="editable-field video-answer-text" contenteditable="${window.isEditMode ? 'true' : 'false'}" style="flex:1;">${escapeHtml(rep)}</span>
      `;

      if (window.isEditMode) {
        const span = item.querySelector('.video-answer-text');
        const onRep = () => {
          q.reponses[idx] = span.innerText.trim();
          markUnsavedChanges();
        };
        span.oninput = onRep;
        span.onblur = onRep;

        item.querySelector('input').addEventListener('change', () => {
          q.index_bonne_reponse = idx;
          markUnsavedChanges();
        });
      } else {
        item.querySelector('input').addEventListener('change', () => {
          selectedOriginalIdx = idx;
          document.querySelectorAll('.video-answer-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          submitBtn.hidden = false;
        });
      }

      ansList.appendChild(item);
    });

    if (window.isEditMode) {
      fbBox.className = 'video-feedback-card correct';
      fbBox.innerHTML = `
        <strong>Rétroaction didactique :</strong>
        <div class="editable-field" contenteditable="true" style="margin-top:0.3rem;">
          ${escapeHtml(q.feedback || '')}
        </div>
      `;
      const fbField = fbBox.querySelector('.editable-field');
      if (fbField) {
        fbField.oninput = (e) => {
          q.feedback = e.target.innerText.trim();
          markUnsavedChanges();
        };
      }

      remBox.className = 'video-remediation-notice';
      const curRemTime = window.VideoPlayer ? Math.round(window.VideoPlayer.getCurrentTime()) : 0;
      document.getElementById('modalRemediationText').innerHTML = `
        <span>Recul adaptatif si erreur :</span>
        <input type="text" class="time-input" value="${formatTime(q.retour_en_arriere_si_erreur_sec)}" style="width:65px; font-weight:600; padding:2px 4px; text-align:center;">
        <button type="button" id="btnModalCaptureRemTime" class="btn" style="padding:2px 8px; font-size:0.75rem; background:#fffbeb; border-color:#fde68a; color:#92400e;" title="Capturer la position actuelle">⏱️ Capturer (${formatTime(curRemTime)})</button>
      `;
      const remInput = remBox.querySelector('.time-input');
      if (remInput) {
        remInput.onchange = (e) => {
          q.retour_en_arriere_si_erreur_sec = parseTime(e.target.value);
          e.target.value = formatTime(q.retour_en_arriere_si_erreur_sec);
          markUnsavedChanges();
        };
      }
      const btnCaptureRem = document.getElementById('btnModalCaptureRemTime');
      if (btnCaptureRem) {
        btnCaptureRem.addEventListener('click', () => {
          const curSec = Math.round(window.VideoPlayer ? window.VideoPlayer.getCurrentTime() : 0);
          q.retour_en_arriere_si_erreur_sec = curSec;
          if (remInput) remInput.value = formatTime(curSec);
          btnCaptureRem.textContent = `⏱️ Capturé (${formatTime(curSec)})`;
          markUnsavedChanges();
        });
      }

      submitBtn.onclick = () => {
        // Fermer seulement : l'enregistrement se fait avec le bouton « Enregistrer » de l'en-tête
        overlay.classList.add('hidden');
        reordonnerQuestions();
      };
    } else {
      submitBtn.onclick = () => {
        const isCorrect = (selectedOriginalIdx === q.index_bonne_reponse);
        window.answeredStates[qIdx] = { isCorrect, selectedIdx: selectedOriginalIdx };
        renderSidebar();
        renderTimelineMarkers(window.VideoPlayer ? window.VideoPlayer.getDuration() : 180);

        ansList.classList.add('is-validated');
        document.querySelectorAll('.video-answer-item').forEach(el => {
          const val = parseInt(el.querySelector('input').value);
          const mark = el.querySelector('.video-answer-mark');
          el.classList.remove('selected');
          if (val === q.index_bonne_reponse) {
            el.classList.add('correct');
            mark.textContent = '✓';
            el.insertAdjacentHTML('beforeend', '<span class="video-sr-only">Bonne réponse</span>');
          } else if (val === selectedOriginalIdx && !isCorrect) {
            el.classList.add('incorrect');
            mark.textContent = '✕';
            el.insertAdjacentHTML('beforeend', '<span class="video-sr-only">Réponse choisie, incorrecte</span>');
          }
          el.querySelector('input').disabled = true;
        });

        footer.classList.add('is-band');
        score.className = 'video-score' + (isCorrect ? ' is-full' : '');
        score.setAttribute('aria-label', `Score : ${isCorrect ? 1 : 0} sur 1`);
        document.getElementById('modalScoreText').textContent = `${isCorrect ? 1 : 0}/1`;

        fbBox.className = 'video-feedback-card ' + (isCorrect ? 'correct' : 'incorrect');
        fbBox.classList.remove('hidden');
        fbBox.innerHTML = `<strong class="video-feedback-title">${isCorrect ? 'Bonne réponse !' : 'Réponse incorrecte.'}</strong> ${q.feedback || ''}`;

        if (!isCorrect) {
          remBox.classList.remove('hidden');
          document.getElementById('modalRemediationText').textContent = 
            `En cas d'erreur, la vidéo recule automatiquement à ${formatTime(q.retour_en_arriere_si_erreur_sec)} pour réviser la notion.`;
        }

        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise([fbBox]);
        }

        submitBtn.textContent = isCorrect ? 'Continuer' : `Réécouter l'explication (${formatTime(q.retour_en_arriere_si_erreur_sec)})`;
        submitBtn.focus();
        submitBtn.onclick = () => {
          overlay.classList.add('hidden');
          if (window.VideoPlayer) {
            if (isCorrect) {
              window.VideoPlayer.play();
            } else {
              window.VideoPlayer.seekTo(q.retour_en_arriere_si_erreur_sec);
              window.VideoPlayer.play();
            }
          }
        };
      };
    }

    overlay.classList.remove('hidden');
    const card = document.getElementById('videoModalCard');
    card.scrollTop = 0;
    card.focus({ preventScroll: true });

    if (!window.isEditMode && window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([qTitle, ansList]);
    }
  }

  const ICON_PLAY = 'M7 4v16l13-8z';
  const ICON_PAUSE = 'M6 4h4v16H6zM14 4h4v16h-4z';
  const ICON_SOUND = 'M4 9v6h4l5 5V4L8 9zM15.5 8.5v7a4 4 0 0 0 0-7zM15.5 4.6v2.1a6 6 0 0 1 0 10.6v2.1a8 8 0 0 0 0-14.8z';
  const ICON_MUTED = 'M4 9v6h4l5 5V4L8 9zM16 9.4l1.4-1.4 2.1 2.1 2.1-2.1 1.4 1.4-2.1 2.1 2.1 2.1-1.4 1.4-2.1-2.1-2.1 2.1-1.4-1.4 2.1-2.1z';
  const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  function setPlayingUi(playing) {
    const btn = document.getElementById('btnPlayPause');
    const icon = document.getElementById('iconPlayPause');
    const label = playing ? 'Mettre en pause' : 'Lire';
    if (btn) {
      btn.setAttribute('aria-label', label);
      btn.title = label;
    }
    if (icon) icon.setAttribute('d', playing ? ICON_PAUSE : ICON_PLAY);
    if (playing) hideStartOverlay();
  }

  function togglePlayback() {
    if (!window.VideoPlayer) return;
    const overlay = document.getElementById('videoModalOverlay');
    const isModalOpen = overlay && !overlay.classList.contains('hidden');
    // L'élève répond d'abord à la question ouverte
    if (isModalOpen && !window.isEditMode) return;
    if (window.VideoPlayer.isPlaying()) window.VideoPlayer.pause();
    else window.VideoPlayer.play();
  }

  function setupPlayerControls() {
    const btnPlayPause = document.getElementById('btnPlayPause');
    if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayback);

    const shield = document.getElementById('videoClickShield');
    if (shield) shield.addEventListener('click', togglePlayback);

    const btnStart = document.getElementById('btnStartVideo');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        hideStartOverlay();
        if (window.VideoPlayer) window.VideoPlayer.play();
      });
    }

    const btnMute = document.getElementById('btnMute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const muted = btnMute.getAttribute('aria-pressed') !== 'true';
        btnMute.setAttribute('aria-pressed', String(muted));
        const label = muted ? 'Rétablir le son' : 'Couper le son';
        btnMute.setAttribute('aria-label', label);
        btnMute.title = label;
        document.getElementById('iconMute').setAttribute('d', muted ? ICON_MUTED : ICON_SOUND);
        if (window.VideoPlayer) window.VideoPlayer.setMuted(muted);
      });
    }

    const btnCaptions = document.getElementById('btnCaptions');
    if (btnCaptions) {
      btnCaptions.addEventListener('click', () => {
        const enabled = btnCaptions.getAttribute('aria-pressed') !== 'true';
        btnCaptions.setAttribute('aria-pressed', String(enabled));
        if (window.VideoPlayer) window.VideoPlayer.setCaptions(enabled);
      });
    }

    const btnSpeed = document.getElementById('btnSpeed');
    const speedMenu = document.getElementById('speedMenu');
    if (btnSpeed && speedMenu) {
      const closeMenu = () => {
        speedMenu.classList.add('hidden');
        btnSpeed.setAttribute('aria-expanded', 'false');
      };
      PLAYBACK_RATES.forEach(rate => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = `${String(rate).replace('.', ',')} ×`;
        item.setAttribute('aria-pressed', String(rate === 1));
        item.addEventListener('click', () => {
          speedMenu.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === item)));
          if (window.VideoPlayer) window.VideoPlayer.setPlaybackRate(rate);
          closeMenu();
          btnSpeed.focus();
        });
        speedMenu.appendChild(item);
      });
      btnSpeed.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = speedMenu.classList.contains('hidden');
        speedMenu.classList.toggle('hidden', !willOpen);
        btnSpeed.setAttribute('aria-expanded', String(willOpen));
      });
      document.addEventListener('click', closeMenu);
    }

    const btnFullscreen = document.getElementById('btnFullscreen');
    const wrapper = document.getElementById('playerWrapper');
    if (btnFullscreen && wrapper) {
      btnFullscreen.hidden = !document.fullscreenEnabled;
      btnFullscreen.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else wrapper.requestFullscreen();
      });
      document.addEventListener('fullscreenchange', () => {
        const label = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
        btnFullscreen.setAttribute('aria-label', label);
        btnFullscreen.title = label;
      });
    }
  }

  function setupControls() {
    setupPlayerControls();

    // Bouton "Enregistrer"
    const btnSaveChanges = document.getElementById('btnSaveChanges');
    if (btnSaveChanges) {
      btnSaveChanges.addEventListener('click', () => saveAndActualiseJson());
    }

    const btnBannerSave = document.getElementById('btnBannerSave');
    if (btnBannerSave) {
      btnBannerSave.addEventListener('click', () => saveAndActualiseJson());
    }

    // Bascule Mode d'édition
    const btnToggleEdit = document.getElementById('btnToggleEdit');
    const editIndicator = document.getElementById('editModeIndicator');
    const editHint = document.getElementById('editHintBadge');

    if (btnToggleEdit) {
      btnToggleEdit.addEventListener('change', () => {
        const targetState = btnToggleEdit.checked;
        if (!targetState && window.isEditMode && window.hasUnsavedChanges) {
          if (confirm('Vous avez des modifications non enregistrées. Voulez-vous les enregistrer maintenant ?')) {
            saveAndActualiseJson();
          }
        }
        window.isEditMode = targetState;
        document.body.classList.toggle('is-editing-mode', window.isEditMode);
        if (editIndicator) editIndicator.style.display = window.isEditMode ? 'inline-block' : 'none';
        if (editHint) editHint.style.display = window.isEditMode ? 'block' : 'none';

        const modalOverlay = document.getElementById('videoModalOverlay');
        const isModalOpen = modalOverlay && !modalOverlay.classList.contains('hidden');
        if (isModalOpen && currentModalQuestion && currentModalIndex >= 0) {
          triggerQuestionModal(currentModalQuestion, currentModalIndex);
        }
        renderSidebar();
        renderCorrigePanel();
      });
    }

    // Bouton "Questions"
    const btnToggleQuestions = document.getElementById('btnToggleQuestions');
    if (btnToggleQuestions) {
      btnToggleQuestions.addEventListener('click', () => {
        window.modeCorrige = !window.modeCorrige;
        btnToggleQuestions.classList.toggle('active', window.modeCorrige);
        const panel = document.getElementById('corrigeInspectionPanel');
        if (panel) {
          panel.style.display = window.modeCorrige ? 'flex' : 'none';
          if (window.modeCorrige) {
            if (window.VideoPlayer) window.VideoPlayer.pause();
            panel.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    // Bouton "Exporter H5P"
    const btnExportH5P = document.getElementById('btnExportH5P');
    if (btnExportH5P) {
      btnExportH5P.addEventListener('click', () => {
        if (window.VideoH5PExport) {
          window.VideoH5PExport.exportH5PPackage(window.videoConfig, window.questions);
        }
      });
    }

    // Curseur de frise chronologique
    const timelineRange = document.getElementById('videoTimelineRange');
    if (timelineRange) {
      timelineRange.addEventListener('input', (e) => {
        const targetSec = parseFloat(e.target.value);
        hideStartOverlay();
        if (window.VideoPlayer) window.VideoPlayer.seekTo(targetSec);
        window.questions.forEach(q => {
          if (q.temps_apparition_sec > targetSec) triggeredQuestions.delete(q);
        });
      });
    }

    window.addEventListener('beforeunload', (e) => {
      if (window.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  function startApp() {
    const rawAi = window.videoConfig.aiJsonInput;
    if (rawAi) {
      window.sourceData = (typeof rawAi === 'string') ? JSON.parse(rawAi) : rawAi;
    } else {
      window.sourceData = {
        titre_video: appConfig.title || 'Vidéo interactive',
        duree_video_sec: 180,
        questions: []
      };
    }

    window.questions = window.sourceData.questions || [];

    // Retire le marqueur écrit par les anciennes sauvegardes
    window.questions.forEach(q => { delete q._triggered; });
    if (typeof rawAi === 'string') {
      window.videoConfig.aiJsonInput = JSON.stringify(window.sourceData, null, 2);
    }

    const titleEl = document.getElementById('appVideoTitle');
    if (titleEl) titleEl.textContent = window.sourceData.titre_video || appConfig.title || 'Vidéo interactive';

    const qCount = document.getElementById('questionsCount');
    if (qCount) qCount.textContent = window.questions.length;

    renderSidebar();
    renderCorrigePanel();
    setupControls();

    const videoUrl = window.videoConfig.context?.videoUrl 
      || window.videoConfig.editorContent?.interactiveVideo?.video?.files?.[0]?.path 
      || window.videoConfig.interactiveVideo?.video?.files?.[0]?.path 
      || 'https://www.youtube.com/watch?v=L5nD3HP8XBQ';

    setTimelineDuration(window.sourceData.duree_video_sec || 180);

    if (window.VideoPlayer) {
      window.VideoPlayer.init({
        url: videoUrl,
        containerId: 'videoPlayerTarget',
        duration: window.sourceData.duree_video_sec || 180,
        onReady: (dur) => {
          setTimelineDuration(dur);
          const btnCaptions = document.getElementById('btnCaptions');
          if (btnCaptions) btnCaptions.hidden = !window.VideoPlayer.supportsCaptions();
        },
        onPlayStateChange: setPlayingUi,
        onSeek: updateTimeline,
        onTimeUpdate: (curTime, dur) => {
          updateTimeline(curTime);

          if (window.isEditMode) {
            const add = document.querySelector('#sidebarQuestionsList .sim-q-ajouter');
            if (add) add.textContent = `Ajouter une question à ${formatTime(Math.round(curTime))}`;
            return;
          }

          for (let i = 0; i < window.questions.length; i++) {
            const q = window.questions[i];
            if (curTime >= q.temps_apparition_sec && !triggeredQuestions.has(q)) {
              triggeredQuestions.add(q);
              if (window.VideoPlayer) window.VideoPlayer.pause();
              triggerQuestionModal(q, i);
              break;
            }
          }
        },
        onError: (code) => {
          if (code === 150 || code === 153 || code === 101) {
            const banner = document.getElementById('localFileBanner');
            if (banner) banner.style.display = 'flex';
          }
        }
      });
    }
  }

  function init(options) {
    options = options || {};
    Object.assign(appConfig, options);

    const root = document.querySelector(appConfig.container) || document.body;
    if (!root.querySelector('.video-app-wrapper')) {
      root.innerHTML = DEFAULT_VIDEO_LAYOUT;
    }

    if (window.location.protocol === 'file:') {
      const banner = document.getElementById('localFileBanner');
      if (banner) banner.style.display = 'flex';
    }

    if (appConfig.jsonSource) {
      fetch(appConfig.jsonSource, { cache: 'no-cache' })
        .then(res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(data => {
          window.videoConfig = data;
          startApp();
        })
        .catch(err => {
          console.warn('Chargement JSON dynamique non disponible (mode file:/// ou fichier introuvable) :', err);
          if (appConfig.fallbackData) {
            window.videoConfig = appConfig.fallbackData;
          } else if (window.EMBEDDED_VIDEO_DATA) {
            window.videoConfig = window.EMBEDDED_VIDEO_DATA;
          }
          startApp();
        });
    } else {
      if (appConfig.fallbackData) {
        window.videoConfig = appConfig.fallbackData;
      } else if (window.EMBEDDED_VIDEO_DATA) {
        window.videoConfig = window.EMBEDDED_VIDEO_DATA;
      }
      startApp();
    }
  }

  window.VideoSimulator = {
    init: init,
    startApp: startApp,
    renderSidebar: renderSidebar,
    renderCorrigePanel: renderCorrigePanel,
    jumpToQuestion: jumpToQuestion,
    triggerQuestionModal: triggerQuestionModal,
    saveAndActualiseJson: saveAndActualiseJson,
    formatTime: formatTime,
    parseTime: parseTime,
    escapeHtml: escapeHtml
  };

  // Alias globaux
  window.formatTime = formatTime;
  window.parseTime = parseTime;
  window.escapeHtml = escapeHtml;
  window.saveAndActualiseJson = saveAndActualiseJson;
  window.triggerQuestionModal = triggerQuestionModal;
  window.jumpToQuestion = jumpToQuestion;
  window.renderSidebar = renderSidebar;
  window.renderCorrigePanel = renderCorrigePanel;

})();
