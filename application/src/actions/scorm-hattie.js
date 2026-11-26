/**
 * Action « Compréhension en deux pages (Hattie) » — consigne pour l'IA, lecture, vérification et
 * conversion vers le format questions_data.js du moteur SCORM de moteur-ui
 * (moteur-ui/simulateurs/scorm/scorm_runtime.js, mode « comprehension », présentation « deux-pages »).
 * Règles : .agents/skills/assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md.
 *
 * Une station = deux pages : une présentation illustrée (narrée ou écrite : savoir que, savoir
 * comment, savoir avec, à retenir, démarche en produit croisé au besoin), puis une question
 * « Pourquoi… ? » ou « Quel raisonnement… ? » à choix verbalisés (« Je me dis que… »). Chaque
 * distracteur porte son type d'erreur (analyse cognitive des tâches) ; une erreur affiche
 * l'explication en trois temps et une question guidée (deuxième chance, 1 point).
 *
 * L'IA renvoie un JSON compact :
 * { titre, accueil, intentions, criteres, stations: [ { titre, points, source, figure, legende_figure,
 *   narration + mots_cles | savoir_que + savoir_comment + savoir_avec + reflexe, a_retenir, demarche,
 *   question, choix: [{ texte, correct, erreur, retroaction }], solution,
 *   explication: { savoir_que, savoir_comment, savoir_avec }, demarche_explication, deuxieme_chance } ] }
 *
 * L'aperçu, le package SCORM et questions_data.js sont ceux de l'action « Corrigé interactif »
 * (scorm-corrige.js), qui lisent le mode et la présentation dans les données.
 */
(function () {
  'use strict';

  const C = window.MoodleAIScormCorrige;
  if (!C) return;
  const U = C.outils;
  const texte = U.texte;
  const liste = U.liste;

  const MODE = 'comprehension';
  const PRESENTATION = 'deux-pages';
  const POINTS_PAR_DEFAUT = 3;
  const POINTS_DEUXIEME_CHANCE = 1;
  const SUFFIXE_TITRE = ' — Exercice de compréhension';
  const SUFFIXES_TITRE = /\s*[—–-]\s*(?:exercice de compréhension(?: de lecture)?|compréhension(?: de lecture| en deux pages)?)\s*$/i;

  /** Types d'erreur de l'analyse cognitive des tâches (champ « erreur » des distracteurs). */
  const ERREURS = {
    conception: 'Conception erronée : modèle ou relation de fond incorrect',
    procedure: 'Erreur de procédure : étape omise, inversée ou mal ordonnée',
    strategie: 'Erreur de stratégie : bonne règle appliquée au mauvais moment, ou méthode inadaptée',
    transfert: 'Erreur de transfert : réussit la version connue, mais n\'adapte pas à une situation changée',
    execution: 'Erreur d\'exécution : compréhension présente, mais erreur ponctuelle'
  };

  /** Titre complet de l'activité : « Sujet — Exercice de compréhension ». */
  function titreComplet(t) {
    let s = texte(t);
    while (SUFFIXES_TITRE.test(s)) s = s.replace(SUFFIXES_TITRE, '').trim();
    if (!s || /^exercice de compréhension$/i.test(s)) return 'Exercice de compréhension';
    return s + SUFFIXE_TITRE;
  }

  function sansAccents(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** « Procédure », « Erreur de stratégie », « execution »... → clé du moteur, sinon ''. */
  function typeErreur(v) {
    const s = sansAccents(v).trim().replace(/^erreur\s+d(?:e\s+|['’]\s*)/, '');
    if (/^concep/.test(s)) return 'conception';
    if (/^proced/.test(s)) return 'procedure';
    if (/^strat/.test(s)) return 'strategie';
    if (/^transf/.test(s)) return 'transfert';
    if (/^exec/.test(s)) return 'execution';
    return '';
  }

  function nombreMots(paragraphes) {
    return liste(paragraphes).join(' ').split(/\s+/).filter(Boolean).length;
  }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  function modeleJson(narree, sujet) {
    const m = [
      '{',
      '  "titre": "' + (sujet ? sujet.replace(/["\\]/g, '') : 'Sujet du document, en casse de phrase') + '",',
      '  "accueil": "Une ou deux phrases sur ce que l\'élève va se représenter. Chacune des N stations commence par une page illustrée à ' + (narree ? 'écouter' : 'lire') + ', suivie d\'une question.",',
      '  "intentions": ["Je reconnais ...", "J\'explique ...", "J\'utilise ..."],',
      '  "criteres": ["Je nomme ... et je justifie mon choix.", "Je calcule ... en produit croisé.", "Je vérifie si mon résultat est vraisemblable."],',
      '  "stations": [',
      '    {',
      '      "titre": "Sujet conceptuel de la station, sans numéro",',
      '      "points": 3,',
      '      "source": "Section ou page du document",',
      '      "figure": "Description précise du schéma de la présentation : quantités dénombrables, valeurs, repères.",',
      '      "legende_figure": "Légende courte du schéma.",'
    ];
    if (narree) {
      m.push(
        '      "mots_cles": [ { "terme": "...", "definition": "définition courte." } ],',
        '      "narration": [',
        '        "En haut de l\'image, regarde ... (ouverture qui guide le regard)",',
        '        "Savoir que : l\'idée centrale, en désignant ce qui est visible.",',
        '        "Savoir comment : la démarche en mots, dans l\'ordre de l\'image.",',
        '        "Savoir avec : quand l\'utiliser et comment vérifier.",',
        '        "Le réflexe, formulé comme une question à se poser.",',
        '        "Regarde maintenant la démarche, sous l\'image : ..."',
        '      ],'
      );
    } else {
      m.push(
        '      "savoir_que": "L\'idée centrale que montre le schéma.",',
        '      "savoir_comment": "La démarche, en mots.",',
        '      "savoir_avec": "Quand et pourquoi l\'utiliser, et comment vérifier.",',
        '      "reflexe": "Le contrôle à faire systématiquement.",'
      );
    }
    m.push(
      '      "a_retenir": "La règle, en une ou deux phrases.",',
      '      "demarche": {',
      '        "formule": "concentration",',
      '        "etapes": [',
      '          {',
      '            "titre": "La masse de sel dans 0,5 L",',
      '            "inconnue": "Soit **m** la masse de sel, en grammes (g), dans 0,5 L de cette eau salée à 20 g/L.",',
      '            "lignes": [["20 g", "1 L"], ["m", "0,5 L"]],',
      '            "symbole": "m",',
      '            "calcul": { "num": "20 [g] × 0,5 [[L]]", "den": "1 [[L]]" },',
      '            "resultat": "10 g",',
      '            "biffage": "Les **L** s\'annulent en haut et en bas : il reste des grammes."',
      '          }',
      '        ],',
      '        "verification": "Contrôle de vraisemblance relié au schéma."',
      '      },',
      '      "question": "Quel raisonnement ... ? (nouvelles valeurs)",',
      '      "choix": [',
      '        { "texte": "Je me dis que ... (raisonnement juste)", "correct": true, "retroaction": "Exact : ..." },',
      '        { "texte": "Je me dis que ...", "correct": false, "erreur": "conception", "retroaction": "Pourquoi ce modèle est faux, et la relation juste." },',
      '        { "texte": "Je me dis que ...", "correct": false, "erreur": "procedure", "retroaction": "L\'étape correcte." },',
      '        { "texte": "Je me dis que ...", "correct": false, "erreur": "strategie", "retroaction": "Quand la règle s\'applique." }',
      '      ],',
      '      "solution": "Réponse attendue en une ligne, pour l\'enseignant.",',
      '      "explication": {',
      '        "savoir_que": "Le fait, la règle ou la relation.",',
      '        "savoir_comment": "La procédure en mots ; la démarche avec les valeurs de la question suit.",',
      '        "savoir_avec": "Une situation différente où la même idée s\'applique, et le contrôle à faire."',
      '      },',
      '      "demarche_explication": { "formule": "concentration", "etapes": [ "... même structure que demarche, avec les valeurs de la question ..." ], "verification": "..." },',
      '      "deuxieme_chance": {',
      '        "question": "Question guidée, plus simple, sur le même concept.",',
      '        "choix": [',
      '          { "texte": "Je me dis que ...", "correct": true, "retroaction": "..." },',
      '          { "texte": "Je me dis que ...", "correct": false, "retroaction": "..." },',
      '          { "texte": "Je me dis que ...", "correct": false, "retroaction": "..." }',
      '        ]',
      '      }',
      '    }',
      '  ]',
      '}'
    );
    return m;
  }

  function construireConsigne(ctx) {
    const texteSource = texte(ctx.texteSource);
    const nb = Math.max(2, Math.min(15, Number(ctx.nb) || 6));
    const narree = ctx.format !== 'ecrite';
    const source = texteSource
      ? 'Le document est fourni à la fin de cette consigne, sous « DOCUMENT ». Appuie-toi uniquement sur ce texte.'
      : 'Le document (notes de cours, capsule, chapitre ou exercice) est joint à ce message. Appuie-toi uniquement sur ce document. S\'il n\'y a aucun document joint, ou si tu ne peux pas le lire, dis-le clairement et ne produis aucun JSON : n\'invente jamais le contenu.';
    const lignes = [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu transformes un document de cours en exercice de compréhension en deux pages par station, selon l\'analyse cognitive des tâches de John Hattie. Pour chaque habileté majeure, l\'élève ' + (narree ? 'écoute' : 'lit') + ' d\'abord une page de présentation illustrée, puis répond à une question qui lui fait appliquer l\'idée à une situation nouvelle. Ses erreurs sont analysées et suivies d\'une explication en trois temps (savoir que, savoir comment, savoir avec) et d\'une question guidée.',
      '',
      'EXERCICE',
      '- Sujet : ' + (ctx.sujet || 'déduis-le du document, en quelques mots'),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '- Nombre de stations : ' + nb,
      '- Présentations : ' + (narree
        ? 'avec narration audio (l\'explication est racontée en commentant l\'image ; à l\'écran, seulement les mots clés et « À retenir »)'
        : 'écrites (l\'explication est lue à l\'écran : trois paragraphes et un réflexe)'),
      '',
      source
    ];
    if (texte(ctx.precisions)) lignes.push('', 'PRÉCISIONS DE L\'ENSEIGNANT', texte(ctx.precisions));
    lignes.push(
      '',
      'ANALYSE PRÉALABLE',
      '1. Repère ' + nb + ' habiletés majeures du document, classées du savoir que (connaître un fait, une relation) au savoir comment (appliquer une démarche) puis au savoir avec (utiliser l\'idée dans une situation nouvelle) : une station par habileté, dans cet ordre.',
      '2. Repère les erreurs majeures que font les élèves de ce niveau sur ces habiletés. Elles deviennent les distracteurs des questions.',
      '3. "intentions" (« Ce que j\'apprends ») : 3 phrases au « je ». "criteres" (« Je sais que j\'ai réussi quand… ») : 3 à 5 critères observables, au « je ». "accueil" : une ou deux phrases sur ce que l\'élève va se représenter, puis « Chacune des ' + nb + ' stations commence par une page illustrée à ' + (narree ? 'écouter' : 'lire') + ', suivie d\'une question. »',
      '',
      'PAGE 1 — LA PRÉSENTATION',
      '4. "figure" : la description précise du schéma de la présentation (l\'enseignant le fera dessiner). Il montre des quantités concrètes et dénombrables (particules, portions égales, récipients gradués), avec d\'autres valeurs que la question, et aucun calcul résolu. ' + (narree
        ? 'Aucune phrase dans l\'image : seulement des valeurs, des éléments du schéma et des repères (✓, ✗, flèches) ; le sens passe par la voix.'
        : 'Peu de texte dans l\'image : des valeurs, de courtes étiquettes et des repères (✓, ✗, flèches).') + ' "legende_figure" : la légende courte du schéma.'
    );
    if (narree) {
      lignes.push(
        '5. "narration" : 5 à 7 paragraphes lus à voix haute (150 à 220 mots en tout, environ une minute), au « tu ». La narration suit l\'image dans l\'ordre de lecture et désigne ce qui est visible (« à gauche », « compte les points », « suis la flèche »). Elle présente le savoir que, puis le savoir comment, puis le savoir avec (quand l\'utiliser et comment vérifier). Les unités s\'écrivent en toutes lettres (« grammes par litre »). L\'avant-dernier paragraphe est le réflexe à prendre, formulé comme une question à se poser. S\'il y a une "demarche", le dernier paragraphe y conduit : « Regarde maintenant la démarche, sous l\'image : … ».',
        '6. "mots_cles" : 1 à 3 termes clés, chacun avec une définition courte (quelques mots).',
        '7. "a_retenir" : la règle, en une ou deux phrases, reliée au schéma ; elle ne répète pas la narration.'
      );
    } else {
      lignes.push(
        '5. "savoir_que" (l\'idée centrale que montre le schéma), "savoir_comment" (la démarche, en mots) et "savoir_avec" (quand et pourquoi l\'utiliser, et comment vérifier) : un court paragraphe chacun, au « tu ». "reflexe" : le contrôle à faire systématiquement, en une phrase.',
        '6. Ces paragraphes désignent ce que montre le schéma (« à gauche », « compte les points »).',
        '7. "a_retenir" : la relation clé, en une ou deux phrases, formulée comme l\'étape 1 de la démarche et reliée au schéma.'
      );
    }
    lignes.push(
      '8. "source" : la section ou la page du document d\'où vient la notion.',
      '9. "demarche" : seulement si la station comporte un calcul. C\'est le calcul détaillé, en produit croisé, avec les valeurs de la présentation (pas celles de la question) :',
      '   - "formule" : "concentration" pour la formule de la concentration (C = masse de soluté sur volume de solution, écrite par l\'activité en fraction avec sa légende) ; une équivalence d\'unités s\'écrit en texte ("1 L = 1 000 mL") ; une autre formule s\'écrit { "gauche": "...", "numerateur": "m_soluté", "denominateur": "V_solution", "legende": [ { "symbole": "...", "definition": "... en ... (...)" } ] }.',
      '   - "etapes" : pour chaque étape, "inconnue" déclare la lettre cherchée en gras et son unité (« Soit **m** la masse de sel, en grammes (g), … ») ; "lignes" donne les deux fractions égales [[numérateur, dénominateur], [numérateur, dénominateur]], l\'inconnue au numérateur de l\'une d\'elles, chaque valeur avec son unité ; "symbole" est la lettre de l\'inconnue ; "calcul" donne le numérateur et le dénominateur du calcul final, où une unité qui s\'annule s\'écrit entre doubles crochets ([[L]]) et une unité qui reste entre crochets simples ([g]) ; "resultat" est la valeur avec son unité ; "biffage" dit quelles unités s\'annulent.',
      '   - "verification" : le contrôle de vraisemblance, relié au schéma.',
      '   - N\'écris jamais une formule en ligne du type « C = m ÷ V » et jamais de tableau avec des flèches. Sans calcul, n\'ajoute pas "demarche".',
      '',
      'PAGE 2 — LA QUESTION',
      '10. "titre" : le sujet conceptuel de la station, en casse de phrase (ex. : « Des millilitres aux litres »). Jamais de numéro, ni « Question », « Station » ou « Défi ».',
      '11. "question" : après une courte mise en situation au besoin, elle commence par « Pourquoi » ou « Quel raisonnement » et se termine par un point d\'interrogation. Elle emploie de nouvelles valeurs : l\'élève applique l\'idée, il ne recopie pas la présentation.',
      '12. "choix" : 4 choix, un seul correct, de longueur semblable. Chacun est une pensée verbalisée qui commence par « Je me dis que », sans bloc de calcul. Leur ordre sera mélangé pour l\'élève.',
      '13. Chaque distracteur incarne une erreur majeure réelle et porte son type dans "erreur" :',
      Object.keys(ERREURS).map(function (k) { return '   - "' + k + '" : ' + ERREURS[k].replace(/^[^:]+:\s*/, '') + '.'; }).join('\n'),
      '14. "retroaction" : chaque choix a la sienne, courte. Pour le bon choix, elle confirme et précise ; pour un distracteur, elle dit pourquoi le raisonnement est faux et donne la relation juste, sans répéter le texte du choix.',
      '15. "solution" : la réponse attendue, en une ligne, pour l\'enseignant.',
      '16. "explication" (affichée sous la question après une erreur) : "savoir_que" (ce qui est vrai), "savoir_comment" (la démarche en mots) et "savoir_avec" (une situation différente où la même idée s\'applique, et le contrôle de vraisemblance). Si la question comporte un calcul, "savoir_comment" se termine par une phrase qui annonce le calcul, et "demarche_explication" donne ce calcul avec les valeurs de la question, dans la même structure que "demarche".',
      '17. "deuxieme_chance" : une question guidée, plus simple, sur le même concept : 3 choix « Je me dis que… », un seul correct, chacun avec sa "retroaction". Elle rapporte ' + POINTS_DEUXIEME_CHANCE + ' point.',
      '18. "points" : ' + POINTS_PAR_DEFAUT + ' points par station, sauf indication contraire de l\'enseignant.',
      '19. Texte simple, sans HTML ; un mot clé peut être mis en gras avec **deux astérisques**. Évite le LaTeX. Français standard du Québec, tutoiement de l\'élève. N\'écris jamais les mots « PFEQ » ni « défi », ni les compétences CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Respecte exactement cette structure (les « ... » sont à remplacer ; le modèle montre une station, il en faut ' + nb + ' ; retire "demarche" et "demarche_explication" d\'une station sans calcul) :',
      ''
    );
    Array.prototype.push.apply(lignes, modeleJson(narree, ctx.sujet));
    if (texteSource) lignes.push('', 'DOCUMENT', texteSource);
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation : JSON de l'IA → questions_data.js du moteur (deux pages)
  // ----------------------------------------------------------------------
  function versChoix(c, i) {
    const r = U.versChoix(c, i);
    const e = typeErreur(c && typeof c === 'object' ? (c.erreur || c.type_erreur || c.typeErreur) : '');
    if (e && !r.correct) r.erreur = e;
    return r;
  }

  /** Démarche compacte → format du moteur. Avec la formule « concentration », chaque étape part de la substitution. */
  function versDemarche(src, notes) {
    if (!src || typeof src !== 'object' || !liste(src.etapes || src.étapes).some(function (e) { return e && typeof e === 'object'; })) return null;
    const propre = Object.assign({}, src, { etapes: liste(src.etapes || src.étapes).filter(function (e) { return e && typeof e === 'object'; }) });
    const dm = U.versDemarche(propre, notes);
    if (!dm) return null;
    // Fraction intermédiaire du calcul (ex. : 250 [L] sur 1 000), gardée telle quelle.
    dm.etapes.forEach(function (e, i) {
      const c = propre.etapes[i].calcul;
      const m = c && (c.intermediaire || c.intermédiaire);
      if (e.calcul && m && typeof m === 'object' && texte(m.num || m.numerateur)) {
        e.calcul.intermediaire = { num: texte(m.num || m.numerateur), den: texte(m.den || m.denominateur) };
      }
    });
    if (/^concentration$/i.test(texte(dm.formule))) {
      dm.formule = 'concentration';
      dm.etapes.forEach(function (e, i) { if (propre.etapes[i].rapport == null) e.rapport = true; });
    }
    return dm;
  }

  function versRemediation(r) {
    if (!r || typeof r !== 'object') return null;
    const question = texte(r.question || r.enonce || r.énoncé);
    const choices = liste(r.choix || r.choices).map(U.versChoix);
    if (!question && !choices.length) return null;
    const bonne = choices.find(function (c) { return c.correct; });
    return {
      question: question,
      choices: choices,
      solution: texte(r.solution) || (bonne ? bonne.text : ''),
      points: POINTS_DEUXIEME_CHANCE
    };
  }

  function lireExplication(src) {
    const e = src.explication;
    if (e && typeof e === 'object' && !Array.isArray(e)) {
      return {
        savoirQue: texte(e.savoir_que || e.savoirQue),
        savoirComment: texte(e.savoir_comment || e.savoirComment),
        savoirAvec: texte(e.savoir_avec || e.savoirAvec)
      };
    }
    // Explication en un seul texte : elle devient le savoir que.
    return texte(e) ? { savoirQue: texte(e), savoirComment: '', savoirAvec: '' } : null;
  }

  function versStation(src, n, notes) {
    src = src || {};
    let titre = texte(src.titre || src.nom);
    if (U.PREFIXE_NUMERO.test(titre) || /^station\s*\d+\s*[.\-:)–—]\s*/i.test(titre)) {
      titre = titre.replace(U.PREFIXE_NUMERO, '').replace(/^station\s*\d+\s*[.\-:)–—]\s*/i, '').trim();
      notes.numeros = true;
    }
    const q = { id: 's' + n, titre: titre, points: U.entierPositif(src.points) || POINTS_PAR_DEFAUT };

    // Page 1 : présentation narrée ou écrite.
    const motsCles = liste(src.mots_cles || src.motsCles || src.mots_clés).map(function (m) {
      if (typeof m === 'string') { const p = m.split(/\s*[:—–]\s*/); return { terme: texte(p[0]), definition: texte(p.slice(1).join(' : ')) }; }
      return { terme: texte(m && m.terme), definition: texte(m && (m.definition || m.définition)) };
    }).filter(function (m) { return m.terme; });
    const narration = liste(src.narration).map(texte).filter(Boolean);
    const contenu = liste(src.contenu).map(texte).filter(Boolean);
    [src.savoir_que || src.savoirQue, src.savoir_comment || src.savoirComment, src.savoir_avec || src.savoirAvec].forEach(function (t) {
      if (texte(t)) contenu.push(texte(t));
    });
    if (motsCles.length) q.motsCles = motsCles;
    if (narration.length) q.narration = narration;
    if (contenu.length) q.contenu = contenu;
    if (texte(src.reflexe || src.réflexe)) q.reflexe = texte(src.reflexe || src.réflexe);
    const demarche = versDemarche(src.demarche || src.démarche, notes);
    if (demarche) q.demarche = demarche;
    q.aRetenir = texte(src.a_retenir || src.aRetenir || src.à_retenir);
    q.citationRef = texte(src.source || src.citationRef || src.reference || src.référence);
    if (texte(src.figure || src.description_image)) q.figure = texte(src.figure || src.description_image);
    if (texte(src.legende_figure || src.légende_figure || src.imageCaption)) q.imageCaption = texte(src.legende_figure || src.légende_figure || src.imageCaption);

    // Page 2 : question.
    q.question = texte(src.question || src.enonce || src.énoncé);
    q.choices = liste(src.choix || src.choices || src.options).map(versChoix);
    q.solution = texte(src.solution);
    const expl = lireExplication(src);
    if (expl) q.explication = expl;
    const dmExpl = versDemarche(src.demarche_explication || src.explicationDemarche || src.démarche_explication, notes);
    if (dmExpl) q.explicationDemarche = dmExpl;
    const rem = versRemediation(src.deuxieme_chance || src.deuxième_chance || src.remediation);
    if (rem) q.remediation = rem;
    return q;
  }

  function normaliser(valeur, ctx) {
    ctx = ctx || {};
    const notes = [];
    let d = valeur;
    if (Array.isArray(d)) {
      d = { stations: d };
      notes.push('La réponse ne contenait que la liste des stations : le titre a été repris de l\'étape 1.');
    }
    const stations = d && typeof d === 'object' ? (d.stations || d.questions) : null;
    if (!Array.isArray(stations)) {
      return { ok: false, notes: notes, erreur: 'La réponse ne contient pas de liste « stations ». Vérifiez que vous avez collé la réponse complète de l\'IA.' };
    }
    const drapeaux = {};
    const questions = stations.map(function (q, i) { return versStation(q, i + 1, drapeaux); });
    if (drapeaux.numeros) notes.push('Des numéros placés devant les titres (« Q1 », « Station 1 - »...) ont été retirés.');
    if (drapeaux.calculs) notes.push('Le calcul final de certaines étapes a été déduit des deux fractions.');
    return {
      ok: true,
      donnees: {
        mode: MODE,
        presentation: PRESENTATION,
        titre: titreComplet(d.titre || ctx.sujet),
        accueil: texte(d.accueil || d.introduction),
        intentions: liste(d.intentions || d.objectifs).map(texte).filter(Boolean),
        criteres: liste(d.criteres || d.critères || d.criteres_de_reussite).map(texte).filter(Boolean),
        questions: questions
      },
      notes: notes
    };
  }

  // ----------------------------------------------------------------------
  // Vérification des règles
  // ----------------------------------------------------------------------
  function textesDemarche(dm, t) {
    if (!dm) return;
    t.push(dm.verification);
    liste(dm.etapes).forEach(function (e) { t.push(e.titre, e.inconnue, e.biffage); });
  }

  function textesEleve(q) {
    const t = [q.titre, q.aRetenir, q.reflexe, q.citationRef, q.imageCaption, q.question];
    liste(q.narration).concat(liste(q.contenu)).forEach(function (p) { t.push(p); });
    liste(q.motsCles).forEach(function (m) { t.push(m.terme, m.definition); });
    liste(q.choices).forEach(function (c) { t.push(c.text, c.feedback); });
    if (q.explication) t.push(q.explication.savoirQue, q.explication.savoirComment, q.explication.savoirAvec);
    textesDemarche(q.demarche, t);
    textesDemarche(q.explicationDemarche, t);
    if (q.remediation) { t.push(q.remediation.question); liste(q.remediation.choices).forEach(function (c) { t.push(c.text, c.feedback); }); }
    return t.filter(Boolean).join('\n');
  }

  /**
   * @param {object} d Données normalisées.
   * @param {object} [ctx] Renseignements de l'étape 1 (nombre de stations, format des présentations).
   * @returns {{erreurs: Array<{lieu, msg}>, avertissements: Array<{lieu, msg}>}}
   */
  function valider(d, ctx) {
    ctx = ctx || {};
    const erreurs = [];
    const avertissements = [];
    const narree = ctx.format ? ctx.format !== 'ecrite' : null;
    if (!d.questions.length) erreurs.push({ lieu: 'Réponse', msg: 'aucune station.' });
    const attendu = Number(ctx.nb) || 0;
    if (attendu && d.questions.length && d.questions.length !== attendu) {
      avertissements.push({ lieu: 'Réponse', msg: d.questions.length + ' stations reçues pour ' + attendu + ' demandées.' });
    }
    U.MOTS_INTERDITS.forEach(function (m) {
      if (m.re.test([d.titre, d.accueil].concat(d.intentions, d.criteres || []).join('\n'))) erreurs.push({ lieu: 'Titre, accueil, intentions ou critères', msg: 'contient ' + m.texte + '.' });
    });
    if (!d.intentions.length) avertissements.push({ lieu: 'Accueil', msg: 'aucune intention d\'apprentissage ("intentions") : l\'écran d\'accueil n\'aura pas la tuile « Ce que j\'apprends ».' });
    if (!(d.criteres || []).length) avertissements.push({ lieu: 'Accueil', msg: 'aucun critère de réussite ("criteres") : l\'écran d\'accueil n\'aura pas la tuile « Je sais que j\'ai réussi quand… ».' });

    const titres = {};
    d.questions.forEach(function (q, i) {
      const lieu = 'Station ' + (i + 1) + (q.titre ? ' (' + q.titre + ')' : '');
      if (!q.titre) erreurs.push({ lieu: lieu, msg: 'le titre est vide.' });
      else if (titres[q.titre.toLowerCase()]) avertissements.push({ lieu: lieu, msg: 'même titre qu\'une autre station.' });
      titres[(q.titre || '').toLowerCase()] = true;

      // Page 1 — présentation
      const aNarration = liste(q.narration).length > 0;
      const aContenu = liste(q.contenu).length > 0;
      if (!aNarration && !aContenu) {
        erreurs.push({ lieu: lieu, msg: 'la page de présentation est vide : il faut ' + (narree === false ? '"savoir_que", "savoir_comment" et "savoir_avec"' : 'une "narration"') + '.' });
      } else if (narree === true && !aNarration) {
        avertissements.push({ lieu: lieu, msg: 'présentation écrite alors que la narration a été choisie à l\'étape 1.' });
      } else if (narree === false && !aContenu) {
        avertissements.push({ lieu: lieu, msg: 'présentation narrée alors que la présentation écrite a été choisie à l\'étape 1.' });
      }
      if (aNarration) {
        const mots = nombreMots(q.narration);
        if (mots < 90) avertissements.push({ lieu: lieu, msg: 'la narration est courte (' + mots + ' mots) : environ 150 à 220 mots, une minute de lecture.' });
        if (mots > 280) avertissements.push({ lieu: lieu, msg: 'la narration est longue (' + mots + ' mots) : environ 150 à 220 mots, une minute de lecture.' });
        if (!liste(q.motsCles).length) avertissements.push({ lieu: lieu, msg: 'aucun mot clé ("mots_cles") à côté de la narration.' });
        if (liste(q.motsCles).length > 3) avertissements.push({ lieu: lieu, msg: liste(q.motsCles).length + ' mots clés : 1 à 3 suffisent.' });
        if (q.demarche && !/d[ée]marche/i.test(q.narration[q.narration.length - 1])) {
          avertissements.push({ lieu: lieu, msg: 'le dernier paragraphe de la narration ne conduit pas à la démarche (« Regarde maintenant la démarche, sous l\'image : … »).' });
        }
        if (aContenu) avertissements.push({ lieu: lieu, msg: 'la présentation a à la fois une narration et des paragraphes écrits : seuls la narration et les mots clés seront affichés.' });
      } else if (aContenu) {
        if (q.contenu.length !== 3) avertissements.push({ lieu: lieu, msg: q.contenu.length + ' paragraphe(s) de présentation : il en faut 3 (savoir que, savoir comment, savoir avec).' });
        if (!q.reflexe) avertissements.push({ lieu: lieu, msg: 'aucun réflexe ("reflexe") sur la page de présentation.' });
      }
      if (!q.aRetenir) avertissements.push({ lieu: lieu, msg: 'aucune règle « À retenir » ("a_retenir").' });
      if (!q.figure && !q.image) avertissements.push({ lieu: lieu, msg: 'aucun schéma ("figure") : la présentation n\'aura pas de représentation visuelle.' });
      if (q.demarche) U.verifierDemarche(q.demarche, lieu + ', démarche de la présentation', erreurs, avertissements);

      // Page 2 — question
      if (!q.question) erreurs.push({ lieu: lieu, msg: 'la question est vide.' });
      else {
        if (!/(?:^|[.:!»]\s+)(?:pourquoi|quel(?:le)?s?\s+(?:raisonnement|analyse))\b/i.test(q.question)) avertissements.push({ lieu: lieu, msg: 'la question ne commence pas par « Pourquoi » ni par « Quel raisonnement » (après une courte mise en situation, au besoin).' });
        if (!/\?\s*$/.test(q.question)) avertissements.push({ lieu: lieu, msg: 'la question ne se termine pas par un point d\'interrogation.' });
      }
      U.verifierChoix(q.choices, lieu, erreurs, avertissements);
      if (q.choices.length && q.choices.length !== 4) avertissements.push({ lieu: lieu, msg: q.choices.length + ' choix : il en faut 4.' });
      if (q.choices.some(function (c) { return c.text && !/^je\s/i.test(c.text); })) {
        avertissements.push({ lieu: lieu, msg: 'un choix n\'est pas une pensée verbalisée (« Je me dis que… »).' });
      }
      const sansType = q.choices.filter(function (c) { return !c.correct && !c.erreur; }).length;
      if (sansType) avertissements.push({ lieu: lieu, msg: sansType + ' distracteur(s) sans type d\'erreur ("erreur" : ' + Object.keys(ERREURS).join(', ') + ') : l\'analyse du raisonnement ne nommera pas l\'erreur.' });
      if (!q.solution) avertissements.push({ lieu: lieu, msg: 'aucune solution ("solution") pour le corrigé de l\'enseignant.' });

      if (!q.explication) erreurs.push({ lieu: lieu, msg: 'l\'explication en trois temps ("explication") est manquante.' });
      else {
        [['savoirQue', 'savoir_que'], ['savoirComment', 'savoir_comment'], ['savoirAvec', 'savoir_avec']].forEach(function (k) {
          if (!q.explication[k[0]]) avertissements.push({ lieu: lieu, msg: 'l\'explication n\'a pas de "' + k[1] + '".' });
        });
      }
      if (q.demarche && !q.explicationDemarche) avertissements.push({ lieu: lieu, msg: 'la présentation a une démarche, mais pas l\'explication ("demarche_explication" avec les valeurs de la question).' });
      if (q.explicationDemarche) U.verifierDemarche(q.explicationDemarche, lieu + ', démarche de l\'explication', erreurs, avertissements);

      if (q.remediation) {
        if (!q.remediation.question) erreurs.push({ lieu: lieu + ', deuxième chance', msg: 'la question guidée ("question") est vide.' });
        U.verifierChoix(q.remediation.choices, lieu + ', deuxième chance', erreurs, avertissements);
      } else {
        avertissements.push({ lieu: lieu, msg: 'aucune deuxième chance ("deuxieme_chance") : l\'élève qui se trompe n\'aura pas de question guidée.' });
      }
      U.MOTS_INTERDITS.forEach(function (m) { if (m.re.test(textesEleve(q))) erreurs.push({ lieu: lieu, msg: 'contient ' + m.texte + '.' }); });
    });
    return { erreurs: erreurs, avertissements: avertissements };
  }

  function consigneCorrection(erreurs) {
    const lignes = ['Le JSON que tu m\'as donné ne respecte pas certaines règles de la consigne :', ''];
    erreurs.forEach(function (e) { lignes.push('- ' + e.lieu + ' : ' + e.msg); });
    lignes.push(
      '',
      'Corrige ces points en respectant toutes les règles de la consigne de départ, sans modifier ce qui est déjà correct.',
      'Renvoie le JSON complet (toutes les stations), uniquement dans un bloc de code, avec des guillemets droits.'
    );
    return lignes.join('\n');
  }

  function consigneCorrectionRetouche(erreurs) {
    const lignes = ['La station retouchée que tu m\'as donnée ne respecte pas certaines règles :', ''];
    erreurs.forEach(function (e) { lignes.push('- ' + e.lieu + ' : ' + e.msg); });
    lignes.push('', 'Corrige ces points sans modifier ce qui est déjà correct.',
      'Renvoie seulement cette station, en un objet JSON, dans un bloc de code, avec des guillemets droits.');
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Format compact (texte de l'étape 2) et retouche d'une station par l'IA
  // ----------------------------------------------------------------------
  function demarcheCompacte(dm) {
    const r = U.demarcheCompacte(dm);
    if (!r) return null;
    // La formule « concentration » ajoute la substitution par défaut : seule l'exception est écrite.
    liste(dm.etapes).forEach(function (e, i) {
      if (dm.formule === 'concentration' ? e.rapport !== true : e.rapport === true) r.etapes[i].rapport = e.rapport === true;
      if (e.calcul && e.calcul.intermediaire) r.etapes[i].calcul.intermediaire = e.calcul.intermediaire;
    });
    return r;
  }

  function choixCompacts(choix) {
    return liste(choix).map(function (c) {
      const r = { texte: c.text, correct: !!c.correct };
      if (c.erreur) r.erreur = c.erreur;
      r.retroaction = c.feedback || '';
      return r;
    });
  }

  /** Station normalisée → JSON compact de la consigne (ce que l'IA a produit). Sans l'image. */
  function versCompact(q) {
    const c = { titre: q.titre, points: q.points, source: q.citationRef || '' };
    if (q.figure) c.figure = q.figure;
    if (q.imageCaption) c.legende_figure = q.imageCaption;
    if (liste(q.motsCles).length) c.mots_cles = q.motsCles.map(function (m) { return { terme: m.terme, definition: m.definition }; });
    if (liste(q.narration).length) c.narration = q.narration.slice();
    if (liste(q.contenu).length) {
      if (q.contenu.length === 3) { c.savoir_que = q.contenu[0]; c.savoir_comment = q.contenu[1]; c.savoir_avec = q.contenu[2]; }
      else c.contenu = q.contenu.slice();
    }
    if (q.reflexe) c.reflexe = q.reflexe;
    c.a_retenir = q.aRetenir || '';
    if (q.demarche) c.demarche = demarcheCompacte(q.demarche);
    c.question = q.question;
    c.choix = choixCompacts(q.choices);
    c.solution = q.solution;
    if (q.explication) c.explication = { savoir_que: q.explication.savoirQue || '', savoir_comment: q.explication.savoirComment || '', savoir_avec: q.explication.savoirAvec || '' };
    if (q.explicationDemarche) c.demarche_explication = demarcheCompacte(q.explicationDemarche);
    if (q.remediation) {
      c.deuxieme_chance = { question: q.remediation.question, choix: U.choixCompacts(q.remediation.choices) };
      const bonne = liste(q.remediation.choices).filter(function (x) { return x.correct; })[0];
      if (q.remediation.solution && (!bonne || bonne.text !== q.remediation.solution)) c.deuxieme_chance.solution = q.remediation.solution;
    }
    return c;
  }

  function activiteCompacte(d) {
    return {
      titre: texte(d.titre).replace(SUFFIXES_TITRE, ''),
      accueil: d.accueil,
      intentions: d.intentions,
      criteres: d.criteres || [],
      stations: d.questions.map(versCompact)
    };
  }

  function consigneRetouche(q, demande, ctx) {
    ctx = ctx || {};
    const narree = liste(q.narration).length > 0;
    return [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Voici une station d\'un exercice de compréhension en deux pages (Hattie) destiné à des élèves (' + (ctx.niveau || 'secondaire') + '), au format JSON : une page de présentation ' + (narree ? 'narrée' : 'écrite') + ', puis une question.',
      '',
      'RETOUCHE DEMANDÉE PAR L\'ENSEIGNANT',
      texte(demande),
      '',
      'RÈGLES À RESPECTER',
      '- Applique seulement la retouche demandée. Garde tel quel tout le reste.',
      '- "titre" : le sujet conceptuel, en casse de phrase, sans numéro ni préfixe.',
      narree
        ? '- "narration" : 5 à 7 paragraphes au « tu » (150 à 220 mots), qui suivent l\'image et désignent ce qui est visible ; unités en toutes lettres ; l\'avant-dernier paragraphe est le réflexe ; s\'il y a une "demarche", le dernier y conduit. "mots_cles" : 1 à 3 termes.'
        : '- "savoir_que", "savoir_comment", "savoir_avec" : un court paragraphe chacun, au « tu » ; "reflexe" : le contrôle à faire.',
      '- La présentation emploie d\'autres valeurs que la question. "figure" décrit un schéma sans calcul résolu' + (narree ? ', sans phrase (valeurs et repères seulement)' : '') + '.',
      '- "demarche" et "demarche_explication" : produit croisé (formule "concentration" ou équivalence en texte ; "lignes" = deux fractions avec l\'inconnue au numérateur ; unités qui s\'annulent entre [[ ]], unités qui restent entre [ ]). Jamais de formule en ligne ni de tableau fléché.',
      '- "question" : commence par « Pourquoi » ou « Quel raisonnement », avec de nouvelles valeurs, et se termine par un point d\'interrogation.',
      '- "choix" : 4 choix « Je me dis que… », un seul correct ; chaque distracteur porte son "erreur" (' + Object.keys(ERREURS).join(', ') + ') et chaque choix sa "retroaction".',
      '- "explication" : "savoir_que", "savoir_comment", "savoir_avec". "deuxieme_chance" : 3 choix, un seul correct, chacun avec sa rétroaction.',
      '- Texte simple, sans HTML (**gras** permis). Français standard du Québec. N\'écris jamais « PFEQ », « défi », CD1, CD2 ou CD3.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON contenant cette seule station retouchée (un objet, pas une liste), avec la même structure et des guillemets droits.',
      '',
      'STATION ACTUELLE',
      JSON.stringify(versCompact(q), null, 2)
    ].join('\n');
  }

  /**
   * Lit la station retouchée (objet, liste d'un objet ou { stations: [...] }) et la vérifie.
   * L'identifiant et l'image sont repris de la station d'origine.
   */
  function appliquerRetouche(valeur, ancienne, rang) {
    let src = valeur;
    if (src && !Array.isArray(src)) src = src.stations || src.questions || src;
    if (Array.isArray(src)) {
      if (src.length !== 1) return { ok: false, erreur: 'La réponse contient ' + src.length + ' stations : il en faut une seule, la station retouchée.' };
      src = src[0];
    }
    if (!src || typeof src !== 'object' || !(src.titre || src.question || src.narration)) {
      return { ok: false, erreur: 'La réponse ne contient pas de station (champs "titre", "narration", "question"...).' };
    }
    const drapeaux = {};
    const q = versStation(src, rang, drapeaux);
    q.id = ancienne.id || q.id;
    if (ancienne.image) { q.image = ancienne.image; q.imageAlt = ancienne.imageAlt; }
    // L'enregistrement de la voix est gardé ; le volet signale si la narration a changé depuis.
    // La voix d'un projet d'exemple (audioExemple) est retirée dès que la narration change : la voix de synthèse lit le nouveau texte.
    const memeTexte = ancienne.audioTexte === liste(q.narration).join('\n');
    if (ancienne.audio && liste(q.narration).length && (!ancienne.audioExemple || memeTexte)) {
      q.audio = ancienne.audio; q.audioDuree = ancienne.audioDuree; q.audioTexte = ancienne.audioTexte; q.audioExemple = ancienne.audioExemple;
    }
    if (!q.imageCaption && ancienne.imageCaption) q.imageCaption = ancienne.imageCaption;
    const notes = [];
    if (drapeaux.numeros) notes.push('Le numéro placé devant le titre a été retiré.');
    if (drapeaux.calculs) notes.push('Le calcul final d\'une étape a été déduit des deux fractions.');
    const format = liste(ancienne.narration).length ? 'narration' : 'ecrite';
    const verif = valider({ titre: '', accueil: '', intentions: ['-'], criteres: ['-'], questions: [q] }, { format: format });
    const lieu = function (e) { return { lieu: e.lieu.replace(/^Station 1\b/, 'Station ' + rang), msg: e.msg }; };
    return { ok: true, question: q, erreurs: verif.erreurs.map(lieu), avertissements: verif.avertissements.map(lieu), notes: notes };
  }

  /** Demande d'image pour le schéma de la présentation d'une station, à donner à l'IA. */
  function demandeImage(q, niveau) {
    const narree = liste(q.narration).length > 0;
    return [
      'Crée un schéma pour la page de présentation d\'un exercice de compréhension en sciences au secondaire' + (niveau ? ' (' + niveau + ')' : '') + ', au Québec.',
      '',
      'Schéma demandé : ' + (q.figure || q.titre),
      'Notion illustrée : ' + q.titre,
      q.imageCaption ? 'Légende (affichée sous l\'image, à ne pas écrire dans l\'image) : ' + q.imageCaption : '',
      '',
      'Style : schéma didactique plat, traits nets, fond blanc, couleurs sobres et contrastées, aucun dégradé ni décor. Format paysage, environ 1200 × 700 pixels.',
      'Quantités concrètes et dénombrables (particules, portions égales), sans calcul résolu.',
      narree
        ? 'Aucune phrase dans l\'image : seulement les valeurs, les éléments du schéma et des repères (✓, ✗, flèches).'
        : 'Peu de texte : seulement les valeurs, de courtes étiquettes et des repères (✓, ✗, flèches).'
    ].filter(function (l, i, t) { return l || (t[i - 1] !== ''); }).join('\n');
  }

  // ----------------------------------------------------------------------
  // Reprise d'un questions_data.js de l'outil actuel (deux pages)
  // ----------------------------------------------------------------------
  function depuisQuestionsData(js) {
    const lu = U.lireQuestionsData(js);
    const config = lu.config;
    const questions = lu.questions;
    if (config.mode !== MODE || config.presentation !== PRESENTATION) throw new Error('ce fichier n\'est pas une compréhension en deux pages (Hattie)');
    questions.forEach(function (q, i) {
      if (!Array.isArray(q.choices)) throw new Error('la station « ' + (q.titre || i + 1) + ' » n\'a pas de choix de réponse');
      q.id = q.id || ('s' + (i + 1));
      q.points = U.entierPositif(q.points) || POINTS_PAR_DEFAUT;
      // Fichiers audio du dossier de l'activité : ils ne sont pas dans ce fichier (la voix s'enregistre à l'étape 3).
      if (q.audio && !/^data:audio\//.test(q.audio)) delete q.audio;
      if (typeof q.explication === 'string') q.explication = { savoirQue: q.explication, savoirComment: '', savoirAvec: '' };
      // Images du dossier de l'activité : elles ne sont pas dans ce fichier.
      if (q.image && !/^data:/.test(q.image)) { q.figure = q.imageAlt || q.imageCaption || q.titre; delete q.image; delete q.imageAlt; }
      if (q.explication && q.explication.image && !/^data:/.test(q.explication.image)) {
        delete q.explication.image; delete q.explication.imageAlt; delete q.explication.imageCaption;
      }
    });
    return {
      contexte: {
        sujet: texte(config.titre).replace(SUFFIXES_TITRE, ''),
        nb: questions.length,
        format: questions.some(function (q) { return liste(q.narration).length; }) ? 'narration' : 'ecrite'
      },
      donnees: {
        mode: MODE,
        presentation: PRESENTATION,
        titre: titreComplet(config.titre),
        accueil: texte(config.welcomeIntro),
        intentions: liste(config.intentions).map(texte).filter(Boolean),
        criteres: liste(config.criteres).map(texte).filter(Boolean),
        questions: questions
      }
    };
  }

  window.MoodleAIScormHattie = {
    MODE: MODE,
    PRESENTATION: PRESENTATION,
    ERREURS: ERREURS,
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
    totalPoints: C.totalPoints,
    enTexte: C.enTexte,
    nomFichierZip: C.nomFichierZip,
    questionsDataJs: C.questionsDataJs,
    construireApercu: C.construireApercu,
    construirePackage: C.construirePackage,
    depuisQuestionsData: depuisQuestionsData
  };
})();
