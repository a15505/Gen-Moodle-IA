# Traitement de la requête « Génère un exercice de compréhension SCORM selon le canevas Hattie »

> **Document explicatif destiné à l'enseignant.** Il décrit le processus actuel tel qu'il est écrit dans le dépôt (novembre 2026). Il n'est relié à aucun processus et ne modifie pas le comportement de l'agent.

---

## Vue d'ensemble

| Étape | Qui agit | Ce qui se passe | Fichier ou outil |
|---|---|---|---|
| 1. Requête | Enseignant | Copie la commande dans le chat (depuis la 7e tuile d'`assistant.html`) | `assistant.html` |
| 2. Aiguillage | Agent | Reconnaît la commande et ouvre le canevas | `AGENTS.md` (section 3.D, point 7) |
| 3. Lecture | Agent | Lit le canevas, le gabarit et, au besoin, une station de l'exemple | `CANEVAS_COMPREHENSION_HATTIE.md` |
| 4. Analyse | Agent | Analyse le document source : habiletés et erreurs majeures | `Originaux_a_analyser/` |
| 5. Point d'arrêt GO | Enseignant | Valide le plan et choisit le format des présentations | Chat |
| 6. Rédaction | Agent | Rédige les données et les images | `questions_data.js`, `src/images/*.svg` |
| 7. Validation | Script | Contrôle automatique des règles du canevas | `valider_questions_data.py` |
| 8. Déploiement | Script | Construit l'activité et le package SCORM | `create_scorm_activity.py` |
| 9. Vérification | Agent | Contrôle le rendu dans le navigateur | Aperçu local |
| 10. Remise | Agent | Donne le lien du simulateur | `demarrer.py`, `server.py` |
| 11. Narration | Enseignant | Enregistre sa voix, puis exporte le package | Simulateur |

---

## 1. Requête de l'enseignant

L'enseignant dépose son document (PDF, image, notes de cours) dans `Originaux_a_analyser/`, puis écrit dans le chat :

> Génère un exercice de compréhension SCORM selon le canevas Hattie

La page `assistant.html` présente cette commande dans sa 7e tuile, avec un lien vers l'exemple (`Exemples/07_Comprehension_Hattie_SCORM/Fichiers/simulateur.html`) et vers la consigne qui l'a produit.

## 2. Aiguillage

À chaque session, l'agent charge `AGENTS.md`. Le point 7 de la section 3.D reconnaît la commande et renvoie vers un seul fichier :

- `.agents/skills/assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md`

La consigne est explicite : **lire ce canevas suffit**, sans relire les autres directives (`moteur-ui/AGENTS.md`, `METHODOLOGIE_GENERATION.md`, `CHARTE_GRAPHIQUE.md`, etc.). Le canevas regroupe déjà les règles qui s'appliquent à ce livrable. Le but est d'économiser environ 25 000 tokens de lecture.

## 3. Lecture limitée

L'agent lit :

1. le canevas (environ 4 000 tokens) ;
2. le gabarit `resources/gabarit_questions_comprehension.js`, dont il copie la structure ;
3. au besoin, une seule station de l'activité de référence.

Il ne lit **pas** :

- le moteur `scorm_runtime.js` (105 Ko) ni la coquille `index_scorm_shell.html` (32 Ko) ;
- les documents du dossier `john_hattie/` : le canevas les cite comme « fondements », mais ne demande pas de les ouvrir (voir `SYNTHESE_HATTIE.md`).

## 4. Analyse du document source

L'agent applique l'analyse cognitive des tâches telle que le canevas la résume :

- **5 à 8 habiletés majeures**, classées *savoir que → savoir comment → savoir avec* ;
- **5 à 8 erreurs majeures**, chacune typée : `conception`, `procedure`, `strategie`, `transfert` ou `execution`.

De cette analyse découlent :

- les **stations** (une habileté ou une idée par station), titrées par leur seul sujet conceptuel ;
- les **intentions** (« Ce que j'apprends ») et les **critères** (« Je sais que j'ai réussi quand… »), rédigés au « je » ;
- les **distracteurs** : chaque mauvais choix incarne une erreur majeure.

## 5. Point d'arrêt GO

Avant toute production, l'agent présente :

- les titres des stations ;
- les intentions et les critères de réussite ;
- les erreurs majeures retenues, avec leur type.

Il pose aussi la question du format :

> **Présentations : avec narration audio (recommandé) ou écrites ?**

- **Avec narration** : l'explication est racontée en commentant l'image (principes de Mayer) ; l'écran ne garde que les mots clés et « À retenir ».
- **Écrites** : trois paragraphes (savoir que, comment, avec) et un réflexe.

Rien n'est généré sans un « GO » écrit. Sans réponse sur le format, la narration est retenue. **C'est le moment où l'enseignant corrige l'analyse** : c'est la reprise la moins coûteuse.

## 6. Rédaction

L'agent produit **uniquement** :

- `questions_data.js` (copié du gabarit, seules les valeurs sont rédigées) ;
- les schémas SVG dans `src/images/`.

Il n'écrit jamais d'HTML, de CSS ni de JavaScript applicatif.

### Contenu d'une station (deux pages)

**Page 1 — Présentation** (avec d'autres valeurs que la question) :

| Format écrit | Format avec narration |
|---|---|
| `image` et sa description | `image` sans phrases (valeurs, schémas, repères) |
| `contenu[0]` savoir que | `narration` : paragraphes au « tu », environ 1 min à 1 min 20 s, qui suivent l'image |
| `contenu[1]` savoir comment | `motsCles` : 1 à 3 termes définis |
| `contenu[2]` savoir avec | `aRetenir` : la règle en une ou deux phrases |
| `demarche`, `aRetenir`, `reflexe` | `demarche` ; le dernier paragraphe de la narration y conduit |

**Page 2 — Question** :

- `question` en « Pourquoi… ? » ou « Quel raisonnement… ? », avec de nouvelles valeurs ;
- 4 `choices` formulés comme une pensée d'élève (« Je me dis que… »), un seul juste, chaque distracteur portant son `erreur` ;
- `feedback` court ;
- `explication` en trois temps (`savoirQue`, `savoirComment`, `savoirAvec`) ;
- `remediation` : une question guidée plus simple, 3 choix, 1 point.

### Calculs

L'agent ne fournit que des données compactes : `"formule": "concentration"`, l'inconnue, les deux rapports (`lignes`), le calcul et le résultat. Le moteur affiche seul la formule en fraction avec la légende « où », la substitution, la valeur encerclée, la flèche annotée, les unités biffées et le résultat encadré.

## 7. Validation automatique

```bash
python .agents/skills/assistant_scorm/resources/valider_questions_data.py <Dossier_Activite>
```

Le validateur contrôle, en quelques lignes de sortie :

- la structure et le barème (score de départ 0, total cohérent) ;
- les mots interdits : « PFEQ », « Défi », CD1-CD3, messages génériques, formule en ligne « C = m ÷ V » ;
- les choix verbalisés et typés ;
- l'explication en trois temps et les démarches en produit croisé ;
- la présence des images.

Il s'arrête en erreur (code 1) si une règle n'est pas respectée ; l'agent corrige et relance. **Il contrôle la forme, pas l'exactitude scientifique.**

## 8. Déploiement

```bash
python .agents/skills/assistant_scorm/resources/create_scorm_activity.py <Dossier_Activite> <Dossier_Activite>/questions_data.js
```

Le script :

1. lit le titre et le barème dans `questions_data.js` ;
2. copie les feuilles de style, le moteur `scorm_runtime.js` et les données dans `src/` ;
3. crée `index.html` (activité élève) à partir de la coquille ;
4. crée `simulateur.html` (enseignant) relié à `moteur-ui` ;
5. crée `imsmanifest.xml` ;
6. construit l'archive `.zip` nommée d'après le titre complet, accents compris (le simulateur en est exclu).

## 9. Vérification du rendu

L'agent ouvre l'aperçu et vérifie, de préférence par script plutôt que par capture d'écran :

- chaque présentation rendue, formules MathJax sans erreur ;
- une réponse erronée affiche les quatre blocs (analyse du raisonnement, savoir que, savoir comment, savoir avec) ;
- l'Assistant reste fermé et vide au démarrage ;
- avec narration : aucun `contenu` ni `reflexe`, unités en toutes lettres, images sans phrases.

## 10. Remise à l'enseignant

L'agent démarre le serveur local au besoin (`python demarrer.py`, qui lance ou réutilise `server.py` sur le port 8080) et donne le lien :

```
http://localhost:8080/<Dossier_Activite>/simulateur.html
```

Le simulateur permet de parcourir les stations sans les résoudre, d'afficher le mode corrigé et d'exporter le package.

## 11. Narration (si retenue)

L'agent ne produit ni ne demande aucun fichier audio. L'enseignant :

1. clique sur **« Enregistrer la narration »** dans l'en-tête du simulateur et autorise le micro ;
2. lit le texte de chaque page en télésouffleur (**Enregistrer**, puis **Arrêter**) ;
3. clique sur **« Exporter le package »** une fois toutes les pages enregistrées.

Le son est nettoyé et encodé en MP3 dans le navigateur, rangé dans `src/audio/` par `server.py`, puis le `.zip` est reconstruit avec les enregistrements. En attendant, une voix française locale de l'appareil lit la narration.

---

## Ce que fait le moteur, sans intervention de l'agent

- Écran d'accueil (intentions, critères, déroulement, encadré « Comment avancer » avec narration), score de départ à 0.
- Stepper de pastilles, score cumulatif, navigation Précédent / Suivant.
- Mélange des choix à l'affichage.
- Rétroaction : bonne réponse dans l'Assistant ; réponse erronée, explication en bas et invitation à la lire.
- Écran « Résumé de la tentative », « Terminer et envoyer », confirmation, puis transmission SCORM (`completed`, `LMSCommit`, `LMSFinish`).

## Où l'enseignant intervient

| Moment | Rôle |
|---|---|
| Avant la requête | Déposer le document source |
| Point d'arrêt GO | Valider ou corriger l'analyse (stations, intentions, critères, erreurs) ; choisir le format |
| Après la remise | Relire le contenu scientifique, tester dans le simulateur, enregistrer la narration, exporter le package, déposer dans Moodle |

Les limites de la génération par IAG et les garde-fous correspondants sont décrits dans `SYNTHESE_HATTIE.md` (section 9).
