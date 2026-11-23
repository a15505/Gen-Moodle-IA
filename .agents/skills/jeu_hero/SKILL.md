---
name: jeu_hero
description: >-
  Méthode de scénarisation et conception de jeux de rôle interactifs didactiques
  (Jeu dont vous êtes le héros / CYOA) pour les sciences au secondaire (PFEQ),
  intégré à l'Archétype 2 et à l'Assistant pédagogique de moteur-ui.
---

# Méthode de Jeu dont vous êtes le héros (Sciences Secondaire & Moteur-UI)

Ce skill régit l'accompagnement d'un enseignant dans la scénarisation d'un jeu de rôle d'apprentissage scientifique à embranchements multiples et convergents (CYOA — Choose Your Own Adventure), matérialisé sous l'Archétype 2 de `moteur-ui`.

---

## 1. Principes Didactiques Directeurs

1. **Ancrage PFEQ** : Chaque dilemme ou embranchement doit mobiliser un concept prescrit du programme de science québécois (Univers matériel, Univers vivant, Terre et espace, Univers technologique).
2. **Contextualisation Réaliste** : L'élève est placé dans un rôle actif (ex. : responsable environnemental, ingénieur de maintenance, expert toxicologue).
3. **Explosion Combinatoire Contrôlée** : Structure arborescente convergente vers des points de passage obligés (goulots d'étranglement).

---

## 2. Règle Absolue de Scoring Cumulatif (Départ Strict à 0)

> [!IMPORTANT]
> **Le score débute impérativement à 0** (`score = 0`, `INITIAL_SCORE: 0`, `cmi.core.score.raw = 0`).
> Il est strictement interdit d'initialiser le score à 100 avec des malus dégressifs.
> Le score augmente au fur et à mesure que l'élève résout des énigmes, prend de bonnes décisions ou formule des hypothèses scientifiquement justes.

- **Vérification arithmétique** : La somme des gains de points attribués le long du parcours optimal (sans faute) menant à la victoire finale doit égaler **exactement 100 %**.
- **Gestion des Vies / Droits à l'erreur** :
  - L'élève dispose d'une réserve de droits à l'erreur (ex. : 3 tentatives ou vies).
  - En cas d'erreur didactique, une vie est retirée et l'Assistant pédagogique fournit immédiatement une rétroaction explicative du phénomène scientifique sous-jacent.
- **Fin de partie (Game Over)** : Si le nombre de vies tombe à 0 ou en cas de décision critique fatale, l'activité transmet le statut `"failed"` à Moodle.
- **Victoire** : Résolution du scénario avec score $\ge 60\%$, transmettant le statut `"passed"` à Moodle.

---

## 3. Intégration Native avec l'Archétype 2 de `moteur-ui`

L'activité ludifiée s'appuie directement sur les composants éprouvés de `moteur-ui` :

1. **Assistant Pédagogique Modulaire (`.coach-assistant-widget`)** :
   - Héberge les dialogues narratifs, les transmissions de mission, et les rétroactions formatives.
   - Présente le dernier message par défaut avec balayage molette/swipe et dépliage de l'historique complet via chevron.
2. **Zone de Choix et Dilemmes (`.options-grid`)** :
   - Présentation sobre sous forme de cartes d'options cliquables accessibles au clavier.
   - Zéro icône fantaisiste devant les intitulés de choix.
3. **En-tête Secondaire (HUD)** :
   - Affiche le compteur de vies restantes (ex. : `Tentatives : 3 / 3`) et le score cumulé en temps réel (`Score : X / 100 pts`).
   - Escamotable au défilement vers le bas et réactif à la remontée vers le haut.
