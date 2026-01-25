/**
 * Charts Module
 * Handles all Chart.js visualizations
 */

class ChatCharts {
    constructor() {
        this.frequencyChart = null;
        this.hourlyChart = null;
        this.data = null;

        // Chart.js global defaults
        this.setChartDefaults();
    }

    setChartDefaults() {
        if (typeof Chart === 'undefined') return;

        Chart.defaults.font.family = "'Lato', -apple-system, BlinkMacSystemFont, sans-serif";
        Chart.defaults.color = '#6b6b6b';
        Chart.defaults.plugins.legend.display = false;
    }

    async init() {
        try {
            // Load chat stats data
            const response = await fetch('data/chat-stats.json');
            if (!response.ok) {
                console.warn('Chat stats not found. Run parse-chat.js first.');
                this.showPlaceholder();
                return;
            }

            this.data = await response.json();
            this.renderCharts();
            this.updateInsights();

        } catch (error) {
            console.error('Error loading chat stats:', error);
            this.showPlaceholder();
        }
    }

    showPlaceholder() {
        // Show placeholder message in chart containers
        const containers = document.querySelectorAll('.chart-container');
        containers.forEach(container => {
            const canvas = container.querySelector('canvas');
            if (canvas) {
                canvas.style.display = 'none';
            }
            const placeholder = document.createElement('div');
            placeholder.className = 'chart-placeholder';
            placeholder.innerHTML = `
                <p style="text-align: center; color: #999; padding: 2rem;">
                    Chat data not loaded yet.<br>
                    Run the chat parser to generate statistics.
                </p>
            `;
            container.appendChild(placeholder);
        });
    }

    renderCharts() {
        this.renderFrequencyChart();
        this.renderHourlyChart();
    }

    renderFrequencyChart() {
        const ctx = document.getElementById('frequency-chart');
        if (!ctx || !this.data?.monthly) return;

        const { labels, you, partner } = this.data.monthly;

        // Mark the chart container as loaded
        ctx.closest('.chart-container').classList.add('chart-loaded');

        this.frequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'My Messages',
                        data: you,
                        borderColor: '#8b4557',
                        backgroundColor: 'rgba(139, 69, 87, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Your Messages',
                        data: partner,
                        borderColor: '#d4838f',
                        backgroundColor: 'rgba(212, 131, 143, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toLocaleString()} messages`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    renderHourlyChart() {
        const ctx = document.getElementById('hourly-chart');
        if (!ctx || !this.data?.hourly) return;

        const { labels, you, partner } = this.data.hourly;

        // Mark the chart container as loaded
        ctx.closest('.chart-container').classList.add('chart-loaded');

        this.hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'My Messages',
                        data: you,
                        backgroundColor: 'rgba(139, 69, 87, 0.7)',
                        borderRadius: 4
                    },
                    {
                        label: 'Your Messages',
                        data: partner,
                        backgroundColor: 'rgba(212, 131, 143, 0.7)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            callback: function(value, index) {
                                // Show every 3rd label on mobile
                                if (window.innerWidth < 600) {
                                    return index % 3 === 0 ? this.getLabelForValue(value) : '';
                                }
                                return this.getLabelForValue(value);
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });

        // Update peak hours display
        this.updatePeakHours();
    }

    updatePeakHours() {
        if (!this.data?.hourly) return;

        const { labels, yourPeakHour, partnerPeakHour } = this.data.hourly;

        const yourPeakEl = document.getElementById('your-peak-hour');
        const partnerPeakEl = document.getElementById('partner-peak-hour');

        if (yourPeakEl) {
            yourPeakEl.textContent = labels[yourPeakHour] || '--';
        }
        if (partnerPeakEl) {
            partnerPeakEl.textContent = labels[partnerPeakHour] || '--';
        }
    }

    updateInsights() {
        if (!this.data) return;

        const insightEl = document.getElementById('insight-peak');
        if (insightEl && this.data.monthly) {
            const maxMonth = this.data.monthly.labels[
                this.data.monthly.total.indexOf(Math.max(...this.data.monthly.total))
            ];
            insightEl.textContent = `Our most active month was ${maxMonth}`;
        }
    }

    // Handle window resize
    resize() {
        if (this.frequencyChart) this.frequencyChart.resize();
        if (this.hourlyChart) this.hourlyChart.resize();
    }
}

// Create global instance
window.chatCharts = new ChatCharts();

// Initialize after content is unlocked
window.addEventListener('contentUnlocked', () => {
    setTimeout(() => {
        window.chatCharts.init();
    }, 500);
});

// Handle resize
window.addEventListener('resize', () => {
    if (window.chatCharts) {
        window.chatCharts.resize();
    }
});
