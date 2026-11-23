/**
 * Collage tolérant — lit le JSON collé depuis Gemini ou Copilot et répare
 * les défauts les plus fréquents, en signalant chaque réparation.
 *
 * Défauts traités :
 *   - balises de code Markdown (```json ... ```) et texte avant ou après le JSON ;
 *   - guillemets typographiques employés comme délimiteurs ;
 *   - virgules en trop avant } ou ] et lignes de commentaires // ;
 *   - barres obliques inverses non doublées (commandes LaTeX \dfrac, \times...),
 *     qui cassent le JSON ou deviennent des caractères de contrôle invisibles ;
 *   - retours de ligne bruts à l'intérieur d'une chaîne ;
 *   - réponse coupée (accolades non refermées), signalée clairement.
 *
 * Réutilisable par toutes les actions : MoodleAICollage.lireJson(texte).
 */
(function () {
  'use strict';

  // Commandes LaTeX qui commencent par une lettre d'échappement JSON valide
  // (\b, \f, \n, \r, \t, \u) : sans doublage, elles seraient lues en silence
  // comme des caractères de contrôle (\frac devient « saut de page » + « rac »).
  const LATEX_AMBIGU = /^(frac|dfrac|tfrac|bar|beta|binom|boxed|begin|bf|biffer|nu|neq|ne|nabla|newline|not|right|rho|rightarrow|rm|text|textbf|times|theta|tau|to|tilde|uparrow|underline|mathrm|mu)/;

  /** Parcourt le texte et corrige les échappements à l'intérieur des chaînes. */
  function reparerChaines(s) {
    let sortie = '';
    let dansChaine = false;
    let modifs = { latex: 0, retours: 0 };
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (!dansChaine) {
        if (c === '"') dansChaine = true;
        sortie += c;
        continue;
      }
      if (c === '\\') {
        const suite = s.slice(i + 1);
        const prochain = s[i + 1];
        if (prochain === '\\' || prochain === '"' || prochain === '/') {
          sortie += c + prochain;
          i++;
          continue;
        }
        if (/^u[0-9a-fA-F]{4}/.test(suite) && !/^underline/.test(suite)) {
          sortie += c;
          continue;
        }
        if (/^[bfnrt]/.test(suite) && !LATEX_AMBIGU.test(suite)) {
          sortie += c;
          continue;
        }
        // Barre oblique isolée (LaTeX ou échappement invalide) : on la double.
        sortie += '\\\\';
        modifs.latex++;
        continue;
      }
      if (c === '"') {
        dansChaine = false;
        sortie += c;
        continue;
      }
      if (c === '\n' || c === '\r') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        sortie += '\\n';
        modifs.retours++;
        continue;
      }
      if (c === '\t') {
        sortie += '\\t';
        continue;
      }
      sortie += c;
    }
    return { texte: sortie, modifs: modifs };
  }

  /** Profondeur d'imbrication restante et chaîne non refermée (réponse coupée). */
  function equilibre(s) {
    let profondeur = 0;
    let dansChaine = false;
    let echap = false;
    for (const c of s) {
      if (dansChaine) {
        if (echap) echap = false;
        else if (c === '\\') echap = true;
        else if (c === '"') dansChaine = false;
        continue;
      }
      if (c === '"') dansChaine = true;
      else if (c === '{' || c === '[') profondeur++;
      else if (c === '}' || c === ']') profondeur--;
    }
    return { profondeur: profondeur, dansChaine: dansChaine };
  }

  function essai(t) {
    try {
      return { valeur: JSON.parse(t) };
    } catch (e) {
      return { erreur: e };
    }
  }

  /**
   * @param {string} texte Réponse brute collée par l'enseignant.
   * @returns {{ok:boolean, valeur?:any, corrections:string[], erreur?:string}}
   */
  function lireJson(texte) {
    const corrections = [];
    let s = String(texte || '').replace(/^﻿/, '').trim();
    if (!s) {
      return { ok: false, corrections: corrections, erreur: 'Aucun texte n\'a été collé.' };
    }

    // 1. Balises de code Markdown
    const bloc = s.match(/```[a-zA-Z]*\s*\n?([\s\S]*?)```/);
    if (bloc) {
      s = bloc[1].trim();
      corrections.push('Les balises de code autour du JSON ont été retirées.');
    } else if (/^```/.test(s)) {
      s = s.replace(/^```[a-zA-Z]*\s*/, '');
      corrections.push('La balise de code ouvrante a été retirée.');
    }

    // 2. Texte avant ou après le JSON
    const debut = s.search(/[\[{]/);
    if (debut < 0) {
      return { ok: false, corrections: corrections, erreur: 'Le texte collé ne contient pas de JSON (aucune accolade « { » trouvée).' };
    }
    if (debut > 0) {
      s = s.slice(debut);
      corrections.push('Le texte placé avant le JSON a été retiré.');
    }
    const fin = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (fin >= 0 && fin < s.length - 1) {
      s = s.slice(0, fin + 1);
      corrections.push('Le texte placé après le JSON a été retiré.');
    }

    // 3. Guillemets typographiques employés comme délimiteurs de clés ou de valeurs
    if (/[“”„]\s*:|:\s*[“”„]|[{,]\s*[“„]/.test(s)) {
      s = s.replace(/[“”„]/g, '"');
      corrections.push('Les guillemets typographiques (“ ”) ont été remplacés par des guillemets droits.');
    }

    // 4. Commentaires // en début de ligne
    if (/^\s*\/\/.*$/m.test(s)) {
      s = s.replace(/^\s*\/\/.*$/gm, '');
      corrections.push('Les lignes de commentaires ont été retirées.');
    }

    // 5. Échappements dans les chaînes (LaTeX, retours de ligne bruts)
    const rep = reparerChaines(s);
    s = rep.texte;
    if (rep.modifs.latex) {
      corrections.push(rep.modifs.latex + ' barre(s) oblique(s) inverse(s) (notation LaTeX) ont été doublées pour être conservées.');
    }
    if (rep.modifs.retours) {
      corrections.push('Des retours de ligne à l\'intérieur des textes ont été convertis.');
    }

    // 6. Virgules en trop
    if (/,\s*[}\]]/.test(s)) {
      const sansVirgule = s.replace(/,(\s*[}\]])/g, '$1');
      if (!essai(s).valeur && essai(sansVirgule).valeur !== undefined) {
        s = sansVirgule;
        corrections.push('Les virgules en trop avant une accolade ou un crochet ont été retirées.');
      }
    }

    const r = essai(s);
    if (r.erreur) {
      const eq = equilibre(s);
      if (eq.profondeur > 0 || eq.dansChaine) {
        return {
          ok: false,
          corrections: corrections,
          tronque: true,
          erreur: 'La réponse semble coupée avant la fin : le JSON n\'est pas refermé. Demandez à l\'IA de renvoyer la réponse complète, ou de continuer là où elle s\'est arrêtée.'
        };
      }
      return {
        ok: false,
        corrections: corrections,
        erreur: 'Le JSON est mal formé et n\'a pas pu être réparé (' + r.erreur.message + ').'
      };
    }
    return { ok: true, valeur: r.valeur, corrections: corrections };
  }

  window.MoodleAICollage = { lireJson: lireJson };
})();
