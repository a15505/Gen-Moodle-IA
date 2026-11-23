/**
 * MoodleParser - Module d'analyse et de génération du format officiel Moodle XML
 * Prend en charge les 9 types de questions natives :
 * multichoice, truefalse, ordering, matching, gapselect, numerical, shortanswer, ddimageortext, cloze.
 * Zéro dépendance externe. Conforme Loi 25.
 */
(function() {
  'use strict';

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
      }
    });
  }


  function getTypeLabel(type) {
    const map = {
      'multichoice': 'QCM',
      'gapselect': 'Trous',
      'matching': 'Paires',
      'ddimage': 'Glisser-déposer',
      'ddimageortext': 'Glisser-déposer',
      'ddwtos': 'Glisser-déposer',
      'numerical': 'Numérique',
      'ordering': 'Ordre',
      'truefalse': 'Vrai/Faux',
      'shortanswer': 'Courte',
      'cloze': 'Cloze'
    };
    return map[type] || type || 'Question';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getCleanTitle(name) {
    if (!name) return 'Question';
    return name.replace(/^(Q\d+[\s.:-]+|\d+[\s.:-]+|Question\s*\d+[\s.:-]*)/i, '').trim();
  }

  const COMMON_TAGS = ['name', 'questiontext', 'generalfeedback', 'defaultgrade', 'shuffleanswers', 'tags'];
  const MANAGED_TAGS = {
    multichoice: ['single', 'answer'],
    truefalse: ['answer'],
    matching: ['subquestion'],
    ordering: ['item', 'answer'],
    gapselect: ['selectoption'],
    numerical: ['answer', 'unit', 'units'],
    shortanswer: ['usecase', 'answer'],
    ddimageortext: ['file', 'drag', 'drop'],
    cloze: []
  };
  const ORDERING_DEFAULTS = [['layouttype', 'VERTICAL'], ['selecttype', 'ALL'], ['selectcount', '0'], ['gradingtype', 'ABSOLUTE'], ['showgrading', 'SHOW']];

  function parseXml(xmlString) {
    let doc;
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      doc = parser.parseFromString(xmlString, 'text/xml');
    } else {
      throw new Error('DOMParser non disponible dans cet environnement.');
    }

    const quizData = [];
    const questionNodes = doc.querySelectorAll('quiz > question');

    let qCounter = 1;
    let pendingCategoryXml = null;
    const rawXml = (el) => new XMLSerializer().serializeToString(el);

    questionNodes.forEach((node) => {
      const type = node.getAttribute('type');
      if (type === 'category') {
        // Conservé tel quel et réécrit devant la question qui le suit
        pendingCategoryXml = rawXml(node);
        return;
      }

      const q = {
        id: 'q' + qCounter++,
        type: type,
        name: '',
        questionText: '',
        generalFeedback: '',
        defaultgrade: 1,
        penalty: 0.3333333,
        tag: '',
        shuffleanswers: true
      };

      if (pendingCategoryXml) {
        q._categoryXml = pendingCategoryXml;
        pendingCategoryXml = null;
      }

      // Toute balise que le simulateur ne modifie pas est réécrite à l'identique
      const managed = MANAGED_TAGS[type === 'ddimage' || type === 'ddwtos' ? 'ddimageortext' : type];
      if (managed) {
        q._extraXml = Array.from(node.children)
          .filter(el => !COMMON_TAGS.includes(el.tagName) && !managed.includes(el.tagName))
          .map(rawXml);
      } else {
        q._sourceXml = rawXml(node);
      }

      // Nom / Titre
      const nameEl = node.querySelector('name > text');
      q.name = nameEl ? nameEl.textContent.trim() : `Question ${q.id}`;

      // Énoncé
      const qtextEl = node.querySelector('questiontext > text');
      q.questionText = qtextEl ? qtextEl.textContent.trim() : '';

      // Rétroaction générale
      const fbEl = node.querySelector('generalfeedback > text');
      q.generalFeedback = fbEl ? fbEl.textContent.trim() : '';

      // Note par défaut
      const gradeEl = node.querySelector('defaultgrade');
      if (gradeEl) q.defaultgrade = parseFloat(gradeEl.textContent) || 1;

      // Pénalité
      const penaltyEl = node.querySelector('penalty');
      if (penaltyEl) q.penalty = parseFloat(penaltyEl.textContent) || 0.3333333;

      // Tag PFEQ (un seul mot)
      const tagEl = node.querySelector('tags > tag > text');
      if (tagEl) q.tag = tagEl.textContent.trim().split(/\s+/)[0];

      // Shuffleanswers
      const shuffleEl = node.querySelector('shuffleanswers');
      q._hasShuffle = !!shuffleEl;
      if (shuffleEl) {
        const val = shuffleEl.textContent.trim().toLowerCase();
        q.shuffleanswers = (val === '1' || val === 'true');
      }

      // Traitement spécifique selon le type
      switch (type) {
        case 'multichoice': {
          q.options = [];
          const singleEl = node.querySelector('single');
          if (singleEl) q.single = singleEl.textContent.trim();
          const answers = node.querySelectorAll('answer');
          answers.forEach(ans => {
            const fraction = parseFloat(ans.getAttribute('fraction')) || 0;
            const txtEl = ans.querySelector('text');
            const fbTextEl = ans.querySelector('feedback > text');
            q.options.push({
              text: txtEl ? txtEl.textContent.trim() : '',
              fraction: fraction,
              feedback: fbTextEl ? fbTextEl.textContent.trim() : ''
            });
          });
          break;
        }

        case 'truefalse': {
          const answers = node.querySelectorAll('answer');
          answers.forEach(ans => {
            const fraction = parseFloat(ans.getAttribute('fraction')) || 0;
            const txtEl = ans.querySelector('text');
            const ansText = txtEl ? txtEl.textContent.trim().toLowerCase() : '';
            const fbTextEl = ans.querySelector('feedback > text');
            const fb = fbTextEl ? fbTextEl.textContent.trim() : '';

            if (ansText === 'true') {
              if (fraction === 100) q.correctAnswer = true;
              q.feedbackTrue = fb;
            } else if (ansText === 'false') {
              if (fraction === 100) q.correctAnswer = false;
              q.feedbackFalse = fb;
            }
          });
          break;
        }

        case 'ordering': {
          q.items = [];
          const items = node.querySelectorAll('item, answer');
          items.forEach(it => {
            const txtEl = it.querySelector('text');
            if (txtEl) q.items.push({ text: txtEl.textContent.trim() });
          });
          break;
        }

        case 'matching': {
          q.pairs = [];
          const subquestions = node.querySelectorAll('subquestion');
          subquestions.forEach(sub => {
            const qEl = sub.querySelector('text');
            const aEl = sub.querySelector('answer > text');
            q.pairs.push({
              question: qEl ? qEl.textContent.trim() : '',
              answer: aEl ? aEl.textContent.trim() : ''
            });
          });
          break;
        }

        case 'gapselect': {
          q.options = [];
          const options = node.querySelectorAll('selectoption');
          options.forEach(opt => {
            const txtEl = opt.querySelector('text');
            const grpEl = opt.querySelector('group');
            q.options.push({
              text: txtEl ? txtEl.textContent.trim() : '',
              group: grpEl ? parseInt(grpEl.textContent.trim(), 10) || 1 : 1
            });
          });
          break;
        }

        case 'numerical': {
          q.answers = [];
          node.querySelectorAll('answer').forEach(ans => {
            const txtEl = ans.querySelector('text');
            const tolEl = ans.querySelector('tolerance');
            const fbTextEl = ans.querySelector('feedback > text');
            const rawValue = txtEl ? txtEl.textContent.trim() : '0';
            const value = parseFloat(rawValue);
            q.answers.push({
              value: Number.isNaN(value) ? rawValue : value,
              tolerance: tolEl ? parseFloat(tolEl.textContent) || 0 : 0,
              fraction: parseFloat(ans.getAttribute('fraction')) || 0,
              feedback: fbTextEl ? fbTextEl.textContent.trim() : ''
            });
          });
          q.units = [];
          node.querySelectorAll('unit').forEach(unitEl => {
            const uName = unitEl.querySelector('unit_name');
            const uMult = unitEl.querySelector('multiplier');
            q.units.push({
              unit: uName ? uName.textContent.trim() : '',
              multiplier: uMult ? parseFloat(uMult.textContent) : 1
            });
          });
          break;
        }

        case 'shortanswer': {
          q.answers = [];
          const usecaseEl = node.querySelector('usecase');
          q.useCase = usecaseEl ? (usecaseEl.textContent.trim() === '1') : false;

          const answers = node.querySelectorAll('answer');
          answers.forEach(ans => {
            const fraction = parseFloat(ans.getAttribute('fraction')) || 0;
            const txtEl = ans.querySelector('text');
            const fbTextEl = ans.querySelector('feedback > text');
            q.answers.push({
              text: txtEl ? txtEl.textContent.trim() : '',
              fraction: fraction,
              feedback: fbTextEl ? fbTextEl.textContent.trim() : ''
            });
          });
          break;
        }

        case 'ddimageortext':
        case 'ddimage':
        case 'ddwtos': {
          q.type = 'ddimageortext';
          q.drags = [];
          q.drops = [];

          // Image de fond
          const fileEl = node.querySelector('file');
          if (fileEl) {
            const b64 = fileEl.textContent.trim();
            const fileName = fileEl.getAttribute('name') || 'bgimage.svg';
            const mime = fileName.endsWith('.png') ? 'image/png' : /\.jpe?g$/.test(fileName) ? 'image/jpeg' : 'image/svg+xml';
            q.bgImage = `data:${mime};base64,${b64}`;
          }

          // Éléments à glisser (drags)
          const drags = node.querySelectorAll('drag');
          drags.forEach((d, idx) => {
            const noEl = d.querySelector('no');
            const txtEl = d.querySelector('text');
            const grpEl = d.querySelector('draggroup');
            const infEl = d.querySelector('infinite');
            q.drags.push({
              no: noEl ? parseInt(noEl.textContent, 10) : idx + 1,
              text: txtEl ? txtEl.textContent.trim() : `Repère ${idx + 1}`,
              group: grpEl ? parseInt(grpEl.textContent, 10) : 1,
              infinite: infEl ? (infEl.textContent.trim() === '1') : false
            });
          });

          // Zones de dépôt (drops)
          const drops = node.querySelectorAll('drop');
          drops.forEach((dp, idx) => {
            const choiceEl = dp.querySelector('choice');
            const xEl = dp.querySelector('xleft');
            const yEl = dp.querySelector('ytop');
            q.drops.push({
              no: idx + 1,
              choice: choiceEl ? parseInt(choiceEl.textContent, 10) : 1,
              xleft: xEl ? parseInt(xEl.textContent, 10) : 50,
              ytop: yEl ? parseInt(yEl.textContent, 10) : 50
            });
          });
          break;
        }

        case 'cloze': {
          // Pour cloze, tout est dans questionText
          break;
        }
      }

      quizData.push(q);
    });

    return quizData;
  }

  function cdata(value) {
    return '<![CDATA[' + String(value === undefined || value === null ? '' : value).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
  }

  function serializeXml(quizData, categoryName) {
    categoryName = categoryName || '$course$/top/Banque_PFEQ';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n';
    if (!quizData.length || !quizData[0]._categoryXml) {
      xml += `  <question type="category">\n    <category>\n      <text>${escapeXml(categoryName)}</text>\n    </category>\n  </question>\n\n`;
    }

    quizData.forEach((q) => {
      if (q._categoryXml) xml += `  ${q._categoryXml}\n\n`;
      if (q._sourceXml) {
        xml += `  ${q._sourceXml}\n\n`;
        return;
      }

      const grade = (q.defaultgrade || 1).toFixed(7);
      const name = escapeXml(getCleanTitle(q.name));
      const cleanTag = q.tag ? q.tag.trim().split(/\s+/)[0].toLowerCase() : '';
      const type = (q.type === 'ddimage' || q.type === 'ddwtos') ? 'ddimageortext' : q.type;
      const extras = q._extraXml || [];
      const shuffleXml = `    <shuffleanswers>${q.shuffleanswers !== false ? 'true' : 'false'}</shuffleanswers>\n`;

      xml += `  <question type="${type}">\n`;
      xml += `    <name>\n      <text>${name}</text>\n    </name>\n`;
      xml += `    <questiontext format="html">\n      <text>${cdata(q.questionText)}</text>\n    </questiontext>\n`;
      xml += `    <generalfeedback format="html">\n      <text>${cdata(q.generalFeedback)}</text>\n    </generalfeedback>\n`;
      xml += `    <defaultgrade>${grade}</defaultgrade>\n`;

      switch (type) {
        case 'multichoice':
          xml += `    <single>${q.single || 'true'}</single>\n` + shuffleXml;
          (q.options || []).forEach(opt => {
            xml += `    <answer fraction="${opt.fraction || 0}" format="html">\n      <text>${cdata(opt.text)}</text>\n      <feedback format="html"><text>${cdata(opt.feedback)}</text></feedback>\n    </answer>\n`;
          });
          break;

        case 'truefalse':
          xml += `    <answer fraction="${q.correctAnswer === true ? 100 : 0}" format="html">\n      <text>true</text>\n      <feedback format="html"><text>${cdata(q.feedbackTrue)}</text></feedback>\n    </answer>\n`;
          xml += `    <answer fraction="${q.correctAnswer === false ? 100 : 0}" format="html">\n      <text>false</text>\n      <feedback format="html"><text>${cdata(q.feedbackFalse)}</text></feedback>\n    </answer>\n`;
          break;

        case 'matching':
          xml += shuffleXml;
          (q.pairs || []).forEach(p => {
            xml += `    <subquestion format="html">\n      <text>${cdata(p.question)}</text>\n      <answer><text>${cdata(p.answer)}</text></answer>\n    </subquestion>\n`;
          });
          break;

        case 'ordering':
          if (q._hasShuffle || q.shuffleanswers === false) xml += shuffleXml;
          ORDERING_DEFAULTS.forEach(([tag, value]) => {
            if (!extras.some(x => x.startsWith(`<${tag}>`))) xml += `    <${tag}>${value}</${tag}>\n`;
          });
          (q.items || []).forEach(it => {
            xml += `    <item><text>${cdata(it.text)}</text></item>\n`;
          });
          break;

        case 'gapselect':
          xml += shuffleXml;
          (q.options || []).forEach(opt => {
            xml += `    <selectoption><text>${escapeXml(opt.text)}</text><group>${opt.group || 1}</group></selectoption>\n`;
          });
          break;

        case 'numerical':
          (q.answers && q.answers.length ? q.answers : [{ value: 0, tolerance: 0, feedback: '' }]).forEach(ans => {
            xml += `    <answer fraction="${ans.fraction === undefined ? 100 : ans.fraction}">\n      <text>${escapeXml(ans.value)}</text>\n      <tolerance>${ans.tolerance || 0}</tolerance>\n      <feedback format="html"><text>${cdata(ans.feedback)}</text></feedback>\n    </answer>\n`;
          });
          if (q.units && q.units.length) {
            xml += '    <units>\n';
            q.units.forEach(u => {
              xml += `      <unit>\n        <multiplier>${u.multiplier === undefined ? 1 : u.multiplier}</multiplier>\n        <unit_name>${escapeXml(u.unit)}</unit_name>\n      </unit>\n`;
            });
            xml += '    </units>\n';
          }
          break;

        case 'shortanswer':
          xml += `    <usecase>${q.useCase ? 1 : 0}</usecase>\n`;
          (q.answers || []).forEach(a => {
            xml += `    <answer fraction="${a.fraction === undefined ? 100 : a.fraction}" format="moodle_auto_format">\n      <text>${escapeXml(a.text)}</text>\n      <feedback format="html"><text>${cdata(a.feedback)}</text></feedback>\n    </answer>\n`;
          });
          break;

        case 'ddimageortext': {
          const m = (q.bgImage || '').match(/^data:([^;]+);base64,(.*)$/);
          if (m) {
            const ext = m[1].includes('jpeg') ? 'jpg' : m[1].includes('svg') ? 'svg' : 'png';
            xml += `    <file name="bgimage.${ext}" encoding="base64">${m[2]}</file>\n`;
          }
          (q.drags || []).forEach(d => {
            xml += `    <drag>\n      <no>${d.no}</no>\n      <text>${cdata(d.text)}</text>\n      <draggroup>${d.group || 1}</draggroup>\n      <infinite>${d.infinite ? 1 : 0}</infinite>\n    </drag>\n`;
          });
          (q.drops || []).forEach((dr, i) => {
            xml += `    <drop>\n      <text></text>\n      <no>${dr.no || i + 1}</no>\n      <choice>${dr.choice || 1}</choice>\n      <xleft>${dr.xleft || 0}</xleft>\n      <ytop>${dr.ytop || 0}</ytop>\n    </drop>\n`;
          });
          break;
        }

        default:
          break;
      }

      extras.forEach(x => { xml += `    ${x}\n`; });
      if (cleanTag) xml += `    <tags>\n      <tag><text>${escapeXml(cleanTag)}</text></tag>\n    </tags>\n`;
      xml += `  </question>\n\n`;
    });

    xml += '</quiz>';
    return xml;
  }

  // Export vers l'espace global
  window.MoodleParser = {
    parseXml: parseXml,
    serializeXml: serializeXml,
    escapeXml: escapeXml,
    getCleanTitle: getCleanTitle
  };

  // Alias rétrocompatibles
  window.parseXml = parseXml;
  window.serializeXml = serializeXml;
  window.escapeXml = escapeXml;
  window.getCleanTitle = getCleanTitle;
  window.getTypeLabel = getTypeLabel;
  window.escapeHtml = escapeHtml;
  window.modeCorrige = false;
  window.generateMoodleXml = function() {
    return serializeXml(window.quizData || []);
  };

})();
