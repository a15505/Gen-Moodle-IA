/**
 * Export « page HTML » d'une vidéo interactive — page autonome pour l'élève.
 *
 * La page reprend le simulateur vidéo de moteur-ui en mode élève (sans édition,
 * sans liste des questions) ; CSS, JS et questions sont intégrés dans un seul fichier.
 *
 * Elle doit être servie par un site (Moodle, Google Sites) : ouverte par double-clic
 * (file:///), une vidéo YouTube refuse de jouer (erreur 153), faute d'adresse d'origine.
 */
(function () {
  'use strict';

  const SOURCES_CSS = [
    '../moteur-ui/src/tokens.css',
    '../moteur-ui/src/style.css',
    '../moteur-ui/simulateurs/video/video.css'
  ];
  const SOURCES_JS = [
    '../moteur-ui/simulateurs/video/video-player.js',
    '../moteur-ui/simulateurs/video/video-app.js'
  ];

  // Mode élève : aucune commande d'enseignant, aucune liste des questions.
  const CSS_ELEVE = [
    '.header-right, .brand-badge, #editModeIndicator, #unsavedBadge, #savePromptBanner,',
    '#corrigeInspectionPanel, .sim-sidebar { display: none !important; }',
    '.video-player-container { max-width: min(100%, calc((100vh - 130px) * 16 / 9)); }'
  ].join('\n');

  function lire(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' (HTTP ' + r.status + ')');
      return r.text();
    });
  }

  /** Empêche un texte de fermer prématurément la balise <script> ou <style> qui le contient. */
  function proteger(texte, balise) {
    return texte.replace(new RegExp('</' + balise, 'gi'), '<\\/' + balise);
  }

  function echapperHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /**
   * @param {object} config Format questions_video.json (context, aiJsonInput, editorContent).
   * @returns {Promise<string>} Le code de la page.
   */
  function construirePage(config) {
    return Promise.all([
      Promise.all(SOURCES_CSS.map(lire)),
      Promise.all(SOURCES_JS.map(lire))
    ]).then(function (res) {
      const css = res[0].map(function (t) {
        return t.replace(/^@import[^;]+;\s*$/gm, ''); // tokens.css est déjà intégré
      }).join('\n');
      const js = res[1].join('\n;\n');
      const titre = (config.context && config.context.titre) || 'Vidéo interactive';
      const url = (config.context && config.context.videoUrl) || '';
      const youtube = !/vimeo\.com\//i.test(url);
      const donnees = JSON.stringify(config).replace(/</g, '\\u003c');

      return [
        '<!DOCTYPE html>',
        '<html lang="fr" dir="ltr">',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="referrer" content="strict-origin-when-cross-origin">',
        '<title>' + echapperHtml(titre) + '</title>',
        '<style>', proteger(css, 'style'), CSS_ELEVE, '</style>',
        '</head>',
        '<body>',
        '<a href="#main-content" class="skip-link">Aller au contenu</a>',
        '<div id="videoAppRoot"></div>',
        // API officielle du lecteur YouTube : indispensable pour lire la vidéo elle-même
        youtube ? '<script src="https://www.youtube.com/iframe_api"></script>' : '',
        '<script>', proteger(js, 'script'), '</script>',
        '<script>',
        'window.addEventListener("DOMContentLoaded", function () {',
        '  var config = ' + donnees + ';',
        '  window.isEditMode = false;',
        '  VideoSimulator.init({ jsonSource: null, fallbackData: config, container: "#videoAppRoot", title: ' + JSON.stringify(titre).replace(/</g, '\\u003c') + ' });',
        '  var avis = document.querySelector("#localFileBanner > div");',
        '  if (avis) avis.textContent = "Cette page doit être ouverte à partir d\'un site (Moodle, Google Sites). Ouverte directement depuis l\'ordinateur, la vidéo ne peut pas jouer.";',
        '});',
        '</script>',
        '</body>',
        '</html>'
      ].join('\n');
    });
  }

  window.MoodleAIExportHtml = { construirePage: construirePage };
})();
