# Gen-Moodle-IA — Plateforme didactique

Ce projet constitue l'environnement de production d'évaluations et d'activités pédagogiques interactives pour les sciences au secondaire (PFEQ), standardisé sur **`moteur-ui`**.

Il élimine toute la complexité des anciennes chaînes de compilation LaTeX au profit d'un flux direct et léger produisant instantanément :
1. Des **modules interactifs SCORM 1.2** pour Moodle (conforme Loi 25, zéro CDN, zéro framework lourd).
2. Des **documents PDF d'examen** paginés Letter US (8,5 × 11 po) haute fidélité via `@media print`.
3. Des **banques de questions Moodle XML** (9 types pris en charge) avec simulateur interactif de validation.
4. Des **vidéos interactives H5P** (fichiers JSON complets + simulateur interactif avec rembobinage adaptatif).

---

## Deux façons d'utiliser la solution

L'assistant s'utilise de deux manières :

- **localement, avec un abonnement à un agent IA** (par exemple Claude Pro ou Google Antigravity) : l'agent produit lui-même les ressources dans le dossier du projet ;
- **en ligne, placé à l'intérieur d'une activité Moodle** : l'application web est alors à la disposition de tous les enseignants du cours. Chacun l'utilise avec le service d'IA générative autorisé par son organisation scolaire (par exemple Copilot ou Gemini), sans abonnement supplémentaire ni installation.

| | Localement, avec un abonnement | En ligne, dans une activité Moodle |
| :--- | :--- | :--- |
| Pour qui | Enseignant qui dispose d'un agent IA installé sur son poste | Tous les enseignants qui ont accès au cours Moodle, sans installation ni compte payant |
| IA utilisée | Claude (abonnement Claude Pro, avec Claude Code ou l'application de bureau Claude), Google Antigravity ou tout agent qui lit `AGENTS.md` | Le service d'IA autorisé par l'organisation scolaire (Copilot, Gemini…), dans sa page habituelle (aucune clé d'API) |
| Fonctionnement | L'agent travaille directement dans le dossier du projet : il lit les documents, applique les directives et écrit les fichiers | L'application prépare la consigne, l'enseignant la donne à l'IA puis colle la réponse ; l'application la vérifie et produit la ressource |
| Données | Restent sur le poste, sauf ce que l'agent transmet à son IA | Restent dans le navigateur : l'application ne transmet rien |

Les deux façons produisent les mêmes ressources (SCORM 1.2, Moodle XML, H5P, examens imprimables) avec le même moteur (`moteur-ui`).

---

## Localement, avec un abonnement à un agent IA

1. Clonez le dépôt [a15505/Gen-Moodle-IA](https://github.com/a15505/Gen-Moodle-IA) (ou téléchargez-le avec *Code* → *Download ZIP*) :
   ```
   git clone https://github.com/a15505/Gen-Moodle-IA.git
   ```
   Ouvrez ensuite le dossier `Gen-Moodle-IA` dans votre agent (Claude Code, application de bureau Claude, Google Antigravity…). L'agent lit automatiquement [`AGENTS.md`](./AGENTS.md), qui contient toutes les directives du projet.
2. Pour choisir une tâche, écrivez « Je veux démarrer une tâche » : l'agent vous donne le lien de la page [`assistant.html`](./assistant.html), qui présente les 7 possibilités.
3. Déposez votre document original dans le dossier :
   👉 [`Originaux_a_analyser/`](./Originaux_a_analyser/)
4. Demandez à l'agent l'une des 7 commandes spécifiques :
   - `Génère un corrigé interactif SCORM`
   - `Génère un exercice de compréhension de lecture SCORM`
   - `Génère une version de cet examen`
   - `Génère un corrigé de cet examen`
   - `Génère un fichier de questions en format JSON (vidéo interactive)`
   - `Génère une banque de questions Moodle XML` (ou `Génère un test Moodle`)
   - `Génère un exercice de compréhension SCORM selon le canevas Hattie`
5. L'agent produit le plan d'analyse, attend votre confirmation (« GO »), puis génère directement les fichiers prêts à l'emploi.

---

## En ligne, dans une activité Moodle

Placé dans un cours Moodle, l'assistant devient accessible à tous les enseignants inscrits, depuis n'importe quel poste. Chacun l'utilise avec le service d'IA générative autorisé par son organisation scolaire : l'application prépare la consigne, l'enseignant la colle dans ce service, puis rapporte la réponse dans l'application. Aucun abonnement supplémentaire ni aucune installation n'est requis, et aucune donnée ne passe par un autre service que celui autorisé. Toutes les fonctions sont offertes, y compris l'enregistrement de la narration au micro (MP3), vérifié dans Moodle.

### Installation dans Moodle

1. Téléchargez le fichier [« Assistant de création de ressources Moodle.zip »](./Assistant%20de%20cr%C3%A9ation%20de%20ressources%20Moodle.zip) : sur la page du fichier, cliquez sur le bouton de téléchargement (*Download raw file*), à droite.
2. Dans votre cours Moodle, activez le mode d'édition, puis ajoutez une ressource **« Fichier »**.
3. Donnez-lui un nom (par exemple « Assistant de création de ressources ») et déposez le zip dans la zone de fichiers.
4. Cliquez sur le zip déposé, puis sur **« Décompresser »**. Un dossier apparaît à côté du zip.
5. Ouvrez ce dossier, cliquez sur `index.html`, puis sur **« Définir comme fichier principal »**. Vous pouvez ensuite supprimer le zip de la zone de fichiers.
6. Enregistrez la ressource. Les enseignants inscrits au cours ouvrent l'assistant par ce lien.

Pour une mise à jour, refaites ces étapes avec le nouveau zip, dans la même ressource.

### Navigateurs

- **Chrome ou Edge (recommandés)** : la fenêtre « Enregistrer sous » permet de choisir le dossier et le nom de chaque fichier produit.
- **Firefox ou Safari** : l'assistant fonctionne, mais les fichiers vont directement dans le dossier Téléchargements.

### Ce qu'il faut savoir

- **Sauvegarde** : le travail en cours est gardé automatiquement dans le navigateur, sur ce poste seulement. Pour le conserver ou le reprendre ailleurs, utilisez « Enregistrer le projet », puis « Ouvrir un fichier projet ».
- **Confidentialité** : l'assistant ne transmet aucune donnée. Seul ce que l'enseignant colle lui-même dans le service d'IA autorisé par son organisation scolaire quitte le poste.

Le détail du fonctionnement de l'application est dans [`application/README.md`](./application/README.md).

---

## Architecture du projet

```
Gen-Moodle-IA/
├── Originaux_a_analyser/   ← Dépôt des documents sources (.pdf, images, textes)
├── AGENTS.md               ← Directives globales permanentes des agents IA
├── moteur-ui/              ← Moteur méthodologique et design system universel
│   ├── src/
│   │   ├── tokens.css      ← Variables chromatiques et typographiques (WCAG AAA)
│   │   ├── style.css       ← Styles natifs modernes (zéro Bootstrap/Tailwind)
│   │   ├── print.css       ← Feuille de style d'impression Letter US haute fidélité
│   │   └── app.js          ← Logique modulaire, navigation et assistant pédagogique
│   ├── activite-interactive.html
│   └── tableau-de-bord.html
└── .agents/
    └── skills/             ← Boîte à outils didactique et technique
        ├── eval_pfeq/      ← Exécution des 6 modes d'évaluation sans LaTeX
        ├── assistant_scorm/← Empaquetage Moodle SCORM 1.2 & gabarit simulateur
        ├── concepteur_web/ ← Prototypage selon les 2 archétypes moteur-ui
        ├── jeu_hero/       ← Jeu dont vous êtes le héros (CYOA, score à 0)
        └── wcag/           ← Référentiel d'accessibilité numérique WCAG 2.1 AAA
```

---

## Standards non négociables
- **Zéro LaTeX (`.tex`)** : Format pivot unique en HTML5 sémantique léger.
- **Conformité Loi 25** : Zéro CDN externe, polices système et fichiers 100 % locaux.
- **Navigation élève haut/bas** : Stepper fixe en haut et boutons de navigation en bas.
- **Simulateur enseignant épuré** : En-tête clair 48px, navigation directe, mode corrigé, zéro journal SCORM visible.
- **Score cumulatif strict** : Débute toujours à 0 (`score = 0`) et augmente avec chaque réussite.

---

## Les skills de l'agent

Les skills sont des modes d'emploi spécialisés, rangés dans [`.agents/skills/`](./.agents/skills/). L'agent IA local les consulte de lui-même selon la demande : il n'est pas nécessaire de les nommer.

| Skill | À quoi il sert | Exemple de demande |
| :--- | :--- | :--- |
| [`eval_pfeq`](./.agents/skills/eval_pfeq/SKILL.md) | Transforme une évaluation ou un document scientifique en ressource prête à l'emploi : corrigé interactif SCORM, exercice de compréhension SCORM, nouvelle version d'examen, corrigé d'examen imprimable, questions de vidéo interactive H5P, banque de questions Moodle XML. Aucun fichier LaTeX. | « Génère une version de cet examen » |
| [`assistant_scorm`](./.agents/skills/assistant_scorm/SKILL.md) | Construit et empaquette les activités SCORM 1.2 pour Moodle : l'activité de l'élève (navigation en haut et en bas, envoi de la note) et le simulateur de l'enseignant (corrigé, accès direct aux questions, narration enregistrée). Comprend le canevas de compréhension selon Hattie. | « Génère un exercice de compréhension SCORM selon le canevas Hattie » |
| [`concepteur_web`](./.agents/skills/concepteur_web/SKILL.md) | Conçoit des pages web et des écrans interactifs selon les deux modèles du moteur (tableau de bord ou activité interactive), sans framework externe. | « Crée une page d'activité interactive sur les états de la matière » |
| [`jeu_hero`](./.agents/skills/jeu_hero/SKILL.md) | Scénarise des jeux « dont vous êtes le héros » pour les sciences au secondaire : embranchements, choix de l'élève, score qui débute à 0. | « Crée un jeu dont vous êtes le héros sur la digestion » |
| [`wcag`](./.agents/skills/wcag/SKILL.md) | Référentiel d'accessibilité (WCAG 2.1 AA et AAA) appliqué à toutes les pages : contrastes, navigation au clavier, structure lisible par les lecteurs d'écran. | Appliqué automatiquement |
