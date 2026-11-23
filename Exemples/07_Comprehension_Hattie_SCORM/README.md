# Type 7 : Exercice de compréhension SCORM en deux pages (canevas Hattie)

Activité de référence du [canevas Hattie](../../.agents/skills/assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md) : **La concentration des solutions** (ST, Sec 3).

- **Commande à exécuter :**
  > `Génère un exercice de compréhension SCORM selon le canevas Hattie`
- **Consigne d'origine :** [`Consigne_de_generation.html`](./Consigne_de_generation.html) (aucun PDF source ; résumé des demandes qui ont produit l'activité).
- **Fondements :** dossier [`john_hattie/`](../../john_hattie/) (intentions et critères de réussite ; analyse cognitive des tâches).

### Ce que montre cet exemple
1. Accueil avec deux tuiles : « Ce que j'apprends » et « Je sais que j'ai réussi quand… ».
2. 8 stations de deux pages : une présentation illustrée en SVG à lire en plein écran, puis une question.
3. Présentation en trois temps (savoir que, savoir comment, savoir avec), « À retenir » relié à l'étape 1 de la démarche.
4. Choix de réponse formulés comme des pensées verbalisées ; chaque distracteur porte un type d'erreur (conception, procédure, stratégie, transfert, exécution).
5. Après une réponse erronée : analyse du raisonnement, puis explication en trois temps.
6. Calculs en produit croisé rendus en LaTeX (MathJax local) : formule en fraction avec légende « où », valeur encerclée qui change de côté, unités biffées, résultat encadré.
7. Assistant silencieux tant que l'élève n'a pas agi ; remédiation adaptative de 1 point.
8. Narration audio des présentations (principes de Mayer) : bouton « Écouter l'explication », mots clés, transcription repliée, démarche affichée à la fin de l'écoute. L'enseignant enregistre sa voix dans le simulateur (« Enregistrer la narration ») ; en attendant, une voix française locale de l'appareil lit le texte.

### Livrables (`Fichiers/`)
- `questions_data.js` : seul fichier rédigé (copié du gabarit du canevas).
- `src/images/p1_*.svg` à `p8_*.svg` : représentations visuelles.
- `src/audio/p1.mp3` à `p8.mp3` : narrations enregistrées par l'enseignant dans le simulateur (absentes tant qu'elles ne sont pas enregistrées).
- `index.html`, `simulateur.html`, `src/`, `imsmanifest.xml` et le zip : générés par `create_scorm_activity.py`.

### Vérifier
```bash
python .agents/skills/assistant_scorm/resources/valider_questions_data.py Exemples/07_Comprehension_Hattie_SCORM/Fichiers
```
