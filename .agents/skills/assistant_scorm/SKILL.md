---
name: assistant_scorm
description: >-
  Assistant d'empaquetage et de configuration technique SCORM 1.2 pour Moodle,
  motorisé par moteur-ui (zéro Bootstrap, zéro FontAwesome, conforme Loi 25).
  Génère le binôme index.html (navigation haut/bas) et simulateur.html (épuré,
  navigation directe, corrigé, zéro console SCORM).
---

# Assistant de Configuration SCORM 1.2 (Moteur-UI)

Ce skill régit la finalisation, l'intégration de la couche de communication SCORM 1.2 et l'empaquetage ZIP autonome pour Moodle de toute activité interactive ou d'évaluation.

---

## ⚠️ RÈGLES DE CONCEPTION SCORM (MOTEUR-UI)

1. **Zéro Framework Externe** :
   - 🚫 **Bannissement total de Bootstrap et FontAwesome**. L'activité utilise exclusivement le moteur CSS natif de [`moteur-ui`](../../moteur-ui/AGENTS.md).
2. **Conformité Loi 25 & Zéro CDN** :
   - Tous les fichiers (HTML, CSS, JS, polices système locales) doivent être contenus dans le dossier de l'activité.
3. **Ordre Aléatoire des Choix Multiples (Mélange / Shuffling)** :
   - Pour toute question à choix multiples (QCM, radio, listes de choix), l'ordre d'affichage des options doit être aléatoire (mélange type Fisher-Yates au moment du rendu ou du chargement de la question).
   - Les clés des choix restent associées à leurs données de validation et rétroactions formatives.
4. **Bannissement de l'acronyme « PFEQ » dans l'interface élève** :
   - L'acronyme « PFEQ » ne doit **JAMAIS** apparaître dans les livrables destinés aux étudiants (`index.html`, `questions_data.js`, rétroactions formatives, énoncés, badges). Cette mention est réservée exclusivement à l'attention des enseignants (dans `simulateur.html` ou documents enseignants).
5. **Binôme Obligatoire de Livrables & Construction à Partir des Gabarits Validés** :
   - Chaque activité comprend obligatoirement :
     1. `index.html` : L'activité SCORM élève construite à partir de [`resources/index_template.html`](./resources/index_template.html) avec :
        - **Navigation supérieure** : stepper de pastilles numérotées, bouton `[Assistant]` pour révéler/masquer l'assistant.
        - **Corps central avec Assistant sur deuxième couche** : intitulé strictement **« Assistant »** (interdiction de « Assistant didactique » ou « Assistant pédagogique »), flottant en superposition hors-flux (`position: fixed; z-index: 95;`), doté d'une croix de fermeture `[✕]` (`#btnCloseCoach`) permettant à l'élève d'en contrôler intégralement la visibilité.
        - **Dispositif convivial d'agrandissement d'image** : pour toute figure affichée, un système de zoom (clic sur image, badge « Agrandir », fenêtre modale / lightbox avec fermeture par `✕ Fermer`, clic extérieur ou `Échap`) permettant d'examiner le schéma en haute résolution.
        - **Navigation inférieure** : barre Précédent / Suivant et état de progression.
     2. `simulateur.html` : L'outil enseignant **obligatoirement instancié à partir du gabarit validé** [`resources/simulateur_template.html`](./resources/simulateur_template.html) avec **en-tête clair 48px épuré**, **navigation directe** permettant de sauter à n'importe quelle question, **affichage des bonnes réponses et démarches**, et **zéro panneau d'affichage SCORM à l'écran** (interdiction formelle de coder un simulateur from scratch).
6. **Scoring Cumulatif Débutant à 0** :
   - `cmi.core.score.raw` commence obligatoirement à **0** (`score = 0`).
   - Le score augmente au fur et à mesure des réponses correctes jusqu'au maximum (100% ou barème).
7. **Sauvegarde de Progression (Suspend/Resume)** :
   - Toujours persister l'état d'avancement dans `cmi.suspend_data` (JSON sérialisé) et `cmi.core.exit = "suspend"`.
8. **Redimensionnement Moodle Automatique & Règle d'or Anti-boucle infinie (Zéro `100vh`)** :
   - 🚫 **Bannissement absolu de `100vh` et `100%` sur `html`/`body`** : Dans Moodle, un `100vh` ou `min-height: 100vh` sur le corps de l'iframe crée un effet de rétroaction incontrôlable où l'extension de l'iframe accroît la fenêtre interne, redéclenchant les observateurs en boucle infinie jusqu'au plantage.
   - ✔️ **Styles stricts sur `html` et `body`** :
     ```css
     html { margin: 0; padding: 0; height: auto; min-height: auto; }
     body { margin: 0; padding: 0; height: auto; min-height: auto; overflow-x: hidden; overflow-y: hidden; }
     ```
   - ✔️ **Wrapper mesuré unique `#activity-content`** : Tout le contenu HTML est obligatoirement contenu dans `<div id="activity-content" style="width: 100%; margin: 0; padding: 0; box-sizing: border-box;">`.
   - ✔️ **Mesure et seuil de tolérance dans `scorm_api.js`** :
     - Mesurer exclusivement `#activity-content` (`getBoundingClientRect().height`).
     - Vérifier le seuil : `if (this.lastSetHeight && Math.abs(height - this.lastSetHeight) < 6) return;`
     - Mettre à jour `this.lastSetHeight = height;`
     - Ajuster `window.frameElement` (`height` et `minHeight` avec `!important`), conteneurs Moodle (`#scorm_object`, etc.), et émettre les messages `postMessage({ type: 'setHeight', height: height }, '*')` et `postMessage({ type: 'resize', height: height }, '*')`.
     - `ResizeObserver` et `MutationObserver` observent uniquement `#activity-content` (pas `document.body`).

---

## Modèle de Gabarit et Fichiers Fournis

| Fichier ressource | Usage |
|---|---|
| [`moteur-ui/simulateurs/scorm/scorm_api.js`](../../../moteur-ui/simulateurs/scorm/scorm_api.js) | Connecteur SCORM 1.2 + Redimensionnement d'Iframe Moodle (ne jamais altérer la logique de connexion). |
| [`resources/simulateur_template.html`](./resources/simulateur_template.html) | Gabarit de référence pour `simulateur.html` (header 48px clair, navigation directe, solutions, zéro console SCORM). |
| [`resources/index_template.html`](./resources/index_template.html) | Gabarit de référence pour `index.html` (stepper haut, navigation bas, couche d'impression PDF intégrée). |
| [`resources/imsmanifest_template.xml`](./resources/imsmanifest_template.xml) | Modèle de manifeste SCORM 1.2 standard. |

---

## Variables Clés SCORM 1.2

| Variable | Valeurs types | Rôle dans Moodle |
|---|---|---|
| `cmi.core.lesson_status` | `"passed"`, `"failed"`, `"incomplete"` | Détermine la réussite ou l'échec de l'activité dans le carnet de notes. |
| `cmi.core.score.raw` | Numérique ($\ge 0$) | Note brute transmise (débute strictement à 0). |
| `cmi.core.score.max` | Numérique (ex: `100` ou `20`) | Note maximale possible. |
| `cmi.core.score.min` | `0` | Note minimale. |
| `cmi.core.exit` | `"suspend"`, `"logout"` | Assure la reprise ultérieure de la session élève. |
| `cmi.suspend_data` | Chaîne JSON | Sauvegarde l'index de question courante et les réponses données. |

---


9. **Bannissement de la Mention « Défi » & Titrage Pur par Sujet** :
   - 🚫 **Bannissement absolu du mot « Défi »** dans les interfaces élèves (corrigé interactif et compréhension de lecture).
   - 🚫 **Ne jamais préfixer les titres de questions** par « Défi 1 - », « Défi 2 - », « Question 1 : », etc.
   - ✔️ **Titrer uniquement avec le concept ou sujet scientifique** (ex. : « Surface de contact et digestion mécanique »).
   - ✔️ Vocabulaire sobre et neutre : « Question validée », « Question complétée », « Validé ✓ ».

10. **Écran d'Accueil Obligatoire au Début (Panneau Épuré)** :
    - L'activité SCORM débute obligatoirement par un écran d'accueil très épuré expliquant la tâche à l'élève avant la première question :
      - Titre de l'activité.
      - Objectifs d'apprentissage clairs.
      - Déroulement (nombre de stations, utilisation des fiches repères `[⛶ Agrandir]`, remédiation adaptative).
      - Bouton d'action principal `[Commencer l'activité]`.
    - Le score initial débute strictement à **0 pt (0 %)**.
    - **Transition robuste vers les questions (Conformité Iframe Moodle)** :
      - Lors du passage de l'accueil aux questions, s'assurer que `#questionWorkspace` ou `#questionContainer` est explicitement restauré à `display: block`.
      - Tout accès au `sessionStorage` (ex. mélange de Fisher-Yates) est obligatoirement sécurisé par un bloc `try...catch` pour parer aux restrictions de bac à sable (sandbox) d'iframe de Moodle.
      - Déclencher l'ajustement automatique de hauteur (`adjustParentIframeHeight`) dès la transition pour éviter tout espace blanc vide.

11. **Modal de Fin « Terminer et Envoyer » Obligatoire (Style Tests Moodle)** :
    - Lorsque la dernière question est validée, l'activité ne se ferme pas silencieusement. Le bouton `[Suivant]` devient **`[Terminer l'activité]`**.
    - Raison : des élèves quittent l'activité sans l'envoyer, et leur note n'est alors jamais transmise.
    - Le clic ouvre un écran de fermeture plein format « Résumé de la tentative » (moteur, `renderEcranFin()`) :
      - Avertissement bien visible : « Votre tentative n'est pas encore envoyée. »
      - Récapitulatif de la tentative (état des questions, note cumulative).
      - Bouton `[Retourner à la tentative]` et grand bouton principal **`[Terminer et envoyer]`**.
    - `[Terminer et envoyer]` ouvre la confirmation type Moodle et son bouton **`[Tout envoyer et terminer]`**.
    - Le clic sur ce bouton effectue les appels SCORM définitifs (`cmi.core.lesson_status = "completed"`, `LMSCommit("")`, `LMSFinish("")`) et affiche un écran de confirmation visuel clair (**« ✅ Votre tentative a été transmise avec succès ! »**).
    - Cette étape garantit qu'aucun élève ne ferme l'activité sans avoir formellement soumis et synchronisé son résultat avec le carnet de notes de Moodle.
    - **Aucun envoi définitif avant ce clic** : pendant l'activité, seuls le score provisoire (`cmi.core.score.raw`) et le statut `incomplete` sont enregistrés (`LMSCommit`). Jamais de `LMSFinish` ni de statut `passed`/`completed` à la validation de la dernière question : la session serait fermée et « Tout envoyer et terminer » ne transmettrait plus rien.
    - `scorm_api.js` expose `window.ScormAPI` (avec `setScore` et `setStatus`) : le moteur ne passe que par cet objet. Ne jamais livrer un package sans ces fichiers du moteur partagé (`moteur-ui/simulateurs/scorm/`), copiés par `create_scorm_activity.py`.
    - Vérification avant livraison : dans une page qui fournit une fausse API (`window.API` qui journalise), le journal doit montrer `LMSInitialize` au démarrage, des `score.raw` provisoires, puis seulement à l'envoi `lesson_status=completed` (ou `passed`), `LMSCommit` et `LMSFinish`.

---

## Empaquetage ZIP pour Déploiement Moodle

- **Nommage impératif selon le titre de l'activité** : Le fichier `.zip` doit obligatoirement reprendre le titre exact de l'activité avec ses accents (ex. : `Le système digestif et la nutrition — Corrigé interactif.zip`), sans suppression arbitraire d'accents ni nom générique `scorm.zip`.
- Pour produire l'archive finale `<Titre_Activite>.zip`, l'archive doit inclure à sa racine :
  - `index.html`
  - `questions_data.js`
  - `imsmanifest.xml`
  - `src/style.css`
  - `src/tokens.css`
  - `src/print.css`
  - `src/scorm_runtime.js`
  - `src/scorm_api.js`
  - `src/mathjax.js`
  - `src/images/` (schémas et figures didactiques locales).

---

## Architecture Modulaire SCORM — Workflow de Génération Ultra-Rapide (Data-Only)

> **Exercice de compréhension selon le canevas Hattie (« Génère un exercice de compréhension SCORM selon le canevas Hattie »)** : lire uniquement [`CANEVAS_COMPREHENSION_HATTIE.md`](./CANEVAS_COMPREHENSION_HATTIE.md), copier [`resources/gabarit_questions_comprehension.js`](./resources/gabarit_questions_comprehension.js), puis valider avec `python .agents/skills/assistant_scorm/resources/valider_questions_data.py <Dossier_Activite>` avant de déployer.

Pour éliminer la charge IA et accélérer radicalement la génération d'activités SCORM, **l'agent ne régénère JAMAIS le code applicatif (`app.js`, `index.html`, `style.css`) à partir de zéro**. L'architecture repose sur un moteur universel partagé :

### A. Rôle de l'Agent IA (Génération des Données Uniquement)
L'agent produit **exclusivement** :
1. Le fichier `questions_data.js` contenant :
   - L'objet `window.SCORM_ACTIVITY_CONFIG` :
     ```js
     window.SCORM_ACTIVITY_CONFIG = {
       mode: 'corrige' | 'comprehension',
       titre: 'Titre complet de l\'activité',
       totalPoints: 24,
       zipFilename: 'Titre complet de l\'activité.zip'
     };
     ```
   - Le tableau `window.QUESTIONS_DATA = [ ... ];`
2. Les images locales extraites dans `src/images/` (format PNG, optimisées).

### B. Moteur Runtime Universel (`moteur-ui/simulateurs/scorm/scorm_runtime.js`)
Le moteur partagé prend en charge l'ensemble de la logique applicative :
- Navigation par pastilles (`stepper`), score cumulatif démarrant à 0.
- Contrôle de visibilité de l'Assistant (`[Assistant]` et croix `✕`).
- Mélange aléatoire Fisher-Yates session-stable (`sessionStorage`).
- Dispositif convivial d'agrandissement d'image (lightbox modale, touche `Échap`).
- Mode 1 (`corrige`) : validation immédiate, affichage solution didactique en cas d'erreur. Chaque question de calcul porte une deuxième chance : `remediation: { question, choices: [{ id, text, correct, feedback }], points, solution }`, question guidée à choix proposée sous l'explication après une réponse erronée ou partielle ; `points` vaut la moitié des points de la question (le moteur ne rend jamais plus que les points manqués). Dans les démarches, `lignes`, `calcul` et `resultat` acceptent `^2`, `\sqrt{…}`, `\times` et les indices `d_base`.
- Mode 2 (`comprehension`) : citations de lecture, format Pourquoi/Parce que, remédiation adaptative.
- Anti-boucle Moodle native (garde < 6px, mesure `#activity-content`).

### C. Déploiement Automatisé via `create_scorm_activity.py`
Pour finaliser l'activité, l'agent exécute simplement le script de déploiement :
```bash
python .agents/skills/assistant_scorm/resources/create_scorm_activity.py <dossier_sortie> <chemin_questions_data.js>
```
Le script déploie automatiquement les coquilles HTML (`index.html`, `simulateur.html`), synchronise les styles et le moteur runtime, génère le manifeste XML et assemble l'archive SCORM `.zip` prête pour Moodle avec son titre accentué.

L'archive ZIP s'importe directement comme activité SCORM dans Moodle en un clic.
