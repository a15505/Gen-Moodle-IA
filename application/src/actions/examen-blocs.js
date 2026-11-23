/**
 * Blocs de mise en page d'une question d'examen papier.
 *
 * L'IA décrit ce qu'elle voit sous l'énoncé de l'original, dans l'ordre, au moyen d'un petit
 * nombre de blocs composables plutôt que d'un type de question par cas de figure :
 *   - "texte"       : texte intermédiaire (consigne d'une sous-partie) ;
 *   - "zone"        : espace de réponse (forme "lignes", "cadre" ou "blanc", hauteur en lignes) ;
 *   - "elements"    : éléments a), b), c)… sur N colonnes, chacun avec sa propre zone
 *                     (forme "cadre", "lignes", "trait", "blanc" ou "aucune") et sa réponse attendue ;
 *   - "tableau"     : tableau de données ou à compléter (cellule vide = case à remplir) ;
 *   - "association" : deux colonnes à relier par un trait ou à apparier par une lettre ;
 *   - "autre"       : mise en page non prise en charge, décrite en mots (signalée à l'enseignant).
 *
 * Ce module normalise, vérifie et dessine ces blocs (copie de l'élève et corrigé). Il convertit
 * aussi les anciens champs ("espace") des projets enregistrés avant son ajout.
 */
(function () {
  'use strict';

  const LIGNE_POUCES = 0.3;
  const HAUTEUR_MAX = 30;
  const COLONNES_MAX = 4;

  /** Formes d'une zone de réponse. */
  const FORMES_ZONE = { cadre: 'Cadre', lignes: 'Lignes d\'écriture', blanc: 'Espace libre' };
  /** Formes de la zone de chaque élément a), b)… */
  const FORMES_ELEMENTS = { trait: 'Trait après l\'élément', cadre: 'Cadre par élément', lignes: 'Lignes sous l\'élément', blanc: 'Espace libre sous l\'élément', aucune: 'Aucune (réponse sur l\'énoncé)' };
  const HAUTEUR_DEFAUT = { cadre: 6, lignes: 4, blanc: 5, trait: 1, aucune: 0 };
  const HAUTEUR_DEFAUT_ELEMENT = { cadre: 7, lignes: 2, blanc: 3, trait: 1, aucune: 0 };

  const ALIAS_FORMES = {
    cadre: 'cadre', encadre: 'cadre', encadres: 'cadre', boite: 'cadre', case: 'cadre', rectangle: 'cadre', dessin: 'cadre',
    lignes: 'lignes', ligne: 'lignes', lignesdecriture: 'lignes', ligneecriture: 'lignes',
    trait: 'trait', traits: 'trait', blancsouligne: 'trait', souligne: 'trait', tiret: 'trait',
    blanc: 'blanc', libre: 'blanc', espacelibre: 'blanc', vide: 'blanc',
    aucune: 'aucune', aucun: 'aucune', enonce: 'aucune', surlenonce: 'aucune', encercler: 'aucune', none: 'aucune'
  };
  const ALIAS_BLOCS = {
    texte: 'texte', paragraphe: 'texte', consigne: 'texte',
    zone: 'zone', espace: 'zone', reponse: 'zone', zonereponse: 'zone',
    elements: 'elements', element: 'elements', items: 'elements', liste: 'elements', sousquestions: 'elements',
    tableau: 'tableau', table: 'tableau', grille: 'tableau',
    association: 'association', associer: 'association', appariement: 'association', relier: 'association', jumelage: 'association',
    autre: 'autre'
  };
  /** Énoncé qui demande un dessin : sa zone doit être un cadre, pas des lignes. */
  const VERBES_DESSIN = /(?:^|[^\p{L}])(illustr|dessin|schématis|trace[rz]?(?![\p{L}]))/iu;

  // ----------------------------------------------------------------------
  // Outils
  // ----------------------------------------------------------------------
  function texte(v) { return String(v == null ? '' : v).trim(); }
  function liste(v) { return Array.isArray(v) ? v : []; }
  function cle(v) { return texte(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, ''); }
  function entier(v, min, max) {
    const n = Math.round(Number(String(v == null ? '' : v).replace(',', '.')));
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : null;
  }
  function echapper(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }
  /** Texte de l'IA → HTML (échappé, **gras**, sauts de ligne ; LaTeX gardé pour MathJax). */
  function enrichi(t) {
    return String(t == null ? '' : t).trim().split(/\n\s*\n/).map(function (p) {
      return echapper(p.trim()).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }).join('<br><br>');
  }
  function lettre(i) { return String.fromCharCode(97 + i); }
  function lettreMaj(i) { return String.fromCharCode(65 + i); }
  function pouces(h) { return (h * LIGNE_POUCES).toFixed(2) + 'in'; }
  /** Retire un repère « a) », « 1. », « A. » au début d'un élément (le repère est automatique). */
  function sansRepere(s) { return texte(s).replace(/^\(?(?:\d{1,2}|[A-Za-z])[.)]\s+/, ''); }

  // ----------------------------------------------------------------------
  // Normalisation
  // ----------------------------------------------------------------------
  function versElement(e) {
    if (typeof e === 'string') e = { texte: e };
    e = e || {};
    return { texte: sansRepere(e.texte || e.etiquette || e.étiquette || e.libelle || e.label), attendu: texte(e.attendu || e.reponse || e.réponse) };
  }

  function versCellule(c) { return texte(c && typeof c === 'object' ? c.texte : c); }

  function versBloc(b, notes) {
    if (typeof b === 'string') b = { bloc: 'texte', texte: b };
    b = b || {};
    const sorte = ALIAS_BLOCS[cle(b.bloc || b.type || b.sorte)];
    if (!sorte) { notes.blocsInconnus = true; return b.description || b.texte ? { bloc: 'autre', description: texte(b.description || b.texte) } : null; }
    if (sorte === 'texte') return texte(b.texte) ? { bloc: 'texte', texte: texte(b.texte) } : null;
    if (sorte === 'zone') {
      let forme = ALIAS_FORMES[cle(b.forme)] || '';
      if (!forme || forme === 'aucune') { if (b.forme) notes.formes = true; if (forme === 'aucune') return null; forme = 'lignes'; }
      if (forme === 'trait') forme = 'lignes';
      const h = entier(b.hauteur != null ? b.hauteur : b.espace, 1, HAUTEUR_MAX);
      return { bloc: 'zone', forme: forme, hauteur: h || HAUTEUR_DEFAUT[forme] };
    }
    if (sorte === 'elements') {
      const elements = liste(b.elements || b.items || b.éléments).map(versElement).filter(function (e) { return e.texte || e.attendu; });
      if (!elements.length) return null;
      let forme = ALIAS_FORMES[cle(b.forme)] || '';
      if (!forme) { if (b.forme) notes.formes = true; forme = 'trait'; }
      const h = entier(b.hauteur != null ? b.hauteur : b.espace, 0, HAUTEUR_MAX);
      return {
        bloc: 'elements', forme: forme, colonnes: entier(b.colonnes, 1, COLONNES_MAX) || 1,
        hauteur: h != null && (h > 0 || forme === 'aucune') ? h : HAUTEUR_DEFAUT_ELEMENT[forme], elements: elements
      };
    }
    if (sorte === 'tableau') {
      const entetes = liste(b.entetes || b.entêtes || b.colonnes).map(versCellule);
      const lignes = liste(b.lignes || b.rangees || b.rangées).map(function (l) { return liste(l).map(versCellule); }).filter(function (l) { return l.length; });
      if (!lignes.length && !entetes.length) return null;
      return {
        bloc: 'tableau', titre: texte(b.titre), entetes: entetes, lignes: lignes,
        attendu: liste(b.attendu || b.reponses || b.réponses).map(function (l) { return liste(l).map(versCellule); })
      };
    }
    if (sorte === 'association') {
      const r = {
        bloc: 'association',
        mode: /ecri|écri|lettre/i.test(texte(b.mode)) ? 'ecrire' : 'relier',
        gauche: liste(b.gauche).map(versCellule).map(sansRepere).filter(Boolean),
        droite: liste(b.droite).map(versCellule).map(sansRepere).filter(Boolean),
        reponses: liste(b.reponses || b.réponses || b.paires).map(function (x) { return texte(x).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1); })
      };
      return r.gauche.length && r.droite.length ? r : null;
    }
    return { bloc: 'autre', description: texte(b.description || b.texte) || 'mise en page non décrite' };
  }

  /** Blocs d'une question d'un ancien projet (avant les blocs) : un seul espace de démarche. */
  function blocsAnciens(src, type) {
    const espace = entier(src.espace, 0, HAUTEUR_MAX);
    if (type === 'choix') return [];
    const h = espace == null ? (type === 'calcul' ? 5 : 4) : espace;
    return h ? [{ bloc: 'zone', forme: type === 'calcul' ? 'blanc' : 'lignes', hauteur: h }] : [];
  }

  /** Énoncé sans la liste a), b)… finale quand ces éléments sont repris dans un bloc "elements". */
  function sansListeFinale(enonce, nb) {
    const lignes = enonce.split('\n');
    let fin = lignes.length;
    while (fin > 1 && /^\s*\(?[a-z]\)\s+\S/i.test(lignes[fin - 1])) fin--;
    return lignes.length - fin === nb ? lignes.slice(0, fin).join('\n').trim() : enonce;
  }

  /**
   * @param {object} src question brute de l'IA
   * @param {object} q question en cours de normalisation (type et énoncé déjà lus) ; reçoit q.blocs
   */
  function normaliser(src, q, notes) {
    q.blocs = Array.isArray(src.blocs)
      ? src.blocs.map(function (b) { return versBloc(b, notes); }).filter(Boolean)
      : blocsAnciens(src, q.type);
    if (!Array.isArray(src.blocs) && q.type !== 'choix') notes.blocsAnciens = true;
    const el = q.blocs.filter(function (b) { return b.bloc === 'elements'; });
    if (el.length === 1) {
      const avant = q.enonce;
      q.enonce = sansListeFinale(q.enonce, el[0].elements.length);
      if (q.enonce !== avant) notes.listeRetiree = true;
    }
    return q;
  }

  /** Projet enregistré avant les blocs : conversion de "espace". */
  function completer(q) {
    if (!Array.isArray(q.blocs)) q.blocs = blocsAnciens(q, q.type);
    return q;
  }

  function notesLecture(n) {
    const notes = [];
    if (n.blocsAnciens) notes.push('Mise en page absente ("blocs") pour une ou plusieurs questions : un espace de démarche est prévu par défaut.');
    if (n.blocsInconnus) notes.push('Bloc de mise en page inconnu pour une ou plusieurs questions : il est signalé comme « autre ».');
    if (n.formes) notes.push('Forme de zone inconnue pour une ou plusieurs questions : forme par défaut appliquée.');
    if (n.listeRetiree) notes.push('Liste a), b), c)… retirée de l\'énoncé lorsqu\'elle est reprise dans les zones de réponse.');
    return notes;
  }

  // ----------------------------------------------------------------------
  // Vérification
  // ----------------------------------------------------------------------
  function casesVides(b) {
    let n = 0;
    b.lignes.forEach(function (l) { l.forEach(function (c) { if (!c) n++; }); });
    return n;
  }

  /** Les blocs donnent-ils à eux seuls la réponse attendue de la question ? */
  function donnentLaReponse(q) {
    const avecReponse = q.blocs.filter(function (b) {
      return (b.bloc === 'elements' && b.forme !== 'aucune') || b.bloc === 'association' || (b.bloc === 'tableau' && casesVides(b));
    });
    return avecReponse.length > 0 && avecReponse.every(function (b) {
      if (b.bloc === 'elements') return b.elements.every(function (e) { return e.attendu; });
      if (b.bloc === 'association') return b.reponses.length === b.gauche.length;
      return b.attendu.length > 0;
    });
  }

  /** Une place est-elle prévue pour que l'élève réponde ? */
  function offreUnePlace(q) {
    return q.blocs.some(function (b) {
      return b.bloc === 'zone' || (b.bloc === 'elements' && b.forme !== 'aucune') || b.bloc === 'association' || (b.bloc === 'tableau' && casesVides(b));
    });
  }

  function valider(q, lieu, erreurs, avertissements) {
    q.blocs.forEach(function (b, k) {
      const ou = lieu + ', bloc ' + (k + 1);
      if (b.bloc === 'association') {
        const derniere = lettreMaj(b.droite.length - 1);
        if (b.reponses.length !== b.gauche.length || b.reponses.some(function (l) { return !l || l.charCodeAt(0) - 65 >= b.droite.length; })) {
          erreurs.push({ lieu: ou, msg: 'association : "reponses" doit donner, pour chacun des ' + b.gauche.length + ' éléments de gauche, une lettre de A à ' + derniere + '.' });
        }
      } else if (b.bloc === 'tableau') {
        const largeur = b.entetes.length || (b.lignes[0] || []).length;
        if (b.lignes.some(function (l) { return l.length !== largeur; })) avertissements.push({ lieu: ou, msg: 'tableau : les rangées n\'ont pas toutes ' + largeur + ' cellules.' });
        if (casesVides(b) && !b.attendu.length) avertissements.push({ lieu: ou, msg: 'tableau à compléter sans réponses ("attendu") : le corrigé ne les affichera pas.' });
      } else if (b.bloc === 'elements' && b.forme !== 'aucune' && q.type !== 'choix' && !q.reponseAttendue) {
        const manquants = b.elements.map(function (e, i) { return e.attendu ? '' : lettre(i) + ')'; }).filter(Boolean);
        if (manquants.length) avertissements.push({ lieu: ou, msg: 'réponse attendue ("attendu") manquante pour ' + manquants.join(', ') + '.' });
      } else if (b.bloc === 'autre') {
        avertissements.push({ lieu: ou, msg: 'mise en page non prise en charge, à faire à la main : ' + b.description + '.' });
      }
    });
    if (q.type !== 'choix' && VERBES_DESSIN.test(q.enonce) && !q.blocs.some(function (b) { return b.forme === 'cadre'; })) {
      avertissements.push({ lieu: lieu, msg: 'l\'énoncé demande un dessin, mais aucune zone n\'est un cadre : choisissez « Cadre » dans la colonne « Mise en page et images ».' });
    }
    if (q.type !== 'choix' && !offreUnePlace(q) && !q.ligneReponse.length) {
      avertissements.push({ lieu: lieu, msg: 'aucune place pour répondre sur la copie (l\'élève répond-il sur l\'énoncé ?).' });
    }
  }

  /** Texte des blocs visible par l'élève (recherche des mentions interdites). */
  function texteEleve(q) {
    return q.blocs.map(function (b) {
      if (b.bloc === 'texte') return b.texte;
      if (b.bloc === 'elements') return b.elements.map(function (e) { return e.texte; }).join('\n');
      if (b.bloc === 'tableau') return [b.titre].concat(b.entetes, [].concat.apply([], b.lignes)).join('\n');
      if (b.bloc === 'association') return b.gauche.concat(b.droite).join('\n');
      return '';
    }).join('\n');
  }

  // ----------------------------------------------------------------------
  // Copie de l'élève
  // ----------------------------------------------------------------------
  const CLASSE_FORME = { lignes: ' q-espace-ligne', cadre: ' q-cadre', blanc: '' };

  function zoneHtml(b) {
    return '<div class="q-espace' + CLASSE_FORME[b.forme] + '" style="min-height:' + pouces(b.hauteur) + '" aria-hidden="true"></div>';
  }

  function elementsHtml(b) {
    const colonnes = Math.max(1, Math.min(b.colonnes, b.elements.length));
    return '<div class="q-elements q-elements-' + b.forme + '" style="grid-template-columns:repeat(' + colonnes + ', minmax(0, 1fr))">' +
      b.elements.map(function (e, i) {
        const nom = '<span class="q-lettre">' + lettre(i) + ')</span> <span class="q-element-nom">' + enrichi(e.texte) + '</span>';
        if (b.forme === 'cadre') return '<div class="q-element q-element-cadre" style="min-height:' + pouces(b.hauteur) + '">' + nom + '</div>';
        if (b.forme === 'trait') return '<div class="q-element q-element-trait">' + nom + '<span class="trait trait-fluide" aria-hidden="true"></span></div>';
        if (b.forme === 'aucune' || !b.hauteur) return '<div class="q-element">' + nom + '</div>';
        return '<div class="q-element q-element-bloc">' + nom + zoneHtml({ forme: b.forme, hauteur: b.hauteur }) + '</div>';
      }).join('') + '</div>';
  }

  function tableauHtml(b, avecReponses) {
    const corps = b.lignes.map(function (l, r) {
      return '<tr>' + l.map(function (c, k) {
        if (c) return '<td>' + enrichi(c) + '</td>';
        const rep = avecReponses ? ((b.attendu[r] || [])[k] || '') : '';
        return '<td class="q-case">' + (rep ? '<strong class="attendu">' + enrichi(rep) + '</strong>' : '') + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<table class="q-tableau">' + (b.titre ? '<caption>' + enrichi(b.titre) + '</caption>' : '') +
      (b.entetes.length ? '<thead><tr>' + b.entetes.map(function (h) { return '<th scope="col">' + enrichi(h) + '</th>'; }).join('') + '</tr></thead>' : '') +
      '<tbody>' + corps + '</tbody></table>';
  }

  function associationHtml(b) {
    const relier = b.mode === 'relier';
    const gauche = b.gauche.map(function (g, i) {
      return '<li>' + (relier ? '' : '<span class="trait trait-lettre" aria-hidden="true"></span>') +
        '<span class="q-lettre">' + (i + 1) + '.</span> <span class="q-assoc-texte">' + enrichi(g) + '</span>' +
        (relier ? '<span class="q-point" aria-hidden="true"></span>' : '') + '</li>';
    }).join('');
    const droite = b.droite.map(function (dr, k) {
      return '<li>' + (relier ? '<span class="q-point" aria-hidden="true"></span>' : '') +
        '<span class="q-lettre">' + lettreMaj(k) + '.</span> <span class="q-assoc-texte">' + enrichi(dr) + '</span></li>';
    }).join('');
    return '<div class="q-assoc' + (relier ? ' q-assoc-relier' : '') + '"><ol class="q-assoc-gauche">' + gauche + '</ol><ol class="q-assoc-droite">' + droite + '</ol></div>';
  }

  /** Blocs de la copie de l'élève, dans l'ordre. */
  function copieHtml(q) {
    return q.blocs.map(function (b) {
      if (b.bloc === 'texte') return '<p class="q-texte">' + enrichi(b.texte) + '</p>';
      if (b.bloc === 'zone') return zoneHtml(b);
      if (b.bloc === 'elements') return elementsHtml(b);
      if (b.bloc === 'tableau') return tableauHtml(b, false);
      if (b.bloc === 'association') return associationHtml(b);
      return '<p class="q-autre ecran-seulement">Mise en page à faire à la main : ' + echapper(b.description) + '</p>';
    }).join('');
  }

  // ----------------------------------------------------------------------
  // Corrigé
  // ----------------------------------------------------------------------
  function paires(b) {
    return b.gauche.map(function (g, i) {
      const l = b.reponses[i] || '';
      const k = l ? l.charCodeAt(0) - 65 : -1;
      return { numero: i + 1, gauche: g, lettre: l || '—', droite: k >= 0 && b.droite[k] ? b.droite[k] : '' };
    });
  }

  /** Réponses attendues des blocs, pour le bandeau « Sur la copie élève ». */
  function corrigeHtml(q) {
    return q.blocs.map(function (b) {
      if (b.bloc === 'elements' && b.forme !== 'aucune' && b.elements.some(function (e) { return e.attendu; })) {
        return '<ol class="corrige-elements">' + b.elements.map(function (e, i) {
          return '<li><span class="q-lettre">' + lettre(i) + ')</span> <span>' + (e.texte ? enrichi(e.texte) + ' : ' : '') +
            '<strong class="attendu">' + (e.attendu ? enrichi(e.attendu) : '—') + '</strong></span></li>';
        }).join('') + '</ol>';
      }
      if (b.bloc === 'association') {
        return '<ol class="corrige-elements">' + paires(b).map(function (p) {
          return '<li><span>' + p.numero + '. ' + enrichi(p.gauche) + ' → <strong class="attendu">' + echapper(p.lettre) + '</strong>' + (p.droite ? ' (' + enrichi(p.droite) + ')' : '') + '</span></li>';
        }).join('') + '</ol>';
      }
      if (b.bloc === 'tableau' && casesVides(b) && b.attendu.length) return tableauHtml(b, true);
      return '';
    }).join('');
  }

  /** Réponse attendue en une ligne, pour la grille de correction ('' si les blocs n'en donnent pas). */
  function grilleTexte(q) {
    return q.blocs.map(function (b) {
      if (b.bloc === 'elements' && b.forme !== 'aucune' && b.elements.some(function (e) { return e.attendu; })) {
        return b.elements.map(function (e, i) { return lettre(i) + ') ' + (e.attendu || '—'); }).join(' ; ');
      }
      if (b.bloc === 'association') return paires(b).map(function (p) { return p.numero + ' → ' + p.lettre; }).join(' ; ');
      if (b.bloc === 'tableau' && casesVides(b) && b.attendu.length) return 'voir le tableau';
      return '';
    }).filter(Boolean).join(' ; ');
  }

  // ----------------------------------------------------------------------
  // Consigne pour l'IA
  // ----------------------------------------------------------------------
  function regles(numero) {
    return [
      numero + '. "blocs" : décris, dans l\'ordre où ils apparaissent sous l\'énoncé de l\'original, ce que l\'élève voit et l\'endroit où il répond. La nouvelle copie doit garder la même mise en page : pas à l\'identique, mais de façon cohérente (mêmes cadres, mêmes traits, mêmes colonnes, mêmes tableaux). Observe attentivement chaque page de l\'original avant de choisir. Blocs possibles :',
      '   - { "bloc": "zone", "forme": "cadre" | "lignes" | "blanc", "hauteur": n } : un espace de réponse. "cadre" si l\'original offre un rectangle (pour dessiner, illustrer ou poser une démarche), "lignes" pour des lignes d\'écriture, "blanc" pour un espace libre sans cadre ni lignes. "hauteur" en lignes d\'écriture (environ 0,3 pouce chacune), d\'après l\'original.',
      '   - { "bloc": "elements", "forme": ..., "colonnes": n, "hauteur": n, "elements": [{ "texte": "...", "attendu": "..." }] } : des éléments a), b), c)… qui ont chacun leur propre place de réponse. "forme" : "trait" (un trait après l\'élément, sur la même ligne, ex. « a) Sodium ____ »), "cadre" (un rectangle par élément, le nom de l\'élément dans le coin), "lignes" ou "blanc" (un espace sous chaque élément) ou "aucune" (simple liste, l\'élève répond sur l\'énoncé). "colonnes" : le nombre d\'éléments côte à côte sur une rangée dans l\'original (1 à ' + COLONNES_MAX + '). "hauteur" : la hauteur de la place de chaque élément (ignorée pour "trait"). "texte" : l\'élément, sans sa lettre (elle est automatique). "attendu" : la réponse exacte de cet élément (pour un dessin, une description précise du dessin attendu). Ne répète pas ces éléments dans "enonce".',
      '   - { "bloc": "tableau", "titre": "...", "entetes": ["...", "..."], "lignes": [["...", ""], ["...", ""]], "attendu": [["", "..."], ["", "..."]] } : un tableau, de données ou à compléter. Une cellule vide ("") est une case que l\'élève remplit ; "attendu" a la même forme que "lignes" et donne la réponse de chaque case vide. Un tableau de données (ex. : une liste de formules et de noms) est toujours un bloc "tableau", jamais une image.',
      '   - { "bloc": "association", "mode": "relier" | "ecrire", "gauche": ["..."], "droite": ["..."], "reponses": ["B", "A", ...] } : deux colonnes à associer. "relier" si l\'élève trace un trait, "ecrire" s\'il écrit une lettre devant chaque élément de gauche. "reponses" donne, pour chaque élément de gauche, dans l\'ordre, la lettre (A, B, C…) de l\'élément de droite associé. Dans une nouvelle version, change l\'ordre de la colonne de droite et recalcule "reponses".',
      '   - { "bloc": "texte", "texte": "..." } : un texte placé entre deux blocs (ex. : la consigne d\'une sous-partie).',
      '   - { "bloc": "autre", "description": "..." } : seulement si aucun bloc ne convient (ex. : une ligne du temps, un graphique à tracer) ; décris la mise en page en une phrase, l\'enseignant la fera à la main.',
      '   Règles des blocs : une question qui demande d\'illustrer, de dessiner, de schématiser ou de tracer a toujours un "cadre", jamais des "lignes". Si l\'élève répond directement sur l\'énoncé (encercler, souligner, cocher), "blocs" ne contient aucune zone. Un choix de réponse n\'a en général aucun bloc. Les lignes de réponse finales « Réponse : ____ » vont dans "ligne_reponse", pas dans "blocs".'
    ];
  }

  // ----------------------------------------------------------------------
  // Styles
  // ----------------------------------------------------------------------
  const CSS = [
    '.q-texte { margin: 0.04in 0; }',
    '.q-cadre { border: 1px solid var(--trait); }',
    '.q-elements { display: grid; gap: 0.1in 0.3in; margin: 0.02in 0 0.06in 0.25in; }',
    '.q-elements-cadre { gap: 0.18in 0.35in; }',
    '.q-element { min-width: 0; }',
    '.q-element-cadre { border: 1px solid var(--trait); padding: 0.04in 0.1in; }',
    '.q-element-trait { display: flex; align-items: baseline; }',
    '.q-element-trait .trait-fluide { flex: 1 1 auto; min-width: 0.6in; margin-right: 0; }',
    '.q-element-bloc { display: flex; flex-direction: column; }',
    '.q-element-bloc .q-espace { margin-top: 0.03in; }',
    '.q-tableau { border-collapse: collapse; margin: 0.06in auto; font-size: 10pt; }',
    '.q-tableau caption { font-weight: 700; margin-bottom: 0.04in; }',
    '.q-tableau th, .q-tableau td { border: 1px solid var(--trait); padding: 0.02in 0.08in; text-align: center; vertical-align: middle; }',
    '.q-tableau th { font-size: 9pt; }',
    '.q-tableau .q-case { min-width: 1in; height: ' + (LIGNE_POUCES * 1.3).toFixed(2) + 'in; }',
    '.q-assoc { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 0.5in; margin: 0.04in 0 0.06in 0.25in; }',
    '.q-assoc-relier { gap: 0 1.3in; }',
    '.q-assoc ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.14in; align-content: start; }',
    '.q-assoc li { display: flex; align-items: baseline; gap: 0.3em; }',
    '.q-assoc-relier .q-assoc-gauche .q-assoc-texte { flex: 1 1 auto; }',
    '.q-point { display: inline-block; width: 0.08in; height: 0.08in; border-radius: 50%; background: var(--trait); flex: none; align-self: center; }',
    '.trait-lettre { width: 0.45in; margin: 0 0.3em 0 0; flex: none; }',
    '.q-autre { border: 1px dashed #b45309; color: #78350f; background: #fffbeb; padding: 0.08in 0.12in; font-size: 10pt; margin: 0.04in 0 0.08in; }',
    '.corrige-elements { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.02in 0.2in; }',
    '.corrige-elements li { display: flex; gap: 0.3em; }',
    '.sur-la-copie .q-tableau { margin: 0.02in 0; font-size: 8.5pt; color: var(--encre); background: #ffffff; }'
  ];

  window.MoodleAIExamenBlocs = {
    LIGNE_POUCES: LIGNE_POUCES,
    HAUTEUR_MAX: HAUTEUR_MAX,
    COLONNES_MAX: COLONNES_MAX,
    FORMES_ZONE: FORMES_ZONE,
    FORMES_ELEMENTS: FORMES_ELEMENTS,
    normaliser: normaliser,
    completer: completer,
    notesLecture: notesLecture,
    valider: valider,
    donnentLaReponse: donnentLaReponse,
    texteEleve: texteEleve,
    copieHtml: copieHtml,
    corrigeHtml: corrigeHtml,
    grilleTexte: grilleTexte,
    regles: regles,
    CSS: CSS
  };
})();
