# 🎵 Beat Grid

<div align="center">

![Beat Grid](https://img.shields.io/badge/Beat-Grid-e94560?style=for-the-badge&logo=music&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-4ecca3?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-0f3460?style=for-the-badge&logo=flask&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla-JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)

**Eine Web-App zur Audio-Analyse mit Beat-Erkennung, BPM-Detection und Song-Struktur-Visualisierung**

*Für Jonas* 🎧

</div>

---

## ✨ Features

| Feature | Beschreibung |
|---------|--------------|
| 🎚️ **Audio Upload** | Drag & Drop oder Click – unterstützt MP3, WAV, FLAC, OGG, M4A, AAC |
| 🥁 **Beat Detection** | Automatische BPM- und Beat-Erkennung mit librosa |
| 📊 **Waveform** | Interaktive Wellenform-Darstellung mit Zoom & Scroll |
| 🎯 **Beat Grid** | Visuelle Beat-Marker mit Downbeat-Highlighting |
| 🏗️ **Song Structure** | Automatische Erkennung von Intro, Verse, Chorus, Bridge, Outro |
| 🔊 **Click Track** | Synchrones Metronom mit einstellbarer Lautstärke |
| ⚙️ **Beat Adjustment** | Manuelles BPM, Tap Tempo, Offset-Anpassung |
| 💾 **Export** | JSON oder CSV Export der Analyse-Daten |

---

## 🚀 Schnellstart

### 1️⃣ Dependencies installieren

```bash
cd backend
pip install -r requirements.txt
```

### 2️⃣ Server starten

```bash
python app.py
```

### 3️⃣ Browser öffnen

```
http://localhost:5000
```

### 4️⃣ Audio-Datei reinziehen und los geht's! 🎉

---

## ⌨️ Keyboard Shortcuts

| Taste | Aktion |
|:-----:|--------|
| `Space` | ▶️ Play / Pause |
| `←` `→` | ⏪ ⏩ 5 Sekunden vor/zurück |
| `+` `-` | 🔍 Zoom rein/raus |
| `C` | 🔊 Click Track an/aus |
| `T` | 👆 Tap Tempo |
| `?` | ❓ Hilfe anzeigen |

---

## 🎨 Song-Struktur Farben

```
🟢 Grün    → Intro
🔵 Blau    → Verse
🟠 Orange  → Chorus
🟣 Lila    → Bridge
⚫ Grau    → Outro
```

---

## 📁 Projekt-Struktur

```
beat-grid/
├── 🐍 backend/
│   ├── app.py                 # Flask Server
│   ├── audio_processor.py     # Audio-Verarbeitung
│   ├── beat_detector.py       # BPM & Beat Detection
│   ├── structure_analyzer.py  # Song-Struktur Analyse
│   └── requirements.txt       # Python Dependencies
│
└── 🌐 frontend/
    ├── index.html             # Hauptseite
    ├── css/styles.css         # Dark Theme Styling
    └── js/
        ├── app.js             # Main App Logic
        ├── audio-player.js    # Web Audio API Player
        ├── waveform.js        # Waveform Canvas
        ├── beat-grid.js       # Beat Grid Overlay
        ├── structure.js       # Struktur Timeline
        └── api.js             # Backend API Calls
```

---

## 🔧 API Endpoints

| Endpoint | Method | Beschreibung |
|----------|:------:|--------------|
| `/api/upload` | `POST` | Audio-Datei hochladen |
| `/api/analyze/{id}` | `GET` | Analyse starten/abrufen |
| `/api/waveform/{id}` | `GET` | Waveform-Daten holen |
| `/api/update-beats/{id}` | `POST` | Beats manuell anpassen |
| `/api/click-track/{id}` | `GET` | Click Track Timing |
| `/api/export/{id}` | `GET` | Daten exportieren |

---

## 🧠 Technische Details

### Beat Detection
- Nutzt **librosa** für Beat-Tracking
- Optional: **madmom** für noch genauere RNN-basierte Erkennung

### Struktur-Analyse
1. Feature Extraction (Chroma, MFCC, Spectral Contrast)
2. Self-Similarity Matrix
3. Agglomerative Clustering
4. Heuristisches Labeling

### Browser Support
Chrome ✅ | Firefox ✅ | Safari ✅ | Edge ✅

---

## 🐛 Troubleshooting

| Problem | Lösung |
|---------|--------|
| Audio spielt nicht | Browser mit Web Audio API Support nutzen |
| Analyse dauert lang | Große Dateien brauchen mehr Zeit (Downsampling auf 22050 Hz) |
| BPM stimmt nicht | Tap Tempo nutzen + Offset anpassen |
| Struktur falsch erkannt | Ist algorithmisch – manuelle Anpassung ggf. nötig |

---

<div align="center">

## 📜 Lizenz

MIT License

---

Made with ❤️ and 🎵

*Viel Spaß beim Beats analysieren, Jonas!* 🎧🔥

</div>
