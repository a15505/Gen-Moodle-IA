---
name: concepteur_web
description: >-
  Création et prototypage d'interfaces web et d'écrans interactifs selon la
  méthodologie et les tokens de moteur-ui (Archétype 1 Dashboard ou Archétype 2
  Activité interactive). Zéro framework externe, 100% conforme Loi 25 et WCAG 2.1 AAA.
---

# Concepteur Web (Moteur-UI)

Ce skill guide la création d'interfaces utilisateur modernes, épurées et hautement accessibles selon les standards de [`moteur-ui`](../../moteur-ui/AGENTS.md).

---

## 1. Choix Obligatoire de l'Archétype

Toute page web doit s'inscrire dans l'un des deux archétypes documentés dans [`moteur-ui/METHODOLOGIE_GENERATION.md`](../../moteur-ui/METHODOLOGIE_GENERATION.md) :

### Archétype 1 : Tableau de Bord Plein Écran & Dense (Dashboard)
- **En-tête étroit (`48px`) OBLIGATOIREMENT CLAIR** : Fond blanc pur (`#ffffff`), encre sombre (`#0f172a`), bordure 1px nette. Bouton burger à droite ouvrant le tiroir de configuration (`.config-drawer`) pour les filtres et options secondaires hors consultation.
- **Sidebar gauche pleine hauteur & bascule mobile** : Navigation principale de consultation fréquente. Sur écran mobile (< 768px), elle est masquée et ses liens basculent dans le tiroir burger.
- **Affichage plein écran maîtrisé** :
  - Tableaux denses (`.dense-data-table`) avec en-têtes figées (`position: sticky`).
  - Chiffres tabulaires obligatoirement alignés à droite (`tabular-nums`).
  - Ligne de KPIs compacte en une seule rangée (`.kpi-row-compact`).

### Archétype 2 : Activité Interactive (Wizard / Évaluation / Simulation)
- **Navigation supérieure fixe (Haut)** : Stepper horizontal (`.eval-stepper-bar`) avec pastilles numérotées (`.step-pill`).
- **En-tête secondaire escamotable (HUD)** : Se masque au défilement vers le bas et réapparaît à la remontée vers le haut.
- **Carte de problème ou d'énoncé** : `.enonce-box` avec typographie contrastée.
- **Assistant pédagogique modulaire (`.coach-assistant-widget`)** : Affiche par défaut le dernier message actif avec balayage molette/swipe et chevron de dépliage pour lire l'historique complet.
- **Zone de rétroaction accessible** : `.feedback-box` avec `role="status"` et `aria-live="polite"`.
- **Navigation inférieure (Bas)** : Barre fixe avec boutons `[Précédent]` et `[Suivant]`.

---

## 2. Standards Techniques Non Négociables

1. **Zéro Framework Lourd** : Interdiction absolue de Bootstrap, Tailwind CDN ou tout framework tiers. HTML5 sémantique pur et CSS moderne (`:root`, Flexbox, Grid).
2. **Conformité Loi 25 (Québec) — Zéro CDN** : Aucun appel réseau vers des polices ou scripts distants. Actifs 100 % locaux.
3. **Chemins Relatifs & Double-clic Local (`file:///`)** :
   - Tous les liens doivent débuter par `./` (`./src/style.css`, `./src/app.js`).
   - Interdiction de `<script type="module">` pour éviter les erreurs CORS sous protocole `file:///`. Toujours utiliser `<script src="./src/app.js" defer></script>`.
4. **Accessibilité WCAG 2.1 AAA** :
   - Ratios de contraste $\ge 7:1$ sur les textes principaux.
   - Anneau de focus visible de 3px (`outline: 3px solid var(--focus-ring); outline-offset: 2px`).
   - Lien d'évitement obligatoire (`.skip-link`).

---

## 3. Règles Graphiques & Anti-« AI Slop »

- 🚫 **Zéro icône devant les titres et boutons** : Les titres (`h1`, `h2`...) et libellés d'actions doivent être purement textuels.
- 🚫 **Zéro image ou logo dans l'en-tête** : Ne jamais ajouter de logo (`logo.png`) ou d'image d'établissement dans l'en-tête. L'en-tête doit rester 100 % textuel, épuré et sobre.
- ✔️ **Casse de phrase en français** : Majuscule uniquement au premier mot (ex. : « Macroplanification des cohortes » et non le Title Case anglais).
- 🚫 **Zéro bordure asymétrique colorée** : Pas de `border-left` colorée (3px ou 4px). Toutes les bordures doivent être uniformes de 1px nettes et neutres.
- 🚫 **Zéro badge d'état décoratif en navigation** : L'état actif est indiqué sobrement par `aria-current="page"`, un fond neutre subtil et une graisse semi-bold.
- 🚫 **Zéro dégradé néon, thème sombre forcé, ou forme flottante décorative** (pas de blobs SVG).
