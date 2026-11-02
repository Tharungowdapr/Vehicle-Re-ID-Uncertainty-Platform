import { Sliders } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <main className="space-y-8 animate-in fade-in duration-1000">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-accent/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-paper to-accent">
            SYSTEM DASHBOARD &amp; UNCERTAINTY CONSOLE
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-accent/60">
            Real-time RF-DETR object detection and TransReID vector matching with risk-bounded abstention.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-ink px-4 py-2 rounded-lg border border-accent/30 shadow-[0_0_10px_rgba(0,240,255,0.1)]">
          <div className="w-2 h-2 rounded-full bg-verdict-match animate-pulse"></div>
          <span className="text-xs uppercase tracking-widest text-verdict-match font-bold">System Online</span>
        </div>
      </header>

      {/* Special Calibration Deep-Dive Explanation */}
      <section className="card p-7 border-accent/30 bg-ink space-y-6">
        <div className="flex items-center gap-2 border-b border-ink-line pb-4">
          <Sliders className="w-6 h-6 text-accent" />
          <div>
            <h2 className="text-lg font-bold tracking-wider text-paper uppercase">
              Special Calibration Architecture: Conditional Temperature Scaling T(v, c)
            </h2>
            <p className="text-xs text-accent/70 mt-0.5">
              Why our vehicle Re-ID does not rely on raw cosine similarity or single-scalar Platt scaling
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-paper/80">
          <div className="space-y-2 p-4 rounded-xl bg-ink-soft/40 border border-ink-line">
            <span className="font-bold text-accent uppercase tracking-wider block">1. The Problem with Raw Similarity</span>
            <p className="leading-relaxed text-paper/70">
              Standard vehicle Re-ID returns raw Cosine distance between embeddings. When a camera angle changes, glare occurs, or a vehicle is 40% occluded by a pole, raw similarities collapse or hallucinate false positives without uncertainty estimation.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-ink-soft/40 border border-ink-line">
            <span className="font-bold text-purple-400 uppercase tracking-wider block">2. Conditional Temperature T(v, c)</span>
            <p className="leading-relaxed text-paper/70">
              Instead of one fixed temperature for all cases, an auxiliary MLP predicts a per-instance temperature:
              <br />
              <code className="text-accent text-[11px] block mt-1 bg-ink p-1 rounded font-mono">
                T(v, c) = Softplus(MLP([visibility, camera_stats]))
              </code>
              Occluded or low-quality camera frames scale temperature up, spreading probability entropy safely.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-xl bg-ink-soft/40 border border-ink-line">
            <span className="font-bold text-green-400 uppercase tracking-wider block">3. Risk-Bounded Abstention</span>
            <div className="leading-relaxed text-paper/70">
              Calibrated probabilities feed our selective abstention rule:
              <ul className="list-disc list-inside mt-1.5 space-y-1 font-mono text-[11px]">
                <li><b className="text-green-400">P &ge; 0.90</b>: Autonomous MATCH</li>
                <li><b className="text-yellow-400">0.20 &le; P &lt; 0.90</b>: UNCERTAIN &rarr; Human Review</li>
                <li><b className="text-red-400">P &lt; 0.20</b>: Confirmed REJECT</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mathematical formulation block */}
        <div className="p-4 rounded-xl bg-ink-soft/80 border border-accent/20 font-mono text-xs space-y-2">
          <div className="text-[10px] uppercase font-bold text-accent tracking-widest font-sans">
            Core Calibration Mathematical Formulation
          </div>
          <div className="text-paper">
            P(Match = y<sub>i</sub> | x, v, c) = <span className="text-accent">exp(sim(x, y<sub>i</sub>) / T(v, c))</span> / <span className="text-paper/60">&sum; exp(sim(x, y<sub>j</sub>) / T(v, c))</span>
          </div>
          <div className="text-[11px] text-paper/50 font-sans">
            Where <code>v &isin; [0, 1]</code> is vehicle visibility (SAM 2.1 mask ratio) and <code>c &isin; &Ropf;<sup>9</sup></code> is the camera descriptor vector.
          </div>
        </div>
      </section>

      {/* Navigation Quicklinks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="card p-6 border-accent/40 bg-ink hover:border-accent transition-colors flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold tracking-widest text-accent mb-2">DATASET MANAGER</h3>
            <p className="text-xs text-paper/70 mb-4">Browse Excel-style manifests with 10,000+ records, filter across splits, and ingest ZIP archives.</p>
          </div>
          <Link href="/dataset" className="btn-primary text-xs text-center py-2">Open Dataset Manager</Link>
        </div>

        <div className="card p-6 border-purple-500/40 bg-ink hover:border-purple-400 transition-colors flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold tracking-widest text-purple-400 mb-2">SEARCH CONSOLE</h3>
            <p className="text-xs text-paper/70 mb-4">Search by plate, photo, or CSV with dataset scope preferences and detailed calibration inspection.</p>
          </div>
          <Link href="/search" className="btn-primary text-xs text-center py-2 border-purple-500/60 text-purple-300 hover:bg-purple-950/20">Launch Search Console</Link>
        </div>

        <div className="card p-6 border-green-500/40 bg-ink hover:border-green-400 transition-colors flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold tracking-widest text-green-400 mb-2">VIDEO INGESTION</h3>
            <p className="text-xs text-paper/70 mb-4">Upload surveillance video footage, watch real-time vehicle detections, and add directly to your dataset.</p>
          </div>
          <Link href="/ingest" className="btn-primary text-xs text-center py-2 border-green-500/60 text-green-300 hover:bg-green-950/20">Go to Video Ingest</Link>
        </div>
      </div>
    </main>
  );
}
