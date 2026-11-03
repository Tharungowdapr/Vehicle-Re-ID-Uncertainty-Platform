# 06. System Design & Production Architecture

## 1. High-Level System Architecture Diagram

```
                              ┌─────────────────────────────────────────┐
                              │            Next.js Frontend             │
                              │  (Search, Ingestion, Review Modals, UI) │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   │ HTTP / REST API (Port 8000)
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 FastAPI Serving Gateway                                │
│                                (CORS, Rate Limiting, Schemas)                          │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│    Ingestion Engine     │         Search Engine         │      Calibration Engine      │
│  - Video Stream Reader  │     - Attribute SQL Filters   │   - Visibility Estimator     │
│  - YOLOv8 Vehicle Crop  │     - FAISS Cosine Search     │   - T(v, c) MLP Calibrator   │
│  - Color / Plate OCR    │     - Top-k Candidate Ranker  │   - Risk Abstention Gate     │
└────────────┬────────────┴───────────────┬───────────────┴──────────────┬───────────────┘
             │                            │                              │
             ▼                            ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐   ┌─────────────────────────────┐
│  Local Image Store      │  │  FAISS Vector Index     │   │   SQLite Metadata Store     │
│  (Vehicle JPG Crops)    │  │  (512-dim Embeddings)   │   │   (store.db / CSV Backups)  │
└─────────────────────────┘  └─────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Component Design Breakdown

### 1. Ingestion Subsystem (Scalable Stream Processing)
- **Problem**: Processing 30 FPS across 100 cameras concurrently will bottleneck standard CPU/GPU pipelines.
- **Production Solution**:
  - Implement a **Frame Subsampling Strategy** (process 2–5 keyframes per second instead of all 30).
  - Decouple video decoding from ML inference using a message queue (**Redis / Apache Kafka** in enterprise deployments).
  - Dedicated worker pools running lightweight YOLOv8 models produce cropped bounding boxes, which are batched and sent to OSNet feature extractors.

### 2. Retrieval Subsystem (Sub-Millisecond Vector Search)
- **Problem**: Performing pairwise dot-products against millions of historic vehicle sightings causes linear slowdown $\mathcal{O}(N)$.
- **Solution (FAISS)**:
  - Uses an **Inverted File with Product Quantization (IVF-PQ)** or Flat $L_2$ index.
  - Partitions embedding space into Voronoi cells. Searching 1 million vectors takes under 5 milliseconds.
  - Multi-tier filtering: First filter candidates by coarse categorical attributes (Vehicle Type = "SUV", Color = "White"), narrowing the FAISS search space by 90%.

### 3. Calibration & Risk-Bounded Engine
- **Lightweight Inference**: Unlike heavy vision models, the $T(v, c)$ MLP has fewer than 10,000 parameters. Computing the temperature takes less than 0.1 milliseconds.
- **Fail-Safe Fallback**: If the calibration checkpoint is unavailable, the system safely falls back to Platt Scaling or Global Temperature Scaling.

### 4. Storage Architecture (Hybrid Storage)
- **Object Storage (S3 / MinIO / Local Disk)**: Raw images and cropped vehicle bounding boxes stored with content-addressed file keys.
- **Vector Database (FAISS)**: In-memory embeddings for instant similarity search.
- **Relational Metadata (SQLite / PostgreSQL)**: Timestamps, camera IDs, GPS locations, plate text, colors, and operator review feedback.

---

## 3. Production Scaling: How to Scale to City-Wide Traffic?

If asked in an interview: *"How would you scale this system from 1 video to 500 city cameras?"*

1. **Edge-to-Cloud Split Architecture**:
   - Run lightweight vehicle detection (YOLOv8 nano) directly on edge camera devices (NVIDIA Jetson / Raspberry Pi).
   - Only transmit cropped vehicle images and metadata over 4G/5G, saving 98% of network bandwidth compared to streaming raw 1080p video.
2. **Horizontal Scaling of Embedding Workers**:
   - Run OSNet feature extraction inside containerized Kubernetes pods with GPU auto-scaling.
3. **Distributed Vector Database**:
   - Replace in-memory FAISS with a distributed vector database like **Milvus** or **Qdrant** partitioned by geographic city zones.
4. **Resilience & Asynchronous Ingestion**:
   - Buffer high-traffic bursts with Kafka or RabbitMQ, ensuring video processing never blocks user search queries.
