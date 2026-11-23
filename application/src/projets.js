/**
 * Fichiers projet — étiquette commune à tous les types et reconnaissance d'un
 * fichier choisi avec « Ouvrir un fichier projet ».
 *
 * Format d'un projet enregistré :
 * { application: "moodle-ai", type: "video-h5p", version: 1, titre, etape,
 *   enregistreLe, projet: { ...contenu propre au type } }
 *
 * Les fichiers sans étiquette sont reconnus à leur structure (anciens projets
 * et livrables de l'outil actuel : questions_video.json, questions_moodle.xml,
 * questions_data.js).
 */
(function () {
  'use strict';

  const APPLICATION = 'moodle-ai';
  const VERSION = 1;

  const TYPES = {
    'video-h5p': { libelle: 'Vidéo interactive H5P', suffixe: 'vidéo interactive H5P', disponible: true },
    'moodle-xml': { libelle: 'Banque de questions Moodle XML', suffixe: 'banque Moodle XML', disponible: true },
    'scorm-corrige': { libelle: 'Activité interactive SCORM', suffixe: 'activité interactive SCORM', disponible: true },
    'scorm-comprehension': { libelle: 'Exercice de compréhension SCORM', suffixe: 'compréhension SCORM', disponible: true },
    'scorm-hattie': { libelle: 'Compréhension en deux pages (Hattie)', suffixe: 'compréhension Hattie', disponible: true },
    'examen': { libelle: 'Version ou corrigé d\'un examen', suffixe: 'examen', disponible: true }
  };

  function emballer(type, titre, etape, projet) {
    return {
      application: APPLICATION,
      type: type,
      version: VERSION,
      titre: titre || '',
      etape: etape || 1,
      enregistreLe: new Date().toISOString(),
      projet: projet
    };
  }

  function nomFichier(type, titre) {
    const base = String(titre || 'Projet').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || 'Projet';
    const suffixe = TYPES[type] ? TYPES[type].suffixe : type;
    return base + ' — ' + suffixe + '.json';
  }

  /**
   * Lit mode, présentation et titre de SCORM_ACTIVITY_CONFIG dans un questions_data.js.
   * Champ par champ : certains fichiers ne sont pas en JSON strict (clés sans guillemets).
   */
  function configScorm(texte) {
    const m = texte.match(/window\.SCORM_ACTIVITY_CONFIG\s*=\s*(\{[\s\S]*?\});/);
    const bloc = m ? m[1] : texte;
    const champ = function (nom) {
      const r = bloc.match(new RegExp('["\']?' + nom + '["\']?\\s*:\\s*(["\'])((?:\\\\.|(?!\\1).)*)\\1'));
      return r ? r[2].replace(/\\(["'\\])/g, '$1') : '';
    };
    return { mode: champ('mode'), presentation: champ('presentation'), titre: champ('titre') };
  }

  /**
   * @param {string} texte Contenu du fichier.
   * @returns {{type?:string, format?:string, titre?:string, etape?:number,
   *            enregistreLe?:string, projet?:any, erreur?:string}}
   */
  function reconnaitre(texte) {
    const brut = String(texte || '').replace(/^﻿/, '').trim();
    if (!brut) return { erreur: 'Le fichier est vide.' };

    // Banque de questions Moodle XML
    if (/^<\?xml[\s\S]*?<quiz[\s>]|^<quiz[\s>]/.test(brut)) {
      // Catégorie « $course$/top/Banque_Systeme_Respiratoire » → « Banque Systeme Respiratoire »
      const categorie = (brut.match(/<question type="category">[\s\S]*?<text>([^<]*)<\/text>/) || [])[1] || '';
      const titre = categorie.split('/').filter(Boolean).pop() || '';
      return { type: 'moodle-xml', format: 'livrable', titre: /^\$|^top$/.test(titre) ? '' : titre.replace(/_/g, ' '), projet: brut };
    }

    // questions_data.js d'une activité SCORM
    if (/SCORM_ACTIVITY_CONFIG/.test(brut)) {
      const cfg = configScorm(brut);
      const type = cfg.presentation === 'deux-pages' ? 'scorm-hattie'
        : cfg.mode === 'corrige' ? 'scorm-corrige' : 'scorm-comprehension';
      return { type: type, format: 'livrable', titre: cfg.titre || '', projet: brut };
    }

    let obj;
    try {
      obj = JSON.parse(brut);
    } catch (e) {
      return { erreur: 'Ce fichier n\'est ni un projet de l\'assistant, ni un fichier reconnu (JSON, XML Moodle ou questions_data.js).' };
    }

    // Projet étiqueté
    if (obj && obj.application === APPLICATION && obj.type) {
      if (!TYPES[obj.type]) return { erreur: 'Ce projet est d\'un type inconnu (« ' + obj.type + ' »). Il provient peut-être d\'une version plus récente de l\'assistant.' };
      if (obj.version > VERSION) return { erreur: 'Ce projet a été enregistré par une version plus récente de l\'assistant. Ouvrez-le avec la dernière version de l\'application.' };
      return { type: obj.type, format: 'enveloppe', titre: obj.titre, etape: obj.etape, enregistreLe: obj.enregistreLe, projet: obj.projet };
    }

    // Ancien projet vidéo ou questions_video.json de l'outil actuel
    if (obj && obj.aiJsonInput && (obj.editorContent || obj.context)) {
      let titre = obj.context && obj.context.titre;
      try {
        const d = typeof obj.aiJsonInput === 'string' ? JSON.parse(obj.aiJsonInput) : obj.aiJsonInput;
        titre = titre || d.titre_video;
      } catch (e) { /* titre facultatif */ }
      return { type: 'video-h5p', format: 'livrable', titre: titre || '', projet: obj };
    }

    return { erreur: 'Ce fichier JSON ne correspond à aucun type de projet de l\'assistant.' };
  }

  window.MoodleAIProjets = {
    TYPES: TYPES,
    emballer: emballer,
    nomFichier: nomFichier,
    reconnaitre: reconnaitre
  };
})();
