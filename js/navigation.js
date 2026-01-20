/* ========================================
   NAVIGATION
   ======================================== */

class GameNavigation {
  constructor() {
    this.mobileBtn = document.querySelector('.mobile-menu-btn');
    this.mobileMenu = document.querySelector('.mobile-menu');
    this.navLinks = document.querySelectorAll('.nav-link');
    this.isOpen = false;
  }

  init() {
    this.setActiveLink();
    this.setupMobileMenu();
    this.setupScrollBehavior();
  }

  setActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    this.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage ||
          (currentPage === '' && href === 'index.html') ||
          (currentPage === 'post.html' && href === 'blog.html')) {
        link.classList.add('active');
      }
    });
  }

  setupMobileMenu() {
    if (!this.mobileBtn || !this.mobileMenu) return;

    this.mobileBtn.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Close menu when clicking a link
    const mobileLinks = this.mobileMenu.querySelectorAll('.nav-link');
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMenu();
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (this.isOpen &&
          !this.mobileMenu.contains(e.target) &&
          !this.mobileBtn.contains(e.target)) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
    this.mobileBtn.classList.toggle('open', this.isOpen);
    this.mobileMenu.classList.toggle('open', this.isOpen);

    // Prevent body scroll when menu is open
    document.body.style.overflow = this.isOpen ? 'hidden' : '';
  }

  closeMenu() {
    this.isOpen = false;
    this.mobileBtn.classList.remove('open');
    this.mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  setupScrollBehavior() {
    let lastScroll = 0;
    const nav = document.querySelector('.game-nav');

    if (!nav) return;

    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;

      // Add shadow on scroll
      if (currentScroll > 10) {
        nav.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
      } else {
        nav.style.boxShadow = 'none';
      }

      lastScroll = currentScroll;
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const nav = new GameNavigation();
  nav.init();
});

/* ========================================
   SCROLL ANIMATIONS
   ======================================== */

class ScrollAnimations {
  constructor() {
    this.animatedElements = document.querySelectorAll('.section-animate');
  }

  init() {
    if (this.animatedElements.length === 0) return;

    // Initial check
    this.checkVisibility();

    // Check on scroll
    window.addEventListener('scroll', () => {
      this.checkVisibility();
    });
  }

  checkVisibility() {
    this.animatedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top < windowHeight * 0.85) {
        el.classList.add('visible');
      }
    });
  }
}

// Initialize scroll animations
document.addEventListener('DOMContentLoaded', () => {
  const scrollAnim = new ScrollAnimations();
  scrollAnim.init();
});
