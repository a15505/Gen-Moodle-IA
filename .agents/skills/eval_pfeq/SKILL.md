---
name: eval_pfeq
description: >-
  Conversion didactique d'évaluations et de documents scientifiques en livrables
  SCORM interactifs, PDF imprimables ou JSON H5P, sans aucun fichier LaTeX (.tex).
  Prend en charge : Corrigé interactif SCORM, Exercice de compréhension de lecture SCORM,
  Nouvelle version d'examen, Corrigé d'examen (PDF/Web), et Questions JSON pour vidéo interactive.
---

# Skill — Évaluation Didactique Rapide PFEQ (Zéro .tex)

Ce skill est le moteur d'exécution didactique du projet **MOODLE_AI**. Il transforme tout document source déposé dans `Originaux_a_analyser/` en l'un des **5 types de livrables spécialisés**, sans aucune compilation LaTeX lourde, en s'appuyant à 100 % sur **`moteur-ui`**.

---

## ⚠️ RÈGLES PERMANENTES DU SKILL

1. **Bannissement total de LaTeX** : Ne jamais créer de fichier `.tex`, ni appeler de compilateur TeX. Le format de sortie est l'HTML5 sémantique, le JSON ou le PDF généré via `@media print`.
2. **`RequestFeedback: false` OBLIGATOIRE** sur tous les artefacts de planification.
3. **Point d'arrêt strict** : Attendre la validation textuelle de l'enseignant dans le chat (« GO », etc.) avant de générer les fichiers finaux.
4. **Séparation didactique & Bannissement de « PFEQ » chez l'élève** :
   - Les compétences ministérielles (CD1, CD2, CD3) et **l'acronyme « PFEQ » ne doivent JAMAIS apparaître dans les ressources destinées aux élèves** (énoncés, options, rétroactions formatives, explications de l'Assistant, badges, balises méta).
   - La mention « PFEQ » est réservée exclusivement à l'attention des enseignants (simulateur enseignant, corrigé enseignant, dialogue avec l'enseignant). Dans les textes pour élèves, remplacer par « démarche scientifique », « critère d'évaluation » ou « repère conceptuel ».
5. **Méthodes scientifiques obligatoires** :
   - **Méthode A** : Produits croisés depuis la formule originale intacte.
   - **Méthode B** : Transformation algébrique (isolation) avant substitution.
   - Formule originale toujours en 1re ligne, résultat encadré avec unités.
   - Formule écrite en fraction verticale avec indices et légende « où » (ex. : $C = \dfrac{m_{soluté}}{V_{solution}}$, où $C$ : concentration en g/L ; $m_{soluté}$ : masse de soluté en g ; $V_{solution}$ : volume de la solution en L). Jamais « C = m ÷ V » en ligne. On substitue les valeurs dans la fraction, puis on pose le produit croisé en fractions : la valeur qui change de côté est encerclée et une flèche annotée montre son déplacement. Jamais de tableau de correspondance avec des flèches. Référence : `resources/reference_formule_concentration.png`. LaTeX n'est exigé que pour Moodle ; ailleurs, LaTeX par MathJax local ou équivalent HTML fidèle (voir AGENTS.md, section 2.2).
6. **Scoring cumulatif débutant à 0** : Tout score part de 0 (`score = 0`, `INITIAL_SCORE: 0`) et augmente au fil des réussites.
7. **Zéro logo ou image dans l'en-tête** : Interdiction formelle d'ajouter un logo d'établissement, blason ou image décorative (`logo.png`, etc.) dans l'en-tête de l'évaluation ou de l'activité. L'en-tête doit demeurer 100 % textuel, épuré et typographique.
8. **Construction obligatoire des simulateurs à partir des modèles validés (Zéro code from scratch)** :
   Toute page `simulateur.html` requise pour une activité doit obligatoirement et systématiquement être construite par clonage et instanciation du gabarit validé correspondant dans `resources/` :
   - **Vidéo interactive H5P (Mode 5)** : [`resources/simulateur_video_template.html`](./resources/simulateur_video_template.html) (doté exclusivement des 4 boutons : **« Édition »**, **« Questions »**, **« Exporter H5P »**, **« Enregistrer »** avec sur-écriture locale directe des fichiers via `server.py`).
   - **Banque / Test Moodle XML (Mode 6)** : [`resources/simulateur_moodle_template.html`](./resources/simulateur_moodle_template.html) — **Coquille modulaire ultra-légère (< 50 lignes)** motorisée par la suite modulaire centralisée `moteur-ui/simulateurs/moodle/` (`moodle-parser.js`, `moodle-viewer.js`, `moodle-ddimage.js`, `moodle-editor.js`, `moodle-app.js`) et `moteur-ui/simulateurs/common/image-retouch-canvas.js`. Lors d'une demande de test Moodle, **l'agent génère uniquement le fichier `questions_moodle.xml`** et instancie la coquille légère `simulateur.html` qui charge le XML dynamiquement. Zéro duplication de code monolithique. Fonctionnalités intégrées : mode d'édition avec Quill et inspecteur Cloze, boutons « Exporter XML », « Enregistrer » (`/api/save_json`), « Compléter toutes les bonnes réponses », gestion `ddimageortext` (bouton « Générer une nouvelle image avec IAG », import local, placement interactif des cibles, étiquettes $\le 2$ mots, outil de retouche d'image Canvas), commutateur `shuffleanswers` et tag PFEQ d'un mot.
   - **Bouton « Générer une nouvelle image avec IAG »** : La demande est traitée en quatre temps :
     1. Le bouton dépose `demande_image.json` à côté de `simulateur.html` (sujet, prompt, dimensions) et le simulateur attend la réponse.
     2. L'enseignant écrit « Traite la demande d'image » dans le chat. L'agent lit ce fichier (recherche : `**/demande_image.json`) et crée avec son outil de génération d'images le fichier `proposition_image.png` (ou `.jpg`) dans le même dossier.
     3. Le simulateur présente l'image actuelle et l'image proposée côte à côte : **« Remplacer l'image »** ou **« Conserver l'image actuelle »**. Les deux fichiers d'échange sont alors retirés.
     4. L'enseignant ajuste les zones au besoin, puis clique sur **« Enregistrer »**.
   - **Image matricielle obligatoire (PNG ou JPEG)** : 🚫 aucun SVG pour l'illustration d'une question `ddimageortext`, ni dans le XML ni comme proposition. L'image ne contient aucun texte.
   - **Si l'agent n'a pas d'outil de génération d'images**, il le dit clairement et n'y substitue pas d'image vectorielle ; l'enseignant peut utiliser « Copier le prompt » avec un autre outil, puis « Parcourir... ».
   - **Activités SCORM 1.2 (Modes 1, 2, 3, 4)** : [`../assistant_scorm/resources/simulateur_template.html`](../assistant_scorm/resources/simulateur_template.html).
   🚫 **Interdiction formelle de recoder un simulateur de zéro (from scratch).** L'agent injecte les données dans le modèle validé en substituant les variables de gabarit (`{{CONFIG_JSON}}`, `{{TITRE_VIDEO}}`, etc.) et valide la syntaxe JS avant livraison.

---

## CATALOGUE DES 7 INSTRUCTIONS SPÉCIFIQUES

L'enseignant déclenche la production en utilisant l'une de ces 7 commandes précises :

```
1. « Génère un corrigé interactif SCORM »
2. « Génère un exercice de compréhension de lecture SCORM »
3. « Génère une version de cet examen »
4. « Génère un corrigé de cet examen »
5. « Génère un fichier de questions en format JSON (vidéo interactive) »
6. « Génère une banque de questions Moodle XML » (ou « Génère un test Moodle »)
7. « Génère un exercice de compréhension SCORM selon le canevas Hattie »
```

---

### MODE 1 : « Génère un corrigé interactif SCORM »
*Inspiré de `scorm_entraine_toi` du projet SCI.*

- **Objectif** : Créer un module d'entraînement autonome où l'élève résout des problèmes avec accès à une pratique guidée pas-à-pas et aux explications didactiques.
- **Composants générés** :
  - `index.html` : Activité élève avec double navigation (stepper de pastilles en haut + boutons Précédent/Suivant en bas), **Assistant** (strictement nommé « Assistant ») flottant en superposition sur une deuxième couche doté d'une croix de fermeture `[✕]` (`#btnCloseCoach`) et d'un bouton de contrôle `[Assistant]` dans la `top-nav-bar`, et **dispositif convivial d'agrandissement d'image** (lightbox de zoom haute résolution) pour toute figure présentée.
  - Mode double pour les calculs : bouton « Fournir directement la réponse » ou « Pratique guidée » (qui décompose le calcul : formule, données identifiées, produit croisé ou isolation algébrique, calcul final).
  - `simulateur.html` : Simulateur enseignant épuré (48px clair, navigation directe, solutions modèles, zéro console SCORM).
  - **Archive SCORM 1.2 ZIP nommée fidèlement selon le titre de l'activité avec ses accents** (ex. : `Le système digestif et la nutrition — Corrigé interactif.zip`), prête pour déploiement dans Moodle (zéro nom générique `scorm.zip`).
- **Règles didactiques** :
  - Formule originale intacte en tête, encadrement des réponses intermédiaires et finales.
  - **Ordre aléatoire des choix de réponses** : Pour toute question à choix multiples, l'ordre des options affichées doit être aléatoire (mélange algorithmique type Fisher-Yates à l'initialisation).

---

### MODE 2 : « Génère un exercice de compréhension de lecture SCORM »
*Inspiré de `scorm_comprehension` du 4.1 du projet SCI.*

> **Variante en deux pages (commande 7, « Génère un exercice de compréhension SCORM selon le canevas Hattie »)** : suivre [`../assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md`](../assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md) (deux pages par station, progression savoir que / savoir comment / savoir avec, analyse cognitive des erreurs selon Hattie, représentation visuelle quand la situation le requiert, produit croisé avec valeur encerclée). Partir du gabarit `gabarit_questions_comprehension.js` et valider avec `valider_questions_data.py` avant le déploiement. Pour cette commande, le canevas prévaut sur les consignes de cette section.

- **Objectif** : Valider la compréhension fine d'un texte didactique ou d'un chapitre théorique.
- **Titrage pur par sujet (Zéro mention de « Défi »)** :
  - 🚫 Ne jamais préfixer par « Défi 1 - », « Défi 2 - », etc.
  - ✔️ Titrer uniquement avec le sujet conceptuel (ex. : « Surface de contact et digestion mécanique »).
  - 🚫 Bannissement complet du terme « Défi » dans l'ensemble de l'activité (titres, boutons, badges, rétroactions).
- **Structure par question (`conceptsData`)** :
  1. **Citation source** : Boîte `.enonce-box` encadrant un extrait clé du document (ex. : « Digestion mécanique : processus qui facilite... »).
  2. **Question principale (Sens & interprétation)** : Question à choix multiples interrogeant le sens scientifique précis de la citation.
     - **Ordre aléatoire des options** : Présentation mélangée aléatoirement à chaque chargement de la question.
     - **Choix axés sur l'analyse cognitive & pensée verbalisée** : Les options expriment le raisonnement intérieur de l'élève (sa verbalisation cognitive) sans surcharger de nombres ou de calculs bruts, tandis que les distracteurs ciblent les fausses conceptions fréquentes. Le traitement mathématique complet reste dans la fiche repère et l'explication didactique.
  3. **Rétroaction formative concise dans l'Assistant** : Dès la validation, la rétroaction concise s'affiche directement dans le message de l'Assistant (`#coachWidget`). Aucun message générique dans l'Assistant (« Lis attentivement l'énoncé… ») : il distrait l'élève. Fermé et vide par défaut, l'Assistant ne s'ouvre de lui-même que pour une rétroaction réelle. En cas de bonne réponse, aucun panneau didactique n'est injecté en bas de page pour garder une hauteur compacte sans débordement sous Moodle.
  4. **Remédiation adaptative & Explications détaillées en bas (si erreur)** :
     - Si l'élève échoue à la question principale, l'explication didactique détaillée pas-à-pas s'affiche en bas de page, et l'Assistant conseille explicitement à l'élève d'aller la lire. Une boîte de remédiation s'ouvre avec une **question complémentaire** portant sur le même concept pour lui permettre de comprendre son erreur et de marquer des points partiels. Options de remédiation également présentées en ordre aléatoire.
- **Livrable** : Binôme `index.html` (stepper haut, Assistant sur 2e couche avec bouton `[Assistant]` en barre supérieure et fermeture `[✕]`, zoom d'image convivial, boutons bas) + `simulateur.html` + archive ZIP SCORM 1.2.

---

### MODE 3 : « Génère une version de cet examen »
*Inspiré de `Examen_Thematiques_1_4_Sec3` et `Minitest_Concentration_Sec3`.*

- **Objectif** : Générer une variante d'évaluation (Version B, C...) pour prévenir le plagiat ou pour la reprise d'examen.
- **Spécifications de variation** :
  - Maintien rigoureux des mêmes concepts prescrits et critères d'évaluation.
  - **Renouvellement des données numériques** : Nouvelles valeurs numériques plausibles et cohérentes chimiquement/physiquement.
  - **Distracteurs recalculés** : Ajustement rigoureux des mauvais choix de réponse en fonction des erreurs fréquentes des élèves sur les nouvelles valeurs.
- **Fidélité absolue des espaces réponse pour impression systématique** :
  - 🚫 **Ne jamais modifier les espaces de réponse de l'élève** : L'examen généré étant destiné à une impression papier systématique, les espaces de réponse de l'élève ne doivent pas être altérés ou transformés en formulaires interactifs web (champs de saisie `<input>`, boutons de validation « Vérifier », pastilles de score ou boîtes de rétroaction).
  - ✔️ **Reproduction fidèle des espaces de réponse papier** : Conserver fidèlement le cartouche d'identification de l'élève (`Nom : _________ Groupe : _________`), les consignes textuelles, les espaces ouverts de démarche (`min-height` proportionnelle) et les lignes de réponse de l'original (ex. : `Réponse : en g/L ___________________ en % _________________` ou `Réponse : _________________`).
  - ✔️ **Format Letter US (8,5 × 11 pouces) et pagination stricte** : Répartition des questions par page conforme à l'original (sauts de page `break-after: page;` maîtrisés) pour une impression directe recto ou recto-verso de fidélité 1:1.
- **Livrables générés** :
  - **Version d'examen élève (`index.html`)** : Document prêt pour l'impression Letter US, fidèle aux espaces papier originaux, avec barre d'action discrète sur écran pour imprimer ou basculer vers le corrigé.
  - **Corrigé officiel enseignant (`corrige.html`)** : Énoncés identiques avec démarches complètes (Méthode A et B), formules originales en première ligne et réponses finales intégrées sur les lignes de réponse.

---

### MODE 4 : « Génère un corrigé de cet examen »
*Inspiré de `Corrige_4.1_Systeme_Digestif.pdf` et `corrige.html`.*

- **Objectif** : Produire le corrigé officiel complet et détaillé pour l'enseignant.
- **Contenu obligatoire par problème** :
  - Formule originale en première ligne.
  - Démarche complète rédigée selon la **Méthode A** (produits croisés) ou la **Méthode B** (isolation algébrique).
  - Justification didactique des distracteurs (explication de l'erreur typique représentée par chaque choix incorrect).
  - Encadrement systématique de la réponse finale avec ses unités conformes.
  - **Bandeau « Sur la copie élève »** : Ligne manuscrite exacte avec réponse attendue intégrée.
- **Optimisation des sauts de page & Pagination 1:1** :
  - **Calibrage strict de la pagination** : Le corrigé doit reproduire la pagination de l'examen élève (ex. : 2 pages exactes pour un examen de 2 pages) sans rupture intempestive de carte (`break-inside: avoid`), sans ligne orpheline et avec marges de sécurité maîtrisées.
  - **Grille de correction récapitulative** : Tableau ou encadré synthétique du barème total placé au bas de la dernière page.
- **Livrables générés** :
  - **Corrigé HTML5 & PDF Letter US** : Fichier `corrige.html` et PDF `corrige.pdf` (ou `corrige_officiel.pdf`) prêt pour impression immédiate sans LaTeX.
  - **Mode Corrigé interactif** : Intégré nativement dans le bouton « Consulter le corrigé » de `simulateur.html` ou barre d'en-tête de l'examen.

---

### MODE 5 : « Génère un fichier de questions en format JSON (vidéo interactive) »
*Inspiré de `D:\Documents\GitHub\SCI\Cours_Rattrapage_Sec3\4.1\json H5P\`.*

- **Objectif** : Créer un fichier de questions interactives synchronisées avec les chapitres d'une vidéo pédagogique (Alloprof, YouTube, H5P).
- **Demande obligatoire par défaut de l'URL YouTube** :
  - Si l'URL YouTube n'est pas déjà précisée dans le document original (ex. en-tête de transcription) ou dans la consigne de l'enseignant, **l'agent doit obligatoirement demander l'URL YouTube par défaut** avant de produire les livrables.
  - L'URL YouTube est indispensable pour configurer le lecteur vidéo dans `simulateur.html` et renseigner le champ `editorContent.interactiveVideo.video.files[0].path` du fichier `questions_video.json`.
- **Règles de rédaction des questions (invariants pédagogiques)** :
  1. **Formulation « Pourquoi ... ? »** : Toutes les questions doivent impérativement débuter par « Pourquoi » sous forme interrogative.
  2. **Choix de réponse « Parce que ... »** : Tous les choix de réponse doivent débuter par « Parce que ».
  3. **4 choix de réponse** par question (1 correct, 3 distracteurs réalistes).
  4. **Emplacement temporel des questions** :
     - Faire surgir une question à la fin de chaque chapitre ou concept clé.
     - La 1re question apparaît au moins 5 secondes après le début de la vidéo.
     - La dernière question apparaît au moins 3 secondes avant la fin.
  5. **Rétroaction didactique concise** :
     - Pas de formules bavardes comme « En effet » ou « Tu as raison ». Explication factuelle directe.
     - Mention obligatoire du repère temporel où l'information est expliquée dans la vidéo (ex. : `[01:02]`).
  6. **Champ de retour en arrière (`retour_en_arriere_si_erreur_sec`)** : Indique le timestamp en secondes où la vidéo doit reculer si l'élève se trompe, afin qu'il revoie l'explication.
- **Structure JSON générée & Livrables (`questions_video.json` + `simulateur.html`)** :
  - `questions_video.json` : Fichier JSON complet contenant le bloc compact `aiJsonInput`, le contexte et le bloc `editorContent.interactiveVideo` importable dans Moodle / H5P (compatible avec `editeur-video-interactive-h5p`).
  - `simulateur.html` : Simulateur vidéo interactif motorisé par `moteur-ui` (basé sur `resources/simulateur_video_template.html`) doté d'un en-tête épuré comportant l'interrupteur à bascule style Moodle **« Mode d’édition »** et les boutons **« Questions »**, **« Exporter H5P »**, **« Enregistrer »** (avec sur-écriture directe du fichier local `questions_video.json` sur le disque lors de l'enregistrement). Permet de visionner la vidéo, de tester les surgissements, de valider le recul adaptatif (`seekTo`), d'éditer à la volée questions, choix, rétroactions et moments d'apparition avec boutons de capture en direct `⏱️ Capturer`, et d'exporter le package `.h5p`.
  - `src/` (`style.css`, `tokens.css`, `mathjax.js`, `fflate.js`).
- **Démarrage automatique du serveur local HTTP & Lien direct** :
  - Dès la génération d'une vidéo interactive, l'agent doit **démarrer automatiquement un serveur local HTTP en arrière-plan** (ex: `python -m http.server 8080`) et **fournir le lien fonctionnel `http://localhost:8080/<Nom_Activite>/simulateur.html`** dans sa réponse.
  - Cela élimine définitivement l'Erreur 153 de YouTube (qui bloque les lectures sous le protocole `file:///`) et offre un confort d'accès immédiat en un clic.

---

### MODE 6 : « Génère une banque de questions Moodle XML » (ou « Génère un test Moodle »)
*Inspiré de l'architecture de `generateur_test_Moodle_IAG`.*

- **Objectif** : Transformer les notes de cours (PDF) en une banque de questions prête à être importée directement dans Moodle (`Banque de questions > Importer > Format XML Moodle`).
- **Titres conceptuels obligatoires (Zéro préfixe numérique dans les noms)** :
  - 🚫 **Interdiction absolue de numéroter les noms de questions** : Ne jamais insérer de préfixe en dur comme « Q1. », « 1. », « Question 1 - » dans `<name><text>...</text></name>` ou dans `q.name`.
  - ✔️ **Noms purement descriptifs du concept** (ex. : « Rôle du dioxygène dans la respiration cellulaire ») : les questions d'une banque Moodle sont destinées à être mélangées, réorganisées ou tirées aléatoirement dans des tests. La numérotation dynamique est assurée à l'affichage par Moodle ou par le simulateur (`1. <Titre>`).
- **Tag de concept prescrit PFEQ obligatoire (Un seul mot par question)** :
  - ✔️ **Chaque question doit obligatoirement porter un tag d'un seul mot** (`<tags><tag><text>mot</text></tag></tags>`) correspondant directement au concept prescrit selon le PFEQ pour le sujet enseigné (ex. : `respiration`, `alvéoles`, `diffusion`, `ventilation`, `poumons`, `voies`, `échanges`, `énergie`).
  - Ce mot-clé unique permet à l'enseignant dans Moodle de filtrer facilement la banque de questions et d'alimenter des tests par tirage aléatoire ciblé selon les concepts du programme.
- **Types de questions supportés (Les 9 formats officiels Moodle XML)** :
  1. `<question type="multichoice">` : Choix multiples avec feedback par option, option `shuffleanswers` (mélange) et fractions (`100` pour correct, `0` pour incorrect).
  2. `<question type="gapselect">` : Texte à trous où les mots clés `[[1]]`, `[[2]]` sont choisis dans des menus déroulants catégorisés par `<selectoption><group>X</group></selectoption>`.
  3. `<question type="matching">` : Paires de correspondances `<subquestion>` / `<answer>` avec mélange optionnel.
  4. `<question type="numerical">` : Calculs scientifiques avec valeur attendue, marge d'erreur admissible (`<tolerance>`) et unités avec multiplicateurs (`<units><unit>`).
  5. `<question type="ordering">` : Remise en ordre chronologique, logique ou d'étapes de protocoles.
  6. `<question type="ddimageortext">` : Glisser-déposer d'étiquettes sur schéma avec image encodée en base64 (`<file encoding="base64">`).
     - **Règle absolue sur les étiquettes : 1 ou 2 mots maximum par élément à glisser** (interdiction formelle de phrases, explications ou parenthèses afin d'éviter tout débordement ou chevauchement sur le schéma).
     - **Rôle d'Antigravity pour l'image** : Zéro popup modal bloquant dans l'interface. Antigravity offre le choix dans le chat à l'utilisateur : soit parcourir/glisser un fichier image local que l'agent convertit en Base64, soit laisser l'agent générer une illustration scientifique adaptée au titre, aux étiquettes (1-2 mots) et au document de cours original.
     - **Édition complète dans le simulateur** :
       - Visualisation et ajustement des zones cibles (drops) directement sur l'image (glissement de souris ou champs X/Y).
       - Ajout et suppression d'étiquettes (drags) et de zones cibles (drops).
       - Bouton d'accès à l'**éditeur de retouche d'image Canvas natif** (`#imageRetouchModal` : pinceau, trait, pipette couleur, tampon de clonage, flou/adoucissement, palette de couleurs, sélecteur de taille, annuler/rétablir et sauvegarde immédiate en PNG Base64).
       - Bouton « Copier le prompt » dans la barre de l'illustration (le prompt n'est pas affiché à l'écran).
       - « Hauteur max » redimensionne réellement l'image et recalcule les zones, sans jamais l'agrandir : Moodle reçoit cette taille réelle. L'image est affichée en pixels réels, comme dans Moodle.
  7. `<question type="truefalse">` : Vrai ou Faux avec retour didactique pour la réponse vraie (`<feedback format="html">`) et fausse.
  8. `<question type="shortanswer">` : Réponse courte textuelle ou numérique avec fraction (`fraction="100"`), feedback et gestion de la sensibilité à la casse (`<usecase>0|1</usecase>`).
  9. `<question type="cloze">` : Questions intégrées (Cloze) combinant du texte riche avec des champs de saisie ou QCM imbriqués directement dans la phrase (ex. : `{1:SHORTANSWER:=réponse}` ou `{1:MULTICHOICE:faux~=vrai}`).
- **Encapsulation stricte CDATA & Formules Mathématiques** :
  - Tout texte contenant des balises HTML ou des formules est encapsulé dans `<![CDATA[ ... ]]>`.
  - Les équations scientifiques s'écrivent en notation standard `\( C = \frac{m}{V} \)` ou `\[ M = \frac{m}{n} \]` pour un rendu MathJax automatique dans Moodle et dans le simulateur.
- **Architecture modulaire des livrables dans le dossier `<Nom_Activite>/`** :
  - `questions_moodle.xml` (Fichier d'import Moodle officiel et complet généré à partir de l'analyse didactique).
  - `simulateur.html` (Coquille légère hôte de moins de 50 lignes basée sur `resources/simulateur_moodle_template.html`, qui charge dynamiquement le XML et se branche sur le moteur modulaire partagé `moteur-ui/simulateurs/moodle/`).
  - L'agent **ne génère plus jamais de simulateur monolithique** : les améliorations d'interface sont effectuées dans `moteur-ui/simulateurs/`, et la génération d'un nouveau test ne produit que son contenu scientifique pur.
