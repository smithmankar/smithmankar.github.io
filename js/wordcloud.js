/**
 * Word Cloud Module
 * Handles the word cloud visualization using WordCloud2.js
 */

class WordCloudRenderer {
    constructor() {
        this.canvas = null;
        this.data = null;
    }

    async init() {
        this.canvas = document.getElementById('word-cloud');
        if (!this.canvas) return;

        try {
            // Load chat stats data
            const response = await fetch('data/chat-stats.json');
            if (!response.ok) {
                console.warn('Chat stats not found for word cloud.');
                this.showPlaceholder();
                return;
            }

            this.data = await response.json();
            this.render();
            this.renderEmojis();

        } catch (error) {
            console.error('Error loading word cloud data:', error);
            this.showPlaceholder();
        }
    }

    showPlaceholder() {
        const container = this.canvas?.closest('.wordcloud-container');
        if (container) {
            container.innerHTML = `
                <p style="text-align: center; color: #999; padding: 2rem;">
                    Word cloud data not loaded yet.<br>
                    Run the chat parser to generate statistics.
                </p>
            `;
        }
    }

    render() {
        if (!this.data?.words?.words || typeof WordCloud === 'undefined') {
            this.showPlaceholder();
            return;
        }

        const words = this.data.words.words;

        // Prepare word list for WordCloud2 [word, size]
        // Scale sizes based on frequency
        const maxCount = words[0]?.value || 1;
        const minSize = 12;
        const maxSize = 60;

        const wordList = words.map(({ text, value }) => {
            // Logarithmic scaling for better distribution
            const scale = Math.log(value + 1) / Math.log(maxCount + 1);
            const size = minSize + (maxSize - minSize) * scale;
            return [text, Math.round(size)];
        });

        // Color palette
        const colors = [
            '#8b4557', // primary
            '#a85d70', // primary light
            '#d4838f', // accent
            '#6d3545', // primary dark
            '#c9a86c', // gold accent
        ];

        // Render word cloud
        WordCloud(this.canvas, {
            list: wordList,
            gridSize: 8,
            weightFactor: 1,
            fontFamily: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif',
            color: function() {
                return colors[Math.floor(Math.random() * colors.length)];
            },
            rotateRatio: 0.3,
            rotationSteps: 2,
            backgroundColor: 'transparent',
            shuffle: true,
            drawOutOfBound: false,
            shrinkToFit: true,

            // Heart shape (optional - can be commented out for rectangular)
            // shape: 'cardioid',

            // Callbacks
            click: (item) => {
                console.log(`Word: ${item[0]}, used ${this.getWordCount(item[0])} times`);
            },
            hover: (item, dimension, event) => {
                if (item) {
                    this.canvas.style.cursor = 'pointer';
                } else {
                    this.canvas.style.cursor = 'default';
                }
            }
        });
    }

    getWordCount(word) {
        const wordData = this.data?.words?.words.find(w => w.text === word);
        return wordData?.value || 0;
    }

    renderEmojis() {
        const container = document.getElementById('top-emojis');
        if (!container || !this.data?.words?.emojis) return;

        const emojis = this.data.words.emojis.slice(0, 10); // Top 10 emojis

        container.innerHTML = emojis.map(({ emoji, count }) => `
            <span class="emoji-item" title="Used ${count} times">${emoji}</span>
        `).join('');
    }

    // Resize handler
    resize() {
        if (this.canvas && this.data) {
            // Re-render on significant size change
            this.render();
        }
    }
}

// Create global instance
window.wordCloud = new WordCloudRenderer();

// Initialize after content is unlocked
window.addEventListener('contentUnlocked', () => {
    setTimeout(() => {
        window.wordCloud.init();
    }, 800);
});

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (window.wordCloud) {
            window.wordCloud.resize();
        }
    }, 300);
});
