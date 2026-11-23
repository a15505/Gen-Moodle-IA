# Charte Graphique & Système de Design Universel

Ce document définit la charte visuelle standardisée et accessible pour le développement d'interfaces web épurées (**Tableaux de bord** et **Activités interactives**). Il est neutre, agnostique de tout organisme et directement applicable à n'importe quel projet.

---

## 1. Direction Artistique & Principes Visuels

* **Sobriété et élégance** : L'interface privilégie la lisibilité et l'espace de respiration (*whitespace*). Zéro surcharge décorative, zéro artifice inutile.
* **Contours nets** : Séparations délimitées par des bordures fines de 1px (`#cbd5e1` ou `#e2e8f0`). Aucune ombre portée floue ni effet de glassmorphism.
* **Équilibre fonctionnel** : La couleur n'est jamais purement décorative ; elle signale une hiérarchie, une action ou un état précis.

---

## 2. Palette Chromatique Standard (Certifiée WCAG AA / AAA)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│  Bleu Nuit/Encre │    Bleu Royal    │    Vert Succès   │   Ambre Alerte   │
│     #0f172a      │     #2563eb      │     #065f46      │     #78350f      │
│ (Contraste 15:1) │ (Contraste 8.5:1)│ (Contraste 8.2:1)│ (Contraste 7.2:1)│
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Tokens CSS Standard (`:root`)

```css
:root {
  /* 1. Surfaces & Fonds */
  --bg-canvas: #f8fafc;          /* Fond de page neutre et reposant (Slate 50) */
  --bg-surface: #ffffff;         /* Fond de cartes, panneaux et tableaux */
  --bg-surface-subtle: #f1f5f9;  /* En-têtes de tableaux et éléments secondaires */
  --border-color: #cbd5e1;       /* Bordure nette 1px (Slate 300) */
  --border-subtle: #e2e8f0;      /* Séparateurs légers (Slate 200) */

  /* 2. Typographie & Encre */
  --text-main: #0f172a;          /* Encre principale sombre (Slate 900 · Contraste 15.5:1 sur blanc) */
  --text-muted: #475569;         /* Texte secondaire (Slate 600 · Contraste 5.8:1 sur blanc - AA+) */
  --text-subtle: #64748b;        /* Métadonnées et libellés (Slate 500 · Contraste 4.6:1 - AA) */

  /* 3. Identité & Actions Standard */
  --color-primary: #0f172a;      /* Couleur d'ancrage (En-têtes, boutons principaux) */
  --color-accent: #2563eb;       /* Bleu royal pour boutons d'action et états interactifs */
  --color-accent-hover: #1d4ed8; /* Survol bouton */
  --focus-ring: #2563eb;         /* Anneau de focus clavier 3px haute visibilité */

  /* 4. Statuts Sémantiques (Couleur de fond + Texte contrasté) */
  --status-success-bg: #ecfdf5;
  --status-success-text: #065f46;  /* Contraste 8.2:1 sur fond clair (AAA) */
  --status-success-border: #a7f3d0;

  --status-warning-bg: #fffbeb;
  --status-warning-text: #78350f;  /* Contraste 7.2:1 sur fond clair (AAA) */
  --status-warning-border: #fde68a;

  --status-alert-bg: #fef2f2;
  --status-alert-text: #991b1b;    /* Contraste 7.5:1 sur fond clair (AAA) */
  --status-alert-border: #fecaca;

  --status-info-bg: #eff6ff;
  --status-info-text: #1e40af;     /* Contraste 8.5:1 sur fond clair (AAA) */
  --status-info-border: #bfdbfe;
}
```

---

## 3. Typographie Universelle & Haute Lisibilité

### Piles de Polices (100 % Locales · Loi 25)
* **Titres & En-têtes** :  
  `font-family: Montserrat, "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif;`  
  *Graisses :* Bold (700) et ExtraBold (800).
* **Corps de texte & données** :  
  `font-family: Inter, "Atkinson Hyperlegible", system-ui, -apple-system, sans-serif;`  
  *Graisses :* Regular (400) et SemiBold (600).
  *Chiffres tabulaires :* `font-variant-numeric: tabular-nums;` pour tous les tableaux, métriques et montants.

### Échelle Typographique
* Titres H1 : `1.75rem` à `2.25rem` (28px-36px), interligne `1.2`.
* Titres H2 : `1.25rem` à `1.5rem` (20px-24px), interligne `1.3`.
* Corps de texte : `1rem` (16px), interligne `1.6`.
* Notes / badges : `0.8125rem` (13px), gras 700.

### Règles Rédactionnelles des Titres
* 🚫 **Zéro icône devant les titres** : Les titres (`h1`, `h2`, `h3`, etc.) et les liens de navigation doivent être purement textuels. Ne jamais y coller de pictogrammes décoratifs.
* ✔️ **Casse de phrase (Grammaire française)** : Majuscule uniquement au premier mot du titre ou de la phrase (ex. : *« Macroplanification et occupation des plateaux »* et non *« Macroplanification & Occupation Des Plateaux »*). Seuls les acronymes légitimes (DEP, CSSBE, OR-Tools, SCORM) conservent leurs majuscules.

---

## 4. Composants Clés Standardisés

### 1. Boutons d'Action
* **Bouton Primaire** : Fond `--color-primary` (`#0f172a`), texte blanc, bordure 2px transparente.
* **Bouton Accentué** : Fond `--color-accent` (`#2563eb`), texte blanc, survol `--color-accent-hover`.
* **Bouton Secondaire** : Fond transparent, bordure 1px ou 2px `--color-primary`, texte `--color-primary`.

### 2. Badges de Statut (Règle WCAG 1.4.1)
Un badge ne communique jamais son information uniquement par la couleur :
* **Succès / Validé** : Fond vert pâle + texte vert foncé + pictogramme `[✔] Validé`.
* **En cours / Neutre** : Fond bleu pâle + texte bleu foncé + pictogramme `[●] En cours`.
* **Alerte / Attention** : Fond ambre + texte ambre foncé + pictogramme `[▲] Attention`.
* **Erreur / Bloqué** : Fond rouge pâle + texte rouge foncé + pictogramme `[✕] Erreur`.

### 3. Cartes d'Indicateurs (KPIs)
* Carte blanche, bordure 1px uniforme neutre `--border-color` (sans bordure asymétrique colorée).
* Libellé supérieur en majuscules discrètes (`font-size: 0.8125rem`, gras).
* Grand chiffre tabulaire (`font-size: 1.5rem` à `2rem`, gras 800).

---

## 5. Exigences Numériques Légales

1. **Conformité Loi 25 (Québec)** :  
   Zéro dépendance CDN externe. Polices et actifs autohébergés ou système.
2. **Chemins strictement relatifs** :  
   Toutes les URLs et balises débutent par `./` (`./src/style.css`, `./src/app.js`).
3. **Accessibilité WCAG 2.1 AA/AAA** :  
   Lien d'évitement clavier (*skip-link*), focus ring 3px visible, sémantique HTML5 complète.
