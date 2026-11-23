# Directives Générales pour Agents IA (AGENTS.md)

Ce fichier définit les directives universelles obligatoires pour tout agent de code ou d'UI (Antigravity/Gemini, Claude, Cursor, Codex, OpenCode, Open-Design) opérant sur ce projet.

---

## 1. Philosophie & Deux Archétypes d'Interface
Toute génération d'interface doit s'inscrire dans l'un des deux archétypes documentés dans [`./METHODOLOGIE_GENERATION.md`](./METHODOLOGIE_GENERATION.md) :

1. **Archétype 1 : Tableau de bord plein écran & dense (Dashboard)**
   - **En-tête étroit (`48px`) OBLIGATOIREMENT CLAIR** : Fond blanc pur (`#ffffff`) ou neutre pâle, encre sombre (`#0f172a`), bordure nette d'1px, **jamais sombre**. Dégage la hauteur utile de l'écran. Bouton burger au bout à droite pour ouvrir le tiroir de configuration / options (`.config-drawer`) hors consultation.
   - **Sidebar à gauche & bascule mobile** : Dédiée à la navigation principale de consultation quotidienne (*Ligne du temps*, *Tableaux*, *Groupes*). Sur petits appareils mobiles (< 768px), elle est automatiquement masquée et ses liens basculent à l'intérieur du menu burger.
   - **Affichage plein écran maîtrisé (Anti-éclatement)** :
     - Pour les grands tableaux (`.dense-data-table`) : en-têtes figées (`position: sticky`), largeurs de colonnes strictes sur les identifiants/dates, texte descriptif qui absorbe l'espace, et chiffres tabulaires obligatoirement alignés à droite (`text-align: right; font-variant-numeric: tabular-nums`).
     - Pour les lignes du temps (`.timeline-grid`) : grille modulaire par mois/semaines évitant l'étirement artificiel.
   - **Ligne de KPIs compacte (`.kpi-row-compact`)** : Indicateurs synthétiques sans gaspiller la hauteur.

2. **Archétype 2 : Activité interactive (Wizard / Simulation)**
   - Barre de progression séquentielle (`.stepper-nav`) avec `aria-current="step"`.
   - Carte de mise en situation (`.activity-card`).
   - Choix interactifs accessibles sous forme de cartes d'options cliquables (`.options-grid`).
   - Assistant pédagogique modulaire (`.coach-assistant-widget`) : n'affiche que le dernier message par défaut avec balayage d'historique (‹ ›, molette souris, swipe, clavier) et chevron de dépliage (`.btn-coach-chevron`) pour lire l'ensemble des messages à la fois. Déclenché depuis le bandeau d'état secondaire (HUD) sous le libellé cohérent « Assistant (X) ». Sur grand écran (Desktop ≥ 1150px), il est positionné en dehors à gauche à proximité du contenu sans chevauchement ; sur mobile (< 1150px), il bascule en seconde couche éphémère hors-flux sans altérer le positionnement de la page.
   - Panneau de rétroaction accessible en direct (`.feedback-box`) avec `role="status"` et `aria-live="polite"`.

---

## 2. Standards Techniques Non Négociables

### A. Zéro Framework Lourd
* 🚫 **Interdiction absolue de Bootstrap**, Tailwind CDN ou de tout framework CSS externe.
* ✔️ **HTML5 sémantique pur** (`<header>`, `<nav>`, `<main id="main-content">`, `<section>`, `<article>`, `<footer>`).
* ✔️ **CSS moderne natif** : Variables CSS (`:root`), Flexbox et CSS Grid.

### B. Conformité Loi 25 (Québec) — Zéro CDN
* 🚫 **Aucun appel réseau externe** vers des serveurs tiers (Google Fonts, cdnjs, unpkg, etc.).
* ✔️ **Actifs 100 % locaux** : Polices système natives de l'appareil (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`) ou fichiers locaux `.woff2`.

### C. Chemins Strictement Relatifs & Compatibilité Double-clic Local (`file:///`)
* 🚫 **Aucun chemin absolu racine** (ne jamais écrire `/style.css` ou `/src/...`).
* ✔️ **Tous les liens doivent débuter par `./`** (`./src/style.css`, `./src/app.js`).
* ✔️ **Zéro blocage CORS en local** : Proscrire formellement `<script type="module">` qui est bloqué par la politique CORS des navigateurs sous le protocole `file:///` (origine `null`). Toujours utiliser la balise de script standard différée : `<script src="./src/app.js" defer></script>`.

### D. Accessibilité Numérique WCAG 2.1 (AA & AAA)
* **Contraste** : Ratio minimum de 4.5:1 (AA) pour texte courant, idéalement ≥ 7:1 (AAA).
* **Navigation clavier** : Anneau de focus visible 3px (`outline: 3px solid var(--focus-ring); outline-offset: 2px`).
* **Lien d'évitement obligatoire** : `<a href="#main-content" class="skip-link">Aller au contenu</a>`.
* **Non-dépendance à la couleur** : Tout état est accompagné d'un texte ou pictogramme explicite.

### E. Rédaction et Typographie (Règles Françaises Strictes)
* 🚫 **Zéro icône devant les titres** : Ne jamais faire précéder les titres (`h1`, `h2`, etc.) ou liens de navigation d'icônes ou d'emojis décoratifs.
* ✔️ **Casse de phrase (Grammaire française)** : Majuscule uniquement au premier mot de la phrase / titre (sauf acronymes légitimes). Interdiction du Title Case anglais.
* ✔️ **En-tête secondaire escamotable** : Tout en-tête secondaire (`.secondary-header`) doit se masquer au défilement vers le bas et se révéler automatiquement lorsque le défilement remonte vers le haut.

### F. Sobriété Visuelle Épurée (Anti-fioritures « open-design »)
* 🚫 **Interdiction des bordures asymétriques colorées** : Ne jamais ajouter de `border-left` colorée (ex. `border-left: 3px solid ...` ou `4px`) sur les liens de navigation, les cartes de KPIs ou les boîtes de mise en situation. Toutes les bordures doivent être uniformes sur les 4 côtés, nettes et neutres (`1px solid var(--border-color)`).
* 🚫 **Interdiction des badges d'état dans la navigation** : Ne jamais ajouter de badge « Actif », « Sélectionné » ou de pilule d'état dans un onglet ou lien de menu. L'état actif est matérialisé sobrement par l'attribut natif `aria-current="page"`, un fond neutre très subtil (`var(--bg-surface-subtle)`) et une graisse typographique semi-bold (`font-weight: 600`). Seuls les décomptes quantitatifs réels (ex. `3 DEP`) sont tolérés à droite d'un lien.

### G. Règles d'Exécution Craft & Anti-« AI Slop » (Extraites d'open-design)
* 🚫 **Bannissement absolu des tics visuels d'IA (*AI Slop*)** :
  - **Zéro dégradé néon / lueur violette ou indigo** : Pas de gradients radiaux artificiels, pas d'arrière-plans sombres par défaut. Fond neutre pâle ou blanc pur obligatoire.
  - **Zéro fioriture géométrique gratuite** : Pas de formes flottantes ("blobs"), de vagues décoratives SVG ou d'illustrations abstraites hors contexte.
  - **Zéro métadonnée ou statistique fictive (*fake filler stats*)** : Ne jamais inventer de pourcentages, de KPI vides ou d'étiquettes superflues pour "remplir" l'écran. Seules les données métier réelles sont représentées.
  - **Zéro titre redondant ou étiquette méta artificielle** : Ne jamais ajouter de surtitres ou en-têtes inutiles (ex. « Historique complet », « Message 1 »). Laisser le contenu utile s'exprimer directement sans bavardage d'interface.
  - **Zéro animation décorative bruyante** : Toute transition doit être courte (≤ 200ms), purement fonctionnelle (retour d'état) et respecter impérativement `@media (prefers-reduced-motion: reduce)`.
* ✔️ **Règle 80/20 de conception** : 80 % de structures fonctionnelles éprouvées (tableaux denses, listes sémantiques, formulaires accessibles) et 20 % de parti pris typographique net (proportions équilibrées, marges stables, chiffres tabulaires alignés).
* ✔️ **Lois Fondamentales de l'UX (`laws-of-ux`)** :
  - **Loi de Hick (Charge décisionnelle)** : Limiter à 3–5 les choix primaires visibles simultanément par vue. Toute configuration ou option secondaire est déportée dans le tiroir latéral (`.config-drawer`) ou en divulgation progressive.
  - **Loi de Similarité** : Deux éléments partageant le même rôle fonctionnel doivent impérativement avoir la même classe CSS, le même alignement et les mêmes espacements.
  - **Loi de Fitts (Cibles tactiles)** : Cibles cliquables de 44 × 44 px minimum sur mobile ; espacement clair pour éviter les erreurs d'activation.
  - **Effet Von Restorff (Focalisation)** : Une seule action primaire saillante par écran ou section. Interdiction de saturer la vue avec de multiples boutons colorés concurrents.
* ✔️ **Couverture Exhaustive des États d'Affordance (`state-coverage`)** :
  - Tout composant interactif doit obligatoirement définir et tester ses états : *Défaut*, *Survol (`:hover`)*, *Focus clavier (`:focus-visible` anneau 3px)*, *Sélection / Page courante (`aria-current="page"`)*, et *Désactivé (`:disabled` ou `aria-disabled="true"`)*.
  - Les calculs et tableaux de données doivent prévoir l'état vide (*empty state* sobre) et l'état de chargement sans sautillement de mise en page (*layout shift*).

---

## 3. Charte Graphique & Palette Standard

Référence : [`./CHARTE_GRAPHIQUE.md`](./CHARTE_GRAPHIQUE.md)

```css
:root {
  --bg-canvas: #f8fafc;          /* Fond neutre (Slate 50) */
  --bg-surface: #ffffff;         /* Fond blanc pur */
  --bg-surface-subtle: #f1f5f9;  /* En-têtes secondaires */
  --border-color: #cbd5e1;       /* Bordures 1px nettes */
  --border-subtle: #e2e8f0;

  --text-main: #0f172a;          /* Encre principale (Contraste 15.5:1 AAA) */
  --text-muted: #475569;         /* Texte secondaire (Contraste 5.8:1 AA+) */
  --text-subtle: #64748b;        /* Métadonnées (Contraste 4.6:1 AA) */

  --color-primary: #0f172a;      /* Bleu nuit / Encre sombre d'ancrage */
  --color-accent: #2563eb;       /* Bleu royal pour interactions */
  --focus-ring: #2563eb;         /* Anneau de focus 3px */

  --status-success-bg: #ecfdf5;  --status-success-text: #065f46;
  --status-warning-bg: #fffbeb;  --status-warning-text: #78350f;
  --status-alert-bg: #fef2f2;    --status-alert-text: #991b1b;
  --status-info-bg: #eff6ff;     --status-info-text: #1e40af;
}
```
