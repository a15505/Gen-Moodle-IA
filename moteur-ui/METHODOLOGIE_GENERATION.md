# Méthodologie de Génération UI : Tableaux de Bord & Activités Interactives

Ce dossier constitue un **moteur méthodologique réutilisable** pour concevoir des interfaces web épurées, hautement fonctionnelles et conformes à la Loi 25 et à WCAG 2.1 (AA & AAA).

---

## 1. Ergonomie Globale : Maximisation de la Hauteur & Plein Écran

Pour afficher de très gros volumes de données (lignes du temps, matrices d'horaires, grands tableaux) sans gaspiller le moindre pixel vertical :

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ EN-TÊTE ÉTROIT (48px) : Titre · Statut ...................... [Burger Config]│
├───────────────┬──────────────────────────────────────────────────────────────┤
│ SIDEBAR       │ ZONE DE CONSULTATION PLEIN ÉCRAN (MAÎTRISÉE)                 │
│ GAUCHE        │                                                              │
│ (Hauteur      │ • Ligne de KPIs compacte (sans gaspillage de hauteur)        │
│  totale de    │ • Ligne du temps (Gantt/planning sur grille modulaire)       │
│  l'écran pour │ • Tableau dense plein écran (en-tête figée, sans éclatement) │
│  consultation │                                                              │
│  quotidienne) │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

### A. L'En-tête Étroit (Slim Header — 48px)
* Hauteur compacte (`48px`) pour dégager un maximum d'espace vertical.
* À gauche : Nom de la plateforme et indicateur d'état.
* **Au bout à droite : Bouton Burger accessible** (`#btnConfigDrawer`, `aria-expanded`).
  - Déclenche un **tiroir latéral escamotable (*drawer*)**.
  - Regroupe tout ce qui ne sert **pas** à la consultation quotidienne : options d'affichage, paramètres de calcul/arbitrage, gestion des calendriers, rôles et préférences.
  - Libère ainsi l'écran principal pour la donnée pure.

### B. La Sidebar Gauche (Pleine Hauteur Écran) & Bascule Mobile
* Tire profit de toute la hauteur de l'écran pour héberger la navigation de consultation fréquente :
  - *Ligne du temps*, *Tableau des données*, *Cohortes/Groupes*, *Locaux/Ateliers*, *Analytique*.
* Navigation claire et sobre : le lien actif est indiqué par un fond neutre subtil (`var(--bg-surface-subtle)`), une graisse semi-bold (`font-weight: 600`) et l'attribut natif `aria-current="page"`. Zéro `border-left` colorée et zéro badge d'état (« Actif »).
* **Zéro icône décorative** devant les intitulés des liens.
* **Bascule mobile responsive (< 768px)** : Sur petit appareil mobile, la sidebar gauche est automatiquement masquée pour offrir 100 % de la largeur d'écran aux données. Ses liens de navigation basculent automatiquement à l'intérieur du tiroir déclenché par le bouton burger.

### C. L'En-tête Secondaire Réactif (Révélé au Scroll vers le Haut)
* Lorsqu'une barre d'outils, des filtres ou un bandeau d'évaluation (HUD) sont présents (`.secondary-header`) :
  - **Défilement vers le bas** : L'en-tête secondaire s'escamote automatiquement (`transform: translateY(-100%)`) pour dégager 100 % de l'espace vertical.
  - **Défilement vers le haut** : L'en-tête réapparaît immédiatement (`transform: translateY(0)`), rendant les filtres et actions accessibles sans avoir à remonter tout le document.

---

## 2. Afficher de Nombreuses Données sans « Faire Exploser l'Écran »

Quand un tableau ou une ligne du temps occupe 100 % de la largeur d'un grand écran, le risque est la dispersion illisible de l'information. Voici les règles anti-éclatement appliquées :

### 1. Pour les Tableaux de Données Denses (`.dense-data-table`)
* **En-têtes figées (`position: sticky; top: 0`)** : La lecture reste instantanée lors du défilement de longues listes.
* **Largeurs de colonnes proportionnées** :
  - Identifiants, dates, badges et boutons ont des largeurs strictes (`width: 110px` à `140px`).
  - La colonne textuelle descriptive absorbe l'espace restant.
* **Alignement rigoureux des chiffres** :
  - Toutes les colonnes chiffrées (effectifs, heures, montants) sont alignées à droite (`text-align: right; font-variant-numeric: tabular-nums`).
* **Hauteur de ligne dense** : `padding: 0.55rem 0.85rem` (au lieu de 1.5rem) pour afficher jusqu'à 3x plus d'informations par écran sans sensation d'écrasement.

### 2. Pour les Lignes du Temps (`.timeline-grid`)
* Conception sur une **grille CSS stricte** (colonne de libellé fixe + colonnes de mois/semaines régulières).
* Les barres de planification occupent des cases précises, évitant l'étirement artificiel du texte.

---

## 3. Les Deux Archétypes Standardisés

### Archétype 1 : Tableau de Bord Plein Écran (Dashboard)
* **Usage** : Consultation dense, planification de cohortes, suivi d'ateliers, calendrier.
* **Composants** :
  - En-tête étroit 48px avec burger de configuration à droite.
  - Sidebar gauche pleine hauteur.
  - KPIs compacts en 1 ligne (`.kpi-row-compact`).
  - Ligne du temps (`.timeline-card`) et tableau matriciel dense (`.dense-data-table`).
  - Tiroir latéral accessible (`.config-drawer`) pour les options.

### Archétype 2 : Activité Interactive (Wizard / Simulation)
* **Usage** : Parcours guidé étape par étape, scénario d'arbitrage, exercice d'évaluation.
* **Composants** :
  - En-tête étroit clair 48px et bandeau d'état secondaire escamotable (`.secondary-header` HUD).
  - Assistant pédagogique modulaire (`.coach-assistant-widget`) : 
    - **Aucun message générique** (consigne par défaut du type « Lis attentivement l'énoncé et réponds aux questions posées. ») : ces messages distraient l'élève. Fermé et vide au démarrage et à chaque changement de question, l'Assistant ne s'ouvre de lui-même que pour une rétroaction réelle ; l'utilisateur peut toujours l'ouvrir via le bouton d'en-tête.
    - N'affiche par défaut **que le dernier message actif** ; l'utilisateur peut balayer l'historique complet via les boutons `‹` `›`, la molette de la souris, le balayage tactile (*swipe* / glissement) ou les flèches du clavier.
    - **Chevron de dépliage (`.btn-coach-chevron`)** : permet de déplier en un clic l'ensemble complet des messages reçus sous forme de liste d'historique scrollable, pour une lecture globale et continue, puis de refermer vers le message actif.
    - **Déclencheur d'en-tête cohérent (`#btnCoachToggle`)** : libellé uniformément « Assistant (X) » dans le bandeau d'état secondaire (HUD), permettant d'ouvrir ou réinvoquer l'assistant en tout temps.
    - **Sur grand écran (Desktop ≥ 1150px)** : positionné à gauche en dehors du contenu principal, à proximité immédiate, **sans aucun chevauchement** (`position: sticky`).
    - **Sur écrans réduits / mobile (< 1150px)** : bascule automatiquement en seconde couche flottante éphémère (`position: fixed; z-index: 80;`), n'altérant d'aucun pixel le positionnement du contenu principal (zéro Cumulative Layout Shift), s'estompant après 6s et réinvocable en tout temps via le bouton d'en-tête (`#btnCoachToggle`).
  - Carte de problème isolée (`.enonce-box`).
  - Choix de mode et formulaire de saisie (`.answer-unit-group`).
  - Panneau de rétroaction accessible en direct (`.feedback-box`) avec `role="status"` et `aria-live="polite"`.

---

## 4. Règles Légales et Accessibilité (Rappel)

* **Loi 25 (Québec)** : Zéro CDN. Actifs 100 % locaux (`tokens.css`, `style.css`, polices système locales).
* **Chemins relatifs & compatibilité double-clic (`file:///`)** : Toujours préfixer par `./` (`./src/style.css`, `./src/app.js`). Toujours utiliser `<script src="./src/app.js" defer></script>` sans `type="module"` pour éviter tout blocage CORS lors d'une ouverture locale directe.
* **WCAG 2.1 AAA** : Ratios de contraste ≥ 7:1, anneau de focus 3px visible, navigation clavier complète (<kbd>Échap</kbd> ferme le tiroir burger, <kbd>Tab</kbd> boucle correctement).

---

## 5. Règles Typographiques & Rédactionnelles Strictes

### A. Zéro Icône devant les Titres
* 🚫 **Interdiction formelle des pictogrammes ou emojis placés devant un titre** :
  - Ne jamais écrire `📅 Ligne du temps`, `📊 Tableau des données`, `🤖 Assistant`, `💡 Remarque`.
  - Écrire sobrement : *Ligne du temps*, *Tableau des données*, *Assistant pédagogique*.
* Les titres doivent être épurés, élégants et purement typographiques.

### B. Règle de Grammaire Française (Casse de Phrase)
* 🚫 **Proscrire le "Title Case" anglais** qui capitalise chaque mot d'un titre.
* ✔️ **Majuscule uniquement au premier mot de la phrase** :
  - *Correct* : « Macroplanification et occupation des plateaux techniques ».
  - *Incorrect* : « Macroplanification & Occupation Des Plateaux Techniques ».
  - Seuls les noms propres et les acronymes légitimes conservent leurs majuscules (DEP, CSSBE, OR-Tools, SCORM, WCAG, etc.).

### C. Zéro Titre Redondant ou Artificiel (Anti-bavardage d'interface)
* 🚫 **Interdiction formelle d'ajouter des titres intermédiaires ou décoratifs superflus** :
  - Ne jamais insérer d'en-têtes artificiels tels que « Historique complet », « Message 1 », « Liste des conseils », etc.
  - Présenter directement le contenu utile sans étiquette méta superflue afin de préserver une interface sobre et zéro surcharge cognitive.

### C. Sobriété Visuelle : Zéro Bordure Asymétrique Colorée & Zéro Badge d'État en Navigation
* 🚫 **Interdiction des bordures asymétriques colorées** : Ne jamais ajouter de `border-left` colorée (3px ou 4px) sur les liens de menu, les cartes de KPIs ou les boîtes de mise en situation. Toutes les bordures doivent être uniformes sur les 4 côtés, nettes et neutres (`1px solid var(--border-color)`).
* 🚫 **Interdiction des badges d'état dans la navigation** : Ne jamais placer de pilule ou badge « Actif » ou « En cours » à côté d'un lien d'arborescence. Seules les métadonnées quantitatives réelles (ex. `3 DEP`) sont autorisées. L'état actif est exclusivement signifié par `aria-current="page"`, un fond neutre doux et une encre sombre contrastée.

### D. Règles d'Exécution Craft & Anti-« AI Slop » (Extraites d'open-design)
* 🚫 **Bannissement des tics d'IA (*AI Slop*)** :
  - Zéro dégradé néon violet/indigo, zéro thème sombre forcé par défaut.
  - Zéro forme flottante décorative (*blobs*, vagues SVG).
  - Zéro statistique ou métadonnée fictive (*fake filler stats*) pour meubler l'espace.
* ✔️ **Règle 80/20** : 80 % de structures fonctionnelles éprouvées (tableaux, listes, formulaires) pour 20 % de précision typographique (chiffres tabulaires `tabular-nums` systématiques, espacements stables).
* ✔️ **Lois d'UX fondamentales (`laws-of-ux`)** :
  - *Loi de Hick* : Limiter à 3–5 les options visibles immédiatement ; déporter la configuration secondaire dans le tiroir burger (`.config-drawer`).
  - *Loi de Similarité* : Même rôle = même style, même classe, mêmes espacements.
  - *Effet Von Restorff* : Une seule action primaire saillante par zone.
* ✔️ **Couverture systématique des états (`state-coverage`)** :
  - Tout élément interactif possède ses 5 états (*Défaut*, *Survol*, *Focus visible 3px*, *Actif/Sélectionné*, *Désactivé*).
  - Prise en compte de l'état vide (*empty state*) sobre et des transitions douces respectant `prefers-reduced-motion`.
