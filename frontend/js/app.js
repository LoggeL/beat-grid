/**
 * Beat Grid - Main Application
 */

class BeatGridApp {
    constructor() {
        // Current file state
        this.currentFileId = null;
        this.analysisData = null;

        // Components
        this.audioPlayer = new AudioPlayer();
        this.waveform = null;
        this.beatGrid = null;
        this.structure = null;

        // Tap tempo state
        this.tapTimes = [];
        this.tapTimeout = null;

        // Initialize
        this.initElements();
        this.initEventListeners();
    }

    /**
     * Cache DOM elements
     */
    initElements() {
        // Zones
        this.uploadZone = document.getElementById('upload-zone');
        this.analysisView = document.getElementById('analysis-view');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingText = document.getElementById('loading-text');

        // File input
        this.fileInput = document.getElementById('file-input');

        // Info displays
        this.bpmDisplay = document.getElementById('bpm-display');
        this.timeSigDisplay = document.getElementById('time-sig-display');
        this.filenameDisplay = document.getElementById('filename-display');
        this.durationDisplay = document.getElementById('duration-display');
        this.timeDisplay = document.getElementById('time-display');

        // Canvases
        this.waveformCanvas = document.getElementById('waveform-canvas');
        this.beatGridCanvas = document.getElementById('beat-grid-canvas');

        // Playhead
        this.playhead = document.getElementById('playhead');

        // Transport controls
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');

        // Click track
        this.clickEnabled = document.getElementById('click-enabled');
        this.clickVolume = document.getElementById('click-volume');

        // Zoom
        this.zoomSlider = document.getElementById('zoom-slider');

        // Beat controls
        this.bpmInput = document.getElementById('bpm-input');
        this.offsetInput = document.getElementById('offset-input');
        this.tapTempoBtn = document.getElementById('tap-tempo-btn');
        this.halfBpmBtn = document.getElementById('half-bpm-btn');
        this.doubleBpmBtn = document.getElementById('double-bpm-btn');

        // Export buttons
        this.exportJsonBtn = document.getElementById('export-json-btn');
        this.exportCsvBtn = document.getElementById('export-csv-btn');

        // Other
        this.newFileBtn = document.getElementById('new-file-btn');
        this.structureTimeline = document.getElementById('structure-timeline');
        this.shortcutsHelp = document.getElementById('shortcuts-help');
    }

    /**
     * Set up event listeners
     */
    initEventListeners() {
        // File upload - drag and drop
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-over');
        });

        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-over');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // File upload - click
        this.uploadZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // New file button
        this.newFileBtn.addEventListener('click', () => {
            this.reset();
        });

        // Transport controls
        this.playBtn.addEventListener('click', () => this.togglePlayPause());
        this.stopBtn.addEventListener('click', () => this.stop());

        // Click track
        this.clickEnabled.addEventListener('change', (e) => {
            this.audioPlayer.setClickEnabled(e.target.checked);
        });

        this.clickVolume.addEventListener('input', (e) => {
            this.audioPlayer.setClickVolume(e.target.value / 100);
        });

        // Zoom
        this.zoomSlider.addEventListener('input', (e) => {
            if (this.waveform) {
                this.waveform.setZoom(parseFloat(e.target.value));
                this.beatGrid.render();
                this.structure.update();
            }
        });

        // Beat adjustment
        this.bpmInput.addEventListener('change', (e) => {
            this.updateBpm(parseFloat(e.target.value));
        });

        this.offsetInput.addEventListener('change', (e) => {
            this.updateOffset(parseFloat(e.target.value));
        });

        this.tapTempoBtn.addEventListener('click', () => this.tapTempo());

        this.halfBpmBtn.addEventListener('click', () => {
            const currentBpm = parseFloat(this.bpmInput.value);
            this.updateBpm(currentBpm / 2);
        });

        this.doubleBpmBtn.addEventListener('click', () => {
            const currentBpm = parseFloat(this.bpmInput.value);
            this.updateBpm(currentBpm * 2);
        });

        // Export
        this.exportJsonBtn.addEventListener('click', () => this.exportData('json'));
        this.exportCsvBtn.addEventListener('click', () => this.exportData('csv'));

        // Waveform click to seek
        this.waveformCanvas.addEventListener('click', (e) => {
            if (!this.waveform || !this.waveform.waveformData) return;

            const rect = this.waveformCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = this.waveform.xToTime(x);

            this.audioPlayer.seek(time);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Audio player callbacks
        this.audioPlayer.onTimeUpdate = (time) => this.updatePlayhead(time);
        this.audioPlayer.onEnded = () => this.onPlaybackEnded();
    }

    /**
     * Handle file upload
     * @param {File} file
     */
    async handleFileUpload(file) {
        try {
            this.showLoading('Uploading file...');

            // Load audio locally for playback
            await this.audioPlayer.loadFile(file);

            // Upload to backend
            const uploadResult = await API.uploadFile(file);
            this.currentFileId = uploadResult.id;

            // Update UI
            this.filenameDisplay.textContent = uploadResult.filename;
            this.durationDisplay.textContent = AudioPlayer.formatTime(uploadResult.duration);

            // Analyze file
            this.showLoading('Analyzing audio...');
            const analysisResult = await API.analyzeFile(this.currentFileId);
            this.analysisData = analysisResult;

            // Get waveform data
            this.showLoading('Loading waveform...');
            const waveformData = await API.getWaveform(this.currentFileId, 4000);

            // Initialize visualizers
            this.initVisualizers(waveformData, analysisResult);

            // Set up audio player with beat data
            this.audioPlayer.setBeats(
                analysisResult.beats.beats,
                analysisResult.beats.downbeats
            );

            // Update displays
            this.updateBpmDisplay(analysisResult.beats.bpm);
            this.bpmInput.value = analysisResult.beats.bpm.toFixed(1);

            // Show analysis view
            this.uploadZone.classList.add('hidden');
            this.analysisView.classList.remove('hidden');
            this.hideLoading();

        } catch (error) {
            console.error('Error:', error);
            this.hideLoading();
            alert('Error: ' + error.message);
        }
    }

    /**
     * Initialize visualization components
     */
    initVisualizers(waveformData, analysisData) {
        // Waveform renderer
        this.waveform = new WaveformRenderer(this.waveformCanvas);
        this.waveform.setData(waveformData);

        // Beat grid renderer
        this.beatGrid = new BeatGridRenderer(this.beatGridCanvas, this.waveform);
        this.beatGrid.setBeats(
            analysisData.beats.beats,
            analysisData.beats.downbeats,
            analysisData.beats.beat_numbers
        );

        // Structure timeline
        this.structure = new StructureTimeline(this.structureTimeline, this.waveform);
        this.structure.setSections(
            analysisData.structure.sections,
            analysisData.duration
        );
        this.structure.onSectionClick = (section) => {
            this.audioPlayer.seek(section.start);
        };

        // Initial render
        setTimeout(() => {
            this.waveform.resize();
            this.beatGrid.resize();
        }, 100);
    }

    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (this.audioPlayer.isPlaying) {
            this.audioPlayer.pause();
            this.playIcon.classList.remove('hidden');
            this.pauseIcon.classList.add('hidden');
        } else {
            this.audioPlayer.play();
            this.playIcon.classList.add('hidden');
            this.pauseIcon.classList.remove('hidden');
        }
    }

    /**
     * Stop playback
     */
    stop() {
        this.audioPlayer.stop();
        this.playIcon.classList.remove('hidden');
        this.pauseIcon.classList.add('hidden');
        this.updatePlayhead(0);
    }

    /**
     * Called when playback ends
     */
    onPlaybackEnded() {
        this.playIcon.classList.remove('hidden');
        this.pauseIcon.classList.add('hidden');
        this.updatePlayhead(0);
    }

    /**
     * Update playhead position
     * @param {number} time - Current time in seconds
     */
    updatePlayhead(time) {
        if (!this.waveform || !this.waveform.waveformData) return;

        // Update playhead position
        const x = this.waveform.timeToX(time);
        this.playhead.style.left = x + 'px';

        // Update time display
        const duration = this.audioPlayer.duration;
        this.timeDisplay.textContent =
            `${AudioPlayer.formatTime(time)} / ${AudioPlayer.formatTime(duration)}`;

        // Scroll waveform to follow playhead during playback
        if (this.audioPlayer.isPlaying) {
            this.waveform.ensureVisible(time);
            this.beatGrid.render();
            this.structure.update();
        }
    }

    /**
     * Handle tap tempo
     */
    tapTempo() {
        const now = Date.now();

        // Reset if too much time passed
        if (this.tapTimeout) {
            clearTimeout(this.tapTimeout);
        }

        // Add tap time
        this.tapTimes.push(now);

        // Keep only last 8 taps
        if (this.tapTimes.length > 8) {
            this.tapTimes.shift();
        }

        // Calculate BPM from tap intervals
        if (this.tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < this.tapTimes.length; i++) {
                intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
            }

            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const bpm = 60000 / avgInterval;

            this.bpmInput.value = bpm.toFixed(1);
            this.updateBpmDisplay(bpm);
        }

        // Reset after 2 seconds of no taps
        this.tapTimeout = setTimeout(() => {
            this.tapTimes = [];
        }, 2000);
    }

    /**
     * Update BPM
     * @param {number} bpm
     */
    async updateBpm(bpm) {
        bpm = Math.max(20, Math.min(300, bpm));
        this.bpmInput.value = bpm.toFixed(1);
        this.updateBpmDisplay(bpm);

        if (this.currentFileId && this.analysisData) {
            try {
                const result = await API.updateBeats(this.currentFileId, { bpm });
                this.analysisData.beats = result.beats;
                this.beatGrid.setBeats(
                    result.beats.beats,
                    result.beats.downbeats,
                    result.beats.beat_numbers
                );
                this.audioPlayer.setBeats(result.beats.beats, result.beats.downbeats);
            } catch (error) {
                console.error('Failed to update BPM:', error);
            }
        }
    }

    /**
     * Update beat offset
     * @param {number} offsetMs - Offset in milliseconds
     */
    async updateOffset(offsetMs) {
        const offsetSec = offsetMs / 1000;

        if (this.currentFileId && this.analysisData) {
            try {
                const result = await API.updateBeats(this.currentFileId, { offset: offsetSec });
                this.analysisData.beats = result.beats;
                this.beatGrid.setBeats(
                    result.beats.beats,
                    result.beats.downbeats,
                    result.beats.beat_numbers
                );
                this.audioPlayer.setBeats(result.beats.beats, result.beats.downbeats);
            } catch (error) {
                console.error('Failed to update offset:', error);
            }
        }
    }

    /**
     * Update BPM display
     * @param {number} bpm
     */
    updateBpmDisplay(bpm) {
        this.bpmDisplay.textContent = bpm.toFixed(1) + ' BPM';
    }

    /**
     * Export data
     * @param {string} format - 'json' or 'csv'
     */
    async exportData(format) {
        if (!this.currentFileId) return;

        try {
            const data = await API.exportData(this.currentFileId, format);

            // Create download
            const blob = format === 'json'
                ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                : new Blob([data], { type: 'text/csv' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `beat-grid-export.${format}`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e
     */
    handleKeyboard(e) {
        // Ignore if typing in input
        if (e.target.tagName === 'INPUT') return;

        switch (e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;

            case 'ArrowLeft':
                e.preventDefault();
                this.audioPlayer.seek(this.audioPlayer.getCurrentTime() - 5);
                break;

            case 'ArrowRight':
                e.preventDefault();
                this.audioPlayer.seek(this.audioPlayer.getCurrentTime() + 5);
                break;

            case '+':
            case '=':
                e.preventDefault();
                this.zoomSlider.value = Math.min(10, parseFloat(this.zoomSlider.value) + 0.5);
                this.zoomSlider.dispatchEvent(new Event('input'));
                break;

            case '-':
                e.preventDefault();
                this.zoomSlider.value = Math.max(1, parseFloat(this.zoomSlider.value) - 0.5);
                this.zoomSlider.dispatchEvent(new Event('input'));
                break;

            case 'c':
            case 'C':
                this.clickEnabled.checked = !this.clickEnabled.checked;
                this.clickEnabled.dispatchEvent(new Event('change'));
                break;

            case 't':
            case 'T':
                this.tapTempo();
                break;

            case '?':
                this.shortcutsHelp.classList.toggle('hidden');
                break;
        }
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.audioPlayer.stop();
        this.currentFileId = null;
        this.analysisData = null;

        // Clean up visualizers
        if (this.waveform) {
            this.waveform.destroy();
            this.waveform = null;
        }
        if (this.beatGrid) {
            this.beatGrid.destroy();
            this.beatGrid = null;
        }
        this.structure = null;

        // Reset UI
        this.uploadZone.classList.remove('hidden');
        this.analysisView.classList.add('hidden');
        this.bpmDisplay.textContent = '-- BPM';
        this.timeDisplay.textContent = '0:00.000 / 0:00.000';
        this.fileInput.value = '';

        // Reset controls
        this.playIcon.classList.remove('hidden');
        this.pauseIcon.classList.add('hidden');
    }

    /**
     * Show loading overlay
     * @param {string} message
     */
    showLoading(message) {
        this.loadingText.textContent = message;
        this.loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new BeatGridApp();
});
