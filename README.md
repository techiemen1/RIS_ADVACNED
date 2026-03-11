# 🏥 RIS-iPACX: Premium Radiology Information System

A high-performance, medical-grade Radiology Information System (RIS) and Reporting platform designed for modern diagnostic workflows.

## 🚀 Key Features

### 🎙️ Advanced Radiology Dictation Engine
*   **Medical vocabulary steering**: Injected with 500+ specialized terms (CT, MRI, X-ray, USG, MSK, Paediatrics).
*   **Smart Expansion**: Automated expansion of medical shortcuts (e.g., "calc" → "calcification", "NAD" → "No Abnormality Detected").
*   **Indian Radiology Context**: Pre-configured support for localized terminology (PUJ, VUJ, KUB, etc.).
*   **Low Latency**: Real-time WebSocket-based speech recognition using the Vosk engine.

### 📄 Premium Report Editor
*   **International Standards**: Layout optimized for clarity, professional typography, and legal compliance.
*   **Dynamic Auto-Logic**: Automatic report title generation (e.g., "CT CHEST RADIOLOGY REPORT") based on study metadata.
*   **Pixel-Perfect Printing**: Professional header repetition on multi-page reports with zero-whitespace optimization.
*   **DICOM Integration**: Seamless 4-layer waterfall fetching for patient demographics and images.

### 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Tiptap (Rich Text), Tailwind CSS.
*   **Backend**: Node.js, Express, PostgreSQL.
*   **AI/STT**: Vosk Speech Recognition (Self-hosted).
*   **Viewer**: Integrated OHIF-based DICOM viewer.

## 📦 Installation & Setup

### 1. Requirements
*   Node.js (v18+)
*   Python (v3.9+)
*   PostgreSQL
*   Vosk Model (en-in-0.5)

### 2. Dictation Server Setup
```bash
# Navigate to root
pip install -r requirements.txt
python vosk_server.py
```

### 3. Frontend & Backend
```bash
# Backend
cd risbackend && npm install && npm start

# Frontend
cd risfrontend && npm install && npm run dev
```

## 📖 Using the Dictation Engine
The system uses a centralized `radiology_dictionary.json` as the source of truth. 
*   To add new vocabulary: Edit the `modalities` or `impressions_findings` arrays.
*   To add new shortcuts: Add an entry to the `voice_variants` or `expansions` objects.

---
*Developed with precision for Radiology Professionals.*
# RIS_ADVACNED
