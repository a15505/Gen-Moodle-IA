/**
 * MoodleDDImage - Moteur de glisser-déposer sur image pour Moodle XML (ddimageortext)
 * Gère le positionnement interactif des zones cibles, le contrôle de hauteur,
 * la gestion des étiquettes (<= 2 mots), et la génération assistée d'illustration.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  window.quizData = window.quizData || [];
  window.currentIndex = window.currentIndex || 0;
  var quizData = window.quizData;
  var currentIndex = window.currentIndex;

  // Taille maximale de l'image envoyée à Moodle : au-delà, la question déborde
  // de la page du test. Toute image ajoutée est réduite pour tenir dans 600 × 600 px.
  const DD_TAILLE_MAX = 600;
  const DD_IMAGE_WIDTH = 600;
  const DD_IMAGE_HEIGHT = 400;
  const IMAGE_POLL_MS = 3000;
  let imagePollTimer = null;
  let imageEditorContainer = null;
  let ddImagePrompt = '';

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



  // Image de départ de chaque question : gardée en mémoire seulement, jamais écrite dans le XML
  const imageOrigins = new WeakMap();
  let resizeRequest = 0;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Une image remplacée ou retouchée devient la nouvelle image de départ
  async function getImageOrigin(q) {
    let origin = imageOrigins.get(q);
    if (!origin || origin.current !== q.bgImage) {
      const img = await loadImage(q.bgImage);
      origin = { src: q.bgImage, current: q.bgImage, img: img, width: img.naturalWidth, height: img.naturalHeight, drops: null };
      imageOrigins.set(q, origin);
    }
    return origin;
  }

  async function setDdMaxHeight(heightVal) {
      const idx = (typeof window.currentIndex === "number") ? window.currentIndex : 0; const q = window.quizData ? window.quizData[idx] : null;
      if (!q || !q.bgImage) return;
      const request = ++resizeRequest;
      let origin;
      try {
        origin = await getImageOrigin(q);
      } catch (err) {
        showToast("L'image est illisible : sa taille ne peut pas être modifiée.");
        return;
      }
      if (request !== resizeRequest) return;

      const before = await loadImage(q.bgImage);
      if (request !== resizeRequest) return;
      const targetHeight = (heightVal > 0 && heightVal < origin.height) ? heightVal : origin.height;
      const targetWidth = Math.round(origin.width * targetHeight / origin.height);

      if (targetHeight === origin.height) {
        q.bgImage = origin.src;
        q.maxHeight = 0;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const isJpeg = origin.src.startsWith('data:image/jpeg');
        if (isJpeg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
        ctx.drawImage(origin.img, 0, 0, targetWidth, targetHeight);
        q.bgImage = isJpeg ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png');
        q.maxHeight = heightVal;
      }
      origin.current = q.bgImage;

      // Les coordonnées Moodle sont en pixels de l'image : les zones suivent sa taille réelle
      (q.drops || []).forEach((drop) => {
        drop.xleft = Math.round(drop.xleft * targetWidth / before.naturalWidth);
        drop.ytop = Math.round(drop.ytop * targetHeight / before.naturalHeight);
      });

      markDirty();
      if (imageEditorContainer) renderDDImageEditor(q, imageEditorContainer);
      showToast(`Taille réelle de l'image : ${targetWidth} × ${targetHeight} pixels. Enregistrez pour conserver le changement.`);
    }

    async function refreshImageSizeControls(q) {
      let origin;
      try {
        origin = await getImageOrigin(q);
      } catch (err) {
        return;
      }
      const label = document.getElementById('ddImageRealSize');
      const img = await loadImage(q.bgImage).catch(() => null);
      if (!label || !img) return;
      label.textContent = `Taille réelle : ${img.naturalWidth} × ${img.naturalHeight} px`;
      majEchelleAffichee();
      const reduced = img.naturalHeight < origin.height;
      document.querySelectorAll('.height-preset-btn').forEach((btn) => {
        const preset = parseInt(btn.dataset.height, 10);
        btn.disabled = preset > 0 && preset >= origin.height;
        btn.title = btn.disabled ? `L'image d'origine fait ${origin.height} px de haut : elle ne sera pas agrandie.` : '';
        btn.classList.toggle('active', reduced ? preset === img.naturalHeight : preset === 0);
      });
    }

        // =========================================================================
    // 7. ÉDITEUR GLISSER-DÉPOSER COMPLET (ddimage / ddimageortext)
    // =========================================================================
    function renderDDImageEditor(q, container) {
      const cleanTag = q.tag || 'échanges';
      const cleanTitle = getCleanTitle(q.name);
      const dragSummary = (q.drags || []).map(d => d.text).join(', ');

      const dropCount = (q.drops || []).length;
      ddImagePrompt = `Agis en tant qu'illustrateur didactique et scientifique pour une question de sciences au secondaire (Québec).

SUJET DE L'ILLUSTRATION :
"${cleanTitle}" (concept : #${cleanTag}).

STRUCTURES À FAIRE IDENTIFIER PAR GLISSER-DÉPOSER :
${dragSummary}

CRITÈRES GRAPHIQUES ET PÉDAGOGIQUES :
- Image matricielle PNG ou JPEG (jamais de SVG), ${DD_IMAGE_WIDTH} × ${DD_IMAGE_HEIGHT} pixels, fond blanc pur (#ffffff).
- Illustration claire et rigoureuse de manuel scolaire québécois.
- RÈGLE ABSOLUE MOODLE : NE PLACE AUCUN TEXTE, MOT, CHIFFRE OU LÉGENDE DANS L'IMAGE.
- ${dropCount} zones d'ancrage rectangulaires vides reliées par des lignes de repère discrètes.`;

      container.innerHTML = `
        <div class="edit-box">
          <div class="edit-box-title">
            <span>Éditeur du glisser-déposer sur image</span>
            <span class="edit-box-hint">${q.bgImage ? 'Déplacez les zones directement sur le schéma ou ajustez leurs coordonnées.' : 'Ajoutez d\'abord l\'image, puis placez les zones sur le schéma.'}</span>
          </div>

          <!-- 1. GÉNÉRATION, GESTION DE L'IMAGE ET HAUTEUR -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.85rem; padding: 0.6rem 0.85rem; background: var(--bg-surface-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
            
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="form-label" style="margin: 0; font-size: 0.8rem; font-weight: 700;">Illustration :</span>
              <button type="button" class="btn btn-primary" onclick="generateNewDdImageAction()" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;" title="Demander à l'agent une nouvelle illustration à proposer">
                Générer une nouvelle image avec IAG
              </button>
              <button type="button" class="btn" id="btnDdPasteImage" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" title="Coller une image copiée (Ctrl+V fonctionne aussi)">
                Coller l'image
              </button>
              <label class="btn" style="font-size: 0.75rem; padding: 0.25rem 0.6rem; cursor: pointer;" title="Choisir un fichier image sur l'ordinateur">
                Parcourir...
                <input type="file" id="ddBgFileInputDirect" accept="image/png,image/jpeg" style="display: none;">
              </label>
              <button type="button" class="btn" onclick="openImageRetouchModal()" style="${q.bgImage ? '' : 'display: none; '}font-size: 0.75rem; padding: 0.25rem 0.6rem; background: #eff6ff; border-color: #93c5fd; color: #1e40af; font-weight: 700;" title="Effacer du texte incrusté ou retoucher l'image avec le pinceau / tampon de clonage">
                Retoucher l'illustration
              </button>
              <button type="button" class="btn" onclick="copyDdPromptTemplate()" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;" title="Copier le prompt pour l'utiliser dans un autre outil de génération d'images">
                Copier le prompt
              </button>
            </div>

            <!-- Contrôle de hauteur hardcodée -->
            <div style="display: ${q.bgImage ? 'flex' : 'none'}; flex-wrap: wrap; align-items: center; gap: 0.4rem;">
              <span id="ddImageRealSize" style="font-size: 0.75rem; color: #475569; font-variant-numeric: tabular-nums;"></span>
              <span class="form-label" style="margin: 0; font-size: 0.75rem; color: #64748b;">Hauteur max :</span>
              <div class="dd-height-group" style="display: inline-flex; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; background: #fff;">
                ${[300, 400, 450, 500].map(h => `<button type="button" class="height-preset-btn" data-height="${h}" onclick="setDdMaxHeight(${h})">${h}px</button>`).join('')}
                <button type="button" class="height-preset-btn" data-height="0" onclick="setDdMaxHeight(0)">Taille d'origine</button>
              </div>
            </div>
          </div>

          <div id="ddImageAlerteTaille"></div>
          <div id="ddImageProposal" aria-live="polite"></div>

          <!-- 2. PLATEAU DE POSITIONNEMENT INTERACTIF SUR LE SCHÉMA -->
          ${q.bgImage ? `
          <div style="text-align: center; margin: 1rem 0; overflow-x: auto;">
            <div id="editDdBoard" style="position: relative; display: inline-block; max-width: 100%; border: 1px solid #94a3b8; border-radius: 4px; background: #f8fafc; cursor: crosshair; user-select: none;">
              <img id="editDdImg" src="${q.bgImage}" style="display: block; max-width: 100%; height: auto;" alt="Schéma">
              <div id="editDdZonesOverlay"></div>
            </div>
          </div>` : `
          <div class="dd-image-vide" id="ddImageDropTarget" tabindex="0" role="button" aria-label="Ajouter l'image : collez-la avec Ctrl+V, glissez un fichier ou cliquez pour choisir un fichier">
            <strong>Aucune image pour l'instant</strong>
            <span>Copiez l'image (clic droit sur l'image, puis « Copier l'image »), puis cliquez ici et appuyez sur Ctrl+V.</span>
            <span>Vous pouvez aussi glisser un fichier PNG ou JPEG ici, ou cliquer pour le choisir.</span>
          </div>`}

          <!-- 4. ÉLÉMENTS À GLISSER (DRAGS - 1 ou 2 mots max) -->
          <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <div>
                <span class="form-label" style="margin: 0; font-weight: 700;">Éléments à glisser (drags)</span>
                <span style="font-size: 0.72rem; color: #64748b; margin-left: 0.5rem;">(1 ou 2 mots maximum par élément)</span>
              </div>
              <button type="button" class="btn" id="btnAddDragItem" style="font-size: 0.75rem;">+ Ajouter un élément</button>
            </div>
            <div id="ddDragsList"></div>
          </div>

          <!-- 5. REPÈRES ET ZONES DE DÉPÔT SUR L'IMAGE (DROPS) -->
          <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <div>
                <span class="form-label" style="margin: 0; font-weight: 700;">Zones de dépôt (repères sur le schéma)</span>
                <span style="font-size: 0.72rem; color: #64748b; margin-left: 0.5rem;">(Glissez-les à la souris sur l'image ou saisissez X / Y)</span>
              </div>
              <button type="button" class="btn" id="btnAddDropZone" style="font-size: 0.75rem;">+ Ajouter une zone</button>
            </div>
            <div id="ddDropsTable"></div>
          </div>

        </div>
      `;

      // Brancher le sélecteur direct d'image, le collage et le dépôt de fichier
      const fileInputDirect = document.getElementById('ddBgFileInputDirect');
      if (fileInputDirect) {
        fileInputDirect.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) appliquerFichierImage(q, e.target.files[0]);
          e.target.value = '';
        });
      }
      document.getElementById('btnDdPasteImage').addEventListener('click', () => collerImageDepuisPressePapiers(q));
      const cible = document.getElementById('ddImageDropTarget');
      if (cible) {
        cible.addEventListener('click', () => fileInputDirect && fileInputDirect.click());
        cible.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputDirect && fileInputDirect.click(); }
        });
        cible.addEventListener('dragover', (e) => { e.preventDefault(); cible.classList.add('est-survolee'); });
        cible.addEventListener('dragleave', () => cible.classList.remove('est-survolee'));
        cible.addEventListener('drop', (e) => {
          e.preventDefault();
          cible.classList.remove('est-survolee');
          const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) appliquerFichierImage(q, f);
        });
      }

      imageEditorContainer = container;
      syncImageRequest(q);
      refreshImageSizeControls(q);
      limiterTailleExistante(q);

      renderInteractiveZones(q);
      renderDragsList(q);
      renderDropsTable(q);

      document.getElementById('btnAddDropZone').addEventListener('click', () => {
        if (!q.drops) q.drops = [];
        const nextNo = q.drops.length + 1;
        q.drops.push({ no: nextNo, choice: 1, xleft: 60, ytop: 60 });
        markDirty();
        renderInteractiveZones(q);
        renderDropsTable(q);
      });

      document.getElementById('btnAddDragItem').addEventListener('click', () => {
        if (!q.drags) q.drags = [];
        const nextNo = q.drags.length + 1;
        q.drags.push({ no: nextNo, text: `Repère ${nextNo}`, group: 1, infinite: false });
        markDirty();
        renderDragsList(q);
        renderDropsTable(q);
      });
    }

    
    function imageQuestionKey(q) {
      return q.id || q.name;
    }

    async function imageApi(action, body) {
      const dossier = decodeURIComponent(window.location.pathname).replace(/[^/]*$/, '');
      const resp = await fetch('/api/image/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ dossier: dossier }, body))
      });
      if (!resp.ok) throw new Error('Réponse ' + resp.status);
      return resp.json();
    }

    function renderImageRequest(q, state) {
      const panel = document.getElementById('ddImageProposal');
      if (!panel) return;
      panel.innerHTML = '';
      panel.style.cssText = '';
      if (!state.demande || state.demande.question_id !== imageQuestionKey(q)) return;

      if (!state.proposition) {
        panel.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.85rem;';
        panel.innerHTML = `
          <p style="margin: 0; font-size: 0.8125rem; color: var(--text-main);">
            En attente de l'agent. Écrivez-lui dans le chat : <strong>Traite la demande d'image</strong>
          </p>
          <button type="button" class="btn" id="ddImageCancel" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">Annuler</button>
        `;
        document.getElementById('ddImageCancel').addEventListener('click', () => closeImageRequest(q));
        return;
      }

      panel.style.cssText = 'margin-bottom: 0.85rem; padding: 0.75rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm);';
      panel.innerHTML = `
        <p style="margin: 0 0 0.5rem; font-size: 0.8125rem; font-weight: 700; color: var(--text-main);">L'agent propose une nouvelle image</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.75rem; margin-bottom: 0.75rem;">
          <figure style="margin: 0;">
            <figcaption style="font-size: 0.75rem; color: #475569; margin-bottom: 0.25rem;">Image actuelle</figcaption>
            <img src="${q.bgImage || ''}" alt="Image actuelle" style="display: block; width: 100%; height: auto; border: 1px solid var(--border-color);">
          </figure>
          <figure style="margin: 0;">
            <figcaption style="font-size: 0.75rem; color: #475569; margin-bottom: 0.25rem;">Image proposée</figcaption>
            <img src="${state.proposition}" alt="Image proposée" style="display: block; width: 100%; height: auto; border: 1px solid var(--border-color);">
          </figure>
        </div>
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="ddImageAccept" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">Remplacer l'image</button>
          <button type="button" class="btn" id="ddImageReject" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">Conserver l'image actuelle</button>
        </div>
      `;
      document.getElementById('ddImageAccept').addEventListener('click', () => acceptImageProposal(q, state.proposition));
      document.getElementById('ddImageReject').addEventListener('click', () => closeImageRequest(q));
    }

    async function syncImageRequest(q) {
      clearTimeout(imagePollTimer);
      // Page hôte sans le service d'images de l'agent (ex. : application web)
      if (window.MOODLE_DD_SANS_AGENT) return;
      let state;
      try {
        state = await imageApi('etat');
      } catch (err) {
        return; // Hors du serveur local (file:///) : « Copier le prompt » et « Parcourir » restent disponibles
      }
      const panel = document.getElementById('ddImageProposal');
      const key = imageQuestionKey(q);
      const shownQuestion = window.quizData ? window.quizData[window.currentIndex] : null;
      if (!panel || !shownQuestion || imageQuestionKey(shownQuestion) !== key) return;
      renderImageRequest(q, state);
      if (state.demande && state.demande.question_id === key && !state.proposition) {
        imagePollTimer = setTimeout(() => syncImageRequest(q), IMAGE_POLL_MS);
      }
    }

    async function closeImageRequest(q) {
      clearTimeout(imagePollTimer);
      try {
        await imageApi('retirer');
      } catch (err) {
        console.warn('Retrait de la demande impossible', err);
      }
      renderImageRequest(q, { demande: null, proposition: null });
    }

    function loadImageSize(src) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = src || '';
      });
    }

    async function acceptImageProposal(q, dataUrlBrute) {
      const dataUrl = (await reduireAuMax(dataUrlBrute)).url;
      const before = await loadImageSize(q.bgImage);
      const after = await loadImageSize(dataUrl);
      if (!after) {
        showToast("L'image proposée est illisible. Demandez-en une nouvelle à l'agent.");
        return;
      }
      // Les coordonnées Moodle sont en pixels de l'image : les zones suivent ses nouvelles dimensions
      if (before && before.width && before.height) {
        (q.drops || []).forEach((drop) => {
          drop.xleft = Math.round(drop.xleft * after.width / before.width);
          drop.ytop = Math.round(drop.ytop * after.height / before.height);
        });
      }
      q.bgImage = dataUrl;
      markDirty();
      await closeImageRequest(q);
      if (imageEditorContainer) renderDDImageEditor(q, imageEditorContainer);
      showToast('Image remplacée. Ajustez les zones au besoin, puis enregistrez.');
    }

    async function generateNewDdImageAction() {
      const idx = (typeof window.currentIndex === "number") ? window.currentIndex : 0; const q = window.quizData ? window.quizData[idx] : null;
      if (!q) return;
      try {
        const size = await loadImageSize(q.bgImage);
        const state = await imageApi('demander', {
          question_id: imageQuestionKey(q),
          question: getCleanTitle(q.name),
          prompt: ddImagePrompt,
          largeur: size ? size.width : DD_IMAGE_WIDTH,
          hauteur: size ? size.height : DD_IMAGE_HEIGHT
        });
        renderImageRequest(q, state);
        imagePollTimer = setTimeout(() => syncImageRequest(q), IMAGE_POLL_MS);
      } catch (err) {
        console.warn('Dépôt de la demande impossible', err);
        showToast('Le serveur local est requis. Utilisez plutôt « Copier le prompt ».');
      }
    }

    function copyDdPromptTemplate() {
      const done = () => showToast('Prompt copié.');
      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = ddImagePrompt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const copied = document.execCommand('copy');
        ta.remove();
        if (copied) done(); else showToast('Copie du prompt impossible dans ce navigateur.');
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(ddImagePrompt).then(done).catch(fallback);
      } else {
        fallback();
      }
    }


    function renderInteractiveZones(q) {
      const overlay = document.getElementById('editDdZonesOverlay');
      if (!overlay) return;
      overlay.innerHTML = '';

      (q.drops || []).forEach((drop, idx) => {
        const assignedDrag = (q.drags || []).find(d => d.no === drop.choice);
        const zone = document.createElement('div');
        zone.className = 'edit-drop-zone';
        // L'image est réduite à l'écran pour tenir dans la largeur ; les coordonnées
        // enregistrées restent en pixels de l'image réelle, comme Moodle les attend.
        const echelle = echelleEditeur();
        zone.style.left = Math.round((drop.xleft || 20) * echelle) + 'px';
        zone.style.top = Math.round((drop.ytop || 20) * echelle) + 'px';
        zone.innerHTML = `
          <div>Zone ${idx + 1}</div>
          <div style="font-size:0.65rem; color:#1e40af; font-weight:normal; max-width:140px; overflow:hidden; text-overflow:ellipsis;">
            ${escapeHtml(assignedDrag?.text || 'Choix ' + drop.choice)}
          </div>
        `;

        // Événement Drag interactif
        zone.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const board = document.getElementById('editDdBoard');
          if (!board) return;
          const startX = e.clientX - zone.offsetLeft;
          const startY = e.clientY - zone.offsetTop;

          function onMouseMove(ev) {
            let newX = ev.clientX - startX;
            let newY = ev.clientY - startY;
            newX = Math.max(0, Math.min(newX, board.offsetWidth - zone.offsetWidth));
            newY = Math.max(0, Math.min(newY, board.offsetHeight - zone.offsetHeight));

            zone.style.left = newX + 'px';
            zone.style.top = newY + 'px';
            const s = echelleEditeur();
            drop.xleft = Math.round(newX / s);
            drop.ytop = Math.round(newY / s);
            updateDropInputs(idx, drop.xleft, drop.ytop);
          }

          function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            markDirty();
          }

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        overlay.appendChild(zone);
      });
    }

    /** Rapport entre la largeur affichée de l'image et sa largeur réelle (1 si elle tient en entier). */
    function echelleEditeur() {
      const img = document.getElementById('editDdImg');
      if (!img || !img.naturalWidth || !img.clientWidth) return 1;
      return Math.min(1, img.clientWidth / img.naturalWidth);
    }

    /** Taille réelle et taux d'affichage, sous les boutons de l'illustration. */
    function majEchelleAffichee() {
      const label = document.getElementById('ddImageRealSize');
      const img = document.getElementById('editDdImg');
      if (!label || !img || !img.naturalWidth) return;
      const pct = Math.round(echelleEditeur() * 100);
      label.textContent = `Taille réelle : ${img.naturalWidth} × ${img.naturalHeight} px (${DD_TAILLE_MAX} px au maximum)` + (pct < 100 ? `, affichée à ${pct} %` : '');
    }

    // Les zones suivent l'image quand elle se charge ou quand la largeur disponible change
    document.addEventListener('load', (e) => {
      if (e.target && e.target.id === 'editDdImg') {
        const q = window.quizData ? window.quizData[window.currentIndex] : null;
        if (q) renderInteractiveZones(q);
        majEchelleAffichee();
      }
    }, true);
    let redimensionnement = 0;
    window.addEventListener('resize', () => {
      clearTimeout(redimensionnement);
      redimensionnement = setTimeout(() => {
        const q = window.quizData ? window.quizData[window.currentIndex] : null;
        if (q && document.getElementById('editDdImg')) { renderInteractiveZones(q); majEchelleAffichee(); }
      }, 120);
    });

    function updateDropInputs(idx, x, y) {
      const row = document.querySelector(`.drop-row[data-idx="${idx}"]`);
      if (row) {
        const inpX = row.querySelector('.inp-x');
        const inpY = row.querySelector('.inp-y');
        if (inpX) inpX.value = x;
        if (inpY) inpY.value = y;
      }
    }

    function renderDragsList(q) {
      const list = document.getElementById('ddDragsList');
      if (!list) return;
      list.innerHTML = '';

      (q.drags || []).forEach((d, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '0.5rem';
        row.style.marginBottom = '0.4rem';
        row.style.padding = '0.35rem 0.5rem';
        row.style.background = '#ffffff';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = '4px';

        row.innerHTML = `
          <span style="font-size:0.8rem; font-weight:700; width:30px; text-align:center; color:#2563eb;">[${d.no}]</span>
          <input type="text" class="form-input inp-drag-text" value="${escapeHtml(d.text)}" placeholder="Étiquette (1 ou 2 mots max)" style="flex:2; font-size:0.85rem;">
          <button type="button" class="tool-btn btn-del-drag" style="color:#b91c1c; font-weight:bold; padding:2px 8px;" title="Supprimer cet élément">✕</button>
        `;

        row.querySelector('.inp-drag-text').addEventListener('input', (e) => {
          d.text = e.target.value.trim();
          markDirty();
          renderInteractiveZones(q);
          renderDropsTable(q);
        });

        row.querySelector('.btn-del-drag').addEventListener('click', () => {
          q.drags.splice(idx, 1);
          // Réindexer les numéros
          q.drags.forEach((item, i) => item.no = i + 1);
          markDirty();
          renderDragsList(q);
          renderInteractiveZones(q);
          renderDropsTable(q);
        });

        list.appendChild(row);
      });
    }


    function renderDropsTable(q) {
      const table = document.getElementById('ddDropsTable');
      if (!table) return;
      table.innerHTML = '';

      (q.drops || []).forEach((drop, idx) => {
        const row = document.createElement('div');
        row.className = 'drop-row';
        row.dataset.idx = idx;
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '0.5rem';
        row.style.marginBottom = '0.4rem';
        row.style.padding = '0.35rem 0.5rem';
        row.style.background = '#ffffff';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = '4px';

        let dragSelectHtml = `<select class="form-select sel-choice" style="flex:2; font-size:0.8rem;">`;
        (q.drags || []).forEach(d => {
          dragSelectHtml += `<option value="${d.no}" ${drop.choice === d.no ? 'selected' : ''}>[${d.no}] ${escapeHtml(d.text)}</option>`;
        });
        dragSelectHtml += `</select>`;

        row.innerHTML = `
          <span style="font-size:0.8rem; font-weight:700; width:60px;">Zone ${idx + 1}</span>
          <label style="font-size:0.75rem; color:#64748b;">X: <input type="number" class="form-input inp-x" value="${drop.xleft || 0}" style="width:55px; padding:2px 4px; display:inline-block;"></label>
          <label style="font-size:0.75rem; color:#64748b;">Y: <input type="number" class="form-input inp-y" value="${drop.ytop || 0}" style="width:55px; padding:2px 4px; display:inline-block;"></label>
          ${dragSelectHtml}
          <button type="button" class="tool-btn btn-del-drop" style="color:#b91c1c;">✕</button>
        `;

        row.querySelector('.inp-x').addEventListener('input', (e) => {
          drop.xleft = parseInt(e.target.value) || 0;
          markDirty();
          renderInteractiveZones(q);
        });
        row.querySelector('.inp-y').addEventListener('input', (e) => {
          drop.ytop = parseInt(e.target.value) || 0;
          markDirty();
          renderInteractiveZones(q);
        });
        row.querySelector('.sel-choice').addEventListener('change', (e) => {
          drop.choice = parseInt(e.target.value) || 1;
          markDirty();
          renderInteractiveZones(q);
        });
        row.querySelector('.btn-del-drop').addEventListener('click', () => {
          q.drops.splice(idx, 1);
          markDirty();
          renderInteractiveZones(q);
          renderDropsTable(q);
        });

        table.appendChild(row);
      });
    }

    
    function renderDragsList(q) {
      const list = document.getElementById('ddDragsList');
      if (!list) return;
      list.innerHTML = '';

      (q.drags || []).forEach((d, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '0.5rem';
        row.style.marginBottom = '0.4rem';
        row.innerHTML = `
          <span style="font-size:0.8rem; font-weight:700; width:45px;">N° ${d.no}</span>
          <input type="text" class="form-input drag-txt" value="${escapeHtml(d.text)}" style="flex:1;">
          <button type="button" class="tool-btn drag-del" style="color:#b91c1c;">✕</button>
        `;

        row.querySelector('.drag-txt').addEventListener('input', (e) => {
          d.text = e.target.value;
          markDirty();
          renderInteractiveZones(q);
          renderDropsTable(q);
        });
        row.querySelector('.drag-del').addEventListener('click', () => {
          q.drags.splice(idx, 1);
          markDirty();
          renderDragsList(q);
          renderInteractiveZones(q);
          renderDropsTable(q);
        });
        list.appendChild(row);
      });
    }

    // =========================================================================
    // 8. ÉDITEUR ET INSPECTEUR CLOZE
    // =========================================================================
    

  // =========================================================================
  // 9. AJOUT D'IMAGE : FICHIER, COLLAGE (Ctrl+V ou bouton) ET DÉPÔT
  // =========================================================================
  function lireCommeDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  /** Moodle exige ici du PNG ou du JPEG : les autres formats (WebP, GIF...) sont convertis en PNG. */
  async function versPngOuJpeg(dataUrl) {
    if (/^data:image\/(png|jpeg);/.test(dataUrl)) return dataUrl;
    const img = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  /**
   * Remplace l'image d'une question. Les zones suivent les nouvelles dimensions ;
   * sans image précédente, elles sont ramenées à l'intérieur de la nouvelle image.
   */
  /**
   * Réduit l'image pour qu'elle tienne dans DD_TAILLE_MAX × DD_TAILLE_MAX pixels
   * (jamais agrandie). Le format PNG ou JPEG est conservé.
   */
  async function reduireAuMax(dataUrl) {
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth, h = img.naturalHeight;
    const s = Math.min(1, DD_TAILLE_MAX / w, DD_TAILLE_MAX / h);
    if (s >= 1) return { url: dataUrl, reduite: false, width: w, height: h };
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * s);
    canvas.height = Math.round(h * s);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const jpeg = /^data:image\/jpeg;/.test(dataUrl);
    if (jpeg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { url: jpeg ? canvas.toDataURL('image/jpeg', 0.92) : canvas.toDataURL('image/png'), reduite: true, width: canvas.width, height: canvas.height };
  }

  /**
   * Alerte dans l'éditeur : l'image dépasse la taille permise et la réduction est suggérée.
   * @returns {Promise<boolean>} true si l'enseignant accepte la réduction, false s'il annule.
   */
  function demanderReduction(origine, reduite, annulable) {
    const zone = document.getElementById('ddImageAlerteTaille');
    const message = `Cette image fait ${origine.width} × ${origine.height} px. Dans un test Moodle, une image de plus de ${DD_TAILLE_MAX} px de côté déborde de la page.`;
    const suggestion = `Suggestion : la réduire à ${reduite.width} × ${reduite.height} px. Les zones suivront la nouvelle taille.`;
    if (!zone) {
      return Promise.resolve(!annulable || window.confirm(message + '\n\n' + suggestion));
    }
    return new Promise((resolve) => {
      zone.innerHTML = `
        <div class="dd-alerte-taille" role="alertdialog" aria-labelledby="ddAlerteTitre" aria-describedby="ddAlerteTexte">
          <strong id="ddAlerteTitre">Image trop grande pour Moodle</strong>
          <p id="ddAlerteTexte">${escapeHtml(message)} ${escapeHtml(suggestion)}</p>
          <div class="dd-alerte-boutons">
            <button type="button" class="btn btn-primary" id="ddAlerteReduire">Réduire à ${reduite.width} × ${reduite.height} px</button>
            ${annulable ? '<button type="button" class="btn" id="ddAlerteAnnuler">Annuler l\'ajout</button>' : ''}
          </div>
        </div>`;
      const fermer = (choix) => { zone.innerHTML = ''; resolve(choix); };
      document.getElementById('ddAlerteReduire').addEventListener('click', () => fermer(true));
      const annuler = document.getElementById('ddAlerteAnnuler');
      if (annuler) annuler.addEventListener('click', () => fermer(false));
      zone.scrollIntoView({ block: 'center', behavior: 'smooth' });
      document.getElementById('ddAlerteReduire').focus({ preventScroll: true });
    });
  }

  async function appliquerImage(q, dataUrl) {
    let propre;
    let reduite = null;
    try {
      const brute = await versPngOuJpeg(dataUrl);
      const r = await reduireAuMax(brute);
      if (r.reduite) {
        const origine = await loadImageSize(brute);
        if (!(await demanderReduction(origine, r, true))) {
          showToast("Ajout annulé. Choisissez une image plus petite ou acceptez la réduction.");
          return false;
        }
        reduite = r;
      }
      propre = r.url;
    } catch (err) {
      showToast("Cette image est illisible. Essayez un fichier PNG ou JPEG.");
      return false;
    }
    const avant = q.bgImage ? await loadImageSize(q.bgImage) : null;
    const apres = await loadImageSize(propre);
    if (!apres) { showToast("Cette image est illisible. Essayez un fichier PNG ou JPEG."); return false; }
    (q.drops || []).forEach((drop, i) => {
      if (avant && avant.width && avant.height) {
        drop.xleft = Math.round(drop.xleft * apres.width / avant.width);
        drop.ytop = Math.round(drop.ytop * apres.height / avant.height);
      } else {
        drop.xleft = Math.min(drop.xleft || 20, Math.max(0, apres.width - 160));
        drop.ytop = Math.min(drop.ytop || 20, Math.max(0, apres.height - 40));
      }
    });
    q.bgImage = propre;
    markDirty();
    const shown = window.quizData ? window.quizData[window.currentIndex] : null;
    if (imageEditorContainer && shown === q && document.body.contains(imageEditorContainer)) {
      renderDDImageEditor(q, imageEditorContainer);
    }
    showToast(reduite
      ? `Image ajoutée et réduite à ${reduite.width} × ${reduite.height} px pour Moodle. Placez maintenant chaque zone.`
      : 'Image ajoutée. Placez maintenant chaque zone sur le schéma.');
    return true;
  }

  /** Image déjà présente (XML importé, ancien projet) plus grande que la limite : réduite à l'ouverture. */
  async function limiterTailleExistante(q) {
    if (!q.bgImage) return;
    let r;
    try { r = await reduireAuMax(q.bgImage); } catch (err) { return; }
    if (!r.reduite) return;
    const avant = await loadImageSize(q.bgImage);
    // Image déjà dans la question : la réduction est la seule suite proposée.
    if (!(await demanderReduction(avant, r, false))) return;
    if (!document.body.contains(imageEditorContainer)) return;
    (q.drops || []).forEach((drop) => {
      drop.xleft = Math.round(drop.xleft * r.width / avant.width);
      drop.ytop = Math.round(drop.ytop * r.height / avant.height);
    });
    q.bgImage = r.url;
    markDirty();
    const shown = window.quizData ? window.quizData[window.currentIndex] : null;
    if (imageEditorContainer && shown === q && document.body.contains(imageEditorContainer)) {
      renderDDImageEditor(q, imageEditorContainer);
    }
    showToast(`Image réduite à ${r.width} × ${r.height} px : Moodle reçoit au plus ${DD_TAILLE_MAX} px de côté.`);
  }

  async function appliquerFichierImage(q, fichier) {
    if (!fichier || !/^image\//.test(fichier.type)) { showToast('Ce fichier n\'est pas une image.'); return false; }
    return appliquerImage(q, await lireCommeDataUrl(fichier));
  }

  async function collerImageDepuisPressePapiers(q) {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      showToast('Cliquez dans la zone de l\'image, puis appuyez sur Ctrl+V.');
      return;
    }
    try {
      const elements = await navigator.clipboard.read();
      for (const el of elements) {
        const type = el.types.find(t => /^image\//.test(t));
        if (type) { await appliquerImage(q, await lireCommeDataUrl(await el.getType(type))); return; }
      }
      showToast('Le presse-papiers ne contient pas d\'image. Faites un clic droit sur l\'image, puis « Copier l\'image ».');
    } catch (err) {
      showToast('Collage refusé par le navigateur : cliquez dans la zone de l\'image, puis appuyez sur Ctrl+V.');
    }
  }

  // Ctrl+V n'importe où dans la page pendant l'édition d'une question glisser-déposer
  document.addEventListener('paste', (e) => {
    const q = window.quizData ? window.quizData[window.currentIndex] : null;
    if (!q || (q.type !== 'ddimageortext' && q.type !== 'ddimage') || !document.getElementById('ddBgFileInputDirect')) return;
    const cible = e.target;
    if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA)$/.test(cible.tagName))) return;
    const items = Array.from((e.clipboardData && e.clipboardData.items) || []);
    const item = items.find(it => it.kind === 'file' && /^image\//.test(it.type));
    if (!item) return;
    e.preventDefault();
    appliquerFichierImage(q, item.getAsFile());
  });

  window.MoodleDDImage = {
    TAILLE_MAX: DD_TAILLE_MAX,
    appliquerImage: appliquerImage,
    reduireAuMax: reduireAuMax,
    renderEditor: renderDDImageEditor,
    setHeight: setDdMaxHeight,
    generateNewImage: generateNewDdImageAction,
    copyPrompt: copyDdPromptTemplate,
    renderInteractiveZones: renderInteractiveZones,
    updateDropInputs: updateDropInputs,
    renderDragsList: renderDragsList,
    renderDropsTable: renderDropsTable
  };

  // Alias globaux pour rétrocompatibilité
  window.setDdMaxHeight = setDdMaxHeight;
  window.renderDDImageEditor = renderDDImageEditor;
  window.generateNewDdImageAction = generateNewDdImageAction;
  window.copyDdPromptTemplate = copyDdPromptTemplate;
  window.renderInteractiveZones = renderInteractiveZones;
  window.updateDropInputs = updateDropInputs;
  window.renderDragsList = renderDragsList;
  window.renderDropsTable = renderDropsTable;

})();
