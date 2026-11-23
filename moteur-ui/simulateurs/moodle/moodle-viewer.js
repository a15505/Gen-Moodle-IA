/**
 * MoodleViewer - Moteur d'affichage et de validation interactive pour les 9 types de questions Moodle
 * Gère le rendu de l'interface étudiant / test et la validation des réponses.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  window.quizData = window.quizData || [];
  window.currentIndex = window.currentIndex || 0;
  window.isEditing = window.isEditing || false;
  window.userAnswers = window.userAnswers || {};
  window.validationStates = window.validationStates || {};
  window.modeCorrige = window.modeCorrige || false;
  window.optionsShuffleMap = window.optionsShuffleMap || {};

  var quizData = window.quizData;
  var userAnswers = window.userAnswers;
  var validationStates = window.validationStates;

  const escapeHtml = window.escapeHtml || function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const parseClozeItems = function(text) {
    if (typeof window.parseClozeItems === 'function') {
      return window.parseClozeItems(text);
    }
    const items = [];
    const regex = /\{(\d+):(MULTICHOICE|SHORTANSWER|NUMERICAL):([^}]+)\}/g;
    let match;
    while ((match = regex.exec(text || '')) !== null) {
      items.push({
        fullTag: match[0],
        points: parseInt(match[1]) || 1,
        type: match[2],
        content: match[3],
        index: items.length
      });
    }
    return items;
  };

  function renderInteractionComponent(q, container) {
      const savedAns = (window.userAnswers && q) ? window.userAnswers[q.id] : undefined;

      switch(q.type) {
        case 'multichoice':
          renderMultichoice(q, container, savedAns);
          break;
        case 'gapselect':
          renderGapSelect(q, container, savedAns);
          break;
        case 'matching':
          renderMatching(q, container, savedAns);
          break;
        case 'ddimage':
        case 'ddimageortext':
        case 'ddwtos':
          renderDDImage(q, container, savedAns);
          break;
        case 'numerical':
          renderNumerical(q, container, savedAns);
          break;
        case 'ordering':
          renderOrdering(q, container, savedAns);
          break;
        case 'truefalse':
          renderTrueFalse(q, container, savedAns);
          break;
        case 'shortanswer':
          renderShortAnswer(q, container, savedAns);
          break;
      }
    }

    function renderMultichoice(q, container, savedAns) {
      const list = document.createElement('div');
      list.className = 'moodle-mcq-list';

      let optsWithIndex = (q.options || []).map((opt, idx) => ({ ...opt, origIdx: idx }));
      if (q.shuffleanswers !== false && !isEditing) {
        if (!q._shuffledIndices || q._shuffledIndices.length !== optsWithIndex.length) {
          q._shuffledIndices = optsWithIndex.map(o => o.origIdx).sort(() => Math.random() - 0.5);
        }
        optsWithIndex = q._shuffledIndices.map(i => ({ ...q.options[i], origIdx: i }));
      }

      optsWithIndex.forEach((opt) => {
        const idx = opt.origIdx;
        const item = document.createElement('label');
        item.className = 'moodle-mcq-item' + (savedAns === idx ? ' selected' : '');
        item.innerHTML = `
          <input type="radio" name="mcq_${q.id}" value="${idx}" ${savedAns === idx ? 'checked' : ''}>
          <span>${opt.text}</span>
        `;
        item.querySelector('input').addEventListener('change', () => {
          userAnswers[q.id] = idx;
          document.querySelectorAll('.moodle-mcq-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
        });
        list.appendChild(item);
      });
      container.appendChild(list);
    }

    function renderTrueFalse(q, container, savedAns) {
      const group = document.createElement('div');
      group.className = 'moodle-tf-group';
      const btnTrue = document.createElement('button');
      btnTrue.type = 'button';
      btnTrue.className = 'moodle-tf-btn' + (savedAns === true ? ' selected' : '');
      btnTrue.textContent = 'VRAI';

      const btnFalse = document.createElement('button');
      btnFalse.type = 'button';
      btnFalse.className = 'moodle-tf-btn' + (savedAns === false ? ' selected' : '');
      btnFalse.textContent = 'FAUX';

      btnTrue.addEventListener('click', () => {
        userAnswers[q.id] = true;
        btnTrue.classList.add('selected');
        btnFalse.classList.remove('selected');
      });
      btnFalse.addEventListener('click', () => {
        userAnswers[q.id] = false;
        btnFalse.classList.add('selected');
        btnTrue.classList.remove('selected');
      });

      group.appendChild(btnTrue);
      group.appendChild(btnFalse);
      container.appendChild(group);
    }

    function renderOrdering(q, container, savedAns) {
      const list = document.createElement('div');
      list.className = 'moodle-order-list';
      let items = savedAns || (q.items || []).map(it => it.text);

      function renderItems() {
        list.innerHTML = '';
        items.forEach((text, idx) => {
          const row = document.createElement('div');
          row.className = 'moodle-order-item';
          row.innerHTML = `
            <div class="moodle-order-buttons">
              <button type="button" class="moodle-order-btn btn-up" ${idx === 0 ? 'disabled' : ''}>▲</button>
              <button type="button" class="moodle-order-btn btn-down" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
            </div>
            <span class="moodle-order-text">${idx + 1}. ${escapeHtml(text)}</span>
          `;
          row.querySelector('.btn-up').addEventListener('click', () => {
            if (idx > 0) {
              const temp = items[idx];
              items[idx] = items[idx - 1];
              items[idx - 1] = temp;
              userAnswers[q.id] = [...items];
              renderItems();
            }
          });
          row.querySelector('.btn-down').addEventListener('click', () => {
            if (idx < items.length - 1) {
              const temp = items[idx];
              items[idx] = items[idx + 1];
              items[idx + 1] = temp;
              userAnswers[q.id] = [...items];
              renderItems();
            }
          });
          list.appendChild(row);
        });
      }
      renderItems();
      container.appendChild(list);
    }

    function renderMatching(q, container, savedAns) {
      const list = document.createElement('div');
      list.className = 'moodle-matching-list';
      const answersPool = (q.pairs || []).map(p => p.answer);
      const userSel = savedAns || {};

      (q.pairs || []).forEach((pair, idx) => {
        const row = document.createElement('div');
        row.className = 'moodle-matching-row';
        row.innerHTML = `
          <div class="moodle-matching-question">${pair.question}</div>
          <select class="moodle-matching-select" data-pair="${idx}">
            <option value="">(associer la réponse)</option>
            ${answersPool.map(a => `<option value="${escapeHtml(a)}" ${userSel[idx] === a ? 'selected' : ''}>${escapeHtml(a)}</option>`).join('')}
          </select>
        `;
        row.querySelector('select').addEventListener('change', (e) => {
          if (!userAnswers[q.id]) userAnswers[q.id] = {};
          userAnswers[q.id][idx] = e.target.value;
        });
        list.appendChild(row);
      });
      container.appendChild(list);
    }

    function renderGapSelect(q, container, savedAns) {
      const wrap = document.createElement('div');
      wrap.className = 'moodle-gap-wrap';
      const userSel = savedAns || {};
      const valState = validationStates[q.id];

      // Liste globale des options pour gapselect
      const allOptionTexts = (q.options || []).map(o => o.text);

      // Remplacement des marqueurs [[1]], [[2]], etc. par des emplacements repères
      // tout en préservant intacte la structure HTML (paragraphes, gras, formules...)
      const rawText = q.questionText || '';
      const htmlWithPlaceholders = rawText.replace(/\[\[(\d+)\]\]/g, (match, gapNum) => {
        return `<span class="moodle-gap-slot" data-gap="${gapNum}"></span>`;
      });
      wrap.innerHTML = htmlWithPlaceholders;

      // Remplacement de chaque emplacement par le menu déroulant stylisé
      wrap.querySelectorAll('.moodle-gap-slot').forEach(slot => {
        const gapIndex = parseInt(slot.dataset.gap, 10);
        const correctOpt = (q.options || [])[gapIndex - 1];
        const targetGroup = correctOpt?.group || 1;

        // Filtrage par groupe Moodle (si spécifié) ou toutes options du groupe
        let groupOpts = (q.options || []).filter(o => (o.group || 1) === targetGroup).map(o => o.text);
        if (groupOpts.length === 0) groupOpts = allOptionTexts;

        // Mélange aléatoire si shuffleanswers est activé
        if (q.shuffleanswers !== false && !isEditing) {
          const shuffleKey = `_shuffledGap_${gapIndex}`;
          if (!q[shuffleKey] || q[shuffleKey].length !== groupOpts.length) {
            q[shuffleKey] = [...groupOpts].sort(() => Math.random() - 0.5);
          }
          groupOpts = q[shuffleKey];
        }

        const select = document.createElement('select');
        select.className = 'moodle-gap-select';
        select.dataset.gap = gapIndex;
        select.setAttribute('aria-label', `Espace à combler numéro ${gapIndex}`);

        let selectHtml = '<option value="">(choisir)</option>';
        groupOpts.forEach(optText => {
          const isMatch = (userSel[gapIndex] === optText);
          selectHtml += `<option value="${escapeHtml(optText)}" ${isMatch ? 'selected' : ''}>${escapeHtml(optText)}</option>`;
        });
        select.innerHTML = selectHtml;

        // Si la question a déjà été validée, restituer l'état visuel (vert / rouge)
        if (valState) {
          if (userSel[gapIndex]) {
            const isGood = correctOpt && (userSel[gapIndex] === correctOpt.text);
            select.classList.add(isGood ? 'correct' : 'incorrect');
          } else {
            select.classList.add('incorrect');
          }
        }

        select.addEventListener('change', () => {
          if (!userAnswers[q.id]) userAnswers[q.id] = {};
          userAnswers[q.id][gapIndex] = select.value;
          select.classList.remove('correct', 'incorrect');
          delete validationStates[q.id];
          const fbBox = document.getElementById('qFeedbackBox');
          if (fbBox) fbBox.style.display = 'none';
        });

        const itemWrap = document.createElement('span');
        itemWrap.className = 'moodle-gap-item';
        itemWrap.appendChild(select);
        slot.parentNode.replaceChild(itemWrap, slot);
      });

      container.appendChild(wrap);
    }

    function renderNumerical(q, container, savedAns) {
      const wrap = document.createElement('div');
      wrap.className = 'moodle-num-wrap';
      const unit = (q.units && q.units.length > 0) ? q.units[0].unit : '';
      wrap.innerHTML = `
        <input type="number" step="any" class="moodle-num-input" id="num_input_${q.id}" value="${savedAns || ''}" placeholder="0.0">
        <span class="moodle-unit-label" style="font-weight:700;">${unit}</span>
      `;
      wrap.querySelector('input').addEventListener('input', (e) => {
        userAnswers[q.id] = e.target.value;
      });
      container.appendChild(wrap);
    }

    function renderShortAnswer(q, container, savedAns) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'moodle-short-input';
      input.placeholder = 'Tapez votre réponse...';
      input.value = savedAns || '';
      input.addEventListener('input', (e) => {
        userAnswers[q.id] = e.target.value.trim();
      });
      container.appendChild(input);
    }

    // GLISSER-DÉPOSER (ddimage / ddimageortext / ddwtos)
    function renderDDImage(q, container, savedAns) {
      const wrap = document.createElement('div');
      wrap.style.textAlign = 'center';

      const boardScroll = document.createElement('div');
      boardScroll.style.overflowX = 'auto';

      const board = document.createElement('div');
      board.className = 'moodle-dd-board';
      board.style.maxWidth = '100%';
      const bgImg = document.createElement('img');
      bgImg.className = 'moodle-dd-bg';
      // Comme Moodle : l'image se réduit à la largeur disponible et les zones
      // (en pixels de l'image réelle) suivent la même échelle.
      bgImg.style.maxWidth = '100%';
      const placerZones = () => {
        if (!bgImg.isConnected) { window.removeEventListener('resize', placerZones); return; }
        const s = bgImg.naturalWidth && bgImg.clientWidth ? Math.min(1, bgImg.clientWidth / bgImg.naturalWidth) : 1;
        board.querySelectorAll('.moodle-dd-drop').forEach((z) => {
          const d = (q.drops || [])[Number(z.dataset.idx)] || {};
          z.style.left = Math.round((d.xleft || 20) * s) + 'px';
          z.style.top = Math.round((d.ytop || 20) * s) + 'px';
        });
      };
      bgImg.addEventListener('load', placerZones);
      window.addEventListener('resize', placerZones);
      bgImg.src = q.bgImage || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" style="background:%23f1f5f9;"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b">Schéma scientifique</text></svg>';
      board.appendChild(bgImg);

      const userDrops = savedAns || {};

      (q.drops || []).forEach((drop, idx) => {
        const zone = document.createElement('div');
        zone.className = 'moodle-dd-drop' + (userDrops[idx] ? ' filled' : '');
        zone.style.left = (drop.xleft || 20) + 'px';
        zone.style.top = (drop.ytop || 20) + 'px';
        zone.textContent = userDrops[idx] || `Zone ${idx + 1}`;
        zone.dataset.idx = idx;

        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('hovered'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('hovered'));
        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('hovered');
          const dragText = e.dataTransfer.getData('text/plain');
          if (dragText) {
            if (!userAnswers[q.id]) userAnswers[q.id] = {};
            userAnswers[q.id][idx] = dragText;
            zone.textContent = dragText;
            zone.classList.add('filled');
          }
        });
        zone.addEventListener('click', () => {
          if (userAnswers[q.id] && userAnswers[q.id][idx]) {
            delete userAnswers[q.id][idx];
            zone.textContent = `Zone ${idx + 1}`;
            zone.classList.remove('filled');
          }
        });
        board.appendChild(zone);
      });

      boardScroll.appendChild(board);
      wrap.appendChild(boardScroll);

      // Plateau des étiquettes à glisser
      const tray = document.createElement('div');
      tray.className = 'moodle-dd-drags-tray';
      (q.drags || []).forEach(drag => {
        const item = document.createElement('div');
        item.className = 'moodle-dd-drag-item';
        item.draggable = true;
        item.textContent = drag.text;
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', drag.text);
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => item.classList.remove('dragging'));
        tray.appendChild(item);
      });

      wrap.appendChild(tray);
      container.appendChild(wrap);
    }

    // CLOZE : Rendu interactif visuel des shortcodes
    function renderClozeInteractiveText(q) {
      const parts = (q.questionText || '').split(/(\{[^}]+\})/g);
      let outHtml = '';
      let clozeCount = 0;

      const userAns = userAnswers[q.id] || {};

      parts.forEach(part => {
        if (part.startsWith('{') && part.endsWith('}')) {
          clozeCount++;
          const idx = clozeCount;
          const inner = part.slice(1, -1);
          const val = userAns[idx] || '';

          if (inner.includes('MULTICHOICE')) {
            const opts = inner.split(':')[2]?.split('~') || [];
            let optionsHtml = '<option value="">(choisir)</option>';
            opts.forEach(o => {
              const cleaned = o.replace(/^=/, '').split('#')[0].trim();
              optionsHtml += `<option value="${escapeHtml(cleaned)}" ${val === cleaned ? 'selected' : ''}>${escapeHtml(cleaned)}</option>`;
            });
            outHtml += `<span class="cloze-field-wrap" id="cloze_wrap_${idx}"><select class="cloze-input" data-cloze-idx="${idx}">${optionsHtml}</select></span>`;
          } else if (inner.includes('NUMERICAL')) {
            outHtml += `<span class="cloze-field-wrap" id="cloze_wrap_${idx}"><input type="number" step="any" class="cloze-input" data-cloze-idx="${idx}" value="${escapeHtml(val)}" placeholder="0.0"></span>`;
          } else {
            outHtml += `<span class="cloze-field-wrap" id="cloze_wrap_${idx}"><input type="text" class="cloze-input" data-cloze-idx="${idx}" value="${escapeHtml(val)}" placeholder="réponse..."></span>`;
          }
        } else {
          outHtml += part;
        }
      });
      return outHtml;
    }

    function attachClozeEventListeners(q, container) {
      container.querySelectorAll('.cloze-input').forEach(input => {
        const idx = input.dataset.clozeIdx;
        input.addEventListener('change', (e) => {
          if (!userAnswers[q.id]) userAnswers[q.id] = {};
          userAnswers[q.id][idx] = e.target.value.trim();
        });
        input.addEventListener('input', (e) => {
          if (!userAnswers[q.id]) userAnswers[q.id] = {};
          userAnswers[q.id][idx] = e.target.value.trim();
        });
      });
    }

    // =========================================================================
    // VALIDATION DES RÉPONSES EN MODE TEST
    // =========================================================================
    
    // =========================================================================
    // FONCTION DE REMPLISSAGE AUTOMATIQUE DES BONNES RÉPONSES
    // =========================================================================
    function fillQuestionCorrectAnswers(q) {
      if (!q) return;

      switch(q.type) {
        case 'multichoice': {
          const correctIdx = (q.options || []).findIndex(opt => opt.fraction > 0);
          if (correctIdx >= 0) {
            userAnswers[q.id] = correctIdx;
          }
          break;
        }
        case 'gapselect': {
          userAnswers[q.id] = userAnswers[q.id] || {};
          (q.options || []).forEach((opt, i) => {
            userAnswers[q.id][i + 1] = opt.text;
          });
          break;
        }
        case 'matching': {
          userAnswers[q.id] = userAnswers[q.id] || {};
          (q.pairs || []).forEach((p, i) => {
            userAnswers[q.id][i] = p.answer;
          });
          break;
        }
        case 'numerical': {
          const best = (q.answers || [])[0];
          if (best) {
            userAnswers[q.id] = best.value !== undefined ? best.value : best.text;
          }
          break;
        }
        case 'ordering': {
          userAnswers[q.id] = (q.items || []).map(item => item.text);
          break;
        }
        case 'truefalse': {
          userAnswers[q.id] = q.correctAnswer;
          break;
        }
        case 'shortanswer': {
          const best = (q.answers || []).find(a => a.fraction > 0) || (q.answers || [])[0];
          if (best) {
            userAnswers[q.id] = best.text;
          }
          break;
        }
        case 'ddimage':
        case 'ddimageortext':
        case 'ddwtos': {
          userAnswers[q.id] = userAnswers[q.id] || {};
          (q.drops || []).forEach((drop, i) => {
            const targetDrag = (q.drags || []).find(d => d.no === drop.choice);
            if (targetDrag) {
              userAnswers[q.id][i] = targetDrag.text;
            }
          });
          break;
        }
        case 'cloze': {
          const clozeItems = parseClozeItems(q.questionText);
          userAnswers[q.id] = userAnswers[q.id] || {};
          clozeItems.forEach(item => {
            userAnswers[q.id][item.index + 1] = item.correctAnswer;
          });
          break;
        }
      }
    }

    function validateQuestion(q) {
      if (!q) return { isCorrect: false, feedback: '' };
      const ans = userAnswers[q.id];
      let isCorrect = false;
      let feedback = '';

      switch(q.type) {
        case 'multichoice':
          if (ans !== undefined) {
            const opt = (q.options || [])[ans];
            isCorrect = (opt && opt.fraction > 0);
            feedback = opt?.feedback || (isCorrect ? 'Bonne réponse !' : 'Réponse incorrecte.');
          }
          break;
        case 'gapselect': {
          let allGaps = true;
          const userSel = ans || {};
          (q.options || []).forEach((opt, i) => {
            const gapIdx = i + 1;
            const isGood = Boolean(userSel[gapIdx] && userSel[gapIdx] === opt.text);
            if (!isGood) allGaps = false;
            const selEl = document.querySelector(`.moodle-gap-select[data-gap="${gapIdx}"]`);
            if (selEl) {
              selEl.classList.remove('correct', 'incorrect');
              if (userSel[gapIdx]) {
                selEl.classList.add(isGood ? 'correct' : 'incorrect');
              } else {
                selEl.classList.add('incorrect');
              }
            }
          });
          isCorrect = allGaps;
          feedback = isCorrect ? 'Tous les termes sont correctement placés.' : 'Un ou plusieurs termes ne sont pas à leur place.';
          break;
        }
        case 'matching':
          let allMatch = true;
          (q.pairs || []).forEach((p, i) => {
            if (!ans || ans[i] !== p.answer) allMatch = false;
          });
          isCorrect = allMatch;
          feedback = isCorrect ? 'Toutes les associations sont exactes.' : 'Certaines associations sont incorrectes.';
          break;
        case 'numerical':
          const val = parseFloat(ans);
          if (!isNaN(val)) {
            (q.answers || []).forEach(a => {
              const diff = Math.abs(val - a.value);
              if (diff <= (a.tolerance || 0)) {
                isCorrect = true;
                feedback = a.feedback || 'Calcul exact !';
              }
            });
          }
          if (!isCorrect) feedback = 'Le résultat numérique ou l\'arrondi ne correspond pas.';
          break;
        case 'ordering':
          let allOrder = true;
          (q.items || []).forEach((item, i) => {
            if (!ans || ans[i] !== item.text) allOrder = false;
          });
          isCorrect = allOrder;
          feedback = isCorrect ? 'Séquence ordonnée avec succès.' : 'L\'ordre de la séquence est incorrect.';
          break;
        case 'truefalse':
          isCorrect = (ans === q.correctAnswer);
          feedback = isCorrect ? (q.feedbackTrue || 'Bonne réponse !') : (q.feedbackFalse || 'Réponse incorrecte.');
          break;
        case 'shortanswer':
          const userStr = q.useCase ? (ans || '') : (ans || '').toLowerCase();
          (q.answers || []).forEach(a => {
            const target = q.useCase ? a.text : a.text.toLowerCase();
            if (userStr === target && a.fraction > 0) {
              isCorrect = true;
              feedback = a.feedback || 'Exact !';
            }
          });
          if (!isCorrect) feedback = 'Le mot ou la valeur attendue n\'est pas reconnu.';
          break;
        case 'ddimage':
        case 'ddimageortext':
        case 'ddwtos':
          let allDrops = true;
          (q.drops || []).forEach((drop, i) => {
            const targetDrag = (q.drags || []).find(d => d.no === drop.choice);
            if (!ans || ans[i] !== targetDrag?.text) allDrops = false;
          });
          isCorrect = allDrops;
          feedback = isCorrect ? 'Toutes les étiquettes sont déposées aux bons repères.' : 'Certaines étiquettes sont mal positionnées.';
          break;
        case 'cloze':
          const clozeItems = parseClozeItems(q.questionText);
          let allClozeGood = true;
          const userCloze = ans || {};

          clozeItems.forEach(item => {
            const userVal = userCloze[item.index + 1] || '';
            const wrap = document.getElementById(`cloze_wrap_${item.index + 1}`);
            let isItemGood = false;

            if (item.type === 'MULTICHOICE') {
              isItemGood = (userVal.toLowerCase() === (item.correctAnswer || '').toLowerCase());
            } else if (item.type === 'NUMERICAL') {
              const num = parseFloat(userVal);
              isItemGood = (!isNaN(num) && Math.abs(num - parseFloat(item.correctAnswer)) <= (item.tolerance || 0));
            } else {
              isItemGood = (userVal.toLowerCase() === (item.correctAnswer || '').toLowerCase()) || 
                           (item.options || []).some(o => o.toLowerCase() === userVal.toLowerCase());
            }

            if (wrap) {
              wrap.className = 'cloze-field-wrap ' + (isItemGood ? 'correct' : 'incorrect');
            }
            if (!isItemGood) allClozeGood = false;
          });

          isCorrect = allClozeGood;
          feedback = isCorrect ? 'Tous les champs Cloze sont parfaitement complétés !' : 'Certains champs Cloze contiennent des erreurs ou sont vides.';
          break;
      }

      validationStates[q.id] = { isCorrect, feedback };
      return validationStates[q.id];
    }

    

  window.MoodleViewer = {
    render: renderInteractionComponent,
    renderInteraction: renderInteractionComponent,
    validateQuestion: validateQuestion,
    fillQuestionCorrectAnswers: fillQuestionCorrectAnswers,
    renderMultichoice: renderMultichoice,
    renderTrueFalse: renderTrueFalse,
    renderOrdering: renderOrdering,
    renderMatching: renderMatching,
    renderGapSelect: renderGapSelect,
    renderNumerical: renderNumerical,
    renderShortAnswer: renderShortAnswer,
    renderDDImage: renderDDImage,
    renderCloze: renderClozeInteractiveText,
    attachClozeEventListeners: attachClozeEventListeners
  };

  // Export vers l'espace global pour compatibilité directe
  window.renderInteractionComponent = renderInteractionComponent;
  window.validateQuestion = validateQuestion;
  window.fillQuestionCorrectAnswers = fillQuestionCorrectAnswers;
  window.renderMultichoice = renderMultichoice;
  window.renderTrueFalse = renderTrueFalse;
  window.renderOrdering = renderOrdering;
  window.renderMatching = renderMatching;
  window.renderGapSelect = renderGapSelect;
  window.renderNumerical = renderNumerical;
  window.renderShortAnswer = renderShortAnswer;
  window.renderDDImage = renderDDImage;
  window.renderClozeInteractiveText = renderClozeInteractiveText;
  window.attachClozeEventListeners = attachClozeEventListeners;

})();
