/**
 * Projet d'exemple « Corrigé interactif SCORM » (la concentration des solutions) :
 * réponse de l'IA déjà remplie, pour parcourir les étapes sans utiliser l'IA.
 * Intégré en JavaScript pour fonctionner aussi en ouverture locale (file:///).
 */
window.MoodleAIExemples = window.MoodleAIExemples || {};
window.MoodleAIExemples.scormCorrige = (function () {
  'use strict';

  const formuleConcentration = {
    gauche: 'C',
    numerateur: 'm_soluté',
    denominateur: 'V_solution',
    legende: [
      { symbole: 'C', definition: 'concentration en grammes par litre (g/L)' },
      { symbole: 'm_soluté', definition: 'masse de soluté en grammes (g)' },
      { symbole: 'V_solution', definition: 'volume de la solution en litres (L)' }
    ]
  };

  const reponse = {
    titre: 'La concentration des solutions',
    accueil: 'Tu vas corriger toi-même l\'exercice sur la concentration. Après chaque réponse, l\'Assistant te dit si tu as raison ; en cas d\'erreur, l\'explication et la démarche complète s\'affichent sous la question.',
    intentions: [
      'Je distingue le soluté, le solvant et la solution.',
      'Je calcule une concentration en g/L à partir de la formule, en exprimant le volume en litres.',
      'Je prédis l\'effet d\'un ajout d\'eau sur la concentration et je vérifie si un résultat est vraisemblable.'
    ],
    questions: [
      {
        type: 'association',
        partie: 'Partie 1 — Les constituants d\'une solution',
        titre: 'Soluté, solvant et solution',
        enonce: 'Julie sucre son thé chaud. Associez chaque élément à ce qu\'il représente dans ce mélange.',
        categories: ['Soluté', 'Solvant', 'Solution'],
        enonces: [
          { texte: 'Le sucre qui disparaît dans le thé.', reponse: 'Soluté', retroaction: 'Le sucre est la substance dissoute : c\'est le soluté.' },
          { texte: 'L\'eau chaude du thé, qui dissout le sucre.', reponse: 'Solvant', retroaction: 'L\'eau est la substance qui dissout : c\'est le solvant.' },
          { texte: 'Le thé sucré, homogène, que Julie boit.', reponse: 'Solution', retroaction: 'Le mélange homogène de soluté et de solvant est la solution.' }
        ],
        solution: 'Sucre : soluté (1 pt)\nEau chaude : solvant (1 pt)\nThé sucré : solution (1 pt)',
        explication: 'Une solution est un mélange homogène formé d\'un soluté (la substance dissoute) et d\'un solvant (la substance qui dissout, souvent l\'eau). On ne distingue plus le soluté à l\'œil nu.'
      },
      {
        type: 'choix',
        partie: 'Partie 1 — Les constituants d\'une solution',
        titre: 'Sens d\'une concentration en g/L',
        points: 1,
        enonce: 'L\'étiquette d\'une boisson pour sportifs indique « sucre : 60 g/L ». Quel raisonnement décrit correctement cette information ?',
        choix: [
          { texte: 'Je me dis que chaque litre de boisson contient 60 g de sucre, peu importe la taille de la bouteille.', correct: true, retroaction: 'Exact : g/L indique la masse de soluté dans 1 L de solution.' },
          { texte: 'Je me dis que la bouteille entière contient 60 g de sucre, quel que soit son volume.', correct: false, retroaction: 'La concentration ne donne pas la masse totale : elle donne la masse dans 1 L. Une bouteille de 0,5 L en contient moins.' },
          { texte: 'Je me dis qu\'il faut 60 L de boisson pour obtenir 1 g de sucre.', correct: false, retroaction: 'Le rapport est inversé : g/L se lit « grammes par litre », donc 60 g dans 1 L.' },
          { texte: 'Je me dis que 60 g/L veut dire que la boisson pèse 60 g par litre.', correct: false, retroaction: 'La concentration ne mesure pas la masse de la boisson entière, seulement celle du soluté dissous.' }
        ],
        solution: 'Chaque litre de boisson contient 60 g de sucre (1 pt).',
        explication: 'L\'unité g/L se lit « grammes par litre ». Elle indique la masse de soluté contenue dans 1 L de solution, et non la masse totale de la bouteille.'
      },
      {
        type: 'reponse_courte',
        partie: 'Partie 2 — Calculer une concentration',
        titre: 'Concentration d\'une eau salée',
        points: 2,
        enonce: 'Marc dissout 8 g de sel dans de l\'eau pour obtenir 250 mL de solution. Quelle est la concentration de cette solution, en g/L ?',
        reponses_acceptees: ['32'],
        unite: 'g/L',
        retroaction_correcte: 'Exact : 8 g dans 0,25 L, c\'est 32 g dans 1 L, donc 32 g/L.',
        retroaction_erreur: 'Ce n\'est pas la bonne concentration. As-tu exprimé le volume en litres avant de calculer ?',
        solution: 'V = 250 mL = 0,25 L\nC = 32 g/L (2 pts)',
        explication: 'Une concentration en g/L exige un volume en litres : 250 mL = 0,25 L. On cherche ensuite la masse de sel dans 1 L de solution.',
        demarche: {
          formule: formuleConcentration,
          etapes: [
            {
              titre: 'La masse de sel dans 1 L',
              inconnue: 'Le volume s\'exprime en litres : 250 mL = 0,25 L. Soit x la masse de sel, en grammes (g), dans 1 L de solution.',
              lignes: [['8 g', '0,25 L'], ['x', '1 L']],
              symbole: 'x',
              calcul: { num: '8 [g] × 1 [[L]]', den: '0,25 [[L]]' },
              resultat: '32 g',
              biffage: 'Les L s\'annulent en haut et en bas : il reste des grammes. Il y a 32 g de sel dans 1 L, donc C = 32 g/L.'
            }
          ],
          verification: 'Il y a 4 fois 250 mL dans 1 L : 4 × 8 g = 32 g. La concentration est bien 32 g/L.'
        }
      },
      {
        type: 'reponse_courte',
        partie: 'Partie 2 — Calculer une concentration',
        titre: 'Masse de sucre dans une bouteille',
        points: 2,
        enonce: 'Quelle masse de sucre, en grammes, contient une bouteille de 0,5 L de la boisson pour sportifs à 60 g/L ?',
        reponses_acceptees: ['30'],
        unite: 'g',
        retroaction_correcte: 'Exact : un demi-litre contient la moitié des 60 g d\'un litre, soit 30 g.',
        retroaction_erreur: 'Ce n\'est pas la bonne masse. La concentration donne la masse dans 1 L : que contient un demi-litre ?',
        solution: 'm = 30 g (2 pts)',
        explication: 'La concentration de 60 g/L signifie 60 g de sucre dans 1 L. La bouteille contient seulement 0,5 L : on cherche la masse de sucre dans ce volume.',
        demarche: {
          formule: formuleConcentration,
          etapes: [
            {
              titre: 'La masse de sucre dans 0,5 L',
              inconnue: 'Soit m la masse de sucre, en grammes (g), dans une bouteille de 0,5 L.',
              lignes: [['60 g', '1 L'], ['m', '0,5 L']],
              symbole: 'm',
              calcul: { num: '60 [g] × 0,5 [[L]]', den: '1 [[L]]' },
              resultat: '30 g',
              biffage: 'Les L s\'annulent en haut et en bas : il reste des grammes.'
            }
          ],
          verification: '0,5 L est la moitié d\'un litre : on trouve bien la moitié de 60 g. La concentration de la boisson reste 60 g/L.'
        }
      },
      {
        type: 'volets',
        partie: 'Partie 3 — Dilution et vérification',
        titre: 'Effet d\'un ajout d\'eau sur la concentration',
        enonce: 'Marc ajoute 250 mL d\'eau à sa solution de 250 mL d\'eau salée à 32 g/L. Comment varie la concentration ? Justifiez votre réponse.',
        volets: [
          {
            libelle: '1. Variation de la concentration :',
            points: 1,
            choix: [
              { texte: 'Elle diminue.', correct: true, retroaction: 'Exact : la même masse de sel est répartie dans un plus grand volume.' },
              { texte: 'Elle reste la même.', correct: false, retroaction: 'Le volume de la solution change : la concentration change aussi.' },
              { texte: 'Elle augmente.', correct: false, retroaction: 'L\'eau n\'ajoute pas de sel : la concentration ne peut pas augmenter.' }
            ]
          },
          {
            libelle: '2. Justification :',
            points: 1,
            choix: [
              { texte: 'Parce que la masse de sel ne change pas, alors que le volume de la solution double : il y a deux fois moins de sel dans chaque litre.', correct: true, retroaction: 'Justification complète : même masse de soluté, volume plus grand, concentration plus petite (16 g/L).' },
              { texte: 'Parce que l\'eau ajoutée détruit une partie du sel dissous.', correct: false, retroaction: 'Le sel n\'est pas détruit : les 8 g sont toujours là, répartis dans plus d\'eau.' },
              { texte: 'Parce que la masse de sel diminue quand on ajoute de l\'eau.', correct: false, retroaction: 'La masse de soluté reste la même lors d\'une dilution ; seul le volume augmente.' }
            ]
          }
        ],
        solution: 'Variation : elle diminue (1 pt)\nJustification : la masse de sel (8 g) reste la même, mais le volume double (0,5 L) ; la concentration passe à 16 g/L (1 pt).',
        explication: 'Diluer, c\'est ajouter du solvant sans ajouter de soluté. La masse de soluté reste la même, le volume augmente : la concentration diminue. Ici, le volume double, donc la concentration est divisée par deux (16 g/L).'
      },
      {
        type: 'choix',
        partie: 'Partie 3 — Dilution et vérification',
        titre: 'Repérer une erreur de conversion',
        points: 1,
        enonce: 'Pour la solution de Marc (8 g de sel dans 250 mL), Léa obtient une concentration de 0,032 g/L. Quelle erreur explique son résultat ?',
        choix: [
          { texte: 'Je pense qu\'elle a divisé 8 par 250 sans convertir les millilitres en litres : son résultat est en g/mL, et non en g/L.', correct: true, retroaction: 'Exact : 8 g ÷ 250 mL donne 0,032 g par millilitre. En litres, on obtient 32 g/L, mille fois plus.' },
          { texte: 'Je pense qu\'elle a multiplié 8 par 250 au lieu de diviser.', correct: false, retroaction: 'Une multiplication donnerait 2 000, un nombre beaucoup plus grand, et non 0,032.' },
          { texte: 'Je pense qu\'elle a bien calculé : une eau salée est toujours très peu concentrée.', correct: false, retroaction: 'Le calcul correct donne 32 g/L : 0,032 g/L est mille fois trop petit.' },
          { texte: 'Je pense qu\'elle a confondu la masse de sel avec la masse de l\'eau.', correct: false, retroaction: 'La masse de l\'eau n\'intervient pas dans ce calcul ; l\'erreur vient de l\'unité du volume.' }
        ],
        solution: 'Le volume n\'a pas été converti en litres (250 mL = 0,25 L) ; le résultat est en g/mL (1 pt).',
        explication: 'Vérification de bon sens : 250 mL est le quart d\'un litre, donc 1 L contient 4 fois plus de sel, soit 32 g. Un résultat mille fois plus petit signale presque toujours des millilitres non convertis.'
      }
    ]
  };

  return {
    contexte: {
      sujet: 'La concentration des solutions',
      niveau: '3e secondaire, science et technologie',
      outil: 'gemini',
      source: 'joint',
      texteSource: '',
      precisions: ''
    },
    reponseIA: '```json\n' + JSON.stringify(reponse, null, 2) + '\n```'
  };
})();
