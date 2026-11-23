/**
 * Action « Banque de questions Moodle XML » — consigne pour l'IA, lecture,
 * vérification et conversion vers le modèle de questions du simulateur Moodle
 * (moteur-ui/simulateurs/moodle), puis vers le XML Moodle (MoodleParser.serializeXml).
 *
 * L'IA renvoie un JSON compact :
 * { titre, questions: [ { type, titre, tag, enonce, explication, ...champs propres au type } ] }
 * Les images des questions « glisser-déposer sur image » sont ajoutées à l'étape de l'aperçu.
 */
(function () {
  'use strict';

  /** Les 9 types, dans l'ordre d'affichage. */
  const TYPES = [
    { cle: 'multichoice', libelle: 'Choix multiples', aide: 'Une seule bonne réponse parmi 4 choix.' },
    { cle: 'truefalse', libelle: 'Vrai ou faux', aide: 'Une affirmation à juger.' },
    { cle: 'shortanswer', libelle: 'Réponse courte', aide: 'Un mot ou une courte expression à écrire.' },
    { cle: 'numerical', libelle: 'Réponse numérique', aide: 'Un calcul, avec marge d\'erreur et unité.' },
    { cle: 'matching', libelle: 'Association', aide: 'Des paires à relier.' },
    { cle: 'ordering', libelle: 'Mise en ordre', aide: 'Des étapes à replacer dans l\'ordre.' },
    { cle: 'gapselect', libelle: 'Texte à trous (menus)', aide: 'Des mots à choisir dans des menus déroulants.' },
    { cle: 'cloze', libelle: 'Questions intégrées (Cloze)', aide: 'Des champs et des menus dans un même texte.' },
    { cle: 'ddimageortext', libelle: 'Glisser-déposer sur une image', aide: 'Des étiquettes à placer sur un schéma. Vous fournirez l\'image à l\'étape de l\'aperçu.' }
  ];
  const LIBELLES = {};
  TYPES.forEach(function (t) { LIBELLES[t.cle] = t.libelle; });
  const TOUS_LES_TYPES = TYPES.map(function (t) { return t.cle; });

  /** Noms de type que l'IA écrit parfois autrement. */
  const ALIAS_TYPES = {
    qcm: 'multichoice', choixmultiple: 'multichoice', choixmultiples: 'multichoice', multiplechoice: 'multichoice',
    vraifaux: 'truefalse', vraioufaux: 'truefalse',
    reponsecourte: 'shortanswer', short: 'shortanswer',
    numerique: 'numerical', numeric: 'numerical', calcul: 'numerical',
    association: 'matching', appariement: 'matching', match: 'matching',
    ordre: 'ordering', miseenordre: 'ordering', order: 'ordering',
    texteatrous: 'gapselect', trous: 'gapselect', gapfill: 'gapselect',
    multianswer: 'cloze', questionsintegrees: 'cloze',
    ddimage: 'ddimageortext', ddwtos: 'ddimageortext', glisserdeposer: 'ddimageortext'
  };

  const MOTS_INTERDITS = [
    { re: /\bPFEQ\b/i, texte: 'la mention « PFEQ » (réservée aux enseignants)' },
    { re: /\bd[ée]fis?\b/i, texte: 'le mot « défi »' },
    { re: /\bCD\s?[123]\b/, texte: 'une compétence ministérielle (CD1, CD2, CD3)' }
  ];
  const PREFIXE_NUMERO = /^(?:Q\s*\d+|Question\s*\d+|\d+)\s*[.\-:)–—]\s*/i;
  const SOUS_QUESTION_CLOZE = /\{(\d*):([A-Z_]+):([^{}]*)\}/g;
  const TYPES_CLOZE = /^(SHORTANSWER|SA|MW|SHORTANSWER_C|SAC|MWC|NUMERICAL|NM|MULTICHOICE|MC|MULTICHOICE_V|MCV|MULTICHOICE_H|MCH|MULTICHOICE_S|MCS|MULTICHOICE_VS|MCVS|MULTICHOICE_HS|MCHS|MULTIRESPONSE|MR|MULTIRESPONSE_H|MRH|MULTIRESPONSE_S|MRS|MULTIRESPONSE_HS|MRHS)$/;

  // ----------------------------------------------------------------------
  // Outils
  // ----------------------------------------------------------------------
  function echapperHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /** Texte simple → HTML (paragraphes). Le HTML déjà présent est conservé tel quel. */
  function enHtml(t) {
    const s = String(t == null ? '' : t).trim();
    if (!s) return '';
    if (/<\/?(p|br|strong|em|sub|sup|ul|ol|li|span|div|b|i)\b[^>]*>/i.test(s)) return s;
    return s.split(/\n\s*\n/).map(function (p) {
      return '<p>' + echapperHtml(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  /** HTML → texte lisible (pour la vérification et les tableaux). */
  function enTexte(html) {
    return String(html == null ? '' : html)
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>\s*<p[^>]*>/gi, '\n\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  }

  function texte(v) { return String(v == null ? '' : v).trim(); }
  function liste(v) { return Array.isArray(v) ? v : []; }
  function nbMots(s) { return texte(s).split(/\s+/).filter(Boolean).length; }

  /** « 12,5 », « 12.5 », 12.5 → 12.5 (null si illisible). */
  function nombre(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    const s = texte(v).replace(/\s/g, '').replace(',', '.');
    if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return null;
    return parseFloat(s);
  }

  function booleen(v) {
    if (typeof v === 'boolean') return v;
    const s = texte(v).toLowerCase();
    if (['true', 'vrai', 'oui', '1'].indexOf(s) >= 0) return true;
    if (['false', 'faux', 'non', '0'].indexOf(s) >= 0) return false;
    return null;
  }

  function cleType(v) {
    const brut = texte(v);
    if (TOUS_LES_TYPES.indexOf(brut) >= 0) return brut;
    const s = brut.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
    if (TOUS_LES_TYPES.indexOf(s) >= 0) return s;
    return ALIAS_TYPES[s] || brut;
  }

  /** Répartition indicative : au moins une question par type coché, le reste en choix multiples d'abord. */
  function repartition(ctx) {
    const types = (ctx.types && ctx.types.length ? ctx.types : TOUS_LES_TYPES).slice();
    const n = Math.max(ctx.nbQuestions || types.length, types.length);
    const r = {};
    types.forEach(function (t) { r[t] = 1; });
    const ordreSupplement = ['multichoice', 'truefalse', 'shortanswer', 'matching', 'gapselect', 'numerical', 'ordering', 'cloze', 'ddimageortext']
      .filter(function (t) { return types.indexOf(t) >= 0 && t !== 'ddimageortext'; });
    const cycle = ordreSupplement.length ? ordreSupplement : types;
    for (let k = types.length, i = 0; k < n; k++, i++) r[cycle[i % cycle.length]]++;
    return r;
  }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  const EXEMPLES_JSON = {
    multichoice: [
      '    {',
      '      "type": "multichoice",',
      '      "titre": "Rôle du dioxygène dans la respiration cellulaire",',
      '      "tag": "respiration",',
      '      "enonce": "Quel est le rôle du dioxygène dans la respiration cellulaire ?",',
      '      "choix": [',
      '        { "texte": "...", "correct": true, "retroaction": "..." },',
      '        { "texte": "...", "correct": false, "retroaction": "..." },',
      '        { "texte": "...", "correct": false, "retroaction": "..." },',
      '        { "texte": "...", "correct": false, "retroaction": "..." }',
      '      ],',
      '      "explication": "..."',
      '    }'
    ],
    truefalse: [
      '    {',
      '      "type": "truefalse",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Affirmation à juger vraie ou fausse.",',
      '      "reponse": false,',
      '      "retroaction_vrai": "Rétroaction si l\'élève répond Vrai.",',
      '      "retroaction_faux": "Rétroaction si l\'élève répond Faux.",',
      '      "explication": "..."',
      '    }'
    ],
    shortanswer: [
      '    {',
      '      "type": "shortanswer",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "...",',
      '      "reponses_acceptees": ["alvéole", "alvéoles", "alvéole pulmonaire"],',
      '      "retroaction": "...",',
      '      "explication": "..."',
      '    }'
    ],
    numerical: [
      '    {',
      '      "type": "numerical",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Énoncé du problème avec ses données et leurs unités.",',
      '      "reponse": 32,',
      '      "tolerance": 0.5,',
      '      "unite": "g/L",',
      '      "retroaction": "...",',
      '      "explication": "Formule \\\\( C = \\\\dfrac{m_{soluté}}{V_{solution}} \\\\), où ... ; substitution avec unités ; résultat."',
      '    }'
    ],
    matching: [
      '    {',
      '      "type": "matching",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Associez chaque structure à sa fonction.",',
      '      "paires": [',
      '        { "element": "...", "correspondance": "..." },',
      '        { "element": "...", "correspondance": "..." },',
      '        { "element": "...", "correspondance": "..." }',
      '      ],',
      '      "explication": "..."',
      '    }'
    ],
    ordering: [
      '    {',
      '      "type": "ordering",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Placez les étapes dans l\'ordre.",',
      '      "elements_dans_l_ordre": ["Première étape", "Deuxième étape", "Troisième étape", "Quatrième étape"],',
      '      "explication": "..."',
      '    }'
    ],
    gapselect: [
      '    {',
      '      "type": "gapselect",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Les échanges gazeux se font par [[1]]. Le dioxygène passe de l\'alvéole vers le [[2]].",',
      '      "trous": [',
      '        { "bonne_reponse": "diffusion", "distracteurs": ["filtration", "osmose"] },',
      '        { "bonne_reponse": "sang", "distracteurs": ["mucus", "pharynx"] }',
      '      ],',
      '      "explication": "..."',
      '    }'
    ],
    cloze: [
      '    {',
      '      "type": "cloze",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Le sang se charge en {1:SHORTANSWER:=dioxygène~=O2} dans les alvéoles, puis rejoint le cœur par la circulation {1:MULTICHOICE:=pulmonaire~systémique~coronaire}.",',
      '      "explication": "..."',
      '    }'
    ],
    ddimageortext: [
      '    {',
      '      "type": "ddimageortext",',
      '      "titre": "...",',
      '      "tag": "...",',
      '      "enonce": "Glissez chaque étiquette sur le repère correspondant du schéma.",',
      '      "description_image": "Schéma d\'une alvéole entourée de capillaires, vue en coupe, avec 4 repères vides.",',
      '      "etiquettes": ["Bronchiole", "Alvéole", "Capillaire", "Veinule"],',
      '      "explication": "..."',
      '    }'
    ]
  };

  const REGLES_TYPES = {
    multichoice: 'Choix multiples (multichoice) : exactement 4 choix, un seul correct ("correct": true). Les 3 distracteurs reprennent des conceptions erronées fréquentes chez les élèves de ce niveau. Les 4 choix ont une longueur semblable. Chaque choix a sa propre rétroaction, qui explique pourquoi il est juste ou faux.',
    truefalse: 'Vrai ou faux (truefalse) : "reponse" vaut true ou false. Une rétroaction pour chacune des deux réponses possibles de l\'élève.',
    shortanswer: 'Réponse courte (shortanswer) : la réponse attendue tient en 1 à 3 mots. "reponses_acceptees" liste les variantes acceptées (singulier, pluriel, synonyme, symbole).',
    numerical: 'Réponse numérique (numerical) : "reponse" est un nombre (point décimal), "tolerance" la marge d\'erreur acceptée, "unite" l\'unité attendue. L\'énoncé donne toutes les données avec leurs unités. L\'explication présente d\'abord la formule originale en fraction (\\dfrac), suivie de « où » qui définit chaque variable avec son unité, puis la substitution des valeurs avec leurs unités et le résultat avec son unité. N\'écris jamais une formule en ligne du type « C = m ÷ V ».',
    matching: 'Association (matching) : 3 à 6 paires. Chaque correspondance est différente des autres.',
    ordering: 'Mise en ordre (ordering) : 4 à 7 éléments, écrits dans le bon ordre. L\'ordre est mélangé pour l\'élève.',
    gapselect: 'Texte à trous (gapselect) : l\'énoncé contient les marqueurs [[1]], [[2]]... dans l\'ordre, un par trou (2 à 6 trous). "trous" contient, dans le même ordre, la bonne réponse et 2 distracteurs plausibles de même nature (mêmes genre et nombre) pour chaque trou.',
    cloze: 'Questions intégrées (cloze) : l\'énoncé contient 2 à 4 sous-questions en syntaxe Moodle : {1:SHORTANSWER:=réponse~=variante} ou {1:MULTICHOICE:=bonne~fausse~fausse} ou {1:NUMERICAL:=valeur:tolérance}. Chaque sous-question a au moins une réponse précédée de « = ». N\'utilise jamais d\'accolades ailleurs dans l\'énoncé.',
    ddimageortext: 'Glisser-déposer sur une image (ddimageortext) : 3 à 6 étiquettes de 1 ou 2 mots chacune (jamais de phrase ni de parenthèse). "description_image" décrit le schéma à produire (sans aucun texte dans l\'image). L\'image elle-même sera ajoutée plus tard par l\'enseignant : n\'en produis pas.'
  };

  function construireConsigne(ctx) {
    const types = ctx.types && ctx.types.length ? ctx.types : TOUS_LES_TYPES;
    const r = repartition(ctx);
    const texteCours = texte(ctx.texteCours);
    const source = texteCours
      ? 'Le contenu du cours est fourni à la fin de cette consigne, sous « CONTENU DU COURS ». Appuie-toi uniquement sur ce contenu.'
      : 'Le document de cours est joint à ce message. Appuie-toi uniquement sur ce document. S\'il n\'y a aucun document joint, ou si tu ne peux pas le lire, dis-le clairement et ne produis aucun JSON : n\'invente jamais le contenu du cours.';

    const lignes = [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu prépares une banque de questions à importer dans Moodle.',
      '',
      'BANQUE DE QUESTIONS',
      '- Sujet : ' + (ctx.sujet || 'déduis-le du contenu du cours, en quelques mots'),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '- Nombre total de questions : ' + Math.max(ctx.nbQuestions || types.length, types.length),
      '- Répartition par type : ' + types.map(function (t) { return t + ' (' + r[t] + ')'; }).join(', '),
      '',
      source
    ];
    if (texte(ctx.precisions)) lignes.push('', 'PRÉCISIONS DE L\'ENSEIGNANT', texte(ctx.precisions));
    lignes.push(
      '',
      'RÈGLES COMMUNES',
      '1. Couvre les notions importantes du cours, sans répéter deux fois la même notion.',
      '2. "titre" : le nom du concept évalué, en casse de phrase (ex. : « Rôle du dioxygène dans la respiration cellulaire »). Jamais de numéro ni de préfixe comme « Q1 », « 1. » ou « Question 1 ».',
      '3. "tag" : un seul mot en minuscules, sans espace, qui nomme le concept prescrit au programme (ex. : respiration, alvéoles, diffusion, concentration).',
      '4. "enonce" : en texte simple, sans HTML. Les formules et symboles s\'écrivent en LaTeX entre \\( et \\), par exemple \\( CO_2 \\).',
      '5. "explication" : la rétroaction générale, affichée après la réponse. Une à trois phrases factuelles qui expliquent la bonne réponse.',
      '6. Français standard du Québec. N\'écris jamais les mots « PFEQ » ni « défi », ni les compétences CD1, CD2 ou CD3.',
      '',
      'RÈGLES PROPRES À CHAQUE TYPE'
    );
    types.forEach(function (t) { lignes.push('- ' + REGLES_TYPES[t]); });
    lignes.push(
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Dans le JSON, chaque barre oblique inverse du LaTeX est doublée (\\\\). Respecte exactement cette structure (un modèle par type ; les « ... » sont à remplacer) :',
      '',
      '{',
      '  "titre": "' + (ctx.sujet ? ctx.sujet.replace(/["\\]/g, '') : 'Sujet de la banque') + '",',
      '  "questions": ['
    );
    types.forEach(function (t, i) {
      const bloc = EXEMPLES_JSON[t].slice();
      if (i < types.length - 1) bloc[bloc.length - 1] += ',';
      Array.prototype.push.apply(lignes, bloc);
    });
    lignes.push('  ]', '}');
    if (texteCours) lignes.push('', 'CONTENU DU COURS', texteCours);
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation : JSON de l'IA → modèle de questions du simulateur Moodle
  // ----------------------------------------------------------------------
  function versQuestion(src, n, notes) {
    src = src || {};
    const type = cleType(src.type);
    let titre = texte(src.titre || src.nom || src.name);
    if (PREFIXE_NUMERO.test(titre)) {
      titre = titre.replace(PREFIXE_NUMERO, '').trim();
      notes.numeros = true;
    }
    let tag = texte(src.tag || (Array.isArray(src.tags) ? src.tags[0] : '')).replace(/^#/, '');
    if (tag && tag !== tag.toLowerCase()) { tag = tag.toLowerCase(); notes.tags = true; }

    const q = {
      id: 'q' + n,
      type: type,
      name: titre,
      questionText: enHtml(src.enonce || src.question || src.texte),
      generalFeedback: enHtml(src.explication || src.retroaction_generale),
      defaultgrade: 1,
      penalty: 0.3333333,
      tag: tag,
      shuffleanswers: true
    };

    switch (type) {
      case 'multichoice':
        q.single = 'true';
        q.options = liste(src.choix || src.options || src.reponses).map(function (c) {
          if (typeof c === 'string') return { text: c, fraction: 0, feedback: '' };
          const correct = booleen(c.correct) === true || Number(c.fraction) === 100;
          return { text: texte(c.texte || c.text), fraction: correct ? 100 : 0, feedback: texte(c.retroaction || c.feedback) };
        });
        break;
      case 'truefalse':
        q.correctAnswer = booleen(src.reponse);
        q.feedbackTrue = texte(src.retroaction_vrai);
        q.feedbackFalse = texte(src.retroaction_faux);
        break;
      case 'shortanswer': {
        q.useCase = booleen(src.sensible_casse) === true;
        const fb = texte(src.retroaction);
        q.answers = liste(src.reponses_acceptees || src.reponses || (src.reponse != null ? [src.reponse] : []))
          .map(function (a) { return { text: texte(a), fraction: 100, feedback: fb }; });
        break;
      }
      case 'numerical': {
        const v = nombre(src.reponse);
        if (src.reponse != null && typeof src.reponse !== 'number' && v != null) notes.nombres = true;
        q.answers = [{
          value: v == null ? texte(src.reponse) : v,
          tolerance: Math.abs(nombre(src.tolerance) || 0),
          fraction: 100,
          feedback: texte(src.retroaction)
        }];
        q.units = texte(src.unite) ? [{ unit: texte(src.unite), multiplier: 1 }] : [];
        break;
      }
      case 'matching':
        q.pairs = liste(src.paires).map(function (p) {
          return { question: texte(p.element || p.question || p.enonce), answer: texte(p.correspondance || p.reponse || p.answer) };
        });
        break;
      case 'ordering':
        q.items = liste(src.elements_dans_l_ordre || src.elements || src.etapes).map(function (t) { return { text: texte(t) }; });
        break;
      case 'gapselect': {
        const trous = liste(src.trous);
        q.options = [];
        trous.forEach(function (t, i) { q.options.push({ text: texte(t && t.bonne_reponse), group: i + 1 }); });
        trous.forEach(function (t, i) {
          liste(t && t.distracteurs).forEach(function (d) { q.options.push({ text: texte(d), group: i + 1 }); });
        });
        break;
      }
      case 'cloze':
        q.defaultgrade = Math.max(1, (String(src.enonce || '').match(SOUS_QUESTION_CLOZE) || []).length);
        break;
      case 'ddimageortext': {
        const etiquettes = liste(src.etiquettes).map(texte);
        q.drags = etiquettes.map(function (t, i) { return { no: i + 1, text: t, group: 1, infinite: false }; });
        // Zones provisoires en grille : l'enseignant les place sur son image à l'aperçu.
        q.drops = etiquettes.map(function (_, i) {
          return { no: i + 1, choice: i + 1, xleft: 20 + (i % 3) * 200, ytop: 20 + Math.floor(i / 3) * 90 };
        });
        q.bgImage = '';
        q._descriptionImage = texte(src.description_image);
        break;
      }
      default:
        break;
    }
    return q;
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
    if (drapeaux.tags) notes.push('Des tags ont été mis en minuscules.');
    if (drapeaux.nombres) notes.push('Des réponses numériques écrites en texte (ex. « 12,5 ») ont été converties en nombres.');
    return {
      ok: true,
      donnees: { titre: texte(d.titre) || ctx.sujet || 'Banque de questions', questions: questions },
      notes: notes
    };
  }

  // ----------------------------------------------------------------------
  // Vérification des règles
  // ----------------------------------------------------------------------
  /**
   * @param {object} d Données normalisées.
   * @param {object} ctx Renseignements de l'étape 1.
   * @param {{export?: boolean}} [options] À l'exportation, une image manquante devient une erreur.
   */
  function valider(d, ctx, options) {
    options = options || {};
    const erreurs = [];
    const avertissements = [];
    const qs = d.questions || [];
    const types = ctx.types && ctx.types.length ? ctx.types : TOUS_LES_TYPES;

    if (!qs.length) erreurs.push({ lieu: 'Ensemble', msg: 'aucune question n\'a été produite.' });
    if (ctx.nbQuestions && qs.length && qs.length !== Math.max(ctx.nbQuestions, types.length)) {
      avertissements.push({ lieu: 'Ensemble', msg: qs.length + ' question(s) reçue(s) au lieu des ' + Math.max(ctx.nbQuestions, types.length) + ' demandées.' });
    }
    types.forEach(function (t) {
      if (qs.length && !qs.some(function (q) { return q.type === t; })) {
        avertissements.push({ lieu: 'Ensemble', msg: 'aucune question de type « ' + LIBELLES[t] + ' » alors que ce type a été demandé.' });
      }
    });

    const titresVus = {};
    qs.forEach(function (q, i) {
      const lieu = 'Question ' + (i + 1) + (q.name ? ' (« ' + q.name + ' »)' : '');
      const E = function (m) { erreurs.push({ lieu: lieu, msg: m }); };
      const A = function (m) { avertissements.push({ lieu: lieu, msg: m }); };

      if (!LIBELLES[q.type]) { E('le type « ' + q.type + ' » n\'est pas reconnu. Types permis : ' + TOUS_LES_TYPES.join(', ') + '.'); return; }
      if (types.indexOf(q.type) < 0) A('le type « ' + LIBELLES[q.type] + ' » n\'a pas été demandé.');

      if (!q.name) E('le titre est vide.');
      else {
        if (PREFIXE_NUMERO.test(q.name)) E('le titre ne doit pas commencer par un numéro (« Q1 », « 1. »...).');
        const cle = q.name.toLowerCase();
        if (titresVus[cle]) A('une autre question porte déjà ce titre.');
        titresVus[cle] = true;
      }
      if (!q.tag) E('le tag est vide (un seul mot qui nomme le concept).');
      else if (/\s/.test(q.tag)) E('le tag « ' + q.tag + ' » doit être un seul mot, sans espace.');
      if (!enTexte(q.questionText)) E('l\'énoncé est vide.');
      if (!enTexte(q.generalFeedback)) E('l\'explication (rétroaction générale) est vide.');

      const textes = [q.name, enTexte(q.questionText), enTexte(q.generalFeedback)];

      switch (q.type) {
        case 'multichoice': {
          const o = q.options || [];
          if (o.length < 3 || o.length > 5) E('il faut 4 choix de réponse (' + o.length + ' reçu(s)).');
          const bons = o.filter(function (x) { return x.fraction > 0; }).length;
          if (bons !== 1) E('il faut exactement un choix correct (' + bons + ' reçu(s)).');
          o.forEach(function (x, k) {
            if (!x.text) E('le choix ' + (k + 1) + ' est vide.');
            if (!x.feedback) A('le choix ' + (k + 1) + ' n\'a pas de rétroaction.');
            textes.push(x.text, x.feedback);
          });
          if (new Set(o.map(function (x) { return x.text.toLowerCase(); })).size < o.length) E('deux choix sont identiques.');
          const bonne = o.filter(function (x) { return x.fraction > 0; })[0];
          const autres = o.filter(function (x) { return x.fraction <= 0; }).map(function (x) { return x.text.length; });
          if (bonne && autres.length && bonne.text.length > 1.4 * Math.max.apply(null, autres)) {
            A('la bonne réponse est nettement plus longue que les autres choix ; un élève peut la deviner.');
          }
          break;
        }
        case 'truefalse':
          if (q.correctAnswer !== true && q.correctAnswer !== false) E('la réponse (« reponse ») doit valoir true ou false.');
          if (!q.feedbackTrue || !q.feedbackFalse) A('il manque une rétroaction pour la réponse Vrai ou Faux.');
          textes.push(q.feedbackTrue, q.feedbackFalse);
          break;
        case 'shortanswer': {
          const a = q.answers || [];
          if (!a.length || !a.some(function (x) { return x.text; })) E('aucune réponse acceptée.');
          a.forEach(function (x) {
            if (nbMots(x.text) > 3) A('la réponse acceptée « ' + x.text + ' » dépasse 3 mots ; l\'élève devra l\'écrire exactement.');
            if (/\*/.test(x.text)) A('la réponse « ' + x.text + ' » contient un astérisque, qui est un joker dans Moodle.');
            textes.push(x.text, x.feedback);
          });
          break;
        }
        case 'numerical': {
          const a = (q.answers || [])[0] || {};
          if (typeof a.value !== 'number' || !isFinite(a.value)) E('la réponse doit être un nombre (« ' + a.value + ' » reçu).');
          if (!q.units || !q.units.length) A('aucune unité n\'est indiquée.');
          if (!/\\d?frac/.test(q.generalFeedback)) {
            A('l\'explication ne présente pas la formule de départ en fraction.');
          }
          textes.push(a.feedback);
          break;
        }
        case 'matching': {
          const p = q.pairs || [];
          if (p.length < 3) E('il faut au moins 3 paires (' + p.length + ' reçue(s)).');
          p.forEach(function (x, k) {
            if (!x.question || !x.answer) E('la paire ' + (k + 1) + ' est incomplète.');
            textes.push(x.question, x.answer);
          });
          if (new Set(p.map(function (x) { return x.answer.toLowerCase(); })).size < p.length) E('deux correspondances sont identiques : l\'association serait ambiguë.');
          break;
        }
        case 'ordering': {
          const it = q.items || [];
          if (it.length < 3) E('il faut au moins 3 éléments à ordonner (' + it.length + ' reçu(s)).');
          if (it.some(function (x) { return !x.text; })) E('un élément à ordonner est vide.');
          if (new Set(it.map(function (x) { return x.text.toLowerCase(); })).size < it.length) E('deux éléments à ordonner sont identiques.');
          it.forEach(function (x) { textes.push(x.text); });
          break;
        }
        case 'gapselect': {
          // Règle Moodle : le marqueur [[k]] a pour bonne réponse la k-ième option ;
          // son menu offre toutes les options du même groupe.
          const o = q.options || [];
          const marqueurs = (q.questionText.match(/\[\[(\d+)\]\]/g) || []).map(function (m) { return parseInt(m.slice(2), 10); });
          const parGroupe = {};
          o.forEach(function (x) { parGroupe[x.group] = (parGroupe[x.group] || 0) + 1; textes.push(x.text); });
          const groupesUtilises = {};
          if (!marqueurs.length) E('l\'énoncé ne contient aucun marqueur [[1]], [[2]]...');
          marqueurs.forEach(function (m) {
            const bonne = o[m - 1];
            if (!bonne) { E('le marqueur [[' + m + ']] n\'a pas de réponse dans « trous ».'); return; }
            groupesUtilises[bonne.group] = true;
            if (parGroupe[bonne.group] < 2) E('le trou [[' + m + ']] n\'a pas de distracteur.');
          });
          Object.keys(parGroupe).forEach(function (g) {
            if (marqueurs.length && !groupesUtilises[g]) E('le trou ' + g + ' n\'a pas de marqueur [[' + g + ']] dans l\'énoncé.');
          });
          if ((q.options || []).some(function (o) { return !o.text; })) E('une réponse ou un distracteur est vide.');
          break;
        }
        case 'cloze': {
          const sq = q.questionText.match(SOUS_QUESTION_CLOZE) || [];
          if (!sq.length) E('l\'énoncé ne contient aucune sous-question en syntaxe Moodle ({1:SHORTANSWER:=...}).');
          sq.forEach(function (s) {
            const m = s.match(/^\{(\d*):([A-Z_]+):([^{}]*)\}$/);
            if (!TYPES_CLOZE.test(m[2])) E('la sous-question « ' + s + ' » utilise un type inconnu (' + m[2] + ').');
            else if (!/(^|~)\s*(=|%100%)/.test(m[3])) E('la sous-question « ' + s + ' » n\'a aucune réponse correcte (précédée de « = »).');
          });
          const reste = q.questionText.replace(SOUS_QUESTION_CLOZE, '');
          if (/[{}]/.test(reste.replace(/\\\(.*?\\\)|\\\[.*?\\\]/g, ''))) E('l\'énoncé contient une accolade hors d\'une sous-question : la syntaxe est probablement mal fermée.');
          break;
        }
        case 'ddimageortext': {
          const dr = q.drags || [];
          if (dr.length < 2) E('il faut au moins 2 étiquettes (' + dr.length + ' reçue(s)).');
          dr.forEach(function (x) {
            if (!x.text) E('une étiquette est vide.');
            else if (nbMots(x.text) > 2 || /[()]/.test(x.text)) E('l\'étiquette « ' + x.text + ' » doit compter 1 ou 2 mots, sans parenthèse.');
            textes.push(x.text);
          });
          if (!q.bgImage) {
            (options.export ? E : A)('l\'image n\'est pas encore fournie. Ajoutez-la à l\'étape de l\'aperçu (mode d\'édition, « Parcourir… »).');
          } else if (/^data:image\/svg/.test(q.bgImage)) {
            E('l\'image est en SVG ; Moodle exige ici une image PNG ou JPEG.');
          }
          break;
        }
        default:
          break;
      }

      const tout = textes.join(' ');
      MOTS_INTERDITS.forEach(function (m) {
        if (m.re.test(tout)) E('le texte destiné à l\'élève contient ' + m.texte + '.');
      });
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
  // XML Moodle
  // ----------------------------------------------------------------------
  /** Copie sans les champs internes (mélanges du simulateur, aides de l'assistant). */
  function questionsPropres(qs) {
    return JSON.parse(JSON.stringify(qs || [])).map(function (q) {
      Object.keys(q).forEach(function (k) { if (/^_shuffled/.test(k)) delete q[k]; });
      return q;
    });
  }

  function categorie(titre) {
    return '$course$/top/' + (String(titre || 'Banque de questions').replace(/\//g, '-').trim() || 'Banque de questions');
  }

  function versXml(d) {
    if (!window.MoodleParser) throw new Error('le module XML de moteur-ui n\'est pas chargé');
    return window.MoodleParser.serializeXml(questionsPropres(d.questions).map(function (q) {
      delete q._categoryXml; // La catégorie suit le titre de la banque
      return q;
    }), categorie(d.titre));
  }

  /** Lecture d'un questions_moodle.xml (reprise ou livrable de l'outil actuel). */
  function depuisXml(xml) {
    if (!window.MoodleParser) throw new Error('le module XML de moteur-ui n\'est pas chargé');
    const questions = window.MoodleParser.parseXml(xml);
    if (!questions.length) throw new Error('le fichier ne contient aucune question');
    const cat = (String(xml).match(/<question type="category">[\s\S]*?<text>([^<]*)<\/text>/) || [])[1] || '';
    const dernier = cat.split('/').filter(Boolean).pop() || '';
    const titre = /^\$|^top$/.test(dernier) ? '' : dernier.replace(/_/g, ' ');
    const types = [];
    questions.forEach(function (q) {
      delete q._categoryXml;
      if (q.type === 'multianswer') q.type = 'cloze';
      if (TOUS_LES_TYPES.indexOf(q.type) >= 0 && types.indexOf(q.type) < 0) types.push(q.type);
    });
    return {
      contexte: { sujet: titre, nbQuestions: questions.length, types: TOUS_LES_TYPES.filter(function (t) { return types.indexOf(t) >= 0; }) },
      donnees: { titre: titre || 'Banque de questions', questions: questions }
    };
  }

  // ----------------------------------------------------------------------
  // Taille des images : au-delà de 600 px de côté, la question déborde de la page
  // du test Moodle. Même limite que moteur-ui (MoodleDDImage.TAILLE_MAX).
  // ----------------------------------------------------------------------
  const TAILLE_MAX_IMAGE = 600;

  function chargerImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Images trop grandes : [{ index, nom, largeur, hauteur, nouvelleLargeur, nouvelleHauteur }]. */
  function imagesTropGrandes(d) {
    const qs = (d && d.questions) || [];
    return Promise.all(qs.map(function (q, i) {
      if (q.type !== 'ddimageortext' || !q.bgImage) return null;
      return chargerImage(q.bgImage).then(function (img) {
        const s = Math.min(1, TAILLE_MAX_IMAGE / img.naturalWidth, TAILLE_MAX_IMAGE / img.naturalHeight);
        if (s >= 1) return null;
        return {
          index: i, nom: q.name, largeur: img.naturalWidth, hauteur: img.naturalHeight,
          nouvelleLargeur: Math.round(img.naturalWidth * s), nouvelleHauteur: Math.round(img.naturalHeight * s)
        };
      }, function () { return null; });
    })).then(function (l) { return l.filter(Boolean); });
  }

  /** Réduit les images trop grandes (format conservé) ; les zones suivent. Renvoie le nombre d'images réduites. */
  function limiterImages(d) {
    return imagesTropGrandes(d).then(function (liste) {
      return Promise.all(liste.map(function (t) {
        const q = d.questions[t.index];
        return chargerImage(q.bgImage).then(function (img) {
          const c = document.createElement('canvas');
          c.width = t.nouvelleLargeur;
          c.height = t.nouvelleHauteur;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          const jpeg = /^data:image\/jpeg;/.test(q.bgImage);
          if (jpeg) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          q.bgImage = jpeg ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
          (q.drops || []).forEach(function (dr) {
            dr.xleft = Math.round(dr.xleft * t.nouvelleLargeur / t.largeur);
            dr.ytop = Math.round(dr.ytop * t.nouvelleHauteur / t.hauteur);
          });
        });
      })).then(function () { return liste.length; });
    });
  }

  /** Demande d'image à donner à Gemini ou Copilot pour une question glisser-déposer. */
  function demandeImage(q, niveau) {
    return [
      'Crée une illustration scientifique pour une question de sciences au secondaire, au Québec' + (niveau ? ' (' + niveau + ')' : '') + '.',
      '',
      'Sujet : ' + (q.name || ''),
      q._descriptionImage ? 'Description : ' + q._descriptionImage : '',
      'Structures à montrer, chacune avec un repère vide (petit rectangle blanc relié par un trait fin) : ' + (q.drags || []).map(function (x) { return x.text; }).join(', ') + '.',
      '',
      'Contraintes :',
      '- Image PNG ou JPEG, format paysage de 600 × 400 pixels, fond blanc.',
      '- Style clair et rigoureux de manuel scolaire.',
      '- AUCUN texte, mot, lettre, chiffre ou légende dans l\'image : les étiquettes seront ajoutées par Moodle.'
    ].filter(function (l, i, t) { return l !== '' || t[i - 1] !== ''; }).join('\n');
  }

  window.MoodleAIMoodle = {
    TYPES: TYPES,
    LIBELLES: LIBELLES,
    TOUS_LES_TYPES: TOUS_LES_TYPES,
    repartition: repartition,
    construireConsigne: construireConsigne,
    normaliser: normaliser,
    valider: valider,
    consigneCorrection: consigneCorrection,
    versXml: versXml,
    depuisXml: depuisXml,
    questionsPropres: questionsPropres,
    demandeImage: demandeImage,
    TAILLE_MAX_IMAGE: TAILLE_MAX_IMAGE,
    imagesTropGrandes: imagesTropGrandes,
    limiterImages: limiterImages,
    enTexte: enTexte
  };
})();
