"""
Beat detection module using madmom and librosa.
"""

import numpy as np

# Try to import madmom, fall back to librosa if not available
try:
    import madmom
    from madmom.features.beats import RNNBeatProcessor, BeatTrackingProcessor
    from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
    MADMOM_AVAILABLE = True
except ImportError:
    MADMOM_AVAILABLE = False

import librosa


class BeatDetector:
    """Detects beats, downbeats, and BPM from audio files."""

    def __init__(self, use_madmom=True):
        """
        Initialize the beat detector.

        Args:
            use_madmom: Whether to use madmom (more accurate) or fall back to librosa
        """
        self.use_madmom = use_madmom and MADMOM_AVAILABLE

        if self.use_madmom:
            # Initialize madmom processors (they can be reused)
            self.beat_processor = RNNBeatProcessor()
            self.beat_tracker = BeatTrackingProcessor(fps=100)
            try:
                self.downbeat_processor = RNNDownBeatProcessor()
                self.downbeat_tracker = DBNDownBeatTrackingProcessor(
                    beats_per_bar=[3, 4], fps=100
                )
                self.has_downbeat = True
            except Exception:
                self.has_downbeat = False

    def detect_beats(self, filepath, y=None, sr=22050):
        """
        Detect beat positions in an audio file.

        Args:
            filepath: Path to the audio file
            y: Pre-loaded audio data (optional)
            sr: Sample rate

        Returns:
            dict: Beat positions and BPM information
        """
        if self.use_madmom:
            return self._detect_beats_madmom(filepath)
        else:
            return self._detect_beats_librosa(filepath, y, sr)

    def _detect_beats_madmom(self, filepath):
        """Use madmom for beat detection (more accurate)."""
        # Get beat activations
        beat_activations = self.beat_processor(filepath)
        beats = self.beat_tracker(beat_activations)

        # Calculate BPM from beat intervals
        if len(beats) > 1:
            intervals = np.diff(beats)
            median_interval = np.median(intervals)
            bpm = 60.0 / median_interval
        else:
            bpm = 120.0  # Default

        # Try to detect downbeats
        downbeats = []
        beat_numbers = []

        if self.has_downbeat:
            try:
                downbeat_activations = self.downbeat_processor(filepath)
                downbeat_info = self.downbeat_tracker(downbeat_activations)
                # downbeat_info is array of [time, beat_number]
                for time, beat_num in downbeat_info:
                    if beat_num == 1:
                        downbeats.append(float(time))
                    beat_numbers.append(int(beat_num))

                # Use downbeat times as the beat times
                beats = downbeat_info[:, 0]
                beat_numbers = downbeat_info[:, 1].astype(int).tolist()
            except Exception as e:
                # Fall back to assuming 4/4 time
                beat_numbers = [(i % 4) + 1 for i in range(len(beats))]
                downbeats = [beats[i] for i in range(0, len(beats), 4)]
        else:
            # Assume 4/4 time signature
            beat_numbers = [(i % 4) + 1 for i in range(len(beats))]
            downbeats = [beats[i] for i in range(0, len(beats), 4)]

        return {
            'beats': [float(b) for b in beats],
            'downbeats': [float(d) for d in downbeats],
            'beat_numbers': beat_numbers,
            'bpm': float(bpm),
            'time_signature': '4/4',  # Could be detected with more analysis
            'confidence': 0.9 if MADMOM_AVAILABLE else 0.7
        }

    def _detect_beats_librosa(self, filepath, y=None, sr=22050):
        """Use librosa for beat detection (fallback)."""
        if y is None:
            y, sr = librosa.load(filepath, sr=sr)

        # Detect tempo and beats
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)

        # Handle tempo as array (newer librosa versions)
        if hasattr(tempo, '__len__'):
            bpm = float(tempo[0]) if len(tempo) > 0 else 120.0
        else:
            bpm = float(tempo)

        # Assume 4/4 time signature
        beat_numbers = [(i % 4) + 1 for i in range(len(beat_times))]
        downbeats = [beat_times[i] for i in range(0, len(beat_times), 4)]

        return {
            'beats': [float(b) for b in beat_times],
            'downbeats': [float(d) for d in downbeats],
            'beat_numbers': beat_numbers,
            'bpm': bpm,
            'time_signature': '4/4',
            'confidence': 0.7
        }

    def adjust_beats(self, beats, offset=0.0, bpm_multiplier=1.0):
        """
        Adjust beat positions.

        Args:
            beats: Original beat positions
            offset: Time offset to apply (phase shift)
            bpm_multiplier: BPM adjustment (0.5 = half, 2.0 = double)

        Returns:
            list: Adjusted beat positions
        """
        beats = np.array(beats)

        # Apply offset
        beats = beats + offset

        # Apply BPM multiplier (interpolate or decimate beats)
        if bpm_multiplier != 1.0:
            if bpm_multiplier > 1.0:
                # More beats - interpolate
                new_beats = []
                for i in range(len(beats) - 1):
                    new_beats.append(beats[i])
                    for j in range(1, int(bpm_multiplier)):
                        interp = beats[i] + (beats[i + 1] - beats[i]) * (j / bpm_multiplier)
                        new_beats.append(interp)
                new_beats.append(beats[-1])
                beats = np.array(new_beats)
            else:
                # Fewer beats - decimate
                step = int(1.0 / bpm_multiplier)
                beats = beats[::step]

        return [float(b) for b in beats if b >= 0]

    def generate_click_track_times(self, beats, downbeats=None):
        """
        Generate timing data for click track.

        Args:
            beats: Beat positions in seconds
            downbeats: Downbeat positions (for accented clicks)

        Returns:
            list: Click events with time and accent info
        """
        downbeat_set = set(downbeats) if downbeats else set()

        clicks = []
        for beat in beats:
            is_downbeat = any(abs(beat - db) < 0.01 for db in downbeat_set)
            clicks.append({
                'time': beat,
                'accent': is_downbeat
            })

        return clicks
