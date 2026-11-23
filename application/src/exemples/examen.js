/**
 * Exemple « Nouvelle version ou corrigé d'un examen » : version B du mini-test sur la
 * concentration (repris de l'exemple 03, Exemples/03_Nouvelle_Version_Examen), 7 problèmes
 * sur 2 pages, 14 points, avec son corrigé (méthodes A et B).
 */
(function () {
  'use strict';

  const FORMULE = {
    gauche: 'C',
    numerateur: 'm_soluté',
    denominateur: 'V_solution',
    legende: [
      { symbole: 'C', definition: 'concentration en grammes par litre (g/L)' },
      { symbole: 'm_soluté', definition: 'masse de soluté en grammes (g)' },
      { symbole: 'V_solution', definition: 'volume de la solution en litres (L)' }
    ]
  };

  /** Problème « concentration en g/L et en % » à partir d'une masse (g) et d'un volume (mL). */
  function concentration(page, titre, enonce, masse, volumeMl, espace, erreurs) {
    const vL = String(volumeMl / 1000).replace('.', ',');
    const gL = String(masse / (volumeMl / 1000)).replace('.', ',');
    const pct = String(masse * 100 / volumeMl).replace('.', ',');
    return {
      page: page, type: 'calcul', titre: titre, points: 2, enonce: enonce, blocs: [{ bloc: 'zone', forme: 'blanc', hauteur: espace }],
      ligne_reponse: [{ etiquette: 'en g/L', attendu: gL + ' g/L' }, { etiquette: 'en %', attendu: pct + ' %' }],
      alignement: 'gauche',
      demarche: {
        formule: FORMULE,
        etapes: [
          {
            titre: 'La concentration en g/L',
            inconnue: 'Soit x la masse de soluté, en grammes (g), dans 1 L de solution.',
            lignes: [[masse + ' g', vL + ' L'], ['x', '1 L']],
            symbole: 'x',
            calcul: { num: masse + ' [g] × 1 [[L]]', den: vL + ' [[L]]' },
            resultat: gL + ' g',
            suite: '⟶ C = ' + gL + ' g/L',
            biffage: 'Les L s\'annulent : il reste des grammes dans 1 L.'
          },
          {
            titre: 'La concentration en %',
            rapport: false,
            inconnue: 'Soit y la masse de soluté, en grammes (g), dans 100 mL de solution.',
            lignes: [[masse + ' g', volumeMl + ' mL'], ['y', '100 mL']],
            symbole: 'y',
            calcul: { num: masse + ' [g] × 100 [[mL]]', den: volumeMl + ' [[mL]]' },
            resultat: pct + ' g',
            suite: '⟶ C = ' + pct + ' %',
            biffage: 'Les mL s\'annulent : ' + pct + ' g dans 100 mL, soit ' + pct + ' %.'
          }
        ]
      },
      methode_b: {
        lignes: ['V = ' + volumeMl + ' mL = ' + vL + ' L', 'C = \\dfrac{' + masse + '\\ [g]}{' + vL + '\\ [L]}', 'C_{\\%} = \\dfrac{' + masse + '\\ [g]}{' + volumeMl + '\\ [mL]} × 100'],
        symbole: 'C',
        resultat: gL + ' g/L \\quad ' + pct + ' %'
      },
      erreurs_frequentes: erreurs
    };
  }

  /** Problème « masse de soluté » à partir d'une concentration (g/L) et d'un volume (mL). */
  function masse(page, titre, enonce, cGL, volumeMl, espace, erreurs, etapeVolume) {
    const vL = String(volumeMl / 1000).replace('.', ',');
    const m = String(Math.round(cGL * volumeMl) / 1000).replace('.', ',');
    const etapes = etapeVolume ? [etapeVolume] : [];
    etapes.push({
      titre: 'La masse de soluté',
      inconnue: 'Soit x la masse de soluté, en grammes (g), dans ' + vL + ' L de solution.',
      lignes: [[cGL + ' g', '1 L'], ['x', vL + ' L']],
      symbole: 'x',
      calcul: { num: cGL + ' [g] × ' + vL + ' [[L]]', den: '1 [[L]]' },
      resultat: m + ' g',
      biffage: 'Les L s\'annulent : il reste des grammes.'
    });
    return {
      page: page, type: 'calcul', titre: titre, points: 2, enonce: enonce, blocs: [{ bloc: 'zone', forme: 'blanc', hauteur: espace }],
      ligne_reponse: [{ etiquette: '', attendu: m + ' g' }],
      alignement: 'droite',
      demarche: { formule: FORMULE, etapes: etapes },
      methode_b: {
        lignes: ['C = \\dfrac{m}{V} ⟶ m = C × V', 'V = ' + volumeMl + ' mL = ' + vL + ' L', 'm = ' + cGL + ' [g]/[[L]] × ' + vL + ' [[L]]'],
        symbole: 'm',
        resultat: m + ' g'
      },
      erreurs_frequentes: erreurs
    };
  }

  const reponse = {
    titre: 'Mini-test sur la concentration',
    version: 'B',
    matiere: 'Science et technologie, 3e secondaire',
    consigne: '* Pour chaque problème, laisse les traces de ta démarche complète (formule, variables et unités de mesure) et encercle ta réponse.',
    cartouche: ['Nom', 'Groupe'],
    questions: [
      concentration(1, 'Concentration d\'une solution de soluté',
        'Quelle serait la concentration en g/L et en % d\'une solution de 200 mL qui contient 8 g de soluté ?', 8, 200, 4, [
          { reponse: '0,04 g/L', erreur: 'le volume est laissé en mL : 8 ÷ 200' },
          { reponse: '25 g/L', erreur: 'la formule est inversée : 200 ÷ 8' }
        ]),
      concentration(1, 'Dissolution d\'hydroxyde de sodium',
        'On a dissout 18 g de NaOH dans de l\'eau. Le volume de cette solution est 300 mL. Quelle est la concentration de cette solution aqueuse en g/L et en % ?', 18, 300, 4, [
          { reponse: '0,06 g/L', erreur: 'le volume est laissé en mL : 18 ÷ 300' },
          { reponse: '16,67 g/L', erreur: 'la formule est inversée : 300 ÷ 18' }
        ]),
      masse(1, 'Masse requise pour une préparation',
        'Quelle masse de soluté utiliserais-tu pour faire une solution de 150 mL de concentration 40 g/L ?', 40, 150, 5, [
          { reponse: '6 000 g', erreur: 'le volume est laissé en mL : 40 × 150' },
          { reponse: '0,27 g', erreur: 'la masse est isolée par une division : 40 ÷ 150' }
        ]),
      masse(2, 'Préparation d\'une solution d\'eau salée',
        'Tu veux faire 250 mL d\'une solution d\'eau salée de concentration 12 g/L. Quelle masse de sel devras-tu utiliser ?', 12, 250, 4, [
          { reponse: '3 000 g', erreur: 'le volume est laissé en mL : 12 × 250' },
          { reponse: '20,83 g', erreur: 'division du volume par la concentration : 250 ÷ 12' }
        ]),
      {
        page: 2, type: 'calcul', titre: 'Volume nécessaire à une solution', points: 2,
        enonce: 'Pour avoir une concentration de 25 g/L à partir d\'un échantillon de 5 g de soluté, quel volume sera nécessaire à la solution ?',
        blocs: [{ bloc: 'zone', forme: 'blanc', hauteur: 4 }],
        ligne_reponse: [{ etiquette: '', attendu: '0,2 L (200 mL)' }],
        alignement: 'droite',
        demarche: {
          formule: FORMULE,
          etapes: [{
            titre: 'Le volume de la solution',
            rapport: false,
            inconnue: 'Soit x le volume de la solution, en litres (L), qui contient 5 g de soluté.',
            lignes: [['1 L', '25 g'], ['x', '5 g']],
            symbole: 'x',
            calcul: { num: '1 [L] × 5 [[g]]', den: '25 [[g]]' },
            resultat: '0,2 L',
            suite: '= 200 mL',
            biffage: 'Les g s\'annulent : il reste des litres.'
          }],
          verification: 'Chaque litre contient 25 g ; 5 g, c\'est le cinquième de 25 g, donc le cinquième d\'un litre : 0,2 L.'
        },
        methode_b: {
          lignes: ['C = \\dfrac{m}{V} ⟶ V = \\dfrac{m}{C}', 'V = \\dfrac{5\\ [[g]]}{25\\ [[g]]/[L]}'],
          symbole: 'V',
          resultat: '0,2 L'
        },
        erreurs_frequentes: [
          { reponse: '125 L', erreur: 'multiplication de la masse par la concentration : 5 × 25' },
          { reponse: '5 L', erreur: 'division de la concentration par la masse : 25 ÷ 5' }
        ]
      },
      concentration(2, 'Concentration en sucre d\'un thé glacé',
        'Sur l\'étiquette nutritionnelle d\'un thé glacé, on remarque que 200 mL de thé contiennent 18 g de sucre. Calcule la concentration de ce thé en g/L et en %.', 18, 200, 4, [
          { reponse: '0,09 g/L', erreur: 'le volume est laissé en mL : 18 ÷ 200' },
          { reponse: '3 600 g/L', erreur: 'multiplication au lieu de division : 18 × 200' }
        ]),
      masse(2, 'Préparation d\'un sirop pédiatrique',
        'Selon la prescription de son médecin, un enfant doit prendre un sirop pédiatrique dont la concentration est de 4 g/L. La posologie est la suivante : prendre 10 mL de sirop deux fois par jour pendant 7 jours. Quelle quantité de médicament en poudre devra utiliser le pharmacien pour préparer ce sirop ?', 4, 140, 4, [
          { reponse: '0,04 g', erreur: 'seule une prise de 10 mL est prise en compte' },
          { reponse: '0,08 g', erreur: 'seule la dose d\'une journée (20 mL) est prise en compte' }
        ], {
          titre: 'Le volume total de sirop',
          rapport: false,
          inconnue: 'Soit V le volume total de sirop, en millilitres (mL), pour 7 jours (2 × 10 mL = 20 mL par jour).',
          lignes: [['20 mL', '1 jour'], ['V', '7 jours']],
          symbole: 'V',
          calcul: { num: '20 [mL] × 7 [[jours]]', den: '1 [[jour]]' },
          resultat: '140 mL',
          suite: '= 0,14 L'
        })
    ]
  };

  window.MoodleAIExemples = window.MoodleAIExemples || {};
  window.MoodleAIExemples.examen = {
    contexte: {
      mode: 'version', version: 'B', sujet: 'Mini-test sur la concentration', niveau: '3e secondaire, science et technologie',
      nbPages: 2, outil: 'gemini', source: 'joint', texteSource: '', precisions: ''
    },
    reponseIA: JSON.stringify(reponse, null, 2)
  };
})();
