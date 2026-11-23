/**
 * Assistant de création — parcours « Banque de questions Moodle XML ».
 * Même déroulement que la vidéo interactive (assistant.js), dont il reprend les outils
 * communs (window.MoodleAIOutils) : 1. le cours et la consigne, 2. la réponse de l'IA,
 * 3. l'aperçu dans le simulateur Moodle de moteur-ui, 4. l'exportation XML.
 */
(function () {
  'use strict';

  const TYPE = 'moodle-xml';
  const CLE_PROJET = 'moodleai.' + TYPE + '.projet';
  const CLE_EXEMPLE = 'moodleai.' + TYPE + '.exemple';
  const CLE_DERNIER = 'moodleai.dernier';
  const NB_ETAPES = 4;
  const X = window.MoodleAIMoodle;
  const P = window.MoodleAIProjets;
  const O = function () { return window.MoodleAIOutils; };
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  const AIDE_CONSIGNE = 'Elle suit les renseignements ci-dessus. Vous pouvez la modifier avant de la copier, par exemple pour préciser une notion à cibler. Gardez les sections « Règles » et « Format de la réponse » intactes : l\'assistant en a besoin pour lire la réponse.';
  const MARCHE_JOINT = {
    gemini: 'Collez la consigne (Ctrl+V), puis joignez votre document de cours avec le bouton « + » de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.',
    copilot: 'Collez la consigne (Ctrl+V), puis joignez votre document de cours avec le trombone de la zone de saisie, et envoyez. Gardez cet onglet ouvert : vous y reviendrez pour copier la réponse.'
  };

  let etat = nouvelEtat();
  let dernierContenu = null;
  let alerteStockage = false;
  // Lu avant l'initialisation d'assistant.js, dont l'affichage de l'accueil réécrit cette clé.
  const DERNIER_AU_CHARGEMENT = (function () {
    try { return JSON.parse(localStorage.getItem(CLE_DERNIER) || 'null'); } catch (e) { return null; }
  })();

  function nouvelEtat() {
    return {
      exemple: false,
      ecran: 'accueil',
      etape: 1,
      etapeMax: 1,
      contexte: {
        sujet: '', niveau: '', nbQuestions: 9, types: X.TOUS_LES_TYPES.slice(),
        outil: 'gemini', source: 'joint', texteCours: '', precisions: ''
      },
      consigneModifiee: '',
      reponseBrute: '',
      donnees: null
    };
  }
  function empreinte(e) { return JSON.stringify(Object.assign({}, e, { sauveLe: null, ecran: null })); }

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
      // Le plus souvent : images trop lourdes pour la mémoire du navigateur.
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
  function projetEnCours() {
    const p = lireProjet(CLE_PROJET);
    return p && (p.contexte.sujet || p.reponseBrute || p.donnees) ? p : null;
  }

  // ------------------------------------------------------------------
  // Démarrage
  // ------------------------------------------------------------------
  function ouvrirParcours(etape) {
    remplirEtape1();
    etat.ecran = 'moodle';
    O().afficherEcran('moodle');
    $('#bandeauExempleMoodle').hidden = !etat.exemple;
    allerEtape(etape);
  }

  function demarrerExemple() {
    const ex = window.MoodleAIExemples && window.MoodleAIExemples.moodle;
    if (!ex) return;
    etat = nouvelEtat();
    etat.exemple = true;
    etat.contexte = Object.assign(etat.contexte, JSON.parse(JSON.stringify(ex.contexte)));
    etat.reponseBrute = ex.reponseIA;
    const lecture = window.MoodleAICollage.lireJson(ex.reponseIA);
    const norm = lecture.ok ? X.normaliser(lecture.valeur, etat.contexte) : null;
    etat.donnees = norm && norm.ok ? norm.donnees : null;
    // L'image de l'exemple remplace celle que l'enseignant fournirait à l'étape 3.
    if (etat.donnees && ex.images) {
      etat.donnees.questions.forEach(function (q) {
        const img = ex.images[q.name];
        if (q.type === 'ddimageortext' && img) {
          q.bgImage = img.src;
          q.drops = JSON.parse(JSON.stringify(img.drops));
        }
      });
    }
    etat.etapeMax = etat.donnees ? NB_ETAPES : 2;
    ouvrirParcours(1);
    // L'image de l'exemple est ramenée à la taille permise par Moodle.
    if (etat.donnees) X.limiterImages(etat.donnees).then(function (n) { if (n) sauver(); });
  }

  function demarrerNouveau() {
    if (projetEnCours() && !confirm('Une banque de questions est déjà en cours dans ce navigateur. La remplacer par un nouveau projet ?\n\nPour la conserver, annulez, ouvrez-la avec le bouton « Continuer » de l\'accueil et cliquez sur « Enregistrer le projet ».')) return;
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
    $('#blocContinuerMoodle').hidden = !p;
    if (!p) return;
    const titre = (p.donnees && p.donnees.titre) || p.contexte.sujet || 'banque sans titre';
    const etape = Math.min(p.etape || 1, p.etapeMax || 1);
    $('[data-demarrer-moodle="continuer"]').textContent = 'Continuer : ' + titre + ' (étape ' + etape + ' sur ' + NB_ETAPES + ')';
    $('#infoContinuerMoodle').textContent = p.sauveLe
      ? 'Sauvegardé dans ce navigateur le ' + O().dateLisible(p.sauveLe) + '.'
      : 'Sauvegardé dans ce navigateur.';
  }

  /** Bouton « Accueil » de l'en-tête. */
  function quitter() {
    if (etat.etape === 3) recupererEditions();
    etat.ecran = 'accueil';
    sauver();
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------
  function allerEtape(n, focus) {
    if (etat.etape === 3 && n !== 3) recupererEditions();
    if (n > etat.etapeMax) return;
    etat.etape = n;
    $$('#ecranMoodle [data-panneau-moodle]').forEach(function (p) {
      p.hidden = Number(p.dataset.panneauMoodle) !== n;
    });
    if (n === 1) preparerEtape1();
    if (n === 2) preparerEtapeReponse();
    if (n === 3) preparerEtapeApercu();
    if (n === 4) preparerEtapeExport();
    majNavigation(n);
    sauver();
    if (focus !== false) {
      const titre = $('#ecranMoodle [data-panneau-moodle="' + n + '"] h2');
      if (titre) titre.focus();
    }
  }

  function majNavigation(n) {
    $$('#ecranMoodle .etapes button').forEach(function (b) {
      const k = Number(b.dataset.etapeMoodle);
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
  // Étape 1 — le cours et la consigne
  // ------------------------------------------------------------------
  function construireListeTypes() {
    $('#listeTypes').innerHTML = X.TYPES.map(function (t) {
      return '<li><label class="type-choix"><input type="checkbox" name="mType" value="' + t.cle + '"> ' +
        '<span><span class="type-libelle">' + O().echapper(t.libelle) + '</span>' +
        '<span class="type-aide">' + O().echapper(t.aide) + '</span></span></label></li>';
    }).join('');
  }

  function remplirEtape1() {
    const c = etat.contexte;
    $('#mSujet').value = c.sujet || '';
    $('#mNiveau').value = c.niveau || '';
    $('#mNb').value = c.nbQuestions || 9;
    $('#mTexteCours').value = c.texteCours || '';
    $('#mPrecisions').value = c.precisions || '';
    if (c.precisions) $('#blocPrecisions').open = true;
    $$('input[name="mType"]').forEach(function (cb) { cb.checked = (c.types || []).indexOf(cb.value) >= 0; });
    $$('input[name="mOutil"]').forEach(function (r) { r.checked = r.value === (c.outil || 'gemini'); });
    $$('input[name="mSource"]').forEach(function (r) { r.checked = r.value === (c.source || 'joint'); });
    $('#blocTexteCours').hidden = c.source !== 'colle';
    majRepartition();
  }

  function lireChamps() {
    const source = ($('input[name="mSource"]:checked') || {}).value || 'joint';
    return {
      sujet: $('#mSujet').value.trim(),
      niveau: $('#mNiveau').value.trim(),
      nbQuestions: parseInt($('#mNb').value, 10) || etat.contexte.nbQuestions || 9,
      types: $$('input[name="mType"]:checked').map(function (cb) { return cb.value; }),
      outil: ($('input[name="mOutil"]:checked') || {}).value || 'gemini',
      source: source,
      texteCours: $('#mTexteCours').value,
      precisions: $('#mPrecisions').value
    };
  }

  /** Contexte transmis à la consigne : le texte collé n'y figure que si la source choisie est « colle ». */
  function contexteConsigne(c) {
    return Object.assign({}, c, { texteCours: c.source === 'colle' ? c.texteCours : '' });
  }

  function majRepartition() {
    const c = lireChamps();
    const zone = $('#aideRepartition');
    if (!c.types.length) { zone.textContent = 'Cochez au moins un type de question.'; return; }
    const r = X.repartition(c);
    const total = Math.max(c.nbQuestions, c.types.length);
    zone.textContent = 'Répartition demandée (' + total + ' questions) : ' +
      c.types.map(function (t) { return X.LIBELLES[t].toLowerCase() + ' ' + r[t]; }).join(', ') + '.' +
      (c.nbQuestions < c.types.length ? ' Le nombre de questions est porté à ' + c.types.length + ', une par type coché.' : '');
  }

  function controlerChamps() {
    const erreurs = [];
    const c = lireChamps();
    const nbOk = c.nbQuestions >= 3 && c.nbQuestions <= 30;
    const typesOk = c.types.length > 0;
    const sujetOk = !!c.sujet;
    const coursOk = c.source !== 'colle' || c.texteCours.trim().length >= 200;
    if (!sujetOk) erreurs.push('Indiquez le sujet de la banque (ex. : Le système respiratoire).');
    if (!nbOk) erreurs.push('Le nombre de questions doit être compris entre 3 et 30.');
    if (!typesOk) erreurs.push('Cochez au moins un type de question.');
    if (!coursOk) erreurs.push('Collez le texte du cours (au moins quelques paragraphes), ou choisissez de joindre votre document dans la conversation avec l\'IA.');

    $$('#formMoodle [aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (!sujetOk) $('#mSujet').setAttribute('aria-invalid', 'true');
    if (!nbOk) $('#mNb').setAttribute('aria-invalid', 'true');
    if (!coursOk) $('#mTexteCours').setAttribute('aria-invalid', 'true');
    $('#erreurEtape1Moodle').innerHTML = erreurs.map(O().echapper).join('<br>');
    if (erreurs.length) {
      const premier = $('#formMoodle [aria-invalid="true"]') || $('input[name="mType"]');
      if (premier) premier.focus();
    }
    return !erreurs.length;
  }

  function consigneGeneree() { return X.construireConsigne(contexteConsigne(etat.contexte)); }
  function consigneActuelle() { return etat.consigneModifiee || consigneGeneree(); }

  function champsModifies() {
    etat.contexte = lireChamps();
    $('#blocTexteCours').hidden = etat.contexte.source !== 'colle';
    majRepartition();
    if (!etat.consigneModifiee) $('#texteConsigneMoodle').value = consigneGeneree();
    majMarche();
    sauver();
  }

  function majMarche() {
    const c = etat.contexte;
    const outil = c.outil === 'copilot' ? 'copilot' : 'gemini';
    const etapes = O().MARCHE[outil].slice();
    if (c.source !== 'colle') etapes[1] = MARCHE_JOINT[outil];
    $('#marcheConsigneMoodle').innerHTML = etapes.map(function (l, i) {
      return '<li>' + O().echapper(l) + (i === 0 ? O().liensIA('', outil) : '') + '</li>';
    }).join('');
  }

  function majAideConsigne() {
    $('#btnRetablirConsigneMoodle').hidden = !etat.consigneModifiee;
    $('#aideConsigneMoodle').textContent = etat.consigneModifiee
      ? 'Vous avez modifié la consigne : elle ne suit plus les renseignements ci-dessus. « Rétablir la consigne d\'origine » la régénère à partir de ces renseignements.'
      : AIDE_CONSIGNE;
  }

  function preparerEtape1() {
    majMarche();
    $('#texteConsigneMoodle').value = consigneActuelle();
    $('#texteConsigneMoodle').scrollTop = 0;
    majAideConsigne();
    $('#statutConsigneMoodle').textContent = '';
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
    $('#consigneEtape2Moodle').textContent = 'Revenez à l\'onglet de ' + nom + ' ouvert à l\'étape 1, dans la barre des onglets en haut de votre navigateur. ' +
      'Cliquez sur le bouton « Copier » du bloc de code, puis collez ici. Le texte autour du code n\'est pas un problème : l\'assistant le retire.';
    $('#reponseIAMoodle').value = etat.reponseBrute || '';
    if (etat.reponseBrute) verifier(false, true);
    else {
      $('#resultatVerificationMoodle').innerHTML = '';
      $('#btnVersApercuMoodle').disabled = true;
    }
  }

  /**
   * @param {boolean} focus Place le focus sur le résultat.
   * @param {boolean} conserver Réponse déjà vérifiée (retour à l'étape 2) : les données,
   *   éventuellement modifiées à l'aperçu (images, corrections), sont gardées.
   */
  function verifier(focus, conserver) {
    const brut = $('#reponseIAMoodle').value;
    const zone = $('#resultatVerificationMoodle');
    const bouton = $('#btnVersApercuMoodle');
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
    const norm = X.normaliser(lecture.valeur, etat.contexte);
    if (!norm.ok) {
      if (!conserver) etat.donnees = null;
      etat.reponseBrute = brut;
      zone.innerHTML = '<div class="bandeau bandeau-alerte" role="alert"><strong>Structure inattendue.</strong> ' + ech(norm.erreur) + '</div>';
      sauver();
      return;
    }

    // Nouvelle réponse : les images déjà ajoutées sont reprises pour les questions de même titre.
    const nouvelle = !conserver || brut !== etat.reponseBrute || !etat.donnees;
    if (nouvelle) {
      const anciennes = {};
      ((etat.donnees && etat.donnees.questions) || []).forEach(function (q) {
        if (q.type === 'ddimageortext' && q.bgImage) anciennes[q.name] = q;
      });
      norm.donnees.questions.forEach(function (q) {
        const a = anciennes[q.name];
        if (q.type === 'ddimageortext' && a) {
          q.bgImage = a.bgImage;
          if ((a.drops || []).length === (q.drops || []).length) q.drops = a.drops;
        }
      });
      etat.donnees = norm.donnees;
    }
    etat.reponseBrute = brut;

    const d = etat.donnees;
    const verif = X.valider(d, etat.contexte);
    const nbQ = d.questions.length;
    let html = '';
    if (!nouvelle) {
      html += '<p class="aide">Les questions affichées tiennent compte des modifications faites à l\'aperçu. Pour repartir de la réponse de l\'IA, modifiez-la ou collez-en une nouvelle, puis vérifiez à nouveau.</p>';
    }
    if (!verif.erreurs.length) {
      html += '<div class="bandeau bandeau-succes" role="status"><strong>Réponse valide.</strong> ' + nbQ +
        ' question(s) prête(s)' + (verif.avertissements.length ? ', avec ' + verif.avertissements.length + ' point(s) à surveiller.' : '.') + '</div>';
    } else {
      html += '<div class="bandeau bandeau-alerte" role="alert"><strong>' + verif.erreurs.length +
        ' règle(s) non respectée(s).</strong> Demandez une correction à l\'IA avec la consigne ci-dessous, ou corrigez à l\'étape 3 avec le mode d\'édition.</div>';
      html += '<div class="bloc-correction"><h3>Consigne de correction</h3>' +
        '<p>Copiez ce texte, retournez à l\'onglet de la conversation avec l\'IA (celui de l\'étape 1) et collez-le à la suite. Collez ensuite sa nouvelle réponse ci-dessus et vérifiez à nouveau.</p>' +
        '<pre>' + ech(X.consigneCorrection(verif.erreurs)) + '</pre>' +
        '<div class="actions"><button type="button" class="btn btn-primary" id="btnCopierCorrectionMoodle">Copier la consigne de correction</button>' +
        '<span class="statut" id="statutCorrectionMoodle" role="status" aria-live="polite"></span></div></div>';
    }
    html += O().liste('Règles non respectées', verif.erreurs, 'bloc-alerte');
    html += O().liste('Points à surveiller', verif.avertissements, 'bloc-avertissement');
    if (nouvelle) html += O().liste('Réparations faites automatiquement', lecture.corrections.concat(norm.notes), 'bloc-info');
    html += tableauQuestions(d);
    zone.innerHTML = html;

    const btnCorr = $('#btnCopierCorrectionMoodle');
    if (btnCorr) btnCorr.addEventListener('click', function () {
      O().copier(X.consigneCorrection(verif.erreurs), $('#statutCorrectionMoodle'));
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
    return '<div class="table-defilante"><table class="tableau-questions"><caption>Questions reçues</caption>' +
      '<thead><tr><th scope="col">Type</th><th scope="col">Titre</th><th scope="col">Tag</th><th scope="col">Énoncé</th></tr></thead><tbody>' +
      d.questions.map(function (q) {
        let enonce = X.enTexte(q.questionText);
        if (enonce.length > 140) enonce = enonce.slice(0, 137) + '…';
        return '<tr><td>' + ech(X.LIBELLES[q.type] || q.type) + '</td><td>' + ech(q.name || '—') + '</td>' +
          '<td>' + ech(q.tag || '—') + '</td><td>' + ech(enonce || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------------
  // Étape 3 — l'aperçu (simulateur Moodle de moteur-ui dans un cadre)
  // ------------------------------------------------------------------
  window.MoodleAIApercuMoodle = function () {
    return etat.donnees ? { titre: etat.donnees.titre, questions: X.questionsPropres(etat.donnees.questions) } : null;
  };

  function preparerEtapeApercu() {
    if (!etat.donnees) return;
    const cadre = $('#cadreApercuMoodle');
    majBlocImages();
    cadre.onload = function () {
      // Aller directement à la première question sans image, en mode d'édition.
      const i = indexSansImage();
      if (i < 0) return;
      try {
        const w = cadre.contentWindow;
        const essai = function (n) {
          if (w.quizData && w.quizData.length && typeof w.loadQuestion === 'function') {
            w.loadQuestion(i);
            const bascule = cadre.contentDocument.getElementById('btnToggleEdit');
            if (bascule && !bascule.checked) {
              bascule.checked = true;
              bascule.dispatchEvent(new Event('change'));
            }
          } else if (n < 20) setTimeout(function () { essai(n + 1); }, 100);
        };
        essai(0);
      } catch (e) { /* cadre inaccessible */ }
    };
    cadre.src = './apercu-moodle.html?t=' + Date.now();
    debloquer(4);
  }

  function indexSansImage() {
    return ((etat.donnees && etat.donnees.questions) || []).findIndex(function (q) {
      return q.type === 'ddimageortext' && !q.bgImage;
    });
  }

  /** Questions de glisser-déposer qui attendent leur image, avec la demande à donner à l'IA. */
  function majBlocImages() {
    const zone = $('#blocImagesMoodle');
    const ech = O().echapper;
    const manquantes = etat.donnees.questions
      .map(function (q, i) { return { q: q, i: i }; })
      .filter(function (x) { return x.q.type === 'ddimageortext' && !x.q.bgImage; });
    // Questions qui ont déjà leur image : « Retoucher l'image » (éditeur partagé de moteur-ui).
    const avecImage = window.ImageRetouchCanvas ? etat.donnees.questions
      .map(function (q, i) { return { q: q, i: i }; })
      .filter(function (x) { return x.q.type === 'ddimageortext' && x.q.bgImage; }) : [];
    const blocRetouche = avecImage.length ? '<div class="bloc-images bloc-images-retouche" role="region" aria-labelledby="titreRetoucheMoodle">' +
      '<h3 id="titreRetoucheMoodle">Images des questions</h3>' +
      '<p class="aide">« Retoucher l\'image » : masquer un texte incrusté (pinceau, pipette), cloner un fond, adoucir un raccord. Les zones restent en place.</p>' +
      '<ul class="liste-images">' + avecImage.map(function (x) {
        return '<li><span class="liste-images-nom">Question ' + (x.i + 1) + ' : ' + ech(x.q.name) + '</span>' +
          '<span class="liste-images-boutons"><button type="button" class="btn" data-retoucher-image="' + x.i + '">Retoucher l\'image</button></span></li>';
      }).join('') + '</ul></div>' : '';
    const statut = '<p class="statut" id="statutImageMoodle" role="status" aria-live="polite"></p>';
    if (!manquantes.length) {
      zone.innerHTML = blocRetouche ? blocRetouche + statut : '';
      brancherRetoucheMoodle();
      return;
    }
    const outil = etat.contexte.outil === 'copilot' ? 'copilot' : 'gemini';
    const nom = O().OUTILS_IA[outil].nom;
    zone.innerHTML = blocRetouche + '<div class="bandeau bandeau-avertissement bloc-images" role="region" aria-labelledby="titreImagesMoodle">' +
      '<h3 id="titreImagesMoodle">' + (manquantes.length > 1 ? manquantes.length + ' questions attendent leur image' : 'Une question attend son image') + '</h3>' +
      '<ol class="marche-a-suivre">' +
        '<li>Cliquez sur « Copier la demande d\'image » à côté de la question, ouvrez ' + nom + ' et collez la demande (Ctrl+V).' + O().liensIA('', outil) + '</li>' +
        '<li>Quand l\'image est prête, faites un clic droit sur l\'image, puis « Copier l\'image ». Vous pouvez aussi l\'enregistrer sur l\'ordinateur, ou utiliser votre propre schéma (PNG ou JPEG, sans texte).</li>' +
        '<li>Revenez ici et cliquez sur « Coller l\'image » (ou appuyez sur Ctrl+V). Pour un fichier enregistré, cliquez sur « Choisir un fichier ».</li>' +
        '<li>Dans l\'aperçu ci-dessous, glissez chaque zone sur la bonne partie du schéma.</li>' +
      '</ol>' +
      '<ul class="liste-images">' + manquantes.map(function (x) {
        return '<li><span class="liste-images-nom">Question ' + (x.i + 1) + ' : ' + ech(x.q.name) + '</span>' +
          '<span class="liste-images-boutons">' +
          '<button type="button" class="btn" data-demande-image="' + x.i + '">Copier la demande d\'image</button>' +
          '<button type="button" class="btn btn-primary" data-coller-image="' + x.i + '">Coller l\'image</button>' +
          '<label class="btn">Choisir un fichier<input type="file" accept="image/png,image/jpeg" data-fichier-image="' + x.i + '" hidden></label>' +
          '</span></li>';
      }).join('') + '</ul>' + statut + '</div>';
    brancherRetoucheMoodle();

    $$('[data-demande-image]').forEach(function (b) {
      b.addEventListener('click', function () {
        const q = etat.donnees.questions[Number(b.dataset.demandeImage)];
        O().copier(X.demandeImage(q, etat.contexte.niveau), null);
        O().annoncer($('#statutImageMoodle'), 'Demande copiée. Collez-la dans ' + nom + ' (Ctrl+V).');
      });
    });
    $$('[data-coller-image]').forEach(function (b) {
      b.addEventListener('click', function () { collerImage(Number(b.dataset.collerImage)); });
    });
    $$('[data-fichier-image]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        const f = inp.files && inp.files[0];
        if (f) lireFichier(f).then(function (url) { placerImage(Number(inp.dataset.fichierImage), url); });
        inp.value = '';
      });
    });
  }

  function brancherRetoucheMoodle() {
    $$('[data-retoucher-image]').forEach(function (b) {
      b.addEventListener('click', function () { retoucherImage(Number(b.dataset.retoucherImage)); });
    });
  }

  /**
   * Retouche de l'image d'un glisser-déposer avec l'éditeur partagé
   * (moteur-ui/simulateurs/common/image-retouch-canvas.js). L'image retouchée passe par
   * MoodleDDImage.appliquerImage dans l'aperçu : même taille, zones conservées, limite de 600 px.
   */
  function retoucherImage(i) {
    recupererEditions(); // l'image la plus récente peut venir du mode d'édition de l'aperçu
    const q = etat.donnees.questions[i];
    if (!q || !q.bgImage || !window.ImageRetouchCanvas) return;
    window.ImageRetouchCanvas.open({
      imageSrc: q.bgImage,
      titre: 'Retouche de l\'image — question ' + (i + 1),
      libelleEnregistrer: 'Enregistrer l\'image retouchée',
      onSave: function (url) {
        try {
          const cadre = $('#cadreApercuMoodle');
          const w = cadre.contentWindow;
          if (!w || !w.MoodleDDImage || !w.MoodleDDImage.appliquerImage || !w.quizData || !w.quizData[i]) throw new Error('aperçu indisponible');
          if (w.currentIndex !== i) w.loadQuestion(i);
          w.MoodleDDImage.appliquerImage(w.quizData[i], url).then(function (ok) {
            if (!ok) { statutImage('Image retouchée non appliquée.'); return; }
            recupererEditions();
            majBlocImages();
            statutImage('Image retouchée enregistrée pour la question ' + (i + 1) + '.');
            cadre.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        } catch (e) {
          // Sans accès à l'aperçu (ouverture locale file:///) : l'image va aux données, puis l'aperçu est rechargé.
          q.bgImage = url;
          sauver();
          preparerEtapeApercu();
        }
      }
    });
  }

  function lireFichier(blob) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function statutImage(msg) {
    const s = $('#statutImageMoodle');
    if (s) O().annoncer(s, msg);
  }

  /** Bouton « Coller l'image » : lit l'image du presse-papiers. */
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

  /** Place l'image dans la question i de l'aperçu, ouverte en mode d'édition pour placer les zones. */
  function placerImage(i, dataUrl) {
    if (!/^data:image\//.test(dataUrl)) { statutImage('Ce fichier n\'est pas une image.'); return; }
    try {
      const cadre = $('#cadreApercuMoodle');
      const w = cadre.contentWindow;
      if (!w || !w.MoodleDDImage || !w.MoodleDDImage.appliquerImage || !w.quizData || !w.quizData[i]) throw new Error('aperçu indisponible');
      if (w.currentIndex !== i) w.loadQuestion(i);
      const bascule = cadre.contentDocument.getElementById('btnToggleEdit');
      if (bascule && !bascule.checked) { bascule.checked = true; bascule.dispatchEvent(new Event('change')); }
      // Une image trop grande ouvre une alerte dans l'aperçu, qui propose la réduction.
      cadre.scrollIntoView({ behavior: 'smooth', block: 'start' });
      w.MoodleDDImage.appliquerImage(w.quizData[i], dataUrl).then(function (ok) {
        if (!ok) { statutImage('Image non ajoutée.'); return; }
        recupererEditions();
        majBlocImages();
        statutImage(indexSansImage() >= 0 ? 'Image ajoutée. Passez à la question suivante.' : '');
      });
    } catch (e) {
      // Sans accès à l'aperçu (ouverture locale file:///), l'image est ajoutée aux données puis l'aperçu est rechargé.
      etat.donnees.questions[i].bgImage = dataUrl;
      sauver();
      preparerEtapeApercu();
    }
  }

  /** Ctrl+V dans la page de l'assistant, à l'étape 3 : l'image va à la question affichée ou à la première sans image. */
  function collageAuClavier(ev) {
    if ($('#ecranMoodle').hidden || etat.etape !== 3 || !etat.donnees || indexSansImage() < 0) return;
    const t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA)$/.test(t.tagName))) return;
    const items = Array.prototype.slice.call((ev.clipboardData && ev.clipboardData.items) || []);
    const item = items.filter(function (it) { return it.kind === 'file' && /^image\//.test(it.type); })[0];
    if (!item) return;
    ev.preventDefault();
    let i = indexSansImage();
    try {
      const w = $('#cadreApercuMoodle').contentWindow;
      const q = w.quizData && w.quizData[w.currentIndex];
      if (q && q.type === 'ddimageortext' && !q.bgImage) i = w.currentIndex;
    } catch (e) { /* aperçu inaccessible */ }
    lireFichier(item.getAsFile()).then(function (url) { placerImage(i, url); });
  }

  /** Reprend les modifications faites dans le mode d'édition de l'aperçu. */
  function recupererEditions() {
    try {
      const w = $('#cadreApercuMoodle').contentWindow;
      if (!w || !Array.isArray(w.quizData) || !w.quizData.length || !etat.donnees) return;
      if (typeof w.saveCurrentEditFields === 'function') w.saveCurrentEditFields();
      etat.donnees.questions = X.questionsPropres(w.quizData);
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
    const ech = O().echapper;
    const d = etat.donnees;
    const verif = X.valider(d, etat.contexte, { export: true });
    const parType = {};
    d.questions.forEach(function (q) { parType[q.type] = (parType[q.type] || 0) + 1; });
    const tags = [];
    d.questions.forEach(function (q) { if (q.tag && tags.indexOf(q.tag) < 0) tags.push(q.tag); });
    const sansImage = indexSansImage() >= 0;

    let html = '<dl class="resume-liste">' +
      '<dt>Catégorie</dt><dd>' + ech(d.titre) + '</dd>' +
      '<dt>Questions</dt><dd class="nombres">' + d.questions.length + '</dd>' +
      '<dt>Types</dt><dd>' + Object.keys(parType).map(function (t) { return ech((X.LIBELLES[t] || t) + ' : ' + parType[t]); }).join(' ; ') + '</dd>' +
      '<dt>Tags</dt><dd>' + (tags.length ? ech(tags.join(', ')) : '—') + '</dd></dl>';
    if (sansImage) {
      html += '<div class="bandeau bandeau-alerte" role="alert"><strong>Exportation impossible pour l\'instant.</strong> Une question de glisser-déposer n\'a pas encore d\'image : Moodle refuserait de l\'importer. Ajoutez-la à l\'étape 3, ou retirez cette question dans le mode d\'édition.</div>';
    } else if (verif.erreurs.length) {
      html += '<div class="bandeau bandeau-avertissement" role="status"><strong>' + verif.erreurs.length +
        ' règle(s) encore non respectée(s).</strong> Le fichier peut être exporté, mais il est préférable de les corriger (étape 2 ou mode d\'édition de l\'étape 3).' +
        '<ul class="liste-erreurs">' + verif.erreurs.map(function (e) {
          return '<li><strong>' + ech(e.lieu) + '</strong> : ' + ech(e.msg) + '</li>';
        }).join('') + '</ul></div>';
    }
    $('#resumeExportMoodle').innerHTML = html;
    $('#btnExporterXml').disabled = sansImage;
    $('#statutExportMoodle').textContent = '';
    $('#aideDossierMoodle').textContent = O().choixDossierPossible()
      ? 'Une fenêtre vous permet de choisir le dossier et le nom du fichier. Le navigateur retient le dernier dossier choisi.'
      : 'Votre navigateur ne permet pas de choisir le dossier : les fichiers vont dans votre dossier Téléchargements. Avec Chrome ou Edge, une fenêtre vous permet de choisir le dossier.';

    // Images trop grandes : signalées avec la taille proposée, réduites à l'exportation.
    X.imagesTropGrandes(d).then(function (liste) {
      if (!liste.length || etat.etape !== 4) return;
      const bloc = document.createElement('div');
      bloc.className = 'bandeau bandeau-avertissement';
      bloc.setAttribute('role', 'status');
      bloc.innerHTML = '<strong>Image trop grande pour Moodle.</strong> Au-delà de ' + X.TAILLE_MAX_IMAGE +
        ' px de côté, la question déborde de la page du test. L\'image sera réduite à l\'exportation (les zones suivent) :' +
        '<ul class="liste-erreurs">' + liste.map(function (t) {
          return '<li><strong>Question ' + (t.index + 1) + '</strong> (' + ech(t.nom) + ') : ' + t.largeur + ' × ' + t.hauteur +
            ' px, réduite à ' + t.nouvelleLargeur + ' × ' + t.nouvelleHauteur + ' px.</li>';
        }).join('') + '</ul>';
      $('#resumeExportMoodle').appendChild(bloc);
    });
  }

  function nomBase() {
    return String(titreProjet()).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Banque de questions';
  }

  function exporterXml() {
    if (!etat.donnees || indexSansImage() >= 0) return;
    let reduites = 0;
    // La fenêtre d'enregistrement s'ouvre d'abord ; le XML est préparé ensuite.
    // Protection de Moodle : aucune image de plus de 600 px de côté n'est exportée.
    const preparer = function () {
      return X.limiterImages(etat.donnees).then(function (n) {
        reduites = n;
        if (n) sauver();
        return X.versXml(etat.donnees);
      });
    };
    O().enregistrerSous(nomBase() + ' — banque Moodle.xml', preparer, 'application/xml;charset=utf-8', [
      { description: 'Banque de questions Moodle (XML)', accept: { 'application/xml': ['.xml'] } }
    ]).then(function (r) {
      if (r.etat === 'annule') { O().annoncer($('#statutExportMoodle'), 'Enregistrement annulé.'); return; }
      if (reduites) preparerEtapeExport();
      O().annoncer($('#statutExportMoodle'), (reduites ? reduites + ' image(s) réduite(s) à ' + X.TAILLE_MAX_IMAGE + ' px au maximum. ' : '') +
        (r.etat === 'enregistre' ? 'Fichier enregistré : « ' + r.nom + ' », dans le dossier choisi.' : 'Le fichier XML a été téléchargé dans votre dossier Téléchargements.'));
    }).catch(function (e) {
      O().annoncer($('#statutExportMoodle'), 'Le fichier n\'a pas pu être préparé : ' + e.message + '.');
    });
  }

  // ------------------------------------------------------------------
  // Enregistrement et reprise
  // ------------------------------------------------------------------
  function titreProjet() {
    return (etat.donnees && etat.donnees.titre) || etat.contexte.sujet || 'Banque de questions';
  }

  function enregistrerProjet(statutEl) {
    if (etat.etape === 3) recupererEditions();
    sauver();
    const contenu = {
      contexte: etat.contexte,
      consigneModifiee: etat.consigneModifiee,
      reponseBrute: etat.reponseBrute,
      donnees: etat.donnees,
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
        // questions_moodle.xml : ouvert à l'aperçu, sans réponse de l'IA.
        const v = X.depuisXml(r.projet);
        etat = nouvelEtat();
        etat.contexte = Object.assign(etat.contexte, v.contexte);
        if (!etat.contexte.types.length) etat.contexte.types = X.TOUS_LES_TYPES.slice();
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
    if (!X || !O()) return;
    construireListeTypes();

    $$('[data-demarrer-moodle]').forEach(function (b) {
      b.addEventListener('click', function () {
        const choix = b.dataset.demarrerMoodle;
        if (choix === 'exemple') demarrerExemple();
        else if (choix === 'nouveau') demarrerNouveau();
        else continuerProjet();
      });
    });
    $('#btnQuitterExempleMoodle').addEventListener('click', demarrerNouveau);

    $$('#ecranMoodle .etapes button').forEach(function (b) {
      b.addEventListener('click', function () { allerEtape(Number(b.dataset.etapeMoodle)); });
    });
    $$('[data-aller-moodle]').forEach(function (b) {
      b.addEventListener('click', function () {
        const n = Number(b.dataset.allerMoodle);
        debloquer(Math.min(n, etat.etapeMax + 1));
        allerEtape(n);
      });
    });

    $('#formMoodle').addEventListener('submit', validerEtape1);
    ['mSujet', 'mNiveau', 'mNb', 'mTexteCours', 'mPrecisions'].forEach(function (id) {
      $('#' + id).addEventListener('input', champsModifies);
    });
    $$('input[name="mType"], input[name="mOutil"], input[name="mSource"]').forEach(function (r) {
      r.addEventListener('change', champsModifies);
    });

    $('#texteConsigneMoodle').addEventListener('input', function () {
      etat.consigneModifiee = this.value === consigneGeneree() ? '' : this.value;
      majAideConsigne();
      sauver();
    });
    $('#btnRetablirConsigneMoodle').addEventListener('click', function () {
      etat.consigneModifiee = '';
      etat.contexte = lireChamps();
      $('#texteConsigneMoodle').value = consigneActuelle();
      majAideConsigne();
      sauver();
      O().annoncer($('#statutConsigneMoodle'), 'La consigne d\'origine a été rétablie.');
      $('#texteConsigneMoodle').focus();
    });
    $('#btnCopierConsigneMoodle').addEventListener('click', function () {
      if (!controlerChamps()) return;
      O().copier($('#texteConsigneMoodle').value, $('#statutConsigneMoodle'));
    });

    $('#btnVerifierMoodle').addEventListener('click', function () { verifier(true, false); });
    $('#btnVersApercuMoodle').addEventListener('click', function () { allerEtape(3); });
    $('#btnExporterXml').addEventListener('click', exporterXml);
    $('#btnExporterProjetMoodle').addEventListener('click', function () { enregistrerProjet($('#statutExportMoodle')); });
    $('#btnNouveauMoodle').addEventListener('click', demarrerNouveau);

    window.addEventListener('beforeunload', function () {
      if (!$('#ecranMoodle').hidden && etat.etape === 3) recupererEditions();
    });
    document.addEventListener('paste', collageAuClavier);

    // Reprise du dernier projet ouvert s'il est de ce type.
    const dernier = DERNIER_AU_CHARGEMENT;
    if (dernier && dernier.type === TYPE) {
      const p = lireProjet(dernier.exemple ? CLE_EXEMPLE : CLE_PROJET);
      if (p) {
        etat = p;
        dernierContenu = empreinte(etat);
        if (etat.ecran === 'moodle') {
          ouvrirParcours(Math.min(etat.etape || 1, etat.etapeMax));
          return;
        }
      }
    }
    majContinuer();
  }

  window.MoodleAIAssistantMoodle = {
    majContinuer: function () { if (X && O()) majContinuer(); },
    projetEnCours: projetEnCours,
    ouvrirReprise: ouvrirReprise,
    enregistrerProjet: function () { enregistrerProjet(); },
    quitter: quitter
  };

  document.addEventListener('DOMContentLoaded', init);
})();
