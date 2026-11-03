# 02. Tech Stack & Architectural Decisions

## 1. Complete Technology Stack Overview

| Category | Technology | Version | Purpose in this Project |
|---|---|---|---|
| **Frontend Framework** | **Next.js (App Router)** | 14.2.5 | Modern React SSR/CSR framework for dashboards, search, and live ingestion |
| **UI Library / Styling** | **Tailwind CSS + Lucide Icons** | 3.4.1 | Clean, utility-first dark slate styling without heavy bloated UI component libraries |
| **Backend Framework** | **FastAPI** | 0.115+ | Asynchronous, high-throughput Python REST API for ML model serving and search |
| **ASGI Web Server** | **Uvicorn** | 0.30+ | High-performance asynchronous HTTP server with hot-reload capabilities |
| **Deep Learning Framework** | **PyTorch + Torchvision** | 2.11+ / cu128 | Deep neural network training, inference, and GPU acceleration on NVIDIA RTX GPUs |
| **Object Detection** | **Ultralytics YOLOv8** | 8.3+ | Real-time vehicle detection and bounding box cropping from video frames |
| **Vector Similarity Search** | **FAISS (Facebook AI Similarity Search)** | 1.8.0+ | Sub-millisecond $L_2$ and Inner Product similarity search across 10,000+ vehicle embeddings |
| **Computer Vision Utilities** | **OpenCV (cv2)** | 4.10+ | Video decoding, frame manipulation, color-space HSV histograms, and plate morphological filters |
| **Relational Database** | **SQLite (via Python sqlite3)** | 3.x | Persistent gallery metadata store (sightings, vehicle colors, brands, plates, feedback) |
| **Data Science & Metrics** | **Pandas, NumPy, Scikit-learn** | Latest | Dataset CSV streaming, tensor math, ECE (Expected Calibration Error), Brier scores |
| **Language & Tooling** | **Python 3.12, TypeScript 5.0** | - | Type-safe front-to-back development with strict Pydantic schemas |

---

## 2. Why Did We Choose This Tech Stack? (Interview Justifications)

### Q: Why FastAPI over Flask or Django?
- **Speed & Async Capabilities**: FastAPI is built on Starlette and Pydantic. It supports asynchronous I/O natively, which is critical when handling long video ingestion and simultaneous search queries.
- **Automatic Validation with Pydantic**: Incoming requests (search parameters, feedback payloads) are automatically typed, validated, and documented via OpenAPI/Swagger (`/docs`).
- **No Heavy ORM Bloat**: Unlike Django which bundles heavy database abstractions, FastAPI is lightweight and allows direct integration with FAISS, PyTorch tensors, and SQLite.

### Q: Why Next.js (App Router) for the Frontend?
- **Server and Client Component Separation**: The dashboard and gallery explore pages can stream datasets efficiently while client modals handle interactive operations (video streaming, active feedback forms).
- **Zero Configuration Proxying**: Next.js connects effortlessly to our local FastAPI service without complex reverse proxy setups during development.
- **TypeScript Type Safety**: API schemas defined in Python are mirrored cleanly in `apps/web/src/lib/api.ts`, eliminating runtime frontend bugs.

### Q: Why FAISS instead of Milvus, Pinecone, or PostgreSQL (pgvector)?
- **Ultra-low In-Process Latency**: FAISS runs in-memory directly within the Python process. There is zero network round-trip overhead.
- **Optimized CPU AVX2 & GPU Kernels**: FAISS utilizes optimized C++ vector instructions, searching 10,000–100,000 512-dimensional embeddings in **less than 2 milliseconds**.
- **Self-Contained & Production-Ready**: No external database clusters or cloud API keys required; the `.faiss` index file saves directly alongside the SQLite metadata store.

### Q: Why YOLOv8 for Detection?
- **State-of-the-Art Accuracy & Speed**: YOLOv8n (nano) runs at over 60 FPS on modern GPUs, detecting cars, trucks, and buses reliably even with partial occlusion.
- **Easy Integration**: Direct Python API via `ultralytics` with built-in Non-Maximum Suppression (NMS) and bounding-box coordinates.

### Q: Why SQLite for Gallery Metadata?
- **Single File Portability**: Everything is stored in `models/gallery/store.db`. Easy to back up, export to CSV (`gallery_store_entries.csv`), or deploy to edge devices.
- **Zero Setup Overhead**: Requires no standalone database daemon while easily handling hundreds of thousands of indexed sightings.
