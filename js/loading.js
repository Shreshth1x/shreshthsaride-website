/* ========================================
   LOADING SCREEN
   ======================================== */

class LoadingScreen {
  constructor() {
    this.screen = document.getElementById('loading-screen');
    this.progressBar = document.getElementById('progress-fill');
    this.percentElement = document.getElementById('progress-percent');
    this.tipElement = document.getElementById('loading-tip');
    this.pressStart = document.getElementById('press-start');
    this.progress = 0;
    this.tips = [
      'TIP: Check out the Projects page!',
      'TIP: Read the latest blog posts!',
      'TIP: "time is passing anyway"',
      'TIP: Every expert was once a beginner.',
      'TIP: Building something great takes time.'
    ];
    this.tipIndex = 0;
    this.isComplete = false;
  }

  init() {
    if (!this.screen) return;

    // Skip loading if already visited this session
    if (sessionStorage.getItem('hasVisited')) {
      this.screen.remove();
      document.body.classList.add('loaded');
      return;
    }

    // Mark as visited
    sessionStorage.setItem('hasVisited', 'true');

    this.rotateTips();
    this.simulateLoading();

    // Allow skip on click/keypress
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.hide();
      }
    });

    if (this.pressStart) {
      this.pressStart.addEventListener('click', () => this.hide());
    }

    this.screen.addEventListener('click', () => {
      if (this.isComplete) this.hide();
    });
  }

  simulateLoading() {
    const totalDuration = 2000; // 2 seconds total
    const steps = 10;
    const stepDuration = totalDuration / steps;

    const increment = () => {
      if (this.progress < 100) {
        this.progress += 10;
        this.updateProgress();

        if (this.progress < 100) {
          setTimeout(increment, stepDuration + Math.random() * 200);
        } else {
          this.onLoadComplete();
        }
      }
    };

    // Start after a brief delay
    setTimeout(increment, 300);
  }

  updateProgress() {
    if (this.progressBar) {
      this.progressBar.style.width = `${this.progress}%`;
    }
    if (this.percentElement) {
      this.percentElement.textContent = `${this.progress}%`;
    }
  }

  onLoadComplete() {
    this.isComplete = true;

    // Show "Press Start" text
    if (this.pressStart) {
      this.pressStart.classList.add('visible');
    }
  }

  hide() {
    if (this.screen && !this.screen.classList.contains('hidden')) {
      this.screen.classList.add('hidden');

      // Remove from DOM after transition
      setTimeout(() => {
        if (this.screen && this.screen.parentNode) {
          this.screen.remove();
        }
        // Trigger page content animations
        document.body.classList.add('loaded');
      }, 500);
    }
  }

  rotateTips() {
    if (!this.tipElement) return;

    setInterval(() => {
      this.tipIndex = (this.tipIndex + 1) % this.tips.length;
      this.tipElement.style.opacity = '0';

      setTimeout(() => {
        this.tipElement.textContent = this.tips[this.tipIndex];
        this.tipElement.style.opacity = '1';
      }, 300);
    }, 2500);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const loader = new LoadingScreen();
  loader.init();
});
