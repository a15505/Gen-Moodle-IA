# Type 5 : Questions JSON pour vidéo interactive (H5P)

- **Document source original :** [`Fiche_Video_Anatomie_Tube_Digestif.md`](./Fiche_Video_Anatomie_Tube_Digestif.md)
  - Vidéo Alloprof : https://www.youtube.com/watch?v=L5nD3HP8XBQ
- **Commande à exécuter :**
  > `Génère un fichier de questions en format JSON (vidéo interactive)`

### Livrables générés (Fichiers/)
1. [`Fichiers/questions_video.json`](./Fichiers/questions_video.json) : Fichier JSON complet H5P (questions « Pourquoi ... ? », options « Parce que ... », 4 choix, timestamps d'apparition et temps de recul adaptatif `retour_en_arriere_si_erreur_sec`).
2. [`Fichiers/simulateur.html`](./Fichiers/simulateur.html) : Simulateur vidéo officiel modulaire motorisé par [`moteur-ui/simulateurs/video/`](../../moteur-ui/simulateurs/video/) avec en-tête à 4 boutons stricts (**« Édition »**, **« Questions »**, **« Exporter H5P »**, **« Enregistrer »** avec sur-écriture locale via `server.py` et boutons `⏱️ Capturer`).
3. Serveur local HTTP multi-threadé actif : **[http://localhost:8080/Exemples/05_Video_Interactive_H5P/Fichiers/simulateur.html](http://localhost:8080/Exemples/05_Video_Interactive_H5P/Fichiers/simulateur.html)**.
