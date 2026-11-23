---
name: wcag
description: >-
  Référentiel d'accessibilité numérique (WCAG 2.1 AA/AAA) pour la conception
  d'interfaces web et d'activités interactives sous moteur-ui (contrastes,
  navigation clavier, sémantique HTML5, live regions).
---

# Guide de Conformité WCAG 2.1 (AA & AAA) — Moteur-UI

Ce skill régit l'accessibilité universelle de toutes les interfaces, simulations et activités développées dans le projet **MOODLE_AI**.

---

## 1. Contraste Typographique (Critères 1.4.3 AA & 1.4.6 AAA)

Tout texte doit présenter un contraste suffisant avec sa surface d'arrière-plan :
- **Texte courant (< 18pt / 24px) :**
  - **Niveau AA (Obligatoire) :** Ratio de contraste $\ge 4,5:1$.
  - **Niveau AAA (Cible moteur-ui) :** Ratio de contraste $\ge 7:1$.
- **Grand texte ($\ge 18pt / 24px$ ou $\ge 14pt / 18.66px$ en gras) :**
  - **Niveau AA :** Ratio de contraste $\ge 3:1$.
  - **Niveau AAA :** Ratio de contraste $\ge 4,5:1$.

### Ratios de la Charte Moteur-UI :
- Encre sombre `--text-main` (`#0f172a`) sur fond blanc (`#ffffff`) : **15,5:1** (AAA large).
- Texte secondaire `--text-muted` (`#475569`) sur blanc : **5,8:1** (AA+).
- Bleu royal `--brand-accent` (`#2563eb`) sur blanc : **8,5:1** (AAA).

---

## 2. Éléments Non-Textuels & Composants d'Interface (Critère 1.4.11 AA)

- Les bordures de champs de saisie, les boutons et les séparateurs doivent respecter un ratio $\ge 3:1$ avec leur environnement.
- L'anneau de focus doit être hautement visible :
  ```css
  :focus-visible {
    outline: 3px solid var(--focus-ring);
    outline-offset: 2px;
  }
  ```

---

## 3. Non-Dépendance à la Couleur (Critère 1.4.1 A)

La couleur ne doit **jamais** être le seul vecteur d'information pour communiquer un état, une erreur ou un succès :
- Tout badge ou message de statut combine couleur + texte explicite (ex. : `[✔] Validé`, `[▲] Attention`).
- Dans les QCM et formulaires, la validation affiche une zone de texte didactique dédiée (`.feedback-box`).

---

## 4. Navigation Clavier & Contrôle du Focus (Critères 2.1.1 A & 2.4.7 AA)

- **Lien d'évitement obligatoire** au sommet de chaque page :
  ```html
  <a href="#main-content" class="skip-link">Aller au contenu</a>
  ```
- **Prise en charge complète du clavier** :
  - Touche <kbd>Échap</kbd> : Ferme immédiatement les tiroirs latéraux (`.config-drawer`) et fenêtres modales.
  - Touche <kbd>Tab</kbd> / <kbd>Maj+Tab</kbd> : Navigation séquentielle sans piège de focus (*no keyboard trap*).
  - Flèches directionnelles <kbd>←</kbd> / <kbd>→</kbd> : Navigation dans les messages du coach ou dans le stepper.

---

## 5. Structuration Sémantique & Lecteurs d'Écran (Critères 1.3.1 A & 4.1.3 AA)

- Utiliser les balises natives : `<button>` pour les actions, `<a>` avec `href` pour la navigation, `<h1>` à `<h6>` pour la hiérarchie.
- Ne jamais transformer une simple `<div>` en élément cliquable sans les attributs `role="button"`, `tabindex="0"` et les écouteurs de touche Entrée/Espace.
- **Régions dynamiques (Live Regions)** : Toute rétroaction instantanée ou mise à jour de score doit comporter `role="status"` et `aria-live="polite"` pour avertir les utilisateurs de lecteurs d'écran sans interrompre leur lecture.
