# 07. Top Interview Questions & Comprehensive Answers

## Technical Deep-Dive Q&A for Interviews

---

### Q1: What is Vehicle Re-Identification, and how is it different from Object Detection or Tracking?
**Answer:**
- **Object Detection (e.g., YOLO)** detects *where* an object is in a single frame and classifies it as a generic category (e.g., "Car" at coordinates $[x, y, w, h]$). It cannot tell if the car in Frame 1 is the same car in Frame 500.
- **Single-Camera Tracking (e.g., ByteTrack, DeepSORT)** tracks a vehicle across continuous video frames *within a single camera feed*.
- **Vehicle Re-ID (our project)** solves the much harder problem of cross-camera matching: identifying the same vehicle across **different cameras at different geographic locations and times**, where cameras have non-overlapping views, different angles, and varying lighting.

---

### Q2: What is Model Calibration, and why doesn't raw Softmax equal true probability?
**Answer:**
Modern deep neural networks are notoriously overconfident. A raw Softmax output or cosine similarity of 0.85 does **not** mean there is an 85% probability that the prediction is correct.
- Softmax outputs represent relative activations, not statistical frequencies.
- If a model is 80% confident on 100 predictions, exactly 80 of them should be correct in a well-calibrated model. In uncalibrated models, often only 40–50% are actually correct.
- Our calibration step fits a mapping from raw similarity scores to true empirical probabilities using validation data.

---

### Q3: Why did you use Conditional Temperature Scaling $T(v, c)$ instead of Platt Scaling or Global Temperature Scaling?
**Answer:**
- **Platt Scaling** fits a simple 1D logistic regression: $\sigma(a \cdot S + b)$.
- **Global Temperature Scaling** learns a single scalar $T$ for the entire system: $\sigma(S / T)$.
- **Why they fail in Vehicle Re-ID**: A single global temperature assumes that all cameras and weather conditions have the same uncertainty!
- In reality, Camera Pair $(A, B)$ on a sunny day has low uncertainty ($T \approx 1.0$), while Camera Pair $(C, D)$ where Camera $C$ is blurry and Camera $D$ is facing headlight glare has massive uncertainty ($T \approx 2.2$).
- Our **Conditional Temperature Scaling** trains an MLP to dynamically predict temperature $T(v, c)$ conditioned on image visibility $v$ and camera pair descriptor $c$.

---

### Q4: How does Risk-Bounded Abstention protect safety in critical applications?
**Answer:**
In law enforcement or toll auditing, automated errors can lead to wrongful accusations or financial losses.
Risk-bounded abstention defines a risk budget $\alpha$ (e.g., maximum 5% error rate allowed). If the model's calibrated confidence falls in an ambiguous zone ($\tau_{\text{low}} < P < \tau_{\text{high}}$), the model **refuses to guess autonomously** and flags the sighting for human review. This guarantees that automated decisions remain within strict safety bounds.

---

### Q5: How do you handle cases where two different cars are the exact same make, model, and color?
**Answer:**
This is one of the classic challenges in Vehicle Re-ID (inter-class similarity).
Our system mitigates this through a multi-modal approach:
1. **Fine-grained Deep Features (OSNet)**: Captures subtle visual differentiators (dents, stickers, roof rails, unique wheel rims, sun visors).
2. **License Plate OCR extraction**: Extracts alphanumeric text to disambiguate identical-looking models.
3. **Uncertainty Escalation**: When fine-grained features are insufficient to confirm identity with high confidence, the system's calibrated probability drops, triggering an abstention so an operator can visually inspect both sightings.

---

### Q6: What was the root cause of the "No indexed vehicle sightings matched this query" bug, and how was it fixed?
**Answer:**
When videos were ingested, vehicle embeddings were appended to the FAISS index on disk and recorded in SQLite. However:
1. The search engine maintained a cached in-memory FAISS index instance that was not invalidated when new video crops arrived.
2. The search endpoint originally performed pure FAISS vector retrieval and required an anchor query image, failing when operators searched purely by text attributes (e.g., Plate text, Color, Brand).
3. **The Fix**: We updated the search pipeline to implement hybrid search — querying SQLite metadata directly using SQL pattern matching for text attributes, invalidating/reloading the in-memory FAISS index, and seamlessly blending attribute filters with visual embeddings.

---

### Q7: If you had 3 more months on this project, what would you improve?
**Answer:**
1. **Spatiotemporal Topology Constraints**: Vehicles cannot travel between Camera A and Camera B faster than the speed of light or slower than traffic flow. Adding a spatiotemporal graph (time-distance velocity filter) would reject physically impossible matches.
2. **End-to-End License Plate Super-Resolution**: Integrating a lightweight super-resolution model (e.g., Real-ESRGAN) to clarify low-resolution plates on distant vehicle crops.
3. **Active Learning Retraining Pipeline**: Automating scheduled cron jobs that retrain the calibration MLP on accumulated operator feedback records from the `human_feedback` table.
