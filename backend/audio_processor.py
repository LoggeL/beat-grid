"""
Audio processing module for loading and analyzing audio files.
"""

import librosa
import numpy as np
import soundfile as sf
import os
import tempfile
import uuid


class AudioProcessor:
    """Handles audio file loading and waveform extraction."""

    def __init__(self, upload_folder='uploads'):
        self.upload_folder = upload_folder
        os.makedirs(upload_folder, exist_ok=True)
        self.audio_cache = {}

    def save_uploaded_file(self, file_storage):
        """
        Save an uploaded file and return a unique ID.

        Args:
            file_storage: Flask FileStorage object

        Returns:
            str: Unique ID for the uploaded file
        """
        file_id = str(uuid.uuid4())
        filename = file_storage.filename
        ext = os.path.splitext(filename)[1].lower()

        # Save with original extension
        filepath = os.path.join(self.upload_folder, f"{file_id}{ext}")
        file_storage.save(filepath)

        return file_id, filepath, filename

    def load_audio(self, filepath, sr=22050):
        """
        Load an audio file using librosa.

        Args:
            filepath: Path to the audio file
            sr: Sample rate (default 22050)

        Returns:
            tuple: (audio_data, sample_rate)
        """
        if filepath in self.audio_cache:
            return self.audio_cache[filepath]

        y, sr = librosa.load(filepath, sr=sr, mono=True)
        self.audio_cache[filepath] = (y, sr)
        return y, sr

    def get_duration(self, filepath):
        """Get the duration of an audio file in seconds."""
        y, sr = self.load_audio(filepath)
        return librosa.get_duration(y=y, sr=sr)

    def get_waveform_data(self, filepath, num_points=2000):
        """
        Get downsampled waveform data for visualization.

        Args:
            filepath: Path to the audio file
            num_points: Number of points to return (for performance)

        Returns:
            dict: Waveform data with peaks and duration
        """
        y, sr = self.load_audio(filepath)
        duration = librosa.get_duration(y=y, sr=sr)

        # Downsample for visualization
        samples_per_point = len(y) // num_points
        if samples_per_point < 1:
            samples_per_point = 1

        # Get min/max for each segment (for proper waveform display)
        peaks_positive = []
        peaks_negative = []

        for i in range(num_points):
            start = i * samples_per_point
            end = min(start + samples_per_point, len(y))
            if start >= len(y):
                break
            segment = y[start:end]
            peaks_positive.append(float(np.max(segment)))
            peaks_negative.append(float(np.min(segment)))

        return {
            'peaks_positive': peaks_positive,
            'peaks_negative': peaks_negative,
            'duration': duration,
            'sample_rate': sr,
            'num_points': len(peaks_positive)
        }

    def get_spectrogram(self, filepath, n_mels=128, hop_length=512):
        """
        Generate mel spectrogram data.

        Args:
            filepath: Path to the audio file
            n_mels: Number of mel bands
            hop_length: Hop length for STFT

        Returns:
            dict: Spectrogram data
        """
        y, sr = self.load_audio(filepath)

        # Compute mel spectrogram
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=n_mels, hop_length=hop_length)
        S_db = librosa.power_to_db(S, ref=np.max)

        return {
            'spectrogram': S_db.tolist(),
            'sample_rate': sr,
            'hop_length': hop_length,
            'n_mels': n_mels
        }

    def cleanup(self, file_id):
        """Remove cached data for a file."""
        keys_to_remove = [k for k in self.audio_cache if file_id in k]
        for key in keys_to_remove:
            del self.audio_cache[key]
