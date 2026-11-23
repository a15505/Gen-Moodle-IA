# Type 6 : Banque de questions Moodle XML

- **Document source original :** [`Lecture_4.3_Systeme_Respiratoire.pdf`](./Lecture_4.3_Systeme_Respiratoire.pdf)
- **Commande à exécuter :**
  > `Génère une banque de questions Moodle XML` *(ou `Génère un test Moodle`)*

### Livrables générés (`Fichiers/`)
1. [`questions_moodle.xml`](./Fichiers/questions_moodle.xml) : Fichier XML officiel prêt pour import direct dans la Banque de questions Moodle couvrant les 9 types de questions supportés (`multichoice`, `gapselect`, `matching`, `numerical`, `ordering`, `ddimageortext`, `truefalse`, `shortanswer`, `cloze`).
2. [`simulateur.html`](./Fichiers/simulateur.html) : Simulateur de test basé sur [`simulateur_moodle_template.html`](../../.agents/skills/eval_pfeq/resources/simulateur_moodle_template.html) (en-tête 48px clair, navigation latérale, bouton « Corrigé » et export).
3. `src/` : Tokens, styles et mathjax locaux conformes Loi 25.
