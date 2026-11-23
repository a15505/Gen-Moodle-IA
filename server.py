import base64
import http.server
import json
import os
import re
import subprocess
import sys
import zipfile
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TAILLE_MAX_AUDIO = 20 * 1024 * 1024  # environ 40 min de narration à 64 kbps
DEMANDE_IMAGE = 'demande_image.json'
# Images matricielles seulement : une proposition SVG n'est jamais présentée
PROPOSITIONS_IMAGE = {
    'proposition_image.png': ('image/png', b'\x89PNG\r\n\x1a\n'),
    'proposition_image.jpg': ('image/jpeg', b'\xff\xd8\xff'),
    'proposition_image.jpeg': ('image/jpeg', b'\xff\xd8\xff'),
}

def dossier_simulateur(chemin):
    """Résout le dossier d'un simulateur et refuse tout ce qui en sort."""
    dossier = os.path.normpath(os.path.join(BASE_DIR, chemin.replace('\\', '/').lstrip('/')))
    if os.path.commonpath([BASE_DIR, dossier]) != BASE_DIR or not os.path.isfile(os.path.join(dossier, 'simulateur.html')):
        raise ValueError('Dossier de simulateur invalide')
    return dossier

def lire_proposition_image(dossier):
    """Retourne la proposition de l'agent en URL de données, ou None si elle est absente ou invalide."""
    for nom, (mime, signature) in PROPOSITIONS_IMAGE.items():
        chemin = os.path.join(dossier, nom)
        if os.path.isfile(chemin):
            with open(chemin, 'rb') as f:
                contenu = f.read()
            if contenu.startswith(signature):
                return f'data:{mime};base64,' + base64.b64encode(contenu).decode('ascii')
    return None

def retirer_demande_image(dossier):
    for nom in (DEMANDE_IMAGE, *PROPOSITIONS_IMAGE):
        chemin = os.path.join(dossier, nom)
        if os.path.isfile(chemin):
            os.remove(chemin)

def ouvrir_dossier(chemin):
    if os.name == 'nt':
        # /n force une nouvelle fenêtre : os.startfile réutilise une fenêtre déjà ouverte sans la montrer
        subprocess.Popen(['explorer', '/n,', chemin])
    else:
        subprocess.run(['open' if sys.platform == 'darwin' else 'xdg-open', chemin], check=True)

class LocalUXHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def repondre_json(self, statut, donnees):
        self.send_response(statut)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(donnees, ensure_ascii=False).encode('utf-8'))

    def traiter_image(self, action):
        # Le navigateur dépose la demande et l'agent y répond par un fichier dans le même dossier
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            self.repondre_json(403, {'status': 'error', 'message': 'Requête locale seulement'})
            return
        try:
            payload = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))).decode('utf-8'))
            dossier = dossier_simulateur(payload.get('dossier', ''))
        except ValueError as e:
            self.repondre_json(403, {'status': 'error', 'message': str(e)})
            return

        chemin_demande = os.path.join(dossier, DEMANDE_IMAGE)
        if action == 'demander':
            retirer_demande_image(dossier)
            demande = {cle: payload.get(cle) for cle in ('question_id', 'question', 'prompt', 'largeur', 'hauteur')}
            demande['sortie'] = 'proposition_image.png'
            with open(chemin_demande, 'w', encoding='utf-8') as f:
                json.dump(demande, f, ensure_ascii=False, indent=2)
            self.repondre_json(200, {'status': 'ok', 'demande': demande, 'proposition': None})
        elif action == 'etat':
            demande = None
            if os.path.isfile(chemin_demande):
                with open(chemin_demande, 'r', encoding='utf-8') as f:
                    demande = json.load(f)
            proposition = lire_proposition_image(dossier) if demande else None
            self.repondre_json(200, {'status': 'ok', 'demande': demande, 'proposition': proposition})
        elif action == 'retirer':
            retirer_demande_image(dossier)
            self.repondre_json(200, {'status': 'ok'})
        else:
            self.repondre_json(404, {'status': 'error', 'message': 'Action inconnue'})

    def enregistrer_audio(self):
        """Mode narration du simulateur : écrit le MP3 reçu dans <dossier>/src/audio/<nom>.mp3."""
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            self.repondre_json(403, {'status': 'error', 'message': 'Requête locale seulement'})
            return
        params = parse_qs(urlparse(self.path).query)
        nom = (params.get('nom') or [''])[0]
        try:
            dossier = dossier_simulateur((params.get('dossier') or [''])[0])
        except ValueError as e:
            self.repondre_json(403, {'status': 'error', 'message': str(e)})
            return
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,40}\.mp3', nom):
            self.repondre_json(400, {'status': 'error', 'message': 'Nom de fichier audio invalide'})
            return
        taille = int(self.headers.get('Content-Length', 0))
        if not 0 < taille <= TAILLE_MAX_AUDIO:
            self.repondre_json(413, {'status': 'error', 'message': 'Fichier audio vide ou trop volumineux'})
            return
        contenu = self.rfile.read(taille)
        # Signature MP3 : balise ID3 ou trame MPEG (11 bits de synchronisation)
        if not (contenu.startswith(b'ID3') or (contenu[0] == 0xFF and contenu[1] & 0xE0 == 0xE0)):
            self.repondre_json(400, {'status': 'error', 'message': 'Le fichier reçu n\'est pas un MP3'})
            return
        dossier_audio = os.path.join(dossier, 'src', 'audio')
        os.makedirs(dossier_audio, exist_ok=True)
        with open(os.path.join(dossier_audio, nom), 'wb') as f:
            f.write(contenu)
        self.repondre_json(200, {'status': 'ok', 'fichier': 'src/audio/' + nom, 'octets': taille})

    def reconstruire_package(self):
        """« Exporter le package » du simulateur SCORM : refait le .zip avec les fichiers actuels
        (ex. narrations enregistrées), selon les mêmes règles que create_scorm_activity.py."""
        if self.client_address[0] not in ('127.0.0.1', '::1'):
            self.repondre_json(403, {'status': 'error', 'message': 'Requête locale seulement'})
            return
        try:
            dossier = dossier_simulateur((parse_qs(urlparse(self.path).query).get('dossier') or [''])[0])
            with open(os.path.join(dossier, 'questions_data.js'), encoding='utf-8') as f:
                bloc = re.search(r'window\.SCORM_ACTIVITY_CONFIG\s*=\s*(\{[\s\S]*?\});', f.read())
            config = json.loads(bloc.group(1)) if bloc else {}
        except (ValueError, OSError) as e:
            self.repondre_json(400, {'status': 'error', 'message': str(e)})
            return
        nom_zip = config.get('zipFilename') or f"{config.get('titre', 'Activité SCORM')}.zip"
        nom_zip = re.sub(r'[/\\?%*:|"<>]', '-', nom_zip)
        chemin_zip = os.path.join(dossier, nom_zip)
        with zipfile.ZipFile(chemin_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
            for racine, _, fichiers in os.walk(dossier):
                for nom in sorted(fichiers):
                    chemin = os.path.join(racine, nom)
                    relatif = os.path.relpath(chemin, dossier).replace('\\', '/')
                    if relatif.lower().endswith('.zip') or relatif == 'simulateur.html':
                        continue
                    zf.write(chemin, relatif)
        self.repondre_json(200, {'status': 'ok', 'zip': nom_zip})

    def do_POST(self):
        if self.path.startswith('/api/save_audio'):
            self.enregistrer_audio()
        elif self.path.startswith('/api/reconstruire_package'):
            self.reconstruire_package()
        elif self.path.startswith('/api/image/'):
            self.traiter_image(self.path[len('/api/image/'):])
        elif self.path == '/api/save_json':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                try:
                    text_data = post_data.decode('utf-8')
                except UnicodeDecodeError:
                    text_data = post_data.decode('latin-1')
                payload = json.loads(text_data)
                rel_path = payload.get('path', '').replace('\\', '/').lstrip('/')
                content = payload.get('content', '')
                if isinstance(content, (dict, list)):
                    content = json.dumps(content, ensure_ascii=False, indent=2)

                # Vérifier que le chemin cible reste dans BASE_DIR
                target_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))
                if not target_path.startswith(BASE_DIR):
                    self.send_response(403)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'error', 'message': 'Chemin interdit'}).encode('utf-8'))
                    return

                # Écraser le fichier principal
                with open(target_path, 'w', encoding='utf-8') as f:
                    f.write(content)

                # Écraser également le fichier XML associé si fourni
                xml_path = payload.get('xml_path')
                xml_content = payload.get('xml_content')
                if xml_path and xml_content:
                    target_xml = os.path.normpath(os.path.join(BASE_DIR, xml_path.replace('\\', '/').lstrip('/')))
                    if target_xml.startswith(BASE_DIR):
                        with open(target_xml, 'w', encoding='utf-8') as f:
                            f.write(xml_content)

                # Écraser / synchroniser également dans simulateur.html si présent dans le même dossier
                folder = os.path.dirname(target_path)
                sim_path = os.path.join(folder, 'simulateur.html')
                if os.path.exists(sim_path):
                    with open(sim_path, 'r', encoding='utf-8') as f:
                        sim_content = f.read()

                    # 1) Cas vidéo interactive : const defaultVideoConfig = { ... };
                    if 'defaultVideoConfig' in sim_content and isinstance(payload.get('content'), (dict, list)):
                        sim_content = re.sub(r'(const\s+defaultVideoConfig\s*=\s*)(\{[\s\S]*?\})(\s*;)',
                                             lambda m: m.group(1) + content + m.group(3), sim_content, count=1)

                    # 2) Cas banque Moodle : const quizData = [ ... ];
                    json_data = payload.get('json_content') or (payload.get('content') if isinstance(payload.get('content'), (dict, list)) else None)
                    if json_data:
                        json_str = json.dumps(json_data, ensure_ascii=False, indent=2) if not isinstance(json_data, str) else json_data
                        sim_content = re.sub(r'(const\s+quizData\s*=\s*)(\[[\s\S]*?\])(\s*;)',
                                             lambda m: m.group(1) + json_str + m.group(3), sim_content, count=1)

                    with open(sim_path, 'w', encoding='utf-8') as f:
                        f.write(sim_content)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok', 'saved': rel_path}).encode('utf-8'))
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        elif self.path == '/api/ouvrir_originaux':
            # Dossier fixe et requête locale seulement : le poste distant ne peut rien ouvrir
            if self.client_address[0] not in ('127.0.0.1', '::1'):
                self.send_response(403)
                self.end_headers()
                return
            try:
                ouvrir_dossier(os.path.join(BASE_DIR, 'Originaux_a_analyser'))
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    # ThreadingHTTPServer pour ne jamais bloquer le navigateur sur les requêtes parallèles
    ServerClass = getattr(http.server, 'ThreadingHTTPServer', http.server.HTTPServer)
    server = ServerClass(('0.0.0.0', port), LocalUXHandler)
    server.daemon_threads = True
    print(f"Serveur MOODLE_AI local multi-thread prêt sur http://localhost:{port} (répertoire: {BASE_DIR})", flush=True)
    server.serve_forever()
