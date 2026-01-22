/**
 * Audio Player module using Web Audio API
 * Handles playback and click track generation
 */

class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.gainNode = null;
        this.clickGainNode = null;

        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.duration = 0;

        this.clickEnabled = false;
        this.clickVolume = 0.7;
        this.clickScheduler = null;
        this.scheduledClicks = [];
        this.beats = [];
        this.downbeats = [];

        this.onTimeUpdate = null;
        this.onEnded = null;
    }

    /**
     * Initialize the audio context
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Main audio gain
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);

            // Click track gain
            this.clickGainNode = this.audioContext.createGain();
            this.clickGainNode.gain.value = this.clickVolume;
            this.clickGainNode.connect(this.audioContext.destination);
        }
    }

    /**
     * Load an audio file
     * @param {File} file - The audio file to load
     * @returns {Promise<number>} Duration in seconds
     */
    async loadFile(file) {
        this.init();

        // Stop any current playback
        this.stop();

        const arrayBuffer = await file.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.duration = this.audioBuffer.duration;
        this.pauseTime = 0;

        return this.duration;
    }

    /**
     * Set beat data for click track
     * @param {number[]} beats - Beat times in seconds
     * @param {number[]} downbeats - Downbeat times in seconds
     */
    setBeats(beats, downbeats) {
        this.beats = beats || [];
        this.downbeats = downbeats || [];
    }

    /**
     * Play or resume audio
     */
    play() {
        if (!this.audioBuffer || this.isPlaying) return;

        this.init();

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Create source node
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.gainNode);

        // Handle end of playback
        this.sourceNode.onended = () => {
            if (this.isPlaying) {
                this.isPlaying = false;
                this.pauseTime = 0;
                this.stopClickScheduler();
                if (this.onEnded) this.onEnded();
            }
        };

        // Start playback from pause position
        this.startTime = this.audioContext.currentTime - this.pauseTime;
        this.sourceNode.start(0, this.pauseTime);
        this.isPlaying = true;

        // Start click track if enabled
        if (this.clickEnabled) {
            this.startClickScheduler();
        }

        // Start time update loop
        this.startTimeUpdateLoop();
    }

    /**
     * Pause audio
     */
    pause() {
        if (!this.isPlaying) return;

        this.pauseTime = this.getCurrentTime();
        this.sourceNode.stop();
        this.sourceNode = null;
        this.isPlaying = false;

        this.stopClickScheduler();
    }

    /**
     * Stop audio and reset to beginning
     */
    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (e) {
                // Already stopped
            }
            this.sourceNode = null;
        }

        this.isPlaying = false;
        this.pauseTime = 0;

        this.stopClickScheduler();

        if (this.onTimeUpdate) {
            this.onTimeUpdate(0);
        }
    }

    /**
     * Seek to a specific time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        time = Math.max(0, Math.min(time, this.duration));
        const wasPlaying = this.isPlaying;

        if (wasPlaying) {
            this.pause();
        }

        this.pauseTime = time;

        if (wasPlaying) {
            this.play();
        }

        if (this.onTimeUpdate) {
            this.onTimeUpdate(time);
        }
    }

    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        if (!this.isPlaying) {
            return this.pauseTime;
        }
        return this.audioContext.currentTime - this.startTime;
    }

    /**
     * Set main volume
     * @param {number} volume - Volume 0-1
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    /**
     * Set click track volume
     * @param {number} volume - Volume 0-1
     */
    setClickVolume(volume) {
        this.clickVolume = volume;
        if (this.clickGainNode) {
            this.clickGainNode.gain.value = volume;
        }
    }

    /**
     * Enable/disable click track
     * @param {boolean} enabled
     */
    setClickEnabled(enabled) {
        this.clickEnabled = enabled;

        if (this.isPlaying) {
            if (enabled) {
                this.startClickScheduler();
            } else {
                this.stopClickScheduler();
            }
        }
    }

    /**
     * Start the click track scheduler
     */
    startClickScheduler() {
        this.stopClickScheduler();

        const scheduleAhead = 0.1; // Schedule 100ms ahead
        const lookAhead = 0.025; // Check every 25ms

        this.clickScheduler = setInterval(() => {
            const currentTime = this.getCurrentTime();
            const scheduleEnd = currentTime + scheduleAhead;

            // Find beats to schedule
            for (let i = 0; i < this.beats.length; i++) {
                const beatTime = this.beats[i];

                if (beatTime >= currentTime && beatTime < scheduleEnd) {
                    // Check if already scheduled
                    if (!this.scheduledClicks.includes(beatTime)) {
                        this.scheduledClicks.push(beatTime);
                        const isDownbeat = this.downbeats.some(db => Math.abs(db - beatTime) < 0.01);
                        this.scheduleClick(beatTime, isDownbeat);
                    }
                }
            }

            // Clean up old scheduled clicks
            this.scheduledClicks = this.scheduledClicks.filter(t => t > currentTime - 0.5);

        }, lookAhead * 1000);
    }

    /**
     * Stop the click track scheduler
     */
    stopClickScheduler() {
        if (this.clickScheduler) {
            clearInterval(this.clickScheduler);
            this.clickScheduler = null;
        }
        this.scheduledClicks = [];
    }

    /**
     * Schedule a click sound
     * @param {number} time - Time to play the click
     * @param {boolean} accent - Whether this is an accented beat
     */
    scheduleClick(time, accent = false) {
        const audioTime = this.startTime + time;

        // Create oscillator for click sound
        const osc = this.audioContext.createOscillator();
        const clickGain = this.audioContext.createGain();

        // Different pitch for accent (downbeat)
        osc.frequency.value = accent ? 1000 : 800;
        osc.type = 'sine';

        // Quick attack/decay envelope
        clickGain.gain.setValueAtTime(0, audioTime);
        clickGain.gain.linearRampToValueAtTime(accent ? 1 : 0.7, audioTime + 0.001);
        clickGain.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.05);

        osc.connect(clickGain);
        clickGain.connect(this.clickGainNode);

        osc.start(audioTime);
        osc.stop(audioTime + 0.05);
    }

    /**
     * Start the time update loop
     */
    startTimeUpdateLoop() {
        const update = () => {
            if (this.isPlaying && this.onTimeUpdate) {
                this.onTimeUpdate(this.getCurrentTime());
                requestAnimationFrame(update);
            }
        };
        requestAnimationFrame(update);
    }

    /**
     * Format time as MM:SS.mmm
     * @param {number} seconds
     * @returns {string}
     */
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }
}
