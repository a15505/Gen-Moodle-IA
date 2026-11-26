/**
 * Action « Corrigé interactif SCORM » — consigne pour l'IA, lecture, vérification et
 * conversion vers le format questions_data.js du moteur SCORM de moteur-ui
 * (moteur-ui/simulateurs/scorm/scorm_runtime.js, mode « corrige »), puis construction
 * du package SCORM 1.2 dans le navigateur (même contenu que create_scorm_activity.py).
 *
 * L'IA renvoie un JSON compact :
 * { titre, accueil, intentions: [...], questions: [ { type, partie, titre, points, enonce,
 *   solution, explication, ...champs propres au type, demarche? } ] }
 * Les images (schémas de l'exercice) sont ajoutées par l'enseignant à l'étape de l'aperçu.
 */
(function () {
  'use strict';

  /** Les 4 types offerts par le moteur en mode corrigé, sous leur nom pour l'IA. */
  const TYPES = [
    { cle: 'choix', moteur: 'radio', libelle: 'Choix de réponse' },
    { cle: 'reponse_courte', moteur: 'shortanswer', libelle: 'Réponse courte ou calcul' },
    { cle: 'volets', moteur: 'compound_radio', libelle: 'Question en volets' },
    { cle: 'association', moteur: 'etapes_matching', libelle: 'Association' }
  ];
  const LIBELLES = {};
  const VERS_MOTEUR = {};
  TYPES.forEach(function (t) { LIBELLES[t.moteur] = t.libelle; VERS_MOTEUR[t.cle] = t.moteur; });

  const ALIAS_TYPES = {
    choix: 'radio', qcm: 'radio', choixmultiple: 'radio', choixmultiples: 'radio', choixunique: 'radio', radio: 'radio', multichoice: 'radio', vraioufaux: 'radio', vraifaux: 'radio',
    reponsecourte: 'shortanswer', shortanswer: 'shortanswer', calcul: 'shortanswer', numerique: 'shortanswer', numerical: 'shortanswer', reponse: 'shortanswer',
    volets: 'compound_radio', volet: 'compound_radio', compoundradio: 'compound_radio', compose: 'compound_radio', questionenvolets: 'compound_radio',
    association: 'etapes_matching', appariement: 'etapes_matching', matching: 'etapes_matching', etapesmatching: 'etapes_matching', classement: 'etapes_matching'
  };

  const MOTS_INTERDITS = [
    { re: /\bPFEQ\b/i, texte: 'la mention « PFEQ » (réservée aux enseignants)' },
    { re: /\bd[ée]fis?\b/i, texte: 'le mot « défi »' },
    { re: /\bCD\s?[123]\b/, texte: 'une compétence ministérielle (CD1, CD2, CD3)' }
  ];
  const PREFIXE_NUMERO = /^(?:Q\s*\d+|Question\s*\d+|\d+[a-z]?)\s*[.\-:)–—]\s*/i;
  const SUFFIXE_TITRE = ' — Activité interactive';
  /** Suffixes retirés avant d'ajouter SUFFIXE_TITRE (dont l'ancien « Corrigé interactif » des projets existants). */
  const SUFFIXES_TITRE = /\s*[—–-]\s*(?:corrigé(?: interactif)?|activité interactive)\s*$/i;

  // ----------------------------------------------------------------------
  // Outils
  // ----------------------------------------------------------------------
  function texte(v) { return String(v == null ? '' : v).trim(); }
  function liste(v) { return Array.isArray(v) ? v : []; }

  function echapperHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function booleen(v) {
    if (typeof v === 'boolean') return v;
    const s = texte(v).toLowerCase();
    if (['true', 'vrai', 'oui', '1'].indexOf(s) >= 0) return true;
    if (['false', 'faux', 'non', '0'].indexOf(s) >= 0) return false;
    return null;
  }

  function entierPositif(v) {
    const n = Math.round(Number(String(v == null ? '' : v).replace(',', '.')));
    return isFinite(n) && n > 0 ? n : null;
  }

  function cleType(v) {
    const s = texte(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    return ALIAS_TYPES[s] || texte(v);
  }

  /** Énoncé de l'IA (texte simple, LaTeX entre \( et \)) → HTML inséré tel quel par le moteur. */
  function enonceHtml(t) {
    const s = texte(t);
    if (!s) return '';
    return s.split(/\n\s*\n/).map(function (p) { return echapperHtml(p.trim()).replace(/\n/g, '<br>'); }).join('<br><br>');
  }

  /** HTML de l'énoncé → texte (tableaux et vérification). */
  function enTexte(html) {
    return String(html == null ? '' : html).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  }

  /** Titre complet de l'activité : « Sujet — Activité interactive ». */
  function titreComplet(t) {
    // Suffixes retirés jusqu'à épuisement (« X — Corrigé interactif — Activité interactive »...).
    let s = texte(t);
    while (SUFFIXES_TITRE.test(s)) s = s.replace(SUFFIXES_TITRE, '').trim();
    // Sans sujet, le titre est « Activité interactive » seul, jamais répété.
    if (!s || /^(?:corrigé(?: interactif)?|activité interactive)$/i.test(s)) return 'Activité interactive';
    return s + SUFFIXE_TITRE;
  }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  const MODELE_JSON = [
    '{',
    '  "titre": "Sujet de l\'exercice, en casse de phrase",',
    '  "accueil": "Une ou deux phrases adressées à l\'élève (tutoiement) qui présentent l\'exercice.",',
    '  "intentions": ["J\'identifie ...", "J\'explique ...", "Je calcule ..."],',
    '  "questions": [',
    '    {',
    '      "type": "choix",',
    '      "partie": "Partie 1 — Nom de la partie",',
    '      "titre": "Concept évalué, sans numéro",',
    '      "points": 1,',
    '      "enonce": "Énoncé de la question, tel que dans l\'exercice.",',
    '      "choix": [',
    '        { "texte": "...", "correct": true, "retroaction": "Pourquoi ce choix est juste." },',
    '        { "texte": "...", "correct": false, "retroaction": "Pourquoi ce choix est faux." },',
    '        { "texte": "...", "correct": false, "retroaction": "..." },',
    '        { "texte": "...", "correct": false, "retroaction": "..." }',
    '      ],',
    '      "solution": "Réponse attendue sur la copie, avec ses points (1 pt).",',
    '      "explication": "Explication didactique de la bonne réponse."',
    '    },',
    '    {',
    '      "type": "reponse_courte",',
    '      "partie": "...",',
    '      "titre": "...",',
    '      "points": 2,',
    '      "enonce": "On dissout 8 g de sel dans 250 mL d\'eau. Quelle est la concentration de la solution, en g/L ?",',
    '      "reponses_acceptees": ["32"],',
    '      "unite": "g/L",',
    '      "retroaction_correcte": "...",',
    '      "retroaction_erreur": "...",',
    '      "solution": "C = 32 g/L (2 pts)",',
    '      "explication": "...",',
    '      "demarche": {',
    '        "formule": {',
    '          "gauche": "C",',
    '          "numerateur": "m_soluté",',
    '          "denominateur": "V_solution",',
    '          "legende": [',
    '            { "symbole": "C", "definition": "concentration en grammes par litre (g/L)" },',
    '            { "symbole": "m_soluté", "definition": "masse de soluté en grammes (g)" },',
    '            { "symbole": "V_solution", "definition": "volume de la solution en litres (L)" }',
    '          ]',
    '        },',
    '        "etapes": [',
    '          {',
    '            "titre": "La masse de sel dans 1 L",',
    '            "inconnue": "Soit x la masse de sel, en grammes (g), dans 1 L de solution.",',
    '            "lignes": [["8 g", "0,25 L"], ["x", "1 L"]],',
    '            "symbole": "x",',
    '            "calcul": { "num": "8 [g] × 1 [[L]]", "den": "0,25 [[L]]" },',
    '            "resultat": "32 g",',
    '            "biffage": "Les L s\'annulent en haut et en bas : il reste des grammes."',
    '          }',
    '        ],',
    '        "verification": "Il y a 4 fois 250 mL dans 1 L : 4 × 8 g = 32 g. La concentration est donc 32 g/L."',
    '      },',
    '      "deuxieme_chance": {',
    '        "question": "Question guidée sur l\'étape clé du calcul (ex. : Pour trouver la masse dans 1 L, que fais-tu avec 250 mL ?)",',
    '        "choix": [',
    '          { "texte": "Je me dis que 250 mL, c\'est le quart d\'un litre : il y a donc 4 fois plus de sel dans 1 L.", "correct": true, "retroaction": "..." },',
    '          { "texte": "Je me dis que je divise 8 g par 250, car le volume est en mL.", "correct": false, "retroaction": "..." },',
    '          { "texte": "...", "correct": false, "retroaction": "..." }',
    '        ]',
    '      }',
    '    },',
    '    {',
    '      "type": "volets",',
    '      "partie": "...",',
    '      "titre": "...",',
    '      "enonce": "Question qui demande une réponse et sa justification.",',
    '      "volets": [',
    '        { "libelle": "1. Réponse :", "points": 1, "choix": [',
    '          { "texte": "...", "correct": true, "retroaction": "..." },',
    '          { "texte": "...", "correct": false, "retroaction": "..." }',
    '        ] },',
    '        { "libelle": "2. Justification :", "points": 1, "choix": [',
    '          { "texte": "Parce que ...", "correct": true, "retroaction": "..." },',
    '          { "texte": "Parce que ...", "correct": false, "retroaction": "..." },',
    '          { "texte": "Parce que ...", "correct": false, "retroaction": "..." }',
    '        ] }',
    '      ],',
    '      "solution": "...",',
    '      "explication": "..."',
    '    },',
    '    {',
    '      "type": "association",',
    '      "partie": "...",',
    '      "titre": "...",',
    '      "enonce": "Associez chaque énoncé à ...",',
    '      "categories": ["Catégorie A", "Catégorie B", "Catégorie C"],',
    '      "enonces": [',
    '        { "texte": "...", "reponse": "Catégorie A", "retroaction": "..." },',
    '        { "texte": "...", "reponse": "Catégorie C", "retroaction": "..." },',
    '        { "texte": "...", "reponse": "Catégorie B", "retroaction": "..." }',
    '      ],',
    '      "solution": "...",',
    '      "explication": "..."',
    '    }',
    '  ]',
    '}'
  ];

  function construireConsigne(ctx) {
    const texteSource = texte(ctx.texteSource);
    const source = texteSource
      ? 'L\'exercice est fourni à la fin de cette consigne, sous « EXERCICE ». Appuie-toi uniquement sur ce texte.'
      : 'L\'exercice (ou l\'examen) est joint à ce message. Appuie-toi uniquement sur ce document. S\'il n\'y a aucun document joint, ou si tu ne peux pas le lire, dis-le clairement et ne produis aucun JSON : n\'invente jamais les questions.';
    const lignes = [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu transformes un exercice papier en corrigé interactif : l\'élève répond à chaque question, reçoit une rétroaction immédiate et, en cas d\'erreur, une explication détaillée avec la démarche.',
      '',
      'CORRIGÉ INTERACTIF',
      '- Sujet : ' + (ctx.sujet || 'déduis-le de l\'exercice, en quelques mots'),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '',
      source
    ];
    if (texte(ctx.precisions)) lignes.push('', 'PRÉCISIONS DE L\'ENSEIGNANT', texte(ctx.precisions));
    lignes.push(
      '',
      'RÈGLES COMMUNES',
      '1. Reprends toutes les questions de l\'exercice, dans l\'ordre, avec les mêmes données numériques. Une question en plusieurs parties (a, b, c) devient une question en volets ou plusieurs questions.',
      '2. "partie" : le nom de la partie de l\'exercice (ex. : « Partie 1 — Anatomie du système digestif »). Les questions d\'une même partie ont exactement le même texte de partie.',
      '3. "titre" : le concept évalué, en casse de phrase (ex. : « Concentration d\'une solution de sel »). Jamais de numéro ni de préfixe comme « Q1 », « 1. » ou « Question 1 ».',
      '4. "points" : le barème de l\'exercice s\'il est indiqué, sinon 1 point par réponse attendue. Pour une question en volets, les points sont donnés à chaque volet ; pour une association, chaque énoncé vaut 1 point.',
      '5. "enonce" : en texte simple, sans HTML. Les symboles et formules s\'écrivent en LaTeX entre \\( et \\), par exemple \\( CO_2 \\). Si la question s\'appuie sur un schéma ou une figure de l\'exercice, ajoute "figure" : une courte description de ce schéma (l\'enseignant l\'ajoutera lui-même).',
      '6. "solution" : la réponse attendue sur la copie de l\'élève, avec les points entre parenthèses. "explication" : l\'explication didactique, en deux à quatre phrases, de la notion en jeu.',
      '7. Questions ouvertes (justifier, expliquer, décrire) : transforme-les en choix de réponse ou en volets. Les choix expriment la pensée de l\'élève, à la manière d\'un élève qui verbalise son raisonnement (ex. : « Je me dis que… », « Parce que… »). Les distracteurs reprennent de vraies conceptions erronées fréquentes chez les élèves de ce niveau.',
      '8. Choix de réponse : 3 ou 4 choix, un seul correct, de longueur semblable, chacun avec sa propre rétroaction. Leur ordre sera mélangé pour l\'élève.',
      '9. Réponse courte : la réponse tient en un nombre ou en 1 à 3 mots. "reponses_acceptees" liste les variantes acceptées (singulier, pluriel, synonyme, symbole). Pour un calcul, donne seulement le nombre (ex. : "32" ou "0,5") et l\'unité attendue dans "unite".',
      '10. Calculs : chaque question de calcul a un champ "demarche" résolu en produit croisé, à la manière d\'un humain :',
      '   - "formule" : la formule originale, en première ligne, écrite en fraction : "gauche" (la grandeur calculée), "numerateur" et "denominateur" (variables avec indice après « _ », ex. "m_soluté"), et "legende" qui définit chaque variable avec son unité. Pour une simple équivalence d\'unités, "formule" est un texte (ex. : "1 L = 1 000 mL").',
      '   - "etapes" : pour chaque étape, "inconnue" déclare la lettre cherchée et son unité ; "lignes" donne les deux fractions égales [[numérateur, dénominateur], [numérateur, dénominateur]], avec l\'inconnue au numérateur de l\'une d\'elles et les valeurs écrites avec leurs unités ; "symbole" est la lettre de l\'inconnue ; "calcul" donne le numérateur et le dénominateur du calcul final ; "resultat" est la valeur avec son unité.',
      '   - Dans "calcul", une unité qui s\'annule s\'écrit entre doubles crochets ([[L]]) et une unité qui reste entre crochets simples ([g]).',
      '   - Dans "lignes", "calcul" et "resultat", les puissances s\'écrivent ^2, les racines \\sqrt{...} et les indices après « _ » (ex. : "d_base"), sans \\( ni \\).',
      '   - "deuxieme_chance" : chaque question de calcul en a une. C\'est une question guidée à choix (3 choix, un seul correct, chacun avec sa rétroaction) sur l\'étape clé du raisonnement, proposée à l\'élève qui s\'est trompé ; elle lui permet de récupérer la moitié des points. Les choix expriment la pensée de l\'élève (« Je me dis que… ») et les distracteurs reprennent les erreurs fréquentes. Elle est permise, mais facultative, pour les autres types de questions.',
      '   - N\'écris jamais une formule en ligne du type « C = m ÷ V » et jamais de tableau avec des flèches.',
      '11. Français standard du Québec. N\'écris jamais les mots « PFEQ » ni « défi », ni les compétences CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Dans le JSON, chaque barre oblique inverse du LaTeX est doublée (\\\\). Respecte exactement cette structure (un modèle par type de question ; les « ... » sont à remplacer, et chaque type peut servir plusieurs fois ou pas du tout) :',
      ''
    );
    const modele = MODELE_JSON.slice();
    if (ctx.sujet) modele[1] = '  "titre": "' + ctx.sujet.replace(/["\\]/g, '') + '",';
    Array.prototype.push.apply(lignes, modele);
    if (texteSource) lignes.push('', 'EXERCICE', texteSource);
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation : JSON de l'IA → questions_data.js du moteur (mode corrigé)
  // ----------------------------------------------------------------------
  function versChoix(c, i) {
    if (typeof c === 'string') return { id: i, text: c, correct: false, feedback: '' };
    c = c || {};
    return {
      id: i,
      text: texte(c.texte || c.text),
      correct: booleen(c.correct) === true,
      feedback: texte(c.retroaction || c.feedback)
    };
  }

  /** « m_soluté » ou « m_{soluté} » → ["m", "soluté"]. */
  function variable(v) {
    if (Array.isArray(v)) return [texte(v[0]), texte(v[1])];
    const m = texte(v).match(/^([^_]+)(?:_\{?([^}]*)\}?)?$/);
    return m ? [texte(m[1]), texte(m[2])] : [texte(v), ''];
  }

  function versFormule(f) {
    if (!f) return null;
    if (typeof f === 'string') return texte(f) || null;
    if (typeof f !== 'object') return null;
    if (f.num && f.den) return f; // déjà au format du moteur
    const def = {
      gauche: texte(f.gauche || f.grandeur || 'C'),
      num: variable(f.numerateur || f.numérateur),
      den: variable(f.denominateur || f.dénominateur)
    };
    def.legende = liste(f.legende || f.légende).map(function (l) {
      if (Array.isArray(l)) return [variable(l[0]), texte(l[1])];
      return [variable(l.symbole || l.variable), texte(l.definition || l.définition || l.texte)];
    }).filter(function (l) { return l[0][0] && l[1]; });
    return def;
  }

  /** Valeur avec unité : « 0,25 L » → { nombre: "0,25", unite: "L" }. */
  function decouper(v) {
    const m = texte(v).replace(/\[+|\]+/g, '').match(/^([\d\s.,\u00a0\u202f]*\d)\s*(.*)$/);
    return m ? { nombre: m[1].trim(), unite: m[2].trim() } : null;
  }

  /** Calcul final déduit des deux fractions quand l'IA ne l'a pas donné (inconnue au numérateur). */
  function calculDeduit(e) {
    const l = e.lignes;
    let pos = null;
    [0, 1].forEach(function (r) { if (l[r][0] === e.symbole) pos = r; });
    if (pos === null) return null;
    const o = 1 - pos;
    const cible = decouper(l[o][0]), mobile = decouper(l[pos][1]), diviseur = decouper(l[o][1]);
    if (!cible || !mobile || !diviseur) return null;
    const annule = mobile.unite && mobile.unite === diviseur.unite;
    const u = function (x, biffe) { return x.unite ? (biffe ? ' [[' + x.unite + ']]' : ' [' + x.unite + ']') : ''; };
    return {
      num: cible.nombre + u(cible, false) + ' × ' + mobile.nombre + u(mobile, annule),
      den: diviseur.nombre + u(diviseur, annule)
    };
  }

  function versDemarche(d, notes) {
    if (!d || typeof d !== 'object') return null;
    const formule = versFormule(d.formule);
    const avecFraction = !!formule && typeof formule === 'object';
    const etapes = liste(d.etapes || d.étapes).map(function (e) {
      e = e || {};
      const lignes = liste(e.lignes).map(function (l) { return liste(l).map(texte); });
      const sortie = {
        titre: texte(e.titre),
        inconnue: texte(e.inconnue),
        rapport: e.rapport != null ? booleen(e.rapport) === true : avecFraction,
        lignes: lignes,
        symbole: texte(e.symbole),
        resultat: texte(e.resultat || e.résultat)
      };
      if (e.calcul && (e.calcul.num || e.calcul.numerateur)) {
        sortie.calcul = { num: texte(e.calcul.num || e.calcul.numerateur), den: texte(e.calcul.den || e.calcul.denominateur) };
      } else if (lignes.length === 2 && lignes[0].length === 2 && lignes[1].length === 2 && sortie.symbole) {
        const c = calculDeduit(sortie);
        if (c) { sortie.calcul = c; notes.calculs = true; }
      }
      if (texte(e.biffage)) sortie.biffage = texte(e.biffage);
      if (texte(e.suite)) sortie.suite = texte(e.suite);
      return sortie;
    });
    const r = { etapes: etapes };
    if (formule) r.formule = formule;
    if (texte(d.verification || d.vérification)) r.verification = texte(d.verification || d.vérification);
    return etapes.length || formule ? r : null;
  }

  /** Variantes d'une réponse acceptée : virgule ou point décimal, avec ou sans unité, œ ou oe. */
  function variantes(reponses, unite) {
    const sortie = [];
    const ajouter = function (s) { s = texte(s); if (s && sortie.indexOf(s) < 0) sortie.push(s); };
    const u = texte(unite);
    reponses.forEach(function (r) {
      const brut = texte(r);
      const m = brut.match(/^([-+]?[\d\s\u00a0\u202f]*[.,]?\d+)\s*(.*)$/);
      if (m) {
        const n = m[1].replace(/[\s\u00a0\u202f]/g, '');
        const unites = [m[2] || u].filter(Boolean);
        [n.replace('.', ','), n.replace(',', '.')].forEach(function (nb) {
          ajouter(nb);
          unites.forEach(function (un) { ajouter(nb + ' ' + un); ajouter(nb + un); });
        });
      } else {
        ajouter(brut);
        if (/œ/i.test(brut)) ajouter(brut.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe'));
      }
    });
    return sortie;
  }

  function versQuestion(src, n, notes) {
    src = src || {};
    const type = cleType(src.type);
    let titre = texte(src.titre || src.nom);
    if (PREFIXE_NUMERO.test(titre)) {
      titre = titre.replace(PREFIXE_NUMERO, '').trim();
      notes.numeros = true;
    }
    const q = {
      id: 'q' + n,
      points: entierPositif(src.points) || 1,
      partie: texte(src.partie),
      titre: titre,
      type: type,
      question: enonceHtml(src.enonce || src.énoncé || src.question),
      solution: texte(src.solution),
      explication: texte(src.explication)
    };
    if (texte(src.figure || src.description_image)) q.figure = texte(src.figure || src.description_image);

    switch (type) {
      case 'radio':
        q.choices = liste(src.choix || src.choices || src.options).map(versChoix);
        break;
      case 'shortanswer': {
        const brutes = liste(src.reponses_acceptees || src.reponses || src.acceptedAnswers).map(texte).filter(Boolean);
        if (!brutes.length && texte(src.reponse)) brutes.push(texte(src.reponse));
        q.unite = texte(src.unite || src.unité);
        q.reponsesIA = brutes;
        q.acceptedAnswers = variantes(brutes, q.unite);
        q.placeholder = q.unite ? 'Réponse en ' + q.unite : 'Votre réponse…';
        q.feedbackCorrect = texte(src.retroaction_correcte || src.retroaction) || 'Bonne réponse !';
        q.feedbackIncorrect = texte(src.retroaction_erreur) || 'Réponse incorrecte. Lis l\'explication détaillée sous la question.';
        break;
      }
      case 'compound_radio': {
        q.subQuestions = liste(src.volets || src.subQuestions).map(function (v, i) {
          v = v || {};
          return {
            id: 'v' + (i + 1),
            label: texte(v.libelle || v.label) || ('Volet ' + (i + 1)),
            points: entierPositif(v.points) || 1,
            choices: liste(v.choix || v.choices).map(versChoix)
          };
        });
        const total = q.subQuestions.reduce(function (s, v) { return s + v.points; }, 0);
        if (total && total !== q.points) { if (src.points != null) notes.pointsVolets = true; q.points = total; }
        break;
      }
      case 'etapes_matching': {
        const categories = liste(src.categories || src.catégories || src.options).map(texte)
          .filter(function (c) { return c && c !== '(Choisir)'; });
        q.options = ['(Choisir)'].concat(categories);
        q.statements = liste(src.enonces || src.énoncés || src.statements).map(function (s, i) {
          s = s || {};
          return {
            id: String.fromCharCode(97 + i),
            text: texte(s.texte || s.text),
            correct: texte(s.reponse || s.réponse || s.correct),
            feedback: texte(s.retroaction || s.feedback)
          };
        });
        if (q.statements.length && q.points !== q.statements.length) {
          if (src.points != null) notes.pointsAssociation = true;
          q.points = q.statements.length;
        }
        break;
      }
      default:
        break;
    }
    const demarche = versDemarche(src.demarche || src.démarche || src.explicationDemarche, notes);
    if (demarche) q.explicationDemarche = demarche;
    const remediation = versRemediation(src.deuxieme_chance || src.deuxième_chance || src.remediation, q.points);
    if (remediation) q.remediation = remediation;
    return q;
  }

  /** Deuxième chance de l'IA → remédiation du moteur (question guidée à choix, moitié des points). */
  function versRemediation(r, points) {
    if (!r || typeof r !== 'object') return null;
    const question = texte(r.question || r.enonce || r.énoncé);
    const choices = liste(r.choix || r.choices).map(versChoix);
    if (!question && !choices.length) return null;
    const sortie = { question: question, choices: choices, points: points / 2 };
    const bonne = choices.find(function (c) { return c.correct; });
    sortie.solution = texte(r.solution) || (bonne ? bonne.text : '');
    return sortie;
  }

  function normaliser(valeur, ctx) {
    const notes = [];
    let d = valeur;
    if (Array.isArray(d)) {
      d = { questions: d };
      notes.push('La réponse ne contenait que la liste des questions : le titre a été repris de l\'étape 1.');
    }
    if (!d || typeof d !== 'object' || !Array.isArray(d.questions)) {
      return { ok: false, notes: notes, erreur: 'La réponse ne contient pas de liste « questions ». Vérifiez que vous avez collé la réponse complète de l\'IA.' };
    }
    const drapeaux = {};
    const questions = d.questions.map(function (q, i) { return versQuestion(q, i + 1, drapeaux); });
    if (drapeaux.numeros) notes.push('Des numéros placés devant les titres (« Q1 », « 1. »...) ont été retirés.');
    if (drapeaux.pointsVolets) notes.push('Les points de certaines questions en volets ont été remplacés par la somme des points de leurs volets.');
    if (drapeaux.pointsAssociation) notes.push('Les points des associations ont été ramenés à 1 point par énoncé, comme le compte le moteur.');
    if (drapeaux.calculs) notes.push('Le calcul final de certaines démarches a été déduit des deux fractions.');
    return {
      ok: true,
      donnees: {
        titre: titreComplet(d.titre || ctx.sujet),
        accueil: texte(d.accueil || d.introduction),
        intentions: liste(d.intentions || d.objectifs).map(texte).filter(Boolean),
        questions: questions
      },
      notes: notes
    };
  }

  function totalPoints(d) {
    return ((d && d.questions) || []).reduce(function (s, q) { return s + (q.points || 0); }, 0);
  }

  // ----------------------------------------------------------------------
  // Vérification des règles
  // ----------------------------------------------------------------------
  function textesEleve(q) {
    const t = [q.titre, q.partie, enTexte(q.question), q.solution, q.explication, q.feedbackCorrect, q.feedbackIncorrect];
    liste(q.choices).forEach(function (c) { t.push(c.text, c.feedback); });
    liste(q.subQuestions).forEach(function (v) { t.push(v.label); liste(v.choices).forEach(function (c) { t.push(c.text, c.feedback); }); });
    liste(q.statements).forEach(function (s) { t.push(s.text, s.feedback); });
    liste(q.options).forEach(function (o) { t.push(o); });
    if (q.remediation) { t.push(q.remediation.question); liste(q.remediation.choices).forEach(function (c) { t.push(c.text, c.feedback); }); }
    const dm = q.explicationDemarche;
    if (dm) {
      t.push(dm.verification);
      liste(dm.etapes).forEach(function (e) { t.push(e.titre, e.inconnue, e.biffage); });
    }
    return t.filter(Boolean).join('\n');
  }

  function verifierChoix(choix, lieu, erreurs, avertissements) {
    const corrects = choix.filter(function (c) { return c.correct; }).length;
    if (choix.length < 2) erreurs.push({ lieu: lieu, msg: 'il faut au moins 2 choix (3 ou 4 pour un choix de réponse).' });
    if (corrects !== 1) erreurs.push({ lieu: lieu, msg: 'il faut exactement un choix correct ("correct": true) ; il y en a ' + corrects + '.' });
    if (choix.some(function (c) { return !c.text; })) erreurs.push({ lieu: lieu, msg: 'un choix n\'a pas de texte.' });
    if (choix.some(function (c) { return !c.feedback; })) avertissements.push({ lieu: lieu, msg: 'un choix n\'a pas de rétroaction ("retroaction").' });
  }

  function verifierDemarche(dm, lieu, erreurs, avertissements) {
    if (dm.formule && typeof dm.formule === 'object') {
      if (!dm.formule.num[0] || !dm.formule.den[0]) erreurs.push({ lieu: lieu, msg: 'la formule de la démarche doit avoir un "numerateur" et un "denominateur".' });
      if (!(dm.formule.legende || []).length) erreurs.push({ lieu: lieu, msg: 'la formule de la démarche doit être suivie de sa "legende" (chaque variable avec son unité).' });
    }
    if (!dm.etapes.length) erreurs.push({ lieu: lieu, msg: 'la démarche n\'a aucune étape ("etapes").' });
    dm.etapes.forEach(function (e, i) {
      const l = lieu + ', étape ' + (i + 1);
      const formeOk = e.lignes.length === 2 && e.lignes.every(function (r) { return r.length === 2 && r.every(Boolean); });
      if (!formeOk) { erreurs.push({ lieu: l, msg: '"lignes" doit contenir deux fractions de deux valeurs : [["numérateur", "dénominateur"], ["numérateur", "dénominateur"]].' }); return; }
      if (!e.symbole) erreurs.push({ lieu: l, msg: '"symbole" (la lettre de l\'inconnue) est manquant.' });
      else if (e.lignes[0][0] !== e.symbole && e.lignes[1][0] !== e.symbole) {
        avertissements.push({ lieu: l, msg: 'l\'inconnue « ' + e.symbole + ' » n\'est pas au numérateur d\'une des fractions : la valeur qui change de côté ne pourra pas être encerclée.' });
      }
      if (!e.calcul) erreurs.push({ lieu: l, msg: '"calcul" (numérateur et dénominateur du calcul final) est manquant.' });
      if (!e.resultat) erreurs.push({ lieu: l, msg: '"resultat" (la valeur trouvée avec son unité) est manquant.' });
      else if (!/[a-zA-Zµ%°]/.test(e.resultat.replace(/^[^\d]*/, ''))) avertissements.push({ lieu: l, msg: 'le résultat « ' + e.resultat + ' » n\'indique pas d\'unité.' });
      if (!e.inconnue) avertissements.push({ lieu: l, msg: 'l\'inconnue n\'est pas déclarée ("inconnue").' });
    });
  }

  /**
   * @param {object} d Données normalisées.
   * @returns {{erreurs: Array<{lieu, msg}>, avertissements: Array<{lieu, msg}>}}
   */
  function valider(d) {
    const erreurs = [];
    const avertissements = [];
    if (!d.questions.length) erreurs.push({ lieu: 'Réponse', msg: 'aucune question.' });
    MOTS_INTERDITS.forEach(function (m) {
      if (m.re.test(d.titre + '\n' + d.accueil + '\n' + d.intentions.join('\n'))) erreurs.push({ lieu: 'Titre, accueil ou intentions', msg: 'contient ' + m.texte + '.' });
    });
    if (!d.intentions.length) avertissements.push({ lieu: 'Accueil', msg: 'aucune intention d\'apprentissage ("intentions") : l\'écran d\'accueil présentera le déroulement général.' });

    const titres = {};
    d.questions.forEach(function (q, i) {
      const lieu = 'Question ' + (i + 1) + (q.titre ? ' (' + q.titre + ')' : '');
      if (!LIBELLES[q.type]) { erreurs.push({ lieu: lieu, msg: 'type « ' + q.type + ' » inconnu. Types permis : ' + TYPES.map(function (t) { return t.cle; }).join(', ') + '.' }); return; }
      if (!q.titre) erreurs.push({ lieu: lieu, msg: 'le titre est vide.' });
      else if (titres[q.titre.toLowerCase()]) avertissements.push({ lieu: lieu, msg: 'même titre qu\'une autre question.' });
      titres[(q.titre || '').toLowerCase()] = true;
      if (!q.question) erreurs.push({ lieu: lieu, msg: 'l\'énoncé est vide.' });
      if (!q.partie) avertissements.push({ lieu: lieu, msg: 'aucune partie ("partie") : le bandeau au-dessus du titre sera vide.' });
      if (!q.solution) erreurs.push({ lieu: lieu, msg: 'la solution attendue ("solution") est manquante.' });
      if (!q.explication) avertissements.push({ lieu: lieu, msg: 'aucune explication didactique ("explication").' });
      MOTS_INTERDITS.forEach(function (m) { if (m.re.test(textesEleve(q))) erreurs.push({ lieu: lieu, msg: 'contient ' + m.texte + '.' }); });
      if (/\b[A-Za-z]\s*=\s*[A-Za-z_{}\u00C0-\u017F]+\s*[÷/]\s*[A-Za-z]/.test(q.explication || '')) {
        avertissements.push({ lieu: lieu, msg: 'l\'explication semble écrire une formule en ligne (ex. « C = m ÷ V ») : la formule doit figurer dans la démarche, en fraction.' });
      }

      switch (q.type) {
        case 'radio':
          verifierChoix(q.choices, lieu, erreurs, avertissements);
          if (q.choices.length > 5) avertissements.push({ lieu: lieu, msg: q.choices.length + ' choix : 3 ou 4 suffisent.' });
          break;
        case 'shortanswer':
          if (!q.acceptedAnswers.length) erreurs.push({ lieu: lieu, msg: 'aucune réponse acceptée ("reponses_acceptees").' });
          if (q.reponsesIA.some(function (r) { return r.split(/\s+/).length > 4; })) avertissements.push({ lieu: lieu, msg: 'une réponse acceptée est longue : l\'élève devra l\'écrire exactement.' });
          if (q.reponsesIA.some(function (r) { return /^\s*[-+]?\d/.test(r); }) && !q.explicationDemarche) {
            avertissements.push({ lieu: lieu, msg: 'réponse numérique sans démarche ("demarche") : l\'explication en cas d\'erreur ne montrera pas le calcul.' });
          }
          break;
        case 'compound_radio':
          if (!q.subQuestions.length) erreurs.push({ lieu: lieu, msg: 'aucun volet ("volets").' });
          q.subQuestions.forEach(function (v, k) { verifierChoix(v.choices, lieu + ', volet ' + (k + 1), erreurs, avertissements); });
          break;
        case 'etapes_matching':
          if (q.options.length < 3) erreurs.push({ lieu: lieu, msg: 'il faut au moins 2 catégories ("categories").' });
          if (q.statements.length < 2) erreurs.push({ lieu: lieu, msg: 'il faut au moins 2 énoncés ("enonces").' });
          q.statements.forEach(function (s, k) {
            if (!s.text) erreurs.push({ lieu: lieu + ', énoncé ' + (k + 1), msg: 'le texte est vide.' });
            if (q.options.indexOf(s.correct) < 1) erreurs.push({ lieu: lieu + ', énoncé ' + (k + 1), msg: 'la réponse « ' + s.correct + ' » ne figure pas dans les catégories.' });
          });
          break;
      }
      if (q.explicationDemarche) verifierDemarche(q.explicationDemarche, lieu + ', démarche', erreurs, avertissements);
      if (q.remediation) {
        if (!q.remediation.question) erreurs.push({ lieu: lieu + ', deuxième chance', msg: 'la question guidée ("question") est vide.' });
        verifierChoix(q.remediation.choices, lieu + ', deuxième chance', erreurs, avertissements);
      } else if (q.type === 'shortanswer' && q.explicationDemarche) {
        avertissements.push({ lieu: lieu, msg: 'question de calcul sans deuxième chance ("deuxieme_chance") : l\'élève qui se trompe n\'aura pas de question guidée.' });
      }
    });
    return { erreurs: erreurs, avertissements: avertissements };
  }

  function consigneCorrection(erreurs) {
    const lignes = ['Le JSON que tu m\'as donné ne respecte pas certaines règles de la consigne :', ''];
    erreurs.forEach(function (e) { lignes.push('- ' + e.lieu + ' : ' + e.msg); });
    lignes.push(
      '',
      'Corrige ces points en respectant toutes les règles de la consigne de départ, sans modifier ce qui est déjà correct.',
      'Renvoie le JSON complet (toutes les questions), uniquement dans un bloc de code, avec des guillemets droits.'
    );
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Retouche d'une question par l'IA (étape 3) : question actuelle au format compact,
  // requête avec la demande de l'enseignant, puis lecture de la question retouchée.
  // ----------------------------------------------------------------------
  const VERS_CLE = {};
  TYPES.forEach(function (t) { VERS_CLE[t.moteur] = t.cle; });

  function variableTexte(v) { return v && v[1] ? v[0] + '_' + v[1] : (v ? v[0] : ''); }

  function choixCompacts(choix) {
    return liste(choix).map(function (c) { return { texte: c.text, correct: !!c.correct, retroaction: c.feedback || '' }; });
  }

  function demarcheCompacte(dm) {
    if (!dm) return null;
    const r = {};
    if (typeof dm.formule === 'string') r.formule = dm.formule;
    else if (dm.formule) {
      r.formule = {
        gauche: dm.formule.gauche,
        numerateur: variableTexte(dm.formule.num),
        denominateur: variableTexte(dm.formule.den),
        legende: liste(dm.formule.legende).map(function (l) { return { symbole: variableTexte(l[0]), definition: l[1] }; })
      };
    }
    r.etapes = liste(dm.etapes).map(function (e) {
      const s = { titre: e.titre, inconnue: e.inconnue, lignes: e.lignes, symbole: e.symbole };
      if (e.calcul) s.calcul = { num: e.calcul.num, den: e.calcul.den };
      s.resultat = e.resultat;
      if (e.biffage) s.biffage = e.biffage;
      if (e.suite) s.suite = e.suite;
      return s;
    });
    if (dm.verification) r.verification = dm.verification;
    return r;
  }

  /** Question normalisée → JSON compact de la consigne (ce que l'IA a produit). Sans l'image. */
  function versCompact(q) {
    const c = { type: VERS_CLE[q.type] || q.type, partie: q.partie, titre: q.titre, points: q.points, enonce: enTexte(q.question) };
    if (q.figure) c.figure = q.figure;
    switch (q.type) {
      case 'radio':
        c.choix = choixCompacts(q.choices);
        break;
      case 'shortanswer':
        c.reponses_acceptees = liste(q.reponsesIA).length ? q.reponsesIA.slice() : liste(q.acceptedAnswers).slice(0, 1);
        if (q.unite) c.unite = q.unite;
        c.retroaction_correcte = q.feedbackCorrect;
        c.retroaction_erreur = q.feedbackIncorrect;
        break;
      case 'compound_radio':
        delete c.points;
        c.volets = liste(q.subQuestions).map(function (v) { return { libelle: v.label, points: v.points, choix: choixCompacts(v.choices) }; });
        break;
      case 'etapes_matching':
        delete c.points;
        c.categories = liste(q.options).filter(function (o) { return o !== '(Choisir)'; });
        c.enonces = liste(q.statements).map(function (s) { return { texte: s.text, reponse: s.correct, retroaction: s.feedback || '' }; });
        break;
    }
    c.solution = q.solution;
    c.explication = q.explication;
    const dm = demarcheCompacte(q.explicationDemarche);
    if (dm) c.demarche = dm;
    if (q.remediation) c.deuxieme_chance = { question: q.remediation.question, choix: choixCompacts(q.remediation.choices) };
    return c;
  }

  /** Activité complète au format compact (texte de l'étape 2 tenu à jour après une retouche). */
  function activiteCompacte(d) {
    return {
      titre: texte(d.titre).replace(SUFFIXES_TITRE, ''),
      accueil: d.accueil,
      intentions: d.intentions,
      questions: d.questions.map(versCompact)
    };
  }

  function consigneRetouche(q, demande, ctx) {
    ctx = ctx || {};
    return [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Voici une question d\'un corrigé interactif destiné à des élèves (' + (ctx.niveau || 'secondaire') + '), au format JSON.',
      '',
      'RETOUCHE DEMANDÉE PAR L\'ENSEIGNANT',
      texte(demande),
      '',
      'RÈGLES À RESPECTER',
      '- Applique seulement la retouche demandée. Garde tel quel tout le reste, y compris le "type", sauf si la retouche exige de le changer.',
      '- Si une donnée numérique change, recalcule la réponse, les choix, les rétroactions, la solution et la démarche pour qu\'ils restent cohérents.',
      '- "titre" : le concept évalué, en casse de phrase, sans numéro ni préfixe.',
      '- Choix de réponse : 3 ou 4 choix, un seul correct, chacun avec sa rétroaction. Les choix expriment la pensée de l\'élève (« Je me dis que… », « Parce que… ») et les distracteurs reprennent de vraies conceptions erronées.',
      '- Réponse courte : "reponses_acceptees" donne seulement le nombre (ex. "32") et "unite" l\'unité attendue.',
      '- Démarche d\'un calcul : formule originale en fraction ("gauche", "numerateur", "denominateur", "legende"), puis des étapes en produit croisé ("inconnue", "lignes" avec deux fractions, "symbole", "calcul" avec [[unité biffée]] et [unité qui reste], "resultat" avec son unité). Jamais de formule en ligne du type « C = m ÷ V ».',
      '- Énoncé en texte simple, symboles en LaTeX entre \\( et \\). Français standard du Québec. N\'écris jamais « PFEQ », « défi », CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON contenant cette seule question retouchée (un objet, pas une liste), avec la même structure, des guillemets droits et chaque barre oblique inverse du LaTeX doublée (\\\\).',
      '',
      'QUESTION ACTUELLE',
      JSON.stringify(versCompact(q), null, 2)
    ].join('\n');
  }

  /**
   * Lit la question retouchée (objet, liste d'un objet ou { questions: [...] }) et la vérifie.
   * L'identifiant, l'image et sa description sont repris de la question d'origine.
   * @returns {{ok: boolean, erreur?: string, question?: object, erreurs?: Array, avertissements?: Array, notes?: Array}}
   */
  function appliquerRetouche(valeur, ancienne, rang) {
    let src = valeur;
    if (src && !Array.isArray(src) && Array.isArray(src.questions)) src = src.questions;
    if (Array.isArray(src)) {
      if (src.length !== 1) return { ok: false, erreur: 'La réponse contient ' + src.length + ' questions : il en faut une seule, la question retouchée.' };
      src = src[0];
    }
    if (!src || typeof src !== 'object' || !(src.type || src.titre || src.enonce)) {
      return { ok: false, erreur: 'La réponse ne contient pas de question (champs "type", "titre", "enonce"...).' };
    }
    const drapeaux = {};
    const q = versQuestion(src, rang, drapeaux);
    q.id = ancienne.id || q.id;
    if (ancienne.image) { q.image = ancienne.image; q.imageAlt = ancienne.imageAlt; }
    const notes = [];
    if (drapeaux.numeros) notes.push('Le numéro placé devant le titre a été retiré.');
    if (drapeaux.calculs) notes.push('Le calcul final de la démarche a été déduit des deux fractions.');
    if (drapeaux.pointsVolets || drapeaux.pointsAssociation) notes.push('Les points ont été recalculés comme les compte le moteur.');
    const verif = valider({ titre: '', accueil: '', intentions: ['-'], questions: [q] });
    const lieu = function (e) { return { lieu: e.lieu.replace(/^Question 1\b/, 'Question ' + rang), msg: e.msg }; };
    return { ok: true, question: q, erreurs: verif.erreurs.map(lieu), avertissements: verif.avertissements.map(lieu), notes: notes };
  }

  function consigneCorrectionRetouche(erreurs) {
    const lignes = ['La question retouchée que tu m\'as donnée ne respecte pas certaines règles :', ''];
    erreurs.forEach(function (e) { lignes.push('- ' + e.lieu + ' : ' + e.msg); });
    lignes.push('', 'Corrige ces points sans modifier ce qui est déjà correct.',
      'Renvoie seulement cette question, en un objet JSON, dans un bloc de code, avec des guillemets droits.');
    return lignes.join('\n');
  }

  /** Demande d'image pour le schéma d'une question, à donner à l'IA (image sans texte). */
  function demandeImage(q, niveau) {
    return [
      'Crée une image pour un exercice de sciences au secondaire' + (niveau ? ' (' + niveau + ')' : '') + ', au Québec.',
      '',
      'Schéma demandé : ' + (q.figure || q.titre),
      '',
      'Style : schéma didactique clair, traits nets, fond blanc, couleurs sobres. Format paysage, environ 1200 × 800 pixels.',
      'Les repères (lettres ou numéros) demandés par l\'exercice peuvent figurer ; aucun autre texte.'
    ].join('\n');
  }

  // ----------------------------------------------------------------------
  // questions_data.js, aperçu et package SCORM
  // ----------------------------------------------------------------------
  const BASE_MOTEUR = '../moteur-ui/';
  /** Fichiers du package : chemin dans le package → chemin sous moteur-ui/. */
  const FICHIERS_MOTEUR = {
    'src/tokens.css': 'src/tokens.css',
    'src/style.css': 'src/style.css',
    'src/print.css': 'src/print.css',
    'src/mathjax.js': 'src/mathjax.js',
    'src/scorm_api.js': 'simulateurs/scorm/scorm_api.js',
    'src/scorm_runtime.js': 'simulateurs/scorm/scorm_runtime.js'
  };
  const COQUILLE = 'simulateurs/scorm/index_scorm_shell.html';

  /**
   * Questions au format du moteur, sans les champs propres à l'assistant.
   * cheminImage et cheminAudio (package) remplacent les données intégrées (data:) par un fichier du package.
   * Un enregistrement de voix pas encore repris du navigateur (« idb ») est retiré : la voix de synthèse le remplace.
   */
  function questionsMoteur(d, cheminImage, cheminAudio) {
    return JSON.parse(JSON.stringify(d.questions)).map(function (q, i) {
      delete q.figure;
      delete q.unite;
      delete q.reponsesIA;
      delete q.audioDuree;
      delete q.audioTexte;
      delete q.audioExemple;
      if (q.image && cheminImage) q.image = cheminImage(q, i);
      if (q.audio && !/^data:audio\/|^\.\//.test(q.audio)) delete q.audio;
      if (q.audio && cheminAudio) q.audio = cheminAudio(q, i);
      return q;
    });
  }

  function configActivite(d) {
    // Le mode vient des données (« comprehension » pour l'action du même nom), « corrige » par défaut.
    const c = {
      mode: d.mode || 'corrige',
      titre: d.titre,
      totalPoints: totalPoints(d),
      zipFilename: nomFichierZip(d)
    };
    // Compréhension en deux pages (Hattie) : page de présentation, puis question ; critères de réussite à l'accueil.
    if (d.presentation) c.presentation = d.presentation;
    if (d.accueil) c.welcomeIntro = d.accueil;
    if (d.intentions.length) c.intentions = d.intentions;
    if (d.criteres && d.criteres.length) c.criteres = d.criteres;
    return c;
  }

  function nomFichierZip(d) {
    return String(d.titre || 'Activité interactive').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() + '.zip';
  }

  /** JSON sûr dans une balise <script> (aucun « </script> » possible). */
  function jsonScript(v) {
    return JSON.stringify(v, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }

  function questionsDataJs(d, cheminImage, cheminAudio) {
    return '/**\n * questions_data.js — ' + d.titre.replace(/\*\//g, '') + '\n' +
      ' * Activité interactive SCORM produite par l\'assistant de création de ressources Moodle.\n' +
      ' * Barème total : ' + totalPoints(d) + ' points. Score débutant à 0.\n */\n' +
      'window.SCORM_ACTIVITY_CONFIG = ' + jsonScript(configActivite(d)) + ';\n\n' +
      'window.QUESTIONS_DATA = ' + jsonScript(questionsMoteur(d, cheminImage, cheminAudio)) + ';\n';
  }

  let coquilleEnCache = null;
  function lireCoquille() {
    if (coquilleEnCache) return Promise.resolve(coquilleEnCache);
    return lireTexte(BASE_MOTEUR + COQUILLE).then(function (t) { coquilleEnCache = t; return t; });
  }

  function lireTexte(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('fichier introuvable : ' + url);
      return r.text();
    });
  }
  function lireOctets(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('fichier introuvable : ' + url);
      return r.arrayBuffer();
    }).then(function (b) { return new Uint8Array(b); });
  }

  function remplirCoquille(coquille, d) {
    return coquille
      .split('{{TITRE_ACTIVITE}}').join(echapperHtml(d.titre))
      .split('{{TOTAL_POINTS}}').join(String(totalPoints(d)));
  }

  /**
   * Page de l'aperçu (srcdoc d'un cadre de l'assistant) : la coquille de l'activité, dont les
   * fichiers pointent vers moteur-ui et dont les données sont intégrées. Les images restent en data:.
   */
  function construireApercu(d) {
    return lireCoquille().then(function (coquille) {
      let page = remplirCoquille(coquille, d);
      Object.keys(FICHIERS_MOTEUR).forEach(function (cible) {
        page = page.split('"./' + cible + '"').join('"' + BASE_MOTEUR + FICHIERS_MOTEUR[cible] + '"');
      });
      const donnees = '<script>\nwindow.SCORM_ACTIVITY_CONFIG = ' + jsonScript(configActivite(d)) +
        ';\nwindow.QUESTIONS_DATA = ' + jsonScript(questionsMoteur(d)) + ';\n</script>';
      return page.replace(/<script src="\.\/questions_data\.js"[^>]*><\/script>/, function () { return donnees; });
    });
  }

  function echapperXml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' }[c];
    });
  }

  function manifeste(d, medias) {
    const id = d.titre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_]/g, '_');
    const t = echapperXml(d.titre);
    const fichiers = ['index.html', 'questions_data.js'].concat(Object.keys(FICHIERS_MOTEUR), medias);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<manifest identifier="MANIFEST_' + id + '" version="1.2"\n' +
      '          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"\n' +
      '          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"\n' +
      '          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n' +
      '          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd\n' +
      '                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p2 imsmd_rootv1p2p2.xsd\n' +
      '                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">\n' +
      '  <metadata>\n    <schema>ADL SCORM</schema>\n    <schemaversion>1.2</schemaversion>\n  </metadata>\n' +
      '  <organizations default="ORG_' + id + '">\n' +
      '    <organization identifier="ORG_' + id + '">\n' +
      '      <title>' + t + '</title>\n' +
      '      <item identifier="ITEM_' + id + '" identifierref="RES_' + id + '">\n' +
      '        <title>' + t + '</title>\n' +
      '        <adlcp:masteryscore>60</adlcp:masteryscore>\n' +
      '      </item>\n    </organization>\n  </organizations>\n' +
      '  <resources>\n' +
      '    <resource identifier="RES_' + id + '" type="webcontent" adlcp:scormtype="sco" href="index.html">\n' +
      fichiers.map(function (f) { return '      <file href="' + echapperXml(f) + '"/>\n'; }).join('') +
      '    </resource>\n  </resources>\n</manifest>\n';
  }

  function dataUrlVersOctets(url) {
    const m = String(url).match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!m) return null;
    let bin;
    try { bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]); } catch (e) { return null; }
    const o = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i) & 255;
    return { type: m[1], octets: o };
  }

  const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
  const EXTENSIONS_AUDIO = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/mp4': 'm4a' };

  /**
   * Package SCORM 1.2 complet (index.html, questions_data.js, imsmanifest.xml, src/…, src/images/…, src/audio/…).
   * Les enregistrements de voix de l'enseignant deviennent src/audio/<id>.mp3, lus par le moteur à la place
   * de la voix de synthèse.
   * @returns {Promise<Uint8Array>} Archive ZIP.
   */
  function construirePackage(d) {
    const fflate = window.fflate;
    if (!fflate) return Promise.reject(new Error('le module d\'empaquetage se charge encore'));
    const fichiers = {};
    const images = [];
    const cheminImage = function (q, i) {
      const img = dataUrlVersOctets(q.image);
      if (!img) return q.image;
      const chemin = 'src/images/question_' + (i + 1) + '.' + (EXTENSIONS[img.type] || 'png');
      fichiers[chemin] = [img.octets, { level: 0 }];
      images.push(chemin);
      return './' + chemin;
    };
    const cheminAudio = function (q, i) {
      const son = dataUrlVersOctets(q.audio);
      if (!son) return q.audio;
      const nom = String(q.id || ('station_' + (i + 1))).replace(/[^\w-]/g, '_');
      const chemin = 'src/audio/' + nom + '.' + (EXTENSIONS_AUDIO[son.type] || 'mp3');
      fichiers[chemin] = [son.octets, { level: 0 }];
      images.push(chemin);
      return './' + chemin;
    };
    const donnees = questionsDataJs(d, cheminImage, cheminAudio);
    const lectures = Object.keys(FICHIERS_MOTEUR).map(function (cible) {
      return lireOctets(BASE_MOTEUR + FICHIERS_MOTEUR[cible]).then(function (o) { fichiers[cible] = o; });
    });
    lectures.push(lireCoquille().then(function (c) { fichiers['index.html'] = fflate.strToU8(remplirCoquille(c, d)); }));
    return Promise.all(lectures).then(function () {
      fichiers['questions_data.js'] = fflate.strToU8(donnees);
      fichiers['imsmanifest.xml'] = fflate.strToU8(manifeste(d, images));
      return new Promise(function (resolve, reject) {
        fflate.zip(fichiers, { level: 6 }, function (err, data) { if (err) reject(err); else resolve(data); });
      });
    });
  }

  // ----------------------------------------------------------------------
  // Reprise d'un questions_data.js de l'outil actuel
  // ----------------------------------------------------------------------
  /**
   * Littéral JavaScript (clés sans guillemets, chaînes entre apostrophes, commentaires,
   * virgules finales) → JSON strict. Les chaînes entre guillemets sont recopiées telles quelles.
   */
  function versJsonStrict(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    const precedent = function () { const m = out.match(/\S(?=\s*$)/); return m ? m[0] : ''; };
    while (i < n) {
      const c = src[i];
      if (c === '"') {
        let j = i + 1;
        while (j < n && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
        out += src.slice(i, j + 1); i = j + 1;
      } else if (c === '\'') {
        let j = i + 1, s = '';
        while (j < n && src[j] !== '\'') {
          if (src[j] === '\\') { s += src[j + 1] === '\'' ? '\'' : src[j] + src[j + 1]; j += 2; }
          else { s += src[j] === '"' ? '\\"' : src[j]; j++; }
        }
        out += '"' + s + '"'; i = j + 1;
      } else if (c === '/' && src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
      } else if (c === '/' && src[i + 1] === '*') {
        const fin = src.indexOf('*/', i + 2);
        i = fin < 0 ? n : fin + 2;
      } else if (/[A-Za-z_$]/.test(c) && /[{,]/.test(precedent())) {
        const m = src.slice(i).match(/^[A-Za-z_$][\w$]*/);
        const apres = src.slice(i + m[0].length).match(/^\s*:/);
        out += apres ? '"' + m[0] + '"' : m[0];
        i += m[0].length;
      } else {
        out += c; i++;
      }
    }
    return out.replace(/,(\s*[}\]])/g, '$1');
  }

  /** Lit SCORM_ACTIVITY_CONFIG et QUESTIONS_DATA d'un questions_data.js, sans l'exécuter. */
  function lireQuestionsData(js) {
    const extraire = function (nom) {
      const m = js.match(new RegExp('window\\.' + nom + '\\s*=\\s*'));
      if (!m) return null;
      const debut = m.index + m[0].length;
      const ouvrant = js[debut];
      const fermant = ouvrant === '[' ? ']' : '}';
      let profondeur = 0, chaine = null;
      for (let i = debut; i < js.length; i++) {
        const c = js[i];
        if (chaine) { if (c === '\\') i++; else if (c === chaine) chaine = null; continue; }
        if (c === '"' || c === '\'' || c === '`') chaine = c;
        else if (c === ouvrant) profondeur++;
        else if (c === fermant && --profondeur === 0) return js.slice(debut, i + 1);
      }
      return null;
    };
    const lire = function (bloc) {
      if (!bloc) return null;
      try { return JSON.parse(versJsonStrict(bloc)); } catch (e) { /* lecture tolérante ci-dessous */ }
      const r = window.MoodleAICollage.lireJson(bloc);
      return r.ok ? r.valeur : null;
    };
    const config = lire(extraire('SCORM_ACTIVITY_CONFIG')) || {};
    const questions = lire(extraire('QUESTIONS_DATA'));
    if (!Array.isArray(questions)) throw new Error('les questions de ce fichier n\'ont pas pu être lues');
    return { config: config, questions: questions };
  }

  function depuisQuestionsData(js) {
    const lu = lireQuestionsData(js);
    const config = lu.config;
    const questions = lu.questions;
    if (config.mode && config.mode !== 'corrige') throw new Error('ce fichier n\'est pas un corrigé interactif');
    const inconnus = questions.filter(function (q) { return !LIBELLES[q.type]; });
    if (inconnus.length) {
      throw new Error('ce corrigé contient des questions propres à une activité (« ' + inconnus[0].type + ' ») que l\'assistant ne sait pas modifier. Modifiez-le dans son simulateur.');
    }
    questions.forEach(function (q, i) {
      q.id = q.id || ('q' + (i + 1));
      if (q.type === 'shortanswer') { q.reponsesIA = (q.acceptedAnswers || []).slice(); q.unite = ''; }
      // Images du dossier de l'activité : elles ne sont pas dans ce fichier.
      if (q.image && !/^data:/.test(q.image)) { q.figure = q.imageCaption || q.titre; delete q.image; }
    });
    return {
      contexte: { sujet: texte(config.titre).replace(SUFFIXES_TITRE, '') },
      donnees: {
        titre: titreComplet(config.titre),
        accueil: texte(config.welcomeIntro),
        intentions: liste(config.intentions).map(texte).filter(Boolean),
        questions: questions
      }
    };
  }

  window.MoodleAIScormCorrige = {
    TYPES: TYPES,
    LIBELLES: LIBELLES,
    construireConsigne: construireConsigne,
    normaliser: normaliser,
    valider: valider,
    consigneCorrection: consigneCorrection,
    demandeImage: demandeImage,
    titreComplet: titreComplet,
    versCompact: versCompact,
    activiteCompacte: activiteCompacte,
    consigneRetouche: consigneRetouche,
    appliquerRetouche: appliquerRetouche,
    consigneCorrectionRetouche: consigneCorrectionRetouche,
    totalPoints: totalPoints,
    enTexte: enTexte,
    nomFichierZip: nomFichierZip,
    questionsDataJs: questionsDataJs,
    construireApercu: construireApercu,
    construirePackage: construirePackage,
    depuisQuestionsData: depuisQuestionsData,
    // Outils partagés avec les actions de compréhension (scorm-comprehension.js, scorm-hattie.js).
    outils: {
      texte: texte,
      liste: liste,
      entierPositif: entierPositif,
      versChoix: versChoix,
      choixCompacts: choixCompacts,
      verifierChoix: verifierChoix,
      versDemarche: versDemarche,
      demarcheCompacte: demarcheCompacte,
      verifierDemarche: verifierDemarche,
      lireQuestionsData: lireQuestionsData,
      MOTS_INTERDITS: MOTS_INTERDITS,
      PREFIXE_NUMERO: PREFIXE_NUMERO
    }
  };
})();
