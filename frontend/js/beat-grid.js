/**
 * Beat Grid visualization module
 * Renders beat markers overlaid on waveform
 */

class BeatGridRenderer {
    constructor(canvas, waveformRenderer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.waveform = waveformRenderer;

        this.beats = [];
        this.downbeats = [];
        this.beatNumbers = [];

        // Colors
        this.beatColor = 'rgba(78, 204, 163, 0.6)';
        this.downbeatColor = 'rgba(233, 69, 96, 0.8)';
        this.gridLineColor = 'rgba(78, 204, 163, 0.2)';

        // Resize handling
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas.parentElement);
    }

    /**
     * Resize canvas to match container
     */
    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;

        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.render();
    }

    /**
     * Set beat data
     * @param {number[]} beats - Beat times in seconds
     * @param {number[]} downbeats - Downbeat times in seconds
     * @param {number[]} beatNumbers - Beat numbers within measure
     */
    setBeats(beats, downbeats, beatNumbers) {
        this.beats = beats || [];
        this.downbeats = downbeats || [];
        this.beatNumbers = beatNumbers || [];
        this.render();
    }

    /**
     * Render beat grid
     */
    render() {
        if (!this.waveform || !this.waveform.waveformData) return;

        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const ctx = this.ctx;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get visible time range
        const startTime = this.waveform.scrollOffset;
        const endTime = startTime + this.waveform.visibleDuration;

        // Draw grid lines (every beat)
        ctx.strokeStyle = this.gridLineColor;
        ctx.lineWidth = 1;

        for (let i = 0; i < this.beats.length; i++) {
            const beatTime = this.beats[i];
            if (beatTime < startTime - 1 || beatTime > endTime + 1) continue;

            const x = this.waveform.timeToX(beatTime);
            const isDownbeat = this.downbeats.some(db => Math.abs(db - beatTime) < 0.01);

            // Draw beat line
            ctx.strokeStyle = isDownbeat ? this.downbeatColor : this.beatColor;
            ctx.lineWidth = isDownbeat ? 2 : 1;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height - 20); // Leave space for time ruler
            ctx.stroke();

            // Draw beat number at top
            if (this.beatNumbers[i]) {
                ctx.fillStyle = isDownbeat ? this.downbeatColor : this.beatColor;
                ctx.font = isDownbeat ? 'bold 12px sans-serif' : '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(this.beatNumbers[i].toString(), x, 15);
            }
        }

        // Draw measure numbers for downbeats
        ctx.fillStyle = this.downbeatColor;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';

        let measureNum = 1;
        for (let i = 0; i < this.downbeats.length; i++) {
            const dbTime = this.downbeats[i];
            if (dbTime < startTime - 1 || dbTime > endTime + 1) {
                measureNum++;
                continue;
            }

            const x = this.waveform.timeToX(dbTime);

            // Measure number background
            ctx.fillStyle = 'rgba(233, 69, 96, 0.2)';
            ctx.fillRect(x - 12, height - 50, 24, 18);

            // Measure number
            ctx.fillStyle = this.downbeatColor;
            ctx.fillText(measureNum.toString(), x, height - 36);

            measureNum++;
        }
    }

    /**
     * Find nearest beat to a given time
     * @param {number} time - Time in seconds
     * @param {number} tolerance - Max distance in seconds
     * @returns {Object|null} Beat info or null
     */
    findNearestBeat(time, tolerance = 0.1) {
        let nearest = null;
        let minDist = tolerance;

        for (let i = 0; i < this.beats.length; i++) {
            const dist = Math.abs(this.beats[i] - time);
            if (dist < minDist) {
                minDist = dist;
                nearest = {
                    index: i,
                    time: this.beats[i],
                    isDownbeat: this.downbeats.some(db => Math.abs(db - this.beats[i]) < 0.01)
                };
            }
        }

        return nearest;
    }

    /**
     * Get beat at a specific index
     * @param {number} index - Beat index
     * @returns {number|null} Beat time or null
     */
    getBeatAt(index) {
        if (index >= 0 && index < this.beats.length) {
            return this.beats[index];
        }
        return null;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.resizeObserver.disconnect();
    }
}
