/**
 * NarrationRecorder — Mode narration du simulateur enseignant SCORM.
 * L'enseignant lit le texte de chaque page de présentation au micro ; le module coupe les
 * silences, égalise le volume, encode en MP3 (lamejs, copie locale) et l'enregistre dans
 * src/audio/ par le serveur local (/api/save_audio). Sans serveur : téléchargement du fichier.
 * Rien ne quitte le poste. Zéro dépendance externe, Loi 25.
 */
(function () {
  'use strict';

  const DEBIT_MOTS_MINUTE = 150;
  const TAUX_ENCODAGE = [48000, 44100, 32000];

  let stations = [];        // [{ index, id, titre, narration, audio }]
  let courante = null;      // station affichée
  let actif = false;
  let panneau = null;
  let opts = {};
  let flux = null;          // MediaStream du micro
  let capture = null;       // { ctx, source, noeud, morceaux, taux, debut }
  let enCours = false;      // compte à rebours, enregistrement ou traitement
  const etats = {};         // id -> { duree, url }
  const lecteur = new Audio();

  /* ── Outils ─────────────────────────────────────────────────────────── */

  function echapper(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function texteEnrichi(t) {
    return echapper(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function duree(sec) {
    const s = Math.round(sec);
    return Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s';
  }

  function chrono(sec) {
    const s = Math.round(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function dureeVisee(st) {
    const mots = st.narration.join(' ').split(/\s+/).filter(Boolean).length;
    return mots / DEBIT_MOTS_MINUTE * 60 + st.narration.length;
  }

  function nomFichier(st) {
    return st.audio.split('/').pop();
  }

  function urlFichier(st) {
    return st.audio + '?v=' + Date.now();
  }

  function dossierServeur() {
    return decodeURIComponent(location.pathname.replace(/\/[^/]*$/, ''));
  }

  function $(sel) { return panneau ? panneau.querySelector(sel) : null; }

  function message(texte) {
    const m = $('.narr-message');
    if (m) m.textContent = texte || '';
  }

  /* ── Interface ──────────────────────────────────────────────────────── */

  function construirePanneau() {
    const aside = document.querySelector(opts.panneau || '.sim-drawer-side');
    if (!aside) return null;
    const p = document.createElement('section');
    p.className = 'narr-panel';
    p.setAttribute('aria-label', 'Enregistrement de la narration');
    p.hidden = true;
    p.innerHTML =
      '<div class="sim-section-header">Enregistrer la narration</div>' +
      '<ol class="narr-liste"></ol>' +
      '<div class="narr-courante">' +
        '<h2 class="narr-titre"></h2>' +
        '<p class="narr-cible"></p>' +
        '<div class="narr-texte" tabindex="0" aria-label="Texte à lire"></div>' +
        '<div class="narr-niveau" aria-hidden="true"><span></span></div>' +
        '<p class="narr-chrono" aria-live="off">0:00</p>' +
        '<div class="narr-actions">' +
          '<button type="button" class="btn btn-primary" data-a="enregistrer">Enregistrer</button>' +
          '<button type="button" class="btn btn-primary" data-a="arreter" hidden>Arrêter</button>' +
          '<button type="button" class="btn" data-a="ecouter" hidden>Écouter</button>' +
        '</div>' +
        '<p class="narr-message" role="status" aria-live="polite"></p>' +
        '<a class="btn" data-a="telecharger" hidden>Télécharger le MP3</a>' +
      '</div>' +
      '<p class="narr-aide">Lis à voix posée, en regardant l\'image à gauche. ' +
        'Une erreur ? Clique de nouveau sur Enregistrer : la nouvelle prise remplace l\'ancienne.</p>';
    aside.appendChild(p);

    p.querySelector('[data-a="enregistrer"]').addEventListener('click', demarrer);
    p.querySelector('[data-a="arreter"]').addEventListener('click', arreter);
    p.querySelector('[data-a="ecouter"]').addEventListener('click', ecouter);
    return p;
  }

  function afficherListe() {
    const liste = $('.narr-liste');
    if (!liste) return;
    liste.innerHTML = '';
    stations.forEach(function (st) {
      const li = document.createElement('li');
      const etat = etats[st.id];
      li.innerHTML =
        '<button type="button" class="narr-station"' + (st === courante ? ' aria-current="true"' : '') + '>' +
          '<span class="narr-station-titre">' + (st.index + 1) + '. ' + echapper(st.titre) + '</span>' +
          '<span class="narr-station-etat">' + (etat ? 'Enregistrée · ' + chrono(etat.duree) : 'À enregistrer') + '</span>' +
        '</button>';
      const bouton = li.querySelector('button');
      bouton.disabled = enCours;
      bouton.addEventListener('click', function () { choisir(st); });
      liste.appendChild(li);
    });
  }

  function afficherStation() {
    if (!courante) return;
    $('.narr-titre').textContent = courante.titre;
    $('.narr-cible').textContent = 'Durée visée : environ ' + duree(dureeVisee(courante)) + '.';
    $('.narr-texte').innerHTML = courante.narration.map(function (t) { return '<p>' + texteEnrichi(t) + '</p>'; }).join('');
    $('.narr-texte').scrollTop = 0;
    $('.narr-chrono').textContent = etats[courante.id] ? chrono(etats[courante.id].duree) : '0:00';
    $('.narr-niveau span').style.width = '0%';
    majBoutons();
    message('');
    const lien = $('[data-a="telecharger"]');
    if (lien) lien.hidden = true;
  }

  function majBoutons(etat) {
    const enregistrer = $('[data-a="enregistrer"]');
    const arreterBtn = $('[data-a="arreter"]');
    const ecouterBtn = $('[data-a="ecouter"]');
    const prise = courante && etats[courante.id];
    enregistrer.hidden = etat === 'capture';
    enregistrer.disabled = enCours;
    enregistrer.textContent = prise ? 'Enregistrer de nouveau' : 'Enregistrer';
    arreterBtn.hidden = etat !== 'capture';
    ecouterBtn.hidden = !prise || etat === 'capture';
    ecouterBtn.disabled = enCours;
    panneau.querySelectorAll('.narr-station').forEach(function (b) { b.disabled = enCours; });
  }

  function choisir(st) {
    if (enCours) return;
    lecteur.pause();
    courante = st;
    afficherListe();
    afficherStation();
    if (opts.allerA) opts.allerA(st.index);
  }

  /** Vérifie quels fichiers existent déjà (serveur local) et lit leur durée. */
  function sonderFichiers() {
    stations.forEach(function (st) {
      const a = new Audio();
      a.preload = 'metadata';
      a.addEventListener('loadedmetadata', function () {
        etats[st.id] = { duree: a.duration, url: null };
        afficherListe();
        if (st === courante) afficherStation();
      });
      a.src = urlFichier(st);
    });
  }

  /* ── Enregistrement ─────────────────────────────────────────────────── */

  function obtenirMicro() {
    if (flux) return Promise.resolve(flux);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error('Ce navigateur ne permet pas l\'enregistrement. Utilise Edge, Chrome ou Firefox.'));
    }
    return navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false }
    }).then(function (f) { flux = f; return f; });
  }

  function creerContexte(f) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    let ctx, source;
    try {
      ctx = new Ctx({ sampleRate: 44100 });
      source = ctx.createMediaStreamSource(f);
    } catch (e) {
      if (ctx) ctx.close();
      ctx = new Ctx();
      source = ctx.createMediaStreamSource(f);
    }
    return { ctx: ctx, source: source };
  }

  function compteARebours(n) {
    return new Promise(function (resolve) {
      const zone = $('.narr-chrono');
      (function tic(i) {
        if (i === 0) return resolve();
        zone.textContent = 'Début dans ' + i + '…';
        setTimeout(function () { tic(i - 1); }, 1000);
      })(n);
    });
  }

  function demarrer() {
    if (enCours || !courante) return;
    lecteur.pause();
    enCours = true;
    majBoutons();
    message('');
    $('[data-a="telecharger"]').hidden = true;
    obtenirMicro()
      .then(function () { return compteARebours(3); })
      .then(function () {
        const c = creerContexte(flux);
        const noeud = c.ctx.createScriptProcessor(4096, 1, 1);
        capture = { ctx: c.ctx, source: c.source, noeud: noeud, morceaux: [], taux: c.ctx.sampleRate, debut: performance.now() };
        const barre = $('.narr-niveau span');
        const zone = $('.narr-chrono');
        noeud.onaudioprocess = function (e) {
          const d = e.inputBuffer.getChannelData(0);
          capture.morceaux.push(new Float32Array(d));
          let s = 0;
          for (let i = 0; i < d.length; i += 8) s += d[i] * d[i];
          const rms = Math.sqrt(s / (d.length / 8));
          barre.style.width = Math.min(100, Math.round(rms * 400)) + '%';
          zone.textContent = chrono((performance.now() - capture.debut) / 1000);
          e.outputBuffer.getChannelData(0).fill(0);
        };
        c.source.connect(noeud);
        noeud.connect(c.ctx.destination);
        if (c.ctx.state === 'suspended') c.ctx.resume();
        majBoutons('capture');
        message('Enregistrement en cours. Clique sur Arrêter à la fin du texte.');
      })
      .catch(function (err) {
        enCours = false;
        majBoutons();
        $('.narr-chrono').textContent = '0:00';
        message(err && err.name === 'NotAllowedError'
          ? 'L\'accès au micro a été refusé. Autorise le micro dans la barre d\'adresse du navigateur, puis recommence.'
          : (err && err.message) || 'Le micro est introuvable.');
      });
  }

  function arreter() {
    if (!capture) return;
    const c = capture;
    capture = null;
    c.noeud.onaudioprocess = null;
    try { c.source.disconnect(); c.noeud.disconnect(); } catch (e) {}
    c.ctx.close();
    $('.narr-niveau span').style.width = '0%';
    majBoutons('traitement');
    message('Traitement du son…');
    setTimeout(function () { traiter(c.morceaux, c.taux); }, 30);
  }

  /* ── Traitement : silences, volume, encodage MP3 ────────────────────── */

  function assembler(morceaux) {
    const total = morceaux.reduce(function (n, m) { return n + m.length; }, 0);
    const out = new Float32Array(total);
    let pos = 0;
    morceaux.forEach(function (m) { out.set(m, pos); pos += m.length; });
    return out;
  }

  function reechantillonner(donnees, de, vers) {
    if (de === vers) return donnees;
    const ratio = de / vers;
    const n = Math.floor(donnees.length / ratio);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * ratio, j = Math.floor(x), f = x - j;
      out[i] = donnees[j] * (1 - f) + (donnees[j + 1] || 0) * f;
    }
    return out;
  }

  function nettoyer(donnees, taux) {
    const fen = Math.round(taux * 0.02);
    const nb = Math.floor(donnees.length / fen);
    const rms = new Float32Array(nb);
    let max = 0;
    for (let w = 0; w < nb; w++) {
      let s = 0;
      for (let i = w * fen; i < (w + 1) * fen; i++) s += donnees[i] * donnees[i];
      rms[w] = Math.sqrt(s / fen);
      if (rms[w] > max) max = rms[w];
    }
    if (max < 0.004) return null;
    const seuil = Math.max(0.004, max * 0.08);
    let premier = 0, dernier = nb - 1;
    while (premier < nb && rms[premier] < seuil) premier++;
    while (dernier > premier && rms[dernier] < seuil) dernier--;
    const debut = Math.max(0, premier * fen - Math.round(taux * 0.3));
    const fin = Math.min(donnees.length, (dernier + 1) * fen + Math.round(taux * 0.5));
    const extrait = donnees.slice(debut, fin);

    // Volume : voix ramenée vers -20 dBFS, crête limitée à -1 dBFS
    let somme = 0, compte = 0, crete = 0;
    for (let w = premier; w <= dernier; w++) if (rms[w] >= seuil) { somme += rms[w] * rms[w]; compte++; }
    for (let i = 0; i < extrait.length; i++) { const a = Math.abs(extrait[i]); if (a > crete) crete = a; }
    const rmsVoix = Math.sqrt(somme / Math.max(1, compte));
    const gain = Math.min(0.1 / rmsVoix, 0.89 / Math.max(crete, 1e-6), 12);
    const fondu = Math.round(taux * 0.02);
    for (let i = 0; i < extrait.length; i++) {
      let g = gain;
      if (i < fondu) g *= i / fondu;
      else if (i > extrait.length - fondu) g *= (extrait.length - i) / fondu;
      extrait[i] *= g;
    }
    return extrait;
  }

  function encoderMp3(donnees, taux) {
    return new Promise(function (resolve) {
      const enc = new lamejs.Mp3Encoder(1, taux, 64);
      const pcm = new Int16Array(donnees.length);
      for (let i = 0; i < donnees.length; i++) {
        const s = Math.max(-1, Math.min(1, donnees[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const parties = [];
      const bloc = 1152 * 200;
      let pos = 0;
      (function etape() {
        const fin = Math.min(pcm.length, pos + bloc);
        for (let i = pos; i < fin; i += 1152) {
          const buf = enc.encodeBuffer(pcm.subarray(i, Math.min(i + 1152, fin)));
          if (buf.length) parties.push(new Uint8Array(buf));
        }
        pos = fin;
        if (pos < pcm.length) return setTimeout(etape, 0);
        const reste = enc.flush();
        if (reste.length) parties.push(new Uint8Array(reste));
        resolve(new Blob(parties, { type: 'audio/mpeg' }));
      })();
    });
  }

  /** Morceaux captés → son prêt à encoder (silences coupés, volume égalisé), ou null si rien n'a été capté. */
  function preparerSon(morceaux, tauxCapture) {
    let donnees = assembler(morceaux);
    let taux = tauxCapture;
    if (TAUX_ENCODAGE.indexOf(taux) === -1) { donnees = reechantillonner(donnees, taux, 44100); taux = 44100; }
    const propre = nettoyer(donnees, taux);
    return propre ? { donnees: propre, taux: taux } : null;
  }

  function traiter(morceaux, tauxCapture) {
    const st = courante;
    const son = preparerSon(morceaux, tauxCapture);
    const propre = son && son.donnees;
    const taux = son && son.taux;
    if (!propre) {
      terminer();
      message('Aucun son n\'a été capté. Vérifie que le bon micro est branché et activé, puis recommence.');
      return;
    }
    if (typeof lamejs === 'undefined') {
      terminer();
      message('L\'encodeur MP3 (lame.min.js) est introuvable dans moteur-ui.');
      return;
    }
    const secondes = propre.length / taux;
    encoderMp3(propre, taux).then(function (blob) { sauvegarder(st, blob, secondes); });
  }

  function sauvegarder(st, blob, secondes) {
    const ancien = etats[st.id];
    if (ancien && ancien.url) URL.revokeObjectURL(ancien.url);
    const url = URL.createObjectURL(blob);
    etats[st.id] = { duree: secondes, url: url };
    const ecart = secondes / dureeVisee(st);
    const avis = ecart < 0.7 ? ' La prise semble courte : vérifie qu\'aucun paragraphe n\'a été sauté.' :
      ecart > 1.5 ? ' La prise est plus longue que prévu : c\'est correct si le débit te convient.' : '';

    const envoi = location.protocol.indexOf('http') === 0
      ? fetch('/api/save_audio?dossier=' + encodeURIComponent(dossierServeur()) + '&nom=' + encodeURIComponent(nomFichier(st)),
          { method: 'POST', headers: { 'Content-Type': 'audio/mpeg' }, body: blob })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message); return j; }); })
      : Promise.reject(new Error('Serveur local absent'));

    envoi.then(function (j) {
      terminer();
      message('Enregistrée (' + duree(secondes) + ') dans ' + j.fichier + '.' + avis);
      if (opts.audioMisAJour) opts.audioMisAJour(st);
    }).catch(function () {
      terminer();
      const lien = $('[data-a="telecharger"]');
      lien.href = url;
      lien.download = nomFichier(st);
      lien.hidden = false;
      message('Prise prête (' + duree(secondes) + '), mais le serveur local ne répond pas : télécharge le fichier et place-le dans src/audio/.' + avis);
    });
  }

  function terminer() {
    enCours = false;
    afficherListe();
    majBoutons();
    if (courante && etats[courante.id]) $('.narr-chrono').textContent = chrono(etats[courante.id].duree);
  }

  function ecouter() {
    if (!courante || !etats[courante.id]) return;
    const bouton = $('[data-a="ecouter"]');
    if (!lecteur.paused) { lecteur.pause(); bouton.textContent = 'Écouter'; return; }
    lecteur.src = etats[courante.id].url || urlFichier(courante);
    lecteur.onended = function () { bouton.textContent = 'Écouter'; };
    lecteur.play().then(function () { bouton.textContent = 'Arrêter l\'écoute'; }).catch(function () {
      message('Le fichier n\'a pas pu être lu.');
    });
  }

  function libererMicro() {
    if (capture) arreter();
    if (flux) { flux.getTracks().forEach(function (t) { t.stop(); }); flux = null; }
  }

  /* ── API ────────────────────────────────────────────────────────────── */

  window.NarrationRecorder = {
    /** @param {object} o { panneau, allerA(index), audioMisAJour(station) } */
    init: function (o) { opts = o || {}; },

    /**
     * Outils de capture et de traitement, réutilisés par l'application web (application/src/enregistreur-voix.js) :
     * même micro, même nettoyage du son et même encodage MP3 que le simulateur.
     */
    outils: {
      obtenirMicro: obtenirMicro,
      creerContexte: creerContexte,
      preparerSon: preparerSon,
      encoderMp3: encoderMp3,
      dureeVisee: dureeVisee,
      libererMicro: function () { if (flux) { flux.getTracks().forEach(function (t) { t.stop(); }); flux = null; } }
    },

    /** Reçoit la liste ACTIVITY_READY ; retourne true s'il y a au moins une page narrée. */
    definirStations: function (questions) {
      stations = (questions || []).filter(function (q) {
        return Array.isArray(q.narration) && q.narration.length && q.audio;
      });
      if (courante) courante = stations.find(function (s) { return s.id === courante.id; }) || null;
      if (actif) { afficherListe(); afficherStation(); }
      return stations.length > 0;
    },

    estActif: function () { return actif; },

    /** L'enseignant a changé de page dans l'activité : le panneau suit (sauf pendant une prise). */
    suivre: function (index) {
      if (!actif || enCours) return;
      const st = stations.find(function (s) { return s.index === index; });
      if (!st) {
        message('Cette page n\'a pas de narration à enregistrer.');
        return;
      }
      if (st === courante) return;
      lecteur.pause();
      courante = st;
      afficherListe();
      afficherStation();
    },

    basculer: function () {
      if (!panneau) panneau = construirePanneau();
      if (!panneau || !stations.length) return false;
      actif = !actif;
      panneau.hidden = !actif;
      document.body.classList.toggle('sim-mode-narration', actif);
      if (actif) {
        sonderFichiers();
        choisir(courante || stations[0]);
      } else {
        lecteur.pause();
        libererMicro();
      }
      return actif;
    }
  };
})();
