/**
 * VideoH5PExport - Module d'empaquetage et d'export H5P et JSON
 * Construit l'archive H5P officielle (h5p.json + content/content.json) via fflate.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  function createH5PJson(title) {
    return {
      "title": title,
      "language": "fr",
      "mainLibrary": "H5P.InteractiveVideo",
      "embedTypes": ["iframe"],
      "license": "U",
      "preloadedDependencies": [
        { "machineName": "H5P.InteractiveVideo", "majorVersion": 1, "minorVersion": 28 },
        { "machineName": "H5P.MultiChoice", "majorVersion": 1, "minorVersion": 16 },
        { "machineName": "H5P.Summary", "majorVersion": 1, "minorVersion": 10 }
      ]
    };
  }

  function exportH5PPackage(videoConfig, questions, options) {
    options = options || {};
    const zipLib = window.fflate || (typeof fflate !== 'undefined' ? fflate : null);
    if (!zipLib) {
      alert("La bibliothèque d'empaquetage fflate.js est en cours de chargement. Veuillez réessayer dans un instant.");
      return;
    }

    const sourceData = videoConfig.aiJsonInput ? (typeof videoConfig.aiJsonInput === 'string' ? JSON.parse(videoConfig.aiJsonInput) : videoConfig.aiJsonInput) : {};
    const sourceContent = videoConfig.editorContent || {};

    const transformedInteractions = (questions || []).map((q, idx) => {
      let existingInter = sourceContent.interactiveVideo?.assets?.interactions?.[idx] || {};

      const h5pAnswers = (q.reponses || []).map((ans, aIdx) => ({
        "text": `<p>${ans}</p>`,
        "correct": (aIdx === q.index_bonne_reponse),
        "tipsAndFeedback": { "tip": "", "chosenFeedback": "", "notChosenFeedback": "" }
      }));

      const cleanFeedback = (q.feedback || '').replace(/\s*\[\d{2}:\d{2}\]\s*$/, '').trim();

      return {
        "x": existingInter.x || 2.18,
        "y": existingInter.y || 3.87,
        "width": existingInter.width || 37.96,
        "height": existingInter.height || 21.38,
        "pause": true,
        "displayType": "poster",
        "buttonOnMobile": false,
        "label": "",
        "duration": { "from": q.temps_apparition_sec, "to": q.temps_apparition_sec },
        "action": {
          "library": "H5P.MultiChoice 1.16",
          "params": {
            "question": `<p>${q.question}</p>`,
            "answers": h5pAnswers,
            "overallFeedback": [
              { "from": 0, "to": 0, "feedback": cleanFeedback },
              { "from": 100, "to": 100, "feedback": "Bonne réponse !" }
            ],
            "behaviour": {
              "enableRetry": true,
              "enableSolutionsButton": false,
              "enableCheckButton": true,
              "type": "auto",
              "singlePoint": false,
              "randomAnswers": true,
              "showSolutionsRequiresInput": true,
              "confirmCheckDialog": false,
              "confirmRetryDialog": false,
              "autoCheck": true,
              "passPercentage": 100,
              "showScorePoints": false
            },
            "UI": {
              "checkAnswerButton": "Vérifier",
              "submitAnswerButton": "Soumettre",
              "showSolutionButton": "Montrer la solution",
              "tryAgainButton": "Réessayer",
              "tipsLabel": "Montrer l'indice",
              "scoreBarLabel": "Vous avez obtenu :num points sur :total",
              "tipAvailable": "Indice disponible",
              "feedbackAvailable": "Rétroaction disponible",
              "readFeedback": "Lire la rétroaction",
              "wrongAnswer": "Mauvaise réponse",
              "correctAnswer": "Bonne réponse",
              "shouldCheck": "Devrait être coché",
              "shouldNotCheck": "Ne devrait pas être coché",
              "noInput": "Veuillez répondre avant de vérifier",
              "a11yCheck": "Vérifier la réponse.",
              "a11yShowSolution": "Montrer la solution.",
              "a11yRetry": "Réessayer."
            }
          },
          "subContentId": existingInter.action?.subContentId || ('sub_' + Math.random().toString(36).substring(2, 10)),
          "metadata": {
            "contentType": "Multiple Choice",
            "license": "U",
            "title": "Multiple Choice IA"
          }
        },
        "adaptivity": {
          "correct": { "allowOptOut": false, "message": "" },
          "wrong": {
            "allowOptOut": false,
            "message": "",
            "seekTo": q.retour_en_arriere_si_erreur_sec
          },
          "requireCompletion": true
        }
      };
    });

    const contentJson = {
      ...sourceContent,
      "interactiveVideo": {
        ...(sourceContent.interactiveVideo || {}),
        "video": {
          "startScreenOptions": {
            "title": sourceData.titre_video || "Vidéo interactive",
            "hideStartTitle": false
          },
          "files": [
            {
              "path": videoConfig.context?.videoUrl || "https://youtu.be/...",
              // H5P.Video 1.6 lit YouTube et Vimeo (lecteur vimeo.js)
              "mime": /vimeo\.com\//i.test(videoConfig.context?.videoUrl || '') ? "video/Vimeo" : "video/YouTube",
              "copyright": { "license": "U" }
            }
          ]
        },
        "assets": {
          ...(sourceContent.interactiveVideo?.assets || {}),
          "interactions": transformedInteractions,
          "endscreens": [
            { "time": 0, "label": "0:00 Écran de soumission" },
            { "time": Math.max(0, (sourceData.duree_video_sec || 180) - 1), "label": "Écran de soumission" }
          ]
        }
      }
    };

    const videoTitle = sourceData.titre_video || "video-interactive";
    const fileName = videoTitle.replace(/\s+/g, '-').replace(/[\\/:*?"<>|]/g, '').toLowerCase();
    const h5pJson = createH5PJson(videoTitle);

    const filesToZip = {
      'h5p.json': [
        zipLib.strToU8(JSON.stringify(h5pJson, null, 2)),
        { level: 0 }
      ],
      'content/content.json': [
        zipLib.strToU8(JSON.stringify(contentJson, null, 2)),
        { level: 6 }
      ]
    };

    zipLib.zip(filesToZip, (err, data) => {
      if (err) {
        if (typeof options.surErreur === 'function') { options.surErreur(err); return; }
        alert("Erreur lors de la génération du package H5P : " + err.message);
        return;
      }
      const blob = new Blob([data], { type: 'application/zip' });
      // Option : l'appelant enregistre lui-même le fichier (choix du dossier)
      if (typeof options.surFichier === 'function') {
        options.surFichier(blob, `${fileName}.h5p`);
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.h5p`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  function exportUpdatedJson(videoConfig) {
    const jsonStr = JSON.stringify(videoConfig, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_video.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.VideoH5PExport = {
    createH5PJson: createH5PJson,
    exportH5PPackage: exportH5PPackage,
    exportUpdatedJson: exportUpdatedJson
  };

  // Alias globaux
  window.createH5PJson = createH5PJson;
  window.exportH5PPackage = exportH5PPackage;
  window.exportUpdatedJson = exportUpdatedJson;

})();
