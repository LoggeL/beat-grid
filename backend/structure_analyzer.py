"""
Music structure analysis module for detecting song sections.
"""

import numpy as np
import librosa
from sklearn.cluster import KMeans
from scipy.ndimage import median_filter


class StructureAnalyzer:
    """Analyzes music structure to detect sections like verse, chorus, bridge, etc."""

    # Section labels based on common song structures
    SECTION_LABELS = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'breakdown', 'buildup', 'drop']

    # Color mapping for sections (for frontend use)
    SECTION_COLORS = {
        'intro': '#4CAF50',      # Green
        'verse': '#2196F3',      # Blue
        'chorus': '#FF9800',     # Orange
        'bridge': '#9C27B0',     # Purple
        'outro': '#607D8B',      # Gray
        'breakdown': '#00BCD4',  # Cyan
        'buildup': '#FFEB3B',    # Yellow
        'drop': '#F44336',       # Red
        'unknown': '#9E9E9E'     # Gray
    }

    def __init__(self):
        pass

    def analyze_structure(self, filepath, y=None, sr=22050, num_sections=8):
        """
        Analyze the structure of a song.

        Args:
            filepath: Path to the audio file
            y: Pre-loaded audio data (optional)
            sr: Sample rate
            num_sections: Target number of sections to detect

        Returns:
            dict: Section information with boundaries and labels
        """
        if y is None:
            y, sr = librosa.load(filepath, sr=sr)

        duration = librosa.get_duration(y=y, sr=sr)

        # Compute features for segmentation
        # Using multiple features for more robust segmentation

        # 1. Chromagram (harmonic content)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)

        # 2. MFCCs (timbral content)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)

        # 3. Spectral contrast
        contrast = librosa.feature.spectral_contrast(y=y, sr=sr)

        # Stack features
        features = np.vstack([chroma, mfcc, contrast])

        # Compute self-similarity matrix
        # This helps identify repeated sections
        rec = librosa.segment.recurrence_matrix(
            features,
            mode='affinity',
            metric='cosine',
            sparse=False
        )

        # Find segment boundaries using spectral clustering
        try:
            # Use librosa's agglomerative clustering
            bounds = librosa.segment.agglomerative(features, num_sections)
            bound_frames = np.concatenate([[0], bounds, [features.shape[1]]])
        except Exception:
            # Fallback: simple uniform segmentation
            bound_frames = np.linspace(0, features.shape[1], num_sections + 1).astype(int)

        # Convert frames to times
        bound_times = librosa.frames_to_time(bound_frames, sr=sr)

        # Cluster segments to identify similar sections
        segments = self._extract_segment_features(features, bound_frames)
        labels = self._label_segments(segments, bound_times, duration)

        # Build section list
        sections = []
        for i in range(len(bound_times) - 1):
            sections.append({
                'start': float(bound_times[i]),
                'end': float(bound_times[i + 1]),
                'label': labels[i],
                'color': self.SECTION_COLORS.get(labels[i], self.SECTION_COLORS['unknown'])
            })

        return {
            'sections': sections,
            'num_sections': len(sections),
            'duration': duration
        }

    def _extract_segment_features(self, features, boundaries):
        """Extract mean features for each segment."""
        segments = []
        for i in range(len(boundaries) - 1):
            start = boundaries[i]
            end = boundaries[i + 1]
            segment_features = features[:, start:end]
            segments.append(np.mean(segment_features, axis=1))
        return np.array(segments)

    def _label_segments(self, segments, bound_times, duration):
        """
        Assign labels to segments based on their characteristics and position.

        Uses heuristics based on:
        - Position in song (intro/outro detection)
        - Similarity to other segments (verse/chorus detection)
        - Energy levels
        """
        num_segments = len(segments)
        labels = ['unknown'] * num_segments

        if num_segments == 0:
            return labels

        # Cluster similar segments together
        if num_segments >= 3:
            n_clusters = min(4, num_segments)
            try:
                kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                cluster_labels = kmeans.fit_predict(segments)
            except Exception:
                cluster_labels = list(range(num_segments))
        else:
            cluster_labels = list(range(num_segments))

        # Count cluster occurrences
        cluster_counts = {}
        for cl in cluster_labels:
            cluster_counts[cl] = cluster_counts.get(cl, 0) + 1

        # Heuristic labeling
        # 1. First segment is likely intro
        if bound_times[0] < duration * 0.1:
            labels[0] = 'intro'

        # 2. Last segment is likely outro
        if bound_times[-2] > duration * 0.85:
            labels[num_segments - 1] = 'outro'

        # 3. Most repeated cluster is likely chorus
        if cluster_counts:
            most_common_cluster = max(cluster_counts, key=cluster_counts.get)
            second_common = None
            if len(cluster_counts) > 1:
                counts_sorted = sorted(cluster_counts.items(), key=lambda x: x[1], reverse=True)
                second_common = counts_sorted[1][0] if len(counts_sorted) > 1 else None

            for i, cl in enumerate(cluster_labels):
                if labels[i] == 'unknown':
                    if cl == most_common_cluster and cluster_counts[cl] > 1:
                        labels[i] = 'chorus'
                    elif second_common is not None and cl == second_common and cluster_counts[cl] > 1:
                        labels[i] = 'verse'

        # 4. Fill in remaining with 'verse' or based on position
        for i in range(num_segments):
            if labels[i] == 'unknown':
                # Middle sections without clear pattern are likely verses or bridges
                pos = (bound_times[i] + bound_times[i + 1]) / 2 / duration
                if pos < 0.15:
                    labels[i] = 'intro'
                elif pos > 0.9:
                    labels[i] = 'outro'
                elif 0.4 < pos < 0.6:
                    labels[i] = 'bridge'
                else:
                    labels[i] = 'verse'

        return labels

    def detect_energy_sections(self, filepath, y=None, sr=22050):
        """
        Detect high/low energy sections (useful for EDM, electronic music).

        Returns sections labeled as 'buildup', 'drop', 'breakdown'.
        """
        if y is None:
            y, sr = librosa.load(filepath, sr=sr)

        # Compute RMS energy
        rms = librosa.feature.rms(y=y)[0]

        # Smooth the energy curve
        rms_smooth = median_filter(rms, size=51)

        # Normalize
        rms_norm = (rms_smooth - rms_smooth.min()) / (rms_smooth.max() - rms_smooth.min() + 1e-8)

        # Find energy transitions
        energy_sections = []
        threshold_high = 0.7
        threshold_low = 0.3

        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)

        current_state = 'normal'
        section_start = 0

        for i in range(1, len(rms_norm)):
            new_state = current_state

            if rms_norm[i] > threshold_high and current_state != 'high':
                new_state = 'high'
            elif rms_norm[i] < threshold_low and current_state != 'low':
                new_state = 'low'
            elif threshold_low <= rms_norm[i] <= threshold_high:
                if current_state in ['high', 'low']:
                    new_state = 'normal'

            if new_state != current_state:
                if section_start != i:
                    label = 'drop' if current_state == 'high' else 'breakdown' if current_state == 'low' else 'verse'
                    energy_sections.append({
                        'start': float(times[section_start]),
                        'end': float(times[i]),
                        'label': label,
                        'color': self.SECTION_COLORS.get(label, self.SECTION_COLORS['unknown'])
                    })
                section_start = i
                current_state = new_state

        # Add final section
        if section_start < len(times) - 1:
            label = 'drop' if current_state == 'high' else 'breakdown' if current_state == 'low' else 'verse'
            energy_sections.append({
                'start': float(times[section_start]),
                'end': float(times[-1]),
                'label': label,
                'color': self.SECTION_COLORS.get(label, self.SECTION_COLORS['unknown'])
            })

        return energy_sections
