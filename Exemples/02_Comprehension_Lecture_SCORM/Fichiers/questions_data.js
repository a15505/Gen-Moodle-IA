/**
 * QuestionsData - Exercice de Compréhension de Lecture SCORM 1.2
 * Sujet : Le système digestif et la nutrition (Science et technologie, 3e secondaire)
 * Modèle didactique : Mode 2 (Citations sources, questions "Pourquoi / Parce que", remédiation adaptative)
 * Barème total : 24 points (8 questions de 3 points). Scoring débutant strictement à 0 pt (0 %).
 * Ressource d'entraînement formative pour élèves du secondaire.
 */
window.SCORM_ACTIVITY_CONFIG = {
  mode: "comprehension",
  titre: "Le système digestif et la nutrition — Exercice de compréhension",
  totalPoints: 24,
  zipFilename: "Le système digestif et la nutrition — Exercice de compréhension.zip"
};

window.QUESTIONS_DATA = [
  {
    id: "c1",
    defi: 1,
    titre: "Surface de contact et digestion mécanique",
    points: 3,
    citation: "Digestion mécanique : processus qui facilite la digestion chimique des aliments. En effet, réduire la taille des aliments augmente la surface de contact entre les constituants alimentaires et les enzymes digestives, ce qui favorise leur décomposition en nutriments.",
    citationRef: "Section 1 — Le système digestif et ses fonctions",
    image: "./src/images/schema_anatomie.png",
    imageCaption: "Schéma anatomique — Cavité buccale et organes digestifs",
    question: "Pourquoi la mastication et le broyage des aliments accélèrent-ils considérablement l'action des sucs digestifs ?",
    choices: [
      {
        id: 0,
        text: "Parce que diviser les aliments en minuscules fragments démultiplie la superficie totale exposée aux enzymes digestives.",
        correct: true,
        feedback: "Exact ! La fragmentation mécanique augmente la surface de contact disponible pour l'attaque enzymatique, accélérant ainsi l'hydrolyse chimique."
      },
      {
        id: 1,
        text: "Parce que les dents transforment directement l'amidon en glucose sans aucune réaction enzymatique.",
        correct: false,
        feedback: "Incorrect. Les dents exercent une action strictement mécanique (changement physique) ; elles ne réalisent aucune transformation moléculaire chimique."
      },
      {
        id: 2,
        text: "Parce que la digestion mécanique neutralise définitivement l'acidité gastrique.",
        correct: false,
        feedback: "Incorrect. La mastication buccale n'a aucun impact neutralisant sur l'acide chlorhydrique produit par l'estomac."
      },
      {
        id: 3,
        text: "Parce que les mouvements de la mâchoire activent la production d'hormones biliaires.",
        correct: false,
        feedback: "Incorrect. La sécrétion de bile dépend de signaux digestifs dans l'intestin grêle et non des mouvements mécaniques de la mâchoire."
      }
    ],
    solution: "La division des aliments en fragments plus petits augmente la surface de contact globale avec les enzymes digestives.",
    explication: "Règle scientifique : La digestion mécanique prépare la digestion chimique. En fragmentant les aliments solides, elle expose une surface volumique beaucoup plus grande à l'action des sucs digestifs.",
    remediation: {
      question: "Considérez un bloc alimentaire cubique de 8 cm³ ayant une surface extérieure de 24 cm². Si ce bloc est coupé en 8 petits cubes de 1 cm³, quelle est sa nouvelle surface de contact totale accessible aux enzymes ?",
      choices: [
        {
          id: "r0",
          text: "48 cm² (la surface de contact totale a doublé, facilitant l'accès des sucs digestifs).",
          correct: true,
          feedback: "Exactement ! Chaque petit cube a 6 faces de 1 cm² (6 cm²), soit 8 × 6 = 48 cm². La surface de contact a doublé."
        },
        {
          id: "r1",
          text: "24 cm² (la surface totale reste strictement la même car le volume global ne change pas).",
          correct: false,
          feedback: "Attention : si le volume global reste constant (8 cm³), chaque coupure expose de nouvelles faces internes à l'extérieur."
        },
        {
          id: "r2",
          text: "12 cm² (la surface totale diminue en raison de la fragmentation).",
          correct: false,
          feedback: "Incorrect. Fragmenter un solide expose des parois intérieures, ce qui augmente toujours sa surface totale."
        }
      ],
      solution: "48 cm² (doublement de la surface de contact).",
      points: 1
    }
  },
  {
    id: "c2",
    defi: 2,
    titre: "Le péristaltisme et la propulsion œsophagienne",
    points: 3,
    citation: "Œsophage : Tube musculeux reliant le pharynx et l'estomac. Propulsion des aliments par péristaltisme.",
    citationRef: "Section 2 — Le tube digestif et ses conduits",
    image: "./src/images/schema_anatomie.png",
    imageCaption: "Schéma anatomique — Conduits du tube digestif",
    question: "Pourquoi les aliments descendent-ils jusqu'à l'estomac même si une personne avale la tête en bas ?",
    choices: [
      {
        id: 0,
        text: "Parce que les contractions musculaires ondulatoires coordonnées de la paroi (péristaltisme) propulsent activement le bol alimentaire indépendamment de la gravité.",
        correct: true,
        feedback: "Exact ! Le péristaltisme est une onde de contractions involontaires des muscles lisses qui comprime le conduit derrière les aliments pour les forcer à avancer."
      },
      {
        id: 1,
        text: "Parce que la gravité corporelle s'inverse spontanément dans la cage thoracique lorsque le corps s'incline.",
        correct: false,
        feedback: "Incorrect. La gravité terrestre s'exerce toujours vers le bas ; c'est le travail musculaire actif du tube digestif qui s'y oppose efficacement."
      },
      {
        id: 2,
        text: "Parce que l'acide chlorhydrique de l'estomac exerce une aspiration d'air continue vers le bas.",
        correct: false,
        feedback: "Incorrect. Il n'existe pas d'effet de succion pneumatique dans l'œsophage."
      },
      {
        id: 3,
        text: "Parce que la luette pousse mécaniquement la nourriture sur toute la longueur du thorax.",
        correct: false,
        feedback: "Incorrect. La luette ne fait que fermer les fosses nasales lors de la déglutition au niveau du pharynx."
      }
    ],
    solution: "Le péristaltisme est un travail musculaire actif et coordonné indépendant de la gravité.",
    explication: "Distinction conceptuelle : Le péristaltisme est une motilité digestive assurée par les muscles lisses de la musculeuse. Il permet l'avancement unidirectionnel du contenu digestif dans tout le tractus gastro-intestinal.",
    remediation: {
      question: "Quel type de tissu présent dans la paroi de l'œsophage permet d'engendrer ces contractions de propulsion involontaires ?",
      choices: [
        {
          id: "r0",
          text: "Le tissu musculaire lisse (contractions involontaires coordonnées).",
          correct: true,
          feedback: "Exact ! Les fibres musculaires lisses de la paroi se contractent en anneaux successifs pour pousser le bol alimentaire."
        },
        {
          id: "r1",
          text: "Le tissu osseux rigide.",
          correct: false,
          feedback: "Incorrect. L'œsophage est un conduit souple et musculeux dépourvu d'os."
        },
        {
          id: "r2",
          text: "L'émail protecteur.",
          correct: false,
          feedback: "Incorrect. L'émail ne recouvre que la couronne des dents."
        }
      ],
      solution: "Le tissu musculaire lisse.",
      points: 1
    }
  },
  {
    id: "c3",
    defi: 3,
    titre: "Glandes annexes versus glandes intégrées",
    points: 3,
    citation: "Glandes annexées : situées à l'extérieur du tube digestif. Leurs sécrétions sont acheminées dans le tube par différents canaux. Glandes intégrées : intégrées à la paroi du tube digestif, en contact direct avec son contenu.",
    citationRef: "Section 3 — Les glandes digestives",
    image: "./src/images/schema_anatomie.png",
    imageCaption: "Schéma anatomique — Foie et pancréas (glandes annexes)",
    question: "Pourquoi le foie et le pancréas sont-ils classés comme des glandes annexes plutôt que des glandes intégrées ?",
    choices: [
      {
        id: 0,
        text: "Parce qu'ils constituent des organes distincts situés hors du conduit alimentaire et y acheminent leurs sucs par des canaux sans que les aliments ne les traversent.",
        correct: true,
        feedback: "Exact ! Les glandes annexes (salivaires, foie, pancréas) sont distinctes du conduit digestif et y sont reliées par des conduits sécréteurs."
      },
      {
        id: 1,
        text: "Parce qu'ils sont microscopiques et logés directement à l'intérieur de la muqueuse gastrique.",
        correct: false,
        feedback: "Incorrect. Ce sont les glandes gastriques qui sont microscopiques et intégrées à la paroi de l'estomac."
      },
      {
        id: 2,
        text: "Parce qu'ils n'interviennent que lorsque la digestion mécanique a totalement échoué.",
        correct: false,
        feedback: "Incorrect. Ils interviennent systématiquement dans le processus digestif normal."
      },
      {
        id: 3,
        text: "Parce qu'ils filtrent les déchets sans jamais participer à la dégradation des nutriments.",
        correct: false,
        feedback: "Incorrect. Le foie produit la bile (émulsion des graisses) et le pancréas sécrète des enzymes digestives majeures."
      }
    ],
    solution: "Organes distincts extérieurs reliés au tube par des canaux déverseurs.",
    explication: "Règle scientifique : Glandes annexes = organes anatomiquement séparés du tube (foie, pancréas, glandes salivaires). Glandes intégrées = situées dans la muqueuse même du tube digestif (glandes gastriques, intestinales).",
    remediation: {
      question: "Les aliments solides ou liquides traversent-ils physiquement le foie ou le pancréas lors de la digestion ?",
      choices: [
        {
          id: "r0",
          text: "Non, les aliments ne traversent jamais le foie ni le pancréas ; seuls les sucs digestifs sont déversés dans l'intestin grêle.",
          correct: true,
          feedback: "Très bien ! Les aliments circulent uniquement à l'intérieur du tube digestif (bouche, pharynx, œsophage, estomac, intestins)."
        },
        {
          id: "r1",
          text: "Oui, les aliments y sont stockés plusieurs heures pour y être filtrés avant de rejoindre l'estomac.",
          correct: false,
          feedback: "Faux. Les aliments ne pénètrent jamais dans les tissus du foie ou du pancréas."
        }
      ],
      solution: "Non, les aliments ne traversent jamais ces organes annexes.",
      points: 1
    }
  },
  {
    id: "c4",
    defi: 4,
    titre: "L'intestin grêle : digestion chimique et absorption",
    points: 3,
    citation: "Intestin grêle : Plus long organe du système digestif (environ 5 m). Lieu de déversement de la bile et des sucs pancréatiques. Absorption des nutriments et digestion chimique.",
    citationRef: "Section 2 — Le tube digestif (intestin grêle)",
    image: "./src/images/schema_anatomie.png",
    imageCaption: "Schéma anatomique — Intestin grêle et raccordements pancréatico-biliaires",
    question: "Pourquoi la quasi-totalité de l'absorption des nutriments s'effectue-t-elle dans l'intestin grêle plutôt que dans l'estomac ?",
    choices: [
      {
        id: 0,
        text: "Parce que sa grande longueur et ses replis tapissés de villosités offrent une surface colossale, et que les macromolécules y sont enfin découpées en nutriments élémentaires absorbables.",
        correct: true,
        feedback: "Exact ! L'intestin grêle combine une surface d'échange phénoménale et l'achèvement de la digestion chimique par la bile et les sucs pancréatiques/intestinaux."
      },
      {
        id: 1,
        text: "Parce que l'estomac est un organe purement mécanique incapable de laisser passer la moindre molécule d'eau.",
        correct: false,
        feedback: "Incorrect. L'estomac absorbe certaines substances minimes (comme l'eau ou l'alcool), mais les grosses macromolécules alimentaires n'y sont pas encore suffisamment dégradées."
      },
      {
        id: 2,
        text: "Parce que la bile détruit les cellules muqueuses de l'estomac en y provoquant des brûlures.",
        correct: false,
        feedback: "Incorrect. La bile est déversée dans le duodénum (début de l'intestin grêle) et non dans l'estomac."
      },
      {
        id: 3,
        text: "Parce que les enzymes de l'intestin grêle solidifient les aliments pour empêcher leur diffusion.",
        correct: false,
        feedback: "Incorrect. L'absorption exige au contraire des nutriments solubilisés à l'échelle moléculaire."
      }
    ],
    solution: "Immense surface d'échange villositaire et achèvement du découpage enzymatique.",
    explication: "Critère d'évaluation attendu : L'absorption nécessite à la fois une dégradation enzymatique complète en nutriments unitaires et une grande surface de diffusion vers les capillaires sanguins et lymphatiques.",
    remediation: {
      question: "Quel est le rôle primordial de la bile déversée par le foie à l'entrée de l'intestin grêle ?",
      choices: [
        {
          id: "r0",
          text: "Émulsionner les lipides (les disperser en fines gouttelettes) pour faciliter l'action des lipases.",
          correct: true,
          feedback: "Exact ! La bile agit mécaniquement comme un détergent biologique en fragmentant les grosses gouttes d'huile en gouttelettes microscopiques."
        },
        {
          id: "r1",
          text: "Découper chimiquement les protéines en acides aminés individuels.",
          correct: false,
          feedback: "Incorrect. La bile ne contient aucune enzyme ; ce sont les protéases pancréatiques et gastriques qui coupent les protéines."
        },
        {
          id: "r2",
          text: "Neutraliser la soif en refroidissant l'organisme.",
          correct: false,
          feedback: "Incorrect. La bile a un rôle strictement digestif lipidique."
        }
      ],
      solution: "Émulsionner les lipides en fines gouttelettes.",
      points: 1
    }
  },
  {
    id: "c5",
    defi: 5,
    titre: "Le gros intestin et la réabsorption de l'eau",
    points: 3,
    citation: "Gros intestin (côlon) : Absorption de l'eau, sels, minéraux et vitamines. Formation des matières fécales. Péristaltisme et défécation.",
    citationRef: "Section 2 — Le tube digestif (gros intestin)",
    image: "./src/images/schema_anatomie.png",
    imageCaption: "Schéma anatomique — Gros intestin (côlon)",
    question: "Pourquoi une accélération anormale du transit dans le gros intestin (diarrhée) entraîne-t-elle un risque grave de déshydratation ?",
    choices: [
      {
        id: 0,
        text: "Parce que le gros intestin n'a pas le temps nécessaire pour réabsorber l'eau issue des sucs digestifs vers la circulation sanguine, provoquant une élimination hydrique excessive.",
        correct: true,
        feedback: "Exact ! Le côlon réabsorbe quotidiennement plusieurs litres d'eau résiduelle. Si le transit est accéléré, cette eau précieuse est évacuée dans les selles liquides."
      },
      {
        id: 1,
        text: "Parce que le gros intestin détruit l'eau potable en la transformant en gaz métaboliques.",
        correct: false,
        feedback: "Incorrect. Le côlon ne détruit pas les molécules d'eau."
      },
      {
        id: 2,
        text: "Parce que les reins arrêtent toute filtration sanguine dès que le côlon s'active.",
        correct: false,
        feedback: "Incorrect. La filtration rénale demeure active indépendamment du transit colique."
      },
      {
        id: 3,
        text: "Parce que les vitamines expulsent l'eau hors du système cardiovasculaire.",
        correct: false,
        feedback: "Incorrect. Les vitamines n'expulsent pas l'eau du sang."
      }
    ],
    solution: "Le temps de transit écourté empêche la réabsorption normale de l'eau par la muqueuse colique.",
    explication: "Règle physiologique : Le tube digestif sécrète environ 7 litres de liquide par jour (salive, suc gastrique, bile, sucs pancréatiques et intestinaux). Le rôle clé du gros intestin est de réabsorber 90 % de cette eau.",
    remediation: {
      question: "À l'inverse, que se produit-il si les selles séjournent trop longtemps dans le gros intestin (transit anormalement lent) ?",
      choices: [
        {
          id: "r0",
          text: "Une réabsorption excessive d'eau assèche et durcit les fèces, provoquant la constipation.",
          correct: true,
          feedback: "Exactement ! Plus les matières fécales stagnent dans le côlon, plus l'eau en est retirée vers le sang, ce qui les rend dures et difficiles à expulser."
        },
        {
          id: "r1",
          text: "Les matières fécales deviennent entièrement liquides et s'écoulent sans contrôle.",
          correct: false,
          feedback: "Incorrect. C'est le transit rapide qui produit des selles liquides."
        }
      ],
      solution: "Assèchement et durcissement des fèces (constipation).",
      points: 1
    }
  },
  {
    id: "c6",
    defi: 6,
    titre: "Aliments complexes versus nutriments élémentaires",
    points: 3,
    citation: "Les vitamines, les minéraux et l'eau sont à la fois des aliments et des nutriments, car ils sont déjà sous leur forme la plus simple. À l'inverse, les glucides complexes doivent être transformés en glucose avant d'être absorbés.",
    citationRef: "Section 4 — Aliments et nutriments élémentaires",
    image: "./src/images/schema_aliments_nutriments.png",
    imageCaption: "Synthèse comparative : Aliments complexes vs Nutriments simples",
    question: "Pourquoi l'eau, les vitamines et les minéraux peuvent-ils traverser directement la paroi de l'intestin sans digestion chimique ?",
    choices: [
      {
        id: 0,
        text: "Parce que leurs molécules sont déjà élémentaires et suffisamment petites pour franchir directement les pores et membranes cellulaires.",
        correct: true,
        feedback: "Exact ! L'eau, les minéraux et les vitamines sont des micronutriments sous forme unitaire. Ils ne nécessitent aucun découpage chimique préalable pour diffuser dans le sang."
      },
      {
        id: 1,
        text: "Parce qu'ils contiennent une densité énergétique supérieure à 37 kJ/g qui dissout les parois membranaires.",
        correct: false,
        feedback: "Incorrect. L'eau, les vitamines et les minéraux ont une valeur énergétique nulle (0 kJ/g)."
      },
      {
        id: 2,
        text: "Parce qu'ils sont transportés uniquement par les globules blancs sans jamais passer dans le sang.",
        correct: false,
        feedback: "Incorrect. Ils diffusent librement dans le plasma sanguin et la lymphe."
      },
      {
        id: 3,
        text: "Parce que les enzymes de la salive les ont déjà vaporisés sous forme gazeuse dans la bouche.",
        correct: false,
        feedback: "Incorrect. Ils restent dissous en solution aqueuse."
      }
    ],
    solution: "Molécules unitaires déjà assez petites pour traverser directement la paroi intestinale.",
    explication: "Règle scientifique : Seules les macromolécules polymères (amidon, protéines, lipides) doivent subir une hydrolyse enzymatique. L'eau, les ions minéraux et les vitamines sont assimilés directement sans modification.",
    remediation: {
      question: "Quel nutriment élémentaire simple l'organisme obtient-il après la digestion chimique complète d'un glucide complexe comme l'amidon ?",
      choices: [
        {
          id: "r0",
          text: "Le glucose (sucre simple directement absorbable).",
          correct: true,
          feedback: "Parfait ! L'amidon est une longue chaîne de molécules de glucose découpée par les enzymes amylases."
        },
        {
          id: "r1",
          text: "Les acides aminés.",
          correct: false,
          feedback: "Incorrect. Les acides aminés proviennent de la digestion des protéines."
        },
        {
          id: "r2",
          text: "Le glycérol et les acides gras.",
          correct: false,
          feedback: "Incorrect. Ils proviennent de la décomposition des lipides."
        }
      ],
      solution: "Le glucose.",
      points: 1
    }
  },
  {
    id: "c7",
    defi: 7,
    titre: "Rôles énergétiques et physiologiques des constituants",
    points: 3,
    citation: "Glucides (17 kJ/g) : Source d'énergie à court terme, rapidement utilisée par les cellules. Lipides (37 kJ/g) : Énergie de réserve à moyen-long terme. Protéines (17 kJ/g) : Matériau de base des cellules pour construire et réparer les tissus.",
    citationRef: "Section 5 — Valeurs énergétiques et métabolisme",
    image: "./src/images/schema_valeur_energetique.png",
    imageCaption: "Repères énergétiques : Glucides (17 kJ/g), Protéines (17 kJ/g), Lipides (37 kJ/g)",
    question: "Pourquoi un athlète privilégie-t-il une collation riche en glucides simples plutôt qu'un repas très gras 30 minutes avant un effort intense ?",
    choices: [
      {
        id: 0,
        text: "Parce que les glucides fournissent du glucose immédiatement mobilisable par la respiration cellulaire, tandis que les graisses exigent un métabolisme plus lent et laborieux.",
        correct: true,
        feedback: "Exact ! Bien que les lipides concentrent plus d'énergie par gramme (37 kJ/g contre 17 kJ/g), leur digestion et mobilisation cellulaire sont lentes. Le glucose est le carburant de première urgence."
      },
      {
        id: 1,
        text: "Parce que les lipides ne contiennent aucune énergie chimique exploitable par les fibres musculaires.",
        correct: false,
        feedback: "Faux. Les lipides renferment une très grande quantité d'énergie (37 kJ/g), mais constituent des réserves à moyen et long terme."
      },
      {
        id: 2,
        text: "Parce que les protéines contenues dans les graisses diminuent dangereusement le rythme cardiaque.",
        correct: false,
        feedback: "Incorrect. Les lipides ne contiennent pas de protéines et n'abaissent pas le rythme cardiaque."
      },
      {
        id: 3,
        text: "Parce que les graisses se transforment en eau toxique dans les poumons.",
        correct: false,
        feedback: "Incorrect. L'oxydation des graisses produit du dioxyde de carbone et de l'eau normale éliminés physiologiquement."
      }
    ],
    solution: "Les glucides apportent du glucose rapidement assimilable et métabolisable pour l'effort immédiat.",
    explication: "Distinction conceptuelle : Énergie immédiate (court terme) = Glucides (17 kJ/g). Énergie de réserve (moyen-long terme) = Lipides (37 kJ/g). Matériaux de construction = Protéines (17 kJ/g).",
    remediation: {
      question: "Quel constituant alimentaire sert en priorité de matériau de construction pour réparer les fibres musculaires après l'entraînement ?",
      choices: [
        {
          id: "r0",
          text: "Les protéines (bâtisseurs de l'organisme).",
          correct: true,
          feedback: "Exact ! Les acides aminés des protéines servent à régénérer les structures cellulaires et les tissus musculaires."
        },
        {
          id: "r1",
          text: "Les glucides simples.",
          correct: false,
          feedback: "Incorrect. Les glucides servent de carburant énergétique, non de matériau structural principal."
        },
        {
          id: "r2",
          text: "Les vitamines.",
          correct: false,
          feedback: "Incorrect. Les vitamines agissent comme régulateurs chimiques sans constituer la matière des fibres."
        }
      ],
      solution: "Les protéines.",
      points: 1
    }
  },
  {
    id: "c8",
    defi: 8,
    titre: "Quantification de l'énergie et analyse de l'étiquette nutritionnelle",
    points: 3,
    citation: "1 biscuit à l'avoine (9 g) contient : 6 g de glucides (6 × 17 kJ = 102 kJ), 2 g de lipides (2 × 37 kJ = 74 kJ), 1 g de protéines (1 × 17 kJ = 17 kJ). Énergie totale = 193 kJ.",
    citationRef: "Section 6 — Fiche de valeur nutritive et calculs énergétiques",
    image: "./src/images/schema_valeur_nutritive.png",
    imageCaption: "Valeur nutritive d'une portion de biscuits à l'avoine",
    question: "Pourquoi le calcul de la valeur énergétique totale d'une portion alimentaire repose-t-il sur la somme des produits de chaque constituant par sa valeur de référence (17 ou 37 kJ/g) ?",
    choices: [
      {
        id: 0,
        text: "Parce que chaque gramme de glucides, lipides et protéines libère une quantité constante et prévisible d'énergie lors de la combustion cellulaire, tandis que l'eau et les minéraux n'apportent aucun kilojoule.",
        correct: true,
        feedback: "Exact ! L'énergie totale est l'addition rigoureuse : (g glucides × 17) + (g lipides × 37) + (g protéines × 17) kJ. Les autres constituants (eau, fibres, minéraux) apportent 0 kJ."
      },
      {
        id: 1,
        text: "Parce que les minéraux et les vitamines quadruplent la valeur calorifique des lipides lors de la digestion.",
        correct: false,
        feedback: "Incorrect. Les vitamines et minéraux sont des régulateurs non énergétiques (0 kJ/g)."
      },
      {
        id: 2,
        text: "Parce que l'énergie d'un aliment dépend uniquement de sa couleur et de son volume physique.",
        correct: false,
        feedback: "Incorrect. L'énergie est une grandeur chimique biochimique basée sur la masse des constituants."
      },
      {
        id: 3,
        text: "Parce que les lipides perdent 50 % de leurs kilojoules lorsqu'ils sont consommés avec des céréales.",
        correct: false,
        feedback: "Incorrect. La valeur de 37 kJ/g pour les lipides demeure constante quelle que soit la recette."
      }
    ],
    solution: "Somme pondérée des masses par les densités énergétiques constantes de chaque nutriment (17 kJ/g ou 37 kJ/g).",
    explication: "Démarche type : Formule originale : Énergie totale = (m_glucides × 17) + (m_lipides × 37) + (m_protéines × 17) kJ. Les constituants non énergétiques sont exclus du calcul.",
    remediation: {
      question: "Une collation apporte 10 g de glucides, 2 g de lipides et 0 g de protéines. Quelle quantité d'énergie totale en kilojoules (kJ) fournit-elle à l'organisme ?",
      choices: [
        {
          id: "r0",
          text: "244 kJ (calcul : [10 g × 17 kJ/g] + [2 g × 37 kJ/g] = 170 + 74 = 244 kJ).",
          correct: true,
          feedback: "Calcul exact et rigoureux selon la démarche scientifique attendue !"
        },
        {
          id: "r1",
          text: "204 kJ (calcul : 12 g × 17 kJ/g).",
          correct: false,
          feedback: "Attention : les 2 g de lipides libèrent 37 kJ/g et non 17 kJ/g (2 × 37 = 74 kJ)."
        },
        {
          id: "r2",
          text: "444 kJ (calcul erroné en multipliant tout par 37).",
          correct: false,
          feedback: "Attention : seuls les lipides fournissent 37 kJ/g. Les glucides apportent 17 kJ/g."
        }
      ],
      solution: "244 kJ (170 kJ glucides + 74 kJ lipides).",
      points: 1
    }
  }
];
