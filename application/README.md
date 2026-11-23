# Application web — assistant de création de ressources Moodle

Application destinée au personnel enseignant qui utilise Gemini ou Copilot, sans API.
L'assistant prépare une consigne, l'enseignant la donne à l'IA, colle la réponse JSON
dans l'application, qui la vérifie, l'affiche et l'exporte en ressource Moodle.
Tout se passe dans le navigateur : aucune donnée n'est transmise.

## État du prototype

| Action | État |
| :--- | :--- |
| Vidéo interactive H5P | Fonctionnelle (4 étapes, YouTube ou Vimeo, export `.h5p` et page HTML) |
| Banque de questions Moodle XML | Fonctionnelle (4 étapes, 9 types au choix, document joint à l'IA ou texte collé, export `.xml`) |
| Corrigé interactif SCORM | Fonctionnel (4 étapes, exercice joint à l'IA ou texte collé, démarches en produit croisé, images ajoutées à l'aperçu, package SCORM 1.2 `.zip`) |
| Exercice de compréhension SCORM | Fonctionnel (4 étapes, texte joint à l'IA ou collé, citation et question « Pourquoi… ? » par notion, deuxième chance, package SCORM 1.2 `.zip`) |
| Compréhension en deux pages (Hattie) | Fonctionnelle (4 étapes, document joint à l'IA ou collé, présentation narrée ou écrite puis question, erreurs typées, explication en trois temps, package SCORM 1.2 `.zip`) |
| Nouvelle version ou corrigé d'un examen | Fonctionnelle (4 étapes, examen joint à l'IA ou collé, version aux données renouvelées ou corrigé, méthodes A et B, feuilles en format lettre, impression PDF et pages HTML statiques) |

## Déposer l'application dans Moodle

L'application charge le moteur partagé depuis le dossier voisin `../moteur-ui/` : un zip du seul dossier
`application/` n'a donc ni styles ni scripts du moteur (erreurs 404). Construire plutôt le paquet autonome :

    python application/outils/paquet_moodle.py

Le script crée « Assistant de création de ressources Moodle.zip » à la racine du dépôt : l'application et le
moteur (`moteur-ui/src`, `moteur-ui/simulateurs`) réunis, tous les liens relatifs à `index.html`. Dans Moodle
(ressource « Fichier ») : déposer le zip, le décompresser, puis choisir `index.html` comme fichier principal.
Les boutons « Enregistrer » des simulateurs, qui écrivent sur le disque par `server.py`, n'ont pas d'effet
hors du serveur local.

## Fichiers

- `index.html` : accueil et assistant pas à pas.
- `src/images/` : logo du RÉCIT (en-tête) et icône de l'onglet (`favicon.ico`), copiés localement.
- `apercu-video.html` : aperçu dans le simulateur vidéo de `moteur-ui` (mode d'édition compris).
- `src/assistant.js` : navigation, sauvegarde automatique dans le navigateur, reprise d'un projet.
- `src/collage.js` : lecture tolérante du JSON collé (balises de code, guillemets typographiques,
  virgules en trop, barres obliques LaTeX, réponse coupée). Réutilisable par toutes les actions.
- `src/projets.js` : fichiers projet étiquetés (`application`, `type`, `version`, `titre`, `etape`,
  `enregistreLe`, `projet`) et reconnaissance d'un fichier à reprendre. Les fichiers sans étiquette sont
  reconnus à leur structure : `questions_video.json`, `questions_moodle.xml`, `questions_data.js`.
- `src/exemples/video.js` : projet d'exemple (repris de l'exemple 05).
- `src/export-html.js` : page HTML autonome pour l'élève (simulateur de `moteur-ui` en mode élève). Elle doit être
  servie par un site (Moodle, Google Sites) : en double-clic, YouTube refuse de jouer (erreur 153) ; l'aperçu
  HTML de SharePoint interdit toute vidéo intégrée (`frame-src 'none'`).
- `src/actions/video.js` : consigne pour l'IA, vérification des règles, consigne de correction,
  conversion au format `questions_video.json` de l'exemple 05.
- `apercu-moodle.html` : aperçu dans le simulateur Moodle de `moteur-ui` (mode d'édition, import d'image).
- `src/assistant-moodle.js` : parcours « Banque de questions Moodle XML » (utilise les outils communs
  exposés par `assistant.js` dans `window.MoodleAIOutils`).
- `src/actions/moodle.js` : consigne pour l'IA (JSON compact par type), vérification des règles (titres sans
  numéro, tag d'un mot, choix, trous, syntaxe Cloze, étiquettes de 1 ou 2 mots, mots interdits), consigne de
  correction, conversion vers le modèle du simulateur et XML par `MoodleParser.serializeXml`.
- `src/exemples/moodle.js` : banque d'exemple (système respiratoire, reprise de l'exemple 06, image comprise).
- `src/assistant-scorm.js` : parcours « Corrigé interactif SCORM » (outils communs de `window.MoodleAIOutils`).
- `src/actions/scorm-corrige.js` : consigne pour l'IA (JSON compact : choix, réponse courte ou calcul, volets,
  association ; démarche des calculs), vérification des règles (exactement un choix correct, catégories, démarche
  complète, mots interdits, titres sans numéro), consigne de correction, conversion vers `questions_data.js`
  (mode `corrige` de `moteur-ui/simulateurs/scorm/scorm_runtime.js`), aperçu et package SCORM.
- `src/exemples/scorm-corrige.js` : corrigé d'exemple (concentration des solutions, 6 questions, 11 points).
- `src/actions/scorm-comprehension.js` : consigne pour l'IA (citation, source, question « Pourquoi… ? », 4 choix « Parce que… »,
  explication, deuxième chance), vérification (citation retrouvée dans le texte collé, un seul choix correct, mots interdits,
  titres sans numéro), conversion vers `questions_data.js` (mode `comprehension` du moteur). L'aperçu, le package et la
  retouche par l'IA reprennent ceux du corrigé (`scorm-corrige.js` lit le mode dans les données).
- `src/exemples/scorm-comprehension.js` : exercice d'exemple (système digestif et nutrition, repris de l'exemple 02, 8 questions, 16 points).
- `src/actions/scorm-hattie.js` : consigne pour l'IA selon le canevas Hattie (`.agents/skills/assistant_scorm/CANEVAS_COMPREHENSION_HATTIE.md`) :
  analyse préalable (habiletés et erreurs majeures), présentation narrée (`narration`, `mots_cles`) ou écrite (savoir que, savoir comment,
  savoir avec, réflexe), démarche en produit croisé, question à choix « Je me dis que… » dont chaque distracteur porte son type d'erreur,
  explication en trois temps et deuxième chance. Vérification (types d'erreur, longueur de la narration, démarche, mots interdits), conversion
  vers `questions_data.js` (mode `comprehension`, présentation `deux-pages`) et reprise d'un `questions_data.js` de ce type.
- `src/exemples/scorm-hattie.js` : exercice d'exemple (concentration des solutions, repris de l'exemple 07, 8 stations narrées, 24 points) ;
  ses schémas SVG sont repris dans `images-exemples.js` et convertis en PNG à l'ajout.
- `src/assistant-examen.js` : parcours « Nouvelle version ou corrigé d'un examen » (outils communs de `window.MoodleAIOutils`).
- `src/actions/examen.js` : consigne pour l'IA (mode `version` ou `corrige`), lecture (types `calcul`, `choix`, `ouverte` ; page,
  espace de démarche, lignes de réponse), vérification (mots interdits sur la copie, un seul choix correct, démarche complète, formule
  en fraction, unités), consigne de relecture facultative (aperçu en markdown demandé à l'IA, sans recalcul, erreurs signalées à part),
  construction des deux documents imprimables, pagination du corrigé et page HTML statique.
- `src/exemples/examen.js` : version B du mini-test sur la concentration (repris de l'exemple 03, 7 problèmes, 2 pages, 14 points).

### Exercice de compréhension SCORM

Il partage l'écran et le parcours du corrigé interactif (`assistant-scorm.js`, profils `scorm-corrige` et
`scorm-comprehension`) : seuls les libellés, la consigne, la vérification et le champ « Nombre de questions » changent.
Chaque question vaut 2 points par défaut ; la deuxième chance, proposée après une erreur, rapporte la moitié des points.
Un `questions_data.js` en mode `comprehension` s'ouvre avec « Ouvrir un fichier projet » ; la variante en deux pages s'ouvre dans l'assistant Hattie.

### Compréhension en deux pages (Hattie)

Troisième profil de l'écran SCORM (`scorm-hattie`). L'étape 1 ajoute le nombre de stations (3 points chacune, 1 point pour la
question guidée) et le format des présentations : avec narration (recommandé) ou écrites. Gemini et Copilot ne dessinent pas
les schémas dans leur réponse : chaque station décrit le sien (`figure`), et la colonne de l'étape 3 offre la demande d'image
(schéma plat, sans phrase avec la narration) et les boutons d'ajout. Un SVG ajouté est converti en PNG de 1200 px.
#### Narration avec la voix de l'enseignant

À l'étape 3, chaque présentation narrée a son volet « Narration avec votre voix » (`src/enregistreur-voix.js`) : texte à lire
en télésouffleur, durée visée, compte à rebours, niveau du micro, puis Enregistrer, Arrêter, Écouter et Retirer. Le traitement
du son est celui du simulateur (`moteur-ui/simulateurs/scorm/narration-recorder.js`, exposé par `NarrationRecorder.outils`) :
silences coupés, volume égalisé, MP3 mono à 64 kbit/s par `lame.min.js` (copie locale). Rien ne quitte le navigateur.

- Le MP3 est rangé dans la station (`audio` en `data:`, avec `audioDuree` et `audioTexte`, le texte lu). L'aperçu le fait
  entendre aussitôt ; le volet signale une narration modifiée depuis l'enregistrement.
- Sauvegarde automatique : les sons (environ 0,5 Mo par minute) sont gardés dans IndexedDB (base `moodleai-audio`, une entrée
  par projet) ; localStorage ne garde que la marque `idb`, remplacée à la reprise. « Enregistrer le projet » les inclut.
- Package : chaque enregistrement devient `src/audio/<id>.mp3`, déclaré dans `imsmanifest.xml` ; le moteur le lit à la place
  de la voix de synthèse. Une station sans enregistrement garde la voix française de l'appareil, et la transcription reste offerte.
- Le micro exige une page en `https://` ou en `localhost` (servie par un site, Moodle compris) : en ouverture `file:///`, le
  navigateur peut le refuser.

### Corrigé interactif SCORM

L'aperçu de l'étape 3 est l'activité élève elle-même : la coquille `moteur-ui/simulateurs/scorm/index_scorm_shell.html`,
chargée dans un cadre (`srcdoc`) avec les données intégrées. « Consulter le corrigé » et « Aller à » pilotent l'activité
comme le simulateur enseignant (messages `TOGGLE_CORRIGE` et `GOTO_QUESTION`).

Le package est construit dans le navigateur (fflate), avec le même contenu que `create_scorm_activity.py` :
`index.html`, `questions_data.js`, `imsmanifest.xml`, `src/` (styles, `scorm_api.js`, `scorm_runtime.js`, `mathjax.js`)
et `src/images/`. Son nom reprend le titre de l'activité avec ses accents (« … — Corrigé interactif.zip »).
La coquille et `scorm_api.js` sont rangés dans `moteur-ui/simulateurs/scorm/`, partagés par le script et l'application.

La colonne « Images et retouches », à droite de l'aperçu, suit la question affichée (message `QUESTION_CHANGED` du moteur) :
demande d'image et boutons d'ajout, puis « Retoucher cette question avec l'IA ». L'enseignant décrit le changement,
« Copier la requête » prépare la consigne (question actuelle au format compact, demande, règles ; `consigneRetouche`), puis
la question retouchée collée est lue, vérifiée comme à l'étape 2 et remplace seulement cette question (`appliquerRetouche`),
image comprise. Une retouche non conforme n'est pas appliquée (consigne de correction offerte) ; « Annuler la dernière retouche »
remet la version précédente. Le texte de l'étape 2 est régénéré (`activiteCompacte`) pour rester cohérent.

Quand une question a une image, « Retoucher l'image » ouvre l'éditeur partagé
`moteur-ui/simulateurs/common/image-retouch-canvas.js` (pinceau, trait, pipette, clonage, flou), celui du simulateur
Moodle. Le module porte ses propres styles et accepte `ImageRetouchCanvas.open({ imageSrc, onSave, titre, libelleEnregistrer })` :
il s'intègre ainsi à toute page. L'image retouchée remplace celle de la question (1200 px au plus). Dans l'assistant Moodle,
la liste « Images des questions » (au-dessus de l'aperçu) offre le même bouton pour chaque glisser-déposer qui a son image :
l'image retouchée passe par `MoodleDDImage.appliquerImage` (zones conservées, limite de 600 px).

Les calculs sont rendus en produit croisé par le moteur (formule originale en fraction avec sa légende « où »,
valeur encerclée qui change de côté, unités biffées, résultat encadré). En mode corrigé, une réponse erronée affiche
cette démarche sous la question ; une bonne réponse n'affiche que la rétroaction de l'Assistant.

Les réponses courtes acceptent automatiquement la virgule ou le point décimal, avec ou sans l'unité. Les images
(schémas de l'exercice) se collent (Ctrl+V), se choisissent ou se demandent à l'IA ; elles sont ramenées à 1200 px
de côté. Un `questions_data.js` de l'outil actuel s'ouvre avec « Ouvrir un fichier projet », sauf s'il contient des
types propres à une activité (ex. `glandes_grid`), que l'assistant ne sait pas modifier.

### Nouvelle version ou corrigé d'un examen

Deux demandes à l'étape 1 : une nouvelle version (données renouvelées, réponses et distracteurs recalculés, même structure,
même barème et même pagination) avec son corrigé, ou le corrigé de l'examen fourni (énoncés et choix inchangés). Aucun fichier
`.tex` : l'aperçu de l'étape 3 est la page imprimable elle-même, dans un cadre (`srcdoc`), en feuilles de 8,5 × 11 po.

- Copie de l'élève : cartouche textuel, sans logo ; questions sur les mêmes pages que l'original ; espaces de démarche (lignes
  d'écriture de 0,3 po, l'espace libre de la feuille étant réparti entre les questions) et lignes « Réponse : … ____ » de l'original.
  Les choix d'une nouvelle version sont mélangés une fois ; ceux d'un corrigé gardent l'ordre de la copie.
- Corrigé : méthode A (produit croisé) et méthode B (isolation algébrique) côte à côte, bandeau « Sur la copie élève »,
  justification des choix, erreurs fréquentes et grille de correction. Les démarches sont rendues par le moteur SCORM
  (`window.ScormDemarche` de `scorm_runtime.js`, chargé comme bibliothèque avec `SCORM_ACTIVITY_CONFIG.bibliotheque`) et MathJax
  (SVG) : une seule source pour la formule en fraction, la valeur encerclée et les unités biffées. Une démarche complète demande
  plus de place qu'un espace de copie : une carte qui ne tient plus sur la feuille passe entière sur une feuille « suite ».
- La colonne « Mise en page et schémas » règle la page et l'espace de chaque question et reçoit les schémas (PNG ou JPEG,
  1200 px au plus). Une feuille qui déborde est entourée d'un pointillé.
- Étape 4 : « Imprimer… » (destination PDF, format lettre) et « Enregistrer la page HTML… » : page statique, formules déjà
  rendues en SVG, sans script ni appel réseau, qui s'ouvre en double-clic.

### Choix du dossier d'enregistrement

À l'étape 4 des assistants (fichier H5P, page HTML, fichier XML, package SCORM) et pour « Enregistrer le projet », une fenêtre permet de choisir le dossier et
le nom du fichier (`MoodleAIOutils.enregistrerSous`, API `showSaveFilePicker` de Chrome et Edge). Le navigateur
retient le dernier dossier choisi. Firefox et Safari n'offrent pas ce choix : le fichier va dans Téléchargements.

### Images du glisser-déposer sur image

Gemini et Copilot ne peuvent pas joindre d'image à leur réponse JSON. L'IA fournit les étiquettes et une
description du schéma. À l'étape 3, « Copier la demande d'image » prépare la demande à donner à l'IA (liens
vers Gemini et Copilot). L'enseignant copie l'image produite, puis « Coller l'image » ou Ctrl+V (ou « Choisir un
fichier ») la place dans la question, et il glisse les zones sur le schéma dans l'aperçu. Les formats autres que
PNG et JPEG sont convertis en PNG.

Protection de Moodle : une image de plus de 600 px de côté déborde de la page du test. À l'ajout (collage,
fichier ou dépôt), l'éditeur affiche une alerte qui propose la réduction (« Réduire à … px » ou « Annuler
l'ajout »). L'étape 4 signale toute image encore trop grande, et l'exportation la réduit dans tous les cas.
La limite est fixée à 600 px dans `moteur-ui/simulateurs/moodle/moodle-ddimage.js` (`DD_TAILLE_MAX`) et dans
`src/actions/moodle.js` (`TAILLE_MAX_IMAGE`). L'exportation XML
reste bloquée tant qu'une image manque. Les images lourdes peuvent dépasser la mémoire du navigateur : la
sauvegarde automatique le signale, et « Enregistrer le projet » conserve tout.

## Sauvegarde et reprise

- Sauvegarde automatique dans le navigateur, une par type (`moodleai.<type>.projet`), l'exemple à part
  (`moodleai.<type>.exemple`). Elle ne vaut que pour ce navigateur, sur cet ordinateur.
- « Enregistrer le projet » (en-tête, à toute étape) télécharge un fichier projet étiqueté ;
  « Ouvrir un fichier projet » ou un glisser-déposer l'ouvre après un résumé, dans le bon assistant.

L'application réutilise `../moteur-ui/` (tokens, simulateur vidéo, exportateur H5P, fflate).
Pour la déposer ailleurs, il faut copier le dossier `application/` et le dossier `moteur-ui/`
côte à côte.

## Essai local

La lecture YouTube exige une page servie en `http://` (erreur 153 en `file:///`) :

```powershell
python server.py 8080
```

Puis ouvrir http://localhost:8080/application/index.html.
