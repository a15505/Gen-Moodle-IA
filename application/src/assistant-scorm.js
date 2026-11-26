/**
 * Assistant de création — parcours SCORM : « Corrigé interactif SCORM » (scorm-corrige),
 * « Exercice de compréhension SCORM » (scorm-comprehension) et « Compréhension en deux pages (Hattie) »
 * (scorm-hattie).
 * Les trois types partagent l'écran #ecranScorm et le même déroulement, dont ils reprennent les
 * outils communs (window.MoodleAIOutils) : 1. le document et la consigne, 2. la réponse de l'IA,
 * 3. l'aperçu (activité élève du moteur SCORM de moteur-ui, dans un cadre), 4. le package SCORM.
 * Le profil actif (PROFILS) fournit l'action (consigne, vérification, conversion), les clés de
 * sauvegarde et les libellés de l'écran.
 */
(function () {
  'use strict';

  const CLE_DERNIER = 'moodleai.dernier';
  const NB_ETAPES = 4;
  const P = window.MoodleAIProjets;
  const O = function () { return window.MoodleAIOutils; };
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function marcheJoint(doc) {
    return {
      gemini: 'Collez la consigne (Ctrl+V), puis joignez ' + doc + ' (PDF, Word ou photo) avec le bouton « + » de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.',
      copilot: 'Collez la consigne (Ctrl+V), puis joignez ' + doc + ' (PDF, Word ou photo) avec le trombone de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.'
    };
  }

  /** Les types de l'écran SCORM. Les libellés sont posés sur l'écran à l'ouverture (appliquerLibelles). */
  const PROFILS = {
    'scorm-corrige': {
      type: 'scorm-corrige',
      genre: 'corrige',
      unite: 'Question',
      action: function () { return window.MoodleAIScormCorrige; },
      exemple: 'scormCorrige',
      demarrer: 'data-demarrer-scorm',
      blocContinuer: '#blocContinuerScorm',
      infoContinuer: '#infoContinuerScorm',
      sansTitre: 'corrigé sans titre',
      titreDefaut: 'Activité interactive',
      enCours: 'Une activité interactive est déjà en cours dans ce navigateur. La remplacer par un nouveau projet ?',
      avecNb: false,
      avecFormat: false,
      placeholderReponse: '{ "titre": ..., "questions": [ ... ] }',
      placeholderRetouche: '{ "type": ..., "titre": ... }',
      aideConsigne: 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour préciser le barème. Gardez les sections « Règles » et « Format de la réponse » intactes : l\'assistant en a besoin pour lire la réponse.',
      marcheJoint: marcheJoint('l\'exercice'),
      erreurSujet: 'Indiquez le sujet de l\'exercice (ex. : La concentration des solutions).',
      erreurSource: 'Collez le texte de l\'exercice (toutes ses questions), ou choisissez de joindre le document dans la conversation avec l\'IA.',
      capture: 'Faites une capture de la figure de l\'exercice',
      exempleRetouche: 'Ex. : Remplace 250 mL par 500 mL et recalcule la réponse.',
      libelles: {
        titreScorm: 'Activité interactive SCORM',
        libEtape1Scorm: 'L\'exercice et la consigne',
        titreEtape1Scorm: 'Étape 1 — Décrivez l\'exercice et donnez la consigne à l\'IA',
        libSujetScorm: 'Sujet de l\'exercice',
        aideSujetScorm: 'Il devient le titre de l\'activité dans Moodle, suivi de « Activité interactive ».',
        legendeSourceScorm: 'Exercice à corriger',
        libJointScorm: 'Je joindrai l\'exercice (PDF, Word ou photo) dans la conversation avec l\'IA',
        libColleScorm: 'Je colle le texte de l\'exercice ici',
        libTexteSourceScorm: 'Texte de l\'exercice',
        texteEtape3Scorm: 'Répondez aux questions : l\'Assistant donne la rétroaction et, en cas d\'erreur, la démarche s\'affiche sous la question. « Consulter le corrigé » montre la solution de chaque question sans y répondre. Pour corriger un texte, revenez à l\'étape 2 : demandez une correction à l\'IA ou modifiez la réponse collée.',
        aideProjetScorm: 'Le fichier projet (.json) vous permet de modifier le corrigé plus tard, sur n\'importe quel ordinateur, avec le bouton « Ouvrir un fichier projet ».',
        btnNouveauScorm: 'Créer un autre corrigé'
      },
      espaces: {
        sSujet: 'Ex. : La concentration des solutions',
        sTexteSource: 'Collez ici toutes les questions de l\'exercice, avec leurs données et le barème...',
        sPrecisions: 'Ex. : barème de 20 points ; laisser de côté la question 5.'
      }
    },
    'scorm-comprehension': {
      type: 'scorm-comprehension',
      genre: 'comprehension',
      unite: 'Question',
      action: function () { return window.MoodleAIScormComprehension; },
      exemple: 'scormComprehension',
      demarrer: 'data-demarrer-comp',
      blocContinuer: '#blocContinuerComp',
      infoContinuer: '#infoContinuerComp',
      sansTitre: 'exercice sans titre',
      titreDefaut: 'Exercice de compréhension',
      enCours: 'Un exercice de compréhension est déjà en cours dans ce navigateur. Le remplacer par un nouveau projet ?',
      avecNb: true,
      avecFormat: false,
      placeholderReponse: '{ "titre": ..., "questions": [ { "citation": ..., "question": "Pourquoi ... ?" } ] }',
      placeholderRetouche: '{ "titre": ..., "citation": ... }',
      aideConsigne: 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour cibler une notion ou écarter une section. Gardez les sections « Règles » et « Format de la réponse » intactes : l\'assistant en a besoin pour lire la réponse.',
      marcheJoint: marcheJoint('le texte'),
      erreurSujet: 'Indiquez le sujet du texte (ex. : Le système digestif et la nutrition).',
      erreurSource: 'Collez le texte à lire (au moins quelques paragraphes), ou choisissez de joindre le document dans la conversation avec l\'IA.',
      capture: 'Faites une capture de la figure du texte',
      exempleRetouche: 'Ex. : Rends la deuxième chance plus simple ; remplace un distracteur par la confusion entre digestion et absorption.',
      libelles: {
        titreScorm: 'Exercice de compréhension SCORM',
        libEtape1Scorm: 'Le texte et la consigne',
        titreEtape1Scorm: 'Étape 1 — Décrivez le texte et donnez la consigne à l\'IA',
        libSujetScorm: 'Sujet du texte',
        aideSujetScorm: 'Il devient le titre de l\'activité dans Moodle, suivi de « Exercice de compréhension ».',
        legendeSourceScorm: 'Texte à lire',
        libJointScorm: 'Je joindrai le texte (PDF, Word ou photo) dans la conversation avec l\'IA',
        libColleScorm: 'Je colle le texte ici',
        libTexteSourceScorm: 'Texte à lire',
        texteEtape3Scorm: 'Lisez l\'extrait et répondez à chaque question : l\'Assistant donne la rétroaction et, en cas d\'erreur, l\'explication s\'affiche sous la question avec une question guidée (deuxième chance). « Consulter le corrigé » montre la bonne réponse de chaque question. Pour corriger un texte, revenez à l\'étape 2 ou retouchez la question avec l\'IA dans la colonne de droite.',
        aideProjetScorm: 'Le fichier projet (.json) vous permet de modifier l\'exercice plus tard, sur n\'importe quel ordinateur, avec le bouton « Ouvrir un fichier projet ».',
        btnNouveauScorm: 'Créer un autre exercice',
        libNbScorm: 'Nombre de questions',
        aideNbScorm: 'Une question par notion clé du texte, de 2 points chacune ; la deuxième chance rapporte la moitié des points.'
      },
      espaces: {
        sSujet: 'Ex. : Le système digestif et la nutrition',
        sTexteSource: 'Collez ici le texte de la lecture ou des notes de cours, avec les titres des sections...',
        sPrecisions: 'Ex. : insister sur le rôle des enzymes ; laisser de côté la dernière section.'
      }
    },
    'scorm-hattie': {
      type: 'scorm-hattie',
      genre: 'hattie',
      unite: 'Station',
      action: function () { return window.MoodleAIScormHattie; },
      exemple: 'scormHattie',
      demarrer: 'data-demarrer-hattie',
      blocContinuer: '#blocContinuerHattie',
      infoContinuer: '#infoContinuerHattie',
      sansTitre: 'exercice sans titre',
      titreDefaut: 'Exercice de compréhension',
      enCours: 'Une compréhension en deux pages est déjà en cours dans ce navigateur. La remplacer par un nouveau projet ?',
      avecNb: true,
      avecFormat: true,
      placeholderReponse: '{ "titre": ..., "criteres": [ ... ], "stations": [ { "narration": [ ... ], "question": ... } ] }',
      placeholderRetouche: '{ "titre": ..., "narration": ..., "question": ... }',
      aideConsigne: 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour cibler une habileté ou une erreur fréquente. Gardez les sections « Analyse préalable », « Page 1 », « Page 2 » et « Format de la réponse » intactes : l\'assistant en a besoin pour lire la réponse.',
      marcheJoint: marcheJoint('le document'),
      erreurSujet: 'Indiquez le sujet du document (ex. : La concentration des solutions).',
      erreurSource: 'Collez le texte du document (au moins quelques paragraphes), ou choisissez de le joindre dans la conversation avec l\'IA.',
      capture: 'Faites une capture du schéma voulu',
      exempleRetouche: 'Ex. : Ajoute un distracteur de transfert ; simplifie la narration du deuxième paragraphe.',
      libelles: {
        titreScorm: 'Compréhension en deux pages (Hattie)',
        libEtape1Scorm: 'Le document et la consigne',
        titreEtape1Scorm: 'Étape 1 — Décrivez le document et donnez la consigne à l\'IA',
        libSujetScorm: 'Sujet du document',
        aideSujetScorm: 'Il devient le titre de l\'activité dans Moodle, suivi de « Exercice de compréhension ».',
        legendeSourceScorm: 'Document de cours',
        libJointScorm: 'Je joindrai le document (PDF, Word ou photo) dans la conversation avec l\'IA',
        libColleScorm: 'Je colle le texte du document ici',
        libTexteSourceScorm: 'Texte du document',
        texteEtape3Scorm: 'Chaque station commence par sa page de présentation : écoutez la narration (voix de l\'appareil) ou lisez-la, puis passez à la question. Après une erreur, l\'analyse du raisonnement et l\'explication en trois temps s\'affichent sous la question, avec une question guidée. « Consulter le corrigé » montre la bonne réponse et la démarche. Ajoutez le schéma de chaque présentation dans la colonne de droite.',
        aideProjetScorm: 'Le fichier projet (.json) vous permet de modifier l\'exercice plus tard, sur n\'importe quel ordinateur, avec le bouton « Ouvrir un fichier projet ».',
        btnNouveauScorm: 'Créer un autre exercice',
        libNbScorm: 'Nombre de stations',
        aideNbScorm: 'Une station par habileté majeure (5 à 8 conseillées), de 3 points chacune ; la question guidée rapporte 1 point.'
      },
      espaces: {
        sSujet: 'Ex. : La concentration des solutions',
        sTexteSource: 'Collez ici les notes de cours ou le chapitre, avec les titres des sections...',
        sPrecisions: 'Ex. : insister sur la conversion des mL en L ; inclure une station sur la dilution.'
      }
    }
  };

  let profil = PROFILS['scorm-corrige'];
  let S = profil.action();
  function cleProjet(type) { return 'moodleai.' + type + '.projet'; }
  function cleExemple(type) { return 'moodleai.' + type + '.exemple'; }
  function choisirProfil(type) {
    profil = PROFILS[type] || PROFILS['scorm-corrige'];
    S = profil.action();
  }
  function genre() { return profil.genre; }

  /** Côté le plus long d'une image ajoutée : au-delà, elle est réduite (poids du package). */
  const TAILLE_MAX_IMAGE = 1200;

  let etat = nouvelEtat();
  let dernierContenu = null;
  let alerteStockage = false;
  let corrigeVisible = false;
  /** Question affichée dans l'aperçu (null : écran d'accueil ou de fin). La colonne « Images » la suit. */
  let indexCourant = null;
  /** Retouche par l'IA, par identifiant de question : textes en cours, version d'avant, dernier résultat. */
  const brouillonsRetouche = {};
  const annulationsRetouche = {};
  let messageRetouche = null;
  const DERNIER_AU_CHARGEMENT = (function () {
    try { return JSON.parse(localStorage.getItem(CLE_DERNIER) || 'null'); } catch (e) { return null; }
  })();

  function nouvelEtat() {
    return {
      exemple: false,
      ecran: 'accueil',
      etape: 1,
      etapeMax: 1,
      contexte: { sujet: '', niveau: '', nb: 6, format: 'narration', outil: 'gemini', source: 'joint', texteSource: '', precisions: '' },
      consigneModifiee: '',
      reponseBrute: '',
      donnees: null
    };
  }
  function empreinte(e) { return JSON.stringify(Object.assign({}, e, { sauveLe: null, ecran: null })); }

  // ------------------------------------------------------------------
  // Sauvegarde dans le navigateur
  // ------------------------------------------------------------------
  /**
   * Enregistrements de voix (MP3 en data:, environ 0,5 Mo par minute) : trop lourds pour localStorage (5 Mo),
   * ils sont gardés dans IndexedDB, une entrée par projet { idStation: data:audio/mpeg… }. Dans localStorage,
   * la station porte « idb » à la place ; restaurerAudios remet le son à la reprise.
   */
  const MARQUE_AUDIO = 'idb';
  const BaseAudio = (function () {
    let ouverture = null;
    function ouvrir() {
      if (ouverture) return ouverture;
      ouverture = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('IndexedDB indisponible')); return; }
        const r = indexedDB.open('moodleai-audio', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('projets'); };
        r.onsuccess = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
      });
      ouverture.catch(function () { ouverture = null; });
      return ouverture;
    }
    function operation(mode, f) {
      return ouvrir().then(function (bd) {
        return new Promise(function (resolve, reject) {
          const t = bd.transaction('projets', mode);
          const req = f(t.objectStore('projets'));
          t.oncomplete = function () { resolve(req.result); };
          t.onerror = function () { reject(t.error); };
          t.onabort = function () { reject(t.error); };
        });
      });
    }
    return {
      ecrire: function (cle, valeur) { return operation('readwrite', function (s) { return s.put(valeur, cle); }); },
      lire: function (cle) { return operation('readonly', function (s) { return s.get(cle); }); }
    };
  })();
  const signaturesAudio = {};
  let alerteAudio = false;
  /** Reprise en cours des enregistrements (enregistrer le projet ou le package l'attend). */
  let restauration = Promise.resolve();

  function sauverAudios(cle) {
    const qs = (etat.donnees && etat.donnees.questions) || [];
    // Son pas encore remis (« idb ») : rien n'est écrit, pour ne pas effacer les enregistrements gardés.
    if (qs.some(function (q) { return q.audio === MARQUE_AUDIO; })) return;
    const audios = {};
    qs.forEach(function (q) { if (/^data:audio\//.test(q.audio || '')) audios[q.id] = q.audio; });
    const signature = Object.keys(audios).map(function (k) { return k + ':' + audios[k].length + ':' + audios[k].slice(-24); }).join('|');
    if (signaturesAudio[cle] === signature) return;
    signaturesAudio[cle] = signature;
    BaseAudio.ecrire(cle, audios).catch(function () {
      if (!alerteAudio && O()) {
        alerteAudio = true;
        O().annoncer($('#statutEntete'), 'Les enregistrements de voix ne peuvent pas être gardés dans ce navigateur : utilisez « Enregistrer le projet ».');
      }
    });
  }

  /** Remet les enregistrements gardés dans IndexedDB sur les stations marquées « idb ». */
  function restaurerAudios(e, cle) {
    const qs = ((e.donnees && e.donnees.questions) || []).filter(function (q) { return q.audio === MARQUE_AUDIO; });
    if (!qs.length) return Promise.resolve();
    const oublier = function (q) { delete q.audio; delete q.audioDuree; delete q.audioTexte; };
    restauration = BaseAudio.lire(cle).then(function (audios) {
      qs.forEach(function (q) { if (audios && audios[q.id]) q.audio = audios[q.id]; else oublier(q); });
    }, function () { qs.forEach(oublier); }).then(function () {
      if (etat !== e) return;
      if (etat.etape === 3 && etat.ecran === 'scorm') chargerApercu();
      if (etat.etape === 4 && etat.ecran === 'scorm') preparerEtapeExport();
    });
    return restauration;
  }

  function sauver() {
    const contenu = empreinte(etat);
    if (contenu !== dernierContenu) {
      etat.sauveLe = new Date().toISOString();
      dernierContenu = contenu;
    }
    const cle = etat.exemple ? cleExemple(profil.type) : cleProjet(profil.type);
    sauverAudios(cle);
    try {
      localStorage.setItem(cle, JSON.stringify(etat, function (k, v) {
        return k === 'audio' && typeof v === 'string' && /^data:audio\//.test(v) ? MARQUE_AUDIO : v;
      }));
      localStorage.setItem(CLE_DERNIER, JSON.stringify({ type: profil.type, exemple: !!etat.exemple }));
      alerteStockage = false;
    } catch (e) {
      if (!alerteStockage && O()) {
        alerteStockage = true;
        O().annoncer($('#statutEntete'), 'Sauvegarde automatique impossible (images trop lourdes) : utilisez « Enregistrer le projet ».');
      }
    }
  }
  function lireProjet(cle) {
    try {
      const brut = localStorage.getItem(cle);
      if (!brut) return null;
      const p = JSON.parse(brut);
      const e = Object.assign(nouvelEtat(), p);
      e.contexte = Object.assign(nouvelEtat().contexte, p.contexte || {});
      return e;
    } catch (e) { return null; }
  }
  /** @param {string} [type] Type de projet ; par défaut, celui du profil actif. */
  function projetEnCours(type) {
    const p = lireProjet(cleProjet(type || profil.type));
    return p && (p.contexte.sujet || p.reponseBrute || p.donnees) ? p : null;
  }

  /** Libellés propres au type (titre de l'écran, étape 1, aides) posés sur l'écran partagé. */
  function appliquerLibelles() {
    Object.keys(profil.libelles).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = profil.libelles[id];
    });
    Object.keys(profil.espaces).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.placeholder = profil.espaces[id];
    });
    $('#champNbScorm').hidden = !profil.avecNb;
    $('#champFormatScorm').hidden = !profil.avecFormat;
    $('#reponseIAScorm').placeholder = profil.placeholderReponse;
  }

  // ------------------------------------------------------------------
  // Démarrage
  // ------------------------------------------------------------------
  function ouvrirParcours(etape) {
    // Projets antérieurs : « Sujet — Corrigé interactif » devient « Sujet — Activité interactive ».
    if (etat.donnees && etat.donnees.titre) etat.donnees.titre = S.titreComplet(etat.donnees.titre);
    if (etat.donnees && S.MODE) etat.donnees.mode = S.MODE;
    if (etat.donnees && S.PRESENTATION) etat.donnees.presentation = S.PRESENTATION;
    appliquerLibelles();
    remplirEtape1();
    etat.ecran = 'scorm';
    O().afficherEcran('scorm');
    $('#bandeauExempleScorm').hidden = !etat.exemple;
    allerEtape(etape);
  }

  function demarrerExemple(type) {
    choisirProfil(type);
    const ex = window.MoodleAIExemples && window.MoodleAIExemples[profil.exemple];
    if (!ex || !S) return;
    etat = nouvelEtat();
    etat.exemple = true;
    etat.contexte = Object.assign(etat.contexte, JSON.parse(JSON.stringify(ex.contexte)));
    etat.reponseBrute = ex.reponseIA;
    const lecture = window.MoodleAICollage.lireJson(ex.reponseIA);
    const norm = lecture.ok ? S.normaliser(lecture.valeur, etat.contexte) : null;
    etat.donnees = norm && norm.ok ? norm.donnees : null;
    etat.etapeMax = etat.donnees ? NB_ETAPES : 2;
    ouvrirParcours(1);
    appliquerImagesExemple(ex);
    appliquerAudiosExemple(ex);
  }

  function demarrerNouveau(type) {
    choisirProfil(type || profil.type);
    if (projetEnCours() && !confirm(profil.enCours + '\n\nPour le conserver, annulez, ouvrez-le avec le bouton « Continuer » de l\'accueil et cliquez sur « Enregistrer le projet ».')) return;
    etat = nouvelEtat();
    ouvrirParcours(1);
  }

  function continuerProjet(type) {
    choisirProfil(type);
    const p = projetEnCours();
    if (!p) return demarrerNouveau(type);
    etat = p;
    restaurerAudios(etat, cleProjet(profil.type));
    dernierContenu = empreinte(etat);
    ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
  }

  /** Bouton « Continuer » de chaque carte SCORM de l'accueil. */
  function majContinuer() {
    Object.keys(PROFILS).forEach(function (type) {
      const pr = PROFILS[type];
      const bloc = $(pr.blocContinuer);
      if (!bloc) return;
      const p = projetEnCours(type);
      bloc.hidden = !p;
      if (!p) return;
      const titre = (p.donnees && p.donnees.titre) || p.contexte.sujet || pr.sansTitre;
      const etape = Math.min(p.etape || 1, p.etapeMax || 1);
      $('[' + pr.demarrer + '="continuer"]').textContent = 'Continuer : ' + titre + ' (étape ' + etape + ' sur ' + NB_ETAPES + ')';
      $(pr.infoContinuer).textContent = p.sauveLe
        ? 'Sauvegardé dans ce navigateur le ' + O().dateLisible(p.sauveLe) + '.'
        : 'Sauvegardé dans ce navigateur.';
    });
  }

  function quitter() {
    etat.ecran = 'accueil';
    sauver();
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function allerEtape(n, focus) {
    if (n > etat.etapeMax) return;
    etat.etape = n;
    $$('#ecranScorm [data-panneau-scorm]').forEach(function (p) {
      p.hidden = Number(p.dataset.panneauScorm) !== n;
    });
    if (n === 1) preparerEtape1();
    if (n === 2) preparerEtapeReponse();
    if (n === 3) preparerEtapeApercu();
    else {
      $('#cadreApercuScorm').removeAttribute('srcdoc');
      if (window.MoodleAIEnregistreurVoix) window.MoodleAIEnregistreurVoix.arreterTout();
    }
    if (n === 4) preparerEtapeExport();
    majNavigation(n);
    sauver();
    if (focus !== false) {
      const titre = $('#ecranScorm [data-panneau-scorm="' + n + '"] h2');
      if (titre) titre.focus();
    }
  }

  function majNavigation(n) {
    $$('#ecranScorm .etapes button').forEach(function (b) {
      const k = Number(b.dataset.etapeScorm);
      b.disabled = k > etat.etapeMax;
      if (n != null) {
        if (k === n) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
        b.classList.toggle('est-faite', k < etat.etapeMax && k !== n);
      }
    });
  }

  function debloquer(n) { if (n > etat.etapeMax) etat.etapeMax = n; }

  // ------------------------------------------------------------------
  // Étape 1 — l'exercice et la consigne
  // ------------------------------------------------------------------
  function remplirEtape1() {
    const c = etat.contexte;
    $('#sSujet').value = c.sujet || '';
    $('#sNiveau').value = c.niveau || '';
    $('#sNb').value = c.nb || 6;
    $('#sTexteSource').value = c.texteSource || '';
    $('#sPrecisions').value = c.precisions || '';
    if (c.precisions) $('#blocPrecisionsScorm').open = true;
    $$('input[name="sOutil"]').forEach(function (r) { r.checked = r.value === (c.outil || 'gemini'); });
    $$('input[name="sSource"]').forEach(function (r) { r.checked = r.value === (c.source || 'joint'); });
    $$('input[name="sFormat"]').forEach(function (r) { r.checked = r.value === (c.format || 'narration'); });
    $('#blocTexteSource').hidden = c.source !== 'colle';
  }

  function lireChamps() {
    return {
      sujet: $('#sSujet').value.trim(),
      niveau: $('#sNiveau').value.trim(),
      nb: Math.max(2, Math.min(15, parseInt($('#sNb').value, 10) || 6)),
      format: ($('input[name="sFormat"]:checked') || {}).value || 'narration',
      outil: ($('input[name="sOutil"]:checked') || {}).value || 'gemini',
      source: ($('input[name="sSource"]:checked') || {}).value || 'joint',
      texteSource: $('#sTexteSource').value,
      precisions: $('#sPrecisions').value
    };
  }

  function contexteConsigne(c) {
    return Object.assign({}, c, { texteSource: c.source === 'colle' ? c.texteSource : '' });
  }

  function controlerChamps() {
    const erreurs = [];
    const c = lireChamps();
    const sujetOk = !!c.sujet;
    const sourceOk = c.source !== 'colle' || c.texteSource.trim().length >= 100;
    if (!sujetOk) erreurs.push(profil.erreurSujet);
    if (!sourceOk) erreurs.push(profil.erreurSource);
    $$('#formScorm [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!sujetOk) $('#sSujet').setAttribute('aria-invalid', 'true');
    if (!sourceOk) $('#sTexteSource').setAttribute('aria-invalid', 'true');
    $('#erreurEtape1Scorm').innerHTML = erreurs.map(O().echapper).join('<br>');
    if (erreurs.length) {
      const premier = $('#formScorm [aria-invalid="true"]');
      if (premier) premier.focus();
    }
    return !erreurs.length;
  }

  function consigneGeneree() { return S.construireConsigne(contexteConsigne(etat.contexte)); }
  function consigneActuelle() { return etat.consigneModifiee || consigneGeneree(); }

  function champsModifies() {
    etat.contexte = lireChamps();
    $('#blocTexteSource').hidden = etat.contexte.source !== 'colle';
    if (!etat.consigneModifiee) $('#texteConsigneScorm').value = consigneGeneree();
    majMarche();
    sauver();
  }

  function majMarche() {
    const c = etat.contexte;
    const outil = c.outil === 'copilot' ? 'copilot' : 'gemini';
    const etapes = O().MARCHE[outil].slice();
    if (c.source !== 'colle') etapes[1] = profil.marcheJoint[outil];
    $('#marcheConsigneScorm').innerHTML = etapes.map(function (l, i) {
      return '<li>' + O().echapper(l) + (i === 0 ? O().liensIA('', outil) : '') + '</li>';
    }).join('');
  }

  function majAideConsigne() {
    $('#btnRetablirConsigneScorm').hidden = !etat.consigneModifiee;
    $('#aideConsigneScorm').textContent = etat.consigneModifiee
      ? 'Vous avez modifié la consigne : elle ne suit plus les renseignements ci-dessus. « Rétablir la consigne d\'origine » la régénère à partir de ces renseignements.'
      : profil.aideConsigne;
  }

  function preparerEtape1() {
    majMarche();
    $('#texteConsigneScorm').value = consigneActuelle();
    $('#texteConsigneScorm').scrollTop = 0;
    majAideConsigne();
    $('#statutConsigneScorm').textContent = '';
  }

  function validerEtape1(ev) {
    ev.preventDefault();
    if (!controlerChamps()) return;
    etat.contexte = lireChamps();
    debloquer(2);
    allerEtape(2);
  }

  // ------------------------------------------------------------------
  // Étape 2 — la réponse
  // ------------------------------------------------------------------
  function preparerEtapeReponse() {
    const nom = O().OUTILS_IA[etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini'].nom;
    $('#consigneEtape2Scorm').textContent = 'Revenez à l\'onglet de ' + nom + ' ouvert à l\'étape 1, dans la barre des onglets en haut de votre navigateur. ' +
      'Cliquez sur le bouton « Copier » du bloc de code, puis collez ici. Le texte autour du code n\'est pas un problème : l\'assistant le retire.';
    $('#reponseIAScorm').value = etat.reponseBrute || '';
    if (etat.reponseBrute) verifier(false, true);
    else {
      $('#resultatVerificationScorm').innerHTML = '';
      $('#btnVersApercuScorm').disabled = true;
    }
  }

  /**
   * @param {boolean} focus Place le focus sur le résultat.
   * @param {boolean} conserver Réponse déjà vérifiée (retour à l'étape 2) : les images ajoutées sont gardées.
   */
  function verifier(focus, conserver) {
    const brut = $('#reponseIAScorm').value;
    const zone = $('#resultatVerificationScorm');
    const bouton = $('#btnVersApercuScorm');
    const ech = O().echapper;
    bouton.disabled = true;

    const lecture = window.MoodleAICollage.lireJson(brut);
    if (!lecture.ok) {
      if (!conserver) { etat.donnees = null; etat.etapeMax = Math.min(etat.etapeMax, 2); }
      etat.reponseBrute = brut;
      zone.innerHTML = '<div class="bandeau bandeau-alerte" role="alert"><strong>Réponse illisible.</strong> ' + ech(lecture.erreur) + '</div>' +
        O().liste('Réparations tentées', lecture.corrections, 'bloc-info');
      if (conserver && etat.donnees) bouton.disabled = false;
      sauver();
      return;
    }
    const norm = S.normaliser(lecture.valeur, etat.contexte);
    if (!norm.ok) {
      if (!conserver) etat.donnees = null;
      etat.reponseBrute = brut;
      zone.innerHTML = '<div class="bandeau bandeau-alerte" role="alert"><strong>Structure inattendue.</strong> ' + ech(norm.erreur) + '</div>';
      sauver();
      return;
    }

    // Les images et les enregistrements de voix déjà ajoutés sont repris pour les questions de même titre.
    const anciennes = {};
    ((etat.donnees && etat.donnees.questions) || []).forEach(function (q) {
      if (q.image || q.audio) anciennes[q.titre] = q;
    });
    norm.donnees.questions.forEach(function (q) {
      const a = anciennes[q.titre];
      if (a && a.image) { q.image = a.image; q.imageAlt = a.imageAlt; }
      if (voixReprise(a, q)) { q.audio = a.audio; q.audioDuree = a.audioDuree; q.audioTexte = a.audioTexte; q.audioExemple = a.audioExemple; }
    });
    const nouvelle = !conserver || brut !== etat.reponseBrute || !etat.donnees;
    etat.donnees = norm.donnees;
    etat.reponseBrute = brut;

    const d = etat.donnees;
    const verif = S.valider(d, etat.contexte);
    const nbQ = d.questions.length;
    let html = '';
    if (!verif.erreurs.length) {
      html += '<div class="bandeau bandeau-succes" role="status"><strong>Réponse valide.</strong> ' + nbQ +
        ' ' + profil.unite.toLowerCase() + '(s) prête(s), ' + S.totalPoints(d) + ' points au total' +
        (verif.avertissements.length ? ', avec ' + verif.avertissements.length + ' point(s) à surveiller.' : '.') + '</div>';
    } else {
      html += '<div class="bandeau bandeau-alerte" role="alert"><strong>' + verif.erreurs.length +
        ' règle(s) non respectée(s).</strong> Demandez une correction à l\'IA avec la consigne ci-dessous, ou corrigez directement le texte de la réponse ci-dessus, puis vérifiez à nouveau.</div>';
      html += '<div class="bloc-correction"><h3>Consigne de correction</h3>' +
        '<p>Copiez ce texte, retournez à l\'onglet de la conversation avec l\'IA (celui de l\'étape 1) et collez-le à la suite. Collez ensuite sa nouvelle réponse ci-dessus et vérifiez à nouveau.</p>' +
        '<pre>' + ech(S.consigneCorrection(verif.erreurs)) + '</pre>' +
        '<div class="actions"><button type="button" class="btn btn-primary" id="btnCopierCorrectionScorm">Copier la consigne de correction</button>' +
        '<span class="statut" id="statutCorrectionScorm" role="status" aria-live="polite"></span></div></div>';
    }
    html += O().liste('Règles non respectées', verif.erreurs, 'bloc-alerte');
    html += O().liste('Points à surveiller', verif.avertissements, 'bloc-avertissement');
    if (nouvelle) html += O().liste('Réparations faites automatiquement', lecture.corrections.concat(norm.notes), 'bloc-info');
    html += tableauQuestions(d);
    zone.innerHTML = html;

    const btnCorr = $('#btnCopierCorrectionScorm');
    if (btnCorr) btnCorr.addEventListener('click', function () {
      O().copier(S.consigneCorrection(verif.erreurs), $('#statutCorrectionScorm'));
    });

    bouton.disabled = !nbQ;
    bouton.textContent = verif.erreurs.length ? 'Voir l\'aperçu malgré les erreurs' : 'Voir l\'aperçu';
    if (nbQ) debloquer(3);
    else etat.etapeMax = Math.min(etat.etapeMax, 2);
    sauver();
    majNavigation();
    if (focus !== false) {
      const premier = zone.querySelector('.bandeau');
      if (premier) { premier.setAttribute('tabindex', '-1'); premier.focus(); }
    }
  }

  function tableauQuestions(d) {
    if (!d.questions.length) return '';
    const ech = O().echapper;
    const court = function (t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n - 3) + '…' : t; };
    if (genre() === 'hattie') {
      return '<div class="table-defilante"><table class="tableau-questions"><caption>Stations reçues</caption>' +
        '<thead><tr><th scope="col">Titre</th><th scope="col">Points</th><th scope="col">Présentation</th><th scope="col">Démarche</th><th scope="col">Deuxième chance</th><th scope="col">Question</th></tr></thead><tbody>' +
        d.questions.map(function (q) {
          const pres = (q.narration || []).length ? 'Narrée' : ((q.contenu || []).length ? 'Écrite' : '—');
          return '<tr><td>' + ech(q.titre || '—') + '</td><td class="nombres">' + q.points + '</td>' +
            '<td>' + pres + '</td><td>' + (q.demarche ? 'Oui' : '—') + '</td>' +
            '<td>' + (q.remediation ? 'Oui' : '—') + '</td><td>' + ech(court(q.question, 110) || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (genre() === 'comprehension') {
      return '<div class="table-defilante"><table class="tableau-questions"><caption>Questions reçues</caption>' +
        '<thead><tr><th scope="col">Titre</th><th scope="col">Points</th><th scope="col">Deuxième chance</th><th scope="col">Citation</th><th scope="col">Question</th></tr></thead><tbody>' +
        d.questions.map(function (q) {
          return '<tr><td>' + ech(q.titre || '—') + '</td><td class="nombres">' + q.points + '</td>' +
            '<td>' + (q.remediation ? 'Oui' : '—') + '</td>' +
            '<td>' + ech(court(q.citation, 110) || '—') + '</td><td>' + ech(court(q.question, 110) || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return '<div class="table-defilante"><table class="tableau-questions"><caption>Questions reçues</caption>' +
      '<thead><tr><th scope="col">Type</th><th scope="col">Titre</th><th scope="col">Points</th><th scope="col">Démarche</th><th scope="col">Énoncé</th></tr></thead><tbody>' +
      d.questions.map(function (q) {
        let enonce = S.enTexte(q.question);
        if (enonce.length > 140) enonce = enonce.slice(0, 137) + '…';
        return '<tr><td>' + ech(S.LIBELLES[q.type] || q.type) + '</td><td>' + ech(q.titre || '—') + '</td>' +
          '<td class="nombres">' + q.points + '</td><td>' + (q.explicationDemarche ? 'Oui' : '—') + '</td>' +
          '<td>' + ech(enonce || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------------
  // Étape 3 — l'aperçu (activité élève du moteur SCORM, dans un cadre)
  // ------------------------------------------------------------------
  /** Le cadre garde sa hauteur : scorm_api.js l'agrandirait à la hauteur du contenu, comme dans Moodle. */
  function verrouillerCadre(cadre) {
    if (cadre._verrouille) return;
    cadre._verrouille = true;
    const definir = cadre.style.setProperty.bind(cadre.style);
    cadre.style.setProperty = function (p, v, prio) {
      if (p === 'height' || p === 'min-height' || p === 'overflow') return;
      return definir(p, v, prio);
    };
    try {
      ['height', 'minHeight'].forEach(function (p) {
        Object.defineProperty(cadre.style, p, { get: function () { return ''; }, set: function () {}, configurable: true });
      });
    } catch (e) { /* propriétés non redéfinissables : la feuille de style l'emporte quand même */ }
    const attribut = cadre.setAttribute.bind(cadre);
    cadre.setAttribute = function (nom, valeur) {
      if (nom === 'scrolling') return;
      return attribut(nom, valeur);
    };
  }

  /** Le document de l'activité défile dans le cadre (le moteur masque son défilement pour Moodle). */
  function permettreDefilement() {
    try {
      const doc = $('#cadreApercuScorm').contentDocument;
      if (!doc || !doc.body) return;
      doc.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      doc.body.style.setProperty('overflow-y', 'auto', 'important');
    } catch (e) { /* cadre inaccessible */ }
  }

  /** Les mélanges de choix sont mémorisés par question : on les oublie quand les questions changent. */
  function oublierMelanges() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.indexOf('scorm_shuffle_') === 0) sessionStorage.removeItem(k);
      }
    } catch (e) { /* stockage indisponible */ }
  }

  function chargerApercu() {
    const cadre = $('#cadreApercuScorm');
    const statut = $('#statutApercuScorm');
    verrouillerCadre(cadre);
    oublierMelanges();
    corrigeVisible = false;
    majBoutonCorrige();
    indexCourant = null;
    majBlocImages();
    statut.textContent = '';
    S.construireApercu(etat.donnees).then(function (page) {
      cadre.onload = function () {
        permettreDefilement();
        setTimeout(permettreDefilement, 200);
      };
      cadre.srcdoc = page;
    }).catch(function (e) {
      statut.innerHTML = '<span class="bandeau bandeau-alerte">L\'aperçu n\'a pas pu être préparé : ' + O().echapper(e.message) +
        '. L\'assistant doit être ouvert à partir d\'un site (http ou https), avec le dossier moteur-ui à côté du dossier application.</span>';
    });
  }

  function preparerEtapeApercu() {
    if (!etat.donnees) return;
    majBlocImages();
    majListeAller();
    chargerApercu();
    debloquer(4);
  }

  function envoyer(message) {
    try {
      const w = $('#cadreApercuScorm').contentWindow;
      if (w) w.postMessage(message, '*');
    } catch (e) { /* cadre inaccessible */ }
  }

  function majBoutonCorrige() {
    const b = $('#btnCorrigeScorm');
    b.textContent = corrigeVisible ? 'Masquer le corrigé' : 'Consulter le corrigé';
    b.setAttribute('aria-pressed', corrigeVisible ? 'true' : 'false');
  }

  /**
   * Colonne « Images » de l'étape 3. Elle suit la question affichée dans l'aperçu (indexCourant) :
   * demande d'image et boutons de cette question, puis la liste de toutes les questions pour s'y rendre.
   * Sur l'écran d'accueil ou de fin, seule la liste est présentée.
   */
  function majBlocImages() {
    const zone = $('#blocImagesScorm');
    if (!zone || !etat.donnees) return;
    // Pendant une prise de voix, la colonne reste en place ; elle suivra l'aperçu à la fin de la prise.
    if (V() && V().enCours()) { colonneAMettreAJour = true; return; }
    colonneAMettreAJour = false;
    const ech = O().echapper;
    const qs = etat.donnees.questions;
    const manquantes = qs.filter(function (q) { return q.figure && !q.image; }).length;
    const outil = etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini';
    const nom = O().OUTILS_IA[outil].nom;
    const i = (typeof indexCourant === 'number' && qs[indexCourant]) ? indexCourant : null;
    let html = '';

    if (i === null) {
      html += '<p class="aide">Avancez dans l\'activité : la demande d\'image de chaque ' + profil.unite.toLowerCase() + ' s\'affiche ici, au fil des ' + profil.unite.toLowerCase() + 's.</p>';
    } else {
      const q = qs[i];
      const manque = q.figure && !q.image;
      html += '<div class="carte-image-courante' + (manque ? ' est-manquante' : '') + '">' +
        '<p class="image-courante-rang">' + profil.unite + ' ' + (i + 1) + ' sur ' + qs.length + '</p>' +
        '<p class="image-courante-titre">' + ech(q.titre || '') + '</p>' +
        (q.figure
          ? '<p class="image-courante-figure"><strong>Schéma attendu&nbsp;:</strong> ' + ech(q.figure) + '</p>'
          : '<p class="aide">Aucun schéma demandé. Une image reste possible (facultatif).</p>') +
        '<p class="image-courante-etat">' + (q.image ? 'Image ajoutée.' : (manque ? 'Image manquante.' : 'Aucune image.')) + '</p>' +
        (q.image ? '<img class="image-courante-vignette" src="' + q.image + '" alt="' + ech(q.imageAlt || '') + '">' : '') +
        '<div class="image-courante-boutons">' +
          (manque ? '<button type="button" class="btn" data-demande-image-scorm="' + i + '">Copier la demande d\'image</button>' : '') +
          '<button type="button" class="btn' + (manque ? ' btn-primary' : '') + '" data-coller-image-scorm="' + i + '">Coller l\'image</button>' +
          '<label class="btn">Choisir un fichier<input type="file" accept="image/png,image/jpeg" data-fichier-image-scorm="' + i + '" hidden></label>' +
          (q.image && window.ImageRetouchCanvas ? '<button type="button" class="btn" data-retoucher-image-scorm="' + i + '">Retoucher l\'image</button>' : '') +
          (q.image ? '<button type="button" class="btn" data-retirer-image-scorm="' + i + '">Retirer l\'image</button>' : '') +
        '</div>' +
        (q.image && window.ImageRetouchCanvas ? '<p class="aide">« Retoucher l\'image » : masquer un texte incrusté (pinceau, pipette), cloner un fond, adoucir un raccord.</p>' : '') +
        (manque ? '<p class="aide">' + profil.capture + ', ou demandez-la à ' + nom +
          ' avec « Copier la demande d\'image ». Copiez l\'image, puis « Coller l\'image » ou Ctrl+V dans cette page.</p>' : '') +
      '</div>' + (avecVoix(q) ? V().carteHtml(q) : '') + carteRetouche(q, outil);
    }

    html += '<p class="liste-questions-images-titre">' + (manquantes
      ? (manquantes > 1 ? manquantes + ' schémas manquent' : 'Un schéma manque')
      : 'Toutes les questions') + '</p>' +
      '<ul class="liste-questions-images">' + qs.map(function (q, k) {
        const etatTxt = (q.image ? 'image ajoutée' : (q.figure ? 'schéma manquant' : 'sans image')) +
          (avecVoix(q) ? (V().aVoix(q) ? (q.audioExemple ? ', narration de l\'exemple' : ', votre voix') : ', voix de synthèse') : '');
        return '<li><button type="button" class="lien-question-image' + (q.figure && !q.image ? ' est-manquante' : '') + '" data-aller-image-scorm="' + k + '"' +
          (k === i ? ' aria-current="true"' : '') + '>' +
          '<span class="nombres">' + (k + 1) + '.</span> <span>' + ech(q.titre || '') + '</span>' +
          '<span class="lien-question-etat">' + etatTxt + '</span></button></li>';
      }).join('') + '</ul>';

    zone.innerHTML = html;
    if (i !== null) brancherRetouche(i);
    if (i !== null && avecVoix(qs[i])) brancherVoix(i, zone);

    zone.querySelectorAll('[data-aller-image-scorm]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = Number(b.dataset.allerImageScorm);
        envoyer({ type: 'GOTO_QUESTION', index: k });
        $('#allerQuestionScorm').value = String(k);
        indexCourant = k;
        majBlocImages();
      });
    });
    zone.querySelectorAll('[data-demande-image-scorm]').forEach(function (b) {
      b.addEventListener('click', function () {
        O().copier(S.demandeImage(qs[Number(b.dataset.demandeImageScorm)], etat.contexte.niveau), null);
        statutImage('Demande copiée. Collez-la dans ' + nom + ' (Ctrl+V).');
      });
    });
    zone.querySelectorAll('[data-coller-image-scorm]').forEach(function (b) {
      b.addEventListener('click', function () { collerImage(Number(b.dataset.collerImageScorm)); });
    });
    zone.querySelectorAll('[data-fichier-image-scorm]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        const f = inp.files && inp.files[0];
        if (f) lireFichier(f).then(function (url) { placerImage(Number(inp.dataset.fichierImageScorm), url); });
        inp.value = '';
      });
    });
    zone.querySelectorAll('[data-retoucher-image-scorm]').forEach(function (b) {
      b.addEventListener('click', function () { retoucherImage(Number(b.dataset.retoucherImageScorm)); });
    });
    zone.querySelectorAll('[data-retirer-image-scorm]').forEach(function (b) {
      b.addEventListener('click', function () {
        const k = Number(b.dataset.retirerImageScorm);
        const q = qs[k];
        delete q.image;
        delete q.imageAlt;
        sauver();
        rechargerSurQuestion(k);
        statutImage('Image retirée.');
      });
    });
  }

  /** Enregistreur de la voix de l'enseignant (src/enregistreur-voix.js). */
  function V() { return window.MoodleAIEnregistreurVoix || null; }
  let colonneAMettreAJour = false;
  /** Le volet « Narration avec votre voix » s'affiche pour une présentation narrée. */
  function avecVoix(q) { return !!V() && genre() === 'hattie' && !!q && (q.narration || []).length > 0; }

  function brancherVoix(i, zone) {
    const q = etat.donnees.questions[i];
    V().brancher(q, zone, {
      enregistre: function (station, r) {
        station.audio = r.audio;
        station.audioDuree = r.duree;
        station.audioTexte = r.texte;
        delete station.audioExemple;
        sauver();
        rechargerSurQuestion(etat.donnees.questions.indexOf(station));
        statutImage('Votre voix est enregistrée pour la station ' + (etat.donnees.questions.indexOf(station) + 1) +
          ' : l\'aperçu la fait entendre (« Écouter l\'explication »).' + (r.avis || ''));
      },
      retire: function (station) {
        delete station.audio;
        delete station.audioDuree;
        delete station.audioTexte;
        delete station.audioExemple;
        sauver();
        rechargerSurQuestion(etat.donnees.questions.indexOf(station));
        statutImage('Enregistrement retiré : la voix de synthèse lit de nouveau la narration.');
      },
      fini: function () { if (colonneAMettreAJour) majBlocImages(); }
    });
  }

  /**
   * Volet « Retoucher cette question avec l'IA » : l'enseignant décrit le changement, copie la requête
   * (question actuelle + demande + règles) pour Gemini ou Copilot, colle la question retouchée, puis
   * l'applique. Elle est vérifiée comme à l'étape 2 et remplace seulement cette question.
   */
  function carteRetouche(q, outil) {
    const ech = O().echapper;
    const b = brouillonsRetouche[q.id] || {};
    const msg = messageRetouche && messageRetouche.id === q.id ? messageRetouche.html : '';
    return '<section class="carte-retouche" aria-labelledby="titreRetoucheScorm">' +
      '<h4 id="titreRetoucheScorm">Retoucher cette ' + profil.unite.toLowerCase() + ' avec l\'IA</h4>' +
      '<label for="demandeRetoucheScorm">1. Ce que vous voulez changer</label>' +
      '<textarea id="demandeRetoucheScorm" rows="3" placeholder="' + ech(profil.exempleRetouche) + '">' + ech(b.demande || '') + '</textarea>' +
      '<button type="button" class="btn btn-primary" id="btnCopierRetoucheScorm">Copier la requête</button>' +
      '<p class="statut" id="statutRetoucheScorm" role="status" aria-live="polite"></p>' +
      O().liensIA('Collez-la dans une conversation :', outil) +
      '<label for="reponseRetoucheScorm">2. Réponse de l\'IA</label>' +
      '<textarea id="reponseRetoucheScorm" rows="4" class="code" spellcheck="false" placeholder="' +
        ech(profil.placeholderRetouche) + '">' + ech(b.reponse || '') + '</textarea>' +
      '<button type="button" class="btn" id="btnAppliquerRetoucheScorm">Appliquer la retouche</button>' +
      (annulationsRetouche[q.id] ? '<button type="button" class="btn" id="btnAnnulerRetoucheScorm">Annuler la dernière retouche</button>' : '') +
      '<div id="resultatRetoucheScorm" aria-live="polite">' + msg + '</div>' +
    '</section>';
  }

  function brancherRetouche(i) {
    const q = etat.donnees.questions[i];
    const brouillon = function () { return (brouillonsRetouche[q.id] = brouillonsRetouche[q.id] || {}); };
    $('#demandeRetoucheScorm').addEventListener('input', function () { brouillon().demande = this.value; });
    $('#reponseRetoucheScorm').addEventListener('input', function () { brouillon().reponse = this.value; });
    $('#btnCopierRetoucheScorm').addEventListener('click', function () {
      const demande = $('#demandeRetoucheScorm').value.trim();
      if (!demande) {
        O().annoncer($('#statutRetoucheScorm'), 'Décrivez d\'abord ce que vous voulez changer.');
        $('#demandeRetoucheScorm').focus();
        return;
      }
      O().copier(S.consigneRetouche(q, demande, etat.contexte), $('#statutRetoucheScorm'));
    });
    $('#btnAppliquerRetoucheScorm').addEventListener('click', function () { appliquerRetouche(i); });
    const annuler = $('#btnAnnulerRetoucheScorm');
    if (annuler) annuler.addEventListener('click', function () { annulerRetouche(i); });
    const corr = $('#btnCopierCorrRetoucheScorm');
    if (corr) corr.addEventListener('click', function () {
      O().copier(corr.dataset.consigne, $('#statutCorrRetoucheScorm'));
    });
  }

  function afficherResultatRetouche(id, html) {
    messageRetouche = { id: id, html: html };
    const z = $('#resultatRetoucheScorm');
    if (z) z.innerHTML = html;
  }

  function appliquerRetouche(i) {
    const ech = O().echapper;
    const q = etat.donnees.questions[i];
    const brut = $('#reponseRetoucheScorm').value;
    if (!brut.trim()) { afficherResultatRetouche(q.id, '<p class="bandeau bandeau-alerte" role="alert">Collez d\'abord la réponse de l\'IA.</p>'); return; }
    const lecture = window.MoodleAICollage.lireJson(brut);
    if (!lecture.ok) {
      afficherResultatRetouche(q.id, '<div class="bandeau bandeau-alerte" role="alert"><strong>Réponse illisible.</strong> ' + ech(lecture.erreur) + '</div>');
      return;
    }
    const res = S.appliquerRetouche(lecture.valeur, q, i + 1);
    if (!res.ok) {
      afficherResultatRetouche(q.id, '<div class="bandeau bandeau-alerte" role="alert"><strong>Structure inattendue.</strong> ' + ech(res.erreur) + '</div>');
      return;
    }
    if (res.erreurs.length) {
      const consigne = S.consigneCorrectionRetouche(res.erreurs);
      afficherResultatRetouche(q.id,
        '<div class="bandeau bandeau-alerte" role="alert"><strong>Retouche non appliquée :</strong> ' + res.erreurs.length + ' règle(s) non respectée(s). La question reste inchangée.</div>' +
        O().liste('Règles non respectées', res.erreurs, 'bloc-alerte') +
        '<button type="button" class="btn" id="btnCopierCorrRetoucheScorm" data-consigne="' + ech(consigne) + '">Copier la consigne de correction</button>' +
        '<p class="statut" id="statutCorrRetoucheScorm" role="status" aria-live="polite"></p>');
      const corr = $('#btnCopierCorrRetoucheScorm');
      if (corr) corr.addEventListener('click', function () { O().copier(consigne, $('#statutCorrRetoucheScorm')); });
      return;
    }
    annulationsRetouche[q.id] = JSON.parse(JSON.stringify(q));
    remplacerQuestion(i, res.question);
    brouillonsRetouche[q.id] = {};
    messageRetouche = {
      id: q.id,
      html: '<div class="bandeau bandeau-succes" role="status"><strong>Retouche appliquée.</strong> L\'aperçu montre la question modifiée.</div>' +
        O().liste('Points à surveiller', res.avertissements, 'bloc-avertissement') +
        O().liste('Réparations faites automatiquement', lecture.corrections.concat(res.notes), 'bloc-info')
    };
    rechargerSurQuestion(i);
  }

  function annulerRetouche(i) {
    const q = etat.donnees.questions[i];
    const avant = annulationsRetouche[q.id];
    if (!avant) return;
    delete annulationsRetouche[q.id];
    remplacerQuestion(i, avant);
    messageRetouche = { id: q.id, html: '<div class="bandeau bandeau-succes" role="status">Retouche annulée : la question est revenue à sa version précédente.</div>' };
    rechargerSurQuestion(i);
  }

  /** Remplace la question i, garde le texte de l'étape 2 à jour, sauvegarde et rafraîchit « Aller à ». */
  function remplacerQuestion(i, nouvelle) {
    etat.donnees.questions[i] = nouvelle;
    etat.reponseBrute = JSON.stringify(S.activiteCompacte(etat.donnees), null, 2);
    sauver();
    majListeAller();
  }

  function majListeAller() {
    const sel = $('#allerQuestionScorm');
    const val = sel.value;
    sel.innerHTML = '<option value="">Écran d\'accueil</option>' +
      etat.donnees.questions.map(function (q, k) {
        return '<option value="' + k + '">' + profil.unite + ' ' + (k + 1) + ' : ' + O().echapper(q.titre || '') + '</option>';
      }).join('');
    sel.value = val;
  }

  /**
   * Éditeur de retouche d'image partagé (moteur-ui/simulateurs/common/image-retouch-canvas.js) :
   * l'image retouchée remplace celle de la question, ramenée à TAILLE_MAX_IMAGE px au plus.
   */
  function retoucherImage(i) {
    const q = etat.donnees.questions[i];
    if (!q || !q.image || !window.ImageRetouchCanvas) return;
    window.ImageRetouchCanvas.open({
      imageSrc: q.image,
      titre: 'Retouche de l\'image — ' + profil.unite.toLowerCase() + ' ' + (i + 1),
      libelleEnregistrer: 'Enregistrer l\'image retouchée',
      onSave: function (url) {
        preparerImage(url).then(function (prete) {
          if (!prete) { statutImage('L\'image retouchée n\'a pas pu être lue.'); return; }
          q.image = prete;
          sauver();
          rechargerSurQuestion(i);
          statutImage('Image retouchée enregistrée pour la ' + profil.unite.toLowerCase() + ' ' + (i + 1) + '.');
        });
      }
    });
  }

  /** Recharge l'aperçu (image ajoutée ou retirée) et revient à la question k. */
  function rechargerSurQuestion(k) {
    chargerApercu();
    indexCourant = k;
    majBlocImages();
    $('#allerQuestionScorm').value = String(k);
    setTimeout(function () { envoyer({ type: 'GOTO_QUESTION', index: k }); }, 800);
  }

  function statutImage(msg) {
    const s = $('#statutImageScorm');
    if (s) O().annoncer(s, msg);
  }

  function lireFichier(blob) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function collerImage(i) {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      statutImage('Votre navigateur ne permet pas ce bouton : appuyez plutôt sur Ctrl+V dans cette page.');
      return;
    }
    navigator.clipboard.read().then(function (elements) {
      for (let k = 0; k < elements.length; k++) {
        const type = elements[k].types.filter(function (t) { return /^image\//.test(t); })[0];
        if (type) return elements[k].getType(type).then(lireFichier).then(function (url) { placerImage(i, url); });
      }
      statutImage('Le presse-papiers ne contient pas d\'image. Faites un clic droit sur l\'image, puis « Copier l\'image ».');
    }).catch(function () {
      statutImage('Le navigateur a refusé le collage par le bouton : appuyez plutôt sur Ctrl+V dans cette page.');
    });
  }

  /** Dimensions d'une image SVG (data:) : largeur et hauteur, sinon viewBox. null si ce n'est pas un SVG lisible. */
  function tailleSvg(dataUrl) {
    const m = String(dataUrl).match(/^data:image\/svg\+xml(;base64)?,(.*)$/);
    if (!m) return null;
    let svg;
    try { svg = m[1] ? atob(m[2]) : decodeURIComponent(m[2]); } catch (e) { return null; }
    const balise = (svg.match(/<svg\b[^>]*>/) || [''])[0];
    const vb = balise.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    if (vb && +vb[1] > 0 && +vb[2] > 0) return [+vb[1], +vb[2]];
    const w = balise.match(/\bwidth\s*=\s*["']([\d.]+)/), h = balise.match(/\bheight\s*=\s*["']([\d.]+)/);
    return w && h && +w[1] > 0 && +h[1] > 0 ? [+w[1], +h[1]] : null;
  }

  /** Image en PNG ou JPEG, ramenée à TAILLE_MAX_IMAGE px de côté au plus (un SVG est converti en PNG). */
  function preparerImage(dataUrl) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () {
        // Un SVG est vectoriel : il est dessiné à TAILLE_MAX_IMAGE px, selon les proportions de son viewBox.
        const vecto = tailleSvg(dataUrl);
        const largeur = vecto ? vecto[0] : img.naturalWidth;
        const hauteur = vecto ? vecto[1] : img.naturalHeight;
        const echelle = vecto ? TAILLE_MAX_IMAGE / Math.max(largeur, hauteur)
          : Math.min(1, TAILLE_MAX_IMAGE / Math.max(largeur, hauteur));
        const garder = echelle === 1 && /^data:image\/(png|jpeg);/.test(dataUrl);
        if (garder) { resolve(dataUrl); return; }
        const c = document.createElement('canvas');
        c.width = Math.round(largeur * echelle);
        c.height = Math.round(hauteur * echelle);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(/^data:image\/jpeg/.test(dataUrl) ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png'));
      };
      img.onerror = function () { resolve(null); };
      img.src = dataUrl;
    });
  }

  /**
   * Méthode d'ajout d'une image à une question, commune au collage, au fichier choisi et aux exemples :
   * image ramenée à TAILLE_MAX_IMAGE px (PNG ou JPEG), description reprise du schéma attendu (« figure »).
   * @returns {Promise<boolean>}
   */
  function poserImage(q, dataUrl) {
    return preparerImage(dataUrl).then(function (url) {
      if (!url) return false;
      q.image = url;
      q.imageAlt = q.figure || ('Schéma de la question : ' + q.titre);
      return true;
    });
  }

  /**
   * Images d'un projet d'exemple (src/exemples/images-exemples.js, reprises de ../Exemples/) :
   * posées seulement sur les questions dont la réponse de l'IA demande un schéma (« figure »),
   * comme si l'enseignant les avait ajoutées à l'étape 3.
   */
  function appliquerImagesExemple(ex) {
    const banque = window.MoodleAIExemplesImages || {};
    if (!ex || !ex.images || !etat.donnees) return;
    const donnees = etat.donnees;
    const poses = donnees.questions.map(function (q) {
      const src = banque[ex.images[q.titre]];
      return q.figure && !q.image && src ? poserImage(q, src) : Promise.resolve(false);
    });
    Promise.all(poses).then(function (r) {
      if (etat.donnees !== donnees || r.indexOf(true) < 0) return;
      sauver();
      if (etat.etape === 3) chargerApercu();
      if (etat.etape === 4) preparerEtapeExport();
    });
  }

  /** Texte de la narration tel que l'enregistreur le compare (audioTexte). */
  function texteNarration(q) { return (q.narration || []).join('\n'); }

  /** Une voix d'exemple ne suit une station que si sa narration n'a pas changé. */
  function voixReprise(a, q) {
    return !!(a && a.audio && (q.narration || []).length && (!a.audioExemple || a.audioTexte === texteNarration(q)));
  }

  /** Lit un fichier MP3 local du paquet en data: et sa durée ; null si le navigateur le refuse (file:///). */
  function lireAudio(chemin) {
    return fetch(chemin).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.blob();
    }).then(function (blob) {
      return new Promise(function (resolve) {
        const lecteur = new FileReader();
        lecteur.onload = function () {
          const url = String(lecteur.result).replace(/^data:[^;,]*/, 'data:audio/mpeg');
          const a = new Audio();
          a.preload = 'metadata';
          a.onloadedmetadata = function () { resolve({ audio: url, duree: isFinite(a.duration) ? a.duration : 0 }); };
          a.onerror = function () { resolve({ audio: url, duree: 0 }); };
          a.src = url;
        };
        lecteur.onerror = function () { resolve(null); };
        lecteur.readAsDataURL(blob);
      });
    }).catch(function () { return null; });
  }

  /**
   * Narrations MP3 d'un projet d'exemple (src/exemples/audio/, reprises de ../Exemples/) : posées comme un
   * enregistrement de l'enseignant, sur ce seul projet. « audioExemple » les retire si la narration change.
   */
  function appliquerAudiosExemple(ex) {
    if (!ex || !ex.audios || !etat.donnees) return;
    const donnees = etat.donnees;
    const poses = donnees.questions.map(function (q) {
      const chemin = ex.audios[q.titre];
      if (!chemin || q.audio || !(q.narration || []).length) return Promise.resolve(false);
      return lireAudio(chemin).then(function (r) {
        if (!r || etat.donnees !== donnees || q.audio) return false;
        q.audio = r.audio;
        q.audioDuree = r.duree;
        q.audioTexte = texteNarration(q);
        q.audioExemple = true;
        return true;
      });
    });
    Promise.all(poses).then(function (r) {
      if (etat.donnees !== donnees || r.indexOf(true) < 0) return;
      sauver();
      if (etat.etape === 3) chargerApercu();
      if (etat.etape === 4) preparerEtapeExport();
    });
  }

  function placerImage(i, dataUrl) {
    const q = etat.donnees && etat.donnees.questions[i];
    if (!q) return;
    if (!/^data:image\//.test(dataUrl)) { statutImage('Ce fichier n\'est pas une image.'); return; }
    poserImage(q, dataUrl).then(function (ok) {
      if (!ok) { statutImage('Cette image n\'a pas pu être lue.'); return; }
      sauver();
      rechargerSurQuestion(i);
      statutImage('Image ajoutée à la ' + profil.unite.toLowerCase() + ' ' + (i + 1) + '.');
    });
  }

  /** Ctrl+V à l'étape 3 : l'image va à la question affichée, sinon (accueil) à la première dont le schéma manque. */
  function collageAuClavier(ev) {
    if ($('#ecranScorm').hidden || etat.etape !== 3 || !etat.donnees) return;
    const t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
    const items = Array.prototype.slice.call((ev.clipboardData && ev.clipboardData.items) || []);
    const item = items.filter(function (it) { return it.kind === 'file' && /^image\//.test(it.type); })[0];
    if (!item) return;
    ev.preventDefault();
    let i = typeof indexCourant === 'number' ? indexCourant
      : etat.donnees.questions.findIndex(function (q) { return q.figure && !q.image; });
    if (!(i >= 0)) { statutImage('Allez d\'abord à la question voulue, puis collez l\'image.'); return; }
    lireFichier(item.getAsFile()).then(function (url) { placerImage(i, url); });
  }

  // ------------------------------------------------------------------
  // Étape 4 — le package SCORM
  // ------------------------------------------------------------------
  function preparerEtapeExport() {
    if (!etat.donnees) return;
    const ech = O().echapper;
    const d = etat.donnees;
    const verif = S.valider(d, etat.contexte);
    const sansImage = d.questions.filter(function (q) { return q.figure && !q.image; }).length;
    let html = '<dl class="resume-liste">' +
      '<dt>Titre</dt><dd>' + ech(d.titre) + '</dd>' +
      '<dt>' + profil.unite + 's</dt><dd class="nombres">' + d.questions.length + '</dd>' +
      '<dt>Barème</dt><dd class="nombres">' + S.totalPoints(d) + ' points</dd>';
    const narrees = d.questions.filter(function (q) { return (q.narration || []).length; }).length;
    if (genre() === 'hattie') {
      html += '<dt>Présentations</dt><dd>' + (narrees === d.questions.length ? 'narrées' : narrees ? narrees + ' narrée(s), ' + (d.questions.length - narrees) + ' écrite(s)' : 'écrites') + '</dd>' +
        '<dt>Démarches</dt><dd class="nombres">' + d.questions.filter(function (q) { return q.demarche || q.explicationDemarche; }).length + '</dd>';
    }
    if (genre() !== 'corrige') {
      html += '<dt>Deuxièmes chances</dt><dd class="nombres">' + d.questions.filter(function (q) { return q.remediation; }).length + '</dd>';
    } else {
      const parType = {};
      d.questions.forEach(function (q) { parType[q.type] = (parType[q.type] || 0) + 1; });
      html += '<dt>Types</dt><dd>' + Object.keys(parType).map(function (t) { return ech((S.LIBELLES[t] || t) + ' : ' + parType[t]); }).join(' ; ') + '</dd>' +
        '<dt>Démarches</dt><dd class="nombres">' + d.questions.filter(function (q) { return q.explicationDemarche; }).length + '</dd>';
    }
    html += '<dt>Images</dt><dd class="nombres">' + d.questions.filter(function (q) { return q.image; }).length + '</dd></dl>';
    if (sansImage) {
      html += '<div class="bandeau bandeau-avertissement" role="status"><strong>' + (sansImage > 1 ? sansImage + ' schémas manquent' : 'Un schéma manque') +
        '.</strong> Le package peut être enregistré, mais ' + (genre() === 'hattie'
          ? 'une présentation sans son schéma perd sa représentation visuelle'
          : 'les questions qui s\'appuient sur un schéma du document seront difficiles sans lui') + '. Ajoutez-le à l\'étape 3.</div>';
    }
    if (genre() === 'hattie' && narrees) {
      const voix = d.questions.filter(function (q) { return (q.narration || []).length && /^data:audio\//.test(q.audio || ''); }).length;
      const perimees = d.questions.filter(function (q) { return V() && V().perime(q); }).length;
      html += '<div class="bandeau ' + (voix === narrees && !perimees ? 'bandeau-succes' : 'bandeau-info') + '" role="status"><strong>Narration.</strong> ' +
        (voix === narrees
          ? 'Votre voix est enregistrée pour les ' + narrees + ' présentations : le package contient ces enregistrements (src/audio/).'
          : voix
            ? 'Votre voix est enregistrée pour ' + voix + ' présentation(s) sur ' + narrees + ' ; une voix française de l\'appareil de l\'élève lit les autres.'
            : 'Aucun enregistrement : une voix française de l\'appareil de l\'élève lit la narration.') +
        (voix < narrees ? ' Pour enregistrer votre voix, revenez à l\'étape 3 : volet « Narration avec votre voix » de chaque station.' : '') +
        (perimees ? ' Attention : la narration de ' + perimees + ' station(s) a changé depuis l\'enregistrement.' : '') +
        ' La transcription reste offerte à l\'élève.</div>';
    }
    if (verif.erreurs.length) {
      html += '<div class="bandeau bandeau-avertissement" role="status"><strong>' + verif.erreurs.length +
        ' règle(s) encore non respectée(s).</strong> Le package peut être enregistré, mais il est préférable de les corriger (étape 2).' +
        '<ul class="liste-erreurs">' + verif.erreurs.map(function (e) {
          return '<li><strong>' + ech(e.lieu) + '</strong> : ' + ech(e.msg) + '</li>';
        }).join('') + '</ul></div>';
    }
    $('#resumeExportScorm').innerHTML = html;
    $('#statutExportScorm').textContent = '';
    $('#aideDossierScorm').textContent = O().choixDossierPossible()
      ? 'Une fenêtre vous permet de choisir le dossier et le nom du fichier. Le navigateur retient le dernier dossier choisi.'
      : 'Votre navigateur ne permet pas de choisir le dossier : les fichiers vont dans votre dossier Téléchargements. Avec Chrome ou Edge, une fenêtre vous permet de choisir le dossier.';
  }

  function exporterPackage() {
    if (!etat.donnees) return;
    const statut = $('#statutExportScorm');
    if (!window.fflate) { O().annoncer(statut, 'Le module d\'empaquetage se charge encore. Réessayez dans un instant.'); return; }
    // La fenêtre d'enregistrement s'ouvre d'abord ; le package se prépare ensuite.
    O().enregistrerSous(S.nomFichierZip(etat.donnees), function () {
      return restauration.then(function () { return S.construirePackage(etat.donnees); });
    }, 'application/zip', [
      { description: 'Paquetage SCORM (ZIP)', accept: { 'application/zip': ['.zip'] } }
    ]).then(function (r) {
      O().annoncer(statut, r.etat === 'annule' ? 'Enregistrement annulé.'
        : r.etat === 'enregistre' ? 'Package enregistré : « ' + r.nom + ' », dans le dossier choisi.'
        : 'Le package SCORM a été téléchargé dans votre dossier Téléchargements.');
    }).catch(function (e) {
      O().annoncer(statut, 'Le package n\'a pas pu être préparé : ' + e.message + '. L\'assistant doit être ouvert à partir d\'un site (http ou https), avec le dossier moteur-ui à côté du dossier application.');
    });
  }

  function exporterDonnees() {
    if (!etat.donnees) return;
    const statut = $('#statutExportScorm');
    // Hors package, les images restent intégrées (data:) dans le fichier.
    O().enregistrerSous('questions_data.js', S.questionsDataJs(etat.donnees), 'text/javascript;charset=utf-8', [
      { description: 'Données de l\'activité (JavaScript)', accept: { 'text/javascript': ['.js'] } }
    ]).then(function (r) {
      O().annoncer(statut, r.etat === 'annule' ? 'Enregistrement annulé.'
        : r.etat === 'enregistre' ? 'Fichier enregistré : « ' + r.nom + ' ».'
        : 'Le fichier questions_data.js a été téléchargé dans votre dossier Téléchargements.');
    }).catch(function (e) {
      O().annoncer(statut, 'Le fichier n\'a pas pu être enregistré : ' + e.message + '.');
    });
  }

  // ------------------------------------------------------------------
  // Enregistrement et reprise
  // ------------------------------------------------------------------
  function titreProjet() {
    return (etat.donnees && etat.donnees.titre) || etat.contexte.sujet || profil.titreDefaut;
  }

  function enregistrerProjet(statutEl) {
    sauver();
    const contenu = {
      contexte: etat.contexte,
      consigneModifiee: etat.consigneModifiee,
      reponseBrute: etat.reponseBrute,
      donnees: etat.donnees,
      etape: etat.etape,
      etapeMax: etat.etapeMax
    };
    const env = P.emballer(profil.type, titreProjet(), etat.etape, contenu);
    const zone = statutEl || $('#statutEntete');
    // Les enregistrements de voix (data:) font partie du projet : on attend leur reprise éventuelle.
    O().enregistrerSous(P.nomFichier(profil.type, titreProjet()), function () {
      return restauration.then(function () { return JSON.stringify(env, null, 2); });
    }, 'application/json', [
      { description: 'Projet de l\'assistant (JSON)', accept: { 'application/json': ['.json'] } }
    ]).then(function (r) {
      O().annoncer(zone, r.etat === 'annule' ? 'Enregistrement annulé.'
        : r.etat === 'enregistre' ? 'Projet enregistré : « ' + r.nom + ' ».'
        : 'Projet enregistré dans Téléchargements.');
      if (!statutEl) setTimeout(function () { zone.textContent = ''; }, 5000);
    }).catch(function (e) {
      O().annoncer(zone, 'Le projet n\'a pas pu être enregistré : ' + e.message + '.');
    });
  }

  /** @returns {string|null} Message d'erreur, ou null si le projet est ouvert. */
  function ouvrirReprise(r) {
    if (!PROFILS[r.type]) return 'type de projet inconnu';
    choisirProfil(r.type);
    if (!S) return 'le module de ce type de projet n\'est pas chargé';
    try {
      let etape;
      if (r.format === 'enveloppe') {
        const p = r.projet || {};
        if (!p.contexte || typeof p.contexte !== 'object') throw new Error('le contenu du projet est incomplet');
        etat = nouvelEtat();
        etat.contexte = Object.assign(etat.contexte, p.contexte);
        etat.consigneModifiee = p.consigneModifiee || '';
        etat.reponseBrute = p.reponseBrute || '';
        etat.donnees = p.donnees || null;
        etat.etapeMax = Math.max(1, Math.min(NB_ETAPES, p.etapeMax || 1));
        if (!etat.donnees) etat.etapeMax = Math.min(etat.etapeMax, 2);
        etape = Math.min(p.etape || 1, etat.etapeMax);
      } else {
        // questions_data.js de l'outil actuel : ouvert à l'aperçu, sans réponse de l'IA.
        const v = S.depuisQuestionsData(r.projet);
        etat = nouvelEtat();
        etat.contexte = Object.assign(etat.contexte, v.contexte);
        etat.donnees = v.donnees;
        etat.reponseBrute = '';
        etat.etapeMax = NB_ETAPES;
        etape = 3;
      }
      dernierContenu = null;
      ouvrirParcours(etape);
      return null;
    } catch (e) {
      return e.message;
    }
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------
  function init() {
    if (!S || !O()) return;

    Object.keys(PROFILS).forEach(function (type) {
      const attr = PROFILS[type].demarrer;
      if (!PROFILS[type].action()) return;
      $$('[' + attr + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          const choix = b.getAttribute(attr);
          if (choix === 'exemple') demarrerExemple(type);
          else if (choix === 'nouveau') demarrerNouveau(type);
          else continuerProjet(type);
        });
      });
    });
    $('#btnQuitterExempleScorm').addEventListener('click', function () { demarrerNouveau(profil.type); });

    $$('#ecranScorm .etapes button').forEach(function (b) {
      b.addEventListener('click', function () { allerEtape(Number(b.dataset.etapeScorm)); });
    });
    $$('[data-aller-scorm]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = Number(b.dataset.allerScorm);
        debloquer(Math.min(n, etat.etapeMax + 1));
        allerEtape(n);
      });
    });

    $('#formScorm').addEventListener('submit', validerEtape1);
    ['sSujet', 'sNiveau', 'sNb', 'sTexteSource', 'sPrecisions'].forEach(function (id) {
      $('#' + id).addEventListener('input', champsModifies);
    });
    $$('input[name="sOutil"], input[name="sSource"], input[name="sFormat"]').forEach(function (r) {
      r.addEventListener('change', champsModifies);
    });

    $('#texteConsigneScorm').addEventListener('input', function () {
      etat.consigneModifiee = this.value === consigneGeneree() ? '' : this.value;
      majAideConsigne();
      sauver();
    });
    $('#btnRetablirConsigneScorm').addEventListener('click', function () {
      etat.consigneModifiee = '';
      etat.contexte = lireChamps();
      $('#texteConsigneScorm').value = consigneActuelle();
      majAideConsigne();
      sauver();
      O().annoncer($('#statutConsigneScorm'), 'La consigne d\'origine a été rétablie.');
      $('#texteConsigneScorm').focus();
    });
    $('#btnCopierConsigneScorm').addEventListener('click', function () {
      if (!controlerChamps()) return;
      O().copier($('#texteConsigneScorm').value, $('#statutConsigneScorm'));
    });

    $('#btnVerifierScorm').addEventListener('click', function () { verifier(true, false); });
    $('#btnVersApercuScorm').addEventListener('click', function () { allerEtape(3); });

    $('#btnCorrigeScorm').addEventListener('click', function () {
      corrigeVisible = !corrigeVisible;
      majBoutonCorrige();
      envoyer({ type: 'TOGGLE_CORRIGE', visible: corrigeVisible });
    });
    $('#allerQuestionScorm').addEventListener('change', function () {
      if (this.value === '') { chargerApercu(); return; }
      indexCourant = Number(this.value);
      majBlocImages();
      envoyer({ type: 'GOTO_QUESTION', index: indexCourant });
    });
    $('#btnRecommencerScorm').addEventListener('click', function () {
      $('#allerQuestionScorm').value = '';
      chargerApercu();
    });
    // L'activité annonce la question affichée : la liste « Aller à » suit.
    window.addEventListener('message', function (ev) {
      const cadre = $('#cadreApercuScorm');
      if (!cadre || ev.source !== cadre.contentWindow || !ev.data) return;
      if (ev.data.type === 'QUESTION_CHANGED' && typeof ev.data.index === 'number') {
        $('#allerQuestionScorm').value = String(ev.data.index);
        if (indexCourant !== ev.data.index) { indexCourant = ev.data.index; majBlocImages(); }
      }
      if (ev.data.type === 'ECRAN_FIN' && indexCourant !== null) { indexCourant = null; majBlocImages(); }
      if (ev.data.type === 'scorm_resize' || ev.data.type === 'resize' || ev.data.type === 'setHeight') permettreDefilement();
    });

    $('#btnExporterScorm').addEventListener('click', exporterPackage);
    $('#btnExporterDonneesScorm').addEventListener('click', exporterDonnees);
    $('#btnExporterProjetScorm').addEventListener('click', function () { enregistrerProjet($('#statutExportScorm')); });
    $('#btnNouveauScorm').addEventListener('click', function () { demarrerNouveau(profil.type); });
    document.addEventListener('paste', collageAuClavier);

    // Reprise du dernier projet ouvert s'il est d'un des types SCORM.
    const dernier = DERNIER_AU_CHARGEMENT;
    if (dernier && PROFILS[dernier.type] && PROFILS[dernier.type].action()) {
      choisirProfil(dernier.type);
      const p = lireProjet(dernier.exemple ? cleExemple(profil.type) : cleProjet(profil.type));
      if (p) {
        etat = p;
        restaurerAudios(etat, dernier.exemple ? cleExemple(profil.type) : cleProjet(profil.type));
        dernierContenu = empreinte(etat);
        if (etat.ecran === 'scorm') {
          ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
          // Exemple sauvegardé par une version antérieure : les images qui lui manquent sont posées.
          if (etat.exemple) appliquerImagesExemple(window.MoodleAIExemples && window.MoodleAIExemples[profil.exemple]);
          return;
        }
      }
    }
    majContinuer();
  }

  window.MoodleAIAssistantScorm = {
    TYPES: Object.keys(PROFILS),
    majContinuer: function () { if (O()) majContinuer(); },
    projetEnCours: projetEnCours,
    ouvrirReprise: ouvrirReprise,
    enregistrerProjet: function () { enregistrerProjet(); },
    quitter: quitter
  };

  document.addEventListener('DOMContentLoaded', init);
})();
