# 03. Machine Learning Models, Calibration & Uncertainty Quantification

## 1. Deep Learning Models Used

### A. Feature Extraction & Embedding: OSNet (Omni-Scale Network)
- **Model Type**: Omni-Scale Convolutional Neural Network specifically designed for Re-Identification (`osnet_ain_x1_0`).
- **Input**: Vehicle image crop normalized to $256 \times 256$ pixels.
- **Output**: 512-dimensional continuous feature embedding vector $z \in \mathbb{R}^{512}$.
- **Why OSNet is Special**:
  - Traditional CNNs look at features at a single scale (e.g., standard $3 \times 3$ convolutions).
  - OSNet uses **Omni-Scale Depthwise Separable Convolutions** combining multiple receptive field streams ($1 \times 1, 3 \times 3, 5 \times 5$, and global pooling).
  - This allows the network to simultaneously capture **global features** (overall vehicle silhouette, sedan vs. SUV) and **fine-grained local features** (distinctive headlight shapes, roof racks, side stickers, wheel rim patterns).

### B. Object Detection: YOLOv8 (You Only Look Once v8)
- **Model**: `yolov8n.pt`
- **Classes Filtered**: Class `2` (car), `5` (bus), `7` (truck).
- **Function**: Automatically detects all vehicles entering camera frame feeds and extracts cropped bounding boxes with a confidence threshold $\ge 0.40$.

### C. Attribute Classifiers (Morphology & Heuristics)
Located in `src/reiduq/detection/attributes.py`:
- **Color Detector**: Converts bounding box to HSV color space, masks non-vehicle background pixels, and computes color histograms across 8 core palettes (Black, White, Silver, Red, Blue, Yellow, Green, Gray).
- **Brand Estimator**: Aspect-ratio and front-grille visual profile analyzer.
- **License Plate Extractor**: Uses morphological gradient filters (Sobel horizontal edge filters + Otsu thresholding + contour aspect ratio filtering) to crop candidate license plate bands, coupled with OCR character extraction.

---

## 2. The Core Scientific Innovation: Uncertainty Quantification (UQ)

### The Problem: Overconfident Neural Networks
In standard Re-ID, the similarity between query embedding $q$ and gallery candidate $g_i$ is computed using cosine similarity:
$$S(q, g_i) = \frac{q \cdot g_i}{\|q\| \|g_i\|}$$

The probability of match is often naively computed as:
$$P(\text{match}) = \sigma(S) = \frac{1}{1 + e^{-S}}$$

**Flaw:** If the query is captured under foggy weather by a noisy camera, the similarity may still be 0.75 by random chance, causing the model to make an erroneous match with high stated confidence.

---

## 3. Our Solution: Conditional Temperature Scaling $T(v, c)$

Instead of a fixed temperature, our system implements **Conditional Temperature Scaling**:

$$P(\text{Match} \mid q, g) = \sigma\left(\frac{S(q, g)}{T(v, c)}\right) = \frac{1}{1 + \exp\left(-\frac{S(q, g)}{T(v, c)}\right)}$$

Where:
- $S(q, g)$ = Raw cosine similarity between vehicle visual embeddings.
- $v \in [0, 1]$ = **Visibility / Image Quality score** (sharpness, contrast, occlusion estimate).
- $c \in \mathbb{R}^k$ = **Camera Pair Descriptor** (encodes environmental divergence, viewing angle difference, and lighting delta between Camera $A$ and Camera $B$).
- $T(v, c)$ = **Calibrator MLP Network** that predicts the optimal smoothing temperature.

### How $T(v, c)$ Behaves:
- **High Visibility, Similar Cameras**: $T(v, c) \to 1.0$. The model retains its sharp, confident predictions.
- **Poor Visibility (Rain/Blur) or Conflicting Camera Angles**: $T(v, c)$ increases (e.g., $1.8 - 2.5$). This flattens the probability curve, reducing overconfidence and reflecting true real-world uncertainty!

---

## 4. Risk-Bounded Abstention (Selective Prediction)

Instead of forcing the model to make a binary Accept/Reject decision when uncertain, our system defines a 3-tier action policy:

$$\text{Decision} = \begin{cases} 
\text{ACCEPT (Auto-Match)} & \text{if } P(\text{Match}) \ge \tau_{\text{high}} \\ 
\text{REJECT (No Match)} & \text{if } P(\text{Match}) \le \tau_{\text{low}} \\ 
\text{ABSTAIN (Route to Human Review)} & \text{if } \tau_{\text{low}} < P(\text{Match}) < \tau_{\text{high}} 
\end{cases}$$

### Theoretical Guarantee:
Given a risk tolerance budget $\alpha$ (e.g., $\alpha = 0.05$, meaning at most 5% automated error rate permitted):
- The thresholds $\tau_{\text{high}}$ and $\tau_{\text{low}}$ are mathematically calibrated using conformal prediction / validation set calibration.
- All ambiguous cases are handed over to human operators via the **Human Review Modal**, which captures feedback to continuously retrain the calibrator!

---

## 5. Key Metrics Evaluated
1. **ECE (Expected Calibration Error)**: Measures the absolute difference between predicted confidence and empirical accuracy across probability bins.
2. **Brier Score**: Quadratic penalty score measuring probability calibration accuracy: $\frac{1}{N}\sum (p_i - y_i)^2$.
3. **mAP (Mean Average Precision) & Rank-1 Accuracy**: Measures retrieval ranking quality across multi-camera test sets.
4. **Coverage @ Risk Budget**: The percentage of queries the model can resolve autonomously without exceeding the maximum risk budget $\alpha$.
