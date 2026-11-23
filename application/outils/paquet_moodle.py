"""
Construit le paquet autonome de l'application web, à déposer dans Moodle
(ressource « Fichier » ou « Dossier ») ou sur tout autre site.

Dans le dépôt, l'application charge le moteur partagé depuis le dossier voisin
../moteur-ui/. Un zip du seul dossier application/ ne contient donc ni les styles
ni les scripts du moteur (erreurs 404). Ce script copie l'application et les
fichiers du moteur dans un même dossier, puis remplace « ../moteur-ui/ » par
« ./moteur-ui/ » dans les pages et les scripts de l'application.

Usage (à la racine du dépôt ou ailleurs) :
    python application/outils/paquet_moodle.py

Résultat : « Assistant de création de ressources Moodle.zip » à la racine du dépôt.
Dans Moodle : déposer le zip, le décompresser, puis choisir index.html comme
fichier principal.
"""
import pathlib
import zipfile

RACINE = pathlib.Path(__file__).resolve().parents[2]
APPLICATION = RACINE / 'application'
MOTEUR = RACINE / 'moteur-ui'
NOM_PAQUET = 'Assistant de création de ressources Moodle'

# Fichiers de l'application : pages et dossier src/ (sans outils ni documentation).
PAGES = ['index.html', 'apercu-video.html', 'apercu-moodle.html']
# Dossiers du moteur utilisés par l'application, copiés en entier.
DOSSIERS_MOTEUR = ['src', 'simulateurs']
EXTENSIONS_REECRITES = {'.html', '.js', '.css'}


def fichiers_application():
    for nom in PAGES:
        yield APPLICATION / nom
    for f in sorted((APPLICATION / 'src').rglob('*')):
        if f.is_file():
            yield f


def fichiers_moteur():
    for dossier in DOSSIERS_MOTEUR:
        for f in sorted((MOTEUR / dossier).rglob('*')):
            if f.is_file() and f.suffix.lower() != '.md':
                yield f


def contenu(f):
    if f.suffix.lower() in EXTENSIONS_REECRITES:
        texte = f.read_text(encoding='utf-8')
        return texte.replace('../moteur-ui/', './moteur-ui/').encode('utf-8')
    return f.read_bytes()


def construire():
    sortie = RACINE / (NOM_PAQUET + '.zip')
    with zipfile.ZipFile(sortie, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in fichiers_application():
            z.writestr(f.relative_to(APPLICATION).as_posix(), contenu(f))
        for f in fichiers_moteur():
            z.writestr('moteur-ui/' + f.relative_to(MOTEUR).as_posix(), f.read_bytes())
    # Contrôle : plus aucune référence vers l'extérieur du paquet.
    with zipfile.ZipFile(sortie) as z:
        restes = [n for n in z.namelist()
                  if not n.startswith('moteur-ui/') and n.rsplit('.', 1)[-1] in ('html', 'js', 'css')
                  and b'../moteur-ui/' in z.read(n)]
        nb = len(z.namelist())
    if restes:
        raise SystemExit('Références ../moteur-ui/ restantes : ' + ', '.join(restes))
    print('Paquet créé : ' + str(sortie) + ' (' + str(nb) + ' fichiers, ' + str(sortie.stat().st_size // 1024) + ' Ko)')


if __name__ == '__main__':
    construire()
