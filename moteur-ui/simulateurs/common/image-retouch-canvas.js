/**
 * ImageRetouchCanvas - Module de retouche d'illustration sur Canvas natif HTML5 (moteur-ui)
 * Outils : Pinceau, Trait droit, Pipette couleur, Tampon de clonage, Flou / Adoucissement.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  let currentOnSaveCallback = null;
  let currentOnCloseFocus = null;

  const STYLES_MODULE = [
    '#imageRetouchModal.modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;}',
    '#imageRetouchModal .modal-card{background:var(--bg-surface,#fff);border:1px solid var(--border-color,#cbd5e1);border-radius:var(--radius-sm,4px);box-shadow:0 20px 25px -5px rgba(0,0,0,.2);overflow:hidden;}',
    '#imageRetouchModal .modal-header{border-bottom:1px solid var(--border-color,#cbd5e1);display:flex;justify-content:space-between;align-items:flex-start;background:var(--bg-surface,#fff);}',
    '#imageRetouchModal .modal-title{font-weight:700;color:var(--text-main,#0f172a);}',
    '#imageRetouchModal .modal-close-btn{background:transparent;border:none;font-size:1.25rem;color:#475569;cursor:pointer;padding:.25rem .5rem;border-radius:var(--radius-sm,4px);line-height:1;}',
    '#imageRetouchModal .modal-close-btn:hover{background:var(--bg-surface-subtle,#f1f5f9);color:var(--text-main,#0f172a);}',
    '#imageRetouchModal .retouch-tool-btn{padding:.3rem .65rem;font-size:.75rem;font-weight:600;border:none;background:transparent;color:#475569;cursor:pointer;border-right:1px solid var(--border-color,#cbd5e1);}',
    '#imageRetouchModal .retouch-tool-btn:last-child{border-right:none;}',
    '#imageRetouchModal .retouch-tool-btn:hover{background:var(--bg-surface-subtle,#f1f5f9);color:var(--text-main,#0f172a);}',
    '#imageRetouchModal .retouch-tool-btn.active{background:#0f6cb5;color:#fff;}',
    '#imageRetouchModal #btnRetouchUndo:disabled,#imageRetouchModal #btnRetouchRedo:disabled{opacity:.45;cursor:not-allowed;}',
    '#imageRetouchModal button:focus-visible,#imageRetouchModal input:focus-visible{outline:3px solid var(--focus-ring,#2563eb);outline-offset:2px;}'
  ].join('\n');

  function ensureStyles() {
    if (document.getElementById('imageRetouchStyles')) return;
    const st = document.createElement('style');
    st.id = 'imageRetouchStyles';
    st.textContent = STYLES_MODULE;
    document.head.insertBefore(st, document.head.firstChild);
  }

  // Injection automatique du DOM de la boîte modale si absent
  function ensureModalDOM() {
    if (document.getElementById('imageRetouchModal')) return;
    const div = document.createElement('div');
    div.innerHTML = "<div id=\"imageRetouchModal\" class=\"modal-backdrop\" style=\"display: none;\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"retouchModalTitle\">\n    <div class=\"modal-card\" style=\"width: 96%; max-width: 1200px; height: 92vh; display: flex; flex-direction: column;\">\n      \n      <!-- En-t\u00eate de l'\u00e9diteur de retouche -->\n      <div class=\"modal-header\" style=\"padding: 0.75rem 1.25rem;\">\n        <div style=\"display: flex; align-items: center; gap: 0.6rem;\">\n          <h3 id=\"retouchModalTitle\" class=\"modal-title\" style=\"margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;\">\n            Retouche d'illustration & Masquage de texte\n          </h3>\n          <span style=\"font-size: 0.75rem; color: #64748b;\">Molette : agrandir ou r\u00e9duire. Espace + glisser ou bouton du milieu : d\u00e9placer.</span>\n        </div>\n        <button type=\"button\" class=\"modal-close-btn\" onclick=\"closeImageRetouchModal()\" title=\"Fermer\">\u2715</button>\n      </div>\n\n      <!-- Barre d'outils de retouche -->\n      <div class=\"retouch-toolbar\" style=\"display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 1.25rem; background: var(--bg-surface-subtle); border-bottom: 1px solid var(--border-color); flex-wrap: wrap;\">\n        \n        <!-- S\u00e9lection d'outils -->\n        <div style=\"display: inline-flex; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; background: #fff;\">\n          <button type=\"button\" class=\"retouch-tool-btn active\" id=\"toolBrush\" onclick=\"setRetouchTool('brush')\" title=\"Pinceau pour masquer ou peindre\">Pinceau</button>\n          <button type=\"button\" class=\"retouch-tool-btn\" id=\"toolLine\" onclick=\"setRetouchTool('line')\" title=\"Trait droit pour recouvrir des lignes\">Trait</button>\n          <button type=\"button\" class=\"retouch-tool-btn\" id=\"toolEyedropper\" onclick=\"setRetouchTool('eyedropper')\" title=\"Pipette : pr\u00e9lever la couleur exacte du fond\">Pipette</button>\n          <button type=\"button\" class=\"retouch-tool-btn\" id=\"toolClone\" onclick=\"setRetouchTool('clone')\" title=\"Tampon de duplication (Alt+Clic pour d\u00e9finir la source)\">Cloner</button>\n          <button type=\"button\" class=\"retouch-tool-btn\" id=\"toolBlur\" onclick=\"setRetouchTool('blur')\" title=\"Flou pour estomper les raccords\">Flou</button>\n        </div>\n\n        <div style=\"height: 20px; width: 1px; background: var(--border-color);\"></div>\n\n        <!-- Couleurs rapides & S\u00e9lecteur -->\n        <div style=\"display: flex; align-items: center; gap: 0.35rem;\">\n          <span style=\"font-size: 0.75rem; color: #64748b; font-weight: 600;\">Couleur :</span>\n          <button type=\"button\" onclick=\"setRetouchColor('#ffffff')\" style=\"width: 20px; height: 20px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 3px; cursor: pointer;\" title=\"Blanc pur\"></button>\n          <button type=\"button\" onclick=\"setRetouchColor('#f8fafc')\" style=\"width: 20px; height: 20px; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 3px; cursor: pointer;\" title=\"Gris tr\u00e8s clair\"></button>\n          <button type=\"button\" onclick=\"setRetouchColor('#000000')\" style=\"width: 20px; height: 20px; background: #000000; border: 1px solid #94a3b8; border-radius: 3px; cursor: pointer;\" title=\"Noir\"></button>\n          <input type=\"color\" id=\"retouchColorPicker\" value=\"#ffffff\" onchange=\"setRetouchColor(this.value)\" style=\"width: 24px; height: 24px; padding: 0; border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer;\">\n        </div>\n\n        <div style=\"height: 20px; width: 1px; background: var(--border-color);\"></div>\n\n        <!-- Taille du pinceau -->\n        <div style=\"display: flex; align-items: center; gap: 0.35rem;\">\n          <span style=\"font-size: 0.75rem; color: #64748b; font-weight: 600;\">\u00c9paisseur :</span>\n          <input type=\"range\" id=\"retouchBrushSize\" min=\"4\" max=\"80\" value=\"20\" oninput=\"updateRetouchSize(this.value)\" style=\"width: 90px; cursor: pointer;\">\n          <span id=\"retouchBrushSizeVal\" style=\"font-size: 0.75rem; font-family: monospace; font-weight: 700; width: 30px;\">20px</span>\n        </div>\n\n        <!-- Outil Cloner Source -->\n        <div id=\"retouchCloneSourceBox\" style=\"display: none; align-items: center; gap: 0.35rem;\">\n          <div style=\"height: 20px; width: 1px; background: var(--border-color);\"></div>\n          <button type=\"button\" id=\"btnSetCloneSource\" class=\"btn\" onclick=\"startSetCloneSource()\" style=\"font-size: 0.75rem; padding: 0.2rem 0.5rem; background: #eff6ff; border-color: #93c5fd; color: #1e40af;\">\n            Cibler la source (Alt+Clic)\n          </button>\n        </div>\n\n        <div style=\"flex: 1;\"></div>\n\n        <!-- Agrandissement -->\n        <div style=\"display: flex; align-items: center; gap: 0.35rem;\">\n          <span id=\"retouchZoomVal\" style=\"font-size: 0.75rem; font-weight: 700; font-variant-numeric: tabular-nums; min-width: 3.2rem; text-align: right;\">100 %</span>\n          <button type=\"button\" class=\"btn\" onclick=\"fitRetouchZoom()\" style=\"font-size: 0.75rem; padding: 0.25rem 0.5rem;\" title=\"Afficher l'image enti\u00e8re\">Ajuster</button>\n        </div>\n\n        <div style=\"height: 20px; width: 1px; background: var(--border-color);\"></div>\n\n        <!-- Annuler / R\u00e9tablir -->\n        <div style=\"display: flex; gap: 0.35rem;\">\n          <button type=\"button\" class=\"btn\" id=\"btnRetouchUndo\" onclick=\"undoRetouch()\" style=\"padding: 0.25rem 0.5rem;\" title=\"Annuler la derni\u00e8re retouche (Ctrl+Z)\" aria-label=\"Annuler la derni\u00e8re retouche\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"display: block;\"><path d=\"M5.5 2.5 2.5 5.5l3 3\"/><path d=\"M2.5 5.5h7a4 4 0 0 1 0 8H6\"/></svg></button>\n          <button type=\"button\" class=\"btn\" id=\"btnRetouchRedo\" onclick=\"redoRetouch()\" style=\"padding: 0.25rem 0.5rem;\" title=\"R\u00e9tablir la retouche (Ctrl+Y)\" aria-label=\"R\u00e9tablir la retouche\"><svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\" style=\"display: block; transform: scaleX(-1);\"><path d=\"M5.5 2.5 2.5 5.5l3 3\"/><path d=\"M2.5 5.5h7a4 4 0 0 1 0 8H6\"/></svg></button>\n        </div>\n      </div>\n\n      <!-- Zone de dessin Canvas (scrollable / centr\u00e9) -->\n      <div id=\"retouchCanvasContainer\" style=\"flex: 1; min-height: 0; overflow: hidden; background: #334155; position: relative;\">\n        <canvas id=\"retouchCanvas\" style=\"background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border-radius: 2px; cursor: crosshair; display: block; position: absolute; left: 0; top: 0; max-width: none; transform-origin: 0 0;\"></canvas>\n      </div>\n\n      <!-- Pied de l'\u00e9diteur de retouche -->\n      <div class=\"modal-footer\" style=\"padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-subtle);\">\n        <button type=\"button\" class=\"btn\" onclick=\"closeImageRetouchModal()\">Fermer sans enregistrer</button>\n        <button type=\"button\" class=\"btn btn-primary\" onclick=\"saveRetouchedImage()\">\n          Enregistrer les retouches sur le sch\u00e9ma\n        </button>\n      </div>\n\n    </div>\n  </div>\n\n  <!-- TOAST NOTIFICATION -->\n  <div id=\"saveToast\">Modifications enregistr\u00e9es sur le disque !</div>\n\n  <!-- CONFIGURATION MATHJAX LOCAL -->";
    document.body.appendChild(div.firstElementChild);
  }

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
    let rZoom = 1;
    let rOffsetX = 0;
    let rOffsetY = 0;
    let rIsPanning = false;
    let rSpaceDown = false;

    const RETOUCH_ZOOM_MAX = 8;
    const RETOUCH_FIT_MARGIN = 24;
    const RETOUCH_MIN_VISIBLE = 50;

    function renderRetouchView() {
      const container = document.getElementById('retouchCanvasContainer');
      // Garder une portion de l'image à l'écran pour ne jamais la perdre en la déplaçant
      rOffsetX = Math.min(Math.max(rOffsetX, RETOUCH_MIN_VISIBLE - rCanvas.width * rZoom), container.clientWidth - RETOUCH_MIN_VISIBLE);
      rOffsetY = Math.min(Math.max(rOffsetY, RETOUCH_MIN_VISIBLE - rCanvas.height * rZoom), container.clientHeight - RETOUCH_MIN_VISIBLE);
      rCanvas.style.transform = `translate(${rOffsetX}px, ${rOffsetY}px) scale(${rZoom})`;
      rCanvas.style.imageRendering = rZoom >= 2 ? 'pixelated' : 'auto';
      const valEl = document.getElementById('retouchZoomVal');
      if (valEl) valEl.textContent = Math.round(rZoom * 100) + '\u00a0%';
    }

    function retouchFitZoom() {
      const container = document.getElementById('retouchCanvasContainer');
      return Math.min(1,
        (container.clientWidth - RETOUCH_FIT_MARGIN * 2) / rCanvas.width,
        (container.clientHeight - RETOUCH_FIT_MARGIN * 2) / rCanvas.height);
    }

    function fitRetouchZoom() {
      if (!rCanvas) return;
      const container = document.getElementById('retouchCanvasContainer');
      rZoom = retouchFitZoom();
      rOffsetX = (container.clientWidth - rCanvas.width * rZoom) / 2;
      rOffsetY = (container.clientHeight - rCanvas.height * rZoom) / 2;
      renderRetouchView();
    }

    function zoomRetouchAt(clientX, clientY, deltaPixels) {
      const minZoom = retouchFitZoom();
      const nextZoom = Math.min(RETOUCH_ZOOM_MAX, Math.max(minZoom, rZoom * Math.exp(-deltaPixels * 0.0015)));
      if (nextZoom === rZoom) return;
      if (nextZoom === minZoom) {
        fitRetouchZoom();
        return;
      }
      // Le point de l'image situé sous la flèche reste sous la flèche
      const rect = document.getElementById('retouchCanvasContainer').getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      rOffsetX = x - (x - rOffsetX) * nextZoom / rZoom;
      rOffsetY = y - (y - rOffsetY) * nextZoom / rZoom;
      rZoom = nextZoom;
      renderRetouchView();
    }

    function setupRetouchViewEvents() {
      const container = document.getElementById('retouchCanvasContainer');
      if (container._retouchViewWired) return;
      container._retouchViewWired = true;

      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomRetouchAt(e.clientX, e.clientY, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY);
      }, { passive: false });

      container.addEventListener('mousedown', (e) => {
        if (e.button !== 1 && !(e.button === 0 && rSpaceDown)) return;
        e.preventDefault();
        rIsPanning = true;
        let lastX = e.clientX;
        let lastY = e.clientY;
        container.style.cursor = rCanvas.style.cursor = 'grabbing';

        function onMove(ev) {
          rOffsetX += ev.clientX - lastX;
          rOffsetY += ev.clientY - lastY;
          lastX = ev.clientX;
          lastY = ev.clientY;
          renderRetouchView();
        }
        function onUp() {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          rIsPanning = false;
          container.style.cursor = '';
          rCanvas.style.cursor = rSpaceDown ? 'grab' : 'crosshair';
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      const isOpen = () => {
        const modal = document.getElementById('imageRetouchModal');
        return modal && modal.style.display !== 'none';
      };
      window.addEventListener('keydown', (e) => {
        if (!isOpen()) return;
        if (e.key === 'Escape') { e.preventDefault(); closeImageRetouchModal(); return; }
        const key = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redoRetouch(); else undoRetouch();
        } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
          e.preventDefault();
          redoRetouch();
        } else if (e.code === 'Space') {
          e.preventDefault();
          rSpaceDown = true;
          if (!rIsPanning) rCanvas.style.cursor = 'grab';
        }
      });
      window.addEventListener('keyup', (e) => {
        if (e.code !== 'Space' || !rSpaceDown) return;
        e.preventDefault();
        rSpaceDown = false;
        if (!rIsPanning && rCanvas) rCanvas.style.cursor = 'crosshair';
      });
      window.addEventListener('resize', () => {
        if (isOpen() && rCanvas) fitRetouchZoom();
      });
    }

    function initRetouchCanvases(src) {
      rCanvas = document.getElementById('retouchCanvas');
      if (!rCanvas) return;
      rCtx = rCanvas.getContext('2d');
      rCloneSource = null;
      rIsSettingCloneSource = false;

      const startHistory = () => {
        fitRetouchZoom();
        rHistory = [rCtx.getImageData(0, 0, rCanvas.width, rCanvas.height)];
        rHistoryStep = 0;
        updateRetouchUndoRedo();
      };

      if (!src) {
        rCanvas.width = 600;
        rCanvas.height = 400;
        rCtx.fillStyle = '#ffffff';
        rCtx.fillRect(0, 0, rCanvas.width, rCanvas.height);
        startHistory();
      } else {
        const img = new Image();
        img.onload = () => {
          rCanvas.width = img.naturalWidth || img.width || 600;
          rCanvas.height = img.naturalHeight || img.height || 400;
          rCtx.drawImage(img, 0, 0);
          startHistory();
        };
        img.src = src;
      }

      setupRetouchCanvasEvents();
      setupRetouchViewEvents();
    }

    function closeImageRetouchModal() {
      const modal = document.getElementById('imageRetouchModal');
      if (modal) modal.style.display = 'none';
      if (currentOnCloseFocus && typeof currentOnCloseFocus.focus === 'function') {
        try { currentOnCloseFocus.focus(); } catch (e) { /* élément retiré de la page */ }
      }
      currentOnCloseFocus = null;
    }

    function setRetouchTool(tool) {
      rTool = tool;
      document.querySelectorAll('.retouch-tool-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1));
      if (activeBtn) activeBtn.classList.add('active');

      const cloneBox = document.getElementById('retouchCloneSourceBox');
      if (cloneBox) cloneBox.style.display = (tool === 'clone') ? 'flex' : 'none';
      if (rCanvas) rCanvas.style.cursor = 'crosshair';
    }

    function setRetouchColor(col) {
      rColor = col;
      const picker = document.getElementById('retouchColorPicker');
      if (picker) picker.value = col;
    }

    function updateRetouchSize(sz) {
      rBrushSize = parseInt(sz) || 20;
      const valEl = document.getElementById('retouchBrushSizeVal');
      if (valEl) valEl.textContent = rBrushSize + 'px';
    }

    function startSetCloneSource() {
      rIsSettingCloneSource = true;
      showToast('Cliquez sur le canvas pour définir la zone source à cloner');
    }

    function saveRetouchState() {
      if (!rCanvas || !rCtx) return;
      const currentData = rCtx.getImageData(0, 0, rCanvas.width, rCanvas.height);
      rHistory = rHistory.slice(0, rHistoryStep + 1);
      rHistory.push(currentData);
      rHistoryStep = rHistory.length - 1;
      updateRetouchUndoRedo();
    }

    function updateRetouchUndoRedo() {
      const btnUndo = document.getElementById('btnRetouchUndo');
      const btnRedo = document.getElementById('btnRetouchRedo');
      if (btnUndo) btnUndo.disabled = (rHistoryStep <= 0);
      if (btnRedo) btnRedo.disabled = (rHistoryStep >= rHistory.length - 1);
    }

    function undoRetouch() {
      if (rHistoryStep > 0) {
        rHistoryStep--;
        rCtx.putImageData(rHistory[rHistoryStep], 0, 0);
        updateRetouchUndoRedo();
      }
    }

    function redoRetouch() {
      if (rHistoryStep < rHistory.length - 1) {
        rHistoryStep++;
        rCtx.putImageData(rHistory[rHistoryStep], 0, 0);
        updateRetouchUndoRedo();
      }
    }

    function setupRetouchCanvasEvents() {
      if (rCanvas._retouchWired) return;
      rCanvas._retouchWired = true;

      function getPos(e) {
        const rect = rCanvas.getBoundingClientRect();
        const scaleX = rCanvas.width / rect.width;
        const scaleY = rCanvas.height / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      }

      rCanvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || rSpaceDown) return;
        const pos = getPos(e);

        if (rTool === 'eyedropper') {
          const pixel = rCtx.getImageData(pos.x, pos.y, 1, 1).data;
          const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(x => x.toString(16).padStart(2, '0')).join('');
          setRetouchColor(hex);
          setRetouchTool('brush');
          showToast(`Couleur prélevée : ${hex}`);
          return;
        }

        if (rTool === 'clone' && (rIsSettingCloneSource || e.altKey)) {
          rCloneSource = { x: pos.x, y: pos.y };
          rIsSettingCloneSource = false;
          showToast('Source de clonage définie !');
          return;
        }

        rIsDrawing = true;
        rLastPos = pos;

        if (rTool === 'clone') {
          if (!rCloneSource) {
            rIsDrawing = false;
            alert('Veuillez d\'abord définir la source avec le bouton "Cibler la source" ou avec Alt+Clic.');
            return;
          }
          rCloneOffset = { dx: pos.x - rCloneSource.x, dy: pos.y - rCloneSource.y };
        }

        if (!rSnapshotCanvas) rSnapshotCanvas = document.createElement('canvas');
        rSnapshotCanvas.width = rCanvas.width;
        rSnapshotCanvas.height = rCanvas.height;
        rSnapshotCanvas.getContext('2d').drawImage(rCanvas, 0, 0);

        if (rTool === 'brush' || rTool === 'line') {
          rCtx.beginPath();
          rCtx.moveTo(pos.x, pos.y);
          rCtx.lineCap = 'round';
          rCtx.lineJoin = 'round';
          rCtx.strokeStyle = rColor;
          rCtx.lineWidth = rBrushSize;
          rCtx.lineTo(pos.x, pos.y);
          rCtx.stroke();
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!rIsDrawing || !rCanvas) return;
        const pos = getPos(e);

        if (rTool === 'brush') {
          rCtx.lineTo(pos.x, pos.y);
          rCtx.stroke();
          rLastPos = pos;
        } else if (rTool === 'line') {
          rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
          rCtx.drawImage(rSnapshotCanvas, 0, 0);
          rCtx.beginPath();
          rCtx.moveTo(rLastPos.x, rLastPos.y);
          rCtx.lineCap = 'round';
          rCtx.lineJoin = 'round';
          rCtx.strokeStyle = rColor;
          rCtx.lineWidth = rBrushSize;
          rCtx.lineTo(pos.x, pos.y);
          rCtx.stroke();
        } else if (rTool === 'clone' && rCloneOffset) {
          rCtx.save();
          rCtx.beginPath();
          rCtx.arc(pos.x, pos.y, rBrushSize / 2, 0, Math.PI * 2);
          rCtx.clip();
          rCtx.drawImage(rSnapshotCanvas, rCloneOffset.dx, rCloneOffset.dy);
          rCtx.restore();
          rLastPos = pos;
        } else if (rTool === 'blur') {
          rCtx.save();
          rCtx.filter = 'blur(4px)';
          rCtx.beginPath();
          rCtx.arc(pos.x, pos.y, rBrushSize / 2, 0, Math.PI * 2);
          rCtx.clip();
          rCtx.drawImage(rSnapshotCanvas, 0, 0);
          rCtx.restore();
          rLastPos = pos;
        }
      });

      window.addEventListener('mouseup', () => {
        if (rIsDrawing) {
          rIsDrawing = false;
          if (rTool === 'brush') rCtx.closePath();
          saveRetouchState();
        }
      });
    }

    function saveRetouchedImage() {
      if (!rCanvas) return;
      const dataUrl = rCanvas.toDataURL('image/png');
      if (currentOnSaveCallback) {
        currentOnSaveCallback(dataUrl);
      } else {
        const q = window.quizData[window.currentIndex];
        q.bgImage = dataUrl;
        window.markDirty();
        const editBox = document.getElementById('editDdBoard') && document.getElementById('typeSpecificEditBox');
        if (editBox) {
          window.renderDDImageEditor(q, editBox);
        } else {
          window.loadQuestion(window.currentIndex);
        }
      }
      const avecRappel = !currentOnSaveCallback;
      closeImageRetouchModal();
      if (avecRappel && typeof window.showToast === 'function') {
        window.showToast('Illustration retouchée. Enregistrez pour conserver le changement.');
      }
    }

  // Wrapper pour l'API publique
  window.ImageRetouchCanvas = {
    /**
     * @param {{imageSrc?: string, onSave?: function(string), titre?: string, libelleEnregistrer?: string}} options
     *   onSave reçoit l'image retouchée (data:image/png). Sans onSave, le module agit sur la question
     *   du simulateur Moodle (comportement d'origine).
     */
    open: function(options) {
      ensureStyles();
      ensureModalDOM();
      options = options || {};
      currentOnSaveCallback = (typeof options.onSave === 'function') ? options.onSave : null;
      currentOnCloseFocus = document.activeElement;
      const titre = document.getElementById('retouchModalTitle');
      if (titre) titre.textContent = options.titre || 'Retouche d\'illustration & Masquage de texte';
      const btnSave = document.querySelector('#imageRetouchModal .modal-footer .btn-primary');
      if (btnSave) btnSave.textContent = options.libelleEnregistrer || 'Enregistrer les retouches sur le schéma';
      const imgSrc = options.imageSrc || (window.quizData && window.quizData[window.currentIndex] ? window.quizData[window.currentIndex].bgImage : '');
      openRetouchWithImage(imgSrc);
    },
    close: function() {
      closeImageRetouchModal();
    }
  };

  window.openImageRetouchModal = function(imgSrc, onSave) {
    window.ImageRetouchCanvas.open({ imageSrc: imgSrc, onSave: onSave });
  };

  // Les boutons de la boîte modale appellent ces fonctions par leur nom global
  window.applyRetouchChanges = saveRetouchedImage;
  window.saveRetouchedImage = saveRetouchedImage;
  window.closeImageRetouchModal = closeImageRetouchModal;
  window.setRetouchTool = setRetouchTool;
  window.setRetouchColor = setRetouchColor;
  window.updateRetouchSize = updateRetouchSize;
  window.startSetCloneSource = startSetCloneSource;
  window.undoRetouch = undoRetouch;
  window.redoRetouch = redoRetouch;
  window.fitRetouchZoom = fitRetouchZoom;

  function openRetouchWithImage(src) {
    const modal = document.getElementById('imageRetouchModal');
    if (!modal) return;
    modal.style.display = 'flex';
    initRetouchCanvases(src);
    setRetouchTool('brush');
    const premier = document.getElementById('toolBrush');
    if (premier) premier.focus();
  }

})();
