/**
 * Main Application Module
 * Handles initialization, stats, milestones, gallery, and finale
 */

class LoveStoryApp {
    constructor() {
        this.data = null;
        this.isEnvelopeOpened = false;
    }

    async init() {
        // Load data
        await this.loadData();

        // Initialize components
        this.initStats();
        this.initMilestones();
        this.initGallery();
        this.initFinale();
        this.initLightbox();
    }

    async loadData() {
        try {
            const response = await fetch('data/chat-stats.json');
            if (response.ok) {
                this.data = await response.json();
            }
        } catch (error) {
            console.warn('Could not load chat stats:', error);
        }
    }

    // ============================================
    // Stats Section
    // ============================================

    initStats() {
        // Set up count-up animation observer
        const statsSection = document.getElementById('numbers');
        if (!statsSection) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateStats();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        observer.observe(statsSection);
    }

    animateStats() {
        // Calculate days together
        const relationshipStart = new Date('2023-08-22');
        const now = new Date();
        const daysTogether = Math.floor((now - relationshipStart) / (1000 * 60 * 60 * 24));

        // Get data from loaded stats or use defaults
        const totalMessages = this.data?.basic?.totalMessages || 0;
        const totalWords = this.data?.basic?.totalWords || 0;
        const avgPerDay = this.data?.basic?.averageMessagesPerDay || 0;

        // Animate each stat
        this.countUp('stat-days', daysTogether);
        this.countUp('stat-messages', totalMessages);
        this.countUp('stat-words', totalWords);
        this.countUp('stat-avg', avgPerDay);
        this.countUp('stat-visit', 21);
    }

    countUp(elementId, target, duration = 2000) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const start = 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const current = Math.floor(start + (target - start) * easeOut);
            element.textContent = current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = target.toLocaleString();
            }
        };

        requestAnimationFrame(animate);
    }

    // ============================================
    // Milestones Section
    // ============================================

    initMilestones() {
        if (!this.data?.milestones) return;

        const milestones = this.data.milestones;

        // First I love you
        const firstLove = milestones.find(m => m.type === 'first_love');
        if (firstLove) {
            const dateEl = document.getElementById('milestone-love-date');
            const textEl = document.getElementById('milestone-love-text');
            if (dateEl) dateEl.textContent = firstLove.date;
            if (textEl) {
                const who = firstLove.sender === 'you' ? 'I said it first' : 'You said it first';
                textEl.textContent = who;
            }
        }

        // Longest streak
        const longestStreak = milestones.find(m => m.type === 'longest_streak');
        if (longestStreak) {
            const dateEl = document.getElementById('milestone-streak-date');
            const textEl = document.getElementById('milestone-streak-text');
            if (dateEl) dateEl.textContent = `${longestStreak.startDate} - ${longestStreak.endDate}`;
            if (textEl) textEl.textContent = `${longestStreak.days} days of non-stop conversation`;
        }
    }

    // ============================================
    // Photo Gallery
    // ============================================

    initGallery() {
        const gallery = document.getElementById('photo-gallery');
        if (!gallery) return;

        // Photos configuration - ADD YOUR PHOTOS HERE
        // Format: { src: 'images/photos/filename.webp', caption: 'Description' }
        const photos = [
            // Example entries (replace with your actual photos):
            // { src: 'images/photos/arrival.webp', caption: 'The day she arrived' },
            // { src: 'images/photos/gateway.webp', caption: 'Gateway of India' },
            // { src: 'images/photos/dinner.webp', caption: 'Our favorite restaurant' },
        ];

        if (photos.length === 0) {
            // Keep placeholder
            return;
        }

        // Clear placeholder and add photos
        gallery.innerHTML = photos.map((photo, index) => `
            <div class="gallery-item" data-aos="fade-up" data-aos-delay="${200 + index * 100}">
                <img
                    src="${photo.src}"
                    alt="${photo.caption}"
                    loading="lazy"
                    data-caption="${photo.caption}"
                >
                <div class="gallery-caption">${photo.caption}</div>
            </div>
        `).join('');

        // Re-observe new elements for scroll animations
        if (window.scrollAnimator) {
            window.scrollAnimator.refresh();
        }
    }

    // ============================================
    // Lightbox
    // ============================================

    initLightbox() {
        const lightbox = document.getElementById('lightbox');
        const lightboxImage = lightbox?.querySelector('.lightbox-image');
        const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
        const lightboxClose = lightbox?.querySelector('.lightbox-close');

        if (!lightbox) return;

        // Click on gallery images
        document.addEventListener('click', (e) => {
            const galleryItem = e.target.closest('.gallery-item');
            if (galleryItem && galleryItem.querySelector('img')) {
                const img = galleryItem.querySelector('img');
                lightboxImage.src = img.src;
                lightboxCaption.textContent = img.dataset.caption || '';
                lightbox.hidden = false;
                document.body.style.overflow = 'hidden';
            }
        });

        // Close lightbox
        const closeLightbox = () => {
            lightbox.hidden = true;
            document.body.style.overflow = '';
        };

        lightboxClose?.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.hidden) {
                closeLightbox();
            }
        });
    }

    // ============================================
    // Finale (Envelope + Letter Modal)
    // ============================================

    initFinale() {
        const wrapper = document.querySelector('.envelope-wrapper');
        const modal = document.getElementById('letter-modal');
        const closeBtn = modal?.querySelector('.letter-close');
        const backdrop = modal?.querySelector('.letter-modal-backdrop');
        const heartsContainer = document.getElementById('floating-hearts');

        if (!wrapper || !modal) return;

        // Open envelope and show letter
        wrapper.addEventListener('click', () => {
            if (this.isEnvelopeOpened) return;

            this.isEnvelopeOpened = true;
            wrapper.classList.add('opened');

            // Show letter modal after envelope flap opens
            setTimeout(() => {
                this.showLetterModal(modal, heartsContainer);
            }, 600);
        });

        // Close modal handlers
        const closeLetter = () => {
            modal.hidden = true;
            document.body.style.overflow = '';
        };

        closeBtn?.addEventListener('click', closeLetter);
        backdrop?.addEventListener('click', closeLetter);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.hidden) {
                closeLetter();
            }
        });
    }

    showLetterModal(modal, heartsContainer) {
        modal.hidden = false;
        document.body.style.overflow = 'hidden';

        // Trigger floating hearts
        setTimeout(() => {
            this.createFloatingHearts(heartsContainer);
        }, 300);
    }

    createFloatingHearts(container) {
        if (!container) return;

        const hearts = ['❤️', '💕', '💗', '💖', '💝', '🩷', '💓'];

        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const heart = document.createElement('span');
                heart.className = 'floating-heart';
                heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                heart.style.left = `${Math.random() * 100}%`;
                heart.style.animationDuration = `${3 + Math.random() * 2}s`;
                heart.style.fontSize = `${1 + Math.random() * 1.5}rem`;

                container.appendChild(heart);

                // Clean up after animation
                setTimeout(() => heart.remove(), 5000);
            }, i * 150);
        }
    }
}

// Create global instance
window.loveStoryApp = new LoveStoryApp();

// Initialize after content is unlocked
window.addEventListener('contentUnlocked', () => {
    window.loveStoryApp.init();
});

// ============================================
// Smooth Scroll for anchor links
// ============================================

document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// ============================================
// Development helpers
// ============================================

// For development: bypass password with URL param ?dev=true
if (new URLSearchParams(window.location.search).get('dev') === 'true') {
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('password-overlay');
        if (overlay) overlay.remove();

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.add('visible');
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('contentUnlocked'));
            }, 100);
        }
    });
}
