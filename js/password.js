/**
 * Password Protection Module
 * Handles the password overlay and unlock animation
 */

class PasswordProtection {
    constructor() {
        // The correct password - CHANGE THIS to your anniversary date (e.g., "2208" for Aug 22)
        this.correctPassword = "2208";

        this.overlay = document.getElementById('password-overlay');
        this.container = this.overlay?.querySelector('.password-container');
        this.input = document.getElementById('password-input');
        this.button = document.getElementById('password-submit');
        this.error = document.getElementById('password-error');
        this.mainContent = document.getElementById('main-content');

        if (this.overlay && this.input) {
            this.init();
        }
    }

    init() {
        // Check if already unlocked this session
        if (sessionStorage.getItem('love-story-unlocked') === 'true') {
            this.showContent();
            return;
        }

        // Event listeners
        this.button?.addEventListener('click', () => this.checkPassword());

        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkPassword();
            }
        });

        // Clear error on input
        this.input.addEventListener('input', () => {
            this.error.hidden = true;
        });

        // Focus input after a short delay (allows animations to complete)
        setTimeout(() => {
            this.input.focus();
        }, 500);
    }

    checkPassword() {
        const enteredPassword = this.input.value.trim();

        if (enteredPassword === this.correctPassword) {
            this.unlock();
        } else {
            this.showError();
        }
    }

    showError() {
        this.error.hidden = false;
        this.container.classList.add('shake');
        this.input.value = '';
        this.input.focus();

        // Remove shake class after animation
        setTimeout(() => {
            this.container.classList.remove('shake');
        }, 500);
    }

    unlock() {
        // Save unlock state
        sessionStorage.setItem('love-story-unlocked', 'true');

        // Add unlocking animation class
        this.overlay.classList.add('unlocking');

        // After heart burst animation, fade out overlay
        setTimeout(() => {
            this.overlay.classList.add('unlocked');
            this.showContent();
        }, 600);

        // Remove overlay from DOM after transition
        setTimeout(() => {
            this.overlay.remove();
        }, 1200);
    }

    showContent() {
        // Remove overlay if it exists (for already-unlocked case)
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.remove();
        }

        // Show main content
        if (this.mainContent) {
            this.mainContent.classList.add('visible');

            // Trigger initial animations after content is visible
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('contentUnlocked'));
            }, 100);
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.passwordProtection = new PasswordProtection();
});
