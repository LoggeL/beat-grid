"""
Beat Grid Web App - Flask Backend
Analyzes audio files for beat detection, BPM, and song structure.
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from audio_processor import AudioProcessor
from beat_detector import BeatDetector
from structure_analyzer import StructureAnalyzer

# Initialize Flask app
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Initialize processors
audio_processor = AudioProcessor(UPLOAD_FOLDER)
beat_detector = BeatDetector()
structure_analyzer = StructureAnalyzer()

# In-memory storage for analysis results
analysis_results = {}


def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    """Serve the main frontend page."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory(app.static_folder, path)


@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload an audio file for analysis.

    Returns:
        JSON with file ID and basic info
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': f'File type not allowed. Supported: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    try:
        # Save the file
        file_id, filepath, original_name = audio_processor.save_uploaded_file(file)

        # Get basic info
        duration = audio_processor.get_duration(filepath)

        # Store file info
        analysis_results[file_id] = {
            'filepath': filepath,
            'filename': original_name,
            'duration': duration,
            'status': 'uploaded'
        }

        return jsonify({
            'id': file_id,
            'filename': original_name,
            'duration': duration,
            'status': 'uploaded'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze/<file_id>', methods=['GET'])
def analyze_file(file_id):
    """
    Perform full analysis on an uploaded file.

    Returns:
        JSON with beats, BPM, and structure
    """
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    file_info = analysis_results[file_id]
    filepath = file_info['filepath']

    # Check if already analyzed
    if file_info.get('status') == 'analyzed':
        return jsonify({
            'id': file_id,
            'filename': file_info['filename'],
            'duration': file_info['duration'],
            'beats': file_info['beats'],
            'structure': file_info['structure'],
            'status': 'analyzed'
        })

    try:
        # Update status
        file_info['status'] = 'analyzing'

        # Detect beats
        beat_data = beat_detector.detect_beats(filepath)

        # Analyze structure
        structure_data = structure_analyzer.analyze_structure(filepath)

        # Store results
        file_info['beats'] = beat_data
        file_info['structure'] = structure_data
        file_info['status'] = 'analyzed'

        return jsonify({
            'id': file_id,
            'filename': file_info['filename'],
            'duration': file_info['duration'],
            'beats': beat_data,
            'structure': structure_data,
            'status': 'analyzed'
        })

    except Exception as e:
        file_info['status'] = 'error'
        file_info['error'] = str(e)
        return jsonify({'error': str(e)}), 500


@app.route('/api/waveform/<file_id>', methods=['GET'])
def get_waveform(file_id):
    """
    Get waveform data for visualization.

    Query params:
        points: Number of data points (default 2000)
    """
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    filepath = analysis_results[file_id]['filepath']
    num_points = request.args.get('points', 2000, type=int)

    try:
        waveform_data = audio_processor.get_waveform_data(filepath, num_points)
        return jsonify(waveform_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/update-beats/<file_id>', methods=['POST'])
def update_beats(file_id):
    """
    Update beat positions after manual adjustment.

    Request body:
        beats: Array of beat times
        offset: Optional phase offset
        bpm: Optional manual BPM override
    """
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        file_info = analysis_results[file_id]

        # Update beats if provided
        if 'beats' in data:
            file_info['beats']['beats'] = data['beats']
            # Recalculate downbeats assuming 4/4
            file_info['beats']['downbeats'] = data['beats'][::4]
            file_info['beats']['beat_numbers'] = [(i % 4) + 1 for i in range(len(data['beats']))]

        # Apply offset if provided
        if 'offset' in data:
            offset = float(data['offset'])
            adjusted_beats = beat_detector.adjust_beats(
                file_info['beats']['beats'],
                offset=offset
            )
            file_info['beats']['beats'] = adjusted_beats
            file_info['beats']['downbeats'] = adjusted_beats[::4]

        # Update BPM if provided
        if 'bpm' in data:
            file_info['beats']['bpm'] = float(data['bpm'])

        return jsonify({
            'id': file_id,
            'beats': file_info['beats'],
            'status': 'updated'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/<file_id>', methods=['GET'])
def export_data(file_id):
    """
    Export analysis data in various formats.

    Query params:
        format: 'json' (default), 'csv', or 'rekordbox'
    """
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    export_format = request.args.get('format', 'json')
    file_info = analysis_results[file_id]

    if file_info.get('status') != 'analyzed':
        return jsonify({'error': 'File not yet analyzed'}), 400

    try:
        if export_format == 'json':
            export_data = {
                'filename': file_info['filename'],
                'duration': file_info['duration'],
                'bpm': file_info['beats']['bpm'],
                'time_signature': file_info['beats'].get('time_signature', '4/4'),
                'beats': file_info['beats']['beats'],
                'downbeats': file_info['beats']['downbeats'],
                'sections': file_info['structure']['sections']
            }
            return jsonify(export_data)

        elif export_format == 'csv':
            # Simple CSV format
            lines = ['time,type,label']
            for beat in file_info['beats']['beats']:
                is_downbeat = beat in file_info['beats']['downbeats']
                lines.append(f"{beat:.3f},{'downbeat' if is_downbeat else 'beat'},")

            for section in file_info['structure']['sections']:
                lines.append(f"{section['start']:.3f},section_start,{section['label']}")
                lines.append(f"{section['end']:.3f},section_end,{section['label']}")

            return '\n'.join(lines), 200, {'Content-Type': 'text/csv'}

        else:
            return jsonify({'error': f'Unknown format: {export_format}'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/click-track/<file_id>', methods=['GET'])
def get_click_track(file_id):
    """
    Get click track timing data.

    Returns array of click events with timing and accent info.
    """
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    file_info = analysis_results[file_id]

    if 'beats' not in file_info:
        return jsonify({'error': 'File not yet analyzed'}), 400

    beats = file_info['beats']['beats']
    downbeats = file_info['beats'].get('downbeats', [])

    clicks = beat_detector.generate_click_track_times(beats, downbeats)

    return jsonify({
        'clicks': clicks,
        'bpm': file_info['beats']['bpm']
    })


@app.route('/api/status/<file_id>', methods=['GET'])
def get_status(file_id):
    """Get the current status of a file analysis."""
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    file_info = analysis_results[file_id]
    return jsonify({
        'id': file_id,
        'status': file_info.get('status', 'unknown'),
        'filename': file_info.get('filename'),
        'duration': file_info.get('duration')
    })


@app.route('/api/delete/<file_id>', methods=['DELETE'])
def delete_file(file_id):
    """Delete an uploaded file and its analysis data."""
    if file_id not in analysis_results:
        return jsonify({'error': 'File not found'}), 404

    try:
        file_info = analysis_results[file_id]
        filepath = file_info['filepath']

        # Remove file
        if os.path.exists(filepath):
            os.remove(filepath)

        # Clear cache
        audio_processor.cleanup(file_id)

        # Remove from results
        del analysis_results[file_id]

        return jsonify({'status': 'deleted'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Create upload folder
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    # Run the app
    print("Starting Beat Grid Web App...")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)
