/**
 * App.js - Contrôleur de l'Activité Élève SCORM 1.2
 * Sujet : Le système digestif et la nutrition (ST 3e secondaire)
 * Modèle Navigation Haut / Bas conforme moteur-ui
 * Scoring cumulatif débutant obligatoirement à 0 / 24 pts (0%)
 */
(function() {
  'use strict';

  const questions = window.QUESTIONS_DATA || [];
  const TOTAL_POINTS = 24;
  let currentIndex = 0;
  let score = 0; // Départ strict à 0 pt
  const userAnswers = {};
  const validatedQuestions = {};
  let modeCorrigeActive = false;

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

    // Signalement au simulateur parent
    notifyParent({
      type: 'ACTIVITY_READY',
      questions: questions.map((q, idx) => ({
        index: idx,
        points: q.points,
        titre: q.titre,
        solution: q.solution,
        reponseCorrecte: getCorrectSummary(q),
        explication: q.explication
      }))
    });

    // Écoute des ordres du simulateur parent
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'GOTO_QUESTION' && typeof event.data.index === 'number') {
        loadQuestion(event.data.index);
      }
      if (event.data.type === 'TOGGLE_CORRIGE') {
        modeCorrigeActive = !!event.data.visible;
        document.body.classList.toggle('mode-corrige-active', modeCorrigeActive);
        renderCurrentQuestion();
      }
    });
  }

  function notifyParent(data) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(data, '*');
      }
    } catch (e) {}
  }

  function renderStepBar() {
    const bar = document.getElementById('stepPillBar');
    if (!bar) return;
    bar.innerHTML = '';

    questions.forEach((q, idx) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'step-pill' + (idx === currentIndex ? ' active' : '');
      if (validatedQuestions[idx]) {
        pill.classList.add(validatedQuestions[idx].success ? 'completed' : 'partial');
      }
      pill.textContent = (idx + 1);
      pill.title = `Défi ${idx + 1} : ${q.titre} (${q.points} pt)`;
      pill.addEventListener('click', () => loadQuestion(idx));
      bar.appendChild(pill);
    });

    updateScoreDisplay();
  }

  function updateScoreDisplay() {
    const scoreEl = document.getElementById('scoreValue');
    if (scoreEl) {
      const pct = Math.round((score / TOTAL_POINTS) * 100);
      scoreEl.textContent = `${score} / ${TOTAL_POINTS} pts (${pct} %)`;
    }
  }

  function loadQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentIndex = index;
    renderStepBar();
    renderCurrentQuestion();

    // Mise à jour de l'indicateur textuel
    const qInd = document.getElementById('currentQuestionIndicator');
    if (qInd) {
      qInd.textContent = `Question ${currentIndex + 1} sur ${questions.length}`;
    }

    // Mise à jour des boutons bas
    const btnPrev = document.getElementById('btnNavPrev');
    const btnNext = document.getElementById('btnNavNext');
    if (btnPrev) btnPrev.disabled = (currentIndex === 0);
    if (btnNext) btnNext.disabled = (currentIndex === questions.length - 1);

    notifyParent({ type: 'QUESTION_CHANGED', index: currentIndex });

    // Focus sur la zone de contenu pour l'accessibilité
    const mainBox = document.getElementById('questionContainer');
    if (mainBox) mainBox.focus();
  }

  function renderCurrentQuestion() {
    const q = questions[currentIndex];
    const container = document.getElementById('questionContainer');
    if (!q || !container) return;

    let contentHtml = `
      <div class="partie-badge">${escapeHtml(q.partie)}</div>
      <div class="question-header">
        <h2 class="question-title">${currentIndex + 1}. ${escapeHtml(q.titre)}</h2>
        <span class="points-badge">${q.points} point${q.points > 1 ? 's' : ''}</span>
      </div>
      <div class="enonce-box">
        <p>${q.question}</p>
      </div>
      <div class="interaction-zone" id="interactionZone"></div>
      <div class="feedback-card" id="questionFeedback" style="display: none;"></div>
      <div class="coach-assistant-widget" id="coachWidget" style="display: none;"></div>
    `;

    if (q.image) {
      container.innerHTML = `
        <div class="question-with-figure-layout">
          <aside class="question-figure-card" aria-label="Schéma didactique de référence">
            <div class="figure-frame">
              <button type="button" class="btn-zoom-trigger" data-full="${q.image}" data-caption="${escapeHtml(q.imageAlt || q.imageCaption || 'Schéma de référence')}" aria-label="Agrandir l'illustration" title="Cliquer pour agrandir">
                <img src="${q.image}" alt="${escapeHtml(q.imageAlt || q.imageCaption || 'Schéma de référence')}" class="figure-img">
                <span class="zoom-badge">Agrandir</span>
              </button>
            </div>
            ${q.imageCaption ? `<div class="figure-caption">${escapeHtml(q.imageCaption)}</div>` : ''}
          </aside>
          <div class="question-main-content">
            ${contentHtml}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = contentHtml;
    }

    renderInteractiveComponent(q, document.getElementById('interactionZone'));

    if (validatedQuestions[currentIndex]) {
      showQuestionFeedback(q, validatedQuestions[currentIndex]);
    }

    if (modeCorrigeActive) {
      showCoachSolution(q);
    }

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([container]);
    }
  }

  // Mémoire de mélange aléatoire pour les questions à choix multiples (stabilisée par session)
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

  function renderInteractiveComponent(q, container) {
    if (!container) return;
    const isValidated = !!validatedQuestions[currentIndex];

    switch(q.type) {
      case 'radio': {
        const list = document.createElement('div');
        list.className = 'choice-list';
        const choicesList = getShuffledChoices(q.id, q.choices);
        choicesList.forEach(choice => {
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
              document.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
              item.classList.add('selected');
              enableValidateButton();
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
        wrap.innerHTML = `
          <label class="form-label" for="input_${q.id}">Votre réponse :</label>
          <input type="text" id="input_${q.id}" class="form-input" placeholder="${q.placeholder || 'Nom de la structure...'}" value="${escapeHtml(userAnswers[q.id] || '')}" ${isValidated ? 'disabled' : ''}>
        `;
        const input = wrap.querySelector('input');
        if (!isValidated) {
          input.addEventListener('input', (e) => {
            userAnswers[q.id] = e.target.value.trim();
            enableValidateButton();
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const btn = document.getElementById('btnValider');
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

        (q.subQuestions || []).forEach(sub => {
          const subCard = document.createElement('div');
          subCard.className = 'sub-card';
          subCard.innerHTML = `<h3 class="sub-card-title">${escapeHtml(sub.label)} (${sub.points} pt)</h3>`;
          const subList = document.createElement('div');
          subList.className = 'choice-list';
          const subChoicesList = getShuffledChoices(`${q.id}_${sub.id}`, sub.choices);
          subChoicesList.forEach(c => {
            const item = document.createElement('label');
            item.className = 'choice-item' + (userAnswers[q.id][sub.id] === c.id ? ' selected' : '');
            if (isValidated) {
              if (c.correct) item.classList.add('correct');
              else if (userAnswers[q.id][sub.id] === c.id) item.classList.add('incorrect');
            }
            item.innerHTML = `
              <input type="radio" name="sub_${q.id}_${sub.id}" value="${c.id}" ${userAnswers[q.id][sub.id] === c.id ? 'checked' : ''} ${isValidated ? 'disabled' : ''}>
              <span class="choice-text">${escapeHtml(c.text)}</span>
            `;
            if (!isValidated) {
              item.querySelector('input').addEventListener('change', () => {
                userAnswers[q.id][sub.id] = c.id;
                subList.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                enableValidateButton();
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

        (q.subQuestions || []).forEach(sub => {
          const row = document.createElement('div');
          row.className = 'sub-card form-group';
          if (sub.type === 'select') {
            row.innerHTML = `
              <label class="form-label" for="sel_${q.id}_${sub.id}">${escapeHtml(sub.label)} (${sub.points} pt)</label>
              <select id="sel_${q.id}_${sub.id}" class="form-select" ${isValidated ? 'disabled' : ''}>
                ${sub.options.map(opt => `<option value="${opt}" ${userAnswers[q.id][sub.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            `;
            const sel = row.querySelector('select');
            if (!isValidated) {
              sel.addEventListener('change', (e) => {
                userAnswers[q.id][sub.id] = e.target.value;
                enableValidateButton();
              });
            }
          } else {
            row.innerHTML = `
              <label class="form-label" for="inp_${q.id}_${sub.id}">${escapeHtml(sub.label)} (${sub.points} pt)</label>
              <input type="text" id="inp_${q.id}_${sub.id}" class="form-input" placeholder="${sub.placeholder || ''}" value="${escapeHtml(userAnswers[q.id][sub.id] || '')}" ${isValidated ? 'disabled' : ''}>
            `;
            const inp = row.querySelector('input');
            if (!isValidated) {
              inp.addEventListener('input', (e) => {
                userAnswers[q.id][sub.id] = e.target.value.trim();
                enableValidateButton();
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

        let tableHtml = `
          <div class="fonctions-reference-box">
            <strong>Banque des fonctions (A, B, C, D) :</strong>
            <ul>
              <li><strong>A :</strong> ${q.fonctions.A}</li>
              <li><strong>B :</strong> ${q.fonctions.B}</li>
              <li><strong>C :</strong> ${q.fonctions.C}</li>
              <li><strong>D :</strong> ${q.fonctions.D}</li>
            </ul>
          </div>
          <div class="table-responsive" style="margin-top: 1rem;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:20%;">Repère</th>
                  <th style="width:45%;">Nom de la glande / organe (1 pt)</th>
                  <th style="width:35%;">Fonction (1 pt)</th>
                </tr>
              </thead>
              <tbody>
        `;

        (q.items || []).forEach((item, idx) => {
          userAnswers[q.id][idx] = userAnswers[q.id][idx] || {};
          tableHtml += `
            <tr>
              <td><strong>${escapeHtml(item.label)}</strong></td>
              <td>
                <select class="form-select sel-nom" data-idx="${idx}" ${isValidated ? 'disabled' : ''}>
                  ${item.nomOptions.map(opt => `<option value="${opt}" ${userAnswers[q.id][idx].nom === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </td>
              <td>
                <select class="form-select sel-lettre" data-idx="${idx}" ${isValidated ? 'disabled' : ''}>
                  ${item.lettreOptions.map(opt => `<option value="${opt}" ${userAnswers[q.id][idx].lettre === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </td>
            </tr>
          `;
        });

        tableHtml += `</tbody></table></div>`;
        wrap.innerHTML = tableHtml;

        if (!isValidated) {
          wrap.querySelectorAll('.sel-nom').forEach(sel => {
            sel.addEventListener('change', (e) => {
              const i = e.target.dataset.idx;
              userAnswers[q.id][i].nom = e.target.value;
              enableValidateButton();
            });
          });
          wrap.querySelectorAll('.sel-lettre').forEach(sel => {
            sel.addEventListener('change', (e) => {
              const i = e.target.dataset.idx;
              userAnswers[q.id][i].lettre = e.target.value;
              enableValidateButton();
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

        (q.statements || []).forEach(stmt => {
          const row = document.createElement('div');
          row.className = 'matching-item';
          row.innerHTML = `
            <div class="matching-text">
              <strong>(${stmt.id.toUpperCase()})</strong> ${escapeHtml(stmt.text)}
            </div>
            <div class="matching-select-wrap">
              <select class="form-select sel-etape" data-id="${stmt.id}" ${isValidated ? 'disabled' : ''}>
                ${q.options.map(opt => `<option value="${opt}" ${userAnswers[q.id][stmt.id] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
              </select>
            </div>
          `;
          if (!isValidated) {
            row.querySelector('select').addEventListener('change', (e) => {
              userAnswers[q.id][stmt.id] = e.target.value;
              enableValidateButton();
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

        let tHtml = `
          <h3 class="sub-card-title">1. Constituants alimentaires principaux (4 points)</h3>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width:40%;">Aliment du repas</th>
                  <th style="width:60%;">Constituant alimentaire principal</th>
                </tr>
              </thead>
              <tbody>
        `;

        (q.tableData || []).forEach((row, rIdx) => {
          tHtml += `
            <tr>
              <td><strong>${escapeHtml(row.aliment)}</strong></td>
              <td>
                <select class="form-select sel-nutriment" data-idx="${rIdx}" ${isValidated ? 'disabled' : ''}>
                  ${row.options.map(opt => `<option value="${opt}" ${userAnswers[q.id].table[rIdx] === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </td>
            </tr>
          `;
        });

        tHtml += `</tbody></table></div>`;

        tHtml += `
          <div class="sub-card" style="margin-top: 1.25rem;">
            <h3 class="sub-card-title">2. Source d'énergie rapidement accessible (1 point)</h3>
            <p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">${escapeHtml(q.sourceRapide.contexte)}</p>
            <div class="form-grid-2col">
              <div class="form-group">
                <label class="form-label" for="selRapideConstituant">Constituant énergétique rapide :</label>
                <select id="selRapideConstituant" class="form-select" ${isValidated ? 'disabled' : ''}>
                  ${q.sourceRapide.constituantOptions.map(opt => `<option value="${opt}" ${userAnswers[q.id].rapide.constituant === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="selRapideAliment">Aliment associé dans le repas :</label>
                <select id="selRapideAliment" class="form-select" ${isValidated ? 'disabled' : ''}>
                  ${q.sourceRapide.alimentOptions.map(opt => `<option value="${opt}" ${userAnswers[q.id].rapide.aliment === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        `;

        wrap.innerHTML = tHtml;

        if (!isValidated) {
          wrap.querySelectorAll('.sel-nutriment').forEach(sel => {
            sel.addEventListener('change', (e) => {
              userAnswers[q.id].table[e.target.dataset.idx] = e.target.value;
              enableValidateButton();
            });
          });
          const selConst = wrap.querySelector('#selRapideConstituant');
          if (selConst) {
            selConst.addEventListener('change', (e) => {
              userAnswers[q.id].rapide.constituant = e.target.value;
              enableValidateButton();
            });
          }
          const selAlim = wrap.querySelector('#selRapideAliment');
          if (selAlim) {
            selAlim.addEventListener('change', (e) => {
              userAnswers[q.id].rapide.aliment = e.target.value;
              enableValidateButton();
            });
          }
        }
        container.appendChild(wrap);
        break;
      }
    }

    // Bouton de validation sous l'interaction
    const actionRow = document.createElement('div');
    actionRow.className = 'action-validate-row';
    actionRow.innerHTML = `
      <button type="button" id="btnValidateQuestion" class="btn btn-primary" ${isValidated ? 'disabled' : ''}>
        ${isValidated ? 'Défi validé ✓' : 'Valider ma réponse'}
      </button>
      <button type="button" id="btnToggleGuide" class="btn" style="display:${isValidated ? 'inline-block' : 'none'};">
        Voir l'explication didactique
      </button>
    `;

    const btnVal = actionRow.querySelector('#btnValidateQuestion');
    btnVal.addEventListener('click', validateCurrentAnswer);

    const btnGuide = actionRow.querySelector('#btnToggleGuide');
    if (btnGuide) {
      btnGuide.addEventListener('click', () => {
        const widget = document.getElementById('coachWidget');
        if (widget) {
          const isShown = widget.style.display !== 'none';
          widget.style.display = isShown ? 'none' : 'block';
          btnGuide.textContent = isShown ? "Voir l'explication didactique" : "Masquer l'explication";
        }
      });
    }

    container.appendChild(actionRow);
  }

  function enableValidateButton() {
    const btn = document.getElementById('btnValidateQuestion');
    if (btn && !validatedQuestions[currentIndex]) {
      btn.disabled = false;
    }
  }

  function validateCurrentAnswer() {
    const q = questions[currentIndex];
    if (!q || validatedQuestions[currentIndex]) return;

    let pointsGagnes = 0;
    let feedbackDetails = '';

    switch(q.type) {
      case 'radio': {
        const ansId = userAnswers[q.id];
        if (ansId === undefined) {
          alert('Veuillez sélectionner une réponse avant de valider.');
          return;
        }
        const opt = q.choices.find(c => c.id === ansId);
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
        if (!txt) {
          alert('Veuillez inscrire une réponse.');
          return;
        }
        const isMatch = (q.acceptedAnswers || []).some(acc => txt === acc.toLowerCase());
        if (isMatch) {
          pointsGagnes = q.points;
          feedbackDetails = 'Exact ! La structure B est bien l’œsophage.';
        } else {
          feedbackDetails = 'Réponse incorrecte. L’organe reliant le pharynx à l’estomac est l’œsophage.';
        }
        break;
      }

      case 'compound_radio': {
        const ans = userAnswers[q.id] || {};
        if (ans.type === undefined || ans.justification === undefined) {
          alert('Veuillez répondre aux deux volets (type de glande et justification).');
          return;
        }
        const subType = q.subQuestions.find(s => s.id === 'type');
        const optType = subType ? subType.choices.find(c => c.id === ans.type) : null;
        if (optType && optType.correct) pointsGagnes += subType.points;

        const subJust = q.subQuestions.find(s => s.id === 'justification');
        const optJust = subJust ? subJust.choices.find(c => c.id === ans.justification) : null;
        if (optJust && optJust.correct) pointsGagnes += subJust.points;

        feedbackDetails = `Glande annexe (${optType && optType.correct ? '✓' : '✗'}) | Justification (${optJust && optJust.correct ? '✓' : '✗'}).`;
        break;
      }

      case 'compound_select_text': {
        const ans = userAnswers[q.id] || {};
        const subLet = q.subQuestions.find(s => s.id === 'lettre');
        const subNom = q.subQuestions.find(s => s.id === 'nom');

        if (!ans.lettre || ans.lettre === '(Choisir)' || !ans.nom) {
          alert('Veuillez sélectionner la lettre et inscrire le nom du carrefour.');
          return;
        }

        if (ans.lettre === subLet.correct) pointsGagnes += subLet.points;
        const nomNorm = ans.nom.trim().toLowerCase();
        if (subNom.acceptedAnswers.some(a => nomNorm === a.toLowerCase())) pointsGagnes += subNom.points;

        feedbackDetails = `Lettre repère : ${ans.lettre === subLet.correct ? 'D (Exact)' : 'Incorrect'} | Nom : ${pointsGagnes >= 2 ? 'Pharynx (Exact)' : ans.nom}`;
        break;
      }

      case 'glandes_grid': {
        const ans = userAnswers[q.id] || {};
        (q.items || []).forEach((item, idx) => {
          const userG = ans[idx] || {};
          if (userG.nom === item.nomCorrect) pointsGagnes += 1;
          if (userG.lettre === item.lettreCorrecte) pointsGagnes += 1;
        });
        feedbackDetails = `${pointsGagnes} élément(s) correct(s) sur 8.`;
        break;
      }

      case 'etapes_matching': {
        const ans = userAnswers[q.id] || {};
        (q.statements || []).forEach(stmt => {
          if (ans[stmt.id] === stmt.correct) pointsGagnes += 1;
        });
        feedbackDetails = `${pointsGagnes} étape(s) correctement associée(s) sur 4.`;
        break;
      }

      case 'nutrition_compound': {
        const ans = userAnswers[q.id] || { table: {}, rapide: {} };
        (q.tableData || []).forEach((row, rIdx) => {
          if (ans.table[rIdx] === row.correct) pointsGagnes += (4 / q.tableData.length);
        });
        pointsGagnes = Math.round(pointsGagnes); // 4 points

        if (ans.rapide.constituant === q.sourceRapide.constituantCorrect &&
            ans.rapide.aliment === q.sourceRapide.alimentCorrect) {
          pointsGagnes += 1;
        }
        feedbackDetails = `${pointsGagnes} point(s) obtenu(s) sur 5 pour l'analyse nutritionnelle.`;
        break;
      }
    }

    // Mise à jour du score cumulatif strict
    score += pointsGagnes;
    score = Math.min(TOTAL_POINTS, Math.max(0, score));

    validatedQuestions[currentIndex] = {
      pointsObtenus: pointsGagnes,
      success: pointsGagnes === q.points,
      details: feedbackDetails
    };

    renderStepBar();
    showQuestionFeedback(q, validatedQuestions[currentIndex]);
    showCoachSolution(q);

    // Synchronisation SCORM
    if (window.ScormAPI) {
      window.ScormAPI.setScore(score, 0, TOTAL_POINTS);
      if (Object.keys(validatedQuestions).length === questions.length) {
        window.ScormAPI.setStatus(score >= 15 ? 'passed' : 'completed');
        window.ScormAPI.finish();
      } else {
        window.ScormAPI.commit();
      }
    }

    // Réactivation bouton pour voir l'explication
    const btnGuide = document.getElementById('btnToggleGuide');
    if (btnGuide) btnGuide.style.display = 'inline-block';
    const btnVal = document.getElementById('btnValidateQuestion');
    if (btnVal) {
      btnVal.disabled = true;
      btnVal.textContent = 'Défi validé ✓';
    }

    // Débloquer passage question suivante
    const navHint = document.getElementById('navStatusHint');
    if (navHint) {
      navHint.textContent = `Points obtenus : ${pointsGagnes} / ${q.points} pt — Vous pouvez passer à la suite.`;
      navHint.style.color = '#15803d';
    }
  }

  function showQuestionFeedback(q, valResult) {
    const box = document.getElementById('questionFeedback');
    if (!box) return;
    box.style.display = 'block';
    box.className = 'feedback-card ' + (valResult.success ? 'correct' : 'partial');
    box.innerHTML = `
      <div style="font-weight:700; font-size:0.95rem; margin-bottom:0.3rem;">
        ${valResult.success ? '✓ Bravo ! Rétroaction validée' : 'Rétroaction formative'} (+${valResult.pointsObtenus} / ${q.points} pt)
      </div>
      <div>${valResult.details}</div>
    `;
  }

  function setupCoachToggle() {
    const btnToggle = document.getElementById('btnToggleCoach');

    function setCoachVisible(visible) {
      const coach = document.getElementById('coachWidget');
      if (!coach) return;
      if (visible) {
        coach.classList.remove('hidden');
        coach.style.display = 'block';
        if (btnToggle) {
          btnToggle.setAttribute('aria-expanded', 'true');
          btnToggle.classList.add('active');
        }
      } else {
        coach.classList.add('hidden');
        coach.style.display = 'none';
        if (btnToggle) {
          btnToggle.setAttribute('aria-expanded', 'false');
          btnToggle.classList.remove('active');
        }
      }
    }

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const coach = document.getElementById('coachWidget');
        const isHidden = !coach || coach.classList.contains('hidden') || coach.style.display === 'none';
        setCoachVisible(isHidden);
      });
    }

    window.setCoachVisible = setCoachVisible;
  }

  function showCoachSolution(q) {
    const widget = document.getElementById('coachWidget');
    if (!widget) return;
    widget.style.display = 'block';
    widget.classList.remove('hidden');
    widget.innerHTML = `
      <div class="coach-header">
        <span class="coach-title">Assistant</span>
        <button type="button" id="btnCloseCoach" class="btn-close-coach" aria-label="Fermer l'assistant" title="Fermer l'assistant">✕</button>
      </div>
      <div class="coach-body">
        <strong>Solution attendue :</strong>
        <pre class="coach-solution-text">${escapeHtml(q.solution)}</pre>
        <strong>Rappel conceptuel :</strong>
        <p style="margin-top:0.35rem; font-size:0.875rem;">${escapeHtml(q.explication)}</p>
      </div>
    `;
    const btnClose = widget.querySelector('#btnCloseCoach');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (window.setCoachVisible) window.setCoachVisible(false);
      });
    }
    if (window.setCoachVisible) window.setCoachVisible(true);
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

  function setupBottomNav() {
    const btnPrev = document.getElementById('btnNavPrev');
    const btnNext = document.getElementById('btnNavNext');

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
  }

  function getCorrectSummary(q) {
    switch(q.type) {
      case 'radio': {
        const correct = (q.choices || []).find(c => c.correct);
        return correct ? correct.text : '';
      }
      case 'shortanswer': return (q.acceptedAnswers || [])[0] || '';
      case 'compound_radio': return "Glande annexe | Située hors du tube digestif, déversement par canal.";
      case 'compound_select_text': return "Lettre D | Pharynx";
      case 'glandes_grid': return "1: Glandes salivaires (A), 2: Foie (D), 3: Estomac (C), 4: Intestin grêle (B)";
      case 'etapes_matching': return "(a) Ingestion, (b) Absorption, (c) Élimination, (d) Digestion";
      case 'nutrition_compound': return "Glucides (Petit pain) — Apport énergétique immédiat.";
      default: return q.solution || '';
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

  // Démarrage au chargement du DOM
  window.addEventListener('DOMContentLoaded', initApp);

})();
