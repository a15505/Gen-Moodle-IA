#!/usr/bin/env python3
"""
Validateur du canevas « Compréhension en deux pages — Hattie » (questions_data.js).

Usage :
    python .agents/skills/assistant_scorm/resources/valider_questions_data.py <dossier_activite>

Vérifie les règles du canevas (CANEVAS_COMPREHENSION_HATTIE.md) sans relire les directives :
structure, barème, mots interdits, choix verbalisés et typés, explication en trois temps,
démarches en produit croisé, images présentes. Sortie courte ; code de retour 1 s'il y a une erreur.
"""
import json
import re
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TYPES_ERREUR = {'conception', 'procedure', 'strategie', 'transfert', 'execution'}
MOTS_INTERDITS = [
    (re.compile(r'\bPFEQ\b'), 'mention « PFEQ » dans une ressource élève'),
    (re.compile(r'\bD[ée]fis?\b'), 'mot « Défi » banni'),
    (re.compile(r'\bCD[123]\b'), 'compétence ministérielle (CD1, CD2, CD3)'),
    (re.compile(r'Lis attentivement', re.I), 'message générique'),
    (re.compile(r'\b[A-Za-z]\s*=\s*[A-Za-z]\s*÷\s*[A-Za-z]\b'), 'formule écrite en ligne (« C = m ÷ V »)'),
]

erreurs, avertissements = [], []


def err(lieu, msg):
    erreurs.append(f'{lieu} : {msg}')


def avert(lieu, msg):
    avertissements.append(f'{lieu} : {msg}')


def extraire(texte, nom):
    m = re.search(r'window\.' + nom + r'\s*=\s*', texte)
    if not m:
        return None
    debut = m.end()
    ouvrant = texte[debut]
    fermant = '}' if ouvrant == '{' else ']'
    prof, i, dans_chaine, echap = 0, debut, False, False
    while i < len(texte):
        c = texte[i]
        if dans_chaine:
            if echap:
                echap = False
            elif c == '\\':
                echap = True
            elif c == '"':
                dans_chaine = False
        elif c == '"':
            dans_chaine = True
        elif c == ouvrant:
            prof += 1
        elif c == fermant:
            prof -= 1
            if prof == 0:
                return json.loads(texte[debut:i + 1])
        i += 1
    return None


def textes_eleve(obj):
    """Tous les textes destinés à l'élève (on ignore chemins d'images et identifiants)."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, list):
        for v in obj:
            yield from textes_eleve(v)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k in ('image', 'id', 'erreur', 'formule', 'symbole', 'mode', 'presentation', 'zipFilename'):
                continue
            yield from textes_eleve(v)


def verifier_demarche(lieu, d):
    if not isinstance(d, dict):
        err(lieu, 'démarche absente ou mal formée')
        return
    if not d.get('formule'):
        err(lieu, 'formule originale absente (première ligne obligatoire)')
    for i, e in enumerate(d.get('etapes') or [], 1):
        le = f'{lieu}, étape {i}'
        lignes = e.get('lignes')
        if not (isinstance(lignes, list) and len(lignes) == 2 and all(isinstance(l, list) and len(l) == 2 for l in lignes)):
            err(le, '« lignes » doit contenir deux rapports [numérateur, dénominateur]')
            continue
        sym = e.get('symbole')
        if not sym or sym not in (lignes[0] + lignes[1]):
            err(le, '« symbole » (l\'inconnue) doit figurer dans « lignes »')
        elif sym not in (lignes[0][0], lignes[1][0]):
            avert(le, 'inconnue au dénominateur : le moteur n\'affichera pas la valeur encerclée qui change de côté')
        calc = e.get('calcul') or {}
        if not (calc.get('num') and calc.get('den')):
            err(le, '« calcul » doit fournir num et den')
        elif '[[' not in calc['num'] + calc['den']:
            avert(le, 'aucune unité biffée ([[unité]]) dans le calcul')
        if not e.get('resultat'):
            err(le, 'résultat encadré absent')
        if not e.get('inconnue'):
            avert(le, 'inconnue non déclarée (« Soit x … »)')
        if d.get('formule') == 'concentration' and not e.get('rapport') and 'kg' not in str(lignes) and 'mL' not in str(lignes):
            avert(le, 'formule « concentration » : ajouter "rapport": true pour la substitution dans la fraction')


def verifier_choix(lieu, choix, nb_attendu=None, verbalise=True, types=True):
    if not isinstance(choix, list) or not choix:
        err(lieu, 'aucun choix de réponse')
        return
    if nb_attendu and len(choix) != nb_attendu:
        err(lieu, f'{len(choix)} choix au lieu de {nb_attendu}')
    bons = [c for c in choix if c.get('correct')]
    if len(bons) != 1:
        err(lieu, f'{len(bons)} bonne(s) réponse(s) au lieu d\'une')
    ids = [c.get('id') for c in choix]
    if len(set(map(str, ids))) != len(ids):
        err(lieu, 'identifiants de choix en double')
    for c in choix:
        lc = f'{lieu}, choix {c.get("id")}'
        if not c.get('feedback'):
            err(lc, 'rétroaction absente')
        if verbalise and not str(c.get('text', '')).startswith('Je '):
            avert(lc, 'choix non verbalisé (« Je me dis que… »)')
        if types and not c.get('correct') and c.get('erreur') not in TYPES_ERREUR:
            err(lc, 'distracteur sans type d\'erreur valide (' + ', '.join(sorted(TYPES_ERREUR)) + ')')


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    dossier = Path(sys.argv[1])
    fichier = dossier / 'questions_data.js' if dossier.is_dir() else dossier
    dossier = fichier.parent
    texte = fichier.read_text(encoding='utf-8')
    config = extraire(texte, 'SCORM_ACTIVITY_CONFIG')
    questions = extraire(texte, 'QUESTIONS_DATA')
    if config is None or questions is None:
        print('ERREUR : SCORM_ACTIVITY_CONFIG ou QUESTIONS_DATA introuvable ou invalide (JSON strict requis).')
        return 1

    # Configuration
    if config.get('mode') != 'comprehension':
        err('config', 'mode doit être "comprehension"')
    if config.get('presentation') != 'deux-pages':
        avert('config', 'presentation attendue : "deux-pages"')
    for cle in ('titre', 'welcomeIntro'):
        if not config.get(cle):
            err('config', f'« {cle} » absent')
    if not config.get('intentions'):
        err('config', 'intentions d\'apprentissage absentes (« Ce que j\'apprends »)')
    if not config.get('criteres'):
        err('config', 'critères de réussite absents (« Je sais que j\'ai réussi quand… »)')
    total = sum(q.get('points', 0) for q in questions)
    if config.get('totalPoints') != total:
        err('config', f'totalPoints = {config.get("totalPoints")} mais la somme des stations = {total}')
    if config.get('zipFilename') and config.get('titre') and config['zipFilename'] != config['titre'] + '.zip':
        err('config', 'zipFilename doit être le titre complet suivi de .zip')
    if config.get('initialScore', 0) != 0:
        err('config', 'le score doit débuter à 0')

    for t in textes_eleve(config):
        for motif, msg in MOTS_INTERDITS:
            if motif.search(t):
                err('config', f'{msg} : « {t[:60]}… »')

    titres = set()
    for n, q in enumerate(questions, 1):
        lieu = f'{q.get("id", "station " + str(n))}'
        titre = q.get('titre', '')
        if not titre:
            err(lieu, 'titre absent')
        if re.match(r'^\s*(\d|Question\s+\d|D[ée]fi)', titre):
            err(lieu, 'titre préfixé (numéro, « Question N », « Défi ») : nommer seulement le sujet')
        if titre in titres:
            err(lieu, 'titre en double')
        titres.add(titre)
        if re.search(r'\s[A-ZÀ-Ý][a-zà-ÿ]+', titre[1:]) and not re.search(r'\s(L|g|mL|kg)\b', titre):
            avert(lieu, f'majuscule au milieu du titre (casse de phrase française) : « {titre} »')
        narration = q.get('narration')
        # Avec narration (principes de Mayer), contenu et réflexe passent dans la trame audio.
        cles = ('aRetenir', 'question', 'solution') if narration else ('contenu', 'aRetenir', 'reflexe', 'question', 'solution')
        for cle in cles:
            if not q.get(cle):
                err(lieu, f'« {cle} » absent')
        if narration is not None:
            if not isinstance(narration, list) or not all(isinstance(p, str) and p.strip() for p in narration):
                err(lieu, 'narration : liste de paragraphes non vides attendue')
            if not q.get('motsCles'):
                err(lieu, 'narration sans « motsCles » (zone de droite)')
            for m in q.get('motsCles') or []:
                if not (isinstance(m, dict) and m.get('terme') and m.get('definition')):
                    err(lieu, 'motsCles : chaque entrée demande « terme » et « definition »')
            if q.get('contenu'):
                avert(lieu, 'narration et contenu présents : le contenu écrit ne sera pas affiché (redondance)')
            if q.get('audio') and not (dossier / q['audio']).exists():
                avert(lieu, f'audio introuvable ({q["audio"]}) : la voix de synthèse de l\'appareil sera utilisée en attendant')
        elif q.get('audio'):
            err(lieu, '« audio » fourni sans « narration » (la transcription est obligatoire)')
        if q.get('image'):
            if not (dossier / q['image']).exists():
                err(lieu, f'image introuvable : {q["image"]}')
            if not q.get('imageAlt'):
                err(lieu, 'texte alternatif (imageAlt) absent')
        else:
            avert(lieu, 'aucune représentation visuelle : vérifier si la situation en requiert une')
        verifier_choix(lieu, q.get('choices'), nb_attendu=4)

        ex = q.get('explication')
        if not isinstance(ex, dict):
            err(lieu, 'explication à structurer en trois temps : savoirQue, savoirComment, savoirAvec')
        else:
            for cle in ('savoirQue', 'savoirComment', 'savoirAvec'):
                if not ex.get(cle):
                    err(lieu, f'explication : « {cle} » absent')
            if ex.get('image') and not (dossier / ex['image']).exists():
                err(lieu, f'explication : image introuvable : {ex["image"]}')
            if ex.get('image') and not ex.get('imageAlt'):
                err(lieu, 'explication : imageAlt absent')

        for cle in ('demarche', 'explicationDemarche'):
            if q.get(cle):
                verifier_demarche(f'{lieu}, {cle}', q[cle])
        if q.get('demarche') and not q.get('explicationDemarche'):
            avert(lieu, 'démarche en présentation, mais aucune explicationDemarche pour la question')

        rem = q.get('remediation')
        if not isinstance(rem, dict) or not rem.get('question'):
            err(lieu, 'remédiation absente')
        else:
            verifier_choix(f'{lieu}, remédiation', rem.get('choices'), types=False)
            if not rem.get('points'):
                avert(lieu, 'remédiation sans points de récupération')

        for t in textes_eleve(q):
            for motif, msg in MOTS_INTERDITS:
                if motif.search(t):
                    err(lieu, f'{msg} : « {t[:60]}… »')

    print(f'Canevas Hattie — {fichier} : {len(questions)} stations, {total} points')
    for e in erreurs:
        print('  ERREUR  ' + e)
    for a in avertissements:
        print('  avert.  ' + a)
    print(f'Résultat : {len(erreurs)} erreur(s), {len(avertissements)} avertissement(s).')
    return 1 if erreurs else 0


if __name__ == '__main__':
    sys.exit(main())
