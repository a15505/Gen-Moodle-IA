/**
 * Assistant de création — parcours « Nouvelle version ou corrigé d'un examen ».
 * Même déroulement que les autres parcours (outils communs de window.MoodleAIOutils) :
 * 1. l'examen et la consigne, 2. la réponse de l'IA, 3. l'aperçu des feuilles en format lettre
 * (examen de l'élève et corrigé, mise en page réglable), 4. l'impression et l'exportation HTML.
 */
(function () {
  'use strict';

  const TYPE = 'examen';
  const CLE_PROJET = 'moodleai.' + TYPE + '.projet';
  const CLE_EXEMPLE = 'moodleai.' + TYPE + '.exemple';
  const CLE_DERNIER = 'moodleai.dernier';
  const NB_ETAPES = 4;
  const TAILLE_IMAGE = 1200;
  const X = window.MoodleAIExamen;
  const XB = window.MoodleAIExamenBlocs;
  const P = window.MoodleAIProjets;
  const O = function () { return window.MoodleAIOutils; };
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  const AIDE_CONSIGNE = 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour préciser une notion. Gardez les sections « Règles » et « Format de la réponse » intactes : l\'assistant en a besoin pour lire la réponse.';
  const MARCHE_JOINT = {
    gemini: 'Collez la consigne (Ctrl+V), puis joignez l\'examen (PDF, Word ou photo) avec le bouton « + » de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.',
    copilot: 'Collez la consigne (Ctrl+V), puis joignez l\'examen (PDF, Word ou photo) avec le trombone de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.'
  };

  let etat = nouvelEtat();
  let dernierContenu = null;
  let alerteStockage = false;
  let minuterieApercu = null;
  const DERNIER_AU_CHARGEMENT = (function () {
    try { return JSON.parse(localStorage.getItem(CLE_DERNIER) || 'null'); } catch (e) { return null; }
  })();

  function nouvelEtat() {
    return {
      exemple: false,
      ecran: 'accueil',
      etape: 1,
      etapeMax: 1,
      contexte: { mode: 'version', version: 'B', sujet: '', niveau: '', nbPages: 0, outil: 'gemini', source: 'joint', texteSource: '', precisions: '' },
      consigneModifiee: '',
      reponseBrute: '',
      donnees: null,
      affichage: { onglet: 'examen', detaille: false }
    };
  }
  function empreinte(e) { return JSON.stringify(Object.assign({}, e, { sauveLe: null, ecran: null })); }
  function ech(s) { return O().echapper(s); }

  // ------------------------------------------------------------------
  // Sauvegarde dans le navigateur
  // ------------------------------------------------------------------
  function sauver() {
    const contenu = empreinte(etat);
    if (contenu !== dernierContenu) {
      etat.sauveLe = new Date().toISOString();
      dernierContenu = contenu;
    }
    try {
      localStorage.setItem(etat.exemple ? CLE_EXEMPLE : CLE_PROJET, JSON.stringify(etat));
      localStorage.setItem(CLE_DERNIER, JSON.stringify({ type: TYPE, exemple: !!etat.exemple }));
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
      e.affichage = Object.assign(nouvelEtat().affichage, p.affichage || {});
      return e;
    } catch (e) { return null; }
  }
  function projetEnCours() {
    const p = lireProjet(CLE_PROJET);
    return p && (p.contexte.sujet || p.reponseBrute || p.donnees) ? p : null;
  }

  // ------------------------------------------------------------------
  // Démarrage
  // ------------------------------------------------------------------
  function ouvrirParcours(etape) {
    remplirEtape1();
    etat.ecran = 'examen';
    O().afficherEcran('examen');
    $('#bandeauExempleExamen').hidden = !etat.exemple;
    allerEtape(etape);
  }

  function demarrerExemple() {
    const ex = window.MoodleAIExemples && window.MoodleAIExemples.examen;
    if (!ex) return;
    etat = nouvelEtat();
    etat.exemple = true;
    etat.contexte = Object.assign(etat.contexte, JSON.parse(JSON.stringify(ex.contexte)));
    etat.reponseBrute = ex.reponseIA;
    const lecture = window.MoodleAICollage.lireJson(ex.reponseIA);
    const norm = lecture.ok ? X.normaliser(lecture.valeur, etat.contexte) : null;
    etat.donnees = norm && norm.ok ? norm.donnees : null;
    etat.etapeMax = etat.donnees ? NB_ETAPES : 2;
    ouvrirParcours(1);
  }

  function demarrerNouveau() {
    if (projetEnCours() && !confirm('Un examen est déjà en cours dans ce navigateur. Le remplacer par un nouveau projet ?\n\nPour le conserver, annulez, ouvrez-le avec le bouton « Continuer » de l\'accueil et cliquez sur « Enregistrer le projet ».')) return;
    etat = nouvelEtat();
    ouvrirParcours(1);
  }

  function continuerProjet() {
    const p = projetEnCours();
    if (!p) return demarrerNouveau();
    etat = p;
    dernierContenu = empreinte(etat);
    ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
  }

  function majContinuer() {
    const p = projetEnCours();
    $('#blocContinuerExamen').hidden = !p;
    if (!p) return;
    const titre = (p.donnees && X.titreAvecVersion(p.donnees)) || p.contexte.sujet || 'examen sans titre';
    const etape = Math.min(p.etape || 1, p.etapeMax || 1);
    $('[data-demarrer-examen="continuer"]').textContent = 'Continuer : ' + titre + ' (étape ' + etape + ' sur ' + NB_ETAPES + ')';
    $('#infoContinuerExamen').textContent = p.sauveLe
      ? 'Sauvegardé dans ce navigateur le ' + O().dateLisible(p.sauveLe) + '.'
      : 'Sauvegardé dans ce navigateur.';
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
    $$('#ecranExamen [data-panneau-examen]').forEach(function (p) {
      p.hidden = Number(p.dataset.panneauExamen) !== n;
    });
    if (n === 1) preparerEtape1();
    if (n === 2) preparerEtapeReponse();
    if (n === 3) preparerEtapeApercu();
    if (n === 4) preparerEtapeExport();
    majNavigation(n);
    sauver();
    if (focus !== false) {
      const titre = $('#ecranExamen [data-panneau-examen="' + n + '"] h2');
      if (titre) titre.focus();
    }
  }

  function majNavigation(n) {
    $$('#ecranExamen .etapes button').forEach(function (b) {
      const k = Number(b.dataset.etapeExamen);
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
  // Étape 1 — l'examen et la consigne
  // ------------------------------------------------------------------
  function remplirEtape1() {
    const c = etat.contexte;
    $$('input[name="eMode"]').forEach(function (r) { r.checked = r.value === (c.mode || 'version'); });
    $('#eVersion').value = c.version || 'B';
    $('#eSujet').value = c.sujet || '';
    $('#eNiveau').value = c.niveau || '';
    $('#ePages').value = c.nbPages || '';
    $('#eTexteSource').value = c.texteSource || '';
    $('#ePrecisions').value = c.precisions || '';
    if (c.precisions) $('#blocPrecisionsExamen').open = true;
    $$('input[name="eOutil"]').forEach(function (r) { r.checked = r.value === (c.outil || 'gemini'); });
    $$('input[name="eSource"]').forEach(function (r) { r.checked = r.value === (c.source || 'joint'); });
    majChampsMode(c);
  }

  function majChampsMode(c) {
    $('#champVersionExamen').hidden = c.mode !== 'version';
    $('#blocTexteSourceExamen').hidden = c.source !== 'colle';
    $('#aideModeExamen').textContent = c.mode === 'version'
      ? 'L\'IA renouvelle les données et recalcule les réponses et les distracteurs. Vous obtenez la copie de l\'élève et son corrigé, sur le même nombre de pages que l\'original.'
      : 'L\'IA reprend les questions telles quelles et rédige le corrigé : méthodes A et B, réponses sur la copie, erreurs fréquentes et grille de correction.';
  }

  function lireChamps() {
    return {
      mode: ($('input[name="eMode"]:checked') || {}).value || 'version',
      version: $('#eVersion').value.trim().toUpperCase().slice(0, 3) || 'B',
      sujet: $('#eSujet').value.trim(),
      niveau: $('#eNiveau').value.trim(),
      nbPages: parseInt($('#ePages').value, 10) || 0,
      outil: ($('input[name="eOutil"]:checked') || {}).value || 'gemini',
      source: ($('input[name="eSource"]:checked') || {}).value || 'joint',
      texteSource: $('#eTexteSource').value,
      precisions: $('#ePrecisions').value
    };
  }

  function contexteConsigne(c) {
    return Object.assign({}, c, { texteSource: c.source === 'colle' ? c.texteSource : '' });
  }

  function controlerChamps() {
    const erreurs = [];
    const c = lireChamps();
    const pagesOk = !$('#ePages').value.trim() || (c.nbPages >= 1 && c.nbPages <= 20);
    const sourceOk = c.source !== 'colle' || c.texteSource.trim().length >= 80;
    if (!pagesOk) erreurs.push('Le nombre de pages doit être compris entre 1 et 20, ou laissé vide.');
    if (!sourceOk) erreurs.push('Collez le texte de l\'examen (toutes les questions), ou choisissez de joindre l\'examen dans la conversation avec l\'IA.');
    $$('#formExamen [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!pagesOk) $('#ePages').setAttribute('aria-invalid', 'true');
    if (!sourceOk) $('#eTexteSource').setAttribute('aria-invalid', 'true');
    $('#erreurEtape1Examen').innerHTML = erreurs.map(ech).join('<br>');
    if (erreurs.length) {
      const premier = $('#formExamen [aria-invalid="true"]');
      if (premier) premier.focus();
    }
    return !erreurs.length;
  }

  function consigneGeneree() { return X.construireConsigne(contexteConsigne(etat.contexte)); }
  function consigneActuelle() { return etat.consigneModifiee || consigneGeneree(); }

  function champsModifies() {
    etat.contexte = lireChamps();
    majChampsMode(etat.contexte);
    if (!etat.consigneModifiee) $('#texteConsigneExamen').value = consigneGeneree();
    majMarche();
    sauver();
  }

  function majMarche() {
    const c = etat.contexte;
    const outil = c.outil === 'copilot' ? 'copilot' : 'gemini';
    const etapes = O().MARCHE[outil].slice();
    if (c.source !== 'colle') etapes[1] = MARCHE_JOINT[outil];
    $('#marcheConsigneExamen').innerHTML = etapes.map(function (l, i) {
      return '<li>' + ech(l) + (i === 0 ? O().liensIA('', outil) : '') + '</li>';
    }).join('');
  }

  function majAideConsigne() {
    $('#btnRetablirConsigneExamen').hidden = !etat.consigneModifiee;
    // Une consigne modifiée reste dépliée : l'enseignant voit qu'elle ne suit plus le formulaire.
    if (etat.consigneModifiee) $('#blocConsigneExamen').open = true;
    $('#aideConsigneExamen').textContent = etat.consigneModifiee
      ? 'Vous avez modifié la consigne : elle ne suit plus les renseignements ci-dessus. « Rétablir la consigne d\'origine » la régénère à partir de ces renseignements.'
      : AIDE_CONSIGNE;
  }

  function preparerEtape1() {
    majMarche();
    $('#texteConsigneExamen').value = consigneActuelle();
    $('#texteConsigneExamen').scrollTop = 0;
    majAideConsigne();
    $('#statutConsigneExamen').textContent = '';
  }

  function validerEtape1(ev) {
    ev.preventDefault();
    if (!controlerChamps()) return;
    const avant = etat.contexte.mode;
    etat.contexte = lireChamps();
    // Un autre mode invalide la réponse déjà vérifiée (consigne différente).
    if (etat.donnees && etat.donnees.mode !== etat.contexte.mode && avant !== etat.contexte.mode) {
      etat.donnees = null;
      etat.reponseBrute = '';
      etat.etapeMax = 2;
    }
    debloquer(2);
    allerEtape(2);
  }

  // ------------------------------------------------------------------
  // Étape 2 — la réponse
  // ------------------------------------------------------------------
  function preparerEtapeReponse() {
    const nom = O().OUTILS_IA[etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini'].nom;
    $('#consigneEtape2Examen').textContent = 'Revenez à l\'onglet de ' + nom + ' ouvert à l\'étape 1, dans la barre des onglets en haut de votre navigateur. ' +
      'Cliquez sur le bouton « Copier » du bloc de code, puis collez ici. Le texte autour du code n\'est pas un problème : l\'assistant le retire.';
    $('#texteRelectureExamen').textContent = X.consigneRelecture(etat.contexte);
    $('#noteMelangeRelectureExamen').hidden = etat.contexte.mode === 'corrige';
    $('#reponseIAExamen').value = etat.reponseBrute || '';
    if (etat.reponseBrute) verifier(false, true);
    else {
      $('#resultatVerificationExamen').innerHTML = '';
      $('#btnVersApercuExamen').disabled = true;
    }
  }

  /**
   * @param {boolean} focus Place le focus sur le résultat.
   * @param {boolean} conserver Réponse déjà vérifiée : la mise en page et les images réglées à l'aperçu sont gardées.
   */
  function verifier(focus, conserver) {
    const brut = $('#reponseIAExamen').value;
    const zone = $('#resultatVerificationExamen');
    const bouton = $('#btnVersApercuExamen');
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
    const norm = X.normaliser(lecture.valeur, etat.contexte);
    if (!norm.ok) {
      if (!conserver) etat.donnees = null;
      etat.reponseBrute = brut;
      zone.innerHTML = '<div class="bandeau bandeau-alerte" role="alert"><strong>Structure inattendue.</strong> ' + ech(norm.erreur) + '</div>';
      sauver();
      return;
    }
    const nouvelle = !conserver || brut !== etat.reponseBrute || !etat.donnees;
    if (nouvelle) {
      // Les images déjà ajoutées sont reprises pour les questions de même numéro.
      const images = {};
      ((etat.donnees && etat.donnees.questions) || []).forEach(function (q) { if (q.image) images[q.numero] = q.image; });
      norm.donnees.questions.forEach(function (q) { if (!q.image && images[q.numero]) q.image = images[q.numero]; });
      etat.donnees = norm.donnees;
    }
    etat.reponseBrute = brut;

    const d = etat.donnees;
    const verif = X.valider(d, etat.contexte);
    const nbQ = d.questions.length;
    let html = '';
    if (!nouvelle) {
      html += '<p class="aide">Les questions affichées tiennent compte de la mise en page et des images réglées à l\'aperçu. Pour repartir de la réponse de l\'IA, modifiez-la ou collez-en une nouvelle, puis vérifiez à nouveau.</p>';
    }
    if (!verif.erreurs.length) {
      html += '<div class="bandeau bandeau-succes" role="status"><strong>Réponse valide.</strong> ' + nbQ + ' question(s) sur ' +
        X.nbPages(d) + ' page(s), ' + X.nombreFr(X.totalPoints(d)) + ' points' +
        (verif.avertissements.length ? ', avec ' + verif.avertissements.length + ' point(s) à surveiller.' : '.') + '</div>';
    } else {
      html += '<div class="bandeau bandeau-alerte" role="alert"><strong>' + verif.erreurs.length +
        ' règle(s) non respectée(s).</strong> Demandez une correction à l\'IA avec la consigne ci-dessous, ou corrigez la réponse collée.</div>';
      html += '<div class="bloc-correction"><h3>Consigne de correction</h3>' +
        '<p>Copiez ce texte, retournez à l\'onglet de la conversation avec l\'IA (celui de l\'étape 1) et collez-le à la suite. Collez ensuite sa nouvelle réponse ci-dessus et vérifiez à nouveau.</p>' +
        '<pre>' + ech(X.consigneCorrection(verif.erreurs)) + '</pre>' +
        '<div class="actions"><button type="button" class="btn btn-primary" id="btnCopierCorrectionExamen">Copier la consigne de correction</button>' +
        '<span class="statut" id="statutCorrectionExamen" role="status" aria-live="polite"></span></div></div>';
    }
    html += O().liste('Règles non respectées', verif.erreurs, 'bloc-alerte');
    html += O().liste('Points à surveiller', verif.avertissements, 'bloc-avertissement');
    if (nouvelle) html += O().liste('Réparations faites automatiquement', lecture.corrections.concat(norm.notes), 'bloc-info');
    html += tableauQuestions(d);
    zone.innerHTML = html;

    const btnCorr = $('#btnCopierCorrectionExamen');
    if (btnCorr) btnCorr.addEventListener('click', function () {
      O().copier(X.consigneCorrection(verif.erreurs), $('#statutCorrectionExamen'));
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

  function reponseResumee(q) {
    if (q.ligneReponse.length) return q.ligneReponse.map(function (l) { return (l.etiquette ? l.etiquette + ' : ' : '') + l.attendu; }).join(' ; ');
    if (q.type === 'choix') {
      const i = q.choix.findIndex(function (c) { return c.correct; });
      return i >= 0 ? String.fromCharCode(97 + i) + ') ' + q.choix[i].texte : '—';
    }
    return q.reponseAttendue || '—';
  }

  function tableauQuestions(d) {
    if (!d.questions.length) return '';
    return '<div class="table-defilante"><table class="tableau-questions"><caption>Questions reçues</caption>' +
      '<thead><tr><th scope="col">N°</th><th scope="col">Page</th><th scope="col">Type</th><th scope="col">Énoncé</th><th scope="col">Réponse attendue</th><th scope="col">Points</th></tr></thead><tbody>' +
      d.questions.map(function (q) {
        let enonce = q.enonce;
        if (enonce.length > 120) enonce = enonce.slice(0, 117) + '…';
        let rep = reponseResumee(q);
        if (rep.length > 80) rep = rep.slice(0, 77) + '…';
        return '<tr><td class="nombres">' + ech(q.numero) + '</td><td class="nombres">' + q.page + '</td><td>' + ech(X.TYPES[q.type]) + '</td>' +
          '<td>' + ech(enonce || '—') + '</td><td>' + ech(rep) + '</td><td class="nombres">' + X.nombreFr(q.points) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------------
  // Étape 3 — l'aperçu des feuilles
  // ------------------------------------------------------------------
  function preparerEtapeApercu() {
    if (!etat.donnees) return;
    majOnglets();
    $('#cbDetailleExamen').checked = !!etat.affichage.detaille;
    majColonne();
    rendreApercu();
    debloquer(4);
  }

  function majOnglets() {
    const corrige = etat.affichage.onglet === 'corrige';
    $('#ongletExamenEleve').setAttribute('aria-pressed', String(!corrige));
    $('#ongletExamenCorrige').setAttribute('aria-pressed', String(corrige));
    $('#champDetailleExamen').hidden = !corrige;
    $('#btnImprimerApercuExamen').textContent = corrige ? 'Imprimer le corrigé…' : 'Imprimer l\'examen…';
  }

  /** Affiche le document choisi dans le cadre ; la position de défilement est gardée. */
  function rendreApercu() {
    const cadre = $('#cadreApercuExamen');
    const type = etat.affichage.onglet === 'corrige' ? 'corrige' : 'examen';
    let defilement = 0;
    try { defilement = cadre.contentWindow ? cadre.contentWindow.scrollY : 0; } catch (e) { defilement = 0; }
    const statut = $('#statutApercuExamen');
    statut.textContent = 'Préparation des feuilles…';
    X.construireDocument(etat.donnees, type, { detaille: etat.affichage.detaille }).then(function (page) {
      cadre.onload = function () {
        const w = cadre.contentWindow;
        X.attendreRendu(w).then(function () {
          const nb = X.paginer(w.document);
          try { w.scrollTo(0, defilement); } catch (e) { /* cadre inaccessible */ }
          annoncerDebordement(X.pagesQuiDebordent(w.document), type, nb);
        }).catch(function (e) { statut.textContent = 'Les formules n\'ont pas pu être affichées : ' + e.message + '.'; });
      };
      cadre.srcdoc = page;
    }).catch(function (e) {
      statut.textContent = 'L\'aperçu n\'a pas pu être préparé : ' + e.message + '. L\'assistant doit être ouvert à partir d\'un site (http ou https).';
    });
  }

  function annoncerDebordement(pages, type, nbCorrige) {
    const statut = $('#statutApercuExamen');
    const n = X.nbPages(etat.donnees);
    if (!pages.length) {
      statut.textContent = type === 'corrige'
        ? 'Corrigé : ' + nbCorrige + ' page(s) en format lettre' + (nbCorrige > n ? ' (l\'examen en compte ' + n + ' : les démarches complètes demandent plus de place)' : '') + ', aucune ne déborde.'
        : 'Examen : ' + n + ' page(s) en format lettre, aucune ne déborde.';
      return;
    }
    const liste = pages.join(', ');
    statut.textContent = (type === 'corrige'
      ? 'Le corrigé déborde à la page ' + liste + ' (contour pointillé) : une question y est plus haute qu\'une feuille. Décochez « Phrases d\'explication des étapes ».'
      : 'L\'examen déborde à la page ' + liste + ' (contour pointillé). Réduisez l\'espace de démarche d\'une question ou déplacez-la vers une autre page.');
  }

  function planifierApercu() {
    clearTimeout(minuterieApercu);
    minuterieApercu = setTimeout(rendreApercu, 350);
  }

  /** Réglages des blocs zone et éléments d'une question (forme, hauteur, colonnes). */
  function reglagesBlocs(q, i) {
    const reglables = (q.blocs || []).map(function (b, k) { return { b: b, k: k }; }).filter(function (x) {
      return x.b.bloc === 'zone' || x.b.bloc === 'elements';
    });
    if (!reglables.length) return '';
    return '<ul class="mise-en-page-blocs">' + reglables.map(function (x) {
      const b = x.b;
      const id = i + ':' + x.k;
      const formes = b.bloc === 'zone' ? XB.FORMES_ZONE : XB.FORMES_ELEMENTS;
      return '<li class="mise-en-page-champs"><span class="aide">' + (b.bloc === 'zone' ? 'Zone' : 'Éléments a) à ' + String.fromCharCode(96 + b.elements.length) + ')') + '</span>' +
        '<label>Forme <select data-bloc-examen="' + id + '" data-champ="forme">' + Object.keys(formes).map(function (f) {
          return '<option value="' + f + '"' + (b.forme === f ? ' selected' : '') + '>' + ech(formes[f]) + '</option>';
        }).join('') + '</select></label>' +
        '<label>Hauteur <input type="number" class="nombres" min="' + (b.bloc === 'zone' ? 1 : 0) + '" max="' + XB.HAUTEUR_MAX + '" value="' + b.hauteur + '" data-bloc-examen="' + id + '" data-champ="hauteur" aria-describedby="aideHauteurExamen"></label>' +
        (b.bloc === 'elements' ? '<label>Colonnes <input type="number" class="nombres" min="1" max="' + XB.COLONNES_MAX + '" value="' + b.colonnes + '" data-bloc-examen="' + id + '" data-champ="colonnes"></label>' : '') +
        '</li>';
    }).join('') + '</ul>';
  }

  /** Colonne « Mise en page et images » : page et zones de réponse de chaque question, schémas à ajouter. */
  function majColonne() {
    const d = etat.donnees;
    const n = X.nbPages(d);
    const lignes = d.questions.map(function (q, i) {
      const image = (q.figure || q.image) ? '<div class="mise-en-page-image">' +
        '<span class="aide">' + (q.image ? 'Schéma ajouté.' : 'Schéma à ajouter : ' + ech(q.figure)) + '</span>' +
        '<span class="liste-images-boutons">' +
          (q.figure ? '<button type="button" class="btn" data-demande-image-examen="' + i + '">Copier la demande d\'image</button>' : '') +
          '<button type="button" class="btn' + (q.image ? '' : ' btn-primary') + '" data-coller-image-examen="' + i + '">Coller l\'image</button>' +
          '<label class="btn">Choisir un fichier<input type="file" accept="image/png,image/jpeg" data-image-examen="' + i + '" hidden></label>' +
          (q.image && window.ImageRetouchCanvas ? '<button type="button" class="btn" data-retoucher-image-examen="' + i + '">Retoucher l\'image</button>' : '') +
          (q.image ? '<button type="button" class="btn btn-quiet" data-retirer-image-examen="' + i + '">Retirer</button>' : '') +
        '</span></div>' : '';
      return '<li class="mise-en-page-question"><span class="mise-en-page-nom">Question ' + ech(q.numero) + ' <span class="aide">(' + ech(X.TYPES[q.type].toLowerCase()) + ')</span></span>' +
        '<span class="mise-en-page-champs">' +
          '<label>Page <input type="number" class="nombres" min="1" max="' + (n + 1) + '" value="' + q.page + '" data-page-examen="' + i + '"></label>' +
        '</span>' + reglagesBlocs(q, i) + image + '</li>';
    }).join('');
    const avecSchema = d.questions.some(function (q) { return q.figure && !q.image; });
    const outil = etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini';
    const marche = avecSchema ? '<ol class="marche-a-suivre aide">' +
      '<li>« Copier la demande d\'image » à côté de la question, puis collez-la dans ' + ech(O().OUTILS_IA[outil].nom) + ' (Ctrl+V).' + O().liensIA('', outil) + '</li>' +
      '<li>Quand l\'image est prête, faites un clic droit sur l\'image, puis « Copier l\'image » (ou enregistrez-la, ou utilisez votre propre schéma en PNG ou JPEG).</li>' +
      '<li>Revenez ici et cliquez sur « Coller l\'image » (ou appuyez sur Ctrl+V) ; pour un fichier enregistré, « Choisir un fichier ». « Retoucher l\'image » corrige ensuite un détail (masquer un texte, cloner un fond).</li>' +
      '</ol>' : '';
    $('#blocMiseEnPageExamen').innerHTML = marche +
      '<p class="aide" id="aideHauteurExamen">Forme et hauteur des zones de réponse de la copie (un cadre pour dessiner ou poser une démarche). Hauteur en lignes d\'écriture (' + X.nombreFr(X.LIGNE_POUCES) + ' po chacune) ; pour des éléments a), b)…, hauteur de la place de chaque élément. L\'espace qui reste sur la feuille est réparti également sous les questions.</p>' +
      '<ul class="liste-mise-en-page">' + lignes + '</ul>';
    $$('[data-page-examen]').forEach(function (el) {
      el.addEventListener('change', function () {
        const q = etat.donnees.questions[Number(el.dataset.pageExamen)];
        q.page = Math.max(1, Math.min(X.nbPages(etat.donnees) + 1, parseInt(el.value, 10) || 1));
        compacterPages();
        sauver();
        majColonne();
        planifierApercu();
      });
    });
    $$('[data-bloc-examen]').forEach(function (el) {
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', function () {
        const r = el.dataset.blocExamen.split(':');
        const b = etat.donnees.questions[Number(r[0])].blocs[Number(r[1])];
        const champ = el.dataset.champ;
        if (champ === 'forme') {
          if (!(b.bloc === 'zone' ? XB.FORMES_ZONE : XB.FORMES_ELEMENTS)[el.value]) return;
          b.forme = el.value;
        } else {
          const v = parseInt(el.value, 10);
          if (!isFinite(v)) return;
          b[champ] = champ === 'colonnes' ? Math.max(1, Math.min(XB.COLONNES_MAX, v)) : Math.max(b.bloc === 'zone' ? 1 : 0, Math.min(XB.HAUTEUR_MAX, v));
        }
        sauver();
        planifierApercu();
      });
    });
    $$('[data-image-examen]').forEach(function (el) {
      el.addEventListener('change', function () {
        if (el.files && el.files[0]) ajouterImage(Number(el.dataset.imageExamen), el.files[0]);
        el.value = '';
      });
    });
    $$('[data-demande-image-examen]').forEach(function (b) {
      b.addEventListener('click', function () {
        const q = etat.donnees.questions[Number(b.dataset.demandeImageExamen)];
        O().copier(X.demandeImage(q, etat.donnees, etat.contexte.niveau), null);
        O().annoncer($('#statutImageExamen'), 'Demande copiée pour la question ' + q.numero + '. Collez-la dans ' + O().OUTILS_IA[outil].nom + ' (Ctrl+V).');
      });
    });
    $$('[data-coller-image-examen]').forEach(function (b) {
      b.addEventListener('click', function () { collerImage(Number(b.dataset.collerImageExamen)); });
    });
    $$('[data-retoucher-image-examen]').forEach(function (b) {
      b.addEventListener('click', function () { retoucherImage(Number(b.dataset.retoucherImageExamen)); });
    });
    $$('[data-retirer-image-examen]').forEach(function (b) {
      b.addEventListener('click', function () {
        etat.donnees.questions[Number(b.dataset.retirerImageExamen)].image = '';
        sauver();
        majColonne();
        rendreApercu();
      });
    });
  }

  /** Pages renumérotées à la suite si une page s'est vidée. */
  function compacterPages() {
    const vues = [];
    etat.donnees.questions.forEach(function (q) { if (vues.indexOf(q.page) < 0) vues.push(q.page); });
    vues.sort(function (a, b) { return a - b; });
    etat.donnees.questions.forEach(function (q) { q.page = vues.indexOf(q.page) + 1; });
  }

  /** Image d'un schéma choisie dans un fichier ou collée : PNG ou JPEG seulement. */
  function ajouterImage(i, fichier) {
    const statut = $('#statutImageExamen');
    if (!/^image\/(png|jpeg)$/.test(fichier.type)) { O().annoncer(statut, 'Choisissez une image PNG ou JPEG.'); return; }
    const lecteur = new FileReader();
    lecteur.onload = function () { placerImage(i, lecteur.result); };
    lecteur.onerror = function () { O().annoncer(statut, 'Cette image n\'a pas pu être lue.'); };
    lecteur.readAsDataURL(fichier);
  }

  /** Image placée dans la question i : ramenée à 1200 px de côté, en PNG ou JPEG. */
  function placerImage(i, dataUrl, message) {
    const statut = $('#statutImageExamen');
    if (!/^data:image\//.test(dataUrl)) { O().annoncer(statut, 'Ce fichier n\'est pas une image.'); return; }
    const img = new Image();
    img.onload = function () {
      const r = Math.min(1, TAILLE_IMAGE / Math.max(img.width, img.height));
      let url = dataUrl;
      if (r < 1 || !/^data:image\/(png|jpeg)/.test(dataUrl)) {
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r);
        c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        url = c.toDataURL(/^data:image\/jpeg/.test(dataUrl) ? 'image/jpeg' : 'image/png', 0.9);
      }
      const q = etat.donnees.questions[i];
      q.image = url;
      sauver();
      majColonne();
      rendreApercu();
      O().annoncer(statut, message || ('Image ajoutée à la question ' + q.numero + (r < 1 ? ', ramenée à ' + TAILLE_IMAGE + ' px.' : '.')));
    };
    img.onerror = function () { O().annoncer(statut, 'Cette image n\'a pas pu être lue.'); };
    img.src = dataUrl;
  }

  /** Bouton « Coller l'image » : lit l'image du presse-papiers. */
  function collerImage(i) {
    const statut = $('#statutImageExamen');
    if (!navigator.clipboard || !navigator.clipboard.read) {
      O().annoncer(statut, 'Votre navigateur ne permet pas ce bouton : appuyez plutôt sur Ctrl+V dans cette page.');
      return;
    }
    navigator.clipboard.read().then(function (elements) {
      for (let k = 0; k < elements.length; k++) {
        const type = elements[k].types.filter(function (t) { return /^image\//.test(t); })[0];
        if (type) return elements[k].getType(type).then(function (blob) { ajouterImage(i, new File([blob], 'image', { type: blob.type })); });
      }
      O().annoncer(statut, 'Le presse-papiers ne contient pas d\'image. Faites un clic droit sur l\'image, puis « Copier l\'image ».');
    }).catch(function () {
      O().annoncer(statut, 'Le navigateur a refusé le collage par le bouton : appuyez plutôt sur Ctrl+V dans cette page.');
    });
  }

  /** Ctrl+V à l'étape de l'aperçu : l'image va à la première question dont le schéma manque. */
  function collageAuClavier(ev) {
    if ($('#ecranExamen').hidden || etat.etape !== 3 || !etat.donnees) return;
    const t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const i = etat.donnees.questions.findIndex(function (q) { return q.figure && !q.image; });
    if (i < 0) return;
    const item = Array.prototype.slice.call((ev.clipboardData && ev.clipboardData.items) || [])
      .filter(function (it) { return it.kind === 'file' && /^image\//.test(it.type); })[0];
    if (!item) return;
    ev.preventDefault();
    ajouterImage(i, item.getAsFile());
  }

  /** « Retoucher l'image » : éditeur partagé de moteur-ui (pinceau, pipette, clonage). */
  function retoucherImage(i) {
    const q = etat.donnees.questions[i];
    if (!q || !q.image || !window.ImageRetouchCanvas) return;
    window.ImageRetouchCanvas.open({
      imageSrc: q.image,
      titre: 'Retouche de l\'image — question ' + q.numero,
      libelleEnregistrer: 'Enregistrer l\'image retouchée',
      onSave: function (url) { placerImage(i, url, 'Image retouchée enregistrée pour la question ' + q.numero + '.'); }
    });
  }

  function imprimerCadre(cadre) {
    try {
      cadre.contentWindow.focus();
      cadre.contentWindow.print();
    } catch (e) {
      O().annoncer($('#statutApercuExamen'), 'L\'impression n\'a pas pu être lancée : ' + e.message + '.');
    }
  }

  // ------------------------------------------------------------------
  // Étape 4 — impression et exportation
  // ------------------------------------------------------------------
  function preparerEtapeExport() {
    if (!etat.donnees) return;
    const d = etat.donnees;
    const verif = X.valider(d, etat.contexte);
    let html = '<dl class="resume-liste">' +
      '<dt>Examen</dt><dd>' + ech(X.titreAvecVersion(d)) + '</dd>' +
      '<dt>Demande</dt><dd>' + (d.mode === 'version' ? 'Nouvelle version et son corrigé' : 'Corrigé de l\'examen') + '</dd>' +
      '<dt>Questions</dt><dd class="nombres">' + d.questions.length + '</dd>' +
      '<dt>Pages</dt><dd class="nombres">' + X.nbPages(d) + ' (format lettre, 8,5 × 11 po)</dd>' +
      '<dt>Barème</dt><dd class="nombres">' + X.nombreFr(X.totalPoints(d)) + ' points</dd></dl>';
    if (verif.erreurs.length) {
      html += '<div class="bandeau bandeau-avertissement" role="status"><strong>' + verif.erreurs.length +
        ' règle(s) encore non respectée(s).</strong> Les documents peuvent être exportés, mais il est préférable de les corriger (étape 2).' +
        '<ul class="liste-erreurs">' + verif.erreurs.map(function (e) {
          return '<li><strong>' + ech(e.lieu) + '</strong> : ' + ech(e.msg) + '</li>';
        }).join('') + '</ul></div>';
    }
    $('#resumeExportExamen').innerHTML = html;
    $('#statutExportExamen').textContent = '';
    // Corrigé d'un examen : le corrigé d'abord, la copie retranscrite ensuite.
    const corrigeDabord = d.mode === 'corrige';
    $('#ligneExportCorrige').style.order = corrigeDabord ? '0' : '1';
    $('#ligneExportEleve').style.order = corrigeDabord ? '1' : '0';
    $('#libelleExportEleve').textContent = corrigeDabord ? 'Copie de l\'élève (retranscrite)' : 'Examen de l\'élève (version ' + (d.version || 'nouvelle') + ')';
    $('#aideDossierExamen').textContent = O().choixDossierPossible()
      ? 'Une fenêtre vous permet de choisir le dossier et le nom de chaque fichier. Le navigateur retient le dernier dossier choisi.'
      : 'Votre navigateur ne permet pas de choisir le dossier : les fichiers vont dans votre dossier Téléchargements. Avec Chrome ou Edge, une fenêtre vous permet de choisir le dossier.';
  }

  let cadreHorsEcran = null;
  /** Document rendu dans un cadre invisible (impression ou page HTML statique). */
  function rendreHorsEcran(type) {
    if (cadreHorsEcran) cadreHorsEcran.remove();
    const cadre = document.createElement('iframe');
    cadre.setAttribute('aria-hidden', 'true');
    cadre.setAttribute('tabindex', '-1');
    cadre.title = 'Document à imprimer';
    cadre.style.cssText = 'position:fixed;left:-10000px;top:0;width:9.5in;height:11in;border:0;';
    document.body.appendChild(cadre);
    cadreHorsEcran = cadre;
    return X.construireDocument(etat.donnees, type, { detaille: etat.affichage.detaille }).then(function (page) {
      return new Promise(function (resolve, reject) {
        cadre.onload = function () {
          X.attendreRendu(cadre.contentWindow).then(function () {
            X.paginer(cadre.contentWindow.document);
            X.pagesQuiDebordent(cadre.contentWindow.document);
            resolve(cadre);
          }, reject);
        };
        cadre.srcdoc = page;
      });
    });
  }

  function imprimer(type) {
    const statut = $('#statutExportExamen');
    O().annoncer(statut, 'Préparation du document à imprimer…');
    rendreHorsEcran(type).then(function (cadre) {
      statut.textContent = '';
      imprimerCadre(cadre);
    }).catch(function (e) { O().annoncer(statut, 'Le document n\'a pas pu être préparé : ' + e.message + '.'); });
  }

  function exporterHtml(type) {
    const statut = $('#statutExportExamen');
    const d = etat.donnees;
    O().enregistrerSous(X.nomFichier(d, type),
      function () { return rendreHorsEcran(type).then(function (cadre) { return X.serialiser(cadre.contentWindow.document); }); },
      'text/html;charset=utf-8',
      [{ description: 'Page web imprimable', accept: { 'text/html': ['.html'] } }])
      .then(function (r) {
        const quoi = type === 'corrige' ? 'Le corrigé' : 'L\'examen';
        if (r.etat === 'annule') O().annoncer(statut, 'Enregistrement annulé.');
        else if (r.etat === 'enregistre') O().annoncer(statut, quoi + ' est enregistré : ' + r.nom + '.');
        else O().annoncer(statut, quoi + ' a été téléchargé dans votre dossier Téléchargements.');
      })
      .catch(function (e) { O().annoncer(statut, 'La page n\'a pas pu être enregistrée : ' + e.message + '.'); });
  }

  // ------------------------------------------------------------------
  // Enregistrement et reprise
  // ------------------------------------------------------------------
  function titreProjet() {
    return (etat.donnees && X.titreAvecVersion(etat.donnees)) || etat.contexte.sujet || 'Examen';
  }

  function enregistrerProjet(statutEl) {
    sauver();
    const contenu = {
      contexte: etat.contexte,
      consigneModifiee: etat.consigneModifiee,
      reponseBrute: etat.reponseBrute,
      donnees: etat.donnees,
      affichage: etat.affichage,
      etape: etat.etape,
      etapeMax: etat.etapeMax
    };
    const env = P.emballer(TYPE, titreProjet(), etat.etape, contenu);
    const zone = statutEl || $('#statutEntete');
    O().enregistrerSous(P.nomFichier(TYPE, titreProjet()), JSON.stringify(env, null, 2), 'application/json', [
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
    try {
      if (r.format !== 'enveloppe') throw new Error('ce fichier n\'est pas un projet d\'examen');
      const p = r.projet || {};
      if (!p.contexte || typeof p.contexte !== 'object') throw new Error('le contenu du projet est incomplet');
      etat = nouvelEtat();
      etat.contexte = Object.assign(etat.contexte, p.contexte);
      etat.affichage = Object.assign(etat.affichage, p.affichage || {});
      etat.consigneModifiee = p.consigneModifiee || '';
      etat.reponseBrute = p.reponseBrute || '';
      etat.donnees = p.donnees ? X.completer(p.donnees) : null;
      etat.etapeMax = Math.max(1, Math.min(NB_ETAPES, p.etapeMax || 1));
      if (!etat.donnees) etat.etapeMax = Math.min(etat.etapeMax, 2);
      dernierContenu = null;
      ouvrirParcours(Math.min(p.etape || 1, etat.etapeMax));
      return null;
    } catch (e) {
      return e.message;
    }
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------
  function init() {
    if (!X || !O()) return;

    $$('[data-demarrer-examen]').forEach(function (b) {
      b.addEventListener('click', function () {
        const choix = b.dataset.demarrerExamen;
        if (choix === 'exemple') demarrerExemple();
        else if (choix === 'nouveau') demarrerNouveau();
        else continuerProjet();
      });
    });
    $('#btnQuitterExempleExamen').addEventListener('click', demarrerNouveau);

    $$('#ecranExamen .etapes button').forEach(function (b) {
      b.addEventListener('click', function () { allerEtape(Number(b.dataset.etapeExamen)); });
    });
    $$('[data-aller-examen]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = Number(b.dataset.allerExamen);
        debloquer(Math.min(n, etat.etapeMax + 1));
        allerEtape(n);
      });
    });

    $('#formExamen').addEventListener('submit', validerEtape1);
    ['eVersion', 'eSujet', 'eNiveau', 'ePages', 'eTexteSource', 'ePrecisions'].forEach(function (id) {
      $('#' + id).addEventListener('input', champsModifies);
    });
    $$('input[name="eMode"], input[name="eOutil"], input[name="eSource"]').forEach(function (r) {
      r.addEventListener('change', champsModifies);
    });

    $('#texteConsigneExamen').addEventListener('input', function () {
      etat.consigneModifiee = this.value === consigneGeneree() ? '' : this.value;
      majAideConsigne();
      sauver();
    });
    $('#btnRetablirConsigneExamen').addEventListener('click', function () {
      etat.consigneModifiee = '';
      etat.contexte = lireChamps();
      $('#texteConsigneExamen').value = consigneActuelle();
      majAideConsigne();
      sauver();
      O().annoncer($('#statutConsigneExamen'), 'La consigne d\'origine a été rétablie.');
      $('#texteConsigneExamen').focus();
    });
    $('#btnCopierConsigneExamen').addEventListener('click', function () {
      if (!controlerChamps()) return;
      O().copier($('#texteConsigneExamen').value, $('#statutConsigneExamen'));
    });

    $('#btnCopierRelectureExamen').addEventListener('click', function () {
      O().copier(X.consigneRelecture(etat.contexte), $('#statutRelectureExamen'));
    });
    $('#btnVerifierExamen').addEventListener('click', function () { verifier(true, false); });
    $('#btnVersApercuExamen').addEventListener('click', function () { allerEtape(3); });

    $('#ongletExamenEleve').addEventListener('click', function () { etat.affichage.onglet = 'examen'; majOnglets(); sauver(); rendreApercu(); });
    $('#ongletExamenCorrige').addEventListener('click', function () { etat.affichage.onglet = 'corrige'; majOnglets(); sauver(); rendreApercu(); });
    $('#cbDetailleExamen').addEventListener('change', function () { etat.affichage.detaille = this.checked; sauver(); rendreApercu(); });
    $('#btnImprimerApercuExamen').addEventListener('click', function () { imprimerCadre($('#cadreApercuExamen')); });

    $('#btnImprimerExamen').addEventListener('click', function () { imprimer('examen'); });
    $('#btnImprimerCorrige').addEventListener('click', function () { imprimer('corrige'); });
    $('#btnHtmlExamen').addEventListener('click', function () { exporterHtml('examen'); });
    $('#btnHtmlCorrige').addEventListener('click', function () { exporterHtml('corrige'); });
    $('#btnExporterProjetExamen').addEventListener('click', function () { enregistrerProjet($('#statutExportExamen')); });
    $('#btnNouveauExamen').addEventListener('click', demarrerNouveau);
    document.addEventListener('paste', collageAuClavier);

    const dernier = DERNIER_AU_CHARGEMENT;
    if (dernier && dernier.type === TYPE) {
      const p = lireProjet(dernier.exemple ? CLE_EXEMPLE : CLE_PROJET);
      if (p) {
        etat = p;
        dernierContenu = empreinte(etat);
        if (etat.ecran === 'examen') {
          ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
          return;
        }
      }
    }
    majContinuer();
  }

  window.MoodleAIAssistantExamen = {
    majContinuer: function () { if (X && O()) majContinuer(); },
    projetEnCours: projetEnCours,
    ouvrirReprise: ouvrirReprise,
    enregistrerProjet: function () { enregistrerProjet(); },
    quitter: quitter
  };

  document.addEventListener('DOMContentLoaded', init);
})();
