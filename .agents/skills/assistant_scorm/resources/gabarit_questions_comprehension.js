/**
 * Gabarit — Canevas « Compréhension en deux pages — Hattie » (voir ../CANEVAS_COMPREHENSION_HATTIE.md).
 * Copier dans <Dossier_Activite>/questions_data.js, remplacer chaque texte « ⟨…⟩ », dupliquer la station.
 * JSON strict (clés et chaînes entre guillemets doubles) : le déploiement et le validateur l'exigent.
 * Supprimer les champs « demarche » / « explicationDemarche » s'il n'y a aucun calcul.
 * Présentation NARRÉE (format par défaut, choisi au GO) : « motsCles » + « narration », sans « contenu » ni « reflexe ».
 *   Aucun fichier audio à produire : l'enseignant enregistre sa voix dans le simulateur (src/audio/<id>.mp3).
 * Présentation ÉCRITE (si l'enseignant la choisit au GO) : remplacer « motsCles » et « narration » par
 *   "contenu": ["⟨Savoir que⟩", "⟨Savoir comment⟩", "⟨Savoir avec⟩"], "reflexe": "⟨Réflexe de vérification⟩"
 * Valider : python .agents/skills/assistant_scorm/resources/valider_questions_data.py <Dossier_Activite>
 * Déployer : python .agents/skills/assistant_scorm/resources/create_scorm_activity.py <Dossier_Activite> <Dossier_Activite>/questions_data.js
 */
window.SCORM_ACTIVITY_CONFIG = {
  "mode": "comprehension",
  "presentation": "deux-pages",
  "titre": "⟨Sujet⟩ — Exercice de compréhension",
  "totalPoints": 3,
  "zipFilename": "⟨Sujet⟩ — Exercice de compréhension.zip",
  "welcomeIntro": "⟨Une ou deux phrases : ce que l'élève va se représenter, puis « Chacune des N stations commence par une page illustrée à lire, suivie d'une question. » — « à écouter » si narrée, « à lire » si écrite⟩",
  "intentions": [
    "⟨Intention d'apprentissage 1, au « je » : Je comprends…⟩",
    "⟨Intention 2⟩",
    "⟨Intention 3⟩"
  ],
  "criteres": [
    "⟨Critère de réussite observable 1 : je peux expliquer…⟩",
    "⟨Critère 2 : je peux calculer… en produit croisé⟩",
    "⟨Critère 3 : je peux vérifier…⟩"
  ]
};

window.QUESTIONS_DATA = [
  {
    "id": "s1",
    "titre": "⟨Sujet conceptuel seul, casse de phrase, sans numéro⟩",
    "points": 3,
    "motsCles": [
      { "terme": "⟨Terme clé⟩", "definition": "⟨définition courte, en quelques mots⟩." },
      { "terme": "⟨Terme clé 2⟩", "definition": "⟨définition courte⟩." }
    ],
    "narration": [
      "⟨Ouverture qui guide le regard : « En haut de l'image, regarde la légende : chaque point représente… »⟩",
      "⟨Savoir que : l'idée centrale, en désignant ce qui est visible (« à gauche », « compte les points »). Ton au « tu », valeurs différentes de la question, unités en toutes lettres (« grammes par litre »).⟩",
      "⟨Savoir comment : la démarche en mots, en suivant l'image dans l'ordre de lecture.⟩",
      "⟨Savoir avec : quand l'utiliser et comment vérifier par le bon sens.⟩",
      "⟨Le réflexe, formulé comme une question à se poser.⟩",
      "Regarde maintenant la démarche, sous l'image : ⟨ce qu'elle fait⟩. ⟨Dernier paragraphe seulement s'il y a une « demarche » ; la démarche apparaît à ce moment.⟩"
    ],
    "demarche": {
      "formule": "concentration",
      "etapes": [
        {
          "titre": "⟨Ce que l'étape trouve⟩",
          "inconnue": "Soit **x** ⟨la grandeur cherchée, avec son unité⟩.",
          "rapport": true,
          "lignes": [["⟨8 g⟩", "⟨0,25 L⟩"], ["x", "⟨1 L⟩"]],
          "symbole": "x",
          "calcul": { "num": "⟨8⟩ [⟨g⟩] × ⟨1⟩ [[⟨L⟩]]", "den": "⟨0,25⟩ [[⟨L⟩]]" },
          "resultat": "⟨32 g⟩",
          "suite": "⟶ C = ⟨32 g/L⟩",
          "biffage": "Les **⟨L⟩** s'annulent : il reste ⟨des grammes⟩."
        }
      ],
      "verification": "⟨Contrôle de vraisemblance relié au schéma.⟩"
    },
    "aRetenir": "⟨La règle, en une ou deux phrases, sans répéter la narration.⟩",
    "citationRef": "⟨Source du cours (capsule, page), facultatif⟩",
    "image": "./src/images/⟨p1_nom⟩.svg",
    "imageCaption": "⟨Légende courte⟩",
    "imageAlt": "⟨Description complète de la représentation pour un lecteur d'écran⟩",
    "question": "⟨Pourquoi… ? ou Quel raisonnement… ? — nouvelles valeurs, application et non recopie⟩",
    "choices": [
      { "id": 0, "text": "Je me dis que ⟨raisonnement juste, verbalisé⟩", "correct": true, "feedback": "Exact : ⟨confirmation précise⟩" },
      { "id": 1, "text": "Je me dis que ⟨fausse conception fréquente⟩", "correct": false, "erreur": "conception", "feedback": "⟨Pourquoi ce modèle est faux, et la relation juste⟩" },
      { "id": 2, "text": "Je me dis que ⟨étape omise ou mal ordonnée⟩", "correct": false, "erreur": "procedure", "feedback": "⟨L'étape correcte⟩" },
      { "id": 3, "text": "Je me dis que ⟨bonne règle au mauvais moment⟩", "correct": false, "erreur": "strategie", "feedback": "⟨Quand la règle s'applique⟩" }
    ],
    "explication": {
      "savoirQue": "⟨Le fait, la règle ou la relation (connaissance déclarative).⟩",
      "savoirComment": "⟨La procédure en mots ; la démarche détaillée suit automatiquement.⟩",
      "savoirAvec": "⟨Transfert : une situation différente où la même idée s'applique, et le contrôle à faire.⟩",
      "image": "./src/images/⟨p1_nom⟩.svg",
      "imageAlt": "⟨Facultatif : figure qui illustre le savoir que, si la situation le requiert⟩",
      "imageCaption": "⟨Légende⟩"
    },
    "explicationDemarche": {
      "formule": "concentration",
      "etapes": [
        {
          "titre": "⟨Même structure que « demarche », avec les valeurs de la question⟩",
          "inconnue": "Soit **x** ⟨…⟩.",
          "rapport": true,
          "lignes": [["⟨15 g⟩", "⟨0,5 L⟩"], ["x", "⟨1 L⟩"]],
          "symbole": "x",
          "calcul": { "num": "⟨15⟩ [⟨g⟩] × ⟨1⟩ [[⟨L⟩]]", "den": "⟨0,5⟩ [[⟨L⟩]]" },
          "resultat": "⟨30 g⟩",
          "suite": "⟶ C = ⟨30 g/L⟩",
          "biffage": "Les **⟨L⟩** s'annulent : il reste ⟨des grammes⟩."
        }
      ],
      "verification": "⟨Contrôle de vraisemblance⟩"
    },
    "solution": "⟨Réponse attendue en une ligne, pour l'enseignant⟩",
    "remediation": {
      "question": "⟨Question guidée plus simple, sur le même concept⟩",
      "choices": [
        { "id": "r0", "text": "Je me dis que ⟨raisonnement juste⟩", "correct": true, "feedback": "⟨Confirmation⟩" },
        { "id": "r1", "text": "Je me dis que ⟨fausse conception⟩", "correct": false, "feedback": "⟨Correction⟩" },
        { "id": "r2", "text": "Je me dis que ⟨autre fausse conception⟩", "correct": false, "feedback": "⟨Correction⟩" }
      ],
      "solution": "⟨Réponse attendue⟩",
      "points": 1
    }
  }
];
