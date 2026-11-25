# Canevas — Exercice de compréhension SCORM en deux pages (Hattie)

Commande : « Génère un exercice de compréhension SCORM selon le canevas Hattie » (7e tuile de `assistant.html`). Source unique pour produire un exercice de compréhension conforme à ce canevas. **Lire ce fichier suffit** : il regroupe les exigences du projet qui s'appliquent ici et celles qui ont été établies lors de la refonte de l'activité de référence.

- Activité de référence : [`Exemples/07_Comprehension_Hattie_SCORM/`](../../../Exemples/07_Comprehension_Hattie_SCORM/) (livrables dans `Fichiers/`)
- Gabarit à copier : [`resources/gabarit_questions_comprehension.js`](./resources/gabarit_questions_comprehension.js)
- Validateur : [`resources/valider_questions_data.py`](./resources/valider_questions_data.py)
- Image de référence de la formule : [`../eval_pfeq/resources/reference_formule_concentration.png`](../eval_pfeq/resources/reference_formule_concentration.png)
- Fondements : travaux de John Hattie (intentions et critères de réussite ; analyse cognitive des tâches)

---

## 1. Déroulement et fichiers produits

1. **Analyser** le document source (`Originaux_a_analyser/`) selon l'analyse cognitive des tâches de Hattie : 5 à 8 habiletés majeures classées *savoir que → savoir comment → savoir avec*, et 5 à 8 erreurs majeures typées (section 4).
2. **Point d'arrêt GO** : présenter à l'enseignant les titres des stations, les intentions, les critères et les erreurs majeures retenues. **Lui demander aussi le format des présentations** :
   > **Présentations : avec narration audio (recommandé) ou écrites ?**
   > - *Avec narration* : l'explication est racontée en commentant l'image (principes de Mayer) ; à l'écran, seulement les mots clés et « À retenir ». Vous enregistrez votre voix dans le simulateur ; en attendant, une voix de l'appareil lit le texte.
   > - *Écrites* : l'explication est lue à l'écran (trois paragraphes et un réflexe).

   Ne rien générer avant son « GO ». Sans réponse sur le format, retenir la narration.
3. **Produire uniquement** `questions_data.js` (copié du gabarit) et les SVG dans `src/images/`. Jamais d'HTML, de CSS ni de JS applicatif : le moteur (`moteur-ui/simulateurs/scorm/scorm_runtime.js`) et la coquille (`moteur-ui/simulateurs/scorm/index_scorm_shell.html`) font tout le rendu.
4. **Valider**, puis **déployer**, puis vérifier l'aperçu :

```bash
python .agents/skills/assistant_scorm/resources/valider_questions_data.py <Dossier_Activite>
```

```bash
python .agents/skills/assistant_scorm/resources/create_scorm_activity.py <Dossier_Activite> <Dossier_Activite>/questions_data.js
```

Le déploiement crée `index.html`, `simulateur.html`, `src/` et le zip nommé d'après le titre complet, accents compris.

5. **Remettre l'activité à l'enseignant** : démarrer le serveur local au besoin (`python demarrer.py`) et donner le lien `http://localhost:8080/<Dossier_Activite>/simulateur.html`. Avec narration, ajouter :
   > Pour enregistrer votre voix : cliquez sur **« Enregistrer la narration »** dans l'en-tête du simulateur, autorisez le micro, puis lisez le texte de chaque page (bouton **Enregistrer**, puis **Arrêter**). Les fichiers sont rangés automatiquement. Une fois les N pages enregistrées, cliquez sur **« Exporter le package »** : le `.zip` contiendra vos enregistrements.

   L'agent ne produit ni ne demande aucun fichier audio.

---

## 2. Accueil

- `intentions` (« Ce que j'apprends ») et `criteres` (« Je sais que j'ai réussi quand… ») : deux tuiles textuelles, rédigées au « je », observables. Le moteur masque alors les étapes génériques de l'accueil.
- `welcomeIntro` : une ou deux phrases, puis le déroulement (« Chacune des N stations commence par une page illustrée à lire, suivie d'une question » ; « à écouter » avec narration). Avec narration, le moteur ajoute seul l'encadré « Comment avancer » (écouter l'explication, puis « Passer à la question » en bas à droite ; transcription sans écouteurs) : ne pas le répéter dans `welcomeIntro`.
- Score de départ : 0. Jamais « PFEQ », compétences (CD1, CD2, CD3) ni grille dans ce que voit l'élève.

---

## 3. Une station = deux pages successives (`"presentation": "deux-pages"`)

### Page 1 — Présentation (à lire, plein écran, sans clic requis)

Elle suit la progression en trois temps :

| Champ | Rôle |
|---|---|
| `image`, `imageAlt`, `imageCaption` | Représentation visuelle du concept (section 5) |
| `contenu[0]` | **Savoir que** : l'idée centrale que montre le schéma |
| `contenu[1]` | **Savoir comment** : la démarche, en mots |
| `contenu[2]` | **Savoir avec** : quand et pourquoi l'utiliser, et comment vérifier |
| `demarche` | Calcul détaillé, généré par le moteur (section 6) |
| `aRetenir` | La relation clé, **formulée comme le fait l'étape 1 de la démarche** et reliée au schéma (ex. : « 1 portion sur 4 du kilogramme vaut 250 g = 0,25 kg. L'étape 1 de la démarche le montre par le calcul… ») |
| `reflexe` | Le contrôle à faire systématiquement |
| `citationRef` | Source du cours (facultatif) |

La présentation emploie **d'autres valeurs que la question** : l'élève applique, il ne recopie pas. L'inconnue de l'étape 1 renvoie au schéma (« la portion colorée du schéma »).

#### Variante avec narration audio (principes de Mayer)

Quand l'enseignant choisit la narration au GO (choix par défaut), l'explication passe à l'oral et la zone de droite s'allège. `contenu` et `reflexe` sont alors remplacés par :

| Champ | Rôle |
|---|---|
| `narration` | Liste de paragraphes, lue à voix haute et offerte en transcription repliée. Ton au « tu », environ 1 min à 1 min 20 s. Elle suit l'image dans l'ordre de lecture et désigne ce qui est visible (« à gauche », « compte les points », « suis la flèche »). Unités en toutes lettres (« grammes par litre »). Le réflexe devient l'avant-dernière phrase ; s'il y a une `demarche`, **le dernier paragraphe y conduit** (« Regarde maintenant la démarche, sous l'image : … »). |
| `motsCles` | 1 à 3 entrées `{ "terme": …, "definition": … }`, courtes (pré-entraînement). |
| `aRetenir` | La règle, en une ou deux phrases ; elle ne répète pas la narration. |
| `audio` | Facultatif : fichier local (par défaut `./src/audio/<id>.mp3`). L'enseignant l'enregistre lui-même dans le simulateur (bouton « Enregistrer la narration »). Tant que le fichier est absent, le moteur lit la narration avec une voix française **locale** de l'appareil, à titre provisoire. |
| `audioDemarcheSec` | Facultatif : seconde du fichier audio où la démarche apparaît (sinon, à la fin du fichier). |

Comportement du moteur : aucune lecture automatique ; l'élève lance, met en pause, reprend ou recommence. La démarche reste masquée jusqu'au dernier paragraphe de la narration ; le bouton « Afficher la démarche » et l'ouverture de la transcription l'affichent en tout temps. En mode corrigé, elle est affichée d'emblée.

**Enregistrement par l'enseignant (simulateur, mode narration)** : le bouton « Enregistrer la narration » affiche, pour chaque page narrée, le texte à lire en télésouffleur à côté de l'image, un compte à rebours, un indicateur de volume et l'état de chaque page. À l'arrêt, le son est nettoyé (silences coupés, volume égalisé), encodé en MP3 dans le navigateur (`lame.min.js`, copie locale) et écrit dans `src/audio/` par `server.py` (`/api/save_audio`). « Exporter le package » reconstruit le `.zip` avec ces fichiers (`/api/reconstruire_package`). L'agent n'a rien à produire : il fournit `narration` et `motsCles`, l'enseignant enregistre.

**Image sans phrases** : avec une narration, l'image ne garde que les valeurs, les schémas et les repères (✗, ✓, flèches). Le sens passe par la voix, pas par du texte dans l'image (redondance).

### Page 2 — Question

- Titre : le sujet conceptuel seul, en casse de phrase. Jamais de numéro, de « Question N » ni de « Défi ».
- `question` : « Pourquoi… ? » ou « Quel raisonnement… ? », avec de nouvelles valeurs.
- 4 `choices`, mélangés par le moteur. Chaque choix est une **pensée verbalisée** (« Je me dis que… »), sans bloc de calcul. Un seul est juste.
- Chaque distracteur incarne une **erreur majeure réelle** et porte son type dans `erreur` (section 4).
- `feedback` : rétroaction courte, affichée dans l'Assistant après validation.

---

## 4. Analyse cognitive et explication en trois temps

### Types d'erreur (champ `erreur` de chaque distracteur)

| Valeur | Libellé affiché | Sens (Hattie, analyse cognitive des tâches) |
|---|---|---|
| `conception` | Conception erronée | Modèle ou relation de fond incorrect (« l'eau détruit le sucre ») |
| `procedure` | Erreur de procédure | Étape omise, inversée ou mal ordonnée (« je multiplie par 1 000 pour aller vers le litre ») |
| `strategie` | Erreur de stratégie | Bonne règle appliquée au mauvais moment, ou méthode inadaptée (« dès que je vois kilo, je multiplie ») |
| `transfert` | Erreur de transfert | Réussit la version connue, mais n'adapte pas à une situation changée (« je pèse 40 g pour 250 mL ») |
| `execution` | Erreur d'exécution | Compréhension présente, mais erreur ponctuelle (« 250 mL, c'est la moitié d'un litre ») |

### Explication (affichée en bas après une réponse erronée)

`explication` est un objet ; le moteur l'affiche en quatre blocs :

1. **Analyse de ton raisonnement** (générée) : le choix de l'élève, le libellé du type d'erreur et la rétroaction (ou `analyse` si fournie dans le choix).
2. **Savoir que : ce qui est vrai** (`savoirQue`), avec une figure facultative (`image`, `imageAlt`, `imageCaption`) quand la situation le requiert.
3. **Savoir comment : la démarche** (`savoirComment`), suivi automatiquement de `explicationDemarche`.
4. **Savoir avec : l'utiliser ailleurs** (`savoirAvec`) : une situation différente où la même idée s'applique, et le contrôle de vraisemblance.

### Remédiation

`remediation` : une question guidée plus simple sur le même concept, 3 choix verbalisés, 1 point de récupération.

---

## 5. Représentation visuelle

- **Elle est recherchée chaque fois que la situation le requiert** pour illustrer le concept : grandeur abstraite (concentration, proportion), transformation (dilution, conversion), comparaison, découpage d'un tout. Le validateur signale une station sans image.
- SVG local, `viewBox="0 0 720 420"`, polices système, `role="img"`, `<title>` descriptif, fond blanc, contrastes AA (texte `#0f172a` / `#334155`), aucun dégradé ni décor gratuit.
- Montrer des quantités concrètes et dénombrables (particules, portions égales : 1 kg = 4 portions de 0,25 kg), avec des valeurs différentes de la question.
- Aucun calcul résolu dans le schéma : il montre la relation ; la démarche, elle, est calculée par le moteur.
- `imageAlt` décrit tout ce que montre la figure.

---

## 6. Calculs : produit croisé, à la manière d'un humain

Le moteur produit le rendu à partir de données compactes. Ne jamais écrire le calcul en HTML.

- **Formule originale en première ligne**, en fraction, avec indices en italique et légende « où » : `"formule": "concentration"` (préréglage). Pour une équivalence : `"formule": "1 L = 1 000 mL"`.
- Étape : `inconnue` (« Soit **x** … »), `lignes` = deux rapports `[numérateur, dénominateur]` avec l'inconnue au numérateur, `symbole`, `calcul` (`num`, `den`, `intermediaire` facultatif), `resultat`, `suite`, `biffage`.
- `"rapport": true` sur une étape tirée de la formule de concentration : le moteur affiche d'abord la substitution `C = 8 g / 0,25 L = x / 1 L`.
- Le moteur affiche l'égalité des deux rapports, **encercle la valeur qui change de côté** et trace une flèche annotée vers l'égalité transformée. La valeur reste encerclée dans la ligne de calcul.
- Mini-syntaxe des unités : `[[mL]]` = unité biffée, `[L]` = unité qui reste.
- **Jamais de tableau de correspondance fléché.** Jamais « C = m ÷ V » en ligne.
- Rendu en LaTeX par le MathJax local (base + AMS seulement), avec deux commandes locales définies dans la coquille : `\biffer{}` et `\cercle{}`. N'utiliser aucune autre extension (`\cancel`, `\bbox`, `\color`, `\enclose`) : elle déclencherait un téléchargement.

---

## 7. Interface (déjà assurée par le moteur ; ne pas contourner)

- Assistant fermé et vide au démarrage et à l'arrivée sur une page ; il ne s'ouvre que pour une rétroaction sur une action de l'élève. Aucun message générique.
- Bonne réponse : rétroaction dans l'Assistant seulement. Réponse erronée : explication en trois temps en bas, et l'Assistant invite à la lire.
- Espace de 1,25 rem entre l'énoncé et les choix ; navigation Précédent / Suivant.
- Écran de fermeture (des élèves quittent sans envoyer, et leur note n'est alors jamais transmise) : après la dernière question, « Terminer l'activité » ouvre un écran plein format « Résumé de la tentative », comme un test Moodle. Il porte un avertissement bien visible (« Votre tentative n'est pas encore envoyée »), l'état de chaque question, la note cumulative et un grand bouton « Terminer et envoyer ». Celui-ci ouvre la confirmation « Tout envoyer et terminer ». Après l'envoi, l'écran affiche « ✅ Votre tentative a été transmise avec succès ! ». Ne rien ajouter dans `questions_data.js` : le moteur s'en charge.
- Hauteur SCORM : règle stricte de la coquille, à ne jamais modifier. Le simulateur gère seul son défilement (repli `file:///`).

---

## 8. Uniformité et économie de tokens

### Constat (analyse du projet)

- Les directives totalisent environ 113 Ko (≈ 30 000 tokens) répartis dans 11 fichiers qui se recoupent (`AGENTS.md`, `moteur-ui/AGENTS.md`, `moteur-ui/CLAUDE.md`, `moteur-ui/ANTIGRAVITY.md`, `METHODOLOGIE_GENERATION.md`, `CHARTE_GRAPHIQUE.md`, skills `eval_pfeq` et `assistant_scorm`…). `AGENTS.md` (28 Ko) est chargé à chaque session.
- `questions_data.js` d'une activité de 8 stations pèse environ 60 Ko (≈ 17 000 tokens) : c'est le principal coût de génération.
- Le moteur (`scorm_runtime.js`, 105 Ko) et la coquille (32 Ko) ne doivent jamais être relus en entier pour produire une activité.
- Une part importante des écarts corrigés à la main (mots bannis, choix non verbalisés, explications non structurées, formule en ligne) peut être détectée automatiquement.

### Moyens en place

1. **Ce canevas** : une seule lecture (≈ 4 000 tokens) au lieu des directives complètes pour ce type d'activité.
2. **Gabarit** : la structure est copiée, pas réinventée ; seules les valeurs sont rédigées.
3. **Moteur générateur** : formule, substitution, cercle, flèche, unités biffées, résultat encadré, analyse de l'erreur et blocs des trois temps sont produits à partir de champs courts. Les données ne contiennent jamais de HTML.
4. **Validateur** : contrôle les règles en quelques lignes de sortie, au lieu de relire le fichier et les directives.
5. **Déploiement en une commande** : l'encodage de la console Windows est corrigé, sans relance.

### Pratiques de l'agent

- Ne lire que ce canevas, le gabarit et, au besoin, une station de l'activité de référence.
- Obtenir le GO sur le plan (titres, intentions, critères, erreurs majeures) avant de rédiger le fichier complet : on évite ainsi les réécritures coûteuses.
- Pour modifier une activité existante : script ciblé (remplacement exact ou patch JSON) plutôt que réécriture ; aperçu par extraction (`node` qui affiche titres, choix et explications) plutôt que lecture intégrale.
- Vérifier le rendu par script dans le navigateur (titres présents, nombre de formules rendues, absence d'erreur MathJax) ; réserver les captures d'écran aux contrôles visuels nécessaires.

### Pistes recommandées (non appliquées)

- **Alléger `AGENTS.md`** : n'y garder que les règles transversales et renvoyer vers un canevas par type de livrable, lu à la demande (gain d'environ 5 000 tokens par session).
- **Une seule source par règle** : supprimer les doublons entre `moteur-ui/AGENTS.md`, `CLAUDE.md`, `ANTIGRAVITY.md` et `METHODOLOGIE_GENERATION.md` ; les autres fichiers ne font que renvoyer à la source.
- **Dériver davantage dans le moteur** : produire `calcul` à partir de `lignes` (moins de valeurs répétées, moins d'erreurs de cohérence) et la `solution` à partir de l'explication.
- **Déploiement sélectif** : n'empaqueter que les images référencées par `questions_data.js` (aujourd'hui, tout fichier présent dans le dossier entre dans le zip).
- **Validateur dans le déploiement** : lancer le validateur au début de `create_scorm_activity.py` et arrêter en cas d'erreur.

---

## 9. Liste de contrôle finale

- [ ] GO de l'enseignant obtenu sur le plan et sur le format des présentations (narration ou écrites)
- [ ] Validateur : 0 erreur
- [ ] Déploiement réussi, zip nommé d'après le titre
- [ ] Aperçu : chaque présentation rendue (formules MathJax sans erreur), une réponse erronée affiche les quatre blocs, l'Assistant reste fermé au démarrage
- [ ] Avec narration : `narration` et `motsCles` dans chaque station, aucun `contenu` ni `reflexe` ; dernier paragraphe qui conduit à la démarche ; unités en toutes lettres ; images sans phrases (valeurs, schémas et repères seulement)
- [ ] Lien du simulateur remis ; avec narration, consigne d'enregistrement et d'export donnée
