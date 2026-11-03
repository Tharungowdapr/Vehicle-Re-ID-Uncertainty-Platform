# 🚘 Vehicle Re-ID Uncertainty Platform

> **Uncertainty-calibrated, multi-camera vehicle re-identification with risk-bounded selective prediction (`MATCH / UNCERTAIN / REJECT`), a 10,000-record CSV dataset pipeline, and an interactive web management console.**

[![CI](https://github.com/Tharungowdapr/-Vehicle-Re-ID-Uncertainty-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/Tharungowdapr/-Vehicle-Re-ID-Uncertainty-Platform/actions/workflows/ci.yml)
[![Security](https://github.com/Tharungowdapr/-Vehicle-Re-ID-Uncertainty-Platform/actions/workflows/security.yml/badge.svg)](https://github.com/Tharungowdapr/-Vehicle-Re-ID-Uncertainty-Platform/actions/workflows/security.yml)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA INGESTION & PROCESSING                         │
│                                                                             │
│   Video / RTSP ──▶ YOLOv8 / RF-DETR ──▶ Attribute Extractor (Color/Plate)   │
│   ZIP / Images ──▶ Dataset Processor ──▶ CSV Manifests (veri776_*.csv)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      FEATURE EXTRACTION & CALIBRATION                       │
│                                                                             │
│   Visibility Estimator ──▶ OSNet / ResNet-IBN Feature Encoder (512-dim)     │
│   Camera Descriptor    ──▶ Conditional Temperature Scaling T(v, c)          │
│   Calibrator MLP       ──▶ Calibrated Probability ──▶ Risk-Bounded Gate     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       ABSTENTION & DECISION LAYER                           │
│                                                                             │
│   Confidence ≥ θ_high  ──▶  ✅ MATCH   (Autonomous Acceptance)              │
│   θ_low ≤ Conf < θ_high ──▶  ⚠️  UNCERTAIN (Escalate to Human Review Queue) │
│   Confidence < θ_low   ──▶  ❌ REJECT  (Autonomous Non-Match)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                          SERVING & WEB INTERFACES                           │
│                                                                             │
│   FastAPI REST API (:8000) ── /v1/search/plate  /v1/ingest/video  /v1/review│
│   Next.js Console  (:3000) ── Dashboard · Search Console · Ingestion · Data │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features & Capabilities

| Feature | Detail |
|---|---|
| **10k-Record Dataset Pipeline** | Synthetic VeRi-776 generator + video ingestion pipeline; outputs `veri776_all/train/query/gallery.csv` and `gallery_store_entries.csv`. |
| **Interactive Console** | Modern dark-slate UI built with Next.js 14, Tailwind CSS, and Lucide icons — no visual slop or neon gradients. |
| **Multi-Modal Video Ingestion** | Upload real MP4/AVI videos; automatically extracts bounding boxes, dominant color (HSV), brand profile, and license plate OCR. |
| **Conditional Temperature Scaling $T(v, c)$** | Dynamically scales confidence conditioned on image visibility ($v$) and camera pair divergence ($c$). |
| **Risk-Bounded Abstention** | Bounded false-match rates under formal risk constraint ($\alpha \le 0.05$); routes ambiguous cases to human adjudication. |
| **Human Review & Active Learning** | Interactive verification modal with vehicle photo rendering; collects operator feedback for continual model refinement. |
| **Sub-Millisecond Vector Search** | In-memory FAISS vector indexing combined with SQLite attribute filtering for instant query responses. |

---

## 🛠️ Makefile Command Reference

All primary developer and operational tasks are automated through the root `Makefile`:

```bash
make help          # List all available commands and descriptions
make setup         # Install Python + Node dependencies, set up pre-commit hooks
make run           # Start FastAPI backend (:8000) and Next.js frontend (:3000) concurrently
make serve         # Start FastAPI backend server on http://localhost:8000
make web           # Start Next.js web application on http://localhost:3000
make test          # Run fast unit test suite (no GPU needed)
make test-all      # Run complete test suite including integration, regression, and security tests
make lint          # Run ruff + black + lint-imports checks
make format        # Automatically fix code formatting (ruff --fix + black)
make typecheck     # Strict static type check via mypy
make security      # Run bandit static security analysis + pip-audit dependency audit
make benchmark     # Measure calibrator inference latency, parameter counts, and FLOPs
make docker-up     # Launch Docker Compose stack (API + Web Console + Volume mounts)
make docker-down   # Stop Docker Compose containers and tear down volumes
make train         # Train vehicle Re-ID encoder backbone (OSNet / ResNet)
make train-safe    # Overnight training loop with automatic checkpoint resume on OOM
make calibrate     # Train the conditional temperature scaling MLP T(v, c) on validation split
make evaluate      # Evaluate trained and calibrated system (ECE, CMC, mAP, selective risk)
make experiment    # Run an experiment end-to-end (e.g. make experiment CFG=configs/experiment/A_indist.yaml)
make sweep         # Run full A through K experiment ablation matrix
make figures       # Regenerate publication and report figures (F1–F6) from committed result JSONs
make clean         # Clean up build artifacts, caches, and temporary files
```

---

## 📜 Scripts Reference

| Script | How to Run | What It Does |
|---|---|---|
| `generate_veri_dataset.py` | `python scripts/generate_veri_dataset.py --train 5000 --query 1000 --gallery 4000` | Generates synthetic VeRi-776 CSV dataset manifests. |
| `process_dataset.py` | `python scripts/process_dataset.py --zip dataset.zip --name my_dataset` | Ingests an image ZIP or folder into a normalized CSV manifest. |
| `build_gallery_index.py` | `python scripts/build_gallery_index.py --csv data/processed/veri776_all.csv` | Embeds images and populates the FAISS vector index + SQLite metadata store. |
| `prepare_splits.py` | `python scripts/prepare_splits.py` | Generates leakage-free train/query/gallery splits with identity-disjoint validation. |
| `mine_occluders.py` | `python scripts/mine_occluders.py` | Mines realistic occlusion patches (poles, obstacles) from training images. |
| `benchmark.py` | `python scripts/benchmark.py` | Benchmarks calibrator throughput and latency percentiles (p50, p95). |
| `setup.sh` | `bash scripts/setup.sh` | One-shot setup script for Linux/macOS environments. |
| `train_safe.sh` | `bash scripts/train_safe.sh configs/experiment/A_indist.yaml` | Safe overnight training loop with GPU thermal pause and automatic resume. |
| `deploy.sh` | `bash scripts/deploy.sh staging` | Terraform deployment script for staging and production environments. |
| `pin_base_images.sh` | `bash scripts/pin_base_images.sh` | Re-pins Docker base image SHA256 digests for reproducible builds. |

---

## 🌐 API Endpoints Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check returning model and index status. |
| `GET` | `/v1/search/plate` | **Core Sighting Search**: FAISS vector similarity + SQLite attribute search. |
| `POST` | `/v1/ingest/video` | **Video Ingestion Pipeline**: Decodes video, runs YOLOv8, extracts color/brand/plate, indexes into FAISS. |
| `POST` | `/v1/reid/predict` | Embedding generation & calibrated probability inference on image pairs. |
| `GET` | `/v1/dataset/list` | List all processed dataset CSVs available on disk. |
| `GET` | `/v1/dataset/{name}/rows` | Paginated row retrieval from dataset CSVs. |
| `GET` | `/v1/dataset/search` | Fast attribute search across dataset CSVs and SQLite. |
| `GET` | `/api/files/{rel_path}` | Secure static file server for cropped vehicle images. |
| `POST` | `/v1/review/feedback` | **Active Learning Feedback**: Records human operator confirmation/rejection decisions. |

Full interactive Swagger documentation is available at `http://localhost:8000/docs` on a running server.

---

## 🎓 Preparing for Interviews or Technical Presentations?

We provide a dedicated technical study guide in the **[`Interview Preparation/`](Interview%20Preparation/README.md)** folder:

1. **[`01_PROJECT_OVERVIEW.md`](Interview%20Preparation/01_PROJECT_OVERVIEW.md)**: Real-world problems, mission-critical impact, why naive similarity fails.
2. **[`02_TECH_STACK_EXPLANATION.md`](Interview%20Preparation/02_TECH_STACK_EXPLANATION.md)**: In-depth justification of Next.js, FastAPI, FAISS, PyTorch, YOLOv8, and SQLite.
3. **[`03_MODELS_AND_CALIBRATION.md`](Interview%20Preparation/03_MODELS_AND_CALIBRATION.md)**: OSNet omni-scale architecture, attribute extractors, and $T(v, c)$ math.
4. **[`04_ROUTES_AND_REQUEST_LIFECYCLE.md`](Interview%20Preparation/04_ROUTES_AND_REQUEST_LIFECYCLE.md)**: Complete API map and step-by-step request flow through UI, server, and storage.
5. **[`05_TRAINING_AND_CALIBRATION_PIPELINE.md`](Interview%20Preparation/05_TRAINING_AND_CALIBRATION_PIPELINE.md)**: Triplet Loss with Batch Hard Mining, calibrator optimization, and active learning.
6. **[`06_SYSTEM_DESIGN_AND_SCALABILITY.md`](Interview%20Preparation/06_SYSTEM_DESIGN_AND_SCALABILITY.md)**: City-wide production scaling, edge-to-cloud split, Kafka buffering, and vector quantization.
7. **[`07_FREQUENT_INTERVIEW_QUESTIONS.md`](Interview%20Preparation/07_FREQUENT_INTERVIEW_QUESTIONS.md)**: High-yield interview questions with comprehensive answers.
8. **[`docs/FILE_MAP.md`](docs/FILE_MAP.md)**: Exhaustive, file-by-file directory architecture reference.

---

## ⚡ Quickstart Guide

### 1. Backend Startup
```powershell
cd vehicle-reid-uncertainty

# Prevent OpenMP library conflict on Windows
$env:KMP_DUPLICATE_LIB_OK='TRUE'

# Start FastAPI backend on port 8000
python -m uvicorn reiduq.serving.app:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API: `http://localhost:8000`
* Swagger Docs: `http://localhost:8000/docs`

### 2. Frontend Startup
```powershell
cd vehicle-reid-uncertainty/apps/web

# Install dependencies (first time only)
npm install

# Start Next.js development server
npm run dev -- -p 3000
```
* Web Console: `http://localhost:3000`

---

## 🔒 Security & Ethics

- Container runs as non-root user `uid 10001`, read-only rootfs, with all Linux capabilities dropped.
- `UNCERTAIN` results are **never** used for automated action — they are always escalated to human operators.
- Detailed ethics and security specifications can be found in [`docs/threat_model.md`](docs/threat_model.md) and [`docs/ethics.md`](docs/ethics.md).

---

## 📄 License
MIT — see [LICENSE](LICENSE) for details.
