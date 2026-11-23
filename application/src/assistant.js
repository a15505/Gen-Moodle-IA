/**
 * Assistant de création — navigation entre les écrans et les étapes,
 * sauvegarde automatique dans le navigateur et parcours « Vidéo interactive H5P ».
 */
(function () {
  'use strict';

  // Une sauvegarde par type de projet ; l'exemple est rangé à part :
  // l'ouvrir n'efface jamais le projet en cours.
  const TYPE = 'video-h5p';
  const CLE_PROJET = 'moodleai.' + TYPE + '.projet';
  const CLE_EXEMPLE = 'moodleai.' + TYPE + '.exemple';
  const CLE_DERNIER = 'moodleai.dernier';
  const CLE_APERCU = 'moodleai.' + TYPE + '.apercu';
  const V = window.MoodleAIVideo;
  const P = window.MoodleAIProjets;
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  const AIDE_OUTIL = {
    gemini: 'Gemini peut généralement regarder une vidéo YouTube à partir de son lien, mais certains centres de services scolaires bloquent cet accès. Si Gemini répond qu\'il ne peut pas voir la vidéo, ou si ses questions ne correspondent pas à son contenu, ajoutez la transcription ci-dessous.',
    copilot: 'Copilot ne peut pas toujours lire le contenu d\'une vidéo. Ajoutez la transcription ci-dessous pour obtenir des questions et des moments fiables.'
  };
  const OUTILS_IA = {
    copilot: { nom: 'Copilot', url: 'https://copilot.cloud.microsoft/chat?' },
    gemini: { nom: 'Gemini', url: 'https://gemini.google.com/' }
  };

  /** Liens vers les deux outils d'IA, l'outil choisi en premier. Ouverture dans un nouvel onglet. */
  function liensIA(texteAvant, outil) {
    const choisi = (outil || etat.contexte.outil) === 'copilot' ? 'copilot' : 'gemini';
    const ordre = choisi === 'copilot' ? ['copilot', 'gemini'] : ['gemini', 'copilot'];
    return '<div class="liens-ia">' + (texteAvant ? '<span class="liens-ia-texte">' + echapper(texteAvant) + '</span>' : '') +
      ordre.map(function (cle) {
        const o = OUTILS_IA[cle];
        return '<a class="btn' + (cle === choisi ? ' btn-lien-choisi' : '') + '" href="' + o.url +
          '" target="_blank" rel="noopener noreferrer">Ouvrir ' + o.nom +
          '<span class="visuellement-masque"> (nouvel onglet)</span></a>';
      }).join('') + '</div>';
  }

  const MARCHE = {
    gemini: [
      'Ouvrez Gemini dans un nouvel onglet avec le bouton ci-dessous et démarrez une nouvelle conversation.',
      'Collez la consigne (Ctrl+V) et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.',
      'Quand Gemini a terminé, cliquez sur le bouton « Copier » de son bloc de code, puis sur « J\'ai la réponse de l\'IA » ci-dessous.'
    ],
    copilot: [
      'Ouvrez Copilot dans un nouvel onglet avec le bouton ci-dessous, connectez-vous avec votre compte scolaire et démarrez une nouvelle conversation.',
      'Collez la consigne (Ctrl+V) et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.',
      'Quand Copilot a terminé, cliquez sur le bouton « Copier » de son bloc de code, puis sur « J\'ai la réponse de l\'IA » ci-dessous.'
    ]
  };

  let etat = nouvelEtat();
  let dernierContenu = null;
  /** Écran affiché : « accueil », « video », « moodle » (assistant-moodle.js), « scorm » (assistant-scorm.js) ou « examen » (assistant-examen.js). */
  let ecranCourant = 'accueil';
  /** Parcours « Banque de questions Moodle XML », chargé après ce fichier. */
  function M() { return window.MoodleAIAssistantMoodle || null; }
  /** Parcours « Corrigé interactif SCORM » et « Exercice de compréhension SCORM » (assistant-scorm.js). */
  function SC() { return window.MoodleAIAssistantScorm || null; }
  /** Parcours « Nouvelle version ou corrigé d'un examen » (assistant-examen.js). */
  function EX() { return window.MoodleAIAssistantExamen || null; }
  /** Contenu du projet, sans la date ni l'écran affiché. */
  function empreinte(e) { return JSON.stringify(Object.assign({}, e, { sauveLe: null, ecran: null })); }

  const NB_ETAPES = 4;

  function nouvelEtat() {
    return {
      numerotation: 2,
      exemple: false,
      ecran: 'accueil',
      etape: 1,
      etapeMax: 1,
      contexte: { url: '', titre: '', dureeSec: 0, niveau: '', nbQuestions: 4, outil: 'gemini', transcription: '' },
      consigneModifiee: '',
      urlValidee: '',
      reponseBrute: '',
      donnees: null
    };
  }

  /**
   * Projets sauvegardés avec l'ancien parcours en 5 étapes (vidéo, consigne, réponse,
   * aperçu, exportation) : les étapes 1 et 2 sont fusionnées.
   */
  function migrerEtapes(p) {
    if (!p || p.numerotation >= 2) return p;
    const decaler = function (n) { n = n || 1; return Math.max(1, n >= 2 ? n - 1 : n); };
    p.etape = decaler(p.etape);
    p.etapeMax = decaler(p.etapeMax);
    if (!p.urlValidee && p.contexte) p.urlValidee = p.contexte.url || '';
    p.numerotation = 2;
    return p;
  }

  // ------------------------------------------------------------------
  // Sauvegarde dans le navigateur (commodité seulement : le projet .json fait foi)
  // ------------------------------------------------------------------
  function sauver() {
    try {
      // La date ne change que si le contenu du projet a changé (pas pour un simple changement d'écran).
      const contenu = empreinte(etat);
      if (contenu !== dernierContenu) {
        etat.sauveLe = new Date().toISOString();
        dernierContenu = contenu;
      }
      localStorage.setItem(etat.exemple ? CLE_EXEMPLE : CLE_PROJET, JSON.stringify(etat));
      localStorage.setItem(CLE_DERNIER, JSON.stringify({ type: TYPE, exemple: !!etat.exemple }));
    } catch (e) { /* stockage indisponible */ }
  }
  /** Reprend les sauvegardes des premières versions du prototype (clés « moodleai.video.* »). */
  function migrer() {
    try {
      [['moodleai.video.projet', CLE_PROJET], ['moodleai.video.exemple', CLE_EXEMPLE]].forEach(function (c) {
        const ancien = localStorage.getItem(c[0]);
        if (ancien && !localStorage.getItem(c[1])) localStorage.setItem(c[1], ancien);
        localStorage.removeItem(c[0]);
      });
      const dernier = localStorage.getItem('moodleai.video.dernier');
      if (dernier && !localStorage.getItem(CLE_DERNIER)) {
        localStorage.setItem(CLE_DERNIER, JSON.stringify({ type: TYPE, exemple: dernier === 'exemple' }));
      }
      ['moodleai.video.dernier', 'moodleai.video.apercu'].forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* stockage indisponible */ }
  }
  function lireProjet(cle) {
    try {
      const brut = localStorage.getItem(cle);
      return brut ? Object.assign(nouvelEtat(), migrerEtapes(JSON.parse(brut))) : null;
    } catch (e) { return null; }
  }
  function charger() {
    migrer();
    let dernier = null;
    try { dernier = JSON.parse(localStorage.getItem(CLE_DERNIER) || 'null'); } catch (e) { dernier = null; }
    const exemple = dernier && dernier.type === TYPE && dernier.exemple;
    etat = lireProjet(exemple ? CLE_EXEMPLE : CLE_PROJET) || nouvelEtat();
    // Le dernier projet ouvert est d'un autre type : on démarre sur l'accueil.
    if (dernier && dernier.type !== TYPE) etat.ecran = 'accueil';
    dernierContenu = empreinte(etat);
  }
  /** Projet personnel commencé (l'exemple ne compte pas). */
  function projetEnCours() {
    const p = lireProjet(CLE_PROJET);
    return p && (p.contexte.url || p.reponseBrute) ? p : null;
  }

  // ------------------------------------------------------------------
  // Démarrage : exemple, nouveau projet ou reprise du projet en cours
  // ------------------------------------------------------------------
  function ouvrirParcours(etape) {
    remplirEtape1();
    afficherEcran('video');
    allerEtape(etape);
  }

  function demarrerExemple() {
    const ex = window.MoodleAIExemples && window.MoodleAIExemples.video;
    if (!ex) return;
    etat = nouvelEtat();
    etat.exemple = true;
    etat.contexte = Object.assign(etat.contexte, JSON.parse(JSON.stringify(ex.contexte)));
    etat.reponseBrute = ex.reponseIA;
    const lecture = window.MoodleAICollage.lireJson(ex.reponseIA);
    const norm = lecture.ok ? V.normaliser(lecture.valeur, etat.contexte) : null;
    etat.donnees = norm && norm.ok ? norm.donnees : null;
    etat.urlValidee = etat.contexte.url;
    etat.etapeMax = etat.donnees ? NB_ETAPES : 2;
    ouvrirParcours(1);
  }

  function demarrerNouveau() {
    if (projetEnCours() && !confirm('Un projet de vidéo interactive est déjà en cours dans ce navigateur. Le remplacer par un nouveau projet ?\n\nPour le conserver, annulez, ouvrez-le avec le bouton « Continuer » de l\'accueil et cliquez sur « Enregistrer le projet ».')) return;
    etat = nouvelEtat();
    ouvrirParcours(1);
  }

  /** Bouton « Continuer » de l'accueil : nomme le projet sauvegardé, son étape et sa date. */
  function majContinuer() {
    const p = projetEnCours();
    $('#blocContinuerVideo').hidden = !p;
    if (!p) return;
    const titre = (p.donnees && p.donnees.titre_video) || p.contexte.titre || 'projet sans titre';
    const etape = Math.min(p.etape || 1, p.etapeMax || 1);
    $('[data-demarrer="continuer"]').textContent = 'Continuer : ' + titre + ' (étape ' + etape + ' sur ' + NB_ETAPES + ')';
    $('#infoContinuerVideo').textContent = p.sauveLe
      ? 'Sauvegardé dans ce navigateur le ' + dateLisible(p.sauveLe) + '.'
      : 'Sauvegardé dans ce navigateur.';
  }

  function continuerProjet() {
    const p = projetEnCours();
    if (!p) return demarrerNouveau();
    etat = p;
    dernierContenu = empreinte(etat); // rouvrir un projet ne change pas sa date de sauvegarde
    ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
  }

  // ------------------------------------------------------------------
  // Outils
  // ------------------------------------------------------------------
  function telecharger(nom, contenu, type) {
    const blob = new Blob([contenu], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** Le navigateur permet-il de choisir le dossier et le nom du fichier (Chrome, Edge) ? */
  function choixDossierPossible() {
    return typeof window.showSaveFilePicker === 'function' && window.isSecureContext && window.self === window.top;
  }

  /**
   * Enregistre un fichier en laissant l'enseignant choisir le dossier et le nom.
   * Sans cette possibilité (Firefox, Safari), le fichier va dans Téléchargements.
   * Le contenu peut être fourni par une fonction (éventuellement asynchrone) : la fenêtre
   * s'ouvre d'abord, pendant que le clic de l'enseignant compte encore.
   * @returns {Promise<{etat: 'enregistre'|'telecharge'|'annule', nom: string}>}
   */
  function enregistrerSous(nom, contenu, type, types) {
    const produire = function () { return Promise.resolve(typeof contenu === 'function' ? contenu() : contenu); };
    if (!choixDossierPossible()) {
      return produire().then(function (c) { telecharger(nom, c, type); return { etat: 'telecharge', nom: nom }; });
    }
    let poignee;
    return window.showSaveFilePicker({ suggestedName: nom, id: 'moodleai-enregistrement', startIn: 'documents', types: types })
      .then(function (p) { poignee = p; return produire(); })
      .then(function (c) {
        return poignee.createWritable().then(function (flux) {
          return flux.write(new Blob([c], { type: type || 'text/plain;charset=utf-8' })).then(function () { return flux.close(); });
        });
      })
      .then(function () { return { etat: 'enregistre', nom: poignee.name }; })
      .catch(function (e) {
        if (e && e.name === 'AbortError') return { etat: 'annule', nom: nom };
        // Refus du navigateur (fenêtre bloquée, droits) : téléchargement classique.
        if (!poignee) return produire().then(function (c) { telecharger(nom, c, type); return { etat: 'telecharge', nom: nom }; });
        throw e;
      });
  }

  function copier(texte, statutEl) {
    const ok = function () { if (statutEl) annoncer(statutEl, 'Copié. Collez maintenant dans l\'IA (Ctrl+V).'); };
    const repli = function () {
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.select();
      let reussi = false;
      try { reussi = document.execCommand('copy'); } catch (e) { reussi = false; }
      zone.remove();
      if (reussi) ok();
      else if (statutEl) annoncer(statutEl, 'La copie automatique a échoué. Sélectionnez le texte (Ctrl+A dans la zone) et copiez-le avec Ctrl+C.');
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texte).then(ok, repli);
    } else {
      repli();
    }
  }

  function annoncer(el, msg) {
    el.textContent = '';
    setTimeout(function () { el.textContent = msg; }, 30);
  }

  function echapper(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function afficherEcran(nom) {
    ecranCourant = nom;
    $('#ecranAccueil').hidden = nom !== 'accueil';
    $('#ecranVideo').hidden = nom !== 'video';
    $('#ecranMoodle').hidden = nom !== 'moodle';
    $('#ecranScorm').hidden = nom !== 'scorm';
    $('#ecranExamen').hidden = nom !== 'examen';
    $('#btnAccueil').hidden = nom === 'accueil';
    $('#btnEnregistrer').hidden = nom === 'accueil';
    $('#bandeauExemple').hidden = !(nom === 'video' && etat.exemple);
    majContinuer();
    if (M()) M().majContinuer();
    if (SC()) SC().majContinuer();
    if (EX()) EX().majContinuer();
    // Les écrans des autres parcours sont sauvegardés par leur propre fichier.
    if (nom === 'moodle' || nom === 'scorm' || nom === 'examen') return;
    etat.ecran = nom;
    sauver();
  }

  function allerEtape(n, focus) {
    if (etat.etape === 3 && n !== 3) recupererEditions();
    if (n > etat.etapeMax) return;
    etat.etape = n;
    $$('#ecranVideo [data-panneau]').forEach(function (p) {
      p.hidden = Number(p.dataset.panneau) !== n;
    });
    if (n === 1) preparerEtape1();
    if (n === 2) preparerEtapeReponse();
    if (n === 3) preparerEtapeApercu();
    if (n === 4) preparerEtapeExport();
    $$('#ecranVideo .etapes button').forEach(function (b) {
      const k = Number(b.dataset.etape);
      b.disabled = k > etat.etapeMax;
      if (k === n) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
      b.classList.toggle('est-faite', k < etat.etapeMax && k !== n);
    });
    sauver();
    if (focus !== false) {
      const titre = $('#ecranVideo [data-panneau="' + n + '"] h2');
      if (titre) titre.focus();
    }
  }

  function debloquer(n) {
    if (n > etat.etapeMax) etat.etapeMax = n;
  }

  // ------------------------------------------------------------------
  // Étape 1 — la vidéo
  // ------------------------------------------------------------------
  function remplirEtape1() {
    const c = etat.contexte;
    $('#vUrl').value = c.url || '';
    $('#vTitre').value = c.titre || '';
    $('#vDuree').value = c.dureeSec ? V.horloge(c.dureeSec).replace(/^0(\d)/, '$1') : '';
    $('#vNiveau').value = c.niveau || '';
    $('#vNb').value = c.nbQuestions || 4;
    $('#vTranscription').value = c.transcription || '';
    if (c.transcription) $('#blocTranscription').open = true;
    $$('input[name="vOutil"]').forEach(function (r) { r.checked = r.value === (c.outil || 'gemini'); });
    majAideOutil();
  }

  function majAideOutil() {
    const outil = ($('input[name="vOutil"]:checked') || {}).value || 'gemini';
    const vimeo = !!V.idVimeo($('#vUrl').value.trim());
    $('#aideOutil').textContent = vimeo
      ? 'Ni Gemini ni Copilot ne peuvent visionner une vidéo Vimeo : la transcription ci-dessous est obligatoire.'
      : AIDE_OUTIL[outil];
    // Affiché en alerte : l'accès de l'IA à la vidéo n'est jamais garanti.
    $('#aideOutil').className = 'bandeau bandeau-avertissement aide-outil';
    // Avec Vimeo, la transcription est obligatoire : le bloc reste ouvert et le dit.
    $('#libelleTranscription').textContent = vimeo
      ? 'Transcription de la vidéo (obligatoire pour une vidéo Vimeo)'
      : 'Ajouter la transcription de la vidéo (recommandé avec Copilot)';
    $('#etapesTranscriptionYouTube').hidden = vimeo;
    $('#etapesTranscriptionVimeo').hidden = !vimeo;
    if (outil === 'copilot' || vimeo) $('#blocTranscription').open = true;
  }

  /** Lit les champs tels qu'ils sont saisis, même incomplets. */
  function lireChamps() {
    return {
      url: $('#vUrl').value.trim(),
      titre: $('#vTitre').value.trim(),
      dureeSec: V.versSecondes($('#vDuree').value) || 0,
      niveau: $('#vNiveau').value.trim(),
      nbQuestions: parseInt($('#vNb').value, 10) || etat.contexte.nbQuestions || 4,
      outil: ($('input[name="vOutil"]:checked') || {}).value || 'gemini',
      transcription: $('#vTranscription').value
    };
  }

  /** Contrôle les champs ; affiche les erreurs et renvoie false s'il y en a. */
  /** @param {boolean} sansIA Questions rédigées par l'enseignant : la transcription n'est pas exigée. */
  function controlerChamps(sansIA) {
    const erreurs = [];
    const url = $('#vUrl').value.trim();
    const dureeTexte = $('#vDuree').value.trim();
    const duree = V.versSecondes(dureeTexte);
    const nb = parseInt($('#vNb').value, 10);
    const vimeo = !!V.idVimeo(url);
    const urlOk = vimeo || !!V.idYouTube(url);
    const dureeOk = !dureeTexte || (duree && duree >= 20);
    const nbOk = nb >= 2 && nb <= 10;
    const transcriptionOk = sansIA === true || !vimeo || $('#vTranscription').value.trim().length >= 50;
    if (!urlOk) erreurs.push('Le lien n\'est pas reconnu. Il doit être celui d\'une vidéo YouTube (https://www.youtube.com/watch?v=… ou https://youtu.be/…) ou Vimeo (https://vimeo.com/…).');
    if (!dureeOk) erreurs.push('La durée doit être au format minutes:secondes (ex. : 4:38), ou laissée vide.');
    if (!nbOk) erreurs.push('Le nombre de questions doit être compris entre 2 et 10.');
    if (!transcriptionOk) erreurs.push('Pour une vidéo Vimeo, collez la transcription de la vidéo : l\'IA ne peut pas la visionner. Sans transcription, utilisez « Rédiger les questions moi-même ».');

    $$('#formVideo [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!urlOk) $('#vUrl').setAttribute('aria-invalid', 'true');
    if (!dureeOk) $('#vDuree').setAttribute('aria-invalid', 'true');
    if (!nbOk) $('#vNb').setAttribute('aria-invalid', 'true');
    if (!transcriptionOk) {
      $('#blocTranscription').open = true;
      $('#vTranscription').setAttribute('aria-invalid', 'true');
    }

    $('#erreurEtape1').innerHTML = erreurs.map(echapper).join('<br>');
    if (erreurs.length) {
      const premier = $('#formVideo [aria-invalid="true"]');
      if (premier) premier.focus();
    }
    return !erreurs.length;
  }

  /** Un champ a changé : la consigne générée suit, sauf si elle a été modifiée à la main. */
  function champsModifies(ev) {
    if (ev && ev.target && ev.target.id === 'vUrl') majAideOutil();
    etat.contexte = lireChamps();
    if (!etat.consigneModifiee) $('#texteConsigne').value = V.construireConsigne(etat.contexte);
    majMarche();
    sauver();
  }

  function majMarche() {
    const outil = etat.contexte.outil || 'gemini';
    $('#marcheConsigne').innerHTML = MARCHE[outil].map(function (l, i) {
      return '<li>' + echapper(l) + (i === 0 ? liensIA() : '') + '</li>';
    }).join('');
  }

  function majAideConsigne() {
    $('#btnRetablirConsigne').hidden = !etat.consigneModifiee;
    $('#aideConsigne').textContent = etat.consigneModifiee
      ? 'Vous avez modifié la consigne : elle ne suit plus les renseignements ci-dessus. « Rétablir la consigne d\'origine » la régénère à partir de ces renseignements.'
      : 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour préciser une notion à cibler. Gardez la section « Format de la réponse » intacte : l\'assistant en a besoin pour lire la réponse.';
  }

  /** Consigne modifiée par l'enseignant, sinon la consigne générée. */
  function consigneActuelle() {
    return etat.consigneModifiee || V.construireConsigne(etat.contexte);
  }

  function preparerEtape1() {
    majMarche();
    $('#texteConsigne').value = consigneActuelle();
    $('#texteConsigne').scrollTop = 0;
    majAideConsigne();
    $('#statutConsigne').textContent = '';
  }

  /** « J'ai la réponse de l'IA » : enregistre les renseignements et passe à l'étape 2. */
  function validerEtape1(ev) {
    ev.preventDefault();
    if (!controlerChamps()) return;
    etat.contexte = lireChamps();
    // Une vidéo différente invalide la réponse déjà vérifiée
    if (etat.donnees && etat.urlValidee && etat.urlValidee !== etat.contexte.url) {
      etat.donnees = null;
      etat.reponseBrute = '';
      etat.etapeMax = 2;
    }
    etat.urlValidee = etat.contexte.url;
    debloquer(2);
    allerEtape(2);
  }

  /**
   * « Rédiger les questions moi-même » : aucune réponse de l'IA. L'aperçu s'ouvre en mode
   * d'édition, où « Ajouter une question » crée chaque question à la position de la vidéo.
   */
  function demarrerSansIA() {
    if (!controlerChamps(true)) return;
    etat.contexte = lireChamps();
    const memeVideo = etat.urlValidee === etat.contexte.url;
    // Des questions existent déjà pour cette vidéo : on les garde.
    if (!(memeVideo && etat.donnees && etat.donnees.questions && etat.donnees.questions.length)) {
      etat.donnees = {
        titre_video: etat.contexte.titre || 'Vidéo interactive',
        duree_video_sec: etat.contexte.dureeSec || 0,
        questions: []
      };
      etat.reponseBrute = JSON.stringify(etat.donnees, null, 2);
    }
    etat.urlValidee = etat.contexte.url;
    etat.editionDemandee = true;
    etat.etapeMax = 4;
    allerEtape(3);
  }

  // ------------------------------------------------------------------
  // Étape 2 — la réponse
  // ------------------------------------------------------------------
  function preparerEtapeReponse() {
    // Pas de lien vers l'IA ici : il ouvrirait un nouvel onglet vide, sans la conversation.
    const nom = OUTILS_IA[etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini'].nom;
    $('#consigneEtape2').textContent = 'Revenez à l\'onglet de ' + nom + ' ouvert à l\'étape 1, dans la barre des onglets en haut de votre navigateur. ' +
      'Cliquez sur le bouton « Copier » du bloc de code, puis collez ici. Le texte autour du code n\'est pas un problème : l\'assistant le retire.';
    $('#reponseIA').value = etat.reponseBrute || '';
    if (etat.reponseBrute) verifier(false);
    else {
      $('#resultatVerification').innerHTML = '';
      $('#btnVersApercu').disabled = true;
    }
  }

  function liste(titre, items, classe) {
    if (!items.length) return '';
    return '<div class="bloc-resultat ' + classe + '"><h3>' + echapper(titre) + '</h3><ul>' +
      items.map(function (x) {
        return '<li>' + (x.lieu ? '<strong>' + echapper(x.lieu) + '</strong> : ' + echapper(x.msg) : echapper(x)) + '</li>';
      }).join('') + '</ul></div>';
  }

  function verifier(focus) {
    const brut = $('#reponseIA').value;
    etat.reponseBrute = brut;
    const zone = $('#resultatVerification');
    const bouton = $('#btnVersApercu');
    bouton.disabled = true;

    const lecture = window.MoodleAICollage.lireJson(brut);
    if (!lecture.ok) {
      etat.donnees = null;
      etat.etapeMax = Math.min(etat.etapeMax, 2);
      zone.innerHTML =
        '<div class="bandeau bandeau-alerte" role="alert"><strong>Réponse illisible.</strong> ' + echapper(lecture.erreur) + '</div>' +
        liste('Réparations tentées', lecture.corrections, 'bloc-info');
      sauver();
      return;
    }

    const norm = V.normaliser(lecture.valeur, etat.contexte);
    if (!norm.ok) {
      etat.donnees = null;
      zone.innerHTML = '<div class="bandeau bandeau-alerte" role="alert"><strong>Structure inattendue.</strong> ' + echapper(norm.erreur) + '</div>';
      sauver();
      return;
    }

    const verif = V.valider(norm.donnees, etat.contexte);
    etat.donnees = norm.donnees;
    const nbQ = norm.donnees.questions.length;
    const reparations = lecture.corrections.concat(norm.notes);
    let html = '';

    if (!verif.erreurs.length) {
      html += '<div class="bandeau bandeau-succes" role="status"><strong>Réponse valide.</strong> ' + nbQ +
        ' question(s) prête(s)' + (verif.avertissements.length ? ', avec ' + verif.avertissements.length + ' point(s) à surveiller.' : '.') + '</div>';
    } else {
      html += '<div class="bandeau bandeau-alerte" role="alert"><strong>' + verif.erreurs.length +
        ' règle(s) non respectée(s).</strong> Demandez une correction à l\'IA avec la consigne ci-dessous, ou corrigez à l\'étape 3 avec le mode d\'édition.</div>';
      const correction = V.consigneCorrection(verif.erreurs);
      html += '<div class="bloc-correction"><h3>Consigne de correction</h3>' +
        '<p>Copiez ce texte, retournez à l\'onglet de la conversation avec l\'IA (celui de l\'étape 1) et collez-le à la suite. Collez ensuite sa nouvelle réponse ci-dessus et vérifiez à nouveau.</p>' +
        '<pre id="texteCorrection">' + echapper(correction) + '</pre>' +
        '<div class="actions"><button type="button" class="btn btn-primary" id="btnCopierCorrection">Copier la consigne de correction</button>' +
        '<span class="statut" id="statutCorrection" role="status" aria-live="polite"></span></div></div>';
    }
    html += liste('Règles non respectées', verif.erreurs, 'bloc-alerte');
    html += liste('Points à surveiller', verif.avertissements, 'bloc-avertissement');
    html += liste('Réparations faites automatiquement', reparations, 'bloc-info');
    html += tableauQuestions(norm.donnees);
    zone.innerHTML = html;

    const btnCorr = $('#btnCopierCorrection');
    if (btnCorr) {
      btnCorr.addEventListener('click', function () {
        copier(V.consigneCorrection(verif.erreurs), $('#statutCorrection'));
      });
    }

    bouton.disabled = !nbQ;
    bouton.textContent = verif.erreurs.length ? 'Voir l\'aperçu malgré les erreurs' : 'Voir l\'aperçu';
    if (nbQ) debloquer(3);
    else etat.etapeMax = Math.min(etat.etapeMax, 2);
    sauver();
    allerEtapeNavSeule();
    if (focus !== false) {
      const premier = zone.querySelector('.bandeau');
      if (premier) { premier.setAttribute('tabindex', '-1'); premier.focus(); }
    }
  }

  function tableauQuestions(d) {
    if (!d.questions.length) return '';
    return '<div class="table-defilante"><table class="tableau-questions"><caption>Questions reçues</caption>' +
      '<thead><tr><th scope="col">Moment</th><th scope="col">Question</th><th scope="col">Bonne réponse</th><th scope="col">Retour si erreur</th></tr></thead><tbody>' +
      d.questions.map(function (q) {
        const bonne = Number.isInteger(q.index_bonne_reponse) ? q.reponses[q.index_bonne_reponse] : '';
        return '<tr><td class="nombres">' + (q.temps_apparition_sec != null ? V.horloge(q.temps_apparition_sec) : '—') + '</td>' +
          '<td>' + echapper(q.question) + '</td><td>' + echapper(bonne || '—') + '</td>' +
          '<td class="nombres">' + (q.retour_en_arriere_si_erreur_sec != null ? V.horloge(q.retour_en_arriere_si_erreur_sec) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /** Met à jour l'état des boutons d'étapes sans changer d'étape. */
  function allerEtapeNavSeule() {
    $$('#ecranVideo .etapes button').forEach(function (b) {
      b.disabled = Number(b.dataset.etape) > etat.etapeMax;
    });
  }

  // ------------------------------------------------------------------
  // Étape 3 — l'aperçu (simulateur vidéo de moteur-ui dans un cadre)
  // ------------------------------------------------------------------
  function configActuelle() {
    return V.versVideoConfig(etat.contexte, etat.donnees);
  }

  // Lue par apercu-video.html
  window.MoodleAIApercu = function () { return configActuelle(); };

  function preparerEtapeApercu() {
    if (!etat.donnees) return;
    try { localStorage.setItem(CLE_APERCU, JSON.stringify(configActuelle())); } catch (e) { /* aperçu par le parent seulement */ }
    const cadre = $('#cadreApercu');
    // Sans questions (rédaction par l'enseignant), l'aperçu s'ouvre directement en mode d'édition.
    const enEdition = etat.editionDemandee || !etat.donnees.questions.length;
    etat.editionDemandee = false;
    $('#aideApercuSansIA').hidden = !enEdition;
    cadre.onload = function () {
      if (!enEdition) return;
      try {
        const bascule = cadre.contentDocument.getElementById('btnToggleEdit');
        if (bascule && !bascule.checked) {
          bascule.checked = true;
          bascule.dispatchEvent(new Event('change'));
        }
      } catch (e) { /* cadre inaccessible */ }
    };
    cadre.src = './apercu-video.html?t=' + Date.now();
    debloquer(4);
  }

  /** Reprend les modifications faites dans le mode d'édition de l'aperçu. */
  function recupererEditions() {
    try {
      const w = $('#cadreApercu').contentWindow;
      if (!w || !w.sourceData || !Array.isArray(w.questions) || !etat.donnees) return;
      const questions = JSON.parse(JSON.stringify(w.questions)).map(function (q) {
        delete q._triggered;
        return q;
      });
      questions.sort(function (a, b) { return a.temps_apparition_sec - b.temps_apparition_sec; });
      etat.donnees.questions = questions;
      if (w.sourceData.titre_video) etat.donnees.titre_video = w.sourceData.titre_video;
      // Durée inconnue (ni saisie, ni fournie par l'IA) : celle que donne le lecteur vidéo.
      const dureeLecteur = w.VideoPlayer && w.VideoPlayer.getDuration ? Math.round(w.VideoPlayer.getDuration() || 0) : 0;
      if (!etat.donnees.duree_video_sec && dureeLecteur > 0) etat.donnees.duree_video_sec = dureeLecteur;
      etat.reponseBrute = JSON.stringify(etat.donnees, null, 2);
      sauver();
    } catch (e) {
      // Cadre inaccessible (ouverture locale file:///) : les modifications restent dans l'aperçu.
    }
  }

  // ------------------------------------------------------------------
  // Étape 4 — l'exportation
  // ------------------------------------------------------------------
  function preparerEtapeExport() {
    if (!etat.donnees) return;
    const verif = V.valider(etat.donnees, etat.contexte);
    const d = etat.donnees;
    let html = '<dl class="resume-liste">' +
      '<dt>Vidéo</dt><dd>' + echapper(d.titre_video) + '</dd>' +
      '<dt>Durée</dt><dd class="nombres">' + V.horloge(d.duree_video_sec) + '</dd>' +
      '<dt>Questions</dt><dd class="nombres">' + d.questions.length + '</dd></dl>';
    if (verif.erreurs.length) {
      html += '<div class="bandeau bandeau-avertissement" role="status"><strong>' + verif.erreurs.length +
        ' règle(s) encore non respectée(s).</strong> Le fichier peut être exporté, mais il est préférable de les corriger (étape 2 ou mode d\'édition de l\'étape 3).' +
        '<ul class="liste-erreurs">' + verif.erreurs.map(function (e) {
          return '<li><strong>' + echapper(e.lieu) + '</strong> : ' + echapper(e.msg) + '</li>';
        }).join('') + '</ul></div>';
    }
    $('#resumeExport').innerHTML = html;
    $('#statutExport').textContent = '';
    $('#aideDossierVideo').textContent = choixDossierPossible()
      ? 'Une fenêtre vous permet de choisir le dossier et le nom de chaque fichier. Le navigateur retient le dernier dossier choisi.'
      : 'Votre navigateur ne permet pas de choisir le dossier : les fichiers vont dans votre dossier Téléchargements. Avec Chrome ou Edge, une fenêtre vous permet de choisir le dossier.';
  }

  function exporterH5P() {
    if (!etat.donnees) return;
    if (!window.VideoH5PExport || !window.fflate) {
      annoncer($('#statutExport'), 'Le module d\'exportation se charge encore. Réessayez dans un instant.');
      return;
    }
    const statut = $('#statutExport');
    const config = configActuelle();
    const questions = etat.donnees.questions;
    const produire = function () {
      return new Promise(function (resolve, reject) {
        window.VideoH5PExport.exportH5PPackage(config, questions, { surFichier: resolve, surErreur: reject });
      });
    };
    enregistrerSous(nomBaseVideo() + ' — vidéo interactive.h5p', produire, 'application/zip',
      [{ description: 'Vidéo interactive H5P', accept: { 'application/zip': ['.h5p'] } }])
      .then(function (r) { annoncerEnregistrement(statut, r, 'Le fichier H5P'); })
      .catch(function (e) { annoncer(statut, 'Le fichier H5P n\'a pas pu être enregistré : ' + e.message); });
  }

  function nomBaseVideo() {
    return String(titreProjet()).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Vidéo interactive';
  }

  /** Message selon le résultat de enregistrerSous (enregistré, téléchargé ou annulé). */
  function annoncerEnregistrement(zone, r, quoi, feminin) {
    const e = feminin ? 'e' : '';
    if (r.etat === 'annule') annoncer(zone, 'Enregistrement annulé.');
    else if (r.etat === 'enregistre') annoncer(zone, quoi + ' est enregistré' + e + ' : ' + r.nom + '.');
    else annoncer(zone, quoi + ' a été téléchargé' + e + ' dans votre dossier Téléchargements.');
  }

  /** Page HTML pour l'élève : téléchargée, ou copiée pour Google Sites. */
  function exporterHTML(copie) {
    if (!etat.donnees || !window.MoodleAIExportHtml) return;
    const statut = $('#statutExportHTML');
    const echec = function (e) {
      annoncer(statut, 'La page n\'a pas pu être préparée : ' + e.message + '. L\'assistant doit être ouvert à partir d\'un site (http ou https).');
    };
    if (copie) {
      annoncer(statut, 'Préparation de la page…');
      window.MoodleAIExportHtml.construirePage(configActuelle()).then(function (page) {
        copier(page, null);
        annoncer(statut, 'Code de la page copié. Collez-le dans le code d\'intégration de Google Sites.');
      }).catch(echec);
      return;
    }
    // La fenêtre d'enregistrement s'ouvre d'abord (geste de l'utilisateur), la page se prépare ensuite.
    const config = configActuelle();
    enregistrerSous(nomBaseVideo() + ' — vidéo interactive (page élève).html',
      function () { return window.MoodleAIExportHtml.construirePage(config); },
      'text/html;charset=utf-8',
      [{ description: 'Page web', accept: { 'text/html': ['.html'] } }])
      .then(function (r) { annoncerEnregistrement(statut, r, 'La page HTML', true); })
      .catch(echec);
  }

  // ------------------------------------------------------------------
  // Enregistrement du projet (fichier étiqueté, à toute étape)
  // ------------------------------------------------------------------
  function titreProjet() {
    return (etat.donnees && etat.donnees.titre_video) || etat.contexte.titre || 'Vidéo interactive';
  }

  function enregistrerProjet(statutEl) {
    if (etat.etape === 3) recupererEditions();
    sauver();
    const contenu = {
      contexte: etat.contexte,
      numerotation: 2,
      consigneModifiee: etat.consigneModifiee,
      urlValidee: etat.urlValidee,
      reponseBrute: etat.reponseBrute,
      donnees: etat.donnees,
      etape: etat.etape,
      etapeMax: etat.etapeMax
    };
    const env = P.emballer(TYPE, titreProjet(), etat.etape, contenu);
    const zone = statutEl || $('#statutEntete');
    enregistrerSous(P.nomFichier(TYPE, titreProjet()), JSON.stringify(env, null, 2), 'application/json',
      [{ description: 'Projet de l\'assistant (JSON)', accept: { 'application/json': ['.json'] } }])
      .then(function (r) {
        if (r.etat === 'annule') annoncer(zone, 'Enregistrement annulé.');
        else if (r.etat === 'enregistre') annoncer(zone, 'Projet enregistré : ' + r.nom + '.');
        else annoncer(zone, 'Projet enregistré dans Téléchargements.');
        if (!statutEl) setTimeout(function () { zone.textContent = ''; }, 5000);
      })
      .catch(function (e) { annoncer(zone, 'Le projet n\'a pas pu être enregistré : ' + e.message); });
  }

  // ------------------------------------------------------------------
  // Reprise d'un projet : reconnaissance du type, résumé, ouverture
  // ------------------------------------------------------------------
  let repriseEnAttente = null;

  function lireFichierProjet(fichier) {
    const lecteur = new FileReader();
    lecteur.onload = function () { afficherResume(P.reconnaitre(lecteur.result), fichier.name); };
    lecteur.onerror = function () { afficherResume({ erreur: 'Le fichier n\'a pas pu être lu.' }, fichier.name); };
    lecteur.readAsText(fichier, 'utf-8');
  }

  function afficherResume(r, nom) {
    const dlg = $('#dialogueReprise');
    const corps = $('#repriseCorps');
    const ouvrir = $('#btnRepriseOuvrir');
    repriseEnAttente = null;
    let html = '<p class="reprise-fichier">Fichier : <strong>' + echapper(nom) + '</strong></p>';

    if (r.erreur) {
      html += '<div class="bandeau bandeau-alerte">' + echapper(r.erreur) + '</div>';
    } else {
      const t = P.TYPES[r.type];
      html += '<dl class="resume-liste">' +
        '<dt>Type</dt><dd>' + echapper(t.libelle) + '</dd>' +
        '<dt>Titre</dt><dd>' + echapper(r.titre || '(sans titre)') + '</dd>' +
        (r.etape ? '<dt>Étape</dt><dd class="nombres">Arrêté à l\'étape ' + r.etape + '</dd>' : '') +
        (r.enregistreLe ? '<dt>Enregistré le</dt><dd>' + echapper(dateLisible(r.enregistreLe)) + '</dd>' : '') +
        '</dl>';
      if (!t.disponible) {
        html += '<div class="bandeau bandeau-avertissement">Ce type de projet n\'est pas encore offert dans l\'application. Le fichier est reconnu, mais il ne peut pas encore être ouvert.</div>';
      } else {
        if (r.format === 'livrable') {
          html += '<p class="aide">Ce fichier provient de l\'outil de génération actuel. Il sera ouvert à l\'étape de l\'aperçu.</p>';
        }
        if (r.type === TYPE && projetEnCours()) {
          html += '<div class="bandeau bandeau-avertissement">Le projet de vidéo interactive en cours dans ce navigateur sera remplacé.</div>';
        }
        if (r.type === 'moodle-xml' && M() && M().projetEnCours()) {
          html += '<div class="bandeau bandeau-avertissement">La banque de questions en cours dans ce navigateur sera remplacée.</div>';
        }
        if (r.type === 'scorm-corrige' && SC() && SC().projetEnCours(r.type)) {
          html += '<div class="bandeau bandeau-avertissement">L\'activité interactive en cours dans ce navigateur sera remplacée.</div>';
        }
        if (r.type === 'scorm-comprehension' && SC() && SC().projetEnCours(r.type)) {
          html += '<div class="bandeau bandeau-avertissement">L\'exercice de compréhension en cours dans ce navigateur sera remplacé.</div>';
        }
        if (r.type === 'scorm-hattie' && SC() && SC().projetEnCours(r.type)) {
          html += '<div class="bandeau bandeau-avertissement">La compréhension en deux pages en cours dans ce navigateur sera remplacée.</div>';
        }
        if (r.type === 'examen' && EX() && EX().projetEnCours()) {
          html += '<div class="bandeau bandeau-avertissement">L\'examen en cours dans ce navigateur sera remplacé.</div>';
        }
        repriseEnAttente = r;
      }
    }
    corps.innerHTML = html;
    ouvrir.hidden = !repriseEnAttente;
    $('#btnRepriseAnnuler').textContent = repriseEnAttente ? 'Annuler' : 'Fermer';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    (repriseEnAttente ? ouvrir : $('#btnRepriseAnnuler')).focus();
  }

  function dateLisible(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    try { return d.toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }); } catch (e) { return d.toLocaleString(); }
  }

  function fermerDialogue() {
    const dlg = $('#dialogueReprise');
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function ouvrirReprise() {
    const r = repriseEnAttente;
    fermerDialogue();
    const parcours = r && (r.type === 'moodle-xml' ? M() : r.type === 'examen' ? EX() : (SC() && SC().TYPES.indexOf(r.type) >= 0) ? SC() : null);
    if (parcours) {
      const echec = parcours.ouvrirReprise(r);
      if (echec) afficherResume({ erreur: 'Le projet n\'a pas pu être ouvert : ' + echec + '.' }, '');
      return;
    }
    if (!r || r.type !== TYPE) return;
    try {
      let etape;
      if (r.format === 'enveloppe') {
        const p = migrerEtapes(r.projet || {});
        if (!p.contexte || typeof p.contexte !== 'object') throw new Error('Le contenu du projet est incomplet.');
        etat = nouvelEtat();
        etat.contexte = Object.assign(etat.contexte, p.contexte);
        etat.consigneModifiee = p.consigneModifiee || '';
        etat.urlValidee = p.urlValidee || etat.contexte.url;
        etat.reponseBrute = p.reponseBrute || '';
        etat.donnees = p.donnees || null;
        etat.etapeMax = Math.max(1, Math.min(NB_ETAPES, p.etapeMax || 1));
        if (!etat.donnees) etat.etapeMax = Math.min(etat.etapeMax, 2);
        etape = Math.min(p.etape || 1, etat.etapeMax);
      } else {
        const v = V.depuisVideoConfig(r.projet);
        const norm = V.normaliser(v.donnees, v.contexte);
        if (!norm.ok) throw new Error(norm.erreur);
        etat = nouvelEtat();
        etat.contexte = Object.assign(etat.contexte, v.contexte);
        etat.donnees = norm.donnees;
        etat.reponseBrute = JSON.stringify(norm.donnees, null, 2);
        etat.urlValidee = etat.contexte.url;
        etat.etapeMax = NB_ETAPES;
        etape = 3;
      }
      ouvrirParcours(etape);
    } catch (e) {
      afficherResume({ erreur: 'Le projet n\'a pas pu être ouvert : ' + e.message }, '');
    }
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------
  function init() {
    charger();

    $$('[data-demarrer]').forEach(function (b) {
      b.addEventListener('click', function () {
        const choix = b.dataset.demarrer;
        if (choix === 'exemple') demarrerExemple();
        else if (choix === 'nouveau') demarrerNouveau();
        else continuerProjet();
      });
    });
    $('#btnQuitterExemple').addEventListener('click', demarrerNouveau);
    $('#btnAccueil').addEventListener('click', function () {
      if (ecranCourant === 'video' && etat.etape === 3) recupererEditions();
      if (ecranCourant === 'moodle' && M()) M().quitter();
      if (ecranCourant === 'scorm' && SC()) SC().quitter();
      if (ecranCourant === 'examen' && EX()) EX().quitter();
      afficherEcran('accueil');
      $('#titreAccueil').focus();
    });
    $('#btnReprendre').addEventListener('click', function () { $('#fichierProjet').click(); });
    $('#fichierProjet').addEventListener('change', function () {
      if (this.files && this.files[0]) lireFichierProjet(this.files[0]);
      this.value = '';
    });
    $('#btnEnregistrer').addEventListener('click', function () {
      if (ecranCourant === 'moodle' && M()) M().enregistrerProjet();
      else if (ecranCourant === 'scorm' && SC()) SC().enregistrerProjet();
      else if (ecranCourant === 'examen' && EX()) EX().enregistrerProjet();
      else enregistrerProjet();
    });
    $('#btnRepriseOuvrir').addEventListener('click', ouvrirReprise);
    $('#btnRepriseAnnuler').addEventListener('click', fermerDialogue);

    // Glisser-déposer d'un fichier projet n'importe où dans la page
    let profondeurGlisser = 0;
    const contientFichier = function (ev) {
      return ev.dataTransfer && Array.prototype.indexOf.call(ev.dataTransfer.types || [], 'Files') >= 0;
    };
    document.addEventListener('dragenter', function (ev) {
      if (!contientFichier(ev)) return;
      profondeurGlisser++;
      document.body.classList.add('glisser-actif');
    });
    document.addEventListener('dragleave', function (ev) {
      if (!contientFichier(ev)) return;
      profondeurGlisser = Math.max(0, profondeurGlisser - 1);
      if (!profondeurGlisser) document.body.classList.remove('glisser-actif');
    });
    document.addEventListener('dragover', function (ev) {
      if (contientFichier(ev)) ev.preventDefault();
    });
    document.addEventListener('drop', function (ev) {
      if (!contientFichier(ev)) return;
      ev.preventDefault();
      profondeurGlisser = 0;
      document.body.classList.remove('glisser-actif');
      const f = ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f) lireFichierProjet(f);
    });

    $$('#ecranVideo .etapes button').forEach(function (b) {
      b.addEventListener('click', function () { allerEtape(Number(b.dataset.etape)); });
    });
    $$('[data-aller]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = Number(b.dataset.aller);
        debloquer(Math.min(n, etat.etapeMax + 1));
        allerEtape(n);
      });
    });

    $('#formVideo').addEventListener('submit', validerEtape1);
    $$('input[name="vOutil"]').forEach(function (r) { r.addEventListener('change', majAideOutil); });
    ['vUrl', 'vTitre', 'vDuree', 'vNiveau', 'vNb', 'vTranscription'].forEach(function (id) {
      $('#' + id).addEventListener('input', champsModifies);
    });
    $$('input[name="vOutil"]').forEach(function (r) { r.addEventListener('change', champsModifies); });

    $('#texteConsigne').addEventListener('input', function () {
      const texte = this.value;
      etat.consigneModifiee = texte === V.construireConsigne(etat.contexte) ? '' : texte;
      majAideConsigne();
      sauver();
    });
    $('#btnRetablirConsigne').addEventListener('click', function () {
      etat.consigneModifiee = '';
      etat.contexte = lireChamps();
      $('#texteConsigne').value = consigneActuelle();
      majAideConsigne();
      sauver();
      annoncer($('#statutConsigne'), 'La consigne d\'origine a été rétablie.');
      $('#texteConsigne').focus();
    });
    $('#btnCopierConsigne').addEventListener('click', function () {
      // Sans lien valide, la consigne ne mène à rien : on le signale avant de copier.
      if (!controlerChamps()) return;
      copier($('#texteConsigne').value, $('#statutConsigne'));
    });

    $('#btnVerifier').addEventListener('click', function () { verifier(true); });
    $('#btnSansIA').addEventListener('click', demarrerSansIA);
    $('#btnVersApercu').addEventListener('click', function () { allerEtape(3); });
    $('#btnExporterH5P').addEventListener('click', exporterH5P);
    $('#btnExporterHTML').addEventListener('click', function () { exporterHTML(false); });
    $('#btnCopierHTML').addEventListener('click', function () { exporterHTML(true); });
    $('#btnExporterProjet').addEventListener('click', function () { enregistrerProjet($('#statutExport')); });
    $('#btnNouveau').addEventListener('click', demarrerNouveau);

    window.addEventListener('beforeunload', function () {
      if (ecranCourant === 'video' && etat.etape === 3) recupererEditions();
    });

    remplirEtape1();
    if (etat.ecran === 'video') {
      afficherEcran('video');
      allerEtape(Math.min(etat.etape || 1, etat.etapeMax), false);
    } else {
      afficherEcran('accueil');
    }
  }

  /** Outils communs, réutilisés par assistant-moodle.js. */
  window.MoodleAIOutils = {
    telecharger: telecharger,
    enregistrerSous: enregistrerSous,
    choixDossierPossible: choixDossierPossible,
    copier: copier,
    annoncer: annoncer,
    echapper: echapper,
    liste: liste,
    liensIA: liensIA,
    dateLisible: dateLisible,
    afficherEcran: afficherEcran,
    MARCHE: MARCHE,
    OUTILS_IA: OUTILS_IA
  };

  document.addEventListener('DOMContentLoaded', init);
})();
