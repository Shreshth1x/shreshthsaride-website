/* ========================================
   SCROLL CONTROLLER
   ======================================== */

class ScrollController {
    constructor() {
        this.scrollIndicator = document.querySelector('.scroll-indicator');
        this.ticking = false;
    }

    init() {
        // Use requestAnimationFrame for smooth performance
        window.addEventListener('scroll', () => this.requestTick(), { passive: true });

        // Scroll indicator click - smooth scroll to underground
        if (this.scrollIndicator) {
            this.scrollIndicator.addEventListener('click', () => {
                const underground = document.querySelector('.underground-section');
                if (underground) {
                    underground.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // Initial state
        this.updateOnScroll();
    }

    requestTick() {
        if (!this.ticking) {
            requestAnimationFrame(() => this.updateOnScroll());
            this.ticking = true;
        }
    }

    updateOnScroll() {
        const scrollY = window.pageYOffset;

        // Hide scroll indicator after scrolling
        if (this.scrollIndicator) {
            if (scrollY > 50) {
                this.scrollIndicator.classList.add('hidden');
            } else {
                this.scrollIndicator.classList.remove('hidden');
            }
        }

        this.ticking = false;
    }
}

/* ========================================
   TREASURE CARD REVEAL ANIMATIONS
   ======================================== */

class TreasureReveal {
    constructor() {
        this.cards = document.querySelectorAll('.treasure-card');
        this.observer = null;
    }

    init() {
        if (this.cards.length === 0) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            // Show all cards immediately
            this.cards.forEach(card => card.classList.add('visible'));
            return;
        }

        // Use Intersection Observer for performance
        this.observer = new IntersectionObserver(
            (entries) => this.handleIntersection(entries),
            {
                root: null,
                rootMargin: '0px 0px -80px 0px',
                threshold: 0.1
            }
        );

        this.cards.forEach((card, index) => {
            // Add stagger delay
            card.style.transitionDelay = `${index * 0.15}s`;
            this.observer.observe(card);
        });
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after animation for performance
                this.observer.unobserve(entry.target);
            }
        });
    }
}

/* ========================================
   INITIALIZE
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
    const scrollController = new ScrollController();
    scrollController.init();

    const treasureReveal = new TreasureReveal();
    treasureReveal.init();
});
