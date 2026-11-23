// ============================================================================
// LOGIQUE MODULAIRE AGNOSTIQUE (MÉTHODOLOGIE INTERFACE ÉPURÉE & PLEIN ÉCRAN)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initArchetypeSwitcher();
  initConfigDrawer();
  initInteractiveActivity();
  initScormExamForm();
  initScrollRevealHeader();
  coachManager.init();
});

/**
 * 1. Gestion du basculement d'archétype (Tableau de bord vs Activité interactive)
 */
function initArchetypeSwitcher() {
  const btnDashboard = document.getElementById('btnModeDashboard');
  const btnActivity = document.getElementById('btnModeActivity');
  const viewDashboard = document.getElementById('viewDashboard');
  const viewActivity = document.getElementById('viewActivity');

  if (!btnDashboard || !btnActivity || !viewDashboard || !viewActivity) return;

  btnDashboard.addEventListener('click', () => {
    btnDashboard.setAttribute('aria-selected', 'true');
    btnActivity.setAttribute('aria-selected', 'false');
    viewDashboard.style.display = 'block';
    viewActivity.style.display = 'none';
  });

  btnActivity.addEventListener('click', () => {
    btnActivity.setAttribute('aria-selected', 'true');
    btnDashboard.setAttribute('aria-selected', 'false');
    viewDashboard.style.display = 'none';
    viewActivity.style.display = 'block';
  });
}

/**
 * 2. Gestion du tiroir latéral (Drawer) pour Configuration & Options
 * Accessible au clavier (Échap, focus, aria-expanded)
 */
function initConfigDrawer() {
  const btnBurger = document.getElementById('btnConfigDrawer');
  const btnClose = document.getElementById('btnCloseDrawer');
  const drawer = document.getElementById('configDrawer');
  const backdrop = document.getElementById('drawerBackdrop');

  if (!btnBurger || !drawer || !backdrop) return;

  function openDrawer() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    btnBurger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    if (btnClose) btnClose.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    btnBurger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    btnBurger.focus();
  }

  btnBurger.addEventListener('click', () => {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) closeDrawer();
    else openDrawer();
  });

  if (btnClose) {
    btnClose.addEventListener('click', closeDrawer);
  }

  backdrop.addEventListener('click', closeDrawer);

  // Fermeture par touche Échap (Accessibilité WCAG 2.1)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });
}

/**
 * 3. Démonstrateur d'Activité Interactive (Simulation & Rétroaction en direct)
 */
function initInteractiveActivity() {
  const form = document.getElementById('activityForm');
  const feedback = document.getElementById('feedbackPanel');
  const feedbackText = document.getElementById('feedbackText');
  const btnReset = document.getElementById('btnResetActivity');

  if (!form || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const selected = form.querySelector('input[name="choice"]:checked');

    if (!selected) {
      feedback.className = 'feedback-box show alert';
      feedbackText.textContent = 'Veuillez sélectionner une option pour continuer.';
      feedback.focus();
      return;
    }

    if (selected.value === 'opt-1') {
      feedback.className = 'feedback-box show success';
      feedbackText.textContent = 'Validation réussie : Répartition équilibrée sans surcharge des ateliers.';
    } else {
      feedback.className = 'feedback-box show alert';
      feedbackText.textContent = 'Attention : Dépassement de capacité détecté sur le plateau technique.';
    }
  });

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      form.reset();
      feedback.className = 'feedback-box';
    });
  }
}

/**
 * 4. Gestionnaire d'exercice interactif SCORM (Thématiques 1-4)
 */
function initScormExamForm() {
  const form = document.getElementById('scormExamForm');
  const inputVal = document.getElementById('answerValue');
  const selectUnit = document.getElementById('unitSelector');
  const feedback = document.getElementById('feedbackPanel');
  const feedbackText = document.getElementById('feedbackText');
  const hudScore = document.getElementById('hudScore');

  if (!form || !inputVal || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = parseFloat(inputVal.value.replace(',', '.'));
    const unit = selectUnit ? selectUnit.value : 'UA';

    // 4.5e9 km / 1.496e8 km = 30.0802... UA
    const isCorrect = (unit === 'UA' && !isNaN(rawVal) && rawVal >= 30.0 && rawVal <= 30.2);

    if (isCorrect) {
      feedback.className = 'feedback-box show success';
      feedbackText.innerHTML = '<strong>Bravo ! Réponse exacte :</strong> 4,5 × 10⁹ km ÷ (1,496 × 10⁸ km/UA) ≈ <strong>30,1 UA</strong>. Le calcul et l\'unité sont parfaitement maîtrisés.';
      
      // Ajout du feedback dans l'assistant : affiche automatiquement le dernier message tout en conservant l'historique
      coachManager.addMessage('<strong>Félicitations !</strong> Tu as trouvé la bonne valeur (30,1 UA). Prêt pour la question 2 ?');

      if (hudScore) {
        hudScore.textContent = '5 / 106 pts (4,7 %)';
      }
    } else {
      feedback.className = 'feedback-box show alert';
      feedbackText.innerHTML = '<strong>Ce n\'est pas tout à fait cela.</strong> Indice pédagogique : Rappelle-toi que <code>1 UA = 1,496 × 10⁸ km</code>. Tu dois diviser la distance en km par cette constante.';
      
      // Ajout du conseil dans l'assistant
      coachManager.addMessage('<strong>Ce n\'est pas tout à fait cela.</strong> <em>Regarde le tableau de référence :</em> clique sur « Tableaux de référence » en haut à droite pour vérifier la valeur exacte d\'une UA.');
    }

    feedback.focus();
  });
}

/**
 * 5. Gestionnaire de l'en-tête secondaire escamotable (Scroll-reveal vers le haut)
 */
function initScrollRevealHeader() {
  const secondaryHeader = document.querySelector('.secondary-header');
  if (!secondaryHeader) return;

  const scrollContainer = document.querySelector('.app-content');
  let lastScrollTop = 0;
  const threshold = 12; // Seuil minimum de déplacement pour éviter les tressautements

  function onScroll(currentScroll) {
    // Proche du sommet : état standard
    if (currentScroll <= 10) {
      secondaryHeader.classList.remove('scroll-down', 'scroll-up');
      lastScrollTop = currentScroll;
      return;
    }

    // Déplacement significatif
    if (Math.abs(currentScroll - lastScrollTop) > threshold) {
      if (currentScroll > lastScrollTop && currentScroll > 60) {
        // Défilement vers le bas -> Masquer pour dégager l'espace
        secondaryHeader.classList.add('scroll-down');
        secondaryHeader.classList.remove('scroll-up');
      } else if (currentScroll < lastScrollTop) {
        // Défilement vers le haut -> Révéler immédiatement l'en-tête secondaire
        secondaryHeader.classList.remove('scroll-down');
        secondaryHeader.classList.add('scroll-up');
      }
      lastScrollTop = currentScroll;
    }
  }

  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', () => {
      onScroll(scrollContainer.scrollTop);
    }, { passive: true });
  }

  window.addEventListener('scroll', () => {
    const winScroll = window.scrollY || document.documentElement.scrollTop;
    onScroll(winScroll);
  }, { passive: true });
}

/**
 * 6. Gestionnaire modulaire de l'assistant pédagogique :
 * - N'affiche par défaut que le dernier message
 * - Permet de naviguer facilement dans l'historique complet :
 *   * Molette de la souris (défilement vertical ou horizontal sur le widget)
 *   * Balayage de l'écran (swipe tactile sur mobile/tablette et clic-glisser à la souris)
 *   * Boutons de pagination ‹ › et touches fléchées du clavier
 * - Peut être ouvert ou rétracté en tout temps depuis le bouton de l'en-tête secondaire (HUD)
 * - Sur desktop (≥ 1150px) : reste positionné à gauche en dehors du contenu sans chevauchement
 * - Sur mobile (< 1150px) : seconde couche flottante éphémère (6s) réinvocable en tout temps
 */
const coachManager = {
  messages: [
    'Bonjour ! Je suis là pour t\'accompagner dans la résolution de ce problème sur <strong>l\'échelle de l\'univers</strong>.'
  ],
  currentIndex: 0,
  isAllExpanded: false,
  dismissTimer: null,
  isWheelLocked: false,
  accumulatedWheel: 0,
  wheelTimer: null,

  isDesktop() {
    return window.innerWidth >= 1150;
  },

  init() {
    const bubble = document.getElementById('coachBubble');
    const btnPrev = document.getElementById('btnPrevCoachMsg');
    const btnNext = document.getElementById('btnNextCoachMsg');
    const btnClose = document.getElementById('btnCloseCoach');
    const btnToggle = document.getElementById('btnCoachToggle');
    const btnChevron = document.getElementById('btnToggleAllCoachMsgs');
    const viewport = document.getElementById('coachMessageViewport');

    if (!bubble) return;

    this.render();

    // Navigation par boutons ‹ et ›
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        this.goToPrev();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        this.goToNext();
      });
    }

    // Bouton chevron pour afficher/masquer l'ensemble des messages
    if (btnChevron) {
      btnChevron.addEventListener('click', () => {
        this.toggleAllMessages();
      });
    }

    // Bouton de fermeture ✕
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.retract();
      });
    }

    // Bascule / Réouverture depuis l'en-tête secondaire (HUD)
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const isRetracted = bubble.classList.contains('retracted');
        if (isRetracted) {
          this.expand();
          if (!this.isDesktop()) {
            this.startAutoDismiss(6);
          }
          if (viewport) viewport.focus();
        } else {
          this.retract();
        }
      });
    }

    // 1. Défilement à la molette de la souris (Wheel scroll)
    bubble.addEventListener('wheel', (e) => {
      // Si l'historique complet est déplié ou si 1 seul message, laisser le défilement naturel de la liste
      if (this.isAllExpanded || this.messages.length <= 1) return;

      // Empêche le défilement de la page pendant la navigation dans les messages de l'agent
      e.preventDefault();
      this.pauseAutoDismiss();

      if (this.isWheelLocked) return;

      // Prise en compte de deltaY et deltaX (molette verticale ou horizontale / trackpad)
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      this.accumulatedWheel += delta;

      clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => {
        this.accumulatedWheel = 0;
      }, 140);

      const threshold = 16;
      if (this.accumulatedWheel > threshold) {
        // Molette vers le bas -> Message suivant
        this.goToNext();
        this.accumulatedWheel = 0;
        this.isWheelLocked = true;
        setTimeout(() => { this.isWheelLocked = false; }, 240);
      } else if (this.accumulatedWheel < -threshold) {
        // Molette vers le haut -> Message précédent
        this.goToPrev();
        this.accumulatedWheel = 0;
        this.isWheelLocked = true;
        setTimeout(() => { this.isWheelLocked = false; }, 240);
      }
    }, { passive: false });

    // 2. Balayage de l'écran (Touch swipe & glissement souris)
    let startX = 0;
    let startY = 0;
    let isTracking = false;

    const startSwipe = (clientX, clientY, target) => {
      if (this.isAllExpanded || target.closest('button')) return;
      isTracking = true;
      startX = clientX;
      startY = clientY;
      this.pauseAutoDismiss();
    };

    const endSwipe = (clientX, clientY) => {
      if (!isTracking || this.isAllExpanded) return;
      isTracking = false;

      const diffX = clientX - startX;
      const diffY = clientY - startY;

      // Seuil minimum de déclenchement (28px)
      if (Math.abs(diffX) >= Math.abs(diffY)) {
        if (diffX < -28) {
          // Balayage vers la gauche -> Message suivant
          this.goToNext();
        } else if (diffX > 28) {
          // Balayage vers la droite -> Message précédent
          this.goToPrev();
        }
      } else if (Math.abs(diffY) > 28) {
        if (diffY < -28) {
          // Balayage vers le haut -> Message suivant
          this.goToNext();
        } else if (diffY > 28) {
          // Balayage vers le bas -> Message précédent
          this.goToPrev();
        }
      }
    };

    // Événements tactiles (smartphones / tablettes)
    bubble.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startSwipe(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });

    bubble.addEventListener('touchend', (e) => {
      if (e.changedTouches.length === 1) {
        endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }, { passive: true });

    // Glissement à la souris sur le viewport du message
    if (viewport) {
      viewport.addEventListener('mousedown', (e) => {
        startSwipe(e.clientX, e.clientY, e.target);
      });

      window.addEventListener('mouseup', (e) => {
        if (isTracking) {
          endSwipe(e.clientX, e.clientY);
        }
      });

      // 3. Navigation au clavier (Flèches gauche/droite ou haut/bas)
      viewport.addEventListener('keydown', (e) => {
        if (this.isAllExpanded) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          this.goToPrev();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.goToNext();
        }
      });
    }

    // Suspension du compte à rebours si l'utilisateur survole ou interagit
    bubble.addEventListener('mouseenter', () => this.pauseAutoDismiss());
    bubble.addEventListener('focusin', () => this.pauseAutoDismiss());

    // Temporisation au chargement : arrivée du 2e message (astuce) après 1 500 ms
    setTimeout(() => {
      this.addMessage('<em>Astuce :</em> vérifie bien tes conversions d\'unités avant de soumettre ta réponse (1 UA ≈ 150 millions de kilomètres).');
    }, 1500);
  },

  toggleAllMessages(forceState) {
    const bubble = document.getElementById('coachBubble');
    const btnChevron = document.getElementById('btnToggleAllCoachMsgs');
    const allList = document.getElementById('coachAllMessagesList');
    if (!bubble || !btnChevron || !allList) return;

    this.isAllExpanded = (typeof forceState === 'boolean') ? forceState : !this.isAllExpanded;

    if (this.isAllExpanded) {
      bubble.classList.add('show-all');
      allList.hidden = false;
      btnChevron.setAttribute('aria-expanded', 'true');
      btnChevron.setAttribute('title', 'Réduire à un seul message');
      btnChevron.setAttribute('aria-label', 'Réduire à un seul message');
      this.pauseAutoDismiss();
      this.renderHistoryList();
    } else {
      bubble.classList.remove('show-all');
      allList.hidden = true;
      btnChevron.setAttribute('aria-expanded', 'false');
      btnChevron.setAttribute('title', "Afficher l'ensemble des messages");
      btnChevron.setAttribute('aria-label', "Afficher l'ensemble des messages");
      this.render();
    }
  },

  renderHistoryList() {
    const historyContainer = document.getElementById('coachHistoryItems');
    const counter = document.getElementById('coachMsgCounter');
    const btnPrev = document.getElementById('btnPrevCoachMsg');
    const btnNext = document.getElementById('btnNextCoachMsg');

    if (counter) {
      counter.textContent = `Tout (${this.messages.length})`;
    }
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;

    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    this.messages.forEach((msgHtml, idx) => {
      const li = document.createElement('li');
      li.className = 'coach-history-item' + (idx === this.currentIndex ? ' active' : '');
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Sélectionner le conseil ${idx + 1}`);
      li.innerHTML = msgHtml;

      const selectMsg = () => {
        this.currentIndex = idx;
        this.toggleAllMessages(false);
      };

      li.addEventListener('click', selectMsg);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectMsg();
        }
      });

      historyContainer.appendChild(li);
    });
  },

  goToNext() {
    if (this.currentIndex < this.messages.length - 1) {
      this.currentIndex++;
      this.render('next');
    }
  },

  goToPrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render('prev');
    }
  },

  render(direction = 'next') {
    if (this.isAllExpanded) {
      this.renderHistoryList();
      return;
    }

    const activeMsg = document.getElementById('coachActiveMsg');
    const counter = document.getElementById('coachMsgCounter');
    const btnPrev = document.getElementById('btnPrevCoachMsg');
    const btnNext = document.getElementById('btnNextCoachMsg');
    const btnToggle = document.getElementById('btnCoachToggle');

    if (activeMsg) {
      activeMsg.innerHTML = this.messages[this.currentIndex];
      // Réinitialiser la classe d'animation pour rejouer la glissade
      activeMsg.className = 'coach-active-msg ' + (direction === 'prev' ? 'slide-prev' : 'slide-next');
    }

    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.messages.length}`;
    }

    if (btnPrev) {
      btnPrev.disabled = (this.currentIndex === 0);
    }

    if (btnNext) {
      btnNext.disabled = (this.currentIndex === this.messages.length - 1);
    }

    if (btnToggle) {
      btnToggle.textContent = `Assistant (${this.messages.length})`;
      btnToggle.setAttribute('aria-label', `Ouvrir ou masquer l'assistant (${this.messages.length} message${this.messages.length > 1 ? 's' : ''})`);
    }
  },

  addMessage(html) {
    this.messages.push(html);
    // Règle : l'agent montre automatiquement le dernier message arrivé
    this.currentIndex = this.messages.length - 1;
    this.render('next');
    this.expand();

    // Sur petit écran (< 1150px), l'information est éphémère et s'estompe après 6s si pas en mode déplié
    if (!this.isDesktop() && !this.isAllExpanded) {
      this.startAutoDismiss(6);
    }
  },

  retract() {
    const bubble = document.getElementById('coachBubble');
    const btnToggle = document.getElementById('btnCoachToggle');
    const timerFill = document.getElementById('coachTimerFill');
    if (bubble) bubble.classList.add('retracted');
    if (btnToggle) {
      btnToggle.setAttribute('aria-expanded', 'false');
      btnToggle.classList.add('has-tip');
    }
    if (timerFill) timerFill.classList.remove('running');
    clearTimeout(this.dismissTimer);
  },

  expand() {
    const bubble = document.getElementById('coachBubble');
    const btnToggle = document.getElementById('btnCoachToggle');
    if (bubble) bubble.classList.remove('retracted');
    if (btnToggle) {
      btnToggle.setAttribute('aria-expanded', 'true');
      btnToggle.classList.remove('has-tip');
    }
  },

  startAutoDismiss(seconds = 6) {
    const timerFill = document.getElementById('coachTimerFill');
    if (timerFill) {
      timerFill.style.transition = `transform ${seconds}s linear`;
      timerFill.classList.add('running');
    }
    clearTimeout(this.dismissTimer);
    this.dismissTimer = setTimeout(() => {
      this.retract();
    }, seconds * 1000);
  },

  pauseAutoDismiss() {
    clearTimeout(this.dismissTimer);
    const timerFill = document.getElementById('coachTimerFill');
    if (timerFill) timerFill.classList.remove('running');
  }
};
