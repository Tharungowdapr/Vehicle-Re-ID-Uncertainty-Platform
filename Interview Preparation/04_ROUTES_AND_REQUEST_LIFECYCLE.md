# 04. API Routes, Request Life Cycle & Architecture Flow

## 1. Complete Backend API Route Map (`src/reiduq/serving/app.py`)

| Method | Endpoint | Primary Purpose | Source Location |
|---|---|---|---|
| `GET` | `/health` | Health check endpoint returning model & index load state | `app.py:182` |
| `GET` | `/v1/dataset/list` | Returns list of available datasets (demo, raw, veri776, video uploads) | `app.py:198` |
| `GET` | `/v1/dataset/{name}/rows` | Paginated retrieval of dataset records with CSV fallback | `app.py:228` |
| `GET` | `/v1/dataset/search` | Fast attribute search (plate, color, brand, camera ID) on CSV/SQLite | `app.py:270` |
| `GET` | `/v1/search/plate` | **Core Sighting Search**: FAISS vector similarity + SQLite attribute search | `app.py:328` |
| `POST` | `/v1/reid/predict` | Embedding generation & calibrated probability inference on image pairs | `app.py:465` |
| `POST` | `/v1/ingest/video` | **Video Ingestion Pipeline**: Decodes video, runs YOLO, extracts attributes, indexes into FAISS | `app.py:650` |
| `GET` | `/api/files/{rel_path:path}` | Serves cropped vehicle images securely to the frontend for human review | `app.py:840` |
| `POST` | `/v1/review/feedback` | **Active Learning Feedback**: Stores human operator confirm/reject annotations | `app.py:865` |

---

## 2. End-to-End Request Journey: Step-by-Step

### Scenario A: Video Ingestion (`POST /v1/ingest/video`)
Where the request is generated: **Frontend Video Ingestion Page** (`apps/web/src/app/ingest/page.tsx`).

```
[User Uploads MP4 Video]
         │
         ▼
[Frontend: api.uploadVideoIngest(formData)]
         │ (HTTP Multipart POST)
         ▼
[FastAPI: POST /v1/ingest/video]
         │
         ├── 1. Saves temp video file to disk (`outputs/ingest_temp/`)
         │
         ├── 2. Decodes video frames at target sampling rate using OpenCV (`cv2.VideoCapture`)
         │
         ├── 3. Runs YOLOv8 (`yolov8n.pt`) on each frame
         │       └── Filters classes: Car (2), Bus (5), Truck (7)
         │       └── Filters bounding boxes by min area & confidence >= 0.40
         │
         ├── 4. For each detected vehicle crop:
         │       ├── A. `detect_vehicle_color(crop)` -> extracts dominant color (e.g., 'white')
         │       ├── B. `estimate_vehicle_brand(crop)` -> estimates brand profile (e.g., 'kia', 'sedan')
         │       ├── C. `detect_license_plate(crop)` -> extracts plate text (e.g., 'DL-68-X-6743')
         │       └── D. Deep Feature Encoder (`osnet_ain`) -> generates 512-d embedding vector
         │
         ├── 5. SQLite Storage:
         │       └── Inserts row into `models/gallery/store.db` (table: `gallery_entries`)
         │
         ├── 6. FAISS Vector Store:
         │       └── Appends 512-d embedding vectors to in-memory index
         │       └── Saves updated index to `models/gallery/index.faiss`
         │
         └── 7. Returns JSON response containing all detected vehicle sightings with attributes!
```

---

### Scenario B: Plate & Attribute Sighting Search (`GET /v1/search/plate`)
Where the request is generated: **Frontend Search Page** (`apps/web/src/app/search/page.tsx`).

```
[Operator enters Plate: "6743", Color: "white", Brand: "kia"]
         │
         ▼
[Frontend: api.searchByPlate({ plate_query, color, brand, k })]
         │ (HTTP GET Request)
         ▼
[FastAPI: GET /v1/search/plate]
         │
         ├── 1. Query Router Check:
         │       Checks if user provided an image query or text/attribute query.
         │
         ├── 2. Direct SQLite Attribute Search:
         │       Queries `models/gallery/store.db` using SQL `LIKE`:
         │       `SELECT * FROM gallery_entries WHERE plate_text LIKE '%6743%' AND color = 'white'`
         │
         ├── 3. FAISS Embedding Match (Visual Similarity):
         │       If an anchor image exists, uses OSNet to extract embedding $q$.
         │       Searches FAISS index for top-$k$ closest vector neighbors.
         │
         ├── 4. Calibration Engine (`Calibrator`):
         │       Applies $T(v, c)$ scaling to compute calibrated match probability $P(\text{Match})$.
         │       Evaluates risk-bounded decision: [ACCEPT, REJECT, or ABSTAIN].
         │
         ├── 5. Response Builder:
         │       Constructs `SightingResponse` list with image paths, timestamps, confidence scores,
         │       and abstention status.
         │
         └── 6. Returns JSON to Next.js UI -> Renders Sightings Table!
```

---

### Scenario C: Human Review & Active Learning (`POST /v1/review/feedback`)
Where the request is generated: **Frontend Calibration Review Modal** (`apps/web/src/app/search/page.tsx`).

```
[Operator clicks "Review Sighting"]
         │
         ├── Modal opens showing real vehicle image crop:
         │   `http://localhost:8000/api/files/{image_path}`
         │
         ├── Operator selects: [Confirm Match / Reject Match] + adds Operator Notes
         │
         ▼
[Frontend: api.submitFeedback({ sighting_id, decision, notes })]
         │ (HTTP POST)
         ▼
[FastAPI: POST /v1/review/feedback]
         │
         ├── 1. Validates payload using Pydantic `ReviewFeedbackRequest`
         │
         ├── 2. Inserts feedback into SQLite table `human_feedback`:
         │       `INSERT INTO human_feedback (sighting_id, decision, notes, timestamp) ...`
         │
         └── 3. Returns HTTP 200 {"status": "ok", "message": "Feedback recorded"}
                 (Feedback rows are saved for continuous offline recalibration!)
```
