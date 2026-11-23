/**
 * Projet d'exemple « Compréhension en deux pages (Hattie) » (la concentration des solutions,
 * repris de l'exemple 07) : réponse de l'IA déjà remplie, pour parcourir les étapes sans utiliser l'IA.
 * Intégré en JavaScript pour fonctionner aussi en ouverture locale (file:///).
 *
 * Comme l'IA, la réponse décrit le schéma de chaque présentation (« figure ») sans fournir d'image.
 * « images » associe ensuite à chaque station le schéma SVG de Exemples/07 (src/exemples/images-exemples.js) :
 * l'assistant le pose par sa méthode d'ajout habituelle, comme si l'enseignant l'avait collé à l'étape 3.
 */
window.MoodleAIExemples = window.MoodleAIExemples || {};
window.MoodleAIExemples.scormHattie = (function () {
  'use strict';

  const reponse = {
    "titre": "La concentration des solutions",
    "accueil": "Tu vas te construire une image mentale de la concentration : ce qu'il y a dans une solution, ce que veut dire « g/L », et comment ce nombre change quand on ajoute du soluté ou de l'eau. Chacune des 8 stations commence par une page illustrée à écouter, suivie d'une question.",
    "intentions": [
      "Je reconnais le soluté, le solvant et la solution, et je sais qu'une solution a la même concentration partout.",
      "J'explique ce que veut dire une concentration en g/L et j'exprime les volumes et les masses dans la bonne unité.",
      "J'utilise la concentration pour comparer, diluer, vérifier un calcul et préparer une solution."
    ],
    "criteres": [
      "Je nomme le soluté et le solvant d'un mélange et je justifie mon choix.",
      "Je dis ce qu'il y a dans 1 L quand je lis une concentration en g/L.",
      "J'exprime le volume en litres avant de calculer une concentration en g/L.",
      "Je prédis l'effet d'un ajout de soluté ou d'eau sur la concentration.",
      "Je vérifie si mon résultat est vraisemblable et je repère une erreur de calcul."
    ],
    "stations": [
      {
        "titre": "Soluté, solvant et solution homogène",
        "points": 3,
        "source": "Capsule 2.2 — Soluté, solvant et solution",
        "figure": "Un tas de sucre (soluté) plus un bécher d'eau (solvant) donnent un bécher d'eau sucrée (solution) où les particules sont dispersées. En dessous, trois cercles représentent des portions prises en haut, au milieu et au fond : chacune contient 5 particules.",
        "legende_figure": "Trois portions prélevées dans le verre contiennent autant de particules de sucre.",
        "mots_cles": [
          {
            "terme": "Soluté",
            "definition": "la substance dissoute (le sucre)."
          },
          {
            "terme": "Solvant",
            "definition": "le liquide qui dissout (l'eau)."
          },
          {
            "terme": "Solution",
            "definition": "le mélange homogène des deux."
          }
        ],
        "narration": [
          "Regarde l'image de gauche à droite.",
          "À gauche, le petit tas de points bruns, c'est le sucre. On l'appelle le **soluté** : c'est la substance qu'on fait dissoudre, et il y en a peu.",
          "Au centre, le bécher d'eau, c'est le **solvant** : le liquide qui dissout. Il y en a beaucoup plus.",
          "À droite, on a mélangé les deux : c'est la **solution**, de l'eau sucrée. Remarque que les points bruns sont toujours là. Le sucre n'a pas disparu : ses particules se sont dispersées entre celles de l'eau. Elles sont devenues trop petites pour qu'on les voie, et la masse totale n'a pas changé.",
          "Maintenant, descends vers les trois cercles. Ce sont trois portions prises dans le verre : en haut, au milieu et au fond. Compte les particules : il y en a cinq dans chacune. C'est ce qu'on appelle un **mélange homogène** : le sucre est réparti de la même façon partout dans le verre.",
          "Pour reconnaître le soluté, demande-toi : qu'est-ce qui est dissous, en plus petite quantité ?"
        ],
        "a_retenir": "Soluté + solvant = solution. Dans une solution, la proportion de soluté est la même partout.",
        "question": "Pourquoi la première gorgée d'un verre d'eau sucrée bien brassée a-t-elle le même goût que la dernière, au fond du verre ?",
        "choix": [
          {
            "texte": "Je me dis que le sucre dissous s'est réparti uniformément dans l'eau : chaque gorgée contient la même proportion de sucre.",
            "correct": true,
            "retroaction": "Exact : dans un mélange homogène, le soluté est réparti de la même façon partout. La concentration est la même de la première à la dernière gorgée."
          },
          {
            "texte": "Je me dis que le sucre finit toujours par tomber au fond du verre, donc la dernière gorgée devrait être plus sucrée.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Un sucre entièrement dissous ne se dépose pas : ses particules restent dispersées dans l'eau. Seul un surplus non dissous pourrait rester au fond."
          },
          {
            "texte": "Je me dis que l'eau a détruit le sucre et qu'il ne reste qu'un nouveau liquide au goût sucré.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "La dissolution est un changement physique : le sucre existe toujours. Ses particules sont simplement dispersées entre celles de l'eau."
          },
          {
            "texte": "Je me dis que c'est l'eau, le soluté, qui donne son goût au mélange, peu importe le sucre.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Attention au vocabulaire : l'eau est le solvant. Le soluté, c'est le sucre dissous, et c'est lui qui donne le goût sucré."
          }
        ],
        "solution": "La solution est homogène : le soluté est réparti uniformément, donc la concentration est la même dans chaque gorgée.",
        "explication": {
          "savoir_que": "Une solution est un mélange homogène : le soluté (le sucre) est dissous dans le solvant (l'eau). Le sucre ne disparaît pas et ne se dépose pas tant qu'il est entièrement dissous.",
          "savoir_comment": "Pour raisonner, je suis trois étapes :\n1. Je repère le soluté (ce qui est dissous) et le solvant (ce qui dissout).\n2. Je me rappelle que les particules du soluté se dispersent uniformément entre celles du solvant.\n3. J'en conclus que toute portion de la solution contient la même proportion de soluté : la concentration est la même partout.",
          "savoir_avec": "Ce raisonnement vaut pour toute solution homogène : une cuillerée d'eau salée prise en haut ou au fond d'une casserole a la même concentration. Attention : s'il reste des cristaux au fond, ce surplus n'est pas dissous ; seule la partie dissoute fait partie de la solution."
        },
        "deuxieme_chance": {
          "question": "On prélève 10 mL en haut et 10 mL au fond d'un grand pot d'eau sucrée bien dissoute à 48 g/L. Que vaut la concentration de chaque échantillon ?",
          "choix": [
            {
              "texte": "Je me dis que la solution est homogène : les deux échantillons ont la même concentration, 48 g/L.",
              "correct": true,
              "retroaction": "Exact : un échantillon d'une solution homogène a la même concentration que toute la solution, quelle que soit sa taille ou l'endroit où on le prend."
            },
            {
              "texte": "Je me dis que l'échantillon du fond est plus concentré, parce que le sucre descend.",
              "correct": false,
              "retroaction": "Le sucre dissous reste réparti uniformément. Le haut et le fond ont la même concentration."
            },
            {
              "texte": "Je me dis qu'un petit échantillon de 10 mL a forcément une concentration plus petite que 48 g/L.",
              "correct": false,
              "retroaction": "Piège fréquent : 10 mL contiennent moins de sucre que le pot entier, mais la proportion reste la même. La concentration reste 48 g/L."
            }
          ],
          "solution": "Les deux échantillons sont à 48 g/L : une solution homogène a la même concentration partout."
        }
      },
      {
        "titre": "Ce que veut dire une concentration en g/L",
        "points": 3,
        "source": "Capsule 2.2 — Définition de la concentration",
        "figure": "Trois volumes d'eau salée. Un demi-litre contient 5 points (10 g), un litre contient 10 points (20 g), deux litres contiennent 20 points (40 g). Chaque point vaut 2 g. Les trois ont une concentration de 20 g/L.",
        "legende_figure": "0,5 L, 1 L et 2 L d'une même eau salée : la masse change, la concentration reste 20 g/L.",
        "mots_cles": [
          {
            "terme": "Concentration",
            "definition": "la masse de soluté par rapport au volume de solution."
          },
          {
            "terme": "g/L",
            "definition": "« grammes par litre », la masse de soluté dans 1 L de solution."
          }
        ],
        "narration": [
          "En haut de l'image, regarde la légende : chaque point brun représente 2 grammes de sel dissous.",
          "À gauche, un demi-litre d'eau salée. Compte les points : il y en a 5. Cinq fois 2 grammes, ça fait 10 grammes de sel.",
          "Au centre, un litre de la même eau salée : 10 points, donc 20 grammes. À droite, deux litres : 20 points, donc 40 grammes.",
          "Remarque ce qui change d'un récipient à l'autre : la masse de sel augmente avec le volume. Mais regarde aussi ce qui ne change pas : dans chaque litre, il y a toujours 20 grammes de sel. C'est ça, la **concentration** : la masse de soluté par rapport au volume de solution. Ici, elle vaut 20 grammes par litre, peu importe la quantité qu'on prend.",
          "On la calcule en divisant la masse de soluté par le volume de la solution, en litres.",
          "Devant une concentration, demande-toi : qu'est-ce qu'il y a dans un litre entier ?",
          "Regarde maintenant la démarche, sous l'image : elle te montre ce calcul étape par étape."
        ],
        "a_retenir": "La concentration est la masse de soluté divisée par le volume de la solution. Une concentration en g/L dit combien de grammes de soluté il y a dans 1 L de solution.",
        "demarche": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "La masse de sel dans 0,5 L",
              "inconnue": "Soit **m** la masse de sel, en grammes (g), dans 0,5 L de cette eau salée à 20 g/L.",
              "lignes": [
                [
                  "20 g",
                  "1 L"
                ],
                [
                  "m",
                  "0,5 L"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "20 [g] × 0,5 [[L]]",
                "den": "1 [[L]]"
              },
              "resultat": "10 g",
              "biffage": "Les **L** s'annulent en haut et en bas : il reste des grammes."
            }
          ],
          "verification": "0,5 L est la moitié d'un litre : on trouve bien la moitié de 20 g. La masse a changé, la concentration est toujours 20 g/L."
        },
        "question": "Une boisson pour sportifs indique « sucre : 60 g/L ». Quel raisonnement décrit bien cette information ?",
        "choix": [
          {
            "texte": "Je me dis que chaque litre de boisson contient 60 g de sucre ; une bouteille de 0,5 L en contient donc 30 g, mais sa concentration reste 60 g/L.",
            "correct": true,
            "retroaction": "Exact : 60 g/L, c'est 60 g dans chaque litre. Un demi-litre contient la moitié du sucre (30 g), mais la proportion, donc la concentration, ne change pas."
          },
          {
            "texte": "Je me dis que la bouteille contient 60 g de sucre, peu importe sa taille.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "La concentration n'est pas la masse totale : 60 g/L, c'est 60 g pour 1 L. Une bouteille de 0,5 L en contient 30 g, une de 2 L en contient 120 g."
          },
          {
            "texte": "Je me dis qu'il y a 1 g de sucre dans 60 L de boisson.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "C'est l'inverse : dans « g/L », les grammes sont en haut et les litres en bas. Il y a 60 g de sucre dans 1 L."
          },
          {
            "texte": "Je me dis qu'une grande bouteille de 2 L est plus concentrée, puisqu'elle contient plus de sucre.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Piège fréquent : la grande bouteille contient plus de sucre, mais aussi plus de boisson. Le rapport masse ÷ volume reste 60 g/L."
          }
        ],
        "solution": "60 g/L = 60 g dans 1 L. Soit m la masse dans 0,5 L : m = (60 g × 0,5 L) ÷ 1 L = 30 g. La concentration reste 60 g/L.",
        "explication": {
          "savoir_que": "« 60 g/L » signifie 60 g de sucre dans chaque litre de boisson. La masse totale dépend du volume qu'on prend ; la concentration, elle, n'en dépend pas.",
          "savoir_comment": "Pour trouver la masse dans un autre volume, je pars de la formule de la concentration, je remplace les lettres par les valeurs, puis je pose le produit croisé. Voici la masse de sucre dans une bouteille de 0,5 L :",
          "savoir_avec": "Devant n'importe quelle étiquette en g/L, je me demande : « Combien de grammes dans 1 L ? » Une bouteille de 2 L à 60 g/L contient 120 g de sucre, mais sa concentration reste 60 g/L. Je vérifie : plus de volume donne plus de masse, jamais une autre concentration."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "La masse de sucre dans 0,5 L",
              "inconnue": "Soit **m** la masse de sucre, en grammes (g), dans une bouteille de 0,5 L.",
              "lignes": [
                [
                  "60 g",
                  "1 L"
                ],
                [
                  "m",
                  "0,5 L"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "60 [g] × 0,5 [[L]]",
                "den": "1 [[L]]"
              },
              "resultat": "30 g",
              "biffage": "Les **L** s'annulent en haut et en bas : il reste des grammes."
            }
          ],
          "verification": "30 g dans un demi-litre, c'est 60 g dans un litre entier : la concentration reste 60 g/L."
        },
        "deuxieme_chance": {
          "question": "Tu verses la moitié d'une bouteille de jus à 60 g/L de sucre dans un verre. Que vaut la concentration du jus dans ton verre ?",
          "choix": [
            {
              "texte": "Je me dis que c'est le même jus : il y a moins de sucre dans le verre, mais aussi moins de jus, donc la concentration reste 60 g/L.",
              "correct": true,
              "retroaction": "Exact : verser une partie d'une solution ne change pas sa concentration. La masse et le volume diminuent ensemble."
            },
            {
              "texte": "Je me dis que j'ai pris la moitié du jus, donc la concentration est divisée par 2 : 30 g/L.",
              "correct": false,
              "retroaction": "Attention : c'est la masse de sucre qui est divisée par 2, pas la concentration. Le volume aussi a été divisé par 2."
            },
            {
              "texte": "Je me dis que le verre est plus petit que la bouteille, donc le jus y est plus concentré.",
              "correct": false,
              "retroaction": "La taille du contenant ne change pas la proportion de sucre dans le jus. La concentration reste 60 g/L."
            }
          ],
          "solution": "La concentration reste 60 g/L : masse et volume sont divisés par 2 en même temps."
        }
      },
      {
        "titre": "Des millilitres aux litres",
        "points": 3,
        "source": "Capsule 2.1 — Les unités de mesure en sciences",
        "figure": "Une bouteille graduée de 1 L porte les marques 250 mL (0,25 L), 500 mL (0,5 L), 750 mL (0,75 L) et 1 000 mL (1 L). À côté, quatre tasses de 250 mL remplissent ensemble la bouteille.",
        "legende_figure": "Quatre tasses de 250 mL remplissent une bouteille de 1 L.",
        "mots_cles": [
          {
            "terme": "Millilitre (mL)",
            "definition": "un millième de litre."
          },
          {
            "terme": "Équivalence",
            "definition": "1 L = 1 000 mL."
          }
        ],
        "narration": [
          "Pour calculer une concentration en grammes par litre, le volume doit être en litres. Pourtant, au laboratoire, on mesure souvent les volumes en millilitres.",
          "Regarde la bouteille graduée. Tout en haut, la marque indique 1 000 millilitres, c'est-à-dire 1 litre. Descends le long des graduations : 750 millilitres, c'est 0,75 litre. 500 millilitres, 0,5 litre. Et tout en bas, 250 millilitres, 0,25 litre.",
          "Regarde maintenant les quatre tasses de 250 millilitres, à droite. Ensemble, elles remplissent la bouteille. Une tasse, c'est donc le quart d'un litre.",
          "Remarque le sens de la conversion : on passe d'une petite unité, le millilitre, à une plus grande, le litre. Le nombre devient plus petit : 250 devient 0,25.",
          "Par le calcul, on pose un produit croisé avec l'équivalence 1 litre égale 1 000 millilitres, puis on biffe les millilitres.",
          "Avant de calculer une concentration, regarde toujours l'unité du volume. Si elle est en millilitres, convertis-la d'abord en litres.",
          "Regarde maintenant la démarche, sous l'image : elle fait cette conversion étape par étape."
        ],
        "a_retenir": "1 L = 1 000 mL. Pour convertir, je pose un produit croisé avec cette équivalence et je biffe les mL : 250 mL = 0,25 L.",
        "demarche": {
          "formule": "1 L = 1 000 mL",
          "etapes": [
            {
              "titre": "Convertir 250 mL en litres",
              "inconnue": "Soit **V** le volume, en litres (L), d'une tasse de 250 mL.",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "250 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 250 [[mL]]",
                "den": "1 000 [[mL]]",
                "intermediaire": {
                  "num": "250 [L]",
                  "den": "1 000"
                }
              },
              "resultat": "0,25 L",
              "biffage": "Les **mL** s'annulent en haut et en bas : il reste des litres."
            }
          ],
          "verification": "4 tasses de 250 mL remplissent 1 L : une tasse vaut bien 0,25 L, un nombre plus petit que 250."
        },
        "question": "Pourquoi doit-on convertir les millilitres (mL) en litres (L) avant de calculer une concentration en g/L ?",
        "choix": [
          {
            "texte": "Je me dis que « g/L » veut dire ce qu'il y a dans un litre entier ; si je divise par des millilitres, j'obtiens ce qu'il y a dans un seul millilitre.",
            "correct": true,
            "retroaction": "Exact : diviser par des mL donne des grammes par millilitre, une valeur 1 000 fois plus petite que des grammes par litre."
          },
          {
            "texte": "Je me dis que la calculatrice convertit d'elle-même les millilitres en litres pendant la division.",
            "correct": false,
            "erreur": "strategie",
            "retroaction": "La calculatrice ne connaît pas les unités : elle divise les nombres que tu lui donnes. C'est à toi de convertir avant."
          },
          {
            "texte": "Je me dis que les millilitres mesurent les solides et les litres, les liquides.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Les millilitres et les litres mesurent tous les deux un volume. Ils sont liés par 1 L = 1 000 mL."
          },
          {
            "texte": "Je me dis que pour convertir des mL en L, je dois multiplier par 1 000.",
            "correct": false,
            "erreur": "procedure",
            "retroaction": "Erreur de sens : on passe d'une petite unité à une grande, donc le nombre diminue. Le produit croisé avec 1 L = 1 000 mL donne 500 mL = 0,5 L."
          }
        ],
        "solution": "Soit V en L : V = (1 L × 500 mL) ÷ 1 000 mL = 0,5 L. Soit x la masse dans 1 L : x = (10 g × 1 L) ÷ 0,5 L = 20 g, donc C = 20 g/L.",
        "explication": {
          "savoir_que": "« g/L » veut dire des grammes dans 1 L entier, et 1 L = 1 000 mL. Diviser par des millilitres donnerait la masse dans 1 mL, une valeur 1 000 fois trop petite.",
          "savoir_comment": "Avant de calculer une concentration en g/L, je convertis le volume en litres par un produit croisé avec 1 L = 1 000 mL, puis je biffe les millilitres. Exemple : 10 g de sel dans 500 mL d'eau.",
          "savoir_avec": "Chaque fois que l'unité d'une donnée ne correspond pas à celle de la réponse demandée (mL au lieu de L, g au lieu de kg), je convertis d'abord. Je vérifie le sens : d'une petite unité vers une grande, le nombre diminue (500 mL = 0,5 L)."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume en litres",
              "inconnue": "Soit **V** le volume de solution, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "500 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 500 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,5 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "La masse de sel dans 1 L",
              "inconnue": "Soit **x** la masse de sel, en grammes (g), dans 1 L de solution.",
              "lignes": [
                [
                  "10 g",
                  "0,5 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "10 [g] × 1 [[L]]",
                "den": "0,5 [[L]]"
              },
              "resultat": "20 g",
              "biffage": "Les **L** s'annulent : il reste 20 g dans 1 L, soit 20 g/L.",
              "suite": "⟶ C = 20 g/L"
            }
          ],
          "verification": "500 mL, c'est un demi-litre. 10 g dans un demi-litre, c'est 20 g dans un litre entier."
        },
        "deuxieme_chance": {
          "question": "Tu as 10 g de sel dissous dans 500 mL d'eau. Quel raisonnement te donne la concentration en g/L ?",
          "choix": [
            {
              "texte": "Je me dis que 500 mL, c'est un demi-litre : s'il y a 10 g dans un demi-litre, il y en a le double dans un litre, soit 20 g/L.",
              "correct": true,
              "retroaction": "Exact : en exprimant le volume en litres (0,5 L), tu trouves 20 g dans un litre entier."
            },
            {
              "texte": "Je divise 10 par 500 sans convertir, parce que l'unité ne change pas le calcul.",
              "correct": false,
              "retroaction": "Sans conversion, tu obtiens 0,02, un résultat 1 000 fois trop petit. L'unité change tout."
            },
            {
              "texte": "Je multiplie 10 par 500, parce que plus il y a d'eau, plus la concentration est grande.",
              "correct": false,
              "retroaction": "La concentration est une division de la masse par le volume. Plus il y a d'eau pour la même masse, plus elle est faible."
            }
          ],
          "solution": "500 mL = 0,5 L. Soit x la masse dans 1 L : x = (10 g × 1 L) ÷ 0,5 L = 20 g, donc C = 20 g/L."
        }
      },
      {
        "titre": "Des grammes aux kilogrammes",
        "points": 3,
        "source": "Capsule 2.1 — La masse et les conversions",
        "figure": "Un grand carré représentant 1 kg est séparé en 4 portions égales de 0,25 kg, soit 250 g chacune. Une portion est colorée : 250 g = 0,25 kg. À droite : vers une unité plus grande, le nombre diminue ; vers une unité plus petite, il augmente.",
        "legende_figure": "1 kg séparé en 4 portions de 0,25 kg : une portion vaut 250 g.",
        "mots_cles": [
          {
            "terme": "Kilogramme (kg)",
            "definition": "1 000 grammes."
          },
          {
            "terme": "Équivalence",
            "definition": "1 kg = 1 000 g."
          }
        ],
        "narration": [
          "À gauche, le grand carré représente 1 kilogramme, c'est-à-dire 1 000 grammes. Il est séparé en 4 portions égales. Regarde la portion colorée : elle vaut 0,25 kilogramme, soit 250 grammes. 250 grammes, c'est donc le quart d'un kilogramme.",
          "Remarque que la quantité de matière ne change pas quand on change d'unité. Seule l'écriture du nombre change.",
          "Regarde maintenant la partie droite de l'image. Quand on passe des grammes aux kilogrammes, d'une petite unité vers une grande, le nombre diminue. Dans l'autre sens, des kilogrammes aux grammes, il augmente.",
          "Par le calcul, on pose un produit croisé avec l'équivalence 1 kilogramme égale 1 000 grammes, puis on biffe les grammes.",
          "Après une conversion, vérifie toujours le sens : vers une unité plus grande, le nombre doit être plus petit.",
          "Regarde maintenant la démarche, sous l'image : sa première étape fait cette conversion."
        ],
        "a_retenir": "1 kg = 1 000 g. Vers une unité plus grande, le nombre diminue : 250 g = 0,25 kg.",
        "demarche": {
          "formule": "1 kg = 1 000 g",
          "etapes": [
            {
              "titre": "Convertir 250 g en kilogrammes",
              "inconnue": "Soit **m** la masse, en kilogrammes (kg), d'une portion de 250 g (la portion colorée du schéma).",
              "lignes": [
                [
                  "1 kg",
                  "1 000 g"
                ],
                [
                  "m",
                  "250 g"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "1 [kg] × 250 [[g]]",
                "den": "1 000 [[g]]",
                "intermediaire": {
                  "num": "250 [kg]",
                  "den": "1 000"
                }
              },
              "resultat": "0,25 kg",
              "biffage": "Les **g** s'annulent en haut et en bas : il reste des kilogrammes."
            }
          ],
          "verification": "250 g, c'est 1 portion sur les 4 du kilogramme : 0,25 kg. Le nombre 0,25 est bien plus petit que 250."
        },
        "question": "Pourquoi 45 g valent-ils 0,045 kg et non 45 000 kg ?",
        "choix": [
          {
            "texte": "Je me dis qu'un kilogramme est un paquet de 1 000 g : 45 g n'en sont qu'une toute petite partie, donc le nombre en kilogrammes doit être beaucoup plus petit que 45.",
            "correct": true,
            "retroaction": "Exact : 45 g, c'est bien moins qu'un paquet de 1 000 g. En kilogrammes, c'est un petit nombre décimal : 0,045 kg."
          },
          {
            "texte": "Je me dis que dès que je vois « kilo », je multiplie par 1 000.",
            "correct": false,
            "erreur": "strategie",
            "retroaction": "Piège fréquent : le préfixe ne dit pas s'il faut multiplier. Ici, on va vers une unité plus grande, donc le nombre diminue. Le produit croisé avec 1 kg = 1 000 g le confirme."
          },
          {
            "texte": "Je me dis qu'un gramme est 1 000 fois plus lourd qu'un kilogramme.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "C'est l'inverse : 1 kg = 1 000 g. Le kilogramme est 1 000 fois plus lourd que le gramme."
          },
          {
            "texte": "Je me dis qu'on remplace simplement « g » par « kg » sans changer le nombre.",
            "correct": false,
            "erreur": "procedure",
            "retroaction": "Si le nombre ne change pas, 45 g deviendraient 45 kg : la masse serait multipliée par 1 000."
          }
        ],
        "solution": "m = (1 kg × 45 g) ÷ 1 000 g = 0,045 kg.",
        "explication": {
          "savoir_que": "1 kg = 1 000 g. Changer d'unité ne change pas la quantité de matière : seule l'écriture du nombre change. Vers une unité plus grande, le nombre diminue.",
          "savoir_comment": "Je pose un produit croisé avec l'équivalence 1 kg = 1 000 g, puis je biffe les grammes. Voici la conversion de 45 g en kilogrammes :",
          "savoir_avec": "La même démarche sert pour toute conversion (mL et L, g et kg, mg et g). Je contrôle avec une image : 45 g, c'est beaucoup moins que la portion de 250 g du kilogramme ; le résultat doit donc être bien plus petit que 0,25 kg."
        },
        "demarche_explication": {
          "formule": "1 kg = 1 000 g",
          "etapes": [
            {
              "titre": "Convertir 45 g en kilogrammes",
              "inconnue": "Soit **m** la masse, en kilogrammes (kg), de 45 g.",
              "lignes": [
                [
                  "1 kg",
                  "1 000 g"
                ],
                [
                  "m",
                  "45 g"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "1 [kg] × 45 [[g]]",
                "den": "1 000 [[g]]",
                "intermediaire": {
                  "num": "45 [kg]",
                  "den": "1 000"
                }
              },
              "resultat": "0,045 kg",
              "biffage": "Les **g** s'annulent en haut et en bas : il reste des kilogrammes."
            }
          ],
          "verification": "45 g, c'est la masse d'une barre de céréales : une petite partie d'un kilogramme, pas 45 000 kg (la masse de 30 voitures)."
        },
        "deuxieme_chance": {
          "question": "Comment vérifies-tu avec ton bon sens le résultat de la conversion de 45 g en kilogrammes ?",
          "choix": [
            {
              "texte": "Je me dis qu'un petit objet de 45 g ne peut pas peser des tonnes : en kilogrammes, ce doit être un petit nombre décimal.",
              "correct": true,
              "retroaction": "Exact : le test de vraisemblance te protège contre une multiplication faite par erreur."
            },
            {
              "texte": "Je me dis que le nombre doit grossir parce que « kilogramme » est un mot plus long que « gramme ».",
              "correct": false,
              "retroaction": "La longueur du mot n'a aucun lien avec la valeur. Vers une unité plus grande, le nombre diminue."
            },
            {
              "texte": "Je me dis que le nombre reste 45, puisque c'est la même quantité de matière.",
              "correct": false,
              "retroaction": "La quantité de matière est la même, mais son écriture change avec l'unité : 45 g = 0,045 kg."
            }
          ],
          "solution": "45 g = 0,045 kg : vers une unité plus grande, le nombre diminue."
        }
      },
      {
        "titre": "Comparer deux solutions",
        "points": 3,
        "source": "Capsule 2.2 — Définition de la concentration",
        "figure": "Deux béchers de même volume, 0,25 L. Le bécher A contient 5 points de sel (5 g, 20 g/L). Le bécher B en contient 10 (10 g, 40 g/L). B est deux fois plus concentré.",
        "legende_figure": "Même volume de 0,25 L : 5 g de sel dans A, 10 g dans B.",
        "mots_cles": [
          {
            "terme": "Plus concentrée",
            "definition": "qui contient plus de soluté dans le même volume."
          }
        ],
        "narration": [
          "En haut de l'image, la légende : chaque point brun représente 1 gramme de sel dissous.",
          "Les deux béchers contiennent le même volume : 0,25 litre. Dans le bécher A, à gauche, compte les points : il y en a 5, donc 5 grammes de sel. Dans le bécher B, à droite, il y en a 10, donc 10 grammes.",
          "Le volume est le même, mais B contient deux fois plus de sel. Sa concentration est donc deux fois plus grande : 40 grammes par litre, contre 20 grammes par litre pour A.",
          "Retiens les deux façons de changer une concentration. Si on ajoute du soluté sans changer le volume, la concentration augmente. Si on ajoute du solvant sans changer la masse de soluté, elle diminue.",
          "Avant de comparer deux solutions, vérifie que leurs volumes sont les mêmes. S'ils sont différents, calcule la concentration de chacune.",
          "Regarde maintenant la démarche, sous l'image : elle calcule la concentration de chaque bécher."
        ],
        "a_retenir": "Pour un même volume, plus il y a de soluté, plus la solution est concentrée.",
        "demarche": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Solution A : la masse de sel dans 1 L",
              "inconnue": "Soit **x** la masse de sel, en grammes (g), dans 1 L de la solution A.",
              "lignes": [
                [
                  "5 g",
                  "0,25 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "5 [g] × 1 [[L]]",
                "den": "0,25 [[L]]"
              },
              "resultat": "20 g",
              "biffage": "Les **L** s'annulent : il reste 20 g dans 1 L.",
              "suite": "⟶ C = 20 g/L"
            },
            {
              "titre": "Solution B : la masse de sel dans 1 L",
              "inconnue": "Soit **y** la masse de sel, en grammes (g), dans 1 L de la solution B.",
              "lignes": [
                [
                  "10 g",
                  "0,25 L"
                ],
                [
                  "y",
                  "1 L"
                ]
              ],
              "symbole": "y",
              "calcul": {
                "num": "10 [g] × 1 [[L]]",
                "den": "0,25 [[L]]"
              },
              "resultat": "40 g",
              "biffage": "Les **L** s'annulent : il reste 40 g dans 1 L.",
              "suite": "⟶ C = 40 g/L"
            }
          ],
          "verification": "Même volume, 2 fois plus de sel : la concentration double (40 g/L contre 20 g/L)."
        },
        "question": "Pourquoi la solution B (30 g de sel dans 500 mL) est-elle beaucoup plus salée que la solution A (10 g de sel dans 500 mL) ?",
        "choix": [
          {
            "texte": "Je me dis que, pour le même volume, B contient trois fois plus de sel : chaque gorgée en contient trois fois plus, donc B est trois fois plus concentrée.",
            "correct": true,
            "retroaction": "Exact : même volume, trois fois plus de soluté. La concentration triple : 60 g/L pour B contre 20 g/L pour A."
          },
          {
            "texte": "Je me dis que le sel de la solution B doit être d'une sorte plus salée que celui de la solution A.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "C'est le même sel de table. Seule la quantité dissoute dans le même volume change."
          },
          {
            "texte": "Je me dis qu'ajouter 30 g de sel fait évaporer une partie de l'eau.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Dissoudre du sel ne fait pas évaporer l'eau : les deux solutions ont toujours 500 mL."
          },
          {
            "texte": "Je me dis que la concentration ne dépend que du volume, pas de la masse de sel.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "La concentration dépend des deux : c'est la masse de soluté divisée par le volume de la solution. Pour un même volume, elle augmente avec la masse de soluté."
          }
        ],
        "solution": "V = 0,5 L. Solution A : x = (10 g × 1 L) ÷ 0,5 L = 20 g, donc 20 g/L. Solution B : y = (30 g × 1 L) ÷ 0,5 L = 60 g, donc 60 g/L. B est 3 fois plus concentrée.",
        "explication": {
          "savoir_que": "La concentration est la masse de soluté divisée par le volume de la solution. Pour un même volume, elle est proportionnelle à la masse de soluté : trois fois plus de sel, trois fois plus concentré.",
          "savoir_comment": "Pour comparer deux solutions, je vérifie d'abord si les volumes sont les mêmes. Sinon, je calcule la concentration de chacune en g/L avec la formule, puis je compare. Ici, les deux volumes sont de 500 mL :",
          "savoir_avec": "Si les volumes diffèrent (par exemple 10 g dans 250 mL et 30 g dans 1 L), comparer les masses ne suffit plus : je ramène chaque solution à 1 L avant de conclure (40 g/L contre 30 g/L)."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume en litres",
              "inconnue": "Soit **V** le volume de chaque solution, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "500 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 500 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,5 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "Solution A : la masse de sel dans 1 L",
              "inconnue": "Soit **x** la masse de sel, en grammes (g), dans 1 L de la solution A.",
              "lignes": [
                [
                  "10 g",
                  "0,5 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "10 [g] × 1 [[L]]",
                "den": "0,5 [[L]]"
              },
              "resultat": "20 g",
              "biffage": "Les **L** s'annulent : il reste 20 g dans 1 L.",
              "suite": "⟶ C = 20 g/L"
            },
            {
              "titre": "Solution B : la masse de sel dans 1 L",
              "inconnue": "Soit **y** la masse de sel, en grammes (g), dans 1 L de la solution B.",
              "lignes": [
                [
                  "30 g",
                  "0,5 L"
                ],
                [
                  "y",
                  "1 L"
                ]
              ],
              "symbole": "y",
              "calcul": {
                "num": "30 [g] × 1 [[L]]",
                "den": "0,5 [[L]]"
              },
              "resultat": "60 g",
              "biffage": "Les **L** s'annulent : il reste 60 g dans 1 L.",
              "suite": "⟶ C = 60 g/L"
            }
          ],
          "verification": "La masse de sel est multipliée par 3 dans le même volume : la concentration est aussi multipliée par 3."
        },
        "deuxieme_chance": {
          "question": "Ton jus de fruits est beaucoup trop sucré. Quel raisonnement appliques-tu pour diminuer sa concentration en sucre ?",
          "choix": [
            {
              "texte": "J'ajoute de l'eau : la même quantité de sucre se répartit dans un plus grand volume, donc la concentration diminue.",
              "correct": true,
              "retroaction": "Exact : ajouter du solvant sans ajouter de soluté diminue la concentration. C'est une dilution."
            },
            {
              "texte": "J'ajoute un peu de sucre pour équilibrer le goût.",
              "correct": false,
              "retroaction": "Ajouter du soluté augmente la concentration : le jus serait encore plus sucré."
            },
            {
              "texte": "Je fais bouillir le jus pour enlever une partie du liquide.",
              "correct": false,
              "retroaction": "En faisant évaporer de l'eau, le même sucre se retrouve dans moins de liquide : la concentration augmente."
            }
          ],
          "solution": "Ajouter de l'eau (du solvant) diminue la concentration."
        }
      },
      {
        "titre": "La dilution",
        "points": 3,
        "source": "Capsule 2.2 — La dilution et le volume",
        "figure": "Avant : un bécher de 0,1 L contient 12 points de sucre (6 g, 60 g/L). On ajoute 0,1 L d'eau. Après : un bécher de 0,2 L contient les mêmes 12 points, plus espacés (6 g, 30 g/L).",
        "legende_figure": "Les mêmes 6 g de sucre, avant et après l'ajout de 0,1 L d'eau.",
        "mots_cles": [
          {
            "terme": "Dilution",
            "definition": "diminuer la concentration d'une solution en y ajoutant du solvant."
          }
        ],
        "narration": [
          "En haut de l'image, la légende : chaque point brun représente un demi-gramme de sucre.",
          "À gauche, avant : un bécher de 0,1 litre contient 12 points, donc 6 grammes de sucre. Sa concentration est de 60 grammes par litre.",
          "Suis la flèche au centre : on ajoute 0,1 litre d'eau. C'est une **dilution** : on diminue la concentration en ajoutant du solvant.",
          "À droite, après : le volume a doublé, il est maintenant de 0,2 litre. Compte les points : il y en a toujours 12. Le sucre n'est pas parti, il y a encore 6 grammes. Les mêmes particules occupent simplement deux fois plus d'espace : elles sont plus espacées.",
          "Le volume a été multiplié par 2, donc la concentration est divisée par 2 : elle passe de 60 à 30 grammes par litre.",
          "Pendant une dilution, demande-toi : qu'est-ce qui change, et qu'est-ce qui reste pareil ?",
          "Regarde maintenant la démarche, sous l'image : elle confirme ce résultat par le calcul."
        ],
        "a_retenir": "Lors d'une dilution, la masse de soluté ne change pas. Si le volume est multiplié par 2, la concentration est divisée par 2.",
        "demarche": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Avant la dilution : la masse de sucre dans 1 L",
              "inconnue": "Soit **x** la masse de sucre, en grammes (g), dans 1 L de la solution de départ.",
              "lignes": [
                [
                  "6 g",
                  "0,1 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "6 [g] × 1 [[L]]",
                "den": "0,1 [[L]]"
              },
              "resultat": "60 g",
              "biffage": "Les **L** s'annulent : il reste 60 g dans 1 L.",
              "suite": "⟶ C = 60 g/L"
            },
            {
              "titre": "Après la dilution : la masse de sucre dans 1 L",
              "inconnue": "Le volume devient 0,1 L + 0,1 L = 0,2 L ; la masse de sucre reste 6 g. Soit **y** la masse de sucre, en grammes (g), dans 1 L de la solution diluée.",
              "lignes": [
                [
                  "6 g",
                  "0,2 L"
                ],
                [
                  "y",
                  "1 L"
                ]
              ],
              "symbole": "y",
              "calcul": {
                "num": "6 [g] × 1 [[L]]",
                "den": "0,2 [[L]]"
              },
              "resultat": "30 g",
              "biffage": "Les **L** s'annulent : il reste 30 g dans 1 L.",
              "suite": "⟶ C = 30 g/L"
            }
          ],
          "verification": "Le volume a doublé et la masse n'a pas changé : la concentration est bien divisée par 2."
        },
        "question": "Pourquoi la concentration d'un café sucré passe-t-elle de 40 g/L à 20 g/L quand on y ajoute autant d'eau qu'il y avait de café ?",
        "choix": [
          {
            "texte": "Je me dis que la même quantité de sucre se retrouve dans deux fois plus de liquide : chaque gorgée contient deux fois moins de sucre.",
            "correct": true,
            "retroaction": "Exact : la masse de sucre ne change pas, mais le volume double. La concentration est divisée par 2."
          },
          {
            "texte": "Je me dis que l'eau ajoutée détruit la moitié du sucre.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "L'eau ne détruit pas le sucre : la masse de sucre reste la même. Elle est seulement répartie dans un plus grand volume."
          },
          {
            "texte": "Je me dis qu'ajouter de l'eau augmente la concentration, puisqu'il y a plus de liquide.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "C'est l'inverse : plus de solvant pour la même masse de soluté, c'est une concentration plus faible."
          },
          {
            "texte": "Je me dis qu'une partie du sucre s'évapore quand le niveau du liquide monte.",
            "correct": false,
            "erreur": "conception",
            "retroaction": "Le sucre ne s'évapore pas : il reste en entier dans la solution."
          }
        ],
        "solution": "La masse reste 4 g. Avant : x = (4 g × 1 L) ÷ 0,1 L = 40 g, donc 40 g/L. Après : y = (4 g × 1 L) ÷ 0,2 L = 20 g, donc 20 g/L.",
        "explication": {
          "savoir_que": "Lors d'une dilution, la masse de soluté ne change pas ; seul le volume de la solution augmente. Si le volume double, la concentration est divisée par 2.",
          "savoir_comment": "Je calcule la concentration avant, puis après l'ajout d'eau, avec la même masse de soluté et le nouveau volume. Exemple : 4 g de sucre dans 100 mL de café, puis on ajoute 100 mL d'eau.",
          "savoir_avec": "Devant toute dilution, je me demande : « Qu'est-ce qui reste pareil ? » La masse de soluté. Si on ajoute deux fois plus d'eau que de café (le volume triple), la concentration est divisée par 3. Je vérifie : ajouter du solvant ne peut que diminuer la concentration."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume de départ en litres",
              "inconnue": "Soit **V** le volume de café, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "100 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 100 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,1 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "Avant la dilution : la masse de sucre dans 1 L",
              "inconnue": "Soit **x** la masse de sucre, en grammes (g), dans 1 L de café.",
              "lignes": [
                [
                  "4 g",
                  "0,1 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "4 [g] × 1 [[L]]",
                "den": "0,1 [[L]]"
              },
              "resultat": "40 g",
              "biffage": "Les **L** s'annulent : il reste 40 g dans 1 L.",
              "suite": "⟶ C = 40 g/L"
            },
            {
              "titre": "Après la dilution : la masse de sucre dans 1 L",
              "inconnue": "Le volume devient 0,1 L + 0,1 L = 0,2 L ; la masse de sucre reste 4 g. Soit **y** la masse de sucre, en grammes (g), dans 1 L de café dilué.",
              "lignes": [
                [
                  "4 g",
                  "0,2 L"
                ],
                [
                  "y",
                  "1 L"
                ]
              ],
              "symbole": "y",
              "calcul": {
                "num": "4 [g] × 1 [[L]]",
                "den": "0,2 [[L]]"
              },
              "resultat": "20 g",
              "biffage": "Les **L** s'annulent : il reste 20 g dans 1 L.",
              "suite": "⟶ C = 20 g/L"
            }
          ],
          "verification": "Le volume a doublé, la masse de sucre est la même : la concentration est divisée par 2."
        },
        "deuxieme_chance": {
          "question": "On dilue un sirop contre la toux en doublant son volume avec de l'eau. Comment évoluent la quantité de médicament et la concentration ?",
          "choix": [
            {
              "texte": "Je me dis que la quantité de médicament reste la même, mais comme le liquide a doublé, la concentration est divisée par 2.",
              "correct": true,
              "retroaction": "Exact : le soluté se conserve, le volume double, la concentration est divisée par 2."
            },
            {
              "texte": "Je me dis que la quantité de médicament double en même temps que le volume.",
              "correct": false,
              "retroaction": "L'eau ajoutée ne crée pas de médicament : la quantité de soluté reste la même."
            },
            {
              "texte": "Je me dis que la concentration ne change pas, car l'eau n'a aucun effet sur le médicament.",
              "correct": false,
              "retroaction": "Ajouter du solvant change toujours la concentration : c'est le principe même de la dilution."
            }
          ],
          "solution": "La masse de médicament se conserve ; le volume double, donc la concentration est divisée par 2."
        }
      },
      {
        "titre": "Vérifier un calcul de concentration",
        "points": 3,
        "source": "Diagnostic d'erreur",
        "figure": "Deux feuilles. À gauche : 8 g et 250 mL, puis le calcul C = 8 ÷ 250 avec le 250 encerclé, et le résultat C = 0,032 g/L marqué d'un X (erroné). À droite : 250 mL = ¼ L ; quatre quarts de litre contenant chacun 8 g, regroupés par une accolade : 1 L ≈ 32 g ; puis C ≈ 32 g/L, marqué d'un crochet (attendu).",
        "legende_figure": "À gauche, un calcul où le volume est resté en mL ; à droite, l'estimation de l'expert.",
        "mots_cles": [
          {
            "terme": "Estimation",
            "definition": "un calcul rapide pour prévoir l'ordre de grandeur du résultat."
          },
          {
            "terme": "Vraisemblable",
            "definition": "un résultat qui a du sens dans la situation."
          }
        ],
        "narration": [
          "Regarde la feuille de gauche. Un élève devait trouver la concentration de 8 grammes de sucre dans 250 millilitres d'eau. Il a divisé 8 par 250 et obtenu 0,032 gramme par litre. Le X rouge te dit que ce résultat est faux.",
          "Regarde le 250 encerclé. Il est en millilitres, pas en litres. C'est une erreur fréquente, et le résultat est 1 000 fois trop petit. Il n'a d'ailleurs pas de sens : 8 grammes de sucre dans une tasse, c'est une boisson bien sucrée, alors que 0,032 gramme par litre, ce serait presque de l'eau pure.",
          "Passe maintenant à la feuille de droite : c'est l'estimation d'un expert. 250 millilitres, c'est un quart de litre. Regarde les quatre cases : chacune est un quart de litre qui contient 8 grammes. L'accolade les regroupe : ensemble, elles font 1 litre, donc environ 32 grammes de sucre. Le crochet vert confirme le résultat attendu : environ 32 grammes par litre.",
          "Avant de conclure, pose-toi deux questions : le volume est-il en litres ? Mon résultat est-il vraisemblable ?",
          "Regarde maintenant la démarche, sous l'image : elle convertit d'abord le volume en litres, puis pose le produit croisé."
        ],
        "a_retenir": "Pour vérifier un calcul : 1) l'unité du volume est-elle en litres ? 2) le résultat est-il vraisemblable ?",
        "demarche": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume en litres",
              "inconnue": "Soit **V** le volume de solution, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "250 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 250 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,25 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "La masse de sucre dans 1 L",
              "inconnue": "Soit **x** la masse de sucre, en grammes (g), dans 1 L de solution.",
              "lignes": [
                [
                  "8 g",
                  "0,25 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "8 [g] × 1 [[L]]",
                "den": "0,25 [[L]]"
              },
              "resultat": "32 g",
              "biffage": "Les **L** s'annulent : il reste 32 g dans 1 L.",
              "suite": "⟶ C = 32 g/L"
            }
          ],
          "verification": "Le résultat correspond à l'estimation : environ 32 g/L, et non 0,032 g/L."
        },
        "question": "Un élève dissout 15 g de sel dans 500 mL d'eau et écrit : « C = 15 ÷ 500 = 0,03 g/L ». Quelle analyse de son erreur est juste ?",
        "choix": [
          {
            "texte": "Je me dis qu'il a divisé par des millilitres sans convertir : il a trouvé la masse dans 1 mL. Dans 1 L, il y en a 1 000 fois plus, soit 30 g/L.",
            "correct": true,
            "retroaction": "Exact : 0,03 g, c'est ce qu'il y a dans 1 mL. Dans 1 L, il y en a 1 000 fois plus : 30 g/L."
          },
          {
            "texte": "Je me dis qu'il aurait dû diviser le volume par la masse : 500 ÷ 15.",
            "correct": false,
            "erreur": "procedure",
            "retroaction": "La concentration est toujours la masse de soluté divisée par le volume de la solution, jamais l'inverse. L'erreur vient du volume resté en mL."
          },
          {
            "texte": "Je me dis que son calcul est bon, mais qu'il a oublié d'arrondir à l'entier.",
            "correct": false,
            "erreur": "strategie",
            "retroaction": "Ce n'est pas une question d'arrondi : diviser par 500 au lieu de 0,5 donne un résultat 1 000 fois trop petit."
          },
          {
            "texte": "Je me dis qu'il aurait dû multiplier 15 par 500 pour tenir compte de toute l'eau.",
            "correct": false,
            "erreur": "procedure",
            "retroaction": "Multiplier la masse par le volume ne donne pas une concentration : on divise la masse de soluté par le volume de la solution, en litres."
          }
        ],
        "solution": "Soit V en L : V = (1 L × 500 mL) ÷ 1 000 mL = 0,5 L. Soit x la masse dans 1 L : x = (15 g × 1 L) ÷ 0,5 L = 30 g, donc C = 30 g/L. L'élève a divisé par des mL : son résultat est 1 000 fois trop petit.",
        "explication": {
          "savoir_que": "La concentration est la masse de soluté divisée par le volume de la solution en litres. Un résultat obtenu en divisant par des millilitres est la masse dans 1 mL, 1 000 fois plus petite que la masse dans 1 L.",
          "savoir_comment": "Pour vérifier un calcul, je contrôle trois choses : la formule (la masse sur le volume), les unités (le volume en litres) et la vraisemblance du résultat. Voici la démarche correcte :",
          "savoir_avec": "Je fais ce contrôle sur tout calcul, le mien comme celui d'un autre : 0,03 g/L pour 15 g de sel dans un demi-litre serait une eau presque pure, ce qui est invraisemblable. Un résultat qui contredit le bon sens signale souvent une unité oubliée."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume en litres",
              "inconnue": "Soit **V** le volume de solution, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "500 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 500 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,5 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "La masse de sel dans 1 L",
              "inconnue": "Soit **x** la masse de sel, en grammes (g), dans 1 L de solution.",
              "lignes": [
                [
                  "15 g",
                  "0,5 L"
                ],
                [
                  "x",
                  "1 L"
                ]
              ],
              "symbole": "x",
              "calcul": {
                "num": "15 [g] × 1 [[L]]",
                "den": "0,5 [[L]]"
              },
              "resultat": "30 g",
              "biffage": "Les **L** s'annulent : il reste 30 g dans 1 L.",
              "suite": "⟶ C = 30 g/L"
            }
          ],
          "verification": "15 g dans un demi-litre, c'est 30 g dans un litre entier."
        },
        "deuxieme_chance": {
          "question": "Pour 15 g de sel dans 500 mL, comment estimes-tu mentalement la concentration en g/L afin de vérifier un calcul ?",
          "choix": [
            {
              "texte": "Je me dis que 500 mL, c'est un demi-litre : s'il y a 15 g dans un demi-litre, il y en a 30 g dans un litre entier.",
              "correct": true,
              "retroaction": "Exact : cette estimation donne 30 g/L et permet de rejeter tout de suite le résultat 0,03 g/L."
            },
            {
              "texte": "Je me dis que 500 est un grand nombre, donc le résultat doit être très proche de zéro.",
              "correct": false,
              "retroaction": "500 mL, c'est seulement 0,5 L. C'est l'unité qui trompe l'intuition, pas la quantité d'eau."
            },
            {
              "texte": "Je me dis qu'il faut multiplier 15 par 500 pour obtenir la concentration totale.",
              "correct": false,
              "retroaction": "La concentration est une division de la masse par le volume, jamais une multiplication."
            }
          ],
          "solution": "15 g dans 0,5 L, c'est 30 g dans 1 L : C ≈ 30 g/L."
        }
      },
      {
        "titre": "Préparer une solution au laboratoire",
        "points": 3,
        "source": "Situation de laboratoire",
        "figure": "Un récipient de 1 L à 30 g/L contient 10 points de sel (chaque point vaut 3 g). Un trait le coupe en deux moitiés de 0,5 L contenant chacune 5 points, soit 15 g. À droite : une balance porte 5 points de sel (15 g) ; une flèche mène à un bécher rempli d'eau jusqu'au trait de 500 mL, où les 5 points sont dissous : 30 g/L.",
        "legende_figure": "1 L à 30 g/L contient 30 g ; chaque moitié de 0,5 L en contient 15 g.",
        "mots_cles": [
          {
            "terme": "Masse à peser",
            "definition": "la masse de soluté à mesurer sur la balance."
          },
          {
            "terme": "Volume de solution",
            "definition": "le volume total final, soluté compris."
          }
        ],
        "narration": [
          "Au laboratoire, on doit parfois préparer une solution précise. Ici, on veut 500 millilitres d'eau salée à 30 grammes par litre. La question est : combien de sel faut-il peser ?",
          "À gauche, le récipient représente 1 litre de cette solution. Chaque point brun vaut 3 grammes de sel. Il y en a 10, donc 30 grammes dans 1 litre. C'est exactement ce que veut dire 30 grammes par litre.",
          "Regarde le trait qui coupe le récipient en deux. Chaque moitié, c'est 0,5 litre, soit 500 millilitres. Compte les points dans une moitié : il y en a 5, donc 15 grammes. C'est la masse à peser.",
          "Regarde maintenant la partie droite. Sur la balance, on pèse les 15 grammes de sel. Suis la flèche : on met ce sel dans le bécher, puis on ajoute de l'eau jusqu'au trait pointillé de 500 millilitres. Attention : c'est la solution au total qui doit mesurer 500 millilitres. On n'ajoute pas 500 millilitres d'eau en plus du sel. On obtient bien 30 grammes par litre.",
          "Compare toujours le volume demandé à 1 litre : la moitié ? le quart ? Puis prends la même fraction de la masse.",
          "Regarde maintenant la démarche, sous l'image : elle confirme la masse à peser par un produit croisé."
        ],
        "a_retenir": "La concentration donne la masse de soluté pour 1 L. Je pose un produit croisé avec le volume demandé, exprimé en litres, pour trouver la masse à peser.",
        "demarche": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume demandé en litres",
              "inconnue": "Soit **V** le volume de solution à préparer, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "500 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 500 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,5 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "La masse de sel à peser",
              "inconnue": "Soit **m** la masse de sel, en grammes (g), à dissoudre pour obtenir 0,5 L de solution à 30 g/L.",
              "lignes": [
                [
                  "30 g",
                  "1 L"
                ],
                [
                  "m",
                  "0,5 L"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "30 [g] × 0,5 [[L]]",
                "den": "1 [[L]]"
              },
              "resultat": "15 g",
              "biffage": "Les **L** s'annulent : il reste la masse à peser, en grammes."
            }
          ],
          "verification": "0,5 L est la moitié d'un litre ; 15 g est bien la moitié de 30 g."
        },
        "question": "Tu dois préparer 250 mL d'une solution salée à 40 g/L. Quel raisonnement te donne la masse de sel à peser ?",
        "choix": [
          {
            "texte": "Je me dis que 40 g/L, c'est 40 g pour un litre ; 250 mL n'est que le quart d'un litre, donc je pèse le quart de 40 g, soit 10 g.",
            "correct": true,
            "retroaction": "Exact : 250 mL = 0,25 L, le quart d'un litre. Il faut le quart de 40 g, soit 10 g."
          },
          {
            "texte": "Je multiplie 40 par 250 pour tenir compte de tout le volume.",
            "correct": false,
            "erreur": "procedure",
            "retroaction": "40 × 250 donnerait 10 000 g, soit 10 kg de sel pour une tasse de solution : le volume aurait dû être converti en litres."
          },
          {
            "texte": "Je pèse 40 g, puisque la concentration demandée est de 40 g/L.",
            "correct": false,
            "erreur": "transfert",
            "retroaction": "40 g, c'est pour 1 L complet. Dans 250 mL, 40 g donneraient une solution 4 fois trop concentrée (160 g/L)."
          },
          {
            "texte": "Je pèse la moitié de 40 g, puisque 250 mL est la moitié d'un litre.",
            "correct": false,
            "erreur": "execution",
            "retroaction": "La moitié d'un litre, c'est 500 mL. 250 mL en est le quart : il faut 10 g, pas 20 g."
          }
        ],
        "solution": "Soit V en L : V = (1 L × 250 mL) ÷ 1 000 mL = 0,25 L. Soit m la masse : m = (40 g × 0,25 L) ÷ 1 L = 10 g.",
        "explication": {
          "savoir_que": "La concentration indique la masse de soluté pour 1 L. Pour un autre volume, la masse à peser est proportionnelle au volume : 250 mL, c'est le quart d'un litre, donc le quart de la masse.",
          "savoir_comment": "Je pars de la formule de la concentration, je remplace les lettres par les valeurs (le volume en litres), puis je pose le produit croisé. Voici la démarche :",
          "savoir_avec": "Au laboratoire, la même démarche sert pour tout volume et toute concentration. Je vérifie avant de peser : un volume plus petit que 1 L demande une masse plus petite que le nombre de grammes indiqué en g/L."
        },
        "demarche_explication": {
          "formule": "concentration",
          "etapes": [
            {
              "titre": "Le volume demandé en litres",
              "inconnue": "Soit **V** le volume de solution à préparer, en litres (L).",
              "lignes": [
                [
                  "1 L",
                  "1 000 mL"
                ],
                [
                  "V",
                  "250 mL"
                ]
              ],
              "symbole": "V",
              "calcul": {
                "num": "1 [L] × 250 [[mL]]",
                "den": "1 000 [[mL]]"
              },
              "resultat": "0,25 L",
              "biffage": "Les **mL** s'annulent : il reste des litres.",
              "rapport": false
            },
            {
              "titre": "La masse de sel à peser",
              "inconnue": "Soit **m** la masse de sel, en grammes (g), pour 0,25 L de solution à 40 g/L.",
              "lignes": [
                [
                  "40 g",
                  "1 L"
                ],
                [
                  "m",
                  "0,25 L"
                ]
              ],
              "symbole": "m",
              "calcul": {
                "num": "40 [g] × 0,25 [[L]]",
                "den": "1 [[L]]"
              },
              "resultat": "10 g",
              "biffage": "Les **L** s'annulent : il reste la masse à peser, en grammes."
            }
          ],
          "verification": "250 mL est le quart d'un litre, et 10 g est le quart de 40 g."
        },
        "deuxieme_chance": {
          "question": "Pour préparer 250 mL d'une solution à 40 g/L, quelle déduction te donne la masse de sel à peser ?",
          "choix": [
            {
              "texte": "Je me dis que le volume demandé est 4 fois plus petit qu'un litre, donc la masse doit aussi être 4 fois plus petite que 40 g : 10 g.",
              "correct": true,
              "retroaction": "Exact : la masse à peser est proportionnelle au volume préparé."
            },
            {
              "texte": "Je me dis qu'il y a moins d'eau qu'un litre, donc je dois doubler la masse de sel pour compenser.",
              "correct": false,
              "retroaction": "Plus de sel dans moins d'eau donnerait une solution beaucoup trop concentrée."
            },
            {
              "texte": "Je me dis que la masse reste 40 g, quel que soit le volume préparé.",
              "correct": false,
              "retroaction": "40 g dans 250 mL donneraient 160 g/L, une solution 4 fois trop concentrée."
            }
          ],
          "solution": "m = (40 g × 0,25 L) ÷ 1 L = 10 g."
        }
      }
    ]
  };

  return {
    contexte: {
      sujet: "La concentration des solutions",
      niveau: "3e secondaire, science et technologie",
      nb: 8,
      format: "narration",
      outil: "gemini",
      source: "joint",
      texteSource: "",
      precisions: ""
    },
    reponseIA: '```json\n' + JSON.stringify(reponse, null, 2) + '\n```',
    images: {
      "Soluté, solvant et solution homogène": "07/p1_solution",
      "Ce que veut dire une concentration en g/L": "07/p2_grammes_par_litre",
      "Des millilitres aux litres": "07/p3_millilitres_litres",
      "Des grammes aux kilogrammes": "07/p4_grammes_kilogrammes",
      "Comparer deux solutions": "07/p5_comparer",
      "La dilution": "07/p6_dilution",
      "Vérifier un calcul de concentration": "07/p7_analyse_erreur",
      "Préparer une solution au laboratoire": "07/p8_preparer"
    }
  };
})();
