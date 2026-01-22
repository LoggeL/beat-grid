/**
 * Waveform visualization module
 * Renders audio waveform on canvas with zoom/scroll support
 */

class WaveformRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.waveformData = null;
        this.duration = 0;

        // Display settings
        this.zoom = 1;
        this.scrollOffset = 0; // In seconds
        this.visibleDuration = 0; // Duration visible on screen

        // Colors
        this.backgroundColor = '#0f0f1a';
        this.waveformColor = '#4ecca3';
        this.centerLineColor = '#2a2a4a';

        // Resize handling
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas.parentElement);

        this.onClick = null;
    }

    /**
     * Resize canvas to match container
     */
    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Set actual size
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;

        // Set display size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';

        // Scale context
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.render();
    }

    /**
     * Set waveform data
     * @param {Object} data - Waveform data from backend
     */
    setData(data) {
        this.waveformData = data;
        this.duration = data.duration;
        this.visibleDuration = this.duration / this.zoom;
        this.scrollOffset = 0;
        this.render();
    }

    /**
     * Set zoom level
     * @param {number} zoom - Zoom factor (1 = fit all, higher = more zoom)
     */
    setZoom(zoom) {
        const centerTime = this.scrollOffset + this.visibleDuration / 2;
        this.zoom = zoom;
        this.visibleDuration = this.duration / this.zoom;

        // Keep center point
        this.scrollOffset = Math.max(0, centerTime - this.visibleDuration / 2);
        this.scrollOffset = Math.min(this.scrollOffset, this.duration - this.visibleDuration);

        this.render();
    }

    /**
     * Set scroll position
     * @param {number} offset - Offset in seconds
     */
    setScrollOffset(offset) {
        this.scrollOffset = Math.max(0, Math.min(offset, this.duration - this.visibleDuration));
        this.render();
    }

    /**
     * Scroll by an amount
     * @param {number} delta - Scroll delta in seconds
     */
    scroll(delta) {
        this.setScrollOffset(this.scrollOffset + delta);
    }

    /**
     * Convert x coordinate to time
     * @param {number} x - X position in pixels
     * @returns {number} Time in seconds
     */
    xToTime(x) {
        const width = this.canvas.width / window.devicePixelRatio;
        const ratio = x / width;
        return this.scrollOffset + ratio * this.visibleDuration;
    }

    /**
     * Convert time to x coordinate
     * @param {number} time - Time in seconds
     * @returns {number} X position in pixels
     */
    timeToX(time) {
        const width = this.canvas.width / window.devicePixelRatio;
        const relativeTime = time - this.scrollOffset;
        return (relativeTime / this.visibleDuration) * width;
    }

    /**
     * Render the waveform
     */
    render() {
        if (!this.waveformData) return;

        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw center line
        ctx.strokeStyle = this.centerLineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Calculate which data points to display
        const { peaks_positive, peaks_negative, num_points } = this.waveformData;
        const pointsPerSecond = num_points / this.duration;

        const startPoint = Math.floor(this.scrollOffset * pointsPerSecond);
        const endPoint = Math.ceil((this.scrollOffset + this.visibleDuration) * pointsPerSecond);
        const visiblePoints = endPoint - startPoint;

        // Draw waveform
        ctx.fillStyle = this.waveformColor;

        const barWidth = Math.max(1, width / visiblePoints);
        const centerY = height / 2;
        const maxAmplitude = height / 2 - 10;

        for (let i = 0; i < visiblePoints; i++) {
            const dataIndex = startPoint + i;
            if (dataIndex < 0 || dataIndex >= num_points) continue;

            const x = (i / visiblePoints) * width;
            const posHeight = peaks_positive[dataIndex] * maxAmplitude;
            const negHeight = Math.abs(peaks_negative[dataIndex]) * maxAmplitude;

            // Draw positive (top) half
            ctx.fillRect(x, centerY - posHeight, barWidth, posHeight);

            // Draw negative (bottom) half
            ctx.fillRect(x, centerY, barWidth, negHeight);
        }

        // Draw time ruler
        this.renderTimeRuler();
    }

    /**
     * Render time ruler at the bottom
     */
    renderTimeRuler() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const ctx = this.ctx;

        const rulerHeight = 20;
        const rulerY = height - rulerHeight;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, rulerY, width, rulerHeight);

        // Calculate tick interval based on zoom
        let tickInterval = 1; // seconds
        if (this.visibleDuration > 120) tickInterval = 30;
        else if (this.visibleDuration > 60) tickInterval = 10;
        else if (this.visibleDuration > 30) tickInterval = 5;
        else if (this.visibleDuration > 10) tickInterval = 2;

        ctx.fillStyle = '#a0a0a0';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';

        const startTick = Math.ceil(this.scrollOffset / tickInterval) * tickInterval;
        const endTick = this.scrollOffset + this.visibleDuration;

        for (let t = startTick; t <= endTick; t += tickInterval) {
            const x = this.timeToX(t);
            if (x < 0 || x > width) continue;

            // Tick mark
            ctx.strokeStyle = '#606060';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, rulerY);
            ctx.lineTo(x, rulerY + 5);
            ctx.stroke();

            // Time label
            const mins = Math.floor(t / 60);
            const secs = Math.floor(t % 60);
            const label = `${mins}:${secs.toString().padStart(2, '0')}`;
            ctx.fillText(label, x, rulerY + 15);
        }
    }

    /**
     * Get display dimensions
     * @returns {Object} Width and height
     */
    getDimensions() {
        return {
            width: this.canvas.width / window.devicePixelRatio,
            height: this.canvas.height / window.devicePixelRatio
        };
    }

    /**
     * Ensure a time is visible by scrolling if needed
     * @param {number} time - Time in seconds
     */
    ensureVisible(time) {
        const margin = this.visibleDuration * 0.1;

        if (time < this.scrollOffset + margin) {
            this.setScrollOffset(time - margin);
        } else if (time > this.scrollOffset + this.visibleDuration - margin) {
            this.setScrollOffset(time - this.visibleDuration + margin);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.resizeObserver.disconnect();
    }
}
