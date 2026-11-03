# 📁 Exhaustive File Map & Directory Architecture Guide

This document provides a comprehensive, file-by-file breakdown of the entire **Vehicle Re-ID with Uncertainty Quantification** platform: what each file does, why it exists, and how all components interact.

---

## 🗺️ System Overview & High-Level Architecture

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

## 1. Project Root Directory

| Path | What / Why | Purpose & When to Touch |
|---|---|---|
| `pyproject.toml` | Single source of truth for Python dependencies, build system, tool configurations (`ruff`, `black`, `mypy`, `pytest`, test coverage gates, and package metadata). | Adding a new Python dependency or adjusting linter/formatter rules. |
| `Makefile` | Central CLI automation hub with 20+ targets (`make run`, `make test`, `make lint`, `make benchmark`, `make train-safe`). | Adding or modifying repetitive developer workflows. |
| `.env.example` | Template documenting all environment variables with default values and descriptions. | Adding new configuration knobs (e.g., Redis URLs, model paths, port numbers). |
| `.pre-commit-config.yaml` | Git pre-commit hooks executing `ruff`, `black`, `mypy`, and security checks before every commit. | Adding git commit security rules. |
| `pnpm-workspace.yaml` | Defines monorepo workspace configurations including `apps/*`. | Adding a new frontend or micro-app. |
| `yolov8n.pt` | Pretrained YOLOv8 nano model weights used for fast real-time vehicle bounding-box detection. | Upgrading the object detector backbone. |

---

## 2. `src/reiduq/` — Backend Core & Machine Learning Engine

### `src/reiduq/core/` — Infrastructure & Core Primitives
| Path | What / Why |
|---|---|
| `types.py` | Immutable dataclasses that every layer is typed against (`Sample`, `BoundingBox`, `CalibratedPrediction`, `RiskBound`). |
| `config.py` | Pydantic schemas, YAML inheritance, CLI argument overrides, and SHA-256 config hashing. `extra="forbid"` turns configuration typos into instant errors. |
| `settings.py` | Environment-variable driven runtime configurations (`MODEL_DIR`, `RATE_LIMIT`, `PORT`). No secret is ever hardcoded. |
| `registry.py` | String-to-class dependency registry enabling configs to name backbones and calibrators without import coupling. |
| `paths.py` | Safe path resolution utility ensuring file containment and preventing directory traversal attacks. |
| `seeding.py` | Deterministic random number generator seeding across Python, NumPy, PyTorch, and CUDA workers. |
| `logging.py` | High-performance structured JSON logging (`structlog`) attaching `run_id` and `timestamp` to every log line. |
| `exceptions.py` | Strongly-typed domain error hierarchy (`ReIDError`, `SplitLeakageError`, `CalibrationError`). |

### `src/reiduq/data/` — Data Ingestion & Protocols
| Path | What / Why |
|---|---|
| `base.py` | `Sample` record and abstract base class for dataset adapters. |
| `veri776.py` | VeRi-776 dataset adapter parsing vehicle identity, camera ID, and frame timestamp from filenames. |
| `veriwild.py` | VERI-Wild adapter reading identities and cameras from list files. |
| `dataset_processor.py` | Ingestion pipeline converting raw image folders/ZIPs into normalized CSV manifests. |
| `torch_dataset.py` | `ReIDImageDataset` remapping vehicle IDs to contiguous labels for classifier heads. |
| `transforms.py` | Image augmentations (normalization, resizing, random horizontal flip). |
| `splits.py` | **Correctness-critical**: Builds leakage-free train/validation/test manifests and verifies that vehicle identities never cross partitions. |
| `samplers.py` | PK Identity Sampler guaranteeing $P$ identities with $K$ instances per mini-batch for triplet loss. |
| `occlusion/` | Occlusion simulation bank (`occluder_bank.py`, `compositor.py`, `geometry.py`) creating realistic synthetic obstacles (buses, poles, walls). |

### `src/reiduq/detection/` — Vehicle Detection & Attribute Extraction
| Path | What / Why |
|---|---|
| `base.py` | Abstract interface for object detectors. |
| `yolov8.py` | Ultralytics YOLOv8 wrapper filtering vehicles (`car`, `bus`, `truck`) with confidence thresholding. |
| `rfdetr.py` | RF-DETR transformer-based detector implementation. |
| `attributes.py` | **Multi-Attribute Extractor**: HSV color histogram classifier (8 palettes), aspect-ratio vehicle brand profiler, and morphological license plate OCR cropper. |

### `src/reiduq/visibility/` — Image Quality & Occlusion Estimation
| Path | What / Why |
|---|---|
| `estimator.py` | Calculates scalar visibility score $v \in [0, 1]$ based on image sharpness, contrast, and segmentation mask coverage. |
| `parts.py` | 6-region spatial visibility vector indicating *which* parts of the vehicle are occluded (front, rear, roof, sides). |
| `bands.py` | Occlusion bucketing (O0 to O4) for stratified performance benchmarking under severe weather. |

### `src/reiduq/calibration/` — Uncertainty Quantification & Calibrators
| Path | What / Why |
|---|---|
| `base.py` | `BaseCalibrator` interface defining parameters and latency overhead. |
| `raw.py` | Baseline uncalibrated cosine similarity / softmax. |
| `global_temperature.py` | Single scalar temperature scaling (Guo et al. 2017) baseline. |
| `platt.py`, `vector_scaling.py` | Standard post-hoc Platt logistic scaling and vector scaling baselines. |
| `conditional_temperature.py` | **The Core Method**: Multi-layer perceptron predicting $T(v, c)$ dynamically conditioned on visibility $v$ and camera pair descriptor $c$. |
| `features.py` | Assembles the conditioning feature vector for the calibrator network. |
| `camera_descriptor.py` | Label-free camera domain descriptor encoding lighting, angle, and camera divergence. |
| `mc_dropout.py`, `deep_ensemble.py`, `evidential.py` | Bayesian and evidential uncertainty baselines for benchmark comparisons. |

### `src/reiduq/abstention/` — Risk-Bounded Selective Prediction
| Path | What / Why |
|---|---|
| `policy.py` | Optimal threshold search guaranteeing empirical error rate stays below risk budget $\alpha$. |
| `conformal.py` | Split-conformal prediction providing finite-sample statistical coverage guarantees. |
| `decision.py` | 3-way decision logic emitting `ACCEPT`, `REJECT`, or `ABSTAIN` (human review routing). |

### `src/reiduq/models/` — Deep Learning Backbones & Training
| Path | What / Why |
|---|---|
| `builder.py` | Constructs Re-ID encoders with $L_2$ feature normalization layers. |
| `backbones/` | OSNet (`osnet_ain`), ResNet-50-IBN-a, and TransReID (Vision Transformer) architectures. |
| `losses/` | Multi-task losses: Label-smoothed Cross-Entropy (`ce_smooth.py`), Weighted Regularized Triplet Loss (`triplet_wrt.py`), and Center Loss (`center.py`). |
| `training/trainer.py` | Production training loop featuring per-epoch checkpointing, CUDA OOM recovery, thermal pause guards, and metric tracking. |

### `src/reiduq/search/` — Vector & Attribute Retrieval
| Path | What / Why |
|---|---|
| `gallery_store.py` | SQLite metadata store holding indexed vehicle sightings (image paths, camera IDs, timestamps, plates, colors, brands). |
| `indexer.py` | Offline batch indexing pipeline embedding image collections into FAISS indexes and SQLite tables. |
| `plate_ocr.py` | Best-effort OCR reader for alphanumeric license plate recognition. |
| `query_pipeline.py` | Unified search engine executing hybrid queries across FAISS vector embeddings and SQLite attribute filters. |

### `src/reiduq/serving/` — REST API & Serving Subsystem
| Path | What / Why |
|---|---|
| `app.py` | FastAPI application serving `/health`, `/v1/search/plate`, `/v1/ingest/video`, `/v1/dataset/*`, and `/v1/review/feedback`. |
| `schemas.py` | Pydantic request and response models with strict typing and schema validation. |
| `security.py` | Constant-time authentication, session handling, rate limiting, and safe file serving checks. |
| `audit.py` | SQLite-backed audit logger storing match history and operator decisions. |

---

## 3. `apps/web/` — Web Frontend Application

| Path | What / Why |
|---|---|
| `src/app/page.tsx` | Main dashboard displaying system metrics, telemetry, and mathematical explanations of $T(v, c)$ calibration. |
| `src/app/search/page.tsx` | Vehicle search console featuring multi-attribute search (Plate, Color, Brand) and the **Human Review Modal**. |
| `src/app/ingest/page.tsx` | Video ingestion console supporting video uploads, live detection previews, and real-time gallery indexing. |
| `src/app/dataset/page.tsx` | Interactive Excel-style tabular viewer for exploring indexed datasets and CSV records. |
| `src/lib/api.ts` | Strongly-typed client wrapper communicating with the FastAPI backend. |
| `src/app/globals.css` | Clean, dark slate UI design system (pure slate palette, no neon glow or visual slop). |
| `tailwind.config.ts` | Custom Tailwind CSS tokens and themes configured for production density. |

---

## 4. `data/` & `models/` — Data & Storage

| Path | What / Why |
|---|---|
| `data/processed/gallery_store_entries.csv` | Full CSV export of 11,630+ vehicle sightings, including video detections with color, brand, and plate attributes. |
| `data/processed/veri776_*.csv` | Benchmark partitions for VeRi-776 (`all`, `train`, `query`, `gallery`). |
| `models/gallery/store.db` | High-speed SQLite database storing sighting metadata, attributes, and human feedback. |
| `models/gallery/index.faiss` | Binary FAISS vector index storing 512-dimensional continuous embeddings for sub-millisecond retrieval. |

---

## 5. `Interview Preparation/` — Comprehensive Technical Guides

| Path | Topic Covered |
|---|---|
| `01_PROJECT_OVERVIEW.md` | Problem statement, mission-critical impact, why naive models fail. |
| `02_TECH_STACK_EXPLANATION.md` | Deep justification for Next.js, FastAPI, FAISS, PyTorch, YOLOv8, and SQLite. |
| `03_MODELS_AND_CALIBRATION.md` | Mathematical formulas for $T(v, c)$, OSNet omni-scale architecture, and UQ metrics. |
| `04_ROUTES_AND_REQUEST_LIFECYCLE.md` | Complete API endpoint directory and end-to-end request journeys. |
| `05_TRAINING_AND_CALIBRATION_PIPELINE.md` | Triplet loss, calibrator optimization, and active learning loops. |
| `06_SYSTEM_DESIGN_AND_SCALABILITY.md` | City-scale distributed deployment (edge-to-cloud split, Kafka, vector quantization). |
| `07_FREQUENT_INTERVIEW_QUESTIONS.md` | High-yield technical interview Q&A. |
| `README.md` | Study path roadmap and guide index. |

---

## 6. Automation, Testing & DevOps

| Path | What / Why |
|---|---|
| `scripts/build_gallery_index.py` | CLI utility to embed image folders and populate FAISS and SQLite stores. |
| `scripts/generate_veri_dataset.py` | Generates normalized CSV manifests for VeRi-776 splits. |
| `scripts/benchmark.py` | Measures calibrator inference throughput, FLOPs, and latency percentiles (p50, p95). |
| `scripts/train_safe.sh` | Bash script for safe overnight model training with automatic OOM recovery. |
| `tests/unit/` | Fast unit tests testing calibrators, metrics, loss functions, and gallery stores. |
| `tests/security/` | Validates API security, input validation, and directory traversal defenses. |
| `docker/Dockerfile` | Multi-stage, digest-pinned backend container running as non-root user (uid 10001). |
| `docker/docker-compose.yml` | Multi-container orchestration spinning up API, frontend, and volume stores. |
| `infra/` | Terraform infrastructure-as-code files for AWS/GCP cloud provisioning. |
