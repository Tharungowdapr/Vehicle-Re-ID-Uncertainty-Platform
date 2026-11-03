# 05. Model Training Pipeline & Implementation Details

## 1. Where Does Model Training Live?
The complete model training and validation subsystem is implemented in:
- `src/reiduq/models/training/trainer.py`: Deep Re-ID backbone training loop (OSNet / ResNet).
- `src/reiduq/models/losses/`: Multi-task loss functions (Triplet Loss + Cross-Entropy Loss).
- `src/reiduq/calibration/conditional_temperature.py`: Calibration MLP training loop.
- `src/reiduq/abstention/policy.py`: Risk-bounded threshold determination.

---

## 2. Re-ID Backbone Training (Representation Learning)

### Loss Functions Used:
To teach the model what a "vehicle identity" is, the network is trained using a **Combined Objective**:

$$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{ID}} + \lambda \mathcal{L}_{\text{Triplet}}$$

1. **Cross-Entropy Identity Loss ($\mathcal{L}_{\text{ID}}$)**:
   - Treats vehicle Re-ID as a classification problem during training, predicting the vehicle ID among training classes.
   - Forces the network to learn discriminative semantic features.

2. **Hard-Mining Triplet Loss ($\mathcal{L}_{\text{Triplet}}$)**:
   - Given an **Anchor** image $a$, a **Positive** image $p$ (same vehicle from a different camera), and a **Negative** image $n$ (different vehicle):
   $$\mathcal{L}_{\text{Triplet}} = \max\left(0, \|f(a) - f(p)\|_2^2 - \|f(a) - f(n)\|_2^2 + m\right)$$
   - Uses **Batch Hard Mining**: In each mini-batch, finds the hardest positive (most dissimilar image of the same car) and the hardest negative (most similar image of a different car) to enforce strong separation boundaries with margin $m$.

---

## 3. Training the Calibration Network ($T(v, c)$)

### Step 1: Feature Extraction on Validation Pairs
1. Take a held-out calibration dataset (disjoint from training vehicle IDs).
2. For each pair $(i, j)$:
   - Compute raw cosine similarity: $S_{ij} = \cos(f(x_i), f(x_j))$
   - Compute visibility score: $v_{ij} = \min(v(x_i), v(x_j))$
   - Compute camera descriptor: $c_{ij} = \text{Concat}(\text{Camera}_i, \text{Camera}_j)$
   - Record ground truth label: $y_{ij} \in \{0, 1\}$ (1 if same vehicle, 0 otherwise).

### Step 2: Optimizing the Temperature MLP
The temperature MLP has 2 hidden layers (e.g., $64 \to 32 \to 1$ with ReLU activations and a Softplus output to ensure $T > 0$).
We train the MLP parameters $\theta$ by minimizing the **Binary Cross-Entropy Loss (Negative Log-Likelihood)**:

$$\mathcal{L}_{\text{cal}}(\theta) = -\sum_{(i,j)} \left[ y_{ij} \log \sigma\left(\frac{S_{ij}}{T_\theta(v_{ij}, c_{ij})}\right) + (1 - y_{ij}) \log \left(1 - \sigma\left(\frac{S_{ij}}{T_\theta(v_{ij}, c_{ij})}\right)\right) \right]$$

Because the feature extractor weights are frozen during this step, calibration training is extremely fast and avoids overfitting!

---

## 4. Calculating Risk-Bounded Thresholds ($\tau_{\text{high}}, \tau_{\text{low}}$)

### How Abstention Thresholds are Learned:
Given calibrated probabilities $\hat{p}_i = \sigma(S_i / T_i)$ and target risk budget $\alpha = 0.05$:

1. Sort validation predictions by calibrated confidence.
2. Find the highest acceptance threshold $\tau_{\text{high}}$ such that the empirical error rate among accepted predictions is guaranteed:
   $$\text{Empirical Risk}(\tau_{\text{high}}) = \frac{\sum_{i: \hat{p}_i \ge \tau_{\text{high}}} \mathbb{I}(y_i = 0)}{|\{i: \hat{p}_i \ge \tau_{\text{high}}\}|} \le \alpha$$
3. Find the lowest rejection threshold $\tau_{\text{low}}$ such that false dismissals stay bounded.
4. All samples falling between $\tau_{\text{low}}$ and $\tau_{\text{high}}$ are flagged with `action = "ABSTAIN"` and dispatched to human operators.

---

## 5. Active Learning Loop (Continuous Improvement)
When an operator marks a sighting as "Confirmed" or "Rejected" in the UI:
1. Sighting metadata + operator ground truth is stored in SQLite table `human_feedback`.
2. High-uncertainty hard negatives and hard positives are periodically pooled to fine-tune the calibration network and update the vector gallery index.
