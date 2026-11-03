# Repository Architecture & Directory Reference Guide

This document provides a comprehensive, exhaustive breakdown of every folder and subsystem in the **Vehicle Re-ID with Uncertainty Quantification** project.

> 📚 **Interview Study Note**: If you are preparing for technical interviews, system design reviews, or viva presentations, review this file alongside the materials in [`Interview Preparation/`](../Interview%20Preparation/README.md).

---

## 🏗️ Clean Project Organization Map

The repository is modularly structured into core functional zones:

```
vehicle-reid-uncertainty/
│
├── 🌐 apps/web/                    [FRONTEND APPLICATION]
│   └── Next.js 14 App Router, TypeScript, Tailwind CSS client dashboard and operator tooling.
│
├── ⚙️ src/reiduq/                  [BACKEND & ML ENGINE]
│   └── Python ML library, FastAPI microservice, computer vision pipelines, and UQ math.
│
├── 📊 data/                        [DATASETS & SIGHTING RECORDS]
│   └── Raw, processed, and full CSV exports of vehicle gallery sights and annotations.
│
├── 🧠 models/                      [MODEL WEIGHTS & PERSISTENCE]
│   └── FAISS similarity index (.faiss) and SQLite relational gallery store (store.db).
│
├── 🎓 Interview Preparation/       [IN-DEPTH INTERVIEW STUDY SYSTEM]
│   └── Comprehensive guides on tech stack, models, calibration, routes, training, and system design.
│
├── 📖 docs/                        [SPECIFICATIONS & ARCHITECTURE DOCS]
│   └── Technical architecture, threat modeling, ethics, data card, and API schemas.
│
├── 🛠️ scripts/                     [AUTOMATION & ML UTILITIES]
│   └── Dataset generation, index building, benchmarking, and setup shell scripts.
│
├── 🧪 tests/                       [TEST SUITES & QUALITY ASSURANCE]
│   └── Unit, integration, regression, property-based, and security tests.
│
├── 🐳 docker/                      [CONTAINERIZATION & DEPLOYMENT]
│   └── Dockerfiles for frontend, backend, and multi-container Docker Compose.
│
├── ☁️ infra/                       [INFRASTRUCTURE AS CODE]
│   └── Terraform configurations for production cloud provisioning.
│
└── ⚙️ configs/                     [EXPERIMENT CONFIGURATIONS]
    └── YAML parameter files for ablation studies, training baselines, and model configs.
```

---

## 🔍 Detailed Breakdown of Every Folder & Its Job

### 1. `apps/web/` — Modern Web Frontend
* **Primary Language**: TypeScript, React, Next.js 14 (App Router), Tailwind CSS.
* **Core Responsibilities**:
  * **Dashboard (`apps/web/src/app/page.tsx`)**: High-level telemetry, calibration overview, mathematical formulation of $T(v, c)$, and risk-bounded policy stats.
  * **Search Interface (`apps/web/src/app/search/page.tsx`)**: Visual & attribute search (plate, color, vehicle type, brand) against indexed sightings, with calibrated confidence tags (`ACCEPT`, `REJECT`, `ABSTAIN`).
  * **Video Ingestion Interface (`apps/web/src/app/ingest/page.tsx`)**: Real-time video upload interface with live detection preview, attribute parsing (color, brand, plate OCR), and immediate gallery indexing.
  * **Dataset Explorer (`apps/web/src/app/dataset/page.tsx`)**: Paginated visual gallery browser supporting VeRi-776, video uploads, and demo vehicle datasets.
  * **Human Review Modal**: Interactive active-learning feedback modal rendering cropped vehicle imagery, allowing operators to verify matches and submit feedback to the backend.
  * **API Client Layer (`apps/web/src/lib/api.ts`)**: Strongly-typed HTTP wrapper communicating with the FastAPI backend.

---

### 2. `src/reiduq/` — Backend Core & Machine Learning Engine
* **Primary Language**: Python 3.12, PyTorch, FastAPI, OpenCV, FAISS.
* **Sub-Packages & Their Specific Jobs**:
  * **`serving/app.py`**: The central FastAPI REST application. Houses all endpoints for plate search, video ingestion, dataset queries, and human review feedback.
  * **`detection/`**:
    * `yolov8n.pt`: Real-time bounding box detector for cars, buses, and trucks.
    * `attributes.py`: Heuristic & computer vision feature extractors — HSV histogram color analysis, aspect-ratio brand profiling, and license plate morphological filters.
  * **`search/`**:
    * `gallery_store.py`: High-performance SQLite engine managing metadata (vehicle color, type, brand, plate text, camera IDs, image filepaths).
    * `query_pipeline.py`: Search coordinator orchestrating text attribute queries and FAISS vector matching.
  * **`calibration/`**:
    * `conditional_temperature.py`: Implements $T(v, c)$, the neural multi-layer perceptron that calculates temperature scaling dynamically conditioned on image quality and camera pair features.
    * `global_temperature.py`, `platt.py`, `vector_scaling.py`: Baseline calibration implementations used for comparative benchmarks.
  * **`abstention/`**:
    * `policy.py` & `decision.py`: Computes risk-bounded threshold bounds ($\tau_{\text{high}}, \tau_{\text{low}}$) to guarantee automated error rates remain strictly below the designated risk budget $\alpha$.
  * **`models/`**:
    * Model architectures (OSNet omni-scale networks, ResNet baselines) and training routines (`training/trainer.py`, `losses/triplet.py`).
  * **`visibility/`**:
    * Evaluates image sharpness, contrast, illumination variance, and occlusion metrics to produce visibility score $v \in [0, 1]$.

---

### 3. `data/` — Datasets & CSV Exports
* **`data/processed/`**: Holds clean, ready-to-use tabular data:
  * `gallery_store_entries.csv`: Full database export (11,630+ records) containing vehicle sightings, colors, brands, and license plates.
  * `veri776_all.csv`, `veri776_train.csv`, `veri776_gallery.csv`, `veri776_query.csv`: VeRi-776 benchmark partitions.
  * `demo_all.csv`, `raw_all.csv`: Minimal test sets for rapid integration testing.

---

### 4. `models/` — Model Weights & Persistence
* **`models/gallery/`**:
  * `store.db`: SQLite database holding vehicle metadata and human review audit trails.
  * `index.faiss`: Binary FAISS vector index storing 512-dimensional visual embeddings for sub-millisecond similarity search.
* **`models/calibrator.pt`**: Serialized PyTorch weights for the trained $T(v, c)$ conditional temperature MLP.

---

### 5. `Interview Preparation/` — In-Depth Technical Study System
* Contains comprehensive, non-trivial documentation structured for interview prep:
  * `01_PROJECT_OVERVIEW.md`: Problem statement, mission-critical impact, why naive models fail.
  * `02_TECH_STACK_EXPLANATION.md`: Exhaustive defense of every technology choice.
  * `03_MODELS_AND_CALIBRATION.md`: Deep learning math, OSNet architecture, $T(v, c)$ calibration equations, and UQ metrics (ECE, Brier Score).
  * `04_ROUTES_AND_REQUEST_LIFECYCLE.md`: Complete API route table and request/response lifecycles.
  * `05_TRAINING_AND_CALIBRATION_PIPELINE.md`: Triplet loss, cross-entropy identity loss, temperature MLP optimization, and active learning loop.
  * `06_SYSTEM_DESIGN_AND_SCALABILITY.md`: Production architecture, edge-to-cloud video streaming, distributed vector search, and Kafka buffering.
  * `07_FREQUENT_INTERVIEW_QUESTIONS.md`: 15+ comprehensive technical interview Q&A.

---

### 6. `docs/` — Technical Specifications & Documentation
* `architecture.md`: Low-level design notes and pipeline diagrams.
* `api.md`: REST API endpoint specification.
* `data_card.md`: Dataset provenance, licensing, and privacy disclosures.
* `threat_model.md`: Adversarial vulnerability analysis (physical vehicle patches, camera tampering, data poisoning).
* `ethics.md`: Ethical surveillance guidelines and algorithmic bias mitigation.
* `reproducibility.md`: Exact instructions to reproduce benchmark numbers.

---

### 7. `scripts/` — Automation & Operational Tooling
* `build_gallery_index.py`: CLI tool to scan a folder of vehicle crops, extract OSNet embeddings, and build `index.faiss`.
* `generate_veri_dataset.py` & `prepare_splits.py`: Scripts that parse raw camera captures into structured train/query/gallery splits.
* `benchmark.py`: Runs automated inference benchmarks evaluating latency, throughput, and memory consumption.
* `setup.sh`, `train_safe.sh`, `deploy.sh`: Shell utilities for environment initialization and automated training pipelines.

---

### 8. `tests/` — Multi-Tier Quality Assurance
* `unit/`: Unit tests for loss functions, calibration equations, and attribute extractors.
* `integration/`: End-to-end API tests verifying FastAPI search and ingestion flows.
* `property/`: Hypothesis-based property tests checking mathematical invariants (e.g., probabilities strictly in $[0, 1]$).
* `security/`: Tests validating file upload paths, prevention of directory traversal attacks, and SQL injection safety.

---

### 9. `docker/` & `infra/` — Deployment & Infrastructure
* `docker/Dockerfile`: Multi-stage build for the FastAPI backend with PyTorch and OpenCV.
* `docker/Dockerfile.web`: Node.js container for the Next.js frontend.
* `docker/docker-compose.yml`: Single-command local orchestration spinning up frontend, backend, and volume mounts.
* `infra/`: Terraform scripts defining AWS/GCP cloud resources (VPC, ECS/GKE clusters, S3 buckets).
