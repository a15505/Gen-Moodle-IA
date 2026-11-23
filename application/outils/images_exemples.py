"""
Régénère les images des projets d'exemple de l'application à partir des images
créées dans ../Exemples/.

Les images sont intégrées en data: (base64) dans src/exemples/images-exemples.js,
pour que les exemples fonctionnent aussi en ouverture locale (file:///).
Elles ne sont pas écrites dans la réponse de l'IA : chaque exemple associe une
image à une question qui demande un schéma ("figure"), et l'assistant la pose
par sa méthode d'ajout habituelle (taille ramenée, description reprise de "figure").

Usage (à la racine du dépôt ou ailleurs) :
    python application/outils/images_exemples.py
"""
import base64
import pathlib

RACINE = pathlib.Path(__file__).resolve().parents[2]
SORTIE = RACINE / 'application' / 'src' / 'exemples' / 'images-exemples.js'

# Clé utilisée par les exemples → fichier sous Exemples/.
IMAGES = {
    '02/schema_anatomie': 'Exemples/02_Comprehension_Lecture_SCORM/Fichiers/src/images/schema_anatomie.png',
    '02/schema_aliments_nutriments': 'Exemples/02_Comprehension_Lecture_SCORM/Fichiers/src/images/schema_aliments_nutriments.png',
    '02/schema_valeur_energetique': 'Exemples/02_Comprehension_Lecture_SCORM/Fichiers/src/images/schema_valeur_energetique.png',
    '02/schema_valeur_nutritive': 'Exemples/02_Comprehension_Lecture_SCORM/Fichiers/src/images/schema_valeur_nutritive.png',
    # Compréhension en deux pages (Hattie) : schémas SVG des présentations (convertis en PNG à l'ajout).
    '07/p1_solution': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p1_solution.svg',
    '07/p2_grammes_par_litre': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p2_grammes_par_litre.svg',
    '07/p3_millilitres_litres': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p3_millilitres_litres.svg',
    '07/p4_grammes_kilogrammes': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p4_grammes_kilogrammes.svg',
    '07/p5_comparer': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p5_comparer.svg',
    '07/p6_dilution': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p6_dilution.svg',
    '07/p7_analyse_erreur': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p7_analyse_erreur.svg',
    '07/p8_preparer': 'Exemples/07_Comprehension_Hattie_SCORM/Fichiers/src/images/p8_preparer.svg',
}


def type_mime(octets):
    """Type réel du fichier (certains .png des exemples sont des JPEG)."""
    if octets.startswith(b'\x89PNG'):
        return 'image/png'
    if octets.startswith(b'\xff\xd8'):
        return 'image/jpeg'
    if b'<svg' in octets[:600]:
        return 'image/svg+xml'
    raise ValueError('format d\'image non pris en charge (PNG, JPEG ou SVG seulement)')


def main():
    lignes = [
        '/**',
        ' * Images des projets d\'exemple, reprises de ../Exemples/ (fichier généré par',
        ' * outils/images_exemples.py : ne pas modifier à la main).',
        ' * Les exemples les posent sur leurs questions par la méthode d\'ajout de l\'assistant.',
        ' */',
        'window.MoodleAIExemplesImages = {',
    ]
    entrees = []
    for cle, chemin in IMAGES.items():
        octets = (RACINE / chemin).read_bytes()
        url = 'data:' + type_mime(octets) + ';base64,' + base64.b64encode(octets).decode('ascii')
        entrees.append('  // ' + chemin + '\n  "' + cle + '": "' + url + '"')
        print('ok', cle, len(octets), 'octets')
    lignes.append(',\n'.join(entrees))
    lignes.append('};')
    SORTIE.write_text('\n'.join(lignes) + '\n', encoding='utf-8', newline='\r\n')
    print('écrit :', SORTIE.relative_to(RACINE))


if __name__ == '__main__':
    main()
