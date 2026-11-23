/**
 * Action « Nouvelle version ou corrigé d'un examen » — consigne pour l'IA, lecture, vérification
 * et construction des deux documents imprimables en format lettre (8,5 × 11 po) :
 *   - l'examen de l'élève (cartouche textuel, espaces de démarche et lignes de réponse du papier) ;
 *   - le corrigé de l'enseignant (méthode A en produit croisé, méthode B par isolation,
 *     bandeau « Sur la copie élève », erreurs fréquentes et grille de correction).
 *
 * Deux modes : « version » (nouvelle version de l'examen et son corrigé) et « corrige »
 * (corrigé de l'examen fourni, mêmes données). Aucun fichier .tex : les démarches sont rendues
 * par le moteur SCORM de moteur-ui (window.ScormDemarche de scorm_runtime.js, chargé comme
 * bibliothèque) et le bundle MathJax local, en SVG. Les pages exportées sont statiques.
 *
 * L'IA renvoie un JSON compact :
 * { titre, version, matiere, consigne, cartouche: [...], questions: [ { page, type, titre, points,
 *   enonce, blocs: [...], ligne_reponse: [{ etiquette, attendu }], alignement, ...champs propres au type } ],
 *   bareme_en_marge }
 *
 * « blocs » décrit la mise en page sous l'énoncé (zones, éléments a/b/c, tableaux, associations) :
 * voir actions/examen-blocs.js.
 */
(function () {
  'use strict';

  const SC = function () { return window.MoodleAIScormCorrige; };
  const B = function () { return window.MoodleAIExamenBlocs; };
  const BASE_MOTEUR = '../moteur-ui/';
  const COQUILLE_SCORM = 'simulateurs/scorm/index_scorm_shell.html';
  /** Hauteur d'une ligne d'espace de démarche sur la feuille. */
  const LIGNE_POUCES = 0.3;

  const TYPES = { calcul: 'Calcul', choix: 'Choix de réponse', ouverte: 'Réponse rédigée' };
  const ALIAS_TYPES = {
    calcul: 'calcul', probleme: 'calcul', numerique: 'calcul', reponsecourte: 'calcul', shortanswer: 'calcul',
    choix: 'choix', qcm: 'choix', choixmultiple: 'choix', choixmultiples: 'choix', choixdereponse: 'choix', vraioufaux: 'choix', vraifaux: 'choix', radio: 'choix',
    ouverte: 'ouverte', redigee: 'ouverte', reponseredigee: 'ouverte', developpement: 'ouverte', explication: 'ouverte', justification: 'ouverte', texte: 'ouverte'
  };
  /** Mentions interdites dans le document remis à l'élève. */
  const MOTS_INTERDITS_ELEVE = [
    { re: /\bPFEQ\b/i, texte: 'la mention « PFEQ » (réservée aux enseignants)' },
    { re: /\bCD\s?[123]\b/, texte: 'une compétence ministérielle (CD1, CD2, CD3)' }
  ];
  /** Formule écrite en ligne (« C = m ÷ V », « C = m / V ») : interdite dans les démarches. */
  const FORMULE_EN_LIGNE = /\b[A-Za-z]\s*=\s*[A-Za-z](?:_\{?[^}\s]*\}?)?\s*[÷/]\s*[A-Za-z]\b/;

  // ----------------------------------------------------------------------
  // Outils
  // ----------------------------------------------------------------------
  function texte(v) { return String(v == null ? '' : v).trim(); }
  function liste(v) { return Array.isArray(v) ? v : []; }

  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }

  function booleen(v) {
    if (typeof v === 'boolean') return v;
    const s = texte(v).toLowerCase();
    if (['true', 'vrai', 'oui', '1'].indexOf(s) >= 0) return true;
    if (['false', 'faux', 'non', '0'].indexOf(s) >= 0) return false;
    return null;
  }

  function nombrePositif(v) {
    const n = Number(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) && n > 0 ? Math.round(n * 2) / 2 : null;
  }

  function entier(v, min, max) {
    const n = Math.round(Number(String(v == null ? '' : v).replace(',', '.')));
    if (!isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
  }

  function cle(v) {
    return texte(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  }
  function cleType(v) { return ALIAS_TYPES[cle(v)] || ''; }

  /** Nombre français : 2,5 et non 2.5. */
  function nombreFr(n) { return String(n).replace('.', ','); }
  function points(n) { return nombreFr(n) + (n > 1 ? ' points' : ' point'); }

  /** Texte de l'IA → HTML : échappé, **gras**, sauts de ligne ; le LaTeX entre \( et \) est gardé pour MathJax. */
  function enrichi(t) {
    return String(t == null ? '' : t).trim().split(/\n\s*\n/).map(function (p) {
      return echapper(p.trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }).join('<br><br>');
  }

  /** Mélange de Fisher-Yates (ordre des choix d'une nouvelle version). */
  function melanger(t) {
    const a = t.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  function lettre(i) { return String.fromCharCode(97 + i); }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  const MODELE_JSON = [
    '{',
    '  "titre": "Titre de l\'examen, tel qu\'il figure sur la copie, en casse de phrase",',
    '  "version": "B",',
    '  "matiere": "Science et technologie, 3e secondaire",',
    '  "consigne": "Consigne générale de l\'examen, telle qu\'elle figure sous le titre (vide s\'il n\'y en a pas).",',
    '  "cartouche": ["Nom", "Groupe"],',
    '  "bareme_en_marge": true,',
    '  "questions": [',
    '    {',
    '      "page": 1,',
    '      "type": "calcul",',
    '      "titre": "Concept évalué, en quelques mots (pour le corrigé seulement)",',
    '      "points": 2,',
    '      "enonce": "Quelle serait la concentration en g/L d\'une solution de 250 mL qui contient 8 g de soluté ?",',
    '      "blocs": [{ "bloc": "zone", "forme": "cadre", "hauteur": 6 }],',
    '      "ligne_reponse": [{ "etiquette": "en g/L", "attendu": "32 g/L" }],',
    '      "alignement": "droite",',
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
    '            "titre": "La masse de soluté dans 1 L",',
    '            "inconnue": "Soit x la masse de soluté, en grammes (g), dans 1 L de solution.",',
    '            "lignes": [["8 g", "0,25 L"], ["x", "1 L"]],',
    '            "symbole": "x",',
    '            "calcul": { "num": "8 [g] × 1 [[L]]", "den": "0,25 [[L]]" },',
    '            "resultat": "32 g",',
    '            "biffage": "Les L s\'annulent en haut et en bas : il reste des grammes."',
    '          }',
    '        ],',
    '        "verification": "Il y a 4 fois 250 mL dans 1 L : 4 × 8 g = 32 g."',
    '      },',
    '      "methode_b": {',
    '        "lignes": ["V = 250 mL = 0,25 L", "C = \\\\dfrac{8\\\\ [g]}{0,25\\\\ [L]}"],',
    '        "symbole": "C",',
    '        "resultat": "32 g/L"',
    '      },',
    '      "erreurs_frequentes": [',
    '        { "reponse": "0,032 g/L", "erreur": "le volume est laissé en mL (8 ÷ 250)" },',
    '        { "reponse": "0,03125 g/L", "erreur": "la formule est inversée (0,25 ÷ 8)" }',
    '      ]',
    '    },',
    '    {',
    '      "page": 1,',
    '      "type": "choix",',
    '      "titre": "...",',
    '      "points": 1,',
    '      "enonce": "...",',
    '      "choix": [',
    '        { "texte": "...", "correct": true, "justification": "Pourquoi ce choix est juste." },',
    '        { "texte": "...", "correct": false, "justification": "L\'erreur typique que représente ce choix." },',
    '        { "texte": "...", "correct": false, "justification": "..." },',
    '        { "texte": "...", "correct": false, "justification": "..." }',
    '      ]',
    '    },',
    '    {',
    '      "page": 2,',
    '      "type": "ouverte",',
    '      "titre": "...",',
    '      "points": 2,',
    '      "enonce": "Explique pourquoi ...",',
    '      "blocs": [{ "bloc": "zone", "forme": "lignes", "hauteur": 4 }],',
    '      "reponse_attendue": "Réponse modèle complète.",',
    '      "criteres": "1 point pour ..., 1 point pour ..."',
    '    },',
    '    {',
    '      "page": 2,',
    '      "type": "ouverte",',
    '      "titre": "...",',
    '      "points": 4,',
    '      "enonce": "Illustre, à l\'aide de ..., chacun des éléments suivants (2 points chacun) :",',
    '      "blocs": [',
    '        { "bloc": "elements", "forme": "cadre", "colonnes": 2, "hauteur": 7, "elements": [',
    '          { "texte": "...", "attendu": "Description précise du dessin attendu." },',
    '          { "texte": "...", "attendu": "..." }',
    '        ] }',
    '      ],',
    '      "criteres": "..."',
    '    },',
    '    {',
    '      "page": 2,',
    '      "type": "ouverte",',
    '      "titre": "...",',
    '      "points": 3,',
    '      "enonce": "Inscris ... de chacun des éléments suivants. Au besoin, consulte le tableau.",',
    '      "blocs": [',
    '        { "bloc": "elements", "forme": "trait", "colonnes": 3, "elements": [',
    '          { "texte": "...", "attendu": "..." },',
    '          { "texte": "...", "attendu": "..." },',
    '          { "texte": "...", "attendu": "..." }',
    '        ] },',
    '        { "bloc": "tableau", "titre": "...", "entetes": ["...", "..."], "lignes": [["...", "..."], ["...", "..."]] }',
    '      ],',
    '      "criteres": "1 point par réponse exacte."',
    '    }',
    '  ]',
    '}'
  ];

  function construireConsigne(ctx) {
    const version = ctx.mode === 'version';
    const lettreVersion = texte(ctx.version) || 'B';
    const texteSource = texte(ctx.texteSource);
    const source = texteSource
      ? 'L\'examen est fourni à la fin de cette consigne, sous « EXAMEN ». Appuie-toi uniquement sur ce texte.'
      : 'L\'examen est joint à ce message (PDF, Word ou photo). Appuie-toi uniquement sur ce document. S\'il n\'y a aucun document joint, ou si tu ne peux pas le lire, dis-le clairement et ne produis aucun JSON : n\'invente jamais les questions.';
    const lignes = [
      version
        ? 'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu produis une nouvelle version (version ' + lettreVersion + ') d\'un examen papier, pour la reprise ou pour prévenir le plagiat, ainsi que son corrigé complet pour l\'enseignant.'
        : 'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu rédiges le corrigé complet et détaillé d\'un examen papier, pour l\'enseignant.',
      '',
      version ? 'NOUVELLE VERSION D\'EXAMEN' : 'CORRIGÉ D\'EXAMEN',
      '- Sujet : ' + (ctx.sujet || 'déduis-le de l\'examen'),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '',
      source
    ];
    if (texte(ctx.precisions)) lignes.push('', 'PRÉCISIONS DE L\'ENSEIGNANT', texte(ctx.precisions));
    lignes.push('', 'RÈGLES');
    if (version) {
      lignes.push(
        '1. Garde exactement la même structure : même titre, mêmes concepts et mêmes critères d\'évaluation, même nombre de questions dans le même ordre, mêmes types de questions, même barème, même consigne générale, même cartouche et mêmes lignes de réponse.',
        '2. Renouvelle les données numériques : de nouvelles valeurs plausibles et cohérentes sur le plan scientifique, de difficulté équivalente, dont les résultats restent raisonnables (pas de décimales interminables). Tu peux changer le contexte d\'un problème (une autre substance, un autre objet), sans changer le concept évalué.',
        '3. Recalcule chaque réponse avec les nouvelles valeurs. Pour les choix de réponse, recalcule aussi les distracteurs à partir des erreurs fréquentes des élèves appliquées aux nouvelles valeurs.',
        '4. "version" : "' + lettreVersion + '".'
      );
    } else {
      lignes.push(
        '1. Reprends toutes les questions de l\'examen, dans l\'ordre, avec exactement les mêmes énoncés, les mêmes données numériques et les mêmes choix de réponse dans le même ordre : le corrigé doit correspondre mot pour mot à la copie de l\'élève.',
        '2. "version" : la version indiquée sur l\'examen (ex. : "A"), sinon "".',
        '3. Résous chaque question sans erreur. Vérifie chaque calcul deux fois.',
        '4. Si l\'examen n\'indique pas de barème, donne 1 point par réponse attendue.'
      );
    }
    lignes.push(
      '5. "page" : le numéro de la page de l\'examen original où se trouve la question. La nouvelle copie doit avoir le même nombre de pages, avec les mêmes questions sur chaque page.',
      B().regles(6).join('\n'),
      '7. "ligne_reponse" : les lignes de réponse de l\'original, en bas de la question (ex. : « Réponse : en g/L ____ en % ____ » devient deux éléments, "en g/L" et "en %"). "etiquette" est le texte écrit avant la ligne (vide si la ligne suit seulement « Réponse : ») ; "attendu" est la réponse exacte que l\'élève doit écrire, avec son unité. "alignement" : "droite" si la ligne est à droite de la page, sinon "gauche". Omets "ligne_reponse" si la question n\'en a pas.',
      '8. "enonce" : en texte simple, sans HTML et sans numéro (la numérotation est automatique). Les symboles et formules s\'écrivent en LaTeX entre \\( et \\), par exemple \\( CO_2 \\). Si la question s\'appuie sur un schéma ou une image, ajoute "figure" : une courte description de l\'image (l\'enseignant l\'ajoutera) ; un tableau de données n\'est jamais une "figure", c\'est un bloc "tableau".',
      '9. Types de questions : "calcul" (problème avec démarche), "choix" (choix de réponse ou vrai ou faux ; l\'élève encercle la lettre) et "ouverte" (réponse rédigée).',
      '10. Calculs : chaque question "calcul" a une "demarche" résolue selon la méthode A, en produit croisé, à la manière d\'un humain :',
      '   - "formule" : la formule originale, en première ligne, écrite en fraction : "gauche" (la grandeur calculée), "numerateur" et "denominateur" (variables avec indice après « _ », ex. "m_soluté"), et "legende" qui définit chaque variable avec son unité. Pour une simple équivalence d\'unités, "formule" est un texte (ex. : "1 L = 1 000 mL").',
      '   - "etapes" : pour chaque réponse à trouver, "inconnue" déclare la lettre cherchée et son unité ; "lignes" donne les deux fractions égales [[numérateur, dénominateur], [numérateur, dénominateur]], avec l\'inconnue au numérateur de l\'une d\'elles et les valeurs écrites avec leurs unités ; "symbole" est la lettre de l\'inconnue ; "calcul" donne le numérateur et le dénominateur du calcul final ; "resultat" est la valeur avec son unité.',
      '   - Dans "calcul", une unité qui s\'annule s\'écrit entre doubles crochets ([[L]]) et une unité qui reste entre crochets simples ([g]). Les puissances s\'écrivent ^2, les racines \\sqrt{...} et les indices après « _ », sans \\( ni \\).',
      '   - "methode_b" : la même résolution selon la méthode B, par transformation algébrique : "lignes" donne, dans l\'ordre, les conversions, l\'isolation de l\'inconnue puis la substitution des valeurs avec leurs unités ; "symbole" et "resultat" donnent la réponse finale encadrée. Ces lignes suivent la même écriture que "calcul" ; une fraction s\'écrit \\dfrac{...}{...}.',
      '   - "erreurs_frequentes" : deux ou trois réponses erronées fréquentes, chacune avec l\'erreur de raisonnement qu\'elle révèle.',
      '   - N\'écris jamais une formule en ligne du type « C = m ÷ V » et jamais de tableau avec des flèches.',
      '11. Choix de réponse : un seul choix correct ; chaque choix a sa "justification" (pourquoi il est juste, ou l\'erreur typique qu\'il représente).',
      '12. Réponse rédigée : "reponse_attendue" est une réponse modèle complète (facultative si les blocs donnent déjà toutes les réponses : "attendu" de chaque élément, "reponses" d\'une association, "attendu" d\'un tableau) ; "criteres" répartit les points.',
      '13. "titre" : le concept évalué, en casse de phrase (il n\'apparaît que dans le corrigé).',
      '14. Français standard du Québec. Le document de l\'élève ne contient jamais la mention « PFEQ » ni les compétences CD1, CD2 ou CD3.',
      '15. "bareme_en_marge" : true si l\'original indique les points de chaque question dans la marge de droite (ex. : « /8 »), sinon false.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Dans le JSON, chaque barre oblique inverse du LaTeX est doublée (\\\\). Respecte exactement cette structure (un modèle par type de question ; les « ... » sont à remplacer, et chaque type peut servir plusieurs fois ou pas du tout) :',
      ''
    );
    const modele = MODELE_JSON.slice();
    modele[2] = '  "version": "' + (version ? lettreVersion.replace(/["\\]/g, '') : 'A') + '",';
    Array.prototype.push.apply(lignes, modele);
    if (texteSource) lignes.push('', 'EXAMEN', texteSource);
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation
  // ----------------------------------------------------------------------
  function versLigneReponse(l) {
    if (typeof l === 'string') return { etiquette: '', attendu: texte(l) };
    l = l || {};
    return { etiquette: texte(l.etiquette || l.étiquette || l.libelle || l.label), attendu: texte(l.attendu || l.reponse || l.réponse) };
  }

  function versMethodeB(m) {
    if (!m) return null;
    if (Array.isArray(m)) m = { lignes: m };
    if (typeof m !== 'object') return null;
    const r = {
      lignes: liste(m.lignes || m.etapes || m.étapes).map(texte).filter(Boolean),
      symbole: texte(m.symbole),
      resultat: texte(m.resultat || m.résultat)
    };
    return r.lignes.length || r.resultat ? r : null;
  }

  function versQuestion(src, i, ctx, notes) {
    src = src || {};
    const type = cleType(src.type) || (src.choix ? 'choix' : src.demarche ? 'calcul' : 'ouverte');
    if (!cleType(src.type)) notes.types = true;
    const q = {
      id: 'q' + (i + 1),
      numero: texte(src.numero || src.numéro) || String(i + 1),
      page: entier(src.page, 1, 50) || 1,
      type: type,
      titre: texte(src.titre),
      points: nombrePositif(src.points) || 1,
      enonce: texte(src.enonce || src.énoncé || src.question).replace(/^\s*(?:\d+[a-z]?|Q\s*\d+)\s*[.)–—-]\s+/i, function () { notes.numeros = true; return ''; }),
      ligneReponse: liste(src.ligne_reponse || src.lignes_reponse || src.ligneReponse).map(versLigneReponse)
        .filter(function (l) { return l.etiquette || l.attendu; }),
      alignement: /droite|right/i.test(texte(src.alignement)) ? 'droite' : 'gauche',
      figure: texte(src.figure || src.description_image),
      image: texte(src.image).indexOf('data:image/') === 0 ? texte(src.image) : ''
    };
    if (src.page == null) notes.pages = true;
    if (type === 'calcul') {
      q.demarche = src.demarche ? SC().outils.versDemarche(src.demarche, notes) : null;
      q.methodeB = versMethodeB(src.methode_b || src.methodeB || src.méthode_b);
      q.erreursFrequentes = liste(src.erreurs_frequentes || src.erreurs || src.distracteurs).map(function (e) {
        if (typeof e === 'string') return { reponse: '', erreur: texte(e) };
        e = e || {};
        return { reponse: texte(e.reponse || e.réponse), erreur: texte(e.erreur || e.explication) };
      }).filter(function (e) { return e.erreur || e.reponse; });
    } else if (type === 'choix') {
      let choix = liste(src.choix || src.options).map(function (c) {
        if (typeof c === 'string') return { texte: texte(c), correct: false, justification: '' };
        c = c || {};
        return { texte: texte(c.texte || c.text), correct: booleen(c.correct) === true, justification: texte(c.justification || c.retroaction || c.explication) };
      }).filter(function (c) { return c.texte; });
      // Nouvelle version : ordre des choix mélangé une fois pour toutes (copie et corrigé restent liés).
      // Corrigé d'un examen : l'ordre de la copie de l'élève est conservé.
      if (ctx.mode === 'version' && choix.length > 1) { choix = melanger(choix); notes.melange = true; }
      q.choix = choix;
    } else {
      q.reponseAttendue = texte(src.reponse_attendue || src.reponse || src.réponse || src.solution);
      q.criteres = texte(src.criteres || src.critères);
    }
    q.explication = texte(src.explication);
    B().normaliser(src, q, notes);
    return q;
  }

  /**
   * @returns {{ok: true, donnees, notes: string[]} | {ok: false, erreur: string}}
   */
  function normaliser(v, ctx) {
    ctx = ctx || {};
    if (Array.isArray(v)) v = { questions: v };
    if (!v || typeof v !== 'object') return { ok: false, erreur: 'La réponse n\'est pas un objet JSON.' };
    const brutes = liste(v.questions);
    if (!brutes.length) return { ok: false, erreur: 'La réponse ne contient aucune question (« questions »).' };
    const n = {};
    const d = {
      mode: ctx.mode === 'corrige' ? 'corrige' : 'version',
      titre: texte(v.titre) || texte(ctx.sujet) || 'Examen',
      version: texte(v.version).replace(/^version\s+/i, ''),
      matiere: texte(v.matiere || v.matière || ctx.niveau),
      consigne: texte(v.consigne),
      cartouche: liste(v.cartouche).map(texte).filter(Boolean),
      baremeMarge: booleen(v.bareme_en_marge) === true,
      questions: brutes.map(function (q, i) { return versQuestion(q, i, ctx, n); })
    };
    if (!d.cartouche.length) { d.cartouche = ['Nom', 'Groupe']; n.cartouche = true; }
    // Pages renumérotées 1, 2, 3… dans l'ordre (aucune page vide).
    const vues = [];
    d.questions.forEach(function (q) { if (vues.indexOf(q.page) < 0) vues.push(q.page); });
    vues.sort(function (a, b) { return a - b; });
    d.questions.forEach(function (q) { q.page = vues.indexOf(q.page) + 1; });
    if (vues.some(function (p, i) { return p !== i + 1; })) n.renumerotees = true;

    const notes = [];
    if (n.numeros) notes.push('Numéros retirés au début des énoncés (la numérotation est automatique).');
    if (n.types) notes.push('Type de question déduit de son contenu pour une ou plusieurs questions.');
    if (n.pages) notes.push('Page manquante pour une ou plusieurs questions : elles sont placées en page 1.');
    if (n.renumerotees) notes.push('Pages renumérotées à la suite.');
    if (n.cartouche) notes.push('Cartouche ajouté : « Nom » et « Groupe ».');
    if (n.calculs) notes.push('Calcul final déduit des deux fractions pour une ou plusieurs étapes.');
    if (n.melange) notes.push('Ordre des choix de réponse mélangé pour la nouvelle version (copie et corrigé correspondent).');
    Array.prototype.push.apply(notes, B().notesLecture(n));
    return { ok: true, donnees: d, notes: notes };
  }

  /** Projet enregistré avant l'ajout des blocs de mise en page : conversion. */
  function completer(d) {
    liste(d && d.questions).forEach(function (q) {
      if (!Array.isArray(q.ligneReponse)) q.ligneReponse = [];
      B().completer(q);
      delete q.espace;
    });
    return d;
  }

  // ----------------------------------------------------------------------
  // Vérification
  // ----------------------------------------------------------------------
  function totalPoints(d) {
    return d.questions.reduce(function (s, q) { return s + q.points; }, 0);
  }
  function nbPages(d) {
    return d.questions.reduce(function (m, q) { return Math.max(m, q.page); }, 1);
  }

  function valider(d, ctx) {
    ctx = ctx || {};
    const erreurs = [];
    const avertissements = [];
    if (!d.questions.length) erreurs.push({ lieu: 'Réponse', msg: 'aucune question.' });
    const eleve = [d.titre, d.consigne].concat(d.questions.map(function (q) {
      return q.enonce + '\n' + (q.choix || []).map(function (c) { return c.texte; }).join('\n') + '\n' +
        B().texteEleve(q) + '\n' +
        q.ligneReponse.map(function (l) { return l.etiquette; }).join('\n');
    })).join('\n');
    MOTS_INTERDITS_ELEVE.forEach(function (m) {
      if (m.re.test(eleve)) erreurs.push({ lieu: 'Copie de l\'élève', msg: 'contient ' + m.texte + '.' });
    });
    if (d.mode === 'version' && !d.version) avertissements.push({ lieu: 'Version', msg: 'la lettre de la version est absente ("version") : la copie ne la mentionnera pas.' });
    if (ctx.nbPages && nbPages(d) !== ctx.nbPages) {
      avertissements.push({ lieu: 'Pages', msg: 'l\'examen original compte ' + ctx.nbPages + ' page(s), la réponse en prévoit ' + nbPages(d) + '.' });
    }

    d.questions.forEach(function (q, i) {
      const lieu = 'Question ' + q.numero;
      if (!q.enonce) erreurs.push({ lieu: lieu, msg: 'l\'énoncé est vide ("enonce").' });
      if (!q.titre) avertissements.push({ lieu: lieu, msg: 'le concept évalué ("titre") est absent : le corrigé affichera seulement le numéro.' });
      if (q.figure && !q.image) avertissements.push({ lieu: lieu, msg: 'le schéma « ' + q.figure + ' » est à ajouter à l\'aperçu.' });
      if (q.type === 'calcul') {
        if (!q.demarche) erreurs.push({ lieu: lieu, msg: 'la démarche (méthode A, "demarche") est manquante.' });
        else {
          SC().outils.verifierDemarche(q.demarche, lieu, erreurs, avertissements);
          const tout = JSON.stringify(q.demarche);
          if (typeof q.demarche.formule === 'string' && FORMULE_EN_LIGNE.test(q.demarche.formule)) {
            erreurs.push({ lieu: lieu, msg: 'la formule est écrite en ligne (« ' + q.demarche.formule + ' ») : elle doit être écrite en fraction, avec "numerateur", "denominateur" et "legende".' });
          } else if (/[↔⇄]/.test(tout)) {
            erreurs.push({ lieu: lieu, msg: 'la démarche contient des flèches de correspondance : le produit croisé s\'écrit en fractions.' });
          }
        }
        if (!q.methodeB) avertissements.push({ lieu: lieu, msg: 'la résolution selon la méthode B ("methode_b") est absente.' });
        else if (!q.methodeB.resultat) avertissements.push({ lieu: lieu, msg: 'la méthode B n\'a pas de résultat final ("resultat").' });
        if (!q.ligneReponse.length) avertissements.push({ lieu: lieu, msg: 'aucune ligne de réponse ("ligne_reponse") : la copie n\'en affichera pas.' });
        q.ligneReponse.forEach(function (l) {
          if (!l.attendu) erreurs.push({ lieu: lieu, msg: 'la réponse attendue de la ligne « ' + (l.etiquette || 'Réponse') + ' » est vide ("attendu").' });
          else if (!/[a-zA-Zµ%°]/.test(l.attendu.replace(/^[^\d]*/, ''))) avertissements.push({ lieu: lieu, msg: 'la réponse « ' + l.attendu + ' » n\'indique pas d\'unité.' });
        });
        if (!q.erreursFrequentes.length) avertissements.push({ lieu: lieu, msg: 'aucune erreur fréquente ("erreurs_frequentes") pour justifier les distracteurs.' });
      } else if (q.type === 'choix') {
        const bons = q.choix.filter(function (c) { return c.correct; }).length;
        if (q.choix.length < 2) erreurs.push({ lieu: lieu, msg: 'il faut au moins deux choix de réponse.' });
        if (bons !== 1) erreurs.push({ lieu: lieu, msg: bons ? 'plusieurs choix sont marqués corrects : un seul doit l\'être.' : 'aucun choix n\'est marqué correct.' });
        if (q.choix.some(function (c) { return !c.justification; })) avertissements.push({ lieu: lieu, msg: 'un ou plusieurs choix n\'ont pas de justification.' });
      } else {
        if (!q.reponseAttendue && !B().donnentLaReponse(q)) erreurs.push({ lieu: lieu, msg: 'la réponse modèle ("reponse_attendue") est manquante.' });
      }
      B().valider(q, lieu, erreurs, avertissements);
      if (i > 0 && q.page < d.questions[i - 1].page) avertissements.push({ lieu: lieu, msg: 'elle est placée sur une page antérieure à la question précédente.' });
    });
    return { erreurs: erreurs, avertissements: avertissements };
  }

  /** Demande d'image à coller dans Gemini ou Copilot pour le schéma d'une question d'examen papier. */
  function demandeImage(q, d, niveau) {
    return [
      'Crée l\'image d\'une question d\'examen papier de sciences au secondaire, au Québec' + (niveau || d.matiere ? ' (' + (niveau || d.matiere) + ')' : '') + '.',
      '',
      'Question posée à l\'élève : ' + q.enonce.replace(/\s*\n\s*/g, ' '),
      'Image attendue : ' + q.figure,
      '',
      'Contraintes :',
      '- Image PNG ou JPEG, fond blanc, en noir et gris seulement : elle sera imprimée en noir et blanc.',
      '- Style clair et rigoureux de manuel scolaire, traits nets, sans décor ni ombre.',
      '- Seulement le texte décrit ci-dessus (symboles, valeurs, noms), écrit lisiblement, sans faute ; aucun titre, aucune consigne, aucun numéro de question.',
      '- L\'image ne doit jamais montrer la réponse attendue de l\'élève.',
      '- Rapport largeur-hauteur adapté au contenu : paysage pour une rangée d\'éléments, carré pour un schéma.'
    ].join('\n');
  }

  function consigneCorrection(erreurs) {
    return [
      'Ta réponse ne respecte pas certaines règles de la consigne. Corrige uniquement les points suivants, sans rien changer d\'autre :',
      ''
    ].concat(erreurs.map(function (e) { return '- ' + e.lieu + ' : ' + e.msg; }), [
      '',
      'Renvoie le JSON complet corrigé, dans un seul bloc de code, sans aucun texte avant ni après.'
    ]).join('\n');
  }

  /**
   * Relecture facultative dans la conversation avec l'IA, avant de copier le JSON.
   * L'aperçu en markdown sert à relire le contenu ; il ne remplace pas le JSON importé.
   */
  function consigneRelecture(ctx) {
    const version = (ctx && ctx.mode) !== 'corrige';
    return [
      'Présente le JSON de ta réponse précédente sous forme d\'aperçu en markdown, pour que je relise les questions avant de les importer.',
      '',
      '- Reprends exactement le contenu du JSON : ne recalcule rien, ne corrige rien et ne reformule rien.',
      '- Pour chaque question, dans l\'ordre : numéro, page, points, énoncé, choix de réponse (en indiquant le bon), réponse attendue avec son unité, et les étapes de calcul de la démarche.',
      '- Si tu repères une erreur (' + (version ? 'réponse ou distracteur non recalculé avec les nouvelles valeurs, ' : '') +
        'calcul faux, unité manquante, valeur peu plausible, aucun ou plusieurs bons choix), signale-la à la fin, dans une section « Erreurs repérées », sans modifier l\'aperçu.',
      '- Ne renvoie pas le JSON dans cette réponse.',
      '',
      'Si je te demande ensuite une correction, renvoie toujours le JSON complet corrigé, dans un seul bloc de code, sans aucun texte avant ni après.'
    ].join('\n');
  }

  // ----------------------------------------------------------------------
  // Documents imprimables (format lettre)
  // ----------------------------------------------------------------------
  function titreAvecVersion(d) {
    return d.titre + (d.version ? ' — Version ' + d.version : '');
  }
  function titreDocument(d, type) {
    return type === 'corrige' ? 'Corrigé — ' + titreAvecVersion(d) : titreAvecVersion(d);
  }
  function nomFichier(d, type) {
    const base = titreAvecVersion(d).replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Examen';
    return base + ' — ' + (type === 'corrige' ? 'corrigé' : 'examen') + '.html';
  }

  /** Questions regroupées par page. */
  function parPage(d) {
    const pages = [];
    d.questions.forEach(function (q) {
      (pages[q.page - 1] = pages[q.page - 1] || []).push(q);
    });
    return pages.filter(Boolean);
  }

  function figureHtml(q) {
    if (q.image) return '<figure class="q-figure"><img src="' + echapper(q.image) + '" alt="' + echapper(q.figure || 'Schéma de la question ' + q.numero) + '"></figure>';
    if (q.figure) return '<p class="q-figure-manquante ecran-seulement">Schéma à ajouter : ' + echapper(q.figure) + '</p>';
    return '';
  }

  /** Ligne « Réponse : … ____ … ____ » de la copie ; avec les réponses attendues dans le corrigé. */
  function ligneReponseHtml(q, avecReponses) {
    if (!q.ligneReponse.length) return '';
    return '<p class="ligne-reponse' + (q.alignement === 'droite' ? ' a-droite' : '') + '">Réponse :' +
      q.ligneReponse.map(function (l) {
        return (l.etiquette ? ' ' + echapper(l.etiquette) : '') +
          (avecReponses ? ' <strong class="attendu">' + echapper(l.attendu || '—') + '</strong>' : ' <span class="trait" aria-hidden="true"></span>');
      }).join('') + '</p>';
  }

  function cartoucheHtml(d) {
    return '<div class="cartouche">' + d.cartouche.map(function (c) {
      const court = /groupe|date|note|classe/i.test(c);
      const note = /^note$/i.test(c);
      return '<span class="cartouche-champ">' + echapper(c) + ' : <span class="trait ' + (court ? 'trait-court' : 'trait-long') + '" aria-hidden="true"></span>' +
        (note ? ' / ' + nombreFr(totalPoints(d)) : '') + '</span>';
    }).join('') + '</div>';
  }

  function questionExamenHtml(q, baremeMarge) {
    const choix = q.type === 'choix' ? '<ol class="q-choix">' + q.choix.map(function (c, i) {
      return '<li><span class="q-lettre">' + lettre(i) + ')</span> ' + enrichi(c.texte) + '</li>';
    }).join('') + '</ol>' : '';
    const bareme = baremeMarge ? '<span class="q-bareme">/' + nombreFr(q.points) + '</span>' : '';
    return '<section class="question" aria-label="Question ' + echapper(q.numero) + '">' +
      '<p class="q-enonce">' + bareme + '<strong>' + echapper(q.numero) + '.</strong> ' + enrichi(q.enonce) + '</p>' +
      figureHtml(q) + choix + B().copieHtml(q) + ligneReponseHtml(q, false) + '</section>';
  }

  function feuillesExamen(d) {
    return parPage(d).map(function (qs, p) {
      return '<article class="feuille feuille-examen" aria-label="Page ' + (p + 1) + '">' +
        (p === 0 ? '<header class="entete-examen">' + cartoucheHtml(d) +
          '<h1 class="titre-examen">' + echapper(d.titre) + (d.version ? '<span class="version"> — Version ' + echapper(d.version) + '</span>' : '') + '</h1>' +
          (d.consigne ? '<p class="consigne-examen">' + enrichi(d.consigne) + '</p>' : '') + '</header>' : '') +
        qs.map(function (q) { return questionExamenHtml(q, d.baremeMarge); }).join('') +
        '</article>';
    }).join('');
  }

  function enJson(o) { return echapper(JSON.stringify(o)); }

  function carteCorrigeHtml(q) {
    let corps = '';
    if (q.type === 'calcul') {
      corps += '<div class="methodes">';
      if (q.demarche) {
        corps += '<div class="methode"><p class="methode-nom">Méthode A — produit croisé à partir de la formule</p>' +
          '<div class="methode-corps" data-demarche="' + enJson(q.demarche) + '"></div></div>';
      }
      if (q.methodeB) {
        const f = q.demarche && q.demarche.formule;
        const formule = f && typeof f === 'object' ? { gauche: f.gauche, num: f.num, den: f.den } : (f || null);
        corps += '<div class="methode"><p class="methode-nom">Méthode B — transformation algébrique avant la substitution</p>' +
          '<div class="methode-corps" data-methode-b="' + enJson({ formule: formule, lignes: q.methodeB.lignes, symbole: q.methodeB.symbole, resultat: q.methodeB.resultat }) + '"></div></div>';
      }
      corps += '</div>';
    } else if (q.type === 'choix') {
      corps += '<ol class="corrige-choix">' + q.choix.map(function (c, i) {
        return '<li class="' + (c.correct ? 'est-correct' : '') + '"><span class="q-lettre">' + lettre(i) + ')</span> ' +
          '<span><span class="choix-texte">' + enrichi(c.texte) + '</span>' +
          (c.correct ? ' <strong class="etiquette-correct">Bonne réponse</strong>' : '') +
          (c.justification ? '<span class="choix-justification">' + enrichi(c.justification) + '</span>' : '') + '</span></li>';
      }).join('') + '</ol>';
    } else {
      corps += (q.reponseAttendue || !B().donnentLaReponse(q) ? '<p class="reponse-modele"><strong>Réponse attendue :</strong> ' + enrichi(q.reponseAttendue || '—') + '</p>' : '') +
        (q.criteres ? '<p class="criteres"><strong>Critères :</strong> ' + enrichi(q.criteres) + '</p>' : '');
    }
    if (q.explication) corps += '<p class="explication">' + enrichi(q.explication) + '</p>';
    const bonne = q.type === 'choix' ? q.choix.findIndex(function (c) { return c.correct; }) : -1;
    const blocs = B().corrigeHtml(q);
    const copie = blocs ? blocs + ligneReponseHtml(q, true)
      : q.ligneReponse.length ? ligneReponseHtml(q, true)
      : bonne >= 0 ? '<p class="ligne-reponse">Encercler <strong class="attendu">' + lettre(bonne) + ')</strong></p>' : '';
    if (copie) corps += '<div class="sur-la-copie"><span class="sur-la-copie-nom">Sur la copie élève</span>' + copie + '</div>';
    if (q.erreursFrequentes && q.erreursFrequentes.length) {
      corps += '<p class="erreurs-frequentes"><strong>Erreurs fréquentes :</strong> ' + q.erreursFrequentes.map(function (e) {
        return (e.reponse ? '<span class="nombres">' + echapper(e.reponse) + '</span>' + (e.erreur ? ' (' + echapper(e.erreur) + ')' : '') : echapper(e.erreur));
      }).join(' ; ') + '.</p>';
    }
    return '<section class="carte" aria-labelledby="titre-' + q.id + '">' +
      '<div class="carte-tete"><h2 class="carte-titre" id="titre-' + q.id + '">' + echapper(q.numero) + '. ' + echapper(q.titre || TYPES[q.type]) + '</h2>' +
      '<span class="carte-points">' + points(q.points) + '</span></div>' +
      '<p class="carte-enonce"><strong>Énoncé :</strong> ' + enrichi(q.enonce) + '</p>' +
      figureHtml(q) + corps + '</section>';
  }

  function grilleHtml(d) {
    const total = totalPoints(d);
    return '<section class="grille" aria-labelledby="titre-grille"><h2 id="titre-grille" class="carte-titre">Grille de correction</h2>' +
      '<table><thead><tr><th scope="col">Question</th><th scope="col">Réponse attendue</th><th scope="col" class="nombres">Points</th></tr></thead><tbody>' +
      d.questions.map(function (q) {
        const bonne = q.type === 'choix' ? q.choix.findIndex(function (c) { return c.correct; }) : -1;
        const viaBlocs = B().grilleTexte(q);
        const rep = viaBlocs && !q.ligneReponse.length ? viaBlocs
          : q.ligneReponse.length ? q.ligneReponse.map(function (l) { return (l.etiquette ? l.etiquette + ' : ' : '') + (l.attendu || '—'); }).join(' ; ')
          : bonne >= 0 ? lettre(bonne) + ') ' + q.choix[bonne].texte
          : (q.reponseAttendue || '—');
        return '<tr><td class="nombres">' + echapper(q.numero) + '</td><td>' + enrichi(rep.length > 160 ? rep.slice(0, 157) + '…' : rep) + '</td><td class="nombres">' + nombreFr(q.points) + '</td></tr>';
      }).join('') +
      '</tbody><tfoot><tr><th scope="row" colspan="2">Total</th><td class="nombres"><strong>' + nombreFr(total) + '</strong></td></tr></tfoot></table></section>';
  }

  function enteteSuite(d, p, n) {
    return '<header class="entete-corrige entete-suite"><div class="entete-ligne"><span class="titre-corrige-suite">' + echapper(titreAvecVersion(d)) + ' — corrigé (suite)</span>' +
      '<span class="entete-meta">Page <span class="num-page">' + p + '</span> sur <span class="nb-pages">' + n + '</span></span></div></header>';
  }

  function feuillesCorrige(d) {
    const pages = parPage(d);
    const n = pages.length;
    const total = totalPoints(d);
    return pages.map(function (qs, p) {
      const entete = p === 0
        ? '<header class="entete-corrige"><div class="entete-ligne"><h1 class="titre-corrige">' + echapper(titreAvecVersion(d)) + '</h1>' +
            '<span class="entete-meta">Corrigé · ' + points(total) + ' · page <span class="num-page">1</span> sur <span class="nb-pages">' + n + '</span></span></div>' +
            (d.matiere ? '<p class="entete-sous-titre">' + echapper(d.matiere) + '</p>' : '') +
            '<p class="directives">Formule originale en première ligne, en fraction, avec sa légende ; résolution selon la méthode A (produit croisé) ou la méthode B (isolation algébrique) ; unités sur chaque nombre ; réponse finale encadrée avec son unité.</p></header>'
        : enteteSuite(d, p + 1, n);
      return '<article class="feuille feuille-corrige" data-entete-suite="' + echapper(enteteSuite(d, 0, 0)) + '">' + entete +
        qs.map(carteCorrigeHtml).join('') + (p === n - 1 ? grilleHtml(d) : '') + '</article>';
    }).join('');
  }

  const CSS = [
    ':root { --encre: #000000; --encre-douce: #334155; --trait: #000000; --bordure: #cbd5e1; --fond-doux: #f8fafc; --accent: #1d4ed8; --succes-fond: #f0fdf4; --succes-bordure: #86efac; --succes-encre: #14532d; --focus-ring: #2563eb; }',
    '* { box-sizing: border-box; }',
    'html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    'body { margin: 0; background: #e2e8f0; color: var(--encre); font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.45; font-variant-numeric: tabular-nums; }',
    '.skip-link { position: absolute; left: -9999px; top: 0; background: #ffffff; color: #0f172a; padding: 0.5rem 0.75rem; z-index: 10; }',
    '.skip-link:focus { left: 0.5rem; top: 0.5rem; outline: 3px solid var(--focus-ring); outline-offset: 2px; }',
    '.barre-ecran { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; background: #ffffff; border-bottom: 1px solid var(--bordure); padding: 0.5rem 1rem; font-size: 0.9rem; color: #0f172a; }',
    '.barre-ecran button { font: inherit; font-weight: 600; padding: 0.4rem 0.9rem; border-radius: 4px; border: 1px solid #0f172a; background: #0f172a; color: #ffffff; cursor: pointer; }',
    '.barre-ecran button:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }',
    '.liasse { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 1.5rem 0.5rem 3rem; }',
    '.feuille { width: 8.5in; height: 11in; padding: 0.55in 0.75in 0.6in; background: #ffffff; border: 1px solid var(--bordure); box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08); display: flex; flex-direction: column; position: relative; flex: none; }',
    '.feuille.deborde { outline: 2px dashed #b91c1c; outline-offset: 4px; }',
    '.trait { display: inline-block; border-bottom: 1px solid var(--trait); height: 1.1em; vertical-align: baseline; margin: 0 0.4em; }',
    '.trait-long { width: 3.3in; } .trait-court { width: 1.15in; }',
    /* Examen de l'élève */
    '.feuille-examen { font-size: 11.5pt; }',
    '.entete-examen { margin-bottom: 0.15in; flex: none; }',
    '.cartouche { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.1in 0.3in; font-weight: 600; margin-bottom: 0.2in; }',
    '.titre-examen { font-size: 16pt; font-weight: 700; text-align: center; margin: 0.05in 0 0.12in; letter-spacing: -0.01em; }',
    '.titre-examen .version { font-weight: 600; }',
    '.consigne-examen { font-style: italic; margin: 0 0 0.1in; }',
    '.question { display: flex; flex-direction: column; flex-shrink: 0; flex-basis: auto; margin-bottom: 0.12in; break-inside: avoid; }',
    '.q-enonce { margin: 0 0 0.06in; }',
    '.q-choix { list-style: none; margin: 0.02in 0 0.04in 0.25in; padding: 0; display: grid; gap: 0.03in; }',
    '.q-choix li { display: flex; gap: 0.4em; } .q-lettre { font-weight: 600; min-width: 1.4em; }',
    /* Zones à la hauteur demandée ; l'espace libre de la feuille se répartit également sous les questions. */
    '.feuille-examen .question { flex-grow: 1; }',
    '.q-espace { flex: none; }',
    '.q-espace-ligne { background-image: repeating-linear-gradient(to bottom, transparent 0, transparent calc(' + LIGNE_POUCES + 'in - 1px), #94a3b8 calc(' + LIGNE_POUCES + 'in - 1px), #94a3b8 ' + LIGNE_POUCES + 'in); }',
    B().CSS.join('\n'),
    '.q-bareme { float: right; margin-left: 0.3in; font-weight: 600; }',
    '.ligne-reponse { font-weight: 600; margin: 0.05in 0 0; }',
    '.ligne-reponse.a-droite { text-align: right; }',
    '.ligne-reponse .trait { width: 1.9in; }',
    '.q-figure { margin: 0.04in 0 0.08in; text-align: center; } .q-figure img { max-width: 100%; max-height: 2.6in; }',
    '.q-figure-manquante { border: 1px dashed #b45309; color: #78350f; background: #fffbeb; padding: 0.08in 0.12in; font-size: 10pt; margin: 0.04in 0 0.08in; }',
    /* Corrigé de l'enseignant */
    '.feuille-corrige { font-size: 9.5pt; line-height: 1.35; padding: 0.45in 0.6in 0.45in; color: #0f172a; }',
    '.entete-corrige { border-bottom: 1.5px solid #0f172a; padding-bottom: 0.05in; margin-bottom: 0.08in; flex: none; }',
    '.entete-ligne { display: flex; justify-content: space-between; align-items: baseline; gap: 0.2in; }',
    '.titre-corrige { font-size: 13pt; margin: 0; font-weight: 800; } .titre-corrige-suite { font-weight: 700; font-size: 10.5pt; }',
    '.entete-meta { font-weight: 700; white-space: nowrap; font-size: 9pt; }',
    '.entete-sous-titre { margin: 0.02in 0 0; color: var(--encre-douce); font-size: 9pt; }',
    '.directives { margin: 0.05in 0 0; padding: 0.04in 0.08in; border: 1px solid var(--bordure); background: var(--fond-doux); font-size: 8.5pt; color: var(--encre-douce); border-radius: 3px; }',
    '.carte { border: 1px solid var(--bordure); border-radius: 4px; padding: 0.06in 0.1in; margin-bottom: 0.07in; break-inside: avoid; flex: none; }',
    '.carte-tete { display: flex; justify-content: space-between; align-items: baseline; gap: 0.1in; }',
    '.carte-titre { font-size: 10pt; font-weight: 800; margin: 0; }',
    '.carte-points { font-size: 8.5pt; font-weight: 700; color: var(--encre-douce); white-space: nowrap; }',
    '.carte-enonce { margin: 0.02in 0 0.04in; color: var(--encre-douce); }',
    '.methodes { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 0.07in; margin: 0.04in 0; align-items: start; }',
    '.methode { border: 1px solid #e2e8f0; background: var(--fond-doux); border-radius: 3px; padding: 0.03in 0.07in; min-width: 0; }',
    '.methode-nom { margin: 0; font-size: 8pt; font-weight: 700; color: var(--accent); }',
    '.methode-corps p { margin: 0.02in 0; }',
    '.human-sheet { display: flex; flex-direction: column; gap: 0.02in; }',
    '.demarche-formule { display: flex; flex-wrap: wrap; align-items: center; gap: 0 0.15in; }',
    '.formule-ou { margin: 0; font-weight: 600; }',
    '.formule-legende { margin: 0; display: flex; flex-wrap: wrap; gap: 0 0.18in; }',
    '.formule-legende > div { display: flex; gap: 0.25em; align-items: baseline; } .formule-legende dd { margin: 0; }',
    '.demarche-tex { font-size: 8.5pt; overflow: visible; }',
    '.demarche-tex mjx-container[display="true"] { margin: 0.02in 0 !important; text-align: left !important; }',
    '.formule-ligne { font-size: 9.5pt; }',
    '.resolution-step-card { padding: 0.02in 0 0; }',
    '.step-label-pill { display: inline-block; font-weight: 700; font-size: 8.5pt; color: #0f172a; }',
    '.step-instruction { margin: 0.01in 0; }',
    '.corrige-compact .resolution-step-card > p.step-instruction ~ p.step-instruction { display: none; }',
    '.corrige-compact .unit-simplif-callout { display: none; }',
    '.unit-simplif-callout { display: flex; gap: 0.4em; font-size: 8.5pt; color: var(--encre-douce); } .simplif-badge { font-weight: 700; }',
    '.human-tip-box { font-size: 8.5pt; color: var(--encre-douce); margin-top: 0.02in; }',
    '.corrige-choix { list-style: none; margin: 0.03in 0; padding: 0; display: grid; gap: 0.03in; }',
    '.corrige-choix li { display: flex; gap: 0.4em; padding: 0.02in 0.06in; border: 1px solid transparent; border-radius: 3px; }',
    '.corrige-choix li.est-correct { background: var(--succes-fond); border-color: var(--succes-bordure); }',
    '.etiquette-correct { color: var(--succes-encre); }',
    '.choix-justification { display: block; color: var(--encre-douce); font-size: 8.5pt; }',
    '.reponse-modele, .criteres, .explication { margin: 0.03in 0; }',
    '.sur-la-copie { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.12in; background: var(--succes-fond); border: 1px solid var(--succes-bordure); color: var(--succes-encre); border-radius: 3px; padding: 0.03in 0.08in; margin: 0.04in 0 0.02in; }',
    '.sur-la-copie-nom { font-weight: 700; font-size: 8.5pt; }',
    '.sur-la-copie .ligne-reponse { margin: 0; font-weight: 600; text-align: left; }',
    '.attendu { border-bottom: 1px solid currentColor; padding: 0 0.2em; }',
    '.erreurs-frequentes { margin: 0.03in 0 0; font-size: 8.5pt; color: var(--encre-douce); }',
    '.grille { margin-top: auto; padding-top: 0.06in; break-inside: avoid; flex: none; }',
    '.grille table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 0.03in; }',
    '.grille th, .grille td { border: 1px solid var(--bordure); padding: 0.02in 0.06in; text-align: left; vertical-align: top; }',
    '.grille thead th, .grille tfoot th { background: var(--fond-doux); }',
    '.nombres { font-variant-numeric: tabular-nums; } .grille .nombres { text-align: right; white-space: nowrap; }',
    '@page { size: letter portrait; margin: 0; }',
    '@media print {',
    '  body { background: #ffffff; }',
    '  .barre-ecran, .skip-link, .ecran-seulement { display: none !important; }',
    '  .liasse { padding: 0; gap: 0; display: block; }',
    '  .feuille { border: 0; box-shadow: none; margin: 0; overflow: hidden; break-after: page; page-break-after: always; outline: 0 !important; }',
    '  .feuille:last-child { break-after: auto; page-break-after: auto; }',
    '}',
    '@media screen and (max-width: 8.8in) { .liasse { align-items: flex-start; overflow-x: auto; } }'
  ].join('\n');

  /** Script exécuté dans la page : démarches rendues par le moteur SCORM, puis MathJax (SVG). */
  const SCRIPT_DEMARCHES = [
    '(function () {',
    '  var D = window.ScormDemarche;',
    '  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\"": "&quot;" }[c]; }); }',
    '  function bloc(tex) { return "<div class=\\"demarche-tex\\">\\\\[ " + esc(tex) + " \\\\]</div>"; }',
    '  Array.prototype.forEach.call(document.querySelectorAll("[data-demarche]"), function (el) {',
    '    try { el.innerHTML = D.demarcheHtml(JSON.parse(el.getAttribute("data-demarche"))); }',
    '    catch (e) { el.textContent = "La démarche n\'a pas pu être affichée."; }',
    '    el.removeAttribute("data-demarche");',
    '  });',
    '  Array.prototype.forEach.call(document.querySelectorAll("[data-methode-b]"), function (el) {',
    '    try {',
    '      var m = JSON.parse(el.getAttribute("data-methode-b"));',
    '      var html = m.formule ? D.formuleHtml(m.formule) : "";',
    '      (m.lignes || []).forEach(function (l) { html += bloc(D.texExpr(l)); });',
    '      if (m.resultat) html += bloc((m.symbole ? D.texExpr(m.symbole) + " = " : "") + "\\\\boxed{" + D.texExpr(m.resultat) + "}");',
    '      el.innerHTML = html;',
    '    } catch (e) { el.textContent = "La démarche n\'a pas pu être affichée."; }',
    '    el.removeAttribute("data-methode-b");',
    '  });',
    '})();'
  ].join('\n');

  let configMathJax = null;
  /** Configuration MathJax de la coquille SCORM (commandes \biffer et \cercle), lue une seule fois. */
  function lireConfigMathJax() {
    if (configMathJax) return Promise.resolve(configMathJax);
    return fetch(BASE_MOTEUR + COQUILLE_SCORM, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('fichier introuvable : ' + BASE_MOTEUR + COQUILLE_SCORM);
      return r.text();
    }).then(function (t) {
      const m = t.match(/<script>\s*\/\/ Bundle MathJax local[\s\S]*?<\/script>/);
      if (!m) throw new Error('configuration MathJax introuvable dans la coquille SCORM');
      configMathJax = m[0];
      return configMathJax;
    });
  }

  /**
   * Page complète d'un document (aperçu ou exportation), avant le rendu des démarches.
   * @param {'examen'|'corrige'} type
   * @param {{detaille?: boolean}} options
   * @returns {Promise<string>}
   */
  function construireDocument(d, type, options) {
    options = options || {};
    return lireConfigMathJax().then(function (mathjax) {
      const titre = titreDocument(d, type);
      const corps = type === 'corrige' ? feuillesCorrige(d) : feuillesExamen(d);
      const quoi = type === 'corrige' ? 'le corrigé' : 'l\'examen';
      return '<!DOCTYPE html>\n<html lang="fr" dir="ltr">\n<head>\n<meta charset="UTF-8">\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
        '<title>' + echapper(titre) + '</title>\n<style>\n' + CSS + '\n</style>\n' +
        '<script>window.SCORM_ACTIVITY_CONFIG = { bibliotheque: true };</script>\n</head>\n' +
        '<body class="' + (type === 'corrige' && !options.detaille ? 'corrige-compact' : '') + '">\n' +
        '<a href="#main-content" class="skip-link">Aller au contenu</a>\n' +
        '<div class="barre-ecran" role="region" aria-label="Impression"><span>' + echapper(titre) + ' · format lettre, ' + parPage(d).length + ' page(s)</span>' +
        '<button type="button" onclick="window.print()">Imprimer ' + quoi + '</button></div>\n' +
        '<main id="main-content" class="liasse" tabindex="-1">' + corps + '</main>\n' +
        '<script src="' + BASE_MOTEUR + 'simulateurs/scorm/scorm_runtime.js"></script>\n' +
        '<script>\n' + SCRIPT_DEMARCHES + '\n</script>\n' +
        mathjax + '\n<script src="' + BASE_MOTEUR + 'src/mathjax.js" defer></script>\n' +
        '</body>\n</html>\n';
    });
  }

  /** Attend la fin du rendu MathJax dans la fenêtre du document. */
  function attendreRendu(w) {
    return new Promise(function (resolve, reject) {
      let essais = 0;
      (function attendre() {
        const mj = w.MathJax;
        if (mj && mj.startup && mj.startup.promise && typeof mj.typesetPromise === 'function') {
          mj.startup.promise.then(function () { resolve(); }, reject);
        } else if (++essais > 300) reject(new Error('le rendu des formules n\'a pas abouti'));
        else setTimeout(attendre, 50);
      })();
    });
  }

  /** Pages qui dépassent la feuille (numéros), mesurées après le rendu. */
  function pagesQuiDebordent(doc) {
    const sortie = [];
    Array.prototype.forEach.call(doc.querySelectorAll('.feuille'), function (f, i) {
      const deborde = f.scrollHeight > f.clientHeight + 2;
      f.classList.toggle('deborde', deborde);
      if (deborde) sortie.push(i + 1);
    });
    return sortie;
  }

  /**
   * Corrigé : une carte qui ne tient plus sur la feuille passe, entière, sur une feuille « suite »
   * insérée après (les questions d'une page de l'examen restent ensemble, dans l'ordre). Les numéros
   * de page sont ensuite réécrits. Une carte plus haute qu'une feuille reste seule et déborde.
   */
  function paginer(doc) {
    const feuilles = function () { return Array.prototype.slice.call(doc.querySelectorAll('.feuille-corrige')); };
    for (let i = 0; i < feuilles().length; i++) {
      const f = feuilles()[i];
      let garde = 0;
      while (f.scrollHeight > f.clientHeight + 2 && garde++ < 60) {
        const blocs = f.querySelectorAll(':scope > .carte, :scope > .grille');
        if (blocs.length <= 1) break;
        let suite = f.nextElementSibling;
        if (!suite || !suite.classList.contains('feuille-suite')) {
          suite = doc.createElement('article');
          suite.className = 'feuille feuille-corrige feuille-suite';
          suite.setAttribute('data-entete-suite', f.getAttribute('data-entete-suite') || '');
          suite.innerHTML = f.getAttribute('data-entete-suite') || '';
          f.parentNode.insertBefore(suite, f.nextElementSibling);
        }
        const entete = suite.querySelector(':scope > header');
        suite.insertBefore(blocs[blocs.length - 1], entete ? entete.nextElementSibling : suite.firstChild);
      }
    }
    const toutes = feuilles();
    toutes.forEach(function (f, i) {
      f.setAttribute('aria-label', 'Corrigé, page ' + (i + 1));
      Array.prototype.forEach.call(f.querySelectorAll('.num-page'), function (s) { s.textContent = String(i + 1); });
      Array.prototype.forEach.call(f.querySelectorAll('.nb-pages'), function (s) { s.textContent = String(toutes.length); });
    });
    return toutes.length;
  }

  /** Page statique à enregistrer : formules déjà rendues en SVG, aucun script ni appel réseau. */
  function serialiser(doc) {
    const racine = doc.documentElement.cloneNode(true);
    Array.prototype.forEach.call(racine.querySelectorAll('script'), function (s) { s.remove(); });
    Array.prototype.forEach.call(racine.querySelectorAll('.feuille.deborde'), function (f) { f.classList.remove('deborde'); });
    Array.prototype.forEach.call(racine.querySelectorAll('[data-entete-suite]'), function (f) { f.removeAttribute('data-entete-suite'); });
    const barre = racine.querySelector('.barre-ecran span');
    if (barre) barre.textContent = barre.textContent.replace(/\d+ page\(s\)/, racine.querySelectorAll('.feuille').length + ' page(s)');
    return '<!DOCTYPE html>\n' + racine.outerHTML;
  }

  window.MoodleAIExamen = {
    TYPES: TYPES,
    LIGNE_POUCES: LIGNE_POUCES,
    completer: completer,
    construireConsigne: construireConsigne,
    normaliser: normaliser,
    valider: valider,
    consigneCorrection: consigneCorrection,
    demandeImage: demandeImage,
    consigneRelecture: consigneRelecture,
    totalPoints: totalPoints,
    nbPages: nbPages,
    titreDocument: titreDocument,
    titreAvecVersion: titreAvecVersion,
    nomFichier: nomFichier,
    construireDocument: construireDocument,
    attendreRendu: attendreRendu,
    pagesQuiDebordent: pagesQuiDebordent,
    paginer: paginer,
    serialiser: serialiser,
    nombreFr: nombreFr
  };
})();
