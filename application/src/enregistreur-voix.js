/**
 * Enregistrement de la voix de l'enseignant pour les présentations narrées (Compréhension en deux pages).
 * Volet de la colonne de l'étape 3 : texte de la narration en télésouffleur, compte à rebours, niveau du micro,
 * puis Enregistrer, Arrêter, Écouter et Retirer.
 *
 * Le traitement du son est celui du simulateur (moteur-ui/simulateurs/scorm/narration-recorder.js,
 * NarrationRecorder.outils) : silences coupés, volume égalisé, MP3 mono 64 kbit/s par lame.min.js (copie locale).
 * Le MP3 est rendu en data: ; l'assistant le range dans la station (q.audio), le garde dans le projet et
 * le place dans le package SCORM (src/audio/<id>.mp3). Rien ne quitte le navigateur.
 */
(function () {
  'use strict';

  const R = function () { return window.NarrationRecorder && window.NarrationRecorder.outils; };
  const lecteur = new Audio();
  let capture = null;   // { ctx, source, noeud, morceaux, taux, debut, id }
  let enCours = false;  // compte à rebours, enregistrement ou traitement
  let zone = null;      // volet affiché
  let station = null;
  let rappels = {};

  function echapper(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }
  function texteEnrichi(t) { return echapper(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function chrono(sec) { const s = Math.round(sec || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function duree(sec) { const s = Math.round(sec || 0); return (s >= 60 ? Math.floor(s / 60) + ' min ' : '') + String(s % 60).padStart(s >= 60 ? 2 : 1, '0') + ' s'; }
  function texteNarration(q) { return (q.narration || []).join('\n'); }

  function disponible() { return !!R() && typeof window.lamejs !== 'undefined'; }
  /** La station a-t-elle un enregistrement de l'enseignant ? */
  function aVoix(q) { return /^data:audio\//.test((q && q.audio) || ''); }
  /** Le texte de la narration a changé depuis l'enregistrement. */
  function perime(q) { return aVoix(q) && q.audioTexte != null && q.audioTexte !== texteNarration(q); }

  function $(sel) { return zone ? zone.querySelector(sel) : null; }
  function message(t) { const m = $('.voix-message'); if (m) m.textContent = t || ''; }

  /** Volet HTML pour la station q (présentation narrée). */
  function carteHtml(q) {
    const voix = aVoix(q);
    const visee = R() ? R().dureeVisee({ narration: q.narration || [] }) : 0;
    let etat = voix ? 'Votre voix est enregistrée (' + duree(q.audioDuree) + ').' : 'Voix de synthèse : aucun enregistrement.';
    return '<section class="carte-voix" aria-labelledby="titreVoixScorm">' +
      '<h4 id="titreVoixScorm">Narration avec votre voix</h4>' +
      '<p class="voix-etat">' + etat + '</p>' +
      (perime(q) ? '<p class="bandeau bandeau-avertissement">La narration a changé depuis l\'enregistrement : enregistrez-la de nouveau.</p>' : '') +
      (disponible()
        ? '<p class="aide">Durée visée : environ ' + duree(visee) + '. Lisez à voix posée en regardant le schéma de l\'aperçu. Une nouvelle prise remplace l\'ancienne.</p>' +
          '<div class="voix-texte" tabindex="0" aria-label="Texte à lire">' +
            (q.narration || []).map(function (p) { return '<p>' + texteEnrichi(p) + '</p>'; }).join('') + '</div>' +
          '<div class="voix-niveau" aria-hidden="true"><span></span></div>' +
          '<p class="voix-chrono nombres" aria-live="off">' + (voix ? chrono(q.audioDuree) : '0:00') + '</p>' +
          '<div class="image-courante-boutons">' +
            '<button type="button" class="btn btn-primary" data-voix="enregistrer">' + (voix ? 'Enregistrer de nouveau' : 'Enregistrer ma voix') + '</button>' +
            '<button type="button" class="btn btn-primary" data-voix="arreter" hidden>Arrêter</button>' +
            (voix ? '<button type="button" class="btn" data-voix="ecouter">Écouter</button>' : '') +
            (voix ? '<button type="button" class="btn" data-voix="retirer">Retirer l\'enregistrement</button>' : '') +
          '</div>'
        : '<p class="aide">L\'enregistreur (moteur-ui/simulateurs/scorm/narration-recorder.js et lame.min.js) n\'est pas chargé.</p>') +
      '<p class="statut voix-message" role="status" aria-live="polite"></p>' +
    '</section>';
  }

  /**
   * Branche le volet rendu par carteHtml.
   * @param {object} q Station.
   * @param {Element} conteneur Élément qui contient le volet.
   * @param {object} r { enregistre(q, { audio, duree, texte }), retire(q), fini() }
   */
  function brancher(q, conteneur, r) {
    zone = conteneur.querySelector('.carte-voix');
    station = q;
    rappels = r || {};
    if (!zone) return;
    const b = function (a, f) { const el = $('[data-voix="' + a + '"]'); if (el) el.addEventListener('click', f); };
    b('enregistrer', demarrer);
    b('arreter', arreter);
    b('ecouter', ecouter);
    b('retirer', function () {
      lecteur.pause();
      if (confirm('Retirer votre enregistrement de cette station ? La voix de synthèse lira de nouveau la narration.') && rappels.retire) rappels.retire(q);
    });
  }

  function majBoutons(etat) {
    const enr = $('[data-voix="enregistrer"]');
    const arr = $('[data-voix="arreter"]');
    if (enr) { enr.hidden = etat === 'capture'; enr.disabled = enCours; }
    if (arr) arr.hidden = etat !== 'capture';
    ['ecouter', 'retirer'].forEach(function (a) { const el = $('[data-voix="' + a + '"]'); if (el) { el.disabled = enCours; el.hidden = etat === 'capture'; } });
  }

  function compteARebours(n) {
    return new Promise(function (resolve) {
      (function tic(i) {
        const z = $('.voix-chrono');
        if (i === 0) return resolve();
        if (z) z.textContent = 'Début dans ' + i + '…';
        setTimeout(function () { tic(i - 1); }, 1000);
      })(n);
    });
  }

  function demarrer() {
    if (enCours || !station || !disponible()) return;
    lecteur.pause();
    enCours = true;
    majBoutons();
    message('');
    const q = station;
    R().obtenirMicro()
      .then(function () { return compteARebours(3); })
      .then(function () { return R().obtenirMicro(); })
      .then(function (flux) {
        const c = R().creerContexte(flux);
        const noeud = c.ctx.createScriptProcessor(4096, 1, 1);
        capture = { ctx: c.ctx, source: c.source, noeud: noeud, morceaux: [], taux: c.ctx.sampleRate, debut: performance.now(), q: q };
        noeud.onaudioprocess = function (e) {
          if (!capture) return;
          const d = e.inputBuffer.getChannelData(0);
          capture.morceaux.push(new Float32Array(d));
          let s = 0;
          for (let i = 0; i < d.length; i += 8) s += d[i] * d[i];
          const barre = $('.voix-niveau span');
          if (barre) barre.style.width = Math.min(100, Math.round(Math.sqrt(s / (d.length / 8)) * 400)) + '%';
          const z = $('.voix-chrono');
          if (z) z.textContent = chrono((performance.now() - capture.debut) / 1000);
          e.outputBuffer.getChannelData(0).fill(0);
        };
        c.source.connect(noeud);
        noeud.connect(c.ctx.destination);
        if (c.ctx.state === 'suspended') c.ctx.resume();
        majBoutons('capture');
        message('Enregistrement en cours. Cliquez sur Arrêter à la fin du texte.');
        const arr = $('[data-voix="arreter"]');
        if (arr) arr.focus();
      })
      .catch(function (err) {
        terminer();
        const z = $('.voix-chrono');
        if (z) z.textContent = '0:00';
        message(err && err.name === 'NotAllowedError'
          ? 'L\'accès au micro a été refusé. Autorisez le micro dans la barre d\'adresse du navigateur, puis recommencez.'
          : err && err.name === 'NotFoundError' ? 'Aucun micro n\'a été trouvé. Branchez-en un, puis recommencez.'
          : (window.isSecureContext === false ? 'Le navigateur refuse le micro sur une page qui n\'est pas en https.' : (err && err.message) || 'Le micro est introuvable.'));
      });
  }

  function arreter() {
    if (!capture) return;
    const c = capture;
    capture = null;
    c.noeud.onaudioprocess = null;
    try { c.source.disconnect(); c.noeud.disconnect(); } catch (e) { /* déjà déconnecté */ }
    c.ctx.close();
    const barre = $('.voix-niveau span');
    if (barre) barre.style.width = '0%';
    majBoutons('traitement');
    message('Traitement du son…');
    setTimeout(function () { traiter(c); }, 30);
  }

  function traiter(c) {
    const son = R().preparerSon(c.morceaux, c.taux);
    if (!son) { terminer(); message('Aucun son n\'a été capté. Vérifiez que le bon micro est branché et activé, puis recommencez.'); return; }
    const secondes = son.donnees.length / son.taux;
    R().encoderMp3(son.donnees, son.taux).then(function (blob) {
      return new Promise(function (resolve, reject) {
        const fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    }).then(function (url) {
      const visee = R().dureeVisee({ narration: c.q.narration || [] });
      const ecart = secondes / Math.max(1, visee);
      const avis = ecart < 0.7 ? ' La prise semble courte : vérifiez qu\'aucun paragraphe n\'a été sauté.'
        : ecart > 1.5 ? ' La prise est plus longue que prévu : c\'est correct si le débit vous convient.' : '';
      enCours = false;
      if (rappels.enregistre) rappels.enregistre(c.q, { audio: url.replace(/^data:[^;,]*/, 'data:audio/mpeg'), duree: Math.round(secondes * 10) / 10, texte: texteNarration(c.q), avis: avis });
      if (rappels.fini) rappels.fini();
    }).catch(function () {
      terminer();
      message('L\'enregistrement n\'a pas pu être converti en MP3. Recommencez.');
    });
  }

  function terminer() {
    enCours = false;
    majBoutons();
    if (rappels.fini) rappels.fini();
  }

  function ecouter() {
    if (!aVoix(station)) return;
    const bouton = $('[data-voix="ecouter"]');
    if (!lecteur.paused) { lecteur.pause(); if (bouton) bouton.textContent = 'Écouter'; return; }
    lecteur.src = station.audio;
    lecteur.onended = function () { if (bouton) bouton.textContent = 'Écouter'; };
    lecteur.play().then(function () { if (bouton) bouton.textContent = 'Arrêter l\'écoute'; })
      .catch(function () { message('L\'enregistrement n\'a pas pu être lu.'); });
  }

  /** Quitte l'étape 3 : capture abandonnée, lecture arrêtée, micro libéré. */
  function arreterTout() {
    if (capture) {
      const c = capture;
      capture = null;
      c.noeud.onaudioprocess = null;
      try { c.source.disconnect(); c.noeud.disconnect(); c.ctx.close(); } catch (e) { /* déjà fermé */ }
    }
    enCours = false;
    lecteur.pause();
    if (R()) R().libererMicro();
  }

  window.MoodleAIEnregistreurVoix = {
    disponible: disponible,
    aVoix: aVoix,
    perime: perime,
    enCours: function () { return enCours; },
    carteHtml: carteHtml,
    brancher: brancher,
    arreterTout: arreterTout
  };
})();
