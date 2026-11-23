import http.client
import os
import subprocess
import sys
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PAGE = '/assistant.html'
DELAI_MAX_SEC = 10

def statut_page(port):
    """Retourne le code HTTP de la page, ou None si rien n'écoute sur le port."""
    connexion = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
    try:
        connexion.request('GET', PAGE)
        return connexion.getresponse().status
    except OSError:
        return None
    finally:
        connexion.close()

def lancer_serveur(port):
    # Détacher le processus pour que le serveur survive à la fin de ce script
    options = {}
    if os.name == 'nt':
        options['creationflags'] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        options['start_new_session'] = True
    subprocess.Popen(
        [sys.executable, os.path.join(BASE_DIR, 'server.py'), str(port)],
        cwd=BASE_DIR,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        **options
    )

def attendre_page(port):
    limite = time.monotonic() + DELAI_MAX_SEC
    while time.monotonic() < limite:
        statut = statut_page(port)
        if statut is not None:
            return statut
        time.sleep(0.25)
    return None

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

    statut = statut_page(port)
    if statut is None:
        lancer_serveur(port)
        statut = attendre_page(port)

    if statut == 200:
        print(f"http://localhost:{port}{PAGE}")
    elif statut is None:
        print(f"Erreur : le serveur n'a pas répondu sur le port {port} après {DELAI_MAX_SEC} s.", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"Erreur : le port {port} est occupé par un autre service (HTTP {statut} sur {PAGE}).", file=sys.stderr)
        sys.exit(1)
