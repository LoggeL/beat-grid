# Beat Grid Web App

A web application that analyzes audio files to detect beats, BPM, and song structure (chorus, verse, bridge, etc.), displaying them in an interactive beat grid visualization.

## Features

- **Audio Upload**: Drag-and-drop or click to upload audio files (MP3, WAV, FLAC, OGG, M4A, AAC)
- **Beat Detection**: Automatic BPM and beat detection using librosa
- **Waveform Visualization**: Interactive waveform display with zoom and scroll
- **Beat Grid**: Visual overlay of detected beats with downbeat highlighting
- **Song Structure Analysis**: Automatic detection of sections (intro, verse, chorus, bridge, outro)
- **Click Track**: Synced metronome with adjustable volume
- **Beat Adjustment**: Manual BPM override, tap tempo, and beat offset adjustment
- **Export**: Export analysis data as JSON or CSV

## Project Structure

```
beat-grid-app/
├── backend/
│   ├── app.py                 # Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── audio_processor.py     # Audio analysis functions
│   ├── beat_detector.py       # BPM & beat detection
│   └── structure_analyzer.py  # Song structure detection
├── frontend/
│   ├── index.html             # Main HTML page
│   ├── css/
│   │   └── styles.css         # Dark theme styles
│   └── js/
│       ├── app.js             # Main application logic
│       ├── audio-player.js    # Audio playback & click track
│       ├── waveform.js        # Waveform visualization
│       ├── beat-grid.js       # Beat grid rendering
│       ├── structure.js       # Structure timeline
│       └── api.js             # Backend API calls
└── README.md
```

## Installation

### Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

### Setup

1. Clone or download this project

2. Install Python dependencies:
   ```bash
   cd beat-grid-app/backend
   pip install -r requirements.txt
   ```

3. (Optional) For better beat detection, install madmom:
   ```bash
   pip install madmom
   ```
   Note: madmom provides more accurate beat detection but requires additional setup. The app will fall back to librosa if madmom is not available.

## Running the Application

1. Start the backend server:
   ```bash
   cd beat-grid-app/backend
   python app.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Upload an audio file by dragging and dropping or clicking the upload zone.

## Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` / `→` | Seek backward/forward 5 seconds |
| `+` / `-` | Zoom in/out |
| `C` | Toggle click track |
| `T` | Tap tempo |
| `?` | Show/hide keyboard shortcuts |

### Controls

- **Play/Pause/Stop**: Transport controls for audio playback
- **Click Track**: Enable metronome synced to detected beats
- **Zoom**: Adjust waveform zoom level
- **BPM**: Manual BPM override (detected value shown initially)
- **Offset**: Shift beat grid phase in milliseconds
- **x2 / /2**: Double or halve the detected BPM
- **Tap**: Tap tempo to set custom BPM
- **Export**: Download analysis as JSON or CSV

### Structure Timeline

Click on any section in the structure timeline to jump to that part of the song. Sections are color-coded:
- Green: Intro
- Blue: Verse
- Orange: Chorus
- Purple: Bridge
- Gray: Outro

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload audio file |
| `/api/analyze/{id}` | GET | Get analysis results |
| `/api/waveform/{id}` | GET | Get waveform data |
| `/api/update-beats/{id}` | POST | Update beat positions |
| `/api/click-track/{id}` | GET | Get click track timing |
| `/api/export/{id}` | GET | Export analysis data |
| `/api/delete/{id}` | DELETE | Delete uploaded file |

## Technical Details

### Beat Detection

The app uses librosa's beat tracking algorithm by default. If madmom is installed, it uses the more accurate RNN-based beat processor.

### Structure Analysis

Song structure is detected using:
1. Feature extraction (chroma, MFCC, spectral contrast)
2. Self-similarity matrix computation
3. Agglomerative clustering for segment boundaries
4. Heuristic labeling based on position and repetition

### Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Requires Web Audio API support for audio playback and click track generation.

## Troubleshooting

**Audio won't play**: Make sure your browser supports Web Audio API and the audio format.

**Analysis takes too long**: Large files or high sample rates may take longer. The app downsamples to 22050 Hz for analysis.

**Beat detection is inaccurate**: Try using tap tempo to set the correct BPM, then adjust the offset to align beats.

**Structure detection is wrong**: Structure detection is algorithmic and may not always match human perception. The colored sections are estimates based on musical features.

## License

MIT License
