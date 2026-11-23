# Type 1 : Corrigé interactif SCORM

- **Document source original :** [`Exercice_4.1_Systeme_Digestif.pdf`](./Exercice_4.1_Systeme_Digestif.pdf)
- **Commande à exécuter :**
  > `Génère un corrigé interactif SCORM`

### Livrables générés (Fichiers/)
1. [`Fichiers/index.html`](./Fichiers/index.html) : Activité élève avec double navigation (stepper horizontal de pastilles en haut + boutons Précédent/Suivant en bas), rétroactions formatives avec le coach pédagogique et score cumulatif partant strictement de 0 / 24 pts (0 %).
2. [`Fichiers/simulateur.html`](./Fichiers/simulateur.html) : Simulateur enseignant épuré (< 35 lignes) motorisé par [`moteur-ui/simulateurs/scorm/scorm-app.js`](../../moteur-ui/simulateurs/scorm/scorm-app.js), avec navigation directe entre questions et mode corrigé.
3. [`Fichiers/questions_data.js`](./Fichiers/questions_data.js) : Base didactique des 8 défis couvrant l'anatomie, les glandes, les transformations et l'analyse nutritionnelle.
4. [`Fichiers/imsmanifest.xml`](./Fichiers/imsmanifest.xml) : Manifeste officiel SCORM 1.2 conforme Moodle.
5. [`Fichiers/scorm.zip`](./Fichiers/scorm.zip) : Archive ZIP prête à l'emploi pour import dans Moodle.
6. Serveur local HTTP actif : **[http://localhost:8080/Exemples/01_Corrige_Interactif_SCORM/Fichiers/simulateur.html](http://localhost:8080/Exemples/01_Corrige_Interactif_SCORM/Fichiers/simulateur.html)**.
