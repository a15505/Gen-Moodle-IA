/**
 * QuestionsData - Données didactiques de l'évaluation SCORM
 * Sujet : Le système digestif et la nutrition (ST 3e secondaire)
 * Barème total : 24 points. Scoring débutant à 0.
 */
window.SCORM_ACTIVITY_CONFIG = {
  mode: "corrige",
  titre: "Le système digestif et la nutrition — Corrigé interactif",
  totalPoints: 24,
  zipFilename: "Le système digestif et la nutrition — Corrigé interactif.zip"
};

window.QUESTIONS_DATA = [
  {
    id: "q1",
    points: 1,
    partie: "Partie 1 — Anatomie et rôles du système digestif",
    titre: "Rôle principal du système digestif",
    type: "radio",
    image: "./src/images/schema_partie1.png",
    imageCaption: "Schéma anatomique — Repères A à G",
    question: "À l'aide du schéma ci-contre, quel est le rôle principal du système digestif ?",
    choices: [
      {
        id: 0,
        text: "Apporter les éléments nutritifs aux cellules de l'organisme.",
        correct: false,
        feedback: "Incorrect. C'est le rôle du système circulatoire (cardiovasculaire) de transporter les nutriments via le sang jusqu'aux cellules."
      },
      {
        id: 1,
        text: "Décomposer les aliments en nutriments directement assimilables par l'organisme.",
        correct: true,
        feedback: "Exact ! Le rôle premier du système digestif est de fragmenter les macromolécules alimentaires en nutriments élémentaires capables de traverser la paroi intestinale."
      },
      {
        id: 2,
        text: "Filtrer le sang pour éliminer les déchets métaboliques.",
        correct: false,
        feedback: "Incorrect. La filtration du sang et l'évacuation des déchets relèvent du système excréteur (reins)."
      }
    ],
    solution: "Décomposer les aliments en nutriments directement assimilables par l'organisme (1 pt).",
    explication: "Distinction conceptuelle : La digestion correspond à la fragmentation des macromolécules alimentaires. Le transport sanguin est ensuite assuré par le système circulatoire."
  },
  {
    id: "q2",
    points: 1,
    partie: "Partie 1 — Anatomie et rôles du système digestif",
    titre: "Identification de la structure B",
    type: "shortanswer",
    image: "./src/images/schema_partie1.png",
    imageCaption: "Schéma anatomique — Repères A à G",
    question: "À l'aide du schéma anatomique ci-contre, identifiez la structure désignée par la lettre B :",
    placeholder: "Nom de l'organe...",
    acceptedAnswers: ["œsophage", "oesophage", "l'œsophage", "l'oesophage"],
    solution: "Structure B : Œsophage (1 pt)",
    explication: "L'œsophage est le conduit musculaire reliant le pharynx à l'estomac. Les contractions de sa paroi (péristaltisme) font descendre le bol alimentaire."
  },
  {
    id: "q3",
    points: 2,
    partie: "Partie 1 — Anatomie et rôles du système digestif",
    titre: "Classification et justification du foie",
    type: "compound_radio",
    image: "./src/images/schema_partie1.png",
    imageCaption: "Schéma anatomique — Repères A à G",
    question: "La structure C correspond au foie sur le schéma. S'agit-il d'une glande annexe ou d'une glande intégrée au tube digestif ? Justifiez votre réponse.",
    subQuestions: [
      {
        id: "type",
        label: "1. Type de glande :",
        points: 1,
        choices: [
          { id: 0, text: "Glande annexe", correct: true, feedback: "Exact ! Le foie est une glande annexe volumineuse." },
          { id: 1, text: "Glande intégrée", correct: false, feedback: "Incorrect. Les glandes intégrées sont microscopiques et enchâssées directement dans la paroi du tube digestif." }
        ]
      },
      {
        id: "justification",
        label: "2. Justification scientifique :",
        points: 1,
        choices: [
          { id: 0, text: "Le foie est situé à l'extérieur du tube digestif ; il sécrète la bile qui est déversée dans l'intestin par un canal sans que les aliments n'y pénètrent jamais.", correct: true, feedback: "Justification exacte et complète selon les critères scientifiques attendus." },
          { id: 1, text: "Les aliments séjournent plusieurs heures dans le foie pour y être filtrés avant de rejoindre l'estomac.", correct: false, feedback: "Faux. Les aliments ne traversent jamais le foie ni la vésicule biliaire." },
          { id: 2, text: "Le foie fait partie intégrante de la paroi de l'estomac et produit l'acide chlorhydrique.", correct: false, feedback: "Faux. Ce sont les glandes gastriques microscopiques qui tapissent l'estomac." }
        ]
      }
    ],
    solution: "Type : Glande annexe (1 pt)\nJustification : Le foie est situé à l'extérieur du tube digestif et déverse sa sécrétion (la bile) dans l'intestin grêle via un canal sans que les aliments ne traversent l'organe (1 pt).",
    explication: "Règle scientifique : Glandes annexes = organes distincts reliés par des canaux (foie, pancréas, glandes salivaires). Glandes intégrées = situées dans la muqueuse (glandes gastriques, intestinales)."
  },
  {
    id: "q4",
    points: 2,
    partie: "Partie 1 — Anatomie et rôles du système digestif",
    titre: "Carrefour aéro-digestif",
    type: "compound_select_text",
    image: "./src/images/schema_partie1.png",
    imageCaption: "Schéma anatomique — Repères A à G",
    question: "Quelle structure constitue à la fois une voie digestive et une voie respiratoire ? Indiquez sa lettre repère sur le schéma et son nom :",
    subQuestions: [
      {
        id: "lettre",
        label: "Lettre repère sur le schéma :",
        points: 1,
        type: "select",
        options: ["(Choisir)", "A", "B", "C", "D", "E"],
        correct: "D",
        feedback: "Exact, la lettre D désigne le carrefour au fond de la gorge."
      },
      {
        id: "nom",
        label: "Nom anatomique de la structure :",
        points: 1,
        type: "shortanswer",
        placeholder: "ex. Pharynx...",
        acceptedAnswers: ["pharynx", "le pharynx", "carrefour aéro-digestif"],
        feedback: "Exact ! C'est le pharynx."
      }
    ],
    solution: "Lettre : D (1 pt) | Nom : Pharynx (1 pt)",
    explication: "Le pharynx est le carrefour aéro-digestif. Lors de la déglutition, la luette se redresse pour fermer les fosses nasales et l'épiglotte s'abaisse pour obturer la trachée."
  },
  {
    id: "q5",
    points: 1,
    partie: "Partie 1 — Anatomie et rôles du système digestif",
    titre: "Changement physique vs chimique",
    type: "radio",
    question: "Lequel de ces énoncés correspond à un changement physique se produisant dans le corps humain ?",
    choices: [
      {
        id: 0,
        text: "Les enzymes de la salive transforment l'amidon en molécules de maltose.",
        correct: false,
        feedback: "Incorrect. La dégradation par une enzyme est une réaction chimique d'hydrolyse (rupture de liaisons covalentes)."
      },
      {
        id: 1,
        text: "La bile émulsionne les molécules de graisse dans l'intestin grêle.",
        correct: true,
        feedback: "Exact ! L'émulsion biliaire est une transformation physique (mécanique) : la bile sépare les grosses gouttes lipidiques en gouttelettes microscopiques sans modifier leur structure chimique."
      },
      {
        id: 2,
        text: "La respiration cellulaire produit de l'énergie dans les mitochondries.",
        correct: false,
        feedback: "Incorrect. La respiration cellulaire est une combustion chimique (réaction d'oxydoréduction du glucose)."
      },
      {
        id: 3,
        text: "Les acides aminés sont oxydés dans le foie pour produire l'urée.",
        correct: false,
        feedback: "Incorrect. La transformation des acides aminés en urée est une suite de réactions chimiques métaboliques."
      }
    ],
    solution: "La bile émulsionne les molécules de graisse dans l'intestin grêle (1 pt).",
    explication: "La bile ne contient pas d'enzymes digestives ; elle agit mécaniquement comme un savon/détergent pour émulsionner les lipides et faciliter le travail des lipases."
  },
  {
    id: "q6",
    points: 8,
    partie: "Partie 2 — Les glandes du système digestif",
    titre: "Identification et rôle des 4 glandes majeures",
    type: "glandes_grid",
    image: "./src/images/schema_partie2.png",
    imageCaption: "Glandes du système digestif — Repères 1 à 4",
    question: "À l'aide du schéma numéroté de 1 à 4 ci-contre et de la banque de fonctions (A, B, C, D), nommez chacune de ces glandes et attribuez-lui sa fonction :",
    fonctions: {
      "A": "Sécrète la salive qui dégrade l'amidon (glucides complexes) et lubrifie les aliments.",
      "B": "Endroit où la majorité de la digestion chimique et de l'absorption a lieu, sous l'action conjointe de la bile et des sucs pancréatiques/intestinaux.",
      "C": "Premier lieu de stockage après ingestion, où ont lieu les digestions chimique (acide et pepsine) et mécanique (brassage).",
      "D": "Produit et synthétise la bile."
    },
    items: [
      {
        num: 1,
        label: "Repère n° 1",
        nomOptions: ["(Choisir)", "Glandes salivaires", "Foie", "Estomac", "Intestin grêle", "Pancréas"],
        nomCorrect: "Glandes salivaires",
        lettreOptions: ["(Choisir)", "A", "B", "C", "D"],
        lettreCorrecte: "A"
      },
      {
        num: 2,
        label: "Repère n° 2",
        nomOptions: ["(Choisir)", "Glandes salivaires", "Foie", "Estomac", "Intestin grêle", "Pancréas"],
        nomCorrect: "Foie",
        lettreOptions: ["(Choisir)", "A", "B", "C", "D"],
        lettreCorrecte: "D"
      },
      {
        num: 3,
        label: "Repère n° 3",
        nomOptions: ["(Choisir)", "Glandes salivaires", "Foie", "Estomac", "Intestin grêle", "Pancréas"],
        nomCorrect: "Estomac",
        lettreOptions: ["(Choisir)", "A", "B", "C", "D"],
        lettreCorrecte: "C"
      },
      {
        num: 4,
        label: "Repère n° 4",
        nomOptions: ["(Choisir)", "Glandes salivaires", "Foie", "Estomac", "Intestin grêle", "Gros intestin"],
        nomCorrect: "Intestin grêle",
        lettreOptions: ["(Choisir)", "A", "B", "C", "D"],
        lettreCorrecte: "B"
      }
    ],
    solution: "1 : Glandes salivaires (1 pt) — Fonction A (1 pt)\n2 : Foie (1 pt) — Fonction D (1 pt)\n3 : Estomac (1 pt) — Fonction C (1 pt)\n4 : Intestin grêle (1 pt) — Fonction B (1 pt)",
    explication: "Cascade digestive : bouche (salive/amidon) -> estomac (brassage/pepsine/acide) -> intestin grêle (bile du foie et enzymes pancréatiques pour l'absorption finale)."
  },
  {
    id: "q7",
    points: 4,
    partie: "Partie 3 — Étapes de la digestion et analyse nutritionnelle",
    titre: "Les 4 étapes fondamentales de la digestion",
    type: "etapes_matching",
    question: "Associez chacun des énoncés suivants à l'étape fondamentale de la digestion à laquelle il se rapporte :",
    options: ["(Choisir)", "Ingestion", "Digestion", "Absorption", "Élimination"],
    statements: [
      {
        id: "a",
        text: "« Je mange une tranche de pain brun qui contient une grande quantité de fibres. »",
        correct: "Ingestion",
        feedback: "L'introduction volontaire d'aliments dans la bouche correspond à l'ingestion."
      },
      {
        id: "b",
        text: "« Le glucose étant suffisamment petit, il traverse la paroi de l'intestin grêle pour se rendre dans le sang. »",
        correct: "Absorption",
        feedback: "Le passage des nutriments du tube digestif vers le milieu intérieur (sang et lymphe) est l'absorption."
      },
      {
        id: "c",
        text: "« Les fibres contenues dans le pain ne sont pas digérées par l'organisme ; cela enclenche la formation de fèces prêtes pour l'évacuation. »",
        correct: "Élimination",
        feedback: "L'expulsion des résidus non absorbables sous forme de matières fécales constitue l'élimination (excrétion)."
      },
      {
        id: "d",
        text: "« L'amidon contenu dans le pain se transforme en molécules de glucose sous l'action des enzymes digestives. »",
        correct: "Digestion",
        feedback: "Le découpage enzymatique des macromolécules en molécules assimilables est la digestion chimique."
      }
    ],
    solution: "(a) Ingestion (1 pt)\n(b) Absorption (1 pt)\n(c) Élimination (1 pt)\n(d) Digestion (1 pt)",
    explication: "Le cycle de traitement des aliments respecte toujours la séquence chronologique : Ingestion -> Digestion -> Absorption -> Élimination."
  },
  {
    id: "q8",
    points: 5,
    partie: "Partie 3 — Étapes de la digestion et analyse nutritionnelle",
    titre: "Analyse nutritionnelle du repas de Thomas",
    type: "nutrition_compound",
    question: "Pour son dîner avant une compétition sportive, Thomas consomme le repas suivant. Analysez les constituants et identifiez la source d'énergie immédiate :",
    tableData: [
      {
        aliment: "Eau (250 mL)",
        options: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
        correct: "Eau"
      },
      {
        aliment: "Beurre à l'ail (15 mL)",
        options: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
        correct: "Lipides"
      },
      {
        aliment: "Petit pain (1 portion)",
        options: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
        correct: "Glucides"
      },
      {
        aliment: "Brocoli (2 portions)",
        options: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
        correct: "Vitamines et minéraux"
      },
      {
        aliment: "Poulet grillé (1 portion)",
        options: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
        correct: "Protéines"
      }
    ],
    sourceRapide: {
      contexte: "Dans ce repas, quel constituant représente une source d'énergie rapidement accessible pour l'organisme de Thomas ?",
      constituantOptions: ["(Choisir)", "Eau", "Glucides", "Lipides", "Protéines", "Vitamines et minéraux"],
      constituantCorrect: "Glucides",
      alimentOptions: ["(Choisir)", "Eau", "Beurre à l'ail", "Petit pain", "Brocoli", "Poulet grillé"],
      alimentCorrect: "Petit pain",
      explicationAttendue: "Les glucides constituent le carburant direct de la respiration cellulaire. Ils sont rapidement digérés en glucose puis mobilisés par les fibres musculaires lors de l'effort."
    },
    solution: "Tableau (4 pts) :\n- Eau -> Eau\n- Beurre -> Lipides\n- Petit pain -> Glucides\n- Brocoli -> Vitamines et minéraux / Fibres\n- Poulet grillé -> Protéines\nSource d'énergie rapide (1 pt) :\n- Constituant : Glucides | Aliment : Petit pain\n- Explication : Fournit le glucose nécessaire à la respiration cellulaire pour un apport énergétique immédiat aux muscles.",
    explication: "Valeurs énergétiques de référence : Glucides = 17 kJ/g (énergie rapide) ; Lipides = 37 kJ/g (réserve concentrée) ; Protéines = 17 kJ/g (matériaux bâtisseurs)."
  }
];
