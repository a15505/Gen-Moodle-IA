#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
create_scorm_activity.py — Déploie une activité SCORM à partir de questions_data.js
Usage: python create_scorm_activity.py <dossier_sortie> <chemin_questions_data.js>
"""

import sys
import os
import shutil
import re
import json
import zipfile
from pathlib import Path

# Console Windows (cp1252) : les symboles ✓ et ✅ faisaient planter le script sans PYTHONIOENCODING
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent.parent  # .agents/skills/assistant_scorm/resources -> MOODLE_AI

MOTEUR_UI_SRC = PROJECT_ROOT / 'moteur-ui' / 'src'
MOTEUR_UI_SCORM = PROJECT_ROOT / 'moteur-ui' / 'simulateurs' / 'scorm'
RESOURCES_DIR = SCRIPT_DIR

def extract_config(questions_data_path):
    """Extrait SCORM_ACTIVITY_CONFIG depuis questions_data.js"""
    content = Path(questions_data_path).read_text(encoding='utf-8')
    match = re.search(r'window\.SCORM_ACTIVITY_CONFIG\s*=\s*(\{[\s\S]*?\});', content)
    if not match:
        match = re.search(r'window\.SCORM_ACTIVITY_CONFIG\s*=\s*(\{[^}]+\})', content)
    if not match:
        raise ValueError("SCORM_ACTIVITY_CONFIG non trouvé dans questions_data.js")
    
    config_str = match.group(1)
    # Configuration déjà en JSON strict (clés entre guillemets) : aucune transformation,
    # sinon les apostrophes des textes (« l'eau ») seraient prises pour des délimiteurs.
    try:
        return json.loads(config_str)
    except json.JSONDecodeError:
        pass
    # Nettoyage pour conversion JSON valide
    config_str = re.sub(r'//.*', '', config_str)
    config_str = re.sub(r'/\*[\s\S]*?\*/', '', config_str)
    # Remplace les clés non quotées par des clés quotées
    config_str = re.sub(r'(?<=[{,\s])([a-zA-Z0-9_]+)\s*:', r'"\1":', config_str)
    # Remplace les guillemets simples par des doubles
    config_str = re.sub(r"'([^']*)'", r'"\1"', config_str)
    # Supprime trailing commas
    config_str = re.sub(r',\s*([}\]])', r'\1', config_str)
    return json.loads(config_str)

def deploy(output_dir, questions_data_path):
    out = Path(output_dir).resolve()
    src = out / 'src'
    src.mkdir(parents=True, exist_ok=True)
    (src / 'images').mkdir(exist_ok=True)

    # 1. Extraire la config
    config = extract_config(questions_data_path)
    titre = config.get('titre', 'Activité SCORM')
    total_points = config.get('totalPoints', 0)
    zip_filename = config.get('zipFilename', f"{titre}.zip")

    print(f"Déploiement SCORM : {titre}")
    print(f"Points totaux      : {total_points}")
    print(f"Nom de l'archive   : {zip_filename}")
    print(f"Dossier de sortie  : {out}")

    # 2. Copier les CSS depuis moteur-ui/src
    for css_file in ['style.css', 'tokens.css', 'print.css']:
        src_file = MOTEUR_UI_SRC / css_file
        if src_file.exists():
            shutil.copy2(src_file, src / css_file)
            print(f"  ✓ CSS : {css_file}")

    # 3. Copier scorm_api.js et mathjax.js
    # scorm_api.js et la coquille index_scorm_shell.html sont partagés avec l'application web
    # (moteur-ui/simulateurs/scorm/), qui construit le même package dans le navigateur.
    for js_file in ['scorm_api.js', 'mathjax.js']:
        src_file = MOTEUR_UI_SCORM / js_file
        if not src_file.exists():
            src_file = MOTEUR_UI_SRC / js_file
        if src_file.exists():
            shutil.copy2(src_file, src / js_file)
            print(f"  ✓ JS  : {js_file}")

    # 4. Copier scorm_runtime.js depuis moteur-ui/simulateurs/scorm/
    runtime_src = MOTEUR_UI_SCORM / 'scorm_runtime.js'
    if runtime_src.exists():
        shutil.copy2(runtime_src, src / 'scorm_runtime.js')
        print(f"  ✓ JS  : scorm_runtime.js")
    else:
        print(f"  ⚠ scorm_runtime.js introuvable dans {runtime_src}")

    # 5. Copier questions_data.js (si source différente de destination)
    dest_data = out / 'questions_data.js'
    if Path(questions_data_path).resolve() != dest_data.resolve():
        shutil.copy2(questions_data_path, dest_data)
    print(f"  ✓ DATA: questions_data.js")

    # 6. Générer index.html
    shell_path = MOTEUR_UI_SCORM / 'index_scorm_shell.html'
    shell = shell_path.read_text(encoding='utf-8')
    shell = shell.replace('{{TITRE_ACTIVITE}}', titre)
    shell = shell.replace('{{TOTAL_POINTS}}', str(total_points))
    (out / 'index.html').write_text(shell, encoding='utf-8')
    print(f"  ✓ HTML: index.html")

    # 7. Calculer le chemin relatif vers moteur-ui pour simulateur.html
    try:
        rel_moteur_ui = os.path.relpath(PROJECT_ROOT / 'moteur-ui', out).replace('\\', '/')
    except ValueError:
        rel_moteur_ui = '../../../moteur-ui'

    sim_shell_path = RESOURCES_DIR / 'simulateur_scorm_shell.html'
    sim_shell = sim_shell_path.read_text(encoding='utf-8')
    sim_shell = sim_shell.replace('{{TITRE_ACTIVITE}}', titre)
    sim_shell = sim_shell.replace('{{ZIP_FILENAME}}', zip_filename)
    sim_shell = sim_shell.replace('{{MOTEUR_UI_PATH}}', rel_moteur_ui)
    (out / 'simulateur.html').write_text(sim_shell, encoding='utf-8')
    print(f"  ✓ HTML: simulateur.html (moteur-ui: {rel_moteur_ui})")

    # 8. Générer imsmanifest.xml
    manifest_id = re.sub(r'[^a-zA-Z0-9_]', '_', titre)
    manifest_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST_{manifest_id}" version="1.2"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.imsglobal.org/xsd/imsmd_rootv1p2p2 imsmd_rootv1p2p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG_{manifest_id}">
    <organization identifier="ORG_{manifest_id}">
      <title>{titre}</title>
      <item identifier="ITEM_{manifest_id}" identifierref="RES_{manifest_id}">
        <title>{titre}</title>
        <adlcp:masteryscore>60</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES_{manifest_id}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="questions_data.js"/>
      <file href="src/tokens.css"/>
      <file href="src/style.css"/>
      <file href="src/print.css"/>
      <file href="src/scorm_api.js"/>
      <file href="src/scorm_runtime.js"/>
      <file href="src/mathjax.js"/>
    </resource>
  </resources>
</manifest>
'''
    (out / 'imsmanifest.xml').write_text(manifest_content, encoding='utf-8')
    print(f"  ✓ XML : imsmanifest.xml")

    # 9. Créer le zip SCORM
    zip_path_in_out = out / zip_filename
    with zipfile.ZipFile(zip_path_in_out, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(out.rglob('*')):
            if file_path.is_file():
                rel_name = file_path.relative_to(out).as_posix()
                if rel_name.endswith('.zip') or rel_name == 'simulateur.html':
                    continue
                zf.write(file_path, rel_name)
    print(f"\n✅ Package SCORM créé dans l'activité : {zip_path_in_out}")

    try:
        rel_url = out.relative_to(PROJECT_ROOT).as_posix()
        print(f"\n🌐 Serveur local : http://localhost:8080/{rel_url}/simulateur.html")
    except Exception:
        pass

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python create_scorm_activity.py <dossier_sortie> <chemin_questions_data.js>")
        sys.exit(1)
    deploy(sys.argv[1], sys.argv[2])
