# Vehicle Re-ID with Uncertainty Quantification: Project Architecture & Guide

Welcome to the comprehensive architecture guide for the **Vehicle Re-ID with Uncertainty Quantification** system.

This repository is organized cleanly into **Frontend**, **Backend**, **Data/Models**, and an in-depth **Interview Preparation** study guide.

---

## 📁 Repository Directory Structure

```
vehicle-reid-uncertainty/
├── apps/
│   └── web/                   # [FRONTEND] Next.js 14 App Router, Tailwind CSS, TypeScript
│       ├── src/app/           # Pages: Dashboard (/), Search (/search), Ingest (/ingest), Datasets (/dataset)
│       └── src/lib/api.ts     # Frontend API client communicating with FastAPI
│
├── src/
│   └── reiduq/                # [BACKEND] Core Python ML & Serving Package
│       ├── serving/app.py     # FastAPI server endpoints (Search, Ingest, Feedback, Datasets)
│       ├── detection/         # YOLOv8 vehicle detection & attribute extractors (color, brand, plate)
│       ├── search/            # FAISS vector similarity engine & SQLite gallery store
│       ├── calibration/       # Conditional Temperature Scaling T(v, c) MLP
│       ├── abstention/        # Risk-bounded selective prediction & decision policies
│       └── models/            # OSNet / ResNet feature extractors and training pipelines
│
├── data/
│   └── processed/             # Exported CSV datasets (VeRi-776, video gallery entries, demo datasets)
│
├── models/
│   └── gallery/               # SQLite store.db & FAISS index files
│
├── Interview Preparation/      # [INTERVIEW GUIDE] Complete documentation for interview prep
│   ├── 01_PROJECT_OVERVIEW.md
│   ├── 02_TECH_STACK_EXPLANATION.md
│   ├── 03_MODELS_AND_CALIBRATION.md
│   ├── 04_ROUTES_AND_REQUEST_LIFECYCLE.md
│   ├── 05_TRAINING_AND_CALIBRATION_PIPELINE.md
│   ├── 06_SYSTEM_DESIGN_AND_SCALABILITY.md
│   └── 07_FREQUENT_INTERVIEW_QUESTIONS.md
│
└── README.md                  # Project overview and quickstart instructions
```

---

## 🚀 Quickstart Commands

### 1. Start FastAPI Backend:
```powershell
$env:KMP_DUPLICATE_LIB_OK='TRUE'
python -m uvicorn reiduq.serving.app:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start Next.js Frontend:
```powershell
cd apps/web
npm run dev -- -p 3000
```

Frontend runs on: `http://localhost:3000`  
Backend API runs on: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)
