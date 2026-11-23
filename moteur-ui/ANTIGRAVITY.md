# Directives pour Antigravity / Gemini (ANTIGRAVITY.md) — Méthodologie d'Interface Épurée

Ce fichier définit les directives obligatoires pour l'agent Antigravity (Google DeepMind / Gemini) opérant sur ce projet ou dérivant des composants de ce moteur UI.

---

## 1. Références Officielles du Projet
* **Méthodologie & Deux Archétypes** : [`./METHODOLOGIE_GENERATION.md`](./METHODOLOGIE_GENERATION.md)
* **Charte graphique standard & tokens** : [`./CHARTE_GRAPHIQUE.md`](./CHARTE_GRAPHIQUE.md)
* **Directives complètes d'agents** : [`./AGENTS.md`](./AGENTS.md)

---

## 2. Principes Obligatoires de Génération
1. **Choisir l'archétype adéquat** :
   - **Tableau de bord (Dashboard plein écran)** : 
     - En-tête étroit 48px OBLIGATOIREMENT CLAIR (fond blanc `#ffffff` ou neutre pâle, jamais sombre) avec bouton burger ou kebab à droite ouvrant le tiroir `.config-drawer` (options, configuration, administration hors consultation).
     - Sidebar gauche pleine hauteur & bascule mobile : navigation de consultation quotidienne sur grand écran ; sur petits appareils mobiles (< 768px), la sidebar est masquée pour libérer la largeur d'écran et ses liens basculent dans le menu tiroir.
     - Affichage dense plein écran sans éclatements : grands tableaux `.dense-data-table` avec en-têtes figées (`position: sticky`), chiffres tabulaires alignés à droite (`tabular-nums`), grille horaire ou ligne du temps modulaire, KPIs compacts.
   - **Activité interactive (Wizard / Simulation)** : Stepper `.stepper-nav`, carte d'exercice `.activity-card`, cartes d'options accessibles `.options-grid`, rétroaction live `.feedback-box` avec `role="status"` et `aria-live="polite"`.
2. **Zéro framework externe** :
   - Pas de Bootstrap ni de Tailwind CDN. HTML5 sémantique pur + CSS natif moderne.
3. **Conformité Loi 25 (Québec)** :
   - Zéro CDN externe (pas de polices ni de scripts distants). Actifs 100 % locaux.
4. **Chemins strictement relatifs & compatibilité double-clic (`file:///`)** :
   - Tous les liens doivent débuter par `./` par rapport à `index.html`.
   - Zéro `type="module"` sur les scripts pour éviter le blocage CORS en ouverture directe de fichier local. Utiliser `<script src="./src/app.js" defer></script>`.
5. **Accessibilité WCAG 2.1 AA/AAA** :
   - Ratios de contraste ≥ 4.5:1 (AA) et ≥ 7:1 (AAA).
   - Anneau de focus visible 3px (`outline: 3px solid var(--focus-ring); outline-offset: 2px`).
   - Lien d'évitement (*Skip Link*) : `<a href="#main-content" class="skip-link">Passer directement au contenu principal</a>`.
   - Pas de statut communiqué uniquement par la couleur.
6. **Rédaction et typographie française stricte** :
   - Zéro icône précédant les titres ou les liens de navigation.
   - Casse de phrase en français : majuscule uniquement au premier mot (interdiction du Title Case anglais).
   - En-tête secondaire escamotable : masquage au défilement vers le bas, révélation automatique lors de la remontée vers le haut.
7. **Sobriété visuelle et pureté (Anti-fioritures)** :
   - Zéro `border-left` asymétrique colorée sur les liens de menu, les cartes KPIs ou les boîtes de mise en situation (bordures 1px neutres et uniformes).
   - Zéro badge d'état (« Actif ») dans les onglets de navigation : lien actif sobrement indiqué par `aria-current="page"`, fond neutre subtil et texte semi-bold.
8. **Règles Craft & Anti-« AI Slop »** :
   - Bannissement des dégradés néon/radiaux, arrière-plans sombres par défaut, blobs ou vagues SVG décoratives.
   - Bannissement des statistiques ou étiquettes inventées pour meubler l'interface.
   - Règle 80/20 : 80 % de composants standards éprouvés et 20 % de précision typographique (chiffres tabulaires `tabular-nums` obligatoires).
   - Loi de Hick (3 à 5 choix majeurs visibles, options secondaires dans le tiroir `.config-drawer`) et couverture complète des 5 états d'affordance.

---

## 3. Palette Standard Accessible

```css
:root {
  --bg-canvas: #f8fafc;
  --bg-surface: #ffffff;
  --bg-surface-subtle: #f1f5f9;
  --border-color: #cbd5e1;
  --border-subtle: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-subtle: #64748b;
  --brand-primary: #0f172a;
  --brand-accent: #2563eb;
  --focus-ring: #2563eb;
}
```
