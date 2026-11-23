/**
 * Action « Vidéo interactive H5P » — consigne pour l'IA, lecture, vérification
 * et conversion vers le format questions_video.json du moteur vidéo (moteur-ui).
 *
 * Format demandé à l'IA (identique au bloc aiJsonInput de l'exemple 05) :
 * { titre_video, duree_video_sec, questions: [ { temps_apparition_sec, question,
 *   reponses[4], index_bonne_reponse, feedback, retour_en_arriere_si_erreur_sec } ] }
 */
(function () {
  'use strict';

  const MOTS_INTERDITS = [
    { re: /\bPFEQ\b/i, texte: 'la mention « PFEQ » (réservée aux enseignants)' },
    { re: /\bd[ée]fis?\b/i, texte: 'le mot « défi »' }
  ];
  const FORMULES_BAVARDES = /\b(en effet|bravo|tu as raison|bonne réponse|excellent|félicitations)\b/i;

  /** « 4:38 », « 04:38 », « 278 » ou 278 → secondes (null si illisible). */
  function versSecondes(v) {
    if (typeof v === 'number' && isFinite(v)) return Math.round(v);
    const s = String(v == null ? '' : v).trim().replace(/[\[\]]/g, '');
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const m = s.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    if (m) return (parseInt(m[1] || '0', 10) * 3600) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    return null;
  }

  function horloge(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  // ----------------------------------------------------------------------
  // Consigne envoyée à Gemini ou Copilot
  // ----------------------------------------------------------------------
  function construireConsigne(ctx) {
    const duree = ctx.dureeSec || 0;
    const derniere = Math.max(5, duree - 3);
    const limiteFin = duree
      ? 'la dernière au plus tard à ' + derniere + ' secondes'
      : 'la dernière au plus tard 3 secondes avant la fin de la vidéo';
    const vimeo = !!idVimeo(ctx.url);
    const source = vimeo
      ? 'Il s\'agit d\'une vidéo Vimeo : tu ne peux pas la visionner. La transcription fournie à la fin de cette consigne est ta seule source. Appuie-toi uniquement sur elle et sur ses repères de temps ; n\'invente jamais un contenu ou un moment qui n\'y figure pas.'
      : ctx.transcription && ctx.transcription.trim()
      ? 'La transcription de la vidéo est fournie à la fin de cette consigne. Appuie-toi sur elle et sur ses repères de temps.'
      : 'Regarde la vidéo à partir du lien ci-dessus. Si tu ne peux pas accéder à son contenu, dis-le clairement et ne produis aucun JSON : n\'invente jamais le contenu ni les moments de la vidéo.';

    const lignes = [
      'Tu es conseiller pédagogique en sciences au secondaire, au Québec. Tu prépares les questions d\'une vidéo interactive H5P destinée à des élèves.',
      '',
      'VIDÉO',
      '- Lien : ' + ctx.url,
      '- Titre : ' + (ctx.titre || (vimeo
        ? 'propose un titre court et fidèle au contenu de la transcription'
        : 'reprends le titre exact de la vidéo YouTube, tel qu\'il apparaît sous la vidéo')),
      '- Durée : ' + (duree ? horloge(duree) + ' (' + duree + ' secondes)' : (vimeo
        ? 'estime-la à partir du dernier repère de temps de la transcription, en secondes'
        : 'reprends la durée exacte de la vidéo YouTube, en secondes')),
      '- Niveau des élèves : ' + (ctx.niveau || 'secondaire'),
      '- Nombre de questions : ' + ctx.nbQuestions,
      '',
      source,
      '',
      'RÈGLES DE RÉDACTION',
      '1. Chaque question commence par « Pourquoi » et se termine par un point d\'interrogation.',
      '2. Chaque question a exactement 4 choix de réponse. Chaque choix commence par « Parce que ».',
      '3. Un seul choix est juste. Les 3 autres sont plausibles et reprennent des conceptions erronées fréquentes chez les élèves de ce niveau.',
      '4. Les 4 choix ont une longueur semblable : la bonne réponse n\'est ni la plus longue ni la plus précise. Varie sa position (index_bonne_reponse de 0 à 3).',
      '5. Place chaque question juste après l\'explication d\'un concept clé de la vidéo, dans l\'ordre de la vidéo. La première question apparaît au plus tôt à 5 secondes, ' + limiteFin + '.',
      '6. retour_en_arriere_si_erreur_sec : le moment, en secondes, où commence l\'explication du concept dans la vidéo. Il est toujours plus petit que temps_apparition_sec.',
      '7. feedback : une explication factuelle et concise (une ou deux phrases), sans formule comme « En effet », « Bravo » ou « Tu as raison ». Elle se termine par le repère de temps de l\'explication entre crochets, au format [mm:ss], par exemple [01:35].',
      '8. Français standard du Québec. N\'écris jamais les mots « PFEQ » ni « défi ».',
      '',
      'FORMAT DE LA RÉPONSE',
      'Réponds uniquement par un bloc de code JSON, sans aucun texte avant ni après. Utilise des guillemets droits ("). Les temps sont des nombres entiers de secondes. Respecte exactement cette structure' +
        (duree ? '' : ' (duree_video_sec : la durée réelle de la vidéo, en secondes ; 278 n\'est qu\'un exemple)') + ' :',
      '',
      '{',
      '  "titre_video": "' + (ctx.titre ? ctx.titre.replace(/["\\]/g, '') : 'Titre exact de la vidéo') + '",',
      '  "duree_video_sec": ' + (duree || 278) + ',',
      '  "questions": [',
      '    {',
      '      "temps_apparition_sec": 65,',
      '      "question": "Pourquoi ... ?",',
      '      "reponses": [',
      '        "Parce que ...",',
      '        "Parce que ...",',
      '        "Parce que ...",',
      '        "Parce que ..."',
      '      ],',
      '      "index_bonne_reponse": 2,',
      '      "feedback": "Explication factuelle. [00:55]",',
      '      "retour_en_arriere_si_erreur_sec": 35',
      '    }',
      '  ]',
      '}'
    ];
    if (ctx.transcription && ctx.transcription.trim()) {
      lignes.push('', 'TRANSCRIPTION DE LA VIDÉO', ctx.transcription.trim());
    }
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Normalisation de la réponse de l'IA
  // ----------------------------------------------------------------------
  function normaliser(valeur, ctx) {
    const notes = [];
    let donnees = valeur;

    // Fichier questions_video.json complet collé ou importé
    if (donnees && donnees.aiJsonInput) {
      donnees = typeof donnees.aiJsonInput === 'string' ? JSON.parse(donnees.aiJsonInput) : donnees.aiJsonInput;
    }
    // Tableau de questions seul
    if (Array.isArray(donnees)) {
      donnees = { questions: donnees };
      notes.push('La réponse ne contenait que la liste des questions : le titre et la durée ont été repris de l\'étape 1.');
    }
    if (!donnees || typeof donnees !== 'object' || !Array.isArray(donnees.questions)) {
      return { ok: false, notes: notes, erreur: 'La réponse ne contient pas de liste « questions ». Vérifiez que vous avez collé la réponse complète de l\'IA.' };
    }

    const sortie = {
      titre_video: String(donnees.titre_video || ctx.titre || '').trim(),
      duree_video_sec: versSecondes(donnees.duree_video_sec) || ctx.dureeSec || 0,
      questions: []
    };
    if (ctx.dureeSec && sortie.duree_video_sec !== ctx.dureeSec) {
      notes.push('La durée indiquée par l\'IA (' + horloge(sortie.duree_video_sec) + ') diffère de celle de l\'étape 1 : la durée de l\'étape 1 (' + horloge(ctx.dureeSec) + ') est conservée.');
      sortie.duree_video_sec = ctx.dureeSec;
    }
    if (!sortie.titre_video) sortie.titre_video = 'Vidéo interactive';

    let tempsConvertis = false;
    donnees.questions.forEach(function (q) {
      q = q || {};
      const t = versSecondes(q.temps_apparition_sec);
      const r = versSecondes(q.retour_en_arriere_si_erreur_sec);
      if ((q.temps_apparition_sec != null && typeof q.temps_apparition_sec !== 'number') ||
          (q.retour_en_arriere_si_erreur_sec != null && typeof q.retour_en_arriere_si_erreur_sec !== 'number')) {
        tempsConvertis = true;
      }
      let idx = q.index_bonne_reponse;
      if (typeof idx === 'string' && /^\d+$/.test(idx.trim())) idx = parseInt(idx, 10);
      sortie.questions.push({
        temps_apparition_sec: t,
        question: String(q.question || '').trim(),
        reponses: Array.isArray(q.reponses) ? q.reponses.map(function (x) { return String(x == null ? '' : x).trim(); }) : [],
        index_bonne_reponse: idx,
        feedback: String(q.feedback || '').trim(),
        retour_en_arriere_si_erreur_sec: r
      });
    });
    if (tempsConvertis) notes.push('Des temps écrits en texte (ex. « 01:05 ») ont été convertis en secondes.');

    const avant = sortie.questions.map(function (q) { return q.temps_apparition_sec; }).join(',');
    sortie.questions.sort(function (a, b) { return (a.temps_apparition_sec || 0) - (b.temps_apparition_sec || 0); });
    if (sortie.questions.map(function (q) { return q.temps_apparition_sec; }).join(',') !== avant) {
      notes.push('Les questions ont été remises dans l\'ordre de la vidéo.');
    }
    return { ok: true, donnees: sortie, notes: notes };
  }

  // ----------------------------------------------------------------------
  // Vérification des règles
  // ----------------------------------------------------------------------
  function valider(d, ctx) {
    const erreurs = [];
    const avertissements = [];
    const duree = d.duree_video_sec || ctx.dureeSec || 0;

    if (!d.questions.length) erreurs.push({ lieu: 'Ensemble', msg: 'Aucune question n\'a été produite.' });
    if (ctx.nbQuestions && d.questions.length && d.questions.length !== ctx.nbQuestions) {
      avertissements.push({ lieu: 'Ensemble', msg: d.questions.length + ' question(s) reçue(s) au lieu des ' + ctx.nbQuestions + ' demandées.' });
    }

    const vus = {};
    d.questions.forEach(function (q, i) {
      const lieu = 'Question ' + (i + 1);
      const E = function (m) { erreurs.push({ lieu: lieu, msg: m }); };
      const A = function (m) { avertissements.push({ lieu: lieu, msg: m }); };

      if (!q.question) E('le texte de la question est vide.');
      else if (/^Pourquoi\s*…\s*\?$/.test(q.question.trim())) E('la question ajoutée n\'est pas rédigée : remplacez « … » à l\'étape 3.');
      else {
        if (!/^Pourquoi\b/.test(q.question)) E('la question doit commencer par « Pourquoi ».');
        if (!/\?\s*$/.test(q.question)) E('la question doit se terminer par un point d\'interrogation.');
      }

      if (q.reponses.length !== 4) E('il faut exactement 4 choix de réponse (' + q.reponses.length + ' reçu(s)).');
      q.reponses.forEach(function (rep, k) {
        if (!rep) E('le choix ' + (k + 1) + ' est vide.');
        else if (/^Parce que\s*…$/.test(rep.trim())) E('le choix ' + (k + 1) + ' n\'est pas rédigé : remplacez « … » à l\'étape 3.');
        else if (!/^Parce (que|qu['’])/i.test(rep)) E('le choix ' + (k + 1) + ' doit commencer par « Parce que ».');
      });
      const uniques = new Set(q.reponses.map(function (x) { return x.toLowerCase(); }));
      if (uniques.size < q.reponses.length) E('deux choix de réponse sont identiques.');

      if (!Number.isInteger(q.index_bonne_reponse) || q.index_bonne_reponse < 0 || q.index_bonne_reponse >= Math.max(q.reponses.length, 1)) {
        E('l\'indice de la bonne réponse (index_bonne_reponse) doit être un nombre de 0 à ' + (Math.max(q.reponses.length, 4) - 1) + '.');
      } else if (q.reponses.length === 4) {
        const longueurs = q.reponses.map(function (x) { return x.length; });
        const bonne = longueurs[q.index_bonne_reponse];
        const autres = longueurs.filter(function (_, k) { return k !== q.index_bonne_reponse; });
        if (bonne > 1.4 * Math.max.apply(null, autres)) A('la bonne réponse est nettement plus longue que les autres choix ; un élève peut la deviner.');
      }

      const t = q.temps_apparition_sec;
      if (t == null) E('le moment d\'apparition (temps_apparition_sec) est manquant ou illisible.');
      else {
        if (t < 5) E('la question apparaît à ' + horloge(t) + ' ; elle doit apparaître au plus tôt à 00:05.');
        if (duree && t > duree - 3) E('la question apparaît à ' + horloge(t) + ', trop près de la fin de la vidéo (' + horloge(duree) + ').');
        if (vus[t]) E('une autre question apparaît déjà au même moment (' + horloge(t) + ').');
        vus[t] = true;
      }

      const r = q.retour_en_arriere_si_erreur_sec;
      if (r == null) E('le moment de retour en arrière (retour_en_arriere_si_erreur_sec) est manquant ou illisible.');
      else if (t != null && r >= t) E('le retour en arrière (' + horloge(r) + ') doit précéder le moment de la question (' + horloge(t) + ').');
      else if (r < 0) E('le retour en arrière ne peut pas être négatif.');

      if (!q.feedback) E('la rétroaction (feedback) est vide.');
      else {
        const repere = q.feedback.match(/\[(\d{1,2}):(\d{2})\]\s*$/);
        if (!repere) E('la rétroaction doit se terminer par un repère de temps au format [mm:ss].');
        else if (t != null && (parseInt(repere[1], 10) * 60 + parseInt(repere[2], 10)) > t) {
          A('le repère [' + repere[1] + ':' + repere[2] + '] de la rétroaction est situé après l\'apparition de la question.');
        }
        if (FORMULES_BAVARDES.test(q.feedback)) E('la rétroaction contient une formule à éviter (« En effet », « Bravo », « Tu as raison »...).');
      }

      const textesEleve = [q.question, q.feedback].concat(q.reponses).join(' ');
      MOTS_INTERDITS.forEach(function (m) {
        if (m.re.test(textesEleve)) E('le texte destiné à l\'élève contient ' + m.texte + '.');
      });
    });

    const positions = d.questions.map(function (q) { return q.index_bonne_reponse; }).filter(Number.isInteger);
    if (positions.length >= 3 && new Set(positions).size === 1) {
      avertissements.push({ lieu: 'Ensemble', msg: 'la bonne réponse est toujours le choix ' + (positions[0] + 1) + '. L\'ordre est mélangé pour l\'élève, mais une position variée reste préférable.' });
    }
    return { erreurs: erreurs, avertissements: avertissements };
  }

  function consigneCorrection(erreurs) {
    const lignes = [
      'Le JSON que tu m\'as donné ne respecte pas certaines règles de la consigne :',
      ''
    ];
    erreurs.forEach(function (e) { lignes.push('- ' + e.lieu + ' : ' + e.msg); });
    lignes.push(
      '',
      'Corrige ces points en respectant toutes les règles de la consigne de départ, sans modifier ce qui est déjà correct.',
      'Renvoie le JSON complet (toutes les questions), uniquement dans un bloc de code, avec des guillemets droits.'
    );
    return lignes.join('\n');
  }

  // ----------------------------------------------------------------------
  // Conversion vers questions_video.json (format de l'exemple 05)
  // ----------------------------------------------------------------------
  function versVideoConfig(ctx, d) {
    return {
      context: {
        titre: d.titre_video,
        videoUrl: ctx.url,
        dureeTotale: d.duree_video_sec,
        niveau: ctx.niveau || ''
      },
      aiJsonInput: JSON.stringify(d, null, 2),
      editorContent: {
        interactiveVideo: {
          video: {
            startScreenOptions: { title: d.titre_video, hideStartTitle: false },
            files: [{ path: ctx.url, mime: idVimeo(ctx.url) ? 'video/Vimeo' : 'video/YouTube', copyright: { license: 'U' } }]
          },
          assets: { interactions: [] }
        }
      }
    };
  }

  /** Lecture d'un questions_video.json (reprise d'un projet). */
  function depuisVideoConfig(cfg) {
    const d = typeof cfg.aiJsonInput === 'string' ? JSON.parse(cfg.aiJsonInput) : cfg.aiJsonInput;
    const c = cfg.context || {};
    const url = c.videoUrl || (cfg.editorContent && cfg.editorContent.interactiveVideo &&
      cfg.editorContent.interactiveVideo.video.files[0].path) || '';
    return {
      contexte: {
        url: url,
        titre: c.titre || (d && d.titre_video) || '',
        dureeSec: versSecondes(c.dureeTotale) || (d && d.duree_video_sec) || 0,
        niveau: c.niveau || '',
        nbQuestions: d && d.questions ? d.questions.length : 4
      },
      donnees: d
    };
  }

  /** Identifiant YouTube d'un lien (null si le lien n'est pas reconnu). */
  function idYouTube(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /** Identifiant Vimeo d'un lien (null si le lien n'est pas reconnu). */
  function idVimeo(url) {
    const m = String(url || '').match(/vimeo\.com\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|album\/\d+\/video\/|showcase\/\d+\/video\/)?(\d{6,12})(?:[/?#]|$)/i);
    return m ? m[1] : null;
  }

  window.MoodleAIVideo = {
    versSecondes: versSecondes,
    horloge: horloge,
    construireConsigne: construireConsigne,
    normaliser: normaliser,
    valider: valider,
    consigneCorrection: consigneCorrection,
    versVideoConfig: versVideoConfig,
    depuisVideoConfig: depuisVideoConfig,
    idYouTube: idYouTube,
    idVimeo: idVimeo
  };
})();
