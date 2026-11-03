import { Sliders, Database, Search, Video } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-line pb-5">
        <div>
          <h1 className="text-xl font-medium text-paper">
            System Overview
          </h1>
          <p className="mt-1 text-sm text-paper-muted">
            Vehicle Re-ID and uncertainty calibration console.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-ink-line bg-ink-soft">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="text-xs text-paper-muted font-medium">Service Ready</span>
        </div>
      </header>

      {/* Navigation Quicklinks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-paper">
              <Database className="w-4 h-4 text-paper-muted" />
              <h3 className="text-sm font-medium">Dataset Manager</h3>
            </div>
            <p className="text-xs text-paper-muted leading-relaxed">
              Explore ground-truth records, view cameras and splits, and manage dataset manifests.
            </p>
          </div>
          <Link href="/dataset" className="btn-secondary text-xs text-center">
            Open Dataset Manager
          </Link>
        </div>

        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-paper">
              <Search className="w-4 h-4 text-paper-muted" />
              <h3 className="text-sm font-medium">Search Console</h3>
            </div>
            <p className="text-xs text-paper-muted leading-relaxed">
              Look up sightings by license plate, vehicle image, or query against dataset records with calibrated confidence.
            </p>
          </div>
          <Link href="/search" className="btn-secondary text-xs text-center">
            Launch Search
          </Link>
        </div>

        <div className="card p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-paper">
              <Video className="w-4 h-4 text-paper-muted" />
              <h3 className="text-sm font-medium">Video Ingestion</h3>
            </div>
            <p className="text-xs text-paper-muted leading-relaxed">
              Process video streams, extract cropped detections, generate embeddings, and export into datasets.
            </p>
          </div>
          <Link href="/ingest" className="btn-primary text-xs text-center">
            Start Ingestion
          </Link>
        </div>
      </div>

      {/* Calibration Architecture Deep-Dive */}
      <section className="card p-6 space-y-5 border border-ink-line bg-ink-soft">
        <div className="flex items-center gap-2 border-b border-ink-line pb-3">
          <Sliders className="w-4 h-4 text-paper-muted" />
          <h2 className="text-sm font-medium text-paper">
            Conditional Temperature Scaling Architecture T(v, c) &amp; Calibration Uniqueness
          </h2>
        </div>

        <p className="text-xs text-paper-muted leading-relaxed">
          Standard vehicle Re-ID pipelines collapse when dealing with real-world surveillance: illumination shifts, camera-to-camera color balance variation, and partial occlusions (e.g. poles, adjacent vehicles) distort raw cosine distances. Rather than applying a single global temperature scalar (standard Platt scaling), our system dynamically computes a local per-instance temperature based on conditional covariates.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5 p-4 rounded bg-ink border border-ink-line">
            <span className="font-medium text-paper block">1. The Problem with Raw Similarity</span>
            <p className="text-paper-muted leading-relaxed">
              Standard vehicle Re-ID returns raw cosine distance. When camera angle shifts, glare occurs, or a vehicle is 40% occluded by a pole, raw similarities collapse or hallucinate false positives without uncertainty estimation.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded bg-ink border border-ink-line">
            <span className="font-medium text-paper block">2. Conditional Temperature T(v, c)</span>
            <p className="text-paper-muted leading-relaxed">
              Instead of one fixed temperature for all cases, an auxiliary MLP predicts a per-instance temperature:
            </p>
            <code className="text-blue-400 text-[11px] block mt-1 bg-ink-soft p-1.5 rounded font-mono">
              T(v, c) = Softplus(MLP([visibility, camera_stats]))
            </code>
            <p className="text-paper-muted text-[11px] leading-relaxed mt-1">
              Occluded or low-quality camera frames scale temperature up, spreading probability entropy safely.
            </p>
          </div>

          <div className="space-y-1.5 p-4 rounded bg-ink border border-ink-line">
            <span className="font-medium text-paper block">3. Risk-Bounded Selective Abstention</span>
            <p className="text-paper-muted leading-relaxed mb-1">
              Calibrated probabilities feed our rigorous selective abstention policy:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-paper-muted">
              <li><span className="text-emerald-400 font-medium">P &ge; 0.90</span>: Autonomous MATCH</li>
              <li><span className="text-amber-400 font-medium">0.20 &le; P &lt; 0.90</span>: UNCERTAIN &rarr; Human Review</li>
              <li><span className="text-red-400 font-medium">P &lt; 0.20</span>: Confirmed REJECT</li>
            </ul>
          </div>
        </div>

        {/* Mathematical formulation block */}
        <div className="p-4 rounded bg-ink border border-ink-line font-mono text-xs space-y-2">
          <div className="text-[11px] font-medium text-paper font-sans">
            Core Calibration Mathematical Formulation
          </div>
          <div className="text-paper">
            P(Match = y<sub>i</sub> | x, v, c) = <span className="text-blue-400">exp(sim(x, y<sub>i</sub>) / T(v, c))</span> / <span className="text-paper-muted">&sum; exp(sim(x, y<sub>j</sub>) / T(v, c))</span>
          </div>
          <div className="text-[11px] text-paper-muted font-sans">
            Where <code>v &isin; [0, 1]</code> is vehicle visibility (SAM 2.1 mask ratio) and <code>c &isin; &Ropf;<sup>9</sup></code> is the 9-dimensional camera descriptor vector (capturing illumination, camera ID, and perspective).
          </div>
        </div>
      </section>
    </main>
  );
}
