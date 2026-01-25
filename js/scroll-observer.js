/**
 * Scroll Animation Observer
 * Uses Intersection Observer API for performant scroll-triggered animations
 */

class ScrollAnimator {
    constructor(options = {}) {
        this.options = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px',
            ...options
        };

        this.observer = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            // Fallback: show all elements immediately
            this.showAllElements();
            return;
        }

        this.observer = new IntersectionObserver(
            this.handleIntersection.bind(this),
            this.options
        );

        // Observe all animated elements
        this.observeElements();
        this.initialized = true;
    }

    observeElements() {
        const elements = document.querySelectorAll('[data-aos]');

        elements.forEach(el => {
            // Add initial class
            el.classList.add('aos-init');
            this.observer.observe(el);
        });

        // Also observe the milestones timeline for the line animation
        const milestonesTimeline = document.querySelector('.milestones-timeline');
        if (milestonesTimeline) {
            this.observer.observe(milestonesTimeline);
        }
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;

                // Handle milestones timeline specially
                if (el.classList.contains('milestones-timeline')) {
                    el.classList.add('visible');
                    this.observer.unobserve(el);
                    return;
                }

                // Get delay from data attribute
                const delay = parseInt(el.dataset.aosDelay) || 0;

                setTimeout(() => {
                    el.classList.add('aos-animate');
                }, delay);

                // Stop observing once animated (one-time animation)
                this.observer.unobserve(el);
            }
        });
    }

    showAllElements() {
        const elements = document.querySelectorAll('[data-aos]');
        elements.forEach(el => {
            el.classList.add('aos-animate');
        });

        const milestonesTimeline = document.querySelector('.milestones-timeline');
        if (milestonesTimeline) {
            milestonesTimeline.classList.add('visible');
        }
    }

    // Refresh observer (call after dynamic content is added)
    refresh() {
        if (this.observer) {
            this.observeElements();
        }
    }
}

// Create global instance
window.scrollAnimator = new ScrollAnimator();

// Initialize after content is unlocked
window.addEventListener('contentUnlocked', () => {
    // Small delay to ensure content is rendered
    setTimeout(() => {
        window.scrollAnimator.init();
    }, 100);
});

// Also initialize if page is loaded without password (for development)
document.addEventListener('DOMContentLoaded', () => {
    // Check if main content is already visible
    const mainContent = document.getElementById('main-content');
    if (mainContent && mainContent.classList.contains('visible')) {
        window.scrollAnimator.init();
    }
});
