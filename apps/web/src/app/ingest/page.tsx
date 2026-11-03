"use client";

import { useState, useRef, useEffect } from "react";
import { ingestVideo, getIngestionStatus, commitVideoToDataset, IngestionStatus, IngestionDetection } from "@/lib/api";
import { CheckCircle2, Cpu, Database, Activity } from "lucide-react";

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
          <header className="flex flex-col gap-1 border-b border-ink-line pb-4">
            <h1 className="text-xl font-medium tracking-tight text-paper">
              Video Ingestion &amp; Feature Extraction
            </h1>
            <p className="text-sm text-paper-muted">
              Upload surveillance footage to run real-time vehicle detection, extract 512D Re-ID embeddings, and commit them directly to your dataset.
            </p>
          </header>

          <div className="card p-6 space-y-6">
            {/* Upload Zone */}
            <div 
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 transition-colors ${
                file ? 'border-accent bg-accent/5' : 'border-ink-line bg-ink hover:border-paper-muted/40 hover:bg-ink-soft'
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
                  <Cpu className="mx-auto mb-2 w-6 h-6 text-accent" />
                  <div className="font-medium text-paper text-sm">{file.name}</div>
                  <div className="text-xs text-paper-muted mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              ) : (
                <div className="text-center">
                  <Database className="mx-auto mb-2 w-6 h-6 text-paper-muted" />
                  <div className="font-medium text-paper text-sm">Select a video file to ingest</div>
                  <div className="text-xs text-paper-muted mt-1">MP4, AVI, MKV, MOV up to 500 MB</div>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-950/20 p-3 text-sm text-red-400 border border-red-500/30">
                {error}
              </div>
            )}

            {/* Upload Button */}
            {!jobId && (
              <button
                className="btn-primary w-full"
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading Video File...
                  </span>
                ) : "Process Video"}
              </button>
            )}

            {/* Live Progress Tracking */}
            {status && (
              <div className="space-y-4 rounded-lg bg-ink p-4 border border-ink-line">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-paper flex items-center gap-2">
                    <Activity className={`w-3.5 h-3.5 ${status.status === 'running' ? 'text-accent' : 'text-paper-muted'}`} />
                    Processing Status:{" "}
                    <span className={
                      status.status === 'running' ? 'text-accent font-semibold' : 
                      status.status === 'done' ? 'text-emerald-400 font-semibold' : 
                      status.status === 'error' ? 'text-red-400 font-semibold' : 'text-paper'
                    }>{status.status.toUpperCase()}</span>
                  </h3>
                  {status.eta_seconds !== null && status.status === 'running' && (
                    <span className="text-xs font-mono text-paper-muted">
                      ~{Math.ceil(status.eta_seconds ?? 0)}s remaining
                    </span>
                  )}
                </div>
                
                {status.status === 'running' || status.status === 'done' ? (
                  <>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-soft">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ 
                          width: `${status.total_frames ? Math.min(100, Math.round((status.processed_frames! / status.total_frames) * 100)) : 0}%` 
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4 text-center">
                      <div className="bg-ink-soft p-2.5 rounded border border-ink-line">
                        <div className="text-[11px] text-paper-muted">Processed Frames</div>
                        <div className="font-mono text-sm font-semibold text-paper">{status.processed_frames} / {status.total_frames}</div>
                      </div>
                      <div className="bg-ink-soft p-2.5 rounded border border-ink-line">
                        <div className="text-[11px] text-paper-muted">Vehicles Detected</div>
                        <div className="font-mono text-sm font-semibold text-paper">{status.detections}</div>
                      </div>
                      <div className="bg-ink-soft p-2.5 rounded border border-ink-line">
                        <div className="text-[11px] text-paper-muted">512D Embeddings</div>
                        <div className="font-mono text-sm font-semibold text-paper">{status.embeddings}</div>
                      </div>
                      <div className="bg-ink-soft p-2.5 rounded border border-ink-line">
                        <div className="text-[11px] text-paper-muted">Elapsed Time</div>
                        <div className="font-mono text-sm font-semibold text-paper">{Math.round(status.elapsed_seconds || 0)}s</div>
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Realtime Detected Vehicles Preview Below */}
                {status.detections_list && status.detections_list.length > 0 && (
                  <div className="pt-4 border-t border-ink-line space-y-3">
                    <h4 className="text-xs font-medium text-paper-muted flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" /> Identified Vehicles ({status.detections_list.length})
                    </h4>
                    <div className="overflow-x-auto rounded border border-ink-line max-h-72 bg-ink">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-ink-soft border-b border-ink-line text-[11px] text-paper-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">#</th>
                            <th className="px-3 py-2 text-left font-medium">Vehicle Crop</th>
                            <th className="px-3 py-2 text-left font-medium">Type</th>
                            <th className="px-3 py-2 text-left font-medium">Color</th>
                            <th className="px-3 py-2 text-left font-medium">Brand</th>
                            <th className="px-3 py-2 text-left font-medium">Plate OCR</th>
                            <th className="px-3 py-2 text-left font-medium">Frame</th>
                            <th className="px-3 py-2 text-right font-medium">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {status.detections_list.map((det, i) => (
                            <tr key={det.uid || i} className="border-b border-ink-line/50 hover:bg-ink-soft/40">
                              <td className="px-3 py-2 text-paper-muted font-mono">{i + 1}</td>
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
                              <td className="px-3 py-2 font-medium text-paper capitalize">{det.vehicle_type || "sedan"}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center gap-1.5 capitalize text-paper">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full border border-ink-line"
                                    style={{
                                      backgroundColor:
                                        det.color === "white" ? "#f3f4f6" :
                                        det.color === "black" ? "#111827" :
                                        det.color === "red" ? "#ef4444" :
                                        det.color === "blue" ? "#3b82f6" :
                                        det.color === "green" ? "#10b981" :
                                        det.color === "yellow" ? "#eab308" :
                                        det.color === "gray" ? "#9ca3af" :
                                        det.color === "orange" ? "#f97316" :
                                        det.color === "brown" ? "#78350f" : "#6b7280"
                                    }}
                                  />
                                  {det.color || "—"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-paper font-medium">{det.brand || "—"}</td>
                              <td className="px-3 py-2 font-mono text-paper font-semibold">
                                {det.plate_text ? (
                                  <span className="px-1.5 py-0.5 rounded bg-ink-soft border border-ink-line text-[11px]">
                                    {det.plate_text}
                                  </span>
                                ) : (
                                  <span className="text-paper-muted text-[11px]">unresolved</span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-paper-muted">Frame {det.frame_id}</td>
                              <td className="px-3 py-2 text-right font-mono text-emerald-400 font-medium">{(det.confidence * 100).toFixed(1)}%</td>
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
                      <div className="p-3 rounded-md border border-ink-line bg-ink-soft text-paper text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> {commitSuccess}</span>
                        <a href="/dataset" className="btn-secondary text-xs px-3 py-1">View in Dataset Manager</a>
                      </div>
                    ) : (
                      <div className="card p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-paper-muted" />
                          <h4 className="text-xs font-medium text-paper">
                            Add to Dataset
                          </h4>
                        </div>
                        <p className="text-xs text-paper-muted">
                          Export the extracted vehicles as a new CSV manifest so they are directly searchable in the Dataset Manager.
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
                            className="btn-primary text-xs px-4 py-2"
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
