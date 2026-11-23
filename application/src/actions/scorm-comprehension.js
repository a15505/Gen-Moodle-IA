/**
 * Action « Exercice de compréhension SCORM » — consigne pour l'IA, lecture, vérification et
 * conversion vers le format questions_data.js du moteur SCORM de moteur-ui
 * (moteur-ui/simulateurs/scorm/scorm_runtime.js, mode « comprehension »).
 *
 * Pour chaque notion clé du texte : un extrait (citation et sa source), une question
 * « Pourquoi… ? » à choix « Parce que… », une rétroaction par choix, une explication
 * didactique et une deuxième chance (question guidée) en cas d'erreur.
 *
 * L'IA renvoie un JSON compact :
 * { titre, accueil, intentions: [...], questions: [ { titre, points, source, citation,
 *   question, choix: [...], solution, explication, deuxieme_chance: { question, choix } } ] }
 *
 * L'aperçu, le package SCORM et questions_data.js sont ceux de l'action « Corrigé interactif »
 * (scorm-corrige.js), qui lisent le mode dans les données (d.mode = 'comprehension').
 */
(function () {
  'use strict';

  const C = window.MoodleAIScormCorrige;
  if (!C) return;
  const U = C.outils;
  const texte = U.texte;
  const liste = U.liste;

  const MODE = 'comprehension';
  const POINTS_PAR_DEFAUT = 2;
  const SUFFIXE_TITRE = ' — Exercice de compréhension';
  const SUFFIXES_TITRE = /\s*[—–-]\s*(?:exercice de compréhension(?: de lecture)?|compréhension(?: de lecture)?)\s*$/i;
  const LONGUEUR_CITATION_MAX = 600;

  /** Titre complet de l'activité : « Sujet — Exercice de compréhension ». */
  function titreComplet(t) {
    let s = texte(t);
    while (SUFFIXES_TITRE.test(s)) s = s.replace(SUFFIXES_TITRE, '').trim();
    if (!s || /^exercice de compréhension$/i.test(s)) return 'Exercice de compréhension';
    return s + SUFFIXE_TITRE;
  }

  /** Les guillemets qui entourent une citation sont retirés : le moteur ajoute les siens. */
  function sansGuillemets(s) {
    return texte(s).replace(/^[«"“”'\s\u00a0]+|[»"“”'\s\u00a0]+$/g, '').trim();
  }

  /** Texte comparable : minuscules, sans accents ni ponctuation, espaces réduites. */
  function comparable(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '\'').replace(/[^a-z0-9']+/g, ' ').trim();
  }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  const MODELE_JSON = [
    '{',
    '  "titre": "Sujet du texte, en casse de phrase",',
    '  "accueil": "Une ou deux phrases adressées à l\'élève (tutoiement) qui présentent l\'exercice.",',
    '  "intentions": ["J\'explique ...", "Je distingue ...", "Je relie ..."],',
    '  "questions": [',
    '    {',
    '      "titre": "Concept évalué, sans numéro",',
    '      "points": 2,',
    '      "source": "Section 1 — Nom de la section du texte",',
    '      "citation": "Extrait copié mot pour mot du texte, une à trois phrases.",',
    '      "question": "Pourquoi ... ?",',
    '      "choix": [',
    '        { "texte": "Parce que ...", "correct": true, "retroaction": "Pourquoi ce choix est juste." },',
    '        { "texte": "Parce que ...", "correct": false, "retroaction": "Pourquoi ce choix est faux : la conception erronée en jeu." },',
    '        { "texte": "Parce que ...", "correct": false, "retroaction": "..." },',
    '        { "texte": "Parce que ...", "correct": false, "retroaction": "..." }',
    '      ],',
    '      "solution": "La réponse attendue, en une phrase.",',
    '      "explication": "Règle scientifique : explication didactique de la notion, en deux à quatre phrases.",',
    '      "deuxieme_chance": {',
    '        "question": "Question guidée, plus simple, sur le même concept.",',
    '        "choix": [',
    '          { "texte": "...", "correct": true, "retroaction": "..." },',
    '          { "texte": "...", "correct": false, "retroaction": "..." },',
    '          { "texte": "...", "correct": false, "retroaction": "..." }',
    '        ]',
    '      }',
    '    }',
    '  ]',
    '}'
  ];

  function construireConsigne(ctx) {
    const texteSource = texte(ctx.texteSource);
    const nb = Math.max(2, Math.min(15, Number(ctx.nb) || 6));
    const source = texteSource
      ? 'Le texte est fourni à la fin de cette consigne, sous « TEXTE ». Appuie-toi uniquement sur ce texte.'
      : 'Le texte (lecture, notes de cours ou chapitre) est joint à ce message. Appuie-toi uniquement sur ce document. S\'il n\'y a aucun document joint, ou si tu ne peux pas le lire, dis-le clairement et ne produis aucun JSON : n\'invente jamais le contenu.';
    const lignes = [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu transformes un texte didactique en exercice de compréhension interactif : pour chaque notion clé, l\'élève lit un court extrait du texte, répond à une question sur son sens, reçoit une rétroaction immédiate et, en cas d\'erreur, une explication et une question guidée qui lui permet de récupérer une partie des points.',
      '',
      'EXERCICE DE COMPRÉHENSION',
      '- Sujet : ' + (ctx.sujet || 'déduis-le du texte, en quelques mots'),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '- Nombre de questions : ' + nb,
      '',
      source
    ];
    if (texte(ctx.precisions)) lignes.push('', 'PRÉCISIONS DE L\'ENSEIGNANT', texte(ctx.precisions));
    lignes.push(
      '',
      'RÈGLES',
      '1. Exactement ' + nb + ' questions, une par notion clé, dans l\'ordre du texte, réparties sur l\'ensemble du texte.',
      '2. "citation" : un extrait copié mot pour mot du texte (une à trois phrases), sans guillemets autour. "source" : la section ou la page d\'où vient l\'extrait (ex. : « Section 2 — Le tube digestif et ses conduits »).',
      '3. "titre" : le concept évalué, en casse de phrase (ex. : « Surface de contact et digestion mécanique »). Jamais de numéro ni de préfixe comme « Q1 », « 1. » ou « Question 1 ».',
      '4. "question" : elle commence par « Pourquoi » et se termine par un point d\'interrogation. Elle porte sur le sens scientifique de l\'extrait (cause, rôle, conséquence, distinction entre deux notions), jamais sur un simple repérage de mots : la bonne réponse ne recopie pas la citation.',
      '5. "choix" : 4 choix, un seul correct, de longueur semblable. Chacun commence par « Parce que » et exprime le raisonnement d\'un élève qui verbalise sa pensée, sans calcul ni équation. Les distracteurs reprennent de vraies conceptions erronées fréquentes chez les élèves de ce niveau (confusion entre deux notions voisines, cause et effet inversés, croyance naïve). Leur ordre sera mélangé pour l\'élève.',
      '6. "retroaction" : chaque choix a la sienne. Pour le bon choix, elle confirme et précise la notion ; pour un distracteur, elle nomme la conception erronée et la corrige, sans répéter le texte du choix.',
      '7. "points" : ' + POINTS_PAR_DEFAUT + ' points par question, sauf indication contraire de l\'enseignant. La deuxième chance rapporte la moitié des points.',
      '8. "solution" : la réponse attendue, en une phrase. "explication" : l\'explication didactique, en deux à quatre phrases, qui commence par « Règle scientifique : » ou « Distinction conceptuelle : ». Elle s\'affiche quand l\'élève se trompe.',
      '9. "deuxieme_chance" : chaque question en a une. C\'est une question complémentaire, plus simple, sur le même concept, pour aider l\'élève à comprendre son erreur : 3 choix, un seul correct, chacun avec sa "retroaction".',
      '10. Si l\'extrait s\'appuie sur un schéma, un tableau ou une figure du texte, ajoute "figure" : une courte description de cette image (l\'enseignant l\'ajoutera lui-même). Sinon, n\'ajoute pas ce champ.',
      '11. Texte simple, sans HTML. Évite les formules ; un symbole indispensable s\'écrit en LaTeX entre \\( et \\), par exemple \\( CO_2 \\).',
      '12. Français standard du Québec, tutoiement de l\'élève. N\'écris jamais les mots « PFEQ » ni « défi », ni les compétences CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Dans le JSON, chaque barre oblique inverse du LaTeX est doublée (\\\\). Respecte exactement cette structure (les « ... » sont à remplacer ; le modèle montre une question, il en faut ' + nb + ') :',
      ''
    );
    const modele = MODELE_JSON.slice();
    if (ctx.sujet) modele[1] = '  "titre": "' + ctx.sujet.replace(/["\\]/g, '') + '",';
    Array.prototype.push.apply(lignes, modele);
    if (texteSource) lignes.push('', 'TEXTE', texteSource);
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation : JSON de l'IA → questions_data.js du moteur (mode compréhension)
  // ----------------------------------------------------------------------
  function versRemediation(r, points) {
    if (!r || typeof r !== 'object') return null;
    const question = texte(r.question || r.enonce || r.énoncé);
    const choices = liste(r.choix || r.choices).map(U.versChoix);
    if (!question && !choices.length) return null;
    const bonne = choices.find(function (c) { return c.correct; });
    return {
      question: question,
      choices: choices,
      solution: texte(r.solution) || (bonne ? bonne.text : ''),
      points: points / 2
    };
  }

  function versQuestion(src, n, notes) {
    src = src || {};
    let titre = texte(src.titre || src.nom);
    if (U.PREFIXE_NUMERO.test(titre)) {
      titre = titre.replace(U.PREFIXE_NUMERO, '').trim();
      notes.numeros = true;
    }
    const brute = texte(src.citation || src.extrait);
    const citation = sansGuillemets(brute);
    if (citation !== brute) notes.guillemets = true;
    const points = U.entierPositif(src.points) || POINTS_PAR_DEFAUT;
    const q = {
      id: 'c' + n,
      titre: titre,
      points: points,
      citation: citation,
      citationRef: texte(src.source || src.reference || src.référence || src.section || src.citationRef),
      question: texte(src.question || src.enonce || src.énoncé),
      choices: liste(src.choix || src.choices || src.options).map(U.versChoix),
      solution: texte(src.solution),
      explication: texte(src.explication)
    };
    if (texte(src.figure || src.description_image)) q.figure = texte(src.figure || src.description_image);
    const rem = versRemediation(src.deuxieme_chance || src.deuxième_chance || src.remediation, points);
    if (rem) q.remediation = rem;
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
    if (drapeaux.guillemets) notes.push('Les guillemets autour des citations ont été retirés : l\'activité ajoute les siens.');
    return {
      ok: true,
      donnees: {
        mode: MODE,
        titre: titreComplet(d.titre || ctx.sujet),
        accueil: texte(d.accueil || d.introduction),
        intentions: liste(d.intentions || d.objectifs).map(texte).filter(Boolean),
        questions: questions
      },
      notes: notes
    };
  }

  // ----------------------------------------------------------------------
  // Vérification des règles
  // ----------------------------------------------------------------------
  function textesEleve(q) {
    const t = [q.titre, q.citation, q.citationRef, q.question, q.solution, q.explication];
    liste(q.choices).forEach(function (c) { t.push(c.text, c.feedback); });
    if (q.remediation) { t.push(q.remediation.question); liste(q.remediation.choices).forEach(function (c) { t.push(c.text, c.feedback); }); }
    return t.filter(Boolean).join('\n');
  }

  /**
   * @param {object} d Données normalisées.
   * @param {object} [ctx] Renseignements de l'étape 1 (nombre de questions, texte collé).
   * @returns {{erreurs: Array<{lieu, msg}>, avertissements: Array<{lieu, msg}>}}
   */
  function valider(d, ctx) {
    ctx = ctx || {};
    const erreurs = [];
    const avertissements = [];
    if (!d.questions.length) erreurs.push({ lieu: 'Réponse', msg: 'aucune question.' });
    const attendu = Number(ctx.nb) || 0;
    if (attendu && d.questions.length && d.questions.length !== attendu) {
      avertissements.push({ lieu: 'Réponse', msg: d.questions.length + ' questions reçues pour ' + attendu + ' demandées.' });
    }
    U.MOTS_INTERDITS.forEach(function (m) {
      if (m.re.test(d.titre + '\n' + d.accueil + '\n' + d.intentions.join('\n'))) erreurs.push({ lieu: 'Titre, accueil ou intentions', msg: 'contient ' + m.texte + '.' });
    });
    if (!d.intentions.length) avertissements.push({ lieu: 'Accueil', msg: 'aucune intention d\'apprentissage ("intentions") : l\'écran d\'accueil présentera le déroulement général.' });

    const texteSource = ctx.source === 'colle' ? comparable(ctx.texteSource) : '';
    const titres = {};
    d.questions.forEach(function (q, i) {
      const lieu = 'Question ' + (i + 1) + (q.titre ? ' (' + q.titre + ')' : '');
      if (!q.titre) erreurs.push({ lieu: lieu, msg: 'le titre est vide.' });
      else if (titres[q.titre.toLowerCase()]) avertissements.push({ lieu: lieu, msg: 'même titre qu\'une autre question.' });
      titres[(q.titre || '').toLowerCase()] = true;

      if (!q.citation) erreurs.push({ lieu: lieu, msg: 'la citation du texte ("citation") est vide.' });
      else {
        if (q.citation.length > LONGUEUR_CITATION_MAX) avertissements.push({ lieu: lieu, msg: 'la citation est longue (' + q.citation.length + ' caractères) : une à trois phrases suffisent.' });
        if (texteSource && texteSource.indexOf(comparable(q.citation)) < 0) {
          avertissements.push({ lieu: lieu, msg: 'la citation ne se retrouve pas mot pour mot dans le texte collé à l\'étape 1 : vérifiez qu\'elle n\'a pas été reformulée.' });
        }
      }
      if (!q.citationRef) avertissements.push({ lieu: lieu, msg: 'aucune source ("source") : la section d\'où vient l\'extrait ne sera pas indiquée.' });

      if (!q.question) erreurs.push({ lieu: lieu, msg: 'la question est vide.' });
      else {
        if (!/^pourquoi\b/i.test(q.question)) avertissements.push({ lieu: lieu, msg: 'la question ne commence pas par « Pourquoi ».' });
        if (!/\?\s*$/.test(q.question)) avertissements.push({ lieu: lieu, msg: 'la question ne se termine pas par un point d\'interrogation.' });
      }

      U.verifierChoix(q.choices, lieu, erreurs, avertissements);
      if (q.choices.length === 2) avertissements.push({ lieu: lieu, msg: '2 choix seulement : il en faut 4.' });
      if (q.choices.length > 5) avertissements.push({ lieu: lieu, msg: q.choices.length + ' choix : 4 suffisent.' });
      if (q.choices.some(function (c) { return c.text && !/^parce\s+qu/i.test(c.text); })) {
        avertissements.push({ lieu: lieu, msg: 'un choix ne commence pas par « Parce que ».' });
      }
      const bonne = q.choices.filter(function (c) { return c.correct; })[0];
      if (bonne && q.citation && comparable(bonne.text).indexOf(comparable(q.citation)) >= 0) {
        avertissements.push({ lieu: lieu, msg: 'la bonne réponse recopie la citation : la question vérifie alors le repérage, pas la compréhension.' });
      }

      if (!q.solution) erreurs.push({ lieu: lieu, msg: 'la solution attendue ("solution") est manquante.' });
      if (!q.explication) avertissements.push({ lieu: lieu, msg: 'aucune explication didactique ("explication") : l\'élève qui se trompe n\'aura que la rétroaction de son choix.' });
      U.MOTS_INTERDITS.forEach(function (m) { if (m.re.test(textesEleve(q))) erreurs.push({ lieu: lieu, msg: 'contient ' + m.texte + '.' }); });

      if (q.remediation) {
        if (!q.remediation.question) erreurs.push({ lieu: lieu + ', deuxième chance', msg: 'la question guidée ("question") est vide.' });
        U.verifierChoix(q.remediation.choices, lieu + ', deuxième chance', erreurs, avertissements);
      } else {
        avertissements.push({ lieu: lieu, msg: 'aucune deuxième chance ("deuxieme_chance") : l\'élève qui se trompe n\'aura pas de question guidée.' });
      }
    });
    return { erreurs: erreurs, avertissements: avertissements };
  }

  // ----------------------------------------------------------------------
  // Format compact (texte de l'étape 2) et retouche d'une question par l'IA
  // ----------------------------------------------------------------------
  /** Question normalisée → JSON compact de la consigne (ce que l'IA a produit). Sans l'image. */
  function versCompact(q) {
    const c = {
      titre: q.titre,
      points: q.points,
      source: q.citationRef || '',
      citation: q.citation,
      question: q.question
    };
    if (q.figure) c.figure = q.figure;
    c.choix = U.choixCompacts(q.choices);
    c.solution = q.solution;
    c.explication = q.explication;
    if (q.remediation) c.deuxieme_chance = { question: q.remediation.question, choix: U.choixCompacts(q.remediation.choices) };
    return c;
  }

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
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Voici une question d\'un exercice de compréhension de lecture destiné à des élèves (' + (ctx.niveau || 'secondaire') + '), au format JSON.',
      '',
      'RETOUCHE DEMANDÉE PAR L\'ENSEIGNANT',
      texte(demande),
      '',
      'RÈGLES À RESPECTER',
      '- Applique seulement la retouche demandée. Garde tel quel tout le reste.',
      '- "citation" : un extrait copié mot pour mot du texte, sans guillemets autour ; "source" : la section d\'où il vient.',
      '- "titre" : le concept évalué, en casse de phrase, sans numéro ni préfixe.',
      '- "question" : commence par « Pourquoi », se termine par un point d\'interrogation et porte sur le sens de l\'extrait.',
      '- "choix" : 4 choix, un seul correct, chacun commence par « Parce que » et exprime la pensée de l\'élève ; les distracteurs reprennent de vraies conceptions erronées. Chaque choix a sa "retroaction".',
      '- "deuxieme_chance" : question guidée plus simple sur le même concept, 3 choix, un seul correct, chacun avec sa rétroaction.',
      '- Texte simple, sans HTML. Français standard du Québec. N\'écris jamais « PFEQ », « défi », CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON contenant cette seule question retouchée (un objet, pas une liste), avec la même structure et des guillemets droits.',
      '',
      'QUESTION ACTUELLE',
      JSON.stringify(versCompact(q), null, 2)
    ].join('\n');
  }

  /**
   * Lit la question retouchée (objet, liste d'un objet ou { questions: [...] }) et la vérifie.
   * L'identifiant, l'image et sa description sont repris de la question d'origine.
   */
  function appliquerRetouche(valeur, ancienne, rang) {
    let src = valeur;
    if (src && !Array.isArray(src) && Array.isArray(src.questions)) src = src.questions;
    if (Array.isArray(src)) {
      if (src.length !== 1) return { ok: false, erreur: 'La réponse contient ' + src.length + ' questions : il en faut une seule, la question retouchée.' };
      src = src[0];
    }
    if (!src || typeof src !== 'object' || !(src.titre || src.question || src.citation)) {
      return { ok: false, erreur: 'La réponse ne contient pas de question (champs "titre", "citation", "question"...).' };
    }
    const drapeaux = {};
    const q = versQuestion(src, rang, drapeaux);
    q.id = ancienne.id || q.id;
    if (ancienne.image) { q.image = ancienne.image; q.imageAlt = ancienne.imageAlt; }
    if (ancienne.imageCaption) q.imageCaption = ancienne.imageCaption;
    const notes = [];
    if (drapeaux.numeros) notes.push('Le numéro placé devant le titre a été retiré.');
    if (drapeaux.guillemets) notes.push('Les guillemets autour de la citation ont été retirés.');
    const verif = valider({ titre: '', accueil: '', intentions: ['-'], questions: [q] });
    const lieu = function (e) { return { lieu: e.lieu.replace(/^Question 1\b/, 'Question ' + rang), msg: e.msg }; };
    return { ok: true, question: q, erreurs: verif.erreurs.map(lieu), avertissements: verif.avertissements.map(lieu), notes: notes };
  }

  /** Demande d'image pour le schéma d'une question, à donner à l'IA (image sans texte). */
  function demandeImage(q, niveau) {
    return [
      'Crée une image pour un exercice de compréhension en sciences au secondaire' + (niveau ? ' (' + niveau + ')' : '') + ', au Québec.',
      '',
      'Schéma demandé : ' + (q.figure || q.titre),
      'Notion illustrée : ' + q.titre,
      '',
      'Style : schéma didactique clair, traits nets, fond blanc, couleurs sobres. Format paysage, environ 1200 × 800 pixels.',
      'Les repères (lettres ou numéros) utiles peuvent figurer ; aucun autre texte.'
    ].join('\n');
  }

  // ----------------------------------------------------------------------
  // Reprise d'un questions_data.js de l'outil actuel (mode compréhension)
  // ----------------------------------------------------------------------
  function depuisQuestionsData(js) {
    const lu = U.lireQuestionsData(js);
    const config = lu.config;
    const questions = lu.questions;
    if (config.mode !== MODE) throw new Error('ce fichier n\'est pas un exercice de compréhension');
    if (config.presentation === 'deux-pages') throw new Error('ce fichier est une compréhension en deux pages (Hattie), que cet assistant ne sait pas modifier');
    questions.forEach(function (q, i) {
      if (!Array.isArray(q.choices)) throw new Error('la question « ' + (q.titre || i + 1) + ' » n\'a pas de choix de réponse');
      if (q.explication && typeof q.explication === 'object') throw new Error('la question « ' + (q.titre || i + 1) + ' » a une explication en trois temps (Hattie), que cet assistant ne sait pas modifier');
      q.id = q.id || ('c' + (i + 1));
      delete q.defi;
      q.points = U.entierPositif(q.points) || POINTS_PAR_DEFAUT;
      q.question = texte(q.question);
      // Images du dossier de l'activité : elles ne sont pas dans ce fichier.
      if (q.image && !/^data:/.test(q.image)) { q.figure = q.imageCaption || q.titre; delete q.image; }
    });
    return {
      contexte: { sujet: texte(config.titre).replace(SUFFIXES_TITRE, ''), nb: questions.length },
      donnees: {
        mode: MODE,
        titre: titreComplet(config.titre),
        accueil: texte(config.welcomeIntro),
        intentions: liste(config.intentions).map(texte).filter(Boolean),
        questions: questions
      }
    };
  }

  window.MoodleAIScormComprehension = {
    MODE: MODE,
    construireConsigne: construireConsigne,
    normaliser: normaliser,
    valider: valider,
    consigneCorrection: C.consigneCorrection,
    demandeImage: demandeImage,
    titreComplet: titreComplet,
    versCompact: versCompact,
    activiteCompacte: activiteCompacte,
    consigneRetouche: consigneRetouche,
    appliquerRetouche: appliquerRetouche,
    consigneCorrectionRetouche: C.consigneCorrectionRetouche,
    totalPoints: C.totalPoints,
    enTexte: C.enTexte,
    nomFichierZip: C.nomFichierZip,
    questionsDataJs: C.questionsDataJs,
    construireApercu: C.construireApercu,
    construirePackage: C.construirePackage,
    depuisQuestionsData: depuisQuestionsData
  };
})();
