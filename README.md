# Vehicle Re-Identification with Uncertainty Quantification & Calibration

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![PyTorch 2.11](https://img.shields.io/badge/PyTorch-2.11-ee4c2c.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector%20Search-yellow.svg)](https://github.com/facebookresearch/faiss)

A production-grade, uncertainty-aware Vehicle Re-Identification (Re-ID) system designed for multi-camera traffic surveillance. Unlike standard vision systems that produce uncalibrated, overconfident similarity scores, this platform introduces **Conditional Temperature Scaling $T(v, c)$** and **Risk-Bounded Selective Abstention** to guarantee high precision in mission-critical applications.

---

## 🎯 Key Capabilities & Highlights

1. **Cross-Camera Vehicle Re-Identification**:
   - Deep representation learning powered by **OSNet (Omni-Scale Network)**, capturing both coarse structural silhouettes (sedan, SUV, truck) and fine-grained visual cues (roof racks, stickers, rim patterns, grilles).
2. **Uncertainty Quantification & Calibration ($T(v, c)$)**:
   - Eliminates overconfident hallucinations during severe weather, motion blur, and mismatched camera viewpoints.
   - Temperature scaling factor $T$ is dynamically computed by an MLP conditioned on **image visibility ($v$)** and **camera pair descriptors ($c$)**.
3. **Risk-Bounded Abstention (Human-in-the-Loop)**:
   - Implements a 3-way decision boundary: `ACCEPT` (high-confidence auto-match), `REJECT` (clear non-match), or `ABSTAIN` (uncertain match routed to human operators).
   - Keeps empirical automated error rates strictly below a user-defined risk budget $\alpha$ (e.g., $\alpha \le 5\%$).
4. **Multi-Modal Video Ingestion Pipeline**:
   - Automatically ingests raw surveillance video feeds (`.mp4`, `.avi`).
   - YOLOv8 vehicle detection with multi-attribute extraction: dominant color detection (HSV histograms), brand profiling, and license plate OCR.
   - Automatically indexes deep 512-d embeddings into an in-memory **FAISS vector database**.
5. **Modern Operator Web UI**:
   - Built with Next.js 14 and Tailwind CSS.
   - Includes real-time search filtering, dataset browsing, video ingestion preview, and an interactive **Human Review Modal** that collects feedback to continually improve the system.

---

## 📁 Repository Organization

```
vehicle-reid-uncertainty/
│
├── 🌐 apps/web/              # Next.js 14 App Router frontend (dashboard, search, live ingestion)
├── ⚙️ src/reiduq/            # Backend Python package (FastAPI, YOLOv8, OSNet, FAISS, UQ math)
├── 📊 data/                  # Exported dataset CSVs (gallery_store_entries.csv, VeRi-776, demo sets)
├── 🧠 models/                # SQLite metadata store (store.db) and FAISS vector index (index.faiss)
├── 🎓 Interview Preparation/ # In-depth technical interview guides & study materials
├── 📖 docs/                  # Architecture specs, repository layout, threat models, ethics
├── 🛠️ scripts/               # Automation scripts for indexing, dataset extraction, benchmarks
├── 🧪 tests/                 # Unit, integration, property-based, and security test suites
├── 🐳 docker/                # Multi-stage Dockerfiles and Docker Compose files
└── ☁️ infra/                 # Infrastructure-as-code Terraform templates
```

> 📖 **Comprehensive Folder Guide**: For an exhaustive breakdown of every folder and its specific responsibilities, see [`docs/REPOSITORY_LAYOUT.md`](docs/REPOSITORY_LAYOUT.md).

---

## 🎓 Preparing for Interviews or Technical Presentations?

We have prepared a comprehensive, deeply detailed interview preparation series in the **[`Interview Preparation/`](Interview%20Preparation/README.md)** directory:

1. **[`01_PROJECT_OVERVIEW.md`](Interview%20Preparation/01_PROJECT_OVERVIEW.md)**: Real-world problems, mission-critical impact, why naive similarity fails.
2. **[`02_TECH_STACK_EXPLANATION.md`](Interview%20Preparation/02_TECH_STACK_EXPLANATION.md)**: Exhaustive justification of Next.js, FastAPI, FAISS, PyTorch, YOLOv8, and SQLite.
3. **[`03_MODELS_AND_CALIBRATION.md`](Interview%20Preparation/03_MODELS_AND_CALIBRATION.md)**: Deep dive into OSNet, YOLOv8, attribute extractors, and $T(v, c)$ math.
4. **[`04_ROUTES_AND_REQUEST_LIFECYCLE.md`](Interview%20Preparation/04_ROUTES_AND_REQUEST_LIFECYCLE.md)**: Complete API map and step-by-step request flow through UI, server, and storage.
5. **[`05_TRAINING_AND_CALIBRATION_PIPELINE.md`](Interview%20Preparation/05_TRAINING_AND_CALIBRATION_PIPELINE.md)**: Triplet Loss with Batch Hard Mining, calibrator optimization, and active learning.
6. **[`06_SYSTEM_DESIGN_AND_SCALABILITY.md`](Interview%20Preparation/06_SYSTEM_DESIGN_AND_SCALABILITY.md)**: City-wide production scaling, edge-to-cloud split, Kafka buffering, and vector quantization.
7. **[`07_FREQUENT_INTERVIEW_QUESTIONS.md`](Interview%20Preparation/07_FREQUENT_INTERVIEW_QUESTIONS.md)**: High-yield interview questions with comprehensive answers.

---

## ⚡ Quickstart Guide

### Prerequisites
- Python 3.10+ (Python 3.12 recommended)
- Node.js 18+ & npm
- (Optional) NVIDIA GPU with CUDA 12.x for accelerated video ingestion and inference

### 1. Backend Setup & Startup
```powershell
# Navigate to project root
cd vehicle-reid-uncertainty

# (Windows PowerShell) Prevent OpenMP library conflict
$env:KMP_DUPLICATE_LIB_OK='TRUE'

# Start the FastAPI server on port 8000
python -m uvicorn reiduq.serving.app:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API runs at: `http://localhost:8000`
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`

### 2. Frontend Setup & Startup
```powershell
# In a new terminal window:
cd vehicle-reid-uncertainty/apps/web

# Install dependencies (first time only)
npm install

# Start Next.js development server
npm run dev -- -p 3000
```
* Web Dashboard opens at: `http://localhost:3000`

---

## 📊 Dataset Exports Available in Repository
Pre-processed tabular datasets are included in `data/processed/`:
* `gallery_store_entries.csv`: 11,630+ records containing vehicle sightings, colors, body types, brands, and license plates.
* `veri776_all.csv`, `veri776_gallery.csv`, `veri776_query.csv`, `veri776_train.csv`: Full benchmark sets from the VeRi-776 multi-camera dataset.
* `demo_all.csv`: Minimal verification dataset for rapid unit testing.

---

## 🛡️ License & Compliance
This software is provided for research and authorized surveillance infrastructure audits. See [`docs/ethics.md`](docs/ethics.md) and [`docs/threat_model.md`](docs/threat_model.md) for ethical deployment boundaries and privacy compliance guidelines.
