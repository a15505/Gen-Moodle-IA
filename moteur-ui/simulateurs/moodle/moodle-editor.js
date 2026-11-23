/**
 * MoodleEditor - Module d'édition en direct des questions Moodle (Mode d'édition)
 * Intègre l'éditeur riche Quill, le redimensionnement d'images, l'inspecteur visuel Cloze,
 * et les éditeurs spécialisés pour les 9 types de questions.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';
  // Références globales partagées
  window.quizData = window.quizData || [];
  window.currentIndex = window.currentIndex || 0;
  window.isEditing = window.isEditing || false;
  window.userAnswers = window.userAnswers || {};
  window.validationStates = window.validationStates || {};
  window.isDirty = window.isDirty || false;
  let quillInstance = null;
  let selectedImage = null;


  const getTypeLabel = window.getTypeLabel || function(type) {
    const map = { 'multichoice': 'QCM', 'gapselect': 'Trous', 'matching': 'Paires', 'ddimageortext': 'Glisser-déposer', 'numerical': 'Numérique', 'ordering': 'Ordre', 'truefalse': 'Vrai/Faux', 'shortanswer': 'Courte', 'cloze': 'Cloze' };
    return map[type] || type || 'Question';
  };
  const getCleanTitle = window.getCleanTitle || function(n) { return (n || 'Question').replace(/^(Q\d+[\s.:-]+|\d+[\s.:-]+|Question\s*\d+[\s.:-]*)/i, '').trim(); };
  const escapeHtml = window.escapeHtml || function(t) { return (t || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  const markDirty = function() { window.markDirty(); };
  const showToast = function(m) {
    if (typeof window.showToast === 'function') {
      window.showToast(m);
    } else {
      let t = document.getElementById('saveToast');
      if (!t) { t = document.createElement('div'); t.id = 'saveToast'; document.body.appendChild(t); }
      t.textContent = m; t.style.display = 'flex';
      setTimeout(() => t.style.display = 'none', 2800);
    }
  };

  function getCurrentQuestion() {
    return window.quizData && window.quizData[window.currentIndex] ? window.quizData[window.currentIndex] : null;
  }


  function registerQuillImageBlot() {
      if (typeof window === 'undefined' || !window.Quill || window.__quillImageBlotRegistered) return;
      try {
        const ImageBlot = window.Quill.import('formats/image');
        if (ImageBlot) {
          class ResizableImageBlot extends ImageBlot {
            static create(value) {
              const node = super.create(value);
              if (typeof value === 'object') {
                if (value.src) node.setAttribute('src', value.src);
                if (value.width) node.setAttribute('width', value.width);
                if (value.style) node.setAttribute('style', value.style);
                if (value.alt) node.setAttribute('alt', value.alt);
              }
              return node;
            }
            static formats(domNode) {
              return {
                src: domNode.getAttribute('src'),
                width: domNode.getAttribute('width') || domNode.style.width,
                style: domNode.getAttribute('style'),
                alt: domNode.getAttribute('alt')
              };
            }
            format(name, value) {
              if (name === 'width') {
                if (value) {
                  this.domNode.setAttribute('width', value);
                  this.domNode.style.width = typeof value === 'number' ? `${value}px` : value;
                } else {
                  this.domNode.removeAttribute('width');
                  this.domNode.style.width = '';
                }
              } else if (name === 'style') {
                if (value) this.domNode.setAttribute('style', value);
                else this.domNode.removeAttribute('style');
              } else {
                super.format(name, value);
              }
            }
          }
          window.Quill.register(ResizableImageBlot, true);
          window.__quillImageBlotRegistered = true;
        }
      } catch (e) {
        console.warn('Custom Quill blot registration:', e);
      }
    }

    function initQuillEditor(q) {
      registerQuillImageBlot();
      const editorDiv = document.getElementById('quillEditor');
      if (!editorDiv || !window.Quill) return;

      selectedImage = null;
      closeImgOverlay();

      quillInstance = new window.Quill(editorDiv, {
        theme: 'snow',
        placeholder: 'Rédigez l\'énoncé de la question ici...',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['image', 'clean']
          ]
        }
      });

      // Inject initial HTML
      if (q.questionText) {
        quillInstance.clipboard.dangerouslyPasteHTML(q.questionText);
      }

      // Synchroniser le contenu avec q.questionText
      quillInstance.on('text-change', () => {
        const html = quillInstance.root.innerHTML;
        q.questionText = html;
        const srcTa = document.getElementById('editQTextSource');
        if (srcTa) srcTa.value = html;
        markDirty();
        if (q.type === 'cloze') {
          renderClozeEditInspector(q);
        }
      });

      // Détecter le clic sur une image pour afficher l'overlay de redimensionnement
      const qlEditor = editorDiv.querySelector('.ql-editor');
      if (qlEditor) {
        qlEditor.addEventListener('click', (e) => {
          if (e.target && e.target.tagName === 'IMG') {
            attachImageResizeOverlay(e.target);
          } else {
            closeImgOverlay();
          }
        });
      }

      // Configurer le listener des poignées de redimensionnement
      setupCornerResizeHandles();
    }

    function attachImageResizeOverlay(img) {
      selectedImage = img;
      updateImgOverlayPosition();

      // Écouter le scroll et resize pour garder l'overlay synchronisé
      window.addEventListener('resize', updateImgOverlayPosition);
      const qlEditor = document.querySelector('.ql-editor');
      if (qlEditor) qlEditor.addEventListener('scroll', updateImgOverlayPosition);
    }

    function updateImgOverlayPosition() {
      if (!selectedImage) {
        closeImgOverlay();
        return;
      }
      const overlay = document.getElementById('imageResizeOverlay');
      const container = document.getElementById('quillEditorContainer');
      if (!overlay || !container) return;

      const cRect = container.getBoundingClientRect();
      const imgRect = selectedImage.getBoundingClientRect();

      overlay.style.display = 'block';
      overlay.style.top = (imgRect.top - cRect.top) + 'px';
      overlay.style.left = (imgRect.left - cRect.left) + 'px';
      overlay.style.width = imgRect.width + 'px';
      overlay.style.height = imgRect.height + 'px';

      document.getElementById('imgSizeBadge').textContent = Math.round(imgRect.width) + 'px';
    }

    function closeImgOverlay() {
      selectedImage = null;
      const overlay = document.getElementById('imageResizeOverlay');
      if (overlay) overlay.style.display = 'none';
    }

    function setupCornerResizeHandles() {
      const handles = document.querySelectorAll('.image-resize-handle');
      handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!selectedImage) return;

          const corner = handle.dataset.corner;
          const startX = e.clientX;
          const startWidth = selectedImage.offsetWidth;

          function onMouseMove(ev) {
            let deltaX = ev.clientX - startX;
            if (corner === 'nw' || corner === 'sw') deltaX = -deltaX;

            const newWidth = Math.max(80, Math.min(1000, Math.round(startWidth + deltaX)));
            selectedImage.style.width = newWidth + 'px';
            selectedImage.setAttribute('width', newWidth);
            selectedImage.style.maxWidth = '100%';
            selectedImage.style.height = 'auto';
            updateImgOverlayPosition();
          }

          function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            if (quillInstance) {
              const q = quizData[currentIndex];
              q.questionText = quillInstance.root.innerHTML;
              markDirty();
            }
          }

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });
      });
    }

    function setImgPreset(percent) {
      if (!selectedImage) return;
      const editorWidth = document.getElementById('quillEditor')?.clientWidth || 600;
      const newWidth = Math.round(Math.max(100, (editorWidth - 40) * percent / 100));

      selectedImage.style.width = newWidth + 'px';
      selectedImage.setAttribute('width', newWidth);
      selectedImage.style.maxWidth = '100%';
      selectedImage.style.height = 'auto';

      updateImgOverlayPosition();
      if (quillInstance) {
        const q = quizData[currentIndex];
        q.questionText = quillInstance.root.innerHTML;
        markDirty();
      }
    }

    function setImgAlignment(align) {
      if (!selectedImage) return;
      selectedImage.style.display = 'block';
      if (align === 'left') selectedImage.style.margin = '12px auto 12px 0';
      else if (align === 'center') selectedImage.style.margin = '12px auto';
      else if (align === 'right') selectedImage.style.margin = '12px 0 12px auto';

      updateImgOverlayPosition();
      if (quillInstance) {
        const q = quizData[currentIndex];
        q.questionText = quillInstance.root.innerHTML;
        markDirty();
      }
    }

    function deleteActiveImage() {
      if (!selectedImage) return;
      const parent = selectedImage.parentElement;
      selectedImage.remove();
      if (parent && parent.tagName === 'P' && parent.innerHTML.trim() === '') {
        parent.remove();
      }
      closeImgOverlay();
      if (quillInstance) {
        const q = quizData[currentIndex];
        q.questionText = quillInstance.root.innerHTML;
        markDirty();
      }
      showToast('Image supprimée !');
    }

    function toggleHtmlSourceView() {
      const srcTa = document.getElementById('editQTextSource');
      const btn = document.getElementById('btnToggleHtmlSource');
      const isVisible = (srcTa.style.display === 'block');

      if (isVisible) {
        // Appliquer depuis le code source vers Quill
        srcTa.style.display = 'none';
        btn.textContent = 'Voir le code HTML brut';
        if (quillInstance) {
          quillInstance.clipboard.dangerouslyPasteHTML(srcTa.value);
        }
      } else {
        // Afficher le code source
        srcTa.style.display = 'block';
        srcTa.value = quillInstance ? quillInstance.root.innerHTML : '';
        btn.textContent = 'Masquer le code HTML';
        srcTa.oninput = () => {
          const q = quizData[currentIndex];
          q.questionText = srcTa.value;
          markDirty();
        };
      }
    }

    function renderEditMode() {
      const container = document.getElementById('editModeContainer');
      const idx = (typeof window.currentIndex === 'number') ? window.currentIndex : 0;
      const q = window.quizData ? window.quizData[idx] : null;
      if (!q || !container) return;

      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">
            <span>Édition générale de la question (Q${idx + 1} &mdash; ${getTypeLabel(q.type)})</span>
            <span style="font-size:0.75rem; color:#64748b;">Modifications synchronisées en direct</span>
          </div>

          <div class="form-row">
            <div class="form-col" style="flex: 2;">
              <label class="form-label">Titre / Intitulé de la question</label>
              <input type="text" id="editQName" class="form-input" value="${escapeHtml(getCleanTitle(q.name))}">
            </div>
            <div class="form-col" style="flex: 1;">
              <label class="form-label">Tag conceptuel PFEQ (1 mot)</label>
              <input type="text" id="editQTag" class="form-input" value="${escapeHtml(q.tag || '')}" placeholder="ex: respiration, alvéoles...">
            </div>
            <div class="form-col" style="width: 100px; flex: none;">
              <label class="form-label">Points</label>
              <input type="number" id="editQGrade" class="form-input" step="0.5" value="${q.defaultgrade || 1}">
            </div>
          </div>

          <!-- Outil d'insertion et modification d'image -->
          <div style="margin-bottom: 0.85rem;">
            <label class="form-label">Énoncé de la question & Illustrations</label>
            <div class="image-tools-bar">
              <button type="button" class="tool-btn" onclick="insertFormatTag('<b>', '</b>')">Gras</button>
              <button type="button" class="tool-btn" onclick="insertFormatTag('<i>', '</i>')">Italique</button>
              <button type="button" class="tool-btn" onclick="insertFormatTag('$', '$')">Formule Math ($)</button>
              <button type="button" class="tool-btn" style="background:#eff6ff; border-color:#93c5fd; font-weight:700;" onclick="toggleImageInsertBox()">
                🖼️ Insérer / Remplacer une image
              </button>
              ${q.type === 'cloze' ? `
                <button type="button" class="tool-btn" style="background:#fef2f2; border-color:#fca5a5;" onclick="insertClozeTemplate('MULTICHOICE')">+ QCM Cloze</button>
                <button type="button" class="tool-btn" style="background:#fef2f2; border-color:#fca5a5;" onclick="insertClozeTemplate('SHORTANSWER')">+ Champ texte</button>
                <button type="button" class="tool-btn" style="background:#fef2f2; border-color:#fca5a5;" onclick="insertClozeTemplate('NUMERICAL')">+ Numérique</button>
              ` : ''}
            </div>

            <!-- Tiroir d'insertion d'image -->
            <div id="imageInsertBox" style="display:none; background:#f8fafc; border:1px solid #cbd5e1; padding:0.85rem; border-top:none; margin-bottom:0.5rem;">
              <div style="font-size:0.8125rem; font-weight:700; margin-bottom:0.4rem; color:#1e293b;">Ajout d'une illustration pédagogique</div>
              <div class="form-row" style="margin-bottom:0.5rem;">
                <div class="form-col">
                  <label class="form-label">Option 1 : Téléverser un fichier</label>
                  <input type="file" id="imageFileInput" accept="image/*" class="form-input" style="padding:3px;">
                </div>
                <div class="form-col">
                  <label class="form-label">Option 2 : URL d'image / SVG</label>
                  <input type="text" id="imageUrlInput" class="form-input" placeholder="https://... ou data:image/...">
                </div>
              </div>
              <div class="paste-dropzone" id="pasteDropzone">
                📋 Cliquez ici puis faites <strong>Ctrl+V</strong> pour coller directement une image depuis votre presse-papier
              </div>
              <div class="form-row" style="margin-bottom:0.5rem;">
                <div class="form-col">
                  <label class="form-label">Largeur maximale</label>
                  <select id="imageWidthSelect" class="form-select">
                    <option value="300px">300 px (Petite)</option>
                    <option value="450px" selected>450 px (Moyenne)</option>
                    <option value="600px">600 px (Large)</option>
                    <option value="100%">100 % (Pleine largeur)</option>
                  </select>
                </div>
                <div class="form-col">
                  <label class="form-label">Alignement</label>
                  <select id="imageAlignSelect" class="form-select">
                    <option value="center" selected>Centré</option>
                    <option value="left">Gauche</option>
                    <option value="right">Droite</option>
                  </select>
                </div>
              </div>
              <div style="text-align:right;">
                <button type="button" class="btn btn-primary" onclick="applyInsertedImage()">Insérer dans l'énoncé</button>
              </div>
            </div>

            <!-- Éditeur RichText Quill avec redimensionnement d'image interactif -->
            <div class="image-resize-container" id="quillEditorContainer">
              <div id="quillEditor"></div>
              <div id="imageResizeOverlay" class="image-resize-overlay" style="display: none;">
                <div class="image-resize-handle nw" data-corner="nw"></div>
                <div class="image-resize-handle ne" data-corner="ne"></div>
                <div class="image-resize-handle sw" data-corner="sw"></div>
                <div class="image-resize-handle se" data-corner="se"></div>

                <div class="image-floating-toolbar">
                  <span id="imgSizeBadge" style="color:#93c5fd; font-family:monospace; margin-right:4px;">400px</span>
                  <span class="tb-divider"></span>
                  <button type="button" onclick="setImgPreset(25)">25%</button>
                  <button type="button" onclick="setImgPreset(50)">50%</button>
                  <button type="button" onclick="setImgPreset(75)">75%</button>
                  <button type="button" onclick="setImgPreset(100)">100%</button>
                  <span class="tb-divider"></span>
                  <button type="button" onclick="setImgAlignment('left')" title="Aligner à gauche">Gauche</button>
                  <button type="button" onclick="setImgAlignment('center')" title="Centrer">Centre</button>
                  <button type="button" onclick="setImgAlignment('right')" title="Aligner à droite">Droite</button>
                  <span class="tb-divider"></span>
                  <button type="button" onclick="deleteActiveImage()" style="color:#f87171;" title="Supprimer l'image">✕</button>
                  <button type="button" onclick="closeImgOverlay()" style="color:#94a3b8;" title="Fermer">Fermer</button>
                </div>
              </div>
            </div>
            <!-- Mode code HTML / Source -->
            <div style="margin-top:0.4rem; display:flex; justify-content:space-between; align-items:center;">
              <button type="button" class="tool-btn" id="btnToggleHtmlSource" onclick="toggleHtmlSourceView()">Voir le code HTML brut</button>
              <span style="font-size:0.75rem; color:#64748b;">Cliquez sur une image pour afficher sa barre de redimensionnement</span>
            </div>
            <textarea id="editQTextSource" class="form-textarea" rows="3" style="display:none; margin-top:0.4rem; font-family:monospace; font-size:0.8rem;"></textarea>
          </div>

          <!-- Rétroaction générale / Corrigé -->
          <div style="margin-bottom: 0.85rem;">
            <label class="form-label">Explication didactique & Corrigé modèle (generalFeedback)</label>
            <textarea id="editQFeedback" class="form-textarea" rows="3">${escapeHtml(q.generalFeedback || '')}</textarea>
          </div>
        </div>

        <!-- ZONE D'ÉDITION SPÉCIFIQUE AU TYPE DE QUESTION -->
        <div id="typeSpecificEditBox">
          <!-- Injecté dynamiquement selon type -->
        </div>
      `;

      // Brancher les événements sur les champs génériques avec protection null
      const editName = document.getElementById('editQName');
      if (editName) {
        editName.addEventListener('input', (e) => {
          q.name = getCleanTitle(e.target.value);
          markDirty();
          renderSidebar();
        });
      }
      const editTag = document.getElementById('editQTag');
      if (editTag) {
        editTag.addEventListener('input', (e) => {
          const cleanTag = e.target.value.trim().split(/\s+/)[0].toLowerCase();
          q.tag = cleanTag;
          markDirty();
          renderSidebar();
          const badge = document.getElementById('qConceptBadge');
          if (badge) {
            badge.style.display = cleanTag ? 'inline-block' : 'none';
            badge.textContent = cleanTag ? '#' + cleanTag : '';
          }
        });
      }
      const editGrade = document.getElementById('editQGrade');
      if (editGrade) {
        editGrade.addEventListener('input', (e) => {
          q.defaultgrade = parseFloat(e.target.value) || 1;
          markDirty();
        });
      }
      const editText = document.getElementById('editQText');
      if (editText) {
        editText.addEventListener('input', (e) => {
          q.questionText = e.target.value;
          markDirty();
          if (q.type === 'cloze') {
            renderClozeEditInspector(q);
          }
        });
      }
      const editTextSrc = document.getElementById('editQTextSource');
      if (editTextSrc) {
        editTextSrc.addEventListener('input', (e) => {
          q.questionText = e.target.value;
          if (quillInstance) {
            quillInstance.clipboard.dangerouslyPasteHTML(e.target.value);
          }
          markDirty();
          if (q.type === 'cloze') {
            renderClozeEditInspector(q);
          }
        });
      }
      const editFeedback = document.getElementById('editQFeedback');
      if (editFeedback) {
        editFeedback.addEventListener('input', (e) => {
          q.generalFeedback = e.target.value;
          markDirty();
        });
      }

      // Brancher le presse-papier sur la dropzone
      setupPasteDropzone();

      initQuillEditor(q);
      // Rendre l'éditeur spécifique
      renderTypeSpecificEditor(q);
    }

    function toggleImageInsertBox() {
      const box = document.getElementById('imageInsertBox');
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function insertFormatTag(startTag, endTag) {
      if (quillInstance) {
        if (startTag === '<b>') quillInstance.format('bold', !quillInstance.getFormat().bold);
        else if (startTag === '<i>') quillInstance.format('italic', !quillInstance.getFormat().italic);
        else if (startTag === '$') {
          const range = quillInstance.getSelection(true);
          const index = range ? range.index : quillInstance.getLength();
          quillInstance.insertText(index, '$x = 1$', 'user');
        }
      }
    }

    function setupPasteDropzone() {
      const dz = document.getElementById('pasteDropzone');
      if (!dz) return;

      window.addEventListener('paste', handleGlobalPaste);
    }

    function handleGlobalPaste(e) {
      if (!isEditing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const src = ev.target.result;
              const q = quizData[currentIndex];
              if (q.type === 'ddimage' || q.type === 'ddimageortext' || q.type === 'ddwtos') {
                if (confirm('Voulez-vous remplacer l\'image de fond du glisser-déposer par l\'image collée ?')) {
                  q.bgImage = src;
                  markDirty();
                  renderEditMode();
                  return;
                }
              }
              // Sinon insérer dans l'énoncé
              insertImageTagIntoText(src, '450px', 'center');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }

    function applyInsertedImage() {
      const fileInput = document.getElementById('imageFileInput');
      const urlInput = document.getElementById('imageUrlInput');
      const width = document.getElementById('imageWidthSelect').value;
      const align = document.getElementById('imageAlignSelect').value;

      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          insertImageTagIntoText(e.target.result, width, align);
          toggleImageInsertBox();
        };
        reader.readAsDataURL(fileInput.files[0]);
      } else if (urlInput.value.trim()) {
        insertImageTagIntoText(urlInput.value.trim(), width, align);
        toggleImageInsertBox();
      } else {
        alert('Veuillez sélectionner un fichier image ou saisir une URL.');
      }
    }

    function insertImageTagIntoText(src, width, align) {
      let marginStyle = 'margin: 12px auto;';
      if (align === 'left') marginStyle = 'margin: 12px auto 12px 0;';
      if (align === 'right') marginStyle = 'margin: 12px 0 12px auto;';

      const imgTag = `<img src="${src}" style="max-width: ${width}; width: 100%; display: block; ${marginStyle}" alt="Illustration didactique">`;
      if (quillInstance) {
        const range = quillInstance.getSelection(true) || { index: quillInstance.getLength() };
        quillInstance.clipboard.dangerouslyPasteHTML(range.index, imgTag);
        q.questionText = quillInstance.root.innerHTML;
        markDirty();
      } else {
        const ta = document.getElementById('editQText') || document.getElementById('editQTextSource');
        if (ta) {
          ta.value += '\n' + imgTag;
          ta.dispatchEvent(new Event('input'));
        }
      }
      showToast('Image insérée dans l\'énoncé !');
    }

    // =========================================================================
    // ÉDITEURS SPÉCIFIQUES PAR TYPE DE QUESTION
    // =========================================================================
        function renderTypeSpecificEditor(q) {
      const container = document.getElementById('typeSpecificEditBox');
      container.innerHTML = '';

      // Option de mélange aléatoire pour les types supportés
      if (['multichoice', 'matching', 'ordering', 'gapselect'].includes(q.type)) {
        const shuffleBar = document.createElement('div');
        shuffleBar.className = 'shuffle-option-bar';
        shuffleBar.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:0.5rem 0.85rem; background:var(--bg-surface-subtle); border:1px solid var(--border-color); border-radius:var(--radius-sm); margin-bottom:0.85rem;';
        shuffleBar.innerHTML = `
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; font-weight:600; cursor:pointer; user-select:none; margin:0;">
            <input type="checkbox" id="editQShuffle" ${q.shuffleanswers !== false ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
            <span>Mélanger aléatoirement les réponses possibles (chargement aléatoire)</span>
          </label>
          <span id="shuffleStatusTag" style="font-size:0.72rem; color:#64748b; font-family:monospace;">&lt;shuffleanswers&gt;${q.shuffleanswers !== false ? 'true' : 'false'}&lt;/shuffleanswers&gt;</span>
        `;
        shuffleBar.querySelector('#editQShuffle').addEventListener('change', (e) => {
          q.shuffleanswers = e.target.checked;
          delete q._shuffledIndices;
          markDirty();
          const tag = shuffleBar.querySelector('#shuffleStatusTag');
          if (tag) tag.textContent = `<shuffleanswers>${q.shuffleanswers ? 'true' : 'false'}</shuffleanswers>`;
          const sb = document.getElementById('qShuffleBadge');
          if (sb) {
            sb.textContent = q.shuffleanswers ? '🔀 Choix aléatoires' : '📋 Ordre fixe';
            sb.className = 'shuffle-badge ' + (q.shuffleanswers ? 'active' : 'fixed');
          }
        });
        container.appendChild(shuffleBar);
      }

      const specificContent = document.createElement('div');
      container.appendChild(specificContent);

      switch(q.type) {
        case 'multichoice':
          renderMultichoiceEditor(q, specificContent);
          break;
        case 'truefalse':
          renderTrueFalseEditor(q, specificContent);
          break;
        case 'matching':
          renderMatchingEditor(q, specificContent);
          break;
        case 'ordering':
          renderOrderingEditor(q, specificContent);
          break;
        case 'numerical':
          renderNumericalEditor(q, specificContent);
          break;
        case 'shortanswer':
          renderShortAnswerEditor(q, specificContent);
          break;
        case 'ddimage':
        case 'ddimageortext':
        case 'ddwtos':
          renderDDImageEditor(q, specificContent);
          break;
        case 'cloze':
          renderClozeEditInspector(q, specificContent);
          break;
        default:
          specificContent.innerHTML = '<div style="font-size:0.85rem; color:#64748b;">Options spécifiques non éditables pour ce type.</div>';
      }
    }

    function renderMultichoiceEditor(q, container) {
      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Choix de réponses (QCM)</div>
          <div id="mcqOptionsList"></div>
          <button type="button" class="btn" style="margin-top:0.5rem; font-size:0.8125rem;" id="btnAddMcqOption">+ Ajouter un choix</button>
        </div>
      `;

      function renderOptions() {
        const list = document.getElementById('mcqOptionsList');
        list.innerHTML = '';
        (q.options || []).forEach((opt, idx) => {
          const row = document.createElement('div');
          row.style.marginBottom = '0.75rem';
          row.style.padding = '0.5rem';
          row.style.border = '1px solid var(--border-color)';
          row.style.borderRadius = '4px';
          row.style.background = '#ffffff';

          row.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.35rem;">
              <label style="font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
                <input type="radio" name="edit_mcq_correct" value="${idx}" ${opt.fraction > 0 ? 'checked' : ''}>
                <span>Option ${idx + 1} ${opt.fraction > 0 ? '(Bonne réponse)' : ''}</span>
              </label>
              ${(q.options.length > 2) ? `<button type="button" class="tool-btn btn-del" style="color:#b91c1c;">Supprimer</button>` : ''}
            </div>
            <input type="text" class="form-input edit-opt-text" value="${escapeHtml(opt.text)}" style="margin-bottom:0.3rem;">
            <input type="text" class="form-input edit-opt-fb" value="${escapeHtml(opt.feedback || '')}" placeholder="Rétroaction explicative pour ce choix..." style="font-size:0.8rem;">
          `;

          row.querySelector('input[name="edit_mcq_correct"]').addEventListener('change', () => {
            q.options.forEach((o, i) => o.fraction = (i === idx ? 100 : 0));
            markDirty();
            renderOptions();
          });
          row.querySelector('.edit-opt-text').addEventListener('input', (e) => {
            opt.text = e.target.value;
            markDirty();
          });
          row.querySelector('.edit-opt-fb').addEventListener('input', (e) => {
            opt.feedback = e.target.value;
            markDirty();
          });
          const btnDel = row.querySelector('.btn-del');
          if (btnDel) {
            btnDel.addEventListener('click', () => {
              q.options.splice(idx, 1);
              markDirty();
              renderOptions();
            });
          }
          list.appendChild(row);
        });
      }

      renderOptions();
      document.getElementById('btnAddMcqOption').addEventListener('click', () => {
        if (!q.options) q.options = [];
        q.options.push({ text: 'Nouvelle option', fraction: 0, feedback: '' });
        markDirty();
        renderOptions();
      });
    }

    // 2. Éditeur Vrai / Faux
    function renderTrueFalseEditor(q, container) {
      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Réponse attendue (Vrai / Faux)</div>
          <div class="form-row">
            <label style="margin-right:1rem; font-weight:700;">
              <input type="radio" name="edit_tf_ans" value="true" ${q.correctAnswer === true ? 'checked' : ''}> VRAI
            </label>
            <label style="font-weight:700;">
              <input type="radio" name="edit_tf_ans" value="false" ${q.correctAnswer === false ? 'checked' : ''}> FAUX
            </label>
          </div>
          <div class="form-row" style="margin-top:0.5rem;">
            <div class="form-col">
              <label class="form-label">Rétroaction si l'élève choisit Vrai</label>
              <input type="text" id="editTfFbTrue" class="form-input" value="${escapeHtml(q.feedbackTrue || '')}">
            </div>
            <div class="form-col">
              <label class="form-label">Rétroaction si l'élève choisit Faux</label>
              <input type="text" id="editTfFbFalse" class="form-input" value="${escapeHtml(q.feedbackFalse || '')}">
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('input[name="edit_tf_ans"]').forEach(r => {
        r.addEventListener('change', (e) => {
          q.correctAnswer = (e.target.value === 'true');
          markDirty();
        });
      });
      document.getElementById('editTfFbTrue').addEventListener('input', (e) => { q.feedbackTrue = e.target.value; markDirty(); });
      document.getElementById('editTfFbFalse').addEventListener('input', (e) => { q.feedbackFalse = e.target.value; markDirty(); });
    }

    // 3. Éditeur Appariement
    function renderMatchingEditor(q, container) {
      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Paires d'appariement</div>
          <div id="matchingPairsList"></div>
          <button type="button" class="btn" style="margin-top:0.5rem; font-size:0.8125rem;" id="btnAddMatchPair">+ Ajouter une paire</button>
        </div>
      `;

      function renderPairs() {
        const list = document.getElementById('matchingPairsList');
        list.innerHTML = '';
        (q.pairs || []).forEach((pair, idx) => {
          const row = document.createElement('div');
          row.className = 'form-row';
          row.style.marginBottom = '0.5rem';
          row.innerHTML = `
            <div class="form-col">
              <input type="text" class="form-input p-quest" value="${escapeHtml(pair.question)}" placeholder="Élément ou Question ${idx + 1}">
            </div>
            <div class="form-col">
              <input type="text" class="form-input p-ans" value="${escapeHtml(pair.answer)}" placeholder="Réponse associée">
            </div>
            <button type="button" class="tool-btn p-del" style="color:#b91c1c;">✕</button>
          `;
          row.querySelector('.p-quest').addEventListener('input', (e) => { pair.question = e.target.value; markDirty(); });
          row.querySelector('.p-ans').addEventListener('input', (e) => { pair.answer = e.target.value; markDirty(); });
          row.querySelector('.p-del').addEventListener('click', () => {
            q.pairs.splice(idx, 1);
            markDirty();
            renderPairs();
          });
          list.appendChild(row);
        });
      }
      renderPairs();
      document.getElementById('btnAddMatchPair').addEventListener('click', () => {
        if (!q.pairs) q.pairs = [];
        q.pairs.push({ question: 'Nouvel élément', answer: 'Nouvelle réponse' });
        markDirty();
        renderPairs();
      });
    }

    // 4. Éditeur Ordonnancement
    function renderOrderingEditor(q, container) {
      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Éléments dans l'ordre chronologique exact (de haut en bas)</div>
          <div id="orderingItemsList"></div>
          <button type="button" class="btn" style="margin-top:0.5rem; font-size:0.8125rem;" id="btnAddOrderItem">+ Ajouter un élément</button>
        </div>
      `;

      function renderItems() {
        const list = document.getElementById('orderingItemsList');
        list.innerHTML = '';
        (q.items || []).forEach((it, idx) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.alignItems = 'center';
          row.style.gap = '0.5rem';
          row.style.marginBottom = '0.4rem';
          row.innerHTML = `
            <span style="font-size:0.8rem; font-weight:700; width:24px;">${idx + 1}.</span>
            <input type="text" class="form-input it-text" value="${escapeHtml(it.text)}" style="flex:1;">
            <button type="button" class="tool-btn it-del" style="color:#b91c1c;">✕</button>
          `;
          row.querySelector('.it-text').addEventListener('input', (e) => { it.text = e.target.value; markDirty(); });
          row.querySelector('.it-del').addEventListener('click', () => {
            q.items.splice(idx, 1);
            markDirty();
            renderItems();
          });
          list.appendChild(row);
        });
      }
      renderItems();
      document.getElementById('btnAddOrderItem').addEventListener('click', () => {
        if (!q.items) q.items = [];
        q.items.push({ text: 'Nouvel élément' });
        markDirty();
        renderItems();
      });
    }

    // 5. Éditeur Numérique
    function renderNumericalEditor(q, container) {
      const a = (q.answers && q.answers.length > 0) ? q.answers[0] : { value: 0, tolerance: 0, feedback: '' };
      const unit = (q.units && q.units.length > 0) ? q.units[0].unit : '';

      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Paramètres de calcul numérique</div>
          <div class="form-row">
            <div class="form-col">
              <label class="form-label">Valeur numérique exacte</label>
              <input type="number" step="any" id="editNumVal" class="form-input" value="${a.value}">
            </div>
            <div class="form-col">
              <label class="form-label">Tolérance acceptée (&plusmn;)</label>
              <input type="number" step="any" id="editNumTol" class="form-input" value="${a.tolerance}">
            </div>
            <div class="form-col">
              <label class="form-label">Unité de mesure</label>
              <input type="text" id="editNumUnit" class="form-input" value="${escapeHtml(unit)}" placeholder="ex: L, g, mol">
            </div>
          </div>
          <div style="margin-top:0.5rem;">
            <label class="form-label">Rétroaction de réussite numérique</label>
            <input type="text" id="editNumFb" class="form-input" value="${escapeHtml(a.feedback || '')}">
          </div>
        </div>
      `;

      document.getElementById('editNumVal').addEventListener('input', (e) => {
        if (!q.answers) q.answers = [{}];
        q.answers[0].value = parseFloat(e.target.value) || 0;
        markDirty();
      });
      document.getElementById('editNumTol').addEventListener('input', (e) => {
        if (!q.answers) q.answers = [{}];
        q.answers[0].tolerance = parseFloat(e.target.value) || 0;
        markDirty();
      });
      document.getElementById('editNumUnit').addEventListener('input', (e) => {
        q.units = [{ unit: e.target.value, multiplier: 1 }];
        markDirty();
      });
      document.getElementById('editNumFb').addEventListener('input', (e) => {
        if (!q.answers) q.answers = [{}];
        q.answers[0].feedback = e.target.value;
        markDirty();
      });
    }

    // 6. Éditeur Réponse Courte
    function renderShortAnswerEditor(q, container) {
      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">Réponses courtes acceptées</div>
          <div id="shortAnswersList"></div>
          <button type="button" class="btn" style="margin-top:0.5rem; font-size:0.8125rem;" id="btnAddShortAns">+ Ajouter une variante acceptée</button>
        </div>
      `;

      function renderShortList() {
        const list = document.getElementById('shortAnswersList');
        list.innerHTML = '';
        (q.answers || []).forEach((a, idx) => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '0.5rem';
          row.style.marginBottom = '0.4rem';
          row.innerHTML = `
            <input type="text" class="form-input sa-text" value="${escapeHtml(a.text)}" placeholder="Mot ou expression acceptée" style="flex:2;">
            <input type="text" class="form-input sa-fb" value="${escapeHtml(a.feedback || '')}" placeholder="Rétroaction..." style="flex:2;">
            <button type="button" class="tool-btn sa-del" style="color:#b91c1c;">✕</button>
          `;
          row.querySelector('.sa-text').addEventListener('input', (e) => { a.text = e.target.value; markDirty(); });
          row.querySelector('.sa-fb').addEventListener('input', (e) => { a.feedback = e.target.value; markDirty(); });
          row.querySelector('.sa-del').addEventListener('click', () => {
            q.answers.splice(idx, 1);
            markDirty();
            renderShortList();
          });
          list.appendChild(row);
        });
      }
      renderShortList();
      document.getElementById('btnAddShortAns').addEventListener('click', () => {
        if (!q.answers) q.answers = [];
        q.answers.push({ text: 'mot attendu', fraction: 100, feedback: 'Exact !' });
        markDirty();
        renderShortList();
      });
    }

    // =========================================================================
    // 7. ÉDITEUR GLISSER-DÉPOSER INTERACTIF (ddimage / ddimageortext / ddwtos)
    // =========================================================================
    let activeDragZoneIdx = null;

    
    // =========================================================================
    // ÉDITEUR DE RETOUCHE D'IMAGE (CANVAS PUR NATIF)
    // =========================================================================
    let rCanvas = null;
    let rCtx = null;
    let rTool = 'brush';
    let rColor = '#ffffff';
    let rBrushSize = 20;
    let rIsDrawing = false;
    let rCloneSource = null;
    let rIsSettingCloneSource = false;
    let rCloneOffset = null;
    let rHistory = [];
    let rHistoryStep = -1;
    let rLastPos = null;
    let rSnapshotCanvas = null;
    let rScratchCanvas = null;

    

  function parseClozeItems(text) {
      const regex = /\{(\d+)?(?::([A-Z_]+))?:([^}]+)\}/gi;
      const items = [];
      let match;
      let idx = 0;

      while ((match = regex.exec(text || '')) !== null) {
        const raw = match[0];
        const points = match[1] ? parseInt(match[1], 10) : 1;
        const typeStr = (match[2] || '').toUpperCase();
        const content = match[3] || '';

        let type = 'SHORTANSWER';
        let correctAnswer = '';
        let tolerance = 0;
        let options = [];
        let feedback = '';

        const fbParts = content.split('#');
        feedback = fbParts[1] || '';
        const body = fbParts[0];

        if (typeStr.includes('NUMERICAL')) {
          type = 'NUMERICAL';
          const cleanVal = body.replace(/^=/, '');
          if (cleanVal.includes(':')) {
            const p = cleanVal.split(':');
            correctAnswer = p[0].trim();
            tolerance = parseFloat(p[1]) || 0;
          } else {
            correctAnswer = cleanVal.trim();
            tolerance = 0;
          }
        } else if (typeStr.includes('MULTICHOICE')) {
          type = 'MULTICHOICE';
          const rawOpts = body.split('~');
          rawOpts.forEach(opt => {
            const clean = opt.trim();
            if (clean.startsWith('=')) {
              correctAnswer = clean.replace(/^=/, '').trim();
              options.push(correctAnswer);
            } else if (clean) {
              options.push(clean);
            }
          });
        } else {
          type = 'SHORTANSWER';
          const rawOpts = body.split('~');
          rawOpts.forEach(opt => {
            const clean = opt.trim().replace(/^=/, '');
            if (!correctAnswer) correctAnswer = clean;
            else if (clean) options.push(clean);
          });
        }

        items.push({
          raw,
          index: idx++,
          points,
          type,
          correctAnswer,
          tolerance,
          options,
          feedback
        });
      }
      return items;
    }

    function buildClozeTag(item) {
      const pts = Math.max(1, Math.round(item.points || 1));
      const fb = item.feedback ? `#${item.feedback.replace(/[}#]/g, '')}` : '';

      if (item.type === 'NUMERICAL') {
        const val = (item.correctAnswer || '0').replace(/,/g, '.').trim();
        const tol = item.tolerance ? `:${item.tolerance}` : ':0';
        return `{${pts}:NUMERICAL:=${val}${tol}${fb}}`;
      }
      if (item.type === 'MULTICHOICE') {
        const correct = `=${(item.correctAnswer || '').trim().replace(/[~}#]/g, '')}`;
        const wrong = (item.options || [])
          .map(o => o.trim().replace(/[~}#]/g, ''))
          .filter(o => o && o.toLowerCase() !== item.correctAnswer.trim().toLowerCase());
        return `{${pts}:MULTICHOICE:${[correct, ...wrong].join('~')}${fb}}`;
      }
      // SHORTANSWER
      const correct = `=${(item.correctAnswer || '').trim().replace(/[~}#]/g, '')}`;
      const variants = (item.options || [])
        .map(o => o.trim().replace(/[~}#]/g, ''))
        .filter(o => o && o.toLowerCase() !== item.correctAnswer.trim().toLowerCase())
        .map(v => v.startsWith('=') ? v : `=${v}`);
      return `{${pts}:SHORTANSWER:${[correct, ...variants].join('~')}${fb}}`;
    }

    function renderClozeEditInspector(q, targetContainer) {
      const container = targetContainer || document.getElementById('typeSpecificEditBox');
      if (!container) return;

      const items = parseClozeItems(q.questionText);

      container.innerHTML = `
        <div class="edit-box" style="border-color:#fca5a5; background:#fffbfb;">
          <div class="edit-box-title" style="color:#991b1b;">
            <span>Inspecteur des sous-questions Cloze (${items.length} champ(s) détecté(s))</span>
            <span style="font-size:0.75rem; color:#64748b;">Mise à jour automatique des shortcodes</span>
          </div>
          <div id="clozeCardsList"></div>
        </div>
      `;

      const list = document.getElementById('clozeCardsList');
      if (items.length === 0) {
        list.innerHTML = `<div style="font-size:0.85rem; color:#64748b; padding:0.5rem;">Aucun shortcode Cloze détecté dans l'énoncé. Utilisez les boutons au-dessus pour en insérer un.</div>`;
        return;
      }

      items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'cloze-card';
        card.innerHTML = `
          <div class="cloze-card-header">
            <div>
              <span class="moodle-type-badge ${item.type.toLowerCase()}" style="font-size:0.65rem;">Champ ${idx + 1} &mdash; ${item.type}</span>
              <span style="color:#64748b; font-size:0.75rem; margin-left:6px;">(${item.points} pt)</span>
            </div>
            <code style="font-size:0.75rem; background:#f1f5f9; padding:2px 6px; border-radius:3px;">${escapeHtml(item.raw)}</code>
          </div>

          <div class="form-row">
            <div class="form-col" style="flex:2;">
              <label class="form-label">Bonne réponse</label>
              <input type="text" class="form-input clz-ans" value="${escapeHtml(item.correctAnswer)}">
            </div>
            ${item.type === 'NUMERICAL' ? `
              <div class="form-col" style="flex:1;">
                <label class="form-label">Tolérance (&plusmn;)</label>
                <input type="number" step="any" class="form-input clz-tol" value="${item.tolerance}">
              </div>
            ` : ''}
            <div class="form-col" style="flex:1;">
              <label class="form-label">Points</label>
              <input type="number" class="form-input clz-pts" value="${item.points}">
            </div>
          </div>

          ${item.type === 'MULTICHOICE' ? `
            <div style="margin-top:0.4rem;">
              <label class="form-label">Distracteurs / Choix incorrects (séparés par ~)</label>
              <input type="text" class="form-input clz-opts" value="${escapeHtml(item.options.filter(o => o !== item.correctAnswer).join(' ~ '))}">
            </div>
          ` : ''}

          <div style="margin-top:0.4rem;">
            <label class="form-label">Rétroaction optionnelle (#feedback)</label>
            <input type="text" class="form-input clz-fb" value="${escapeHtml(item.feedback || '')}" placeholder="Explication...">
          </div>
        `;

        function updateThisClozeItem() {
          const newAns = card.querySelector('.clz-ans').value;
          const newPts = parseInt(card.querySelector('.clz-pts').value) || 1;
          const newFb = card.querySelector('.clz-fb').value;

          item.correctAnswer = newAns;
          item.points = newPts;
          item.feedback = newFb;

          if (item.type === 'NUMERICAL') {
            item.tolerance = parseFloat(card.querySelector('.clz-tol').value) || 0;
          }
          if (item.type === 'MULTICHOICE') {
            const rawOpts = card.querySelector('.clz-opts').value.split('~').map(s => s.trim()).filter(Boolean);
            item.options = [newAns, ...rawOpts];
          }

          const newTag = buildClozeTag(item);
          if (quillInstance) {
            const currentHtml = quillInstance.root.innerHTML;
            const updatedHtml = currentHtml.replace(item.raw, newTag);
            quillInstance.clipboard.dangerouslyPasteHTML(updatedHtml);
            q.questionText = updatedHtml;
          } else {
            const ta = document.getElementById('editQText') || document.getElementById('editQTextSource');
            if (ta) {
              ta.value = ta.value.replace(item.raw, newTag);
              q.questionText = ta.value;
            }
          }
          item.raw = newTag;
          card.querySelector('code').textContent = newTag;
          markDirty();
        }

        card.querySelectorAll('input').forEach(inp => {
          inp.addEventListener('input', updateThisClozeItem);
        });

        list.appendChild(card);
      });
    }

    function insertClozeTemplate(type) {
      let tpl = '';
      if (type === 'MULTICHOICE') tpl = '{1:MULTICHOICE:=Bonne réponse~Distracteur 1~Distracteur 2#Explication}';
      else if (type === 'SHORTANSWER') tpl = '{1:SHORTANSWER:=réponse exacte~=variante acceptée#Explication}';
      else if (type === 'NUMERICAL') tpl = '{1:NUMERICAL:=100:2#Explication}';

      if (quillInstance) {
        const range = quillInstance.getSelection(true) || { index: quillInstance.getLength() };
        quillInstance.insertText(range.index, ' ' + tpl + ' ');
        q.questionText = quillInstance.root.innerHTML;
        markDirty();
        renderClozeEditInspector(q);
      } else {
        const ta = document.getElementById('editQText') || document.getElementById('editQTextSource');
        if (ta) {
          ta.value += ' ' + tpl;
          ta.dispatchEvent(new Event('input'));
        }
      }
      showToast('Champ Cloze inséré dans l\'énoncé !');
    }

    

  
    function saveCurrentEditFields() {
      const q = window.quizData ? window.quizData[window.currentIndex] : null;
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
        q.name = typeof getCleanTitle === 'function' ? getCleanTitle(nameInp.value) : nameInp.value.trim();
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

    window.MoodleEditor = {
    renderEditMode: renderEditMode,
    saveCurrentEditFields: saveCurrentEditFields,
    initQuillEditor: initQuillEditor,
    renderTypeSpecificEditor: renderTypeSpecificEditor,
    parseClozeItems: parseClozeItems,
    buildClozeTag: buildClozeTag,
    renderClozeEditInspector: renderClozeEditInspector
  };

  // Alias globaux pour rétrocompatibilité
  window.renderEditMode = renderEditMode;
  window.saveCurrentEditFields = saveCurrentEditFields;
  window.initQuillEditor = initQuillEditor;
  window.renderTypeSpecificEditor = renderTypeSpecificEditor;
  window.parseClozeItems = parseClozeItems;
  window.buildClozeTag = buildClozeTag;
  window.renderClozeEditInspector = renderClozeEditInspector;

})();
