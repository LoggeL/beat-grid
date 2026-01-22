/**
 * Structure Timeline module
 * Displays song sections (intro, verse, chorus, etc.)
 */

class StructureTimeline {
    constructor(container, waveformRenderer) {
        this.container = container;
        this.waveform = waveformRenderer;

        this.sections = [];
        this.duration = 0;

        this.onSectionClick = null;
    }

    /**
     * Set section data
     * @param {Array} sections - Array of section objects
     * @param {number} duration - Total duration in seconds
     */
    setSections(sections, duration) {
        this.sections = sections || [];
        this.duration = duration;
        this.render();
    }

    /**
     * Render the structure timeline
     */
    render() {
        this.container.innerHTML = '';

        if (this.sections.length === 0) {
            this.container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; line-height: 30px;">No structure detected</div>';
            return;
        }

        // Get visible time range from waveform
        let startTime = 0;
        let endTime = this.duration;
        let visibleDuration = this.duration;

        if (this.waveform && this.waveform.waveformData) {
            startTime = this.waveform.scrollOffset;
            visibleDuration = this.waveform.visibleDuration;
            endTime = startTime + visibleDuration;
        }

        // Create section elements
        this.sections.forEach((section, index) => {
            // Check if section is visible
            if (section.end < startTime || section.start > endTime) {
                return;
            }

            // Calculate visible portion of section
            const visibleStart = Math.max(section.start, startTime);
            const visibleEnd = Math.min(section.end, endTime);

            // Calculate percentage widths relative to visible area
            const leftPercent = ((visibleStart - startTime) / visibleDuration) * 100;
            const widthPercent = ((visibleEnd - visibleStart) / visibleDuration) * 100;

            const sectionEl = document.createElement('div');
            sectionEl.className = 'structure-section';
            sectionEl.style.position = 'absolute';
            sectionEl.style.left = leftPercent + '%';
            sectionEl.style.width = widthPercent + '%';
            sectionEl.style.backgroundColor = section.color;

            // Show label if section is wide enough
            if (widthPercent > 5) {
                sectionEl.textContent = section.label;
            }

            // Click handler
            sectionEl.addEventListener('click', () => {
                if (this.onSectionClick) {
                    this.onSectionClick(section);
                }
            });

            // Tooltip
            sectionEl.title = `${section.label}\n${this.formatTime(section.start)} - ${this.formatTime(section.end)}`;

            this.container.appendChild(sectionEl);
        });
    }

    /**
     * Update display based on waveform scroll/zoom
     */
    update() {
        this.render();
    }

    /**
     * Format time as M:SS
     * @param {number} seconds
     * @returns {string}
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get section at a specific time
     * @param {number} time - Time in seconds
     * @returns {Object|null} Section or null
     */
    getSectionAt(time) {
        for (const section of this.sections) {
            if (time >= section.start && time < section.end) {
                return section;
            }
        }
        return null;
    }

    /**
     * Get all sections of a specific type
     * @param {string} label - Section label (e.g., 'chorus')
     * @returns {Array} Matching sections
     */
    getSectionsByLabel(label) {
        return this.sections.filter(s => s.label === label);
    }
}
