"use client";

import { useState, useRef, useEffect } from "react";
import { ingestVideo, getIngestionStatus, commitVideoToDataset, IngestionStatus, IngestionDetection } from "@/lib/api";
import { CheckCircle2, Clock, Video, Cpu, Database, AlertCircle, Activity } from "lucide-react";

export default function IngestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Commit state
  const [commitName, setCommitName] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll status when jobId is set
  useEffect(() => {
    if (!jobId || (status?.status === 'done' || status?.status === 'error')) return;
    
    const interval = setInterval(async () => {
      try {
        const s = await getIngestionStatus(jobId);
        setStatus(s);
      } catch (err: any) {
        console.error("Failed to poll status:", err);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [jobId, status?.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0] ?? null;
      setFile(selected);
      setError(null);
      setJobId(null);
      setStatus(null);
      setCommitSuccess(null);
      if (selected) {
        setCommitName(selected.name.replace(/\.[^/.]+$/, "").replace(/[^A-Za-z0-9_-]/g, "_"));
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);
    setCommitSuccess(null);
    
    try {
      const res = await ingestVideo(file);
      setJobId(res.job_id);
      setStatus(res);
    } catch (err: any) {
      setError(err.message || "Failed to start ingestion");
    } finally {
      setUploading(false);
    }
  };

  const handleCommitToDataset = async () => {
    if (!jobId) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await commitVideoToDataset(jobId, commitName || "video_dataset");
      setCommitSuccess(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to add to dataset");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="flex flex-col gap-2 border-b border-ink-line pb-4">
            <h1 className="text-3xl font-light tracking-tight text-paper">
              Real-Time Video Ingestion &amp; Feature Extraction
            </h1>
            <p className="text-sm text-paper/60">
              Upload surveillance footage. RF-DETR detects vehicle crops in real-time, OSNet embeds 512D Re-ID vectors, and results can be committed directly to your dataset manager.
            </p>
          </header>

          <div className="card p-6 space-y-6">
            {/* Upload Zone */}
            <div 
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                file ? 'border-accent/50 bg-accent/5' : 'border-ink-line bg-ink hover:border-accent/30 hover:bg-ink-soft'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="video/*"
                onChange={handleFileChange}
                disabled={uploading || status?.status === 'running'}
              />
              
              {file ? (
                <div className="text-center">
                  <div className="mb-2 text-4xl text-accent">🎬</div>
                  <div className="font-medium text-paper text-base">{file.name}</div>
                  <div className="text-xs text-paper/50 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mb-2 text-4xl text-paper/20">📹</div>
                  <div className="font-medium text-paper">Click or Drag Video to Upload</div>
                  <div className="text-xs text-paper/50 mt-1">Supports MP4, AVI, MKV, MOV up to 500 MB</div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/20 p-3 text-sm text-red-400 border border-red-500/30">
                {error}
              </div>
            )}

            {/* Upload Button */}
            {!jobId && (
              <button
                className="btn-primary w-full py-3 text-sm font-semibold tracking-wider"
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading Video File...
                  </span>
                ) : "Start Real-Time Detection & Ingestion"}
              </button>
            )}

            {/* Live Progress Tracking */}
            {status && (
              <div className="space-y-4 rounded-xl bg-ink-soft/40 p-5 border border-ink-line">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-paper uppercase tracking-wider flex items-center gap-2">
                    <Activity className={`w-4 h-4 ${status.status === 'running' ? 'text-accent animate-pulse' : 'text-paper/40'}`} />
                    Processing Status:{" "}
                    <span className={
                      status.status === 'running' ? 'text-accent font-bold' : 
                      status.status === 'done' ? 'text-green-400 font-bold' : 
                      status.status === 'error' ? 'text-red-400' : 'text-paper'
                    }>{status.status.toUpperCase()}</span>
                  </h3>
                  {status.eta_seconds !== null && status.status === 'running' && (
                    <span className="text-xs font-mono text-accent">
                      ETA: ~{Math.ceil(status.eta_seconds ?? 0)}s remaining
                    </span>
                  )}
                </div>
                
                {status.status === 'running' || status.status === 'done' ? (
                  <>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink">
                      <div 
                        className="h-full bg-accent transition-all duration-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                        style={{ 
                          width: `${status.total_frames ? Math.min(100, Math.round((status.processed_frames! / status.total_frames) * 100)) : 0}%` 
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 sm:grid-cols-4 text-center">
                      <div className="bg-ink p-3 rounded-lg border border-ink-line">
                        <div className="text-[10px] text-paper/50 uppercase">Processed Frames</div>
                        <div className="font-mono text-base font-bold text-paper">{status.processed_frames} / {status.total_frames}</div>
                      </div>
                      <div className="bg-ink p-3 rounded-lg border border-ink-line">
                        <div className="text-[10px] text-paper/50 uppercase">Vehicles Detected</div>
                        <div className="font-mono text-base font-bold text-accent">{status.detections}</div>
                      </div>
                      <div className="bg-ink p-3 rounded-lg border border-ink-line">
                        <div className="text-[10px] text-paper/50 uppercase">512D Embeddings</div>
                        <div className="font-mono text-base font-bold text-purple-400">{status.embeddings}</div>
                      </div>
                      <div className="bg-ink p-3 rounded-lg border border-ink-line">
                        <div className="text-[10px] text-paper/50 uppercase">Elapsed Time</div>
                        <div className="font-mono text-base font-bold text-paper">{Math.round(status.elapsed_seconds || 0)}s</div>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Realtime Detected Vehicles Preview Below */}
                {status.detections_list && status.detections_list.length > 0 && (
                  <div className="pt-4 border-t border-ink-line space-y-3">
                    <h4 className="text-xs uppercase font-bold tracking-widest text-accent flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> Live Extracted Vehicles Identified ({status.detections_list.length})
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-ink-line max-h-72 bg-ink">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-ink-soft border-b border-ink-line text-[10px] text-paper/50 uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Vehicle Crop</th>
                            <th className="px-3 py-2 text-left">Vehicle Type</th>
                            <th className="px-3 py-2 text-left">Vehicle UID</th>
                            <th className="px-3 py-2 text-left">Frame</th>
                            <th className="px-3 py-2 text-left">Bounding Box</th>
                            <th className="px-3 py-2 text-right">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {status.detections_list.map((det, i) => (
                            <tr key={det.uid || i} className="border-b border-ink-line/30 hover:bg-ink-soft/40">
                              <td className="px-3 py-2 text-paper/40 font-mono text-[10px]">{i + 1}</td>
                              <td className="px-3 py-2">
                                <div className="w-12 h-10 rounded bg-ink-soft overflow-hidden border border-ink-line flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`http://localhost:8000/api/files/${encodeURIComponent(det.crop_path)}`}
                                    alt={det.uid}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-2 font-semibold text-accent capitalize">{det.vehicle_type || "Vehicle"}</td>
                              <td className="px-3 py-2 font-mono text-paper/80">{det.uid}</td>
                              <td className="px-3 py-2 font-mono text-paper/70">Frame {det.frame_id}</td>
                              <td className="px-3 py-2 font-mono text-paper/50 text-[10px]">{det.bbox.join(", ")}</td>
                              <td className="px-3 py-2 text-right font-mono text-green-400 font-bold">{(det.confidence * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Add To Dataset Section */}
                {(status.status === 'done' || (status.detections_list && status.detections_list.length > 0)) && (
                  <div className="mt-6 border-t border-ink-line pt-4 space-y-4">
                    {status.status === 'done' && (
                      <div className="p-4 rounded-xl border border-green-500/30 bg-green-950/20 text-green-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-400" />
                        <span>
                          Processing complete! All detected vehicle crops and embeddings have been indexed into the gallery store.
                        </span>
                      </div>
                    )}

                    {commitSuccess ? (
                      <div className="p-4 rounded-xl border border-accent/30 bg-accent/10 text-accent text-xs flex items-center justify-between">
                        <span>✅ {commitSuccess}</span>
                        <a href="/dataset" className="btn-primary text-xs px-3 py-1">View in Dataset Manager →</a>
                      </div>
                    ) : (
                      <div className="card p-4 border-accent/20 bg-ink space-y-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-accent" />
                          <h4 className="text-xs uppercase font-bold tracking-widest text-accent">
                            Add to Dataset
                          </h4>
                        </div>
                        <p className="text-xs text-paper/60">
                          Export the extracted vehicles as a new CSV manifest so they are directly searchable and accessible in the Dataset Manager.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="field text-xs font-mono flex-1"
                            placeholder="Dataset Name (e.g. video_cam01_manifest)"
                            value={commitName}
                            onChange={(e) => setCommitName(e.target.value)}
                          />
                          <button
                            onClick={handleCommitToDataset}
                            disabled={committing}
                            className="btn-primary text-xs px-5 py-2 font-semibold"
                          >
                            {committing ? "Saving..." : "Add to Dataset"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
