# Répertoire des Exemples & Banc d'Essai Didactique

Ce répertoire regroupe un cas test et son document original authentique pour chacun des **7 types de génération** pris en charge par l'agent didactique MOODLE_AI.

---

## Sommaire des 7 types de génération

| Dossier | Type de génération | Document source original | Instruction de test |
| :--- | :--- | :--- | :--- |
| [`01_Corrige_Interactif_SCORM/`](./01_Corrige_Interactif_SCORM/) | Corrigé interactif SCORM | `Exercice_4.1_Systeme_Digestif.pdf` (ST Sec 3) | `Génère un corrigé interactif SCORM` |
| [`02_Comprehension_Lecture_SCORM/`](./02_Comprehension_Lecture_SCORM/) | Exercice de compréhension SCORM | `Lecture_4.1_Systeme_Digestif.pdf` (ST Sec 3) | `Génère un exercice de compréhension de lecture SCORM` |
| [`03_Nouvelle_Version_Examen/`](./03_Nouvelle_Version_Examen/) | Nouvelle version d'examen | `Minitest_Concentration_Sec3.pdf` (ST Sec 3) | `Génère une version de cet examen` |
| [`04_Corrige_Examen/`](./04_Corrige_Examen/) | Corrigé d'examen | `Examen_ATS_SE_408_Chimie.pdf` (ATS-SE Sec 4) | `Génère un corrigé de cet examen` |
| [`05_Video_Interactive_H5P/`](./05_Video_Interactive_H5P/) | Vidéo interactive H5P (JSON + Simulateur) | `Fiche_Video_Anatomie_Tube_Digestif.md` (Alloprof YouTube) | `Génère un fichier de questions en format JSON (vidéo interactive)` |
| [`06_Banque_Questions_Moodle_XML/`](./06_Banque_Questions_Moodle_XML/) | Banque de questions Moodle XML | `Lecture_4.3_Systeme_Respiratoire.pdf` (ST Sec 3) | `Génère une banque de questions Moodle XML` |
| [`07_Comprehension_Hattie_SCORM/`](./07_Comprehension_Hattie_SCORM/) | Exercice de compréhension en deux pages (canevas Hattie) | La concentration des solutions (ST Sec 3) | `Génère un exercice de compréhension SCORM selon le canevas Hattie` |

---

## Protocole de test séquentiel

Pour tester chaque type individuellement :
1. Copier le document original du sous-dossier vers le dossier racine d'analyse [`Originaux_a_analyser/`](../Originaux_a_analyser/).
2. Lancer la commande associée dans le chat.
3. Valider le plan didactique généré.
4. Vérifier les livrables finaux et le fonctionnement du simulateur HTML instancié depuis son gabarit validé.
