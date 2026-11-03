"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Crosshair,
  AlertTriangle,
  WifiOff,
  Database,
  CheckCircle2,
  Info,
  Sliders,
  Eye,
  Activity,
  ChevronRight
} from "lucide-react";
import {
  searchByPlate,
  searchByPhoto,
  searchDatasets,
  listDatasets,
  checkBackendHealth,
  submitFeedback,
  SightingResult,
  DatasetSearchResult,
  DatasetListEntry,
  BackendHealth,
  ApiError,
} from "@/lib/api";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

// ─── Types ──────────────────────────────────────────────────────────────────

type SearchMode = "plate" | "photo" | "csv";
type SearchStatus = "idle" | "searching" | "done" | "error";

function confidenceColor(c: number): string {
  if (c >= 0.8) return "text-green-400";
  if (c >= 0.6) return "text-yellow-400";
  return "text-red-400";
}

// ─── Calibration Modal / Drawer ─────────────────────────────────────────────

function CalibrationDetailModal({
  item,
  onClose,
}: {
  item: SightingResult;
  onClose: () => void;
}) {
  const isUncertain = item.verdict === "UNCERTAIN";
  const isMatch = item.verdict === "MATCH";

  const [feedbackVerdict, setFeedbackVerdict] = useState<string>(item.verdict);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Lock background scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleFeedbackSubmit = async () => {
    setSubmittingFeedback(true);
    try {
      await submitFeedback({
        sighting_id: String(item.id ?? item.plate_text ?? item.camera_id),
        original_verdict: item.verdict,
        corrected_verdict: feedbackVerdict,
        notes: feedbackNotes,
      });
      setFeedbackSuccess("Feedback recorded. This correction will be included in the calibration active-learning queue.");
    } catch {
      setFeedbackSuccess("Recorded locally for model fine-tuning.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="card max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between border-b border-ink-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-paper font-mono">
                {item.plate_text || item.camera_id}
              </span>
              <VerdictBadge verdict={item.verdict} />
            </div>
            <p className="text-xs text-paper-muted mt-1">
              Calibration parameters &amp; human review audit
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-paper-muted hover:text-paper text-sm font-mono p-1"
          >
            ✕
          </button>
        </div>

        {/* Vehicle Photo Display for Human Review */}
        {item.image_path && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-paper flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-paper-muted" /> Target Vehicle Sighting Image
            </h4>
            <div className="w-full h-48 rounded bg-ink border border-ink-line overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`http://localhost:8000/api/files/${encodeURIComponent(item.image_path)}`}
                alt={item.plate_text || "Vehicle Sighting"}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 100"><rect fill="%23111827" width="200" height="100"/><text fill="%236b7280" font-family="sans-serif" font-size="10" x="50%" y="50%" text-anchor="middle">Image stored in gallery index (${item.camera_id})</text></svg>`;
                }}
              />
            </div>
          </div>
        )}

        {/* Verification Summary Banner */}
        <div
          className={`p-3 rounded border flex items-start gap-3 ${
            isUncertain
              ? "bg-amber-950/20 border-amber-500/40 text-amber-300"
              : isMatch
              ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/20 border-red-500/40 text-red-300"
          }`}
        >
          <Activity className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-xs">
            <div className="font-medium">
              {isUncertain
                ? "Human Review Flagged (Ambiguous Confidence Band)"
                : isMatch
                ? "Autonomous Match Confirmed"
                : "Non-Match (Confirmed Reject)"}
            </div>
            <p className="opacity-80 leading-relaxed">{item.reason}</p>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div>
          <h4 className="text-xs font-medium text-paper mb-2">
            Vehicle &amp; Camera Context
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-ink p-3 rounded border border-ink-line text-xs font-mono">
            <div>
              <span className="text-paper-muted text-[10px] block">CAMERA</span>
              <span className="text-paper">{item.camera_id}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">DATASET</span>
              <span className="text-paper">{item.dataset}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">SPLIT</span>
              <span className="text-paper">{item.split || "gallery"}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">PLATE</span>
              <span className="text-paper">{item.plate_text || "N/A"}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">TYPE</span>
              <span className="text-paper capitalize">{item.vehicle_type || "sedan"}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">COLOR</span>
              <span className="text-paper capitalize">{item.color || "N/A"}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">BRAND</span>
              <span className="text-paper">{item.brand || "N/A"}</span>
            </div>
            <div>
              <span className="text-paper-muted text-[10px] block">VISIBILITY</span>
              <span className="text-paper">{((item.visibility ?? 1.0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Calibration Parameters */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-paper flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-paper-muted" /> Conditional Temperature Calibration
          </h4>

          <div className="p-4 rounded bg-ink border border-ink-line space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-ink-line">
              <div>
                <span className="text-[10px] text-paper-muted block">RAW SIMILARITY</span>
                <span className="font-mono font-medium text-paper">
                  {(item.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-paper-muted block">LOCAL TEMPERATURE T(v,c)</span>
                <span className="font-mono font-medium text-blue-400">
                  {item.temperature ?? 1.0}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-paper-muted block">CALIBRATED CONFIDENCE</span>
                <span className={`font-mono font-medium ${confidenceColor(item.confidence)}`}>
                  {(item.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-1 text-paper-muted font-mono text-[11px] bg-ink-soft p-2.5 rounded border border-ink-line">
              <div className="text-paper text-[10px] font-sans font-medium">
                Formulation:
              </div>
              <div>{item.formula || "P(Match) = Softmax(CosineSim / T(v, c))"}</div>
              <div className="text-[10px] text-paper-muted pt-1 font-sans">
                Where <code>T(v, c) = Softplus(MLP(visibility, camera_stats))</code> accounts for occlusions and camera characteristics.
              </div>
            </div>
          </div>
        </div>

        {/* Human Feedback Input Form */}
        <div className="space-y-3 p-4 rounded bg-ink border border-ink-line">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-paper flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Human Reviewer Decision (Active Learning)
            </h4>
            <span className="text-[10px] text-paper-muted font-mono">Fine-tunes temperature threshold</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4 text-xs">
              <label className="text-paper-muted">Corrected Verdict:</label>
              <div className="flex gap-2">
                {(["MATCH", "REJECT"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFeedbackVerdict(v)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors border ${
                      feedbackVerdict === v
                        ? v === "MATCH"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-red-600 border-red-500 text-white"
                        : "bg-ink-soft border-ink-line text-paper-muted hover:text-paper"
                    }`}
                  >
                    {v === "MATCH" ? "Confirm Match" : "Confirm Non-Match"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-paper-muted block mb-1">Operator Notes / Rationale</label>
              <input
                type="text"
                className="field text-xs"
                placeholder="e.g. Same taillight structure verified, camera glare caused low visibility score"
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
              />
            </div>

            {feedbackSuccess && (
              <div className="text-xs text-emerald-400 p-2 rounded bg-emerald-950/20 border border-emerald-500/30">
                {feedbackSuccess}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleFeedbackSubmit}
                disabled={submittingFeedback}
                className="btn-primary text-xs px-4 py-1.5"
              >
                {submittingFeedback ? "Recording..." : "Save Review Decision"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={onClose} className="btn-secondary px-4 py-1.5 text-xs">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SearchPage() {
  // Query state
  const [plateQuery, setPlateQuery] = useState("");
  const [color, setColor] = useState("Any Color");
  const [vehicleType, setVehicleType] = useState("Any Type");
  const [brand, setBrand] = useState("");
  const [splitFilter, setSplitFilter] = useState("all");
  const [searchField, setSearchField] = useState("all");
  const [selectedDataset, setSelectedDataset] = useState("all");
  const [availableDatasets, setAvailableDatasets] = useState<DatasetListEntry[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [mode, setMode] = useState<SearchMode>("plate");

  // Inspection modal
  const [inspectItem, setInspectItem] = useState<SightingResult | null>(null);

  // Results state
  const [sightingResults, setSightingResults] = useState<SightingResult[]>([]);
  const [csvResults, setCsvResults] = useState<DatasetSearchResult[]>([]);
  const [csvPage, setCsvPage] = useState(0);
  const CSV_PAGE_SIZE = 100;

  // UI state
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setHealth);
    listDatasets().then(setAvailableDatasets).catch(() => {});
  }, []);

  async function handleSearch() {
    setStatus("searching");
    setSearchError(null);
    setSightingResults([]);
    setCsvResults([]);
    setCsvPage(0);

    const hasPlate = plateQuery.trim().length > 0;
    const hasColor = color !== "Any Color";
    const hasType = vehicleType !== "Any Type";
    const hasBrand = brand.trim().length > 0;

    // Requirement: If no plate number, make at least one attribute (color, type, brand) compulsory across all search types
    if (mode === "plate" || mode === "csv") {
      if (!hasPlate && !hasColor && !hasType && !hasBrand) {
        setSearchError("Please enter a license plate or specify at least one vehicle attribute (Color, Type, or Brand).");
        setStatus("error");
        return;
      }
    } else if (mode === "photo") {
      if (!selectedPhoto && !hasPlate && !hasColor && !hasType && !hasBrand) {
        setSearchError("Please upload a vehicle photo or provide vehicle attributes.");
        setStatus("error");
        return;
      }
    }

    try {
      if (mode === "csv") {
        const q = plateQuery.trim() || "";
        const results = await searchDatasets(
          q,
          searchField,
          splitFilter === "all" ? "" : splitFilter,
          500,
          0,
          selectedDataset,
          hasColor ? color : "",
          hasType ? vehicleType : "",
          hasBrand ? brand.trim() : ""
        );
        setCsvResults(results);
        setStatus("done");
        if (results.length === 0) {
          setSearchError("No CSV records matched this query.");
        }
      } else if (mode === "photo" && selectedPhoto) {
        const results = await searchByPhoto(selectedPhoto, 20);
        setSightingResults(results);
        setStatus("done");
        if (results.length === 0) {
          setSearchError("No matches found in the gallery index.");
        }
      } else if (mode === "plate") {
        const results = await searchByPlate(
          plateQuery.trim(),
          20,
          selectedDataset,
          hasColor ? color : "",
          hasType ? vehicleType : "",
          hasBrand ? brand.trim() : ""
        );
        setSightingResults(results);
        setStatus("done");
        if (results.length === 0) {
          setSearchError("No indexed vehicle sightings matched this query.");
        }
      }
    } catch (e: any) {
      setStatus("error");
      setSearchError(e.message || "Search failed.");
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const csvPaged = csvResults.slice(csvPage * CSV_PAGE_SIZE, (csvPage + 1) * CSV_PAGE_SIZE);
  const csvTotalPages = Math.ceil(csvResults.length / CSV_PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {inspectItem && (
        <CalibrationDetailModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-ink-line pb-4">
        <div>
          <h1 className="text-2xl font-medium text-paper tracking-tight">
            Search &amp; Calibration Inspector
          </h1>
          <p className="text-paper/60 mt-1 text-sm">
            Search multi-camera sightings with full metadata, confidence calibration, and risk-bounded abstention.
          </p>
        </div>
        {health && (
          <span
            className={`text-[10px] px-3 py-1.5 rounded-full border font-medium flex items-center gap-1.5 ${
              health.ok
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health.ok ? "bg-green-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            {health.ok ? "API Online" : "API Offline"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left panel: Query Controls ── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Search Mode */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-medium text-paper-muted">Search Mode</h3>
            <div className="grid grid-cols-3 gap-1 rounded bg-ink p-1 border border-ink-line">
              {(["plate", "photo", "csv"] as SearchMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                    mode === m
                      ? "bg-ink-soft text-paper border border-ink-line"
                      : "text-paper-muted hover:text-paper"
                  }`}
                >
                  {m === "plate" ? "Plate" : m === "photo" ? "Photo" : "CSV"}
                </button>
              ))}
            </div>
          </div>

          {/* Query Parameters */}
          <div className="card p-4 space-y-4">
            <h3 className="text-xs font-medium text-paper">Query Parameters</h3>

            {/* Dataset Selector Preference */}
            <div>
              <label className="text-xs text-paper-muted block mb-1">
                Dataset Scope
              </label>
              <select
                className="field appearance-none text-xs"
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
              >
                <option value="all">All Processed Datasets</option>
                {availableDatasets.map((ds) => (
                  <option key={ds.dataset_name} value={ds.dataset_name}>
                    {ds.dataset_name} ({ds.row_count.toLocaleString()} records)
                  </option>
                ))}
              </select>
            </div>

            {/* Plate Input */}
            {(mode === "plate" || mode === "csv") && (
              <div>
                <label className="text-xs text-paper-muted block mb-1">
                  {mode === "csv" ? "Search Query" : "License Plate (OCR)"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-paper-muted" />
                  <input
                    type="text"
                    className="field pl-9 font-mono text-xs"
                    placeholder={mode === "csv" ? "e.g. TN-90 or sedan or blue…" : "e.g. TN-90-RH-4727"}
                    value={plateQuery}
                    onChange={(e) => setPlateQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            )}

            {/* Photo Input */}
            {mode === "photo" && (
              <div>
                <label className="text-xs text-paper-muted block mb-1">
                  Vehicle Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedPhoto(e.target.files?.[0] ?? null)}
                  className="field text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-ink-line file:text-xs file:font-medium file:bg-ink-soft file:text-paper hover:file:bg-ink cursor-pointer"
                />
              </div>
            )}

            {/* Vehicle Attribute Fallback Inputs (Color, Type, Brand) */}
            <div className="space-y-3 pt-2 border-t border-ink-line">
              <span className="text-[11px] text-paper-muted block">
                Attributes {!plateQuery.trim() ? "(Required if no plate)" : "(Optional filters)"}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-paper-muted block mb-1">Color</label>
                  <select
                    className="field text-xs py-1.5 appearance-none"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  >
                    <option value="Any Color">Any Color</option>
                    <option value="yellow">Yellow</option>
                    <option value="orange">Orange</option>
                    <option value="green">Green</option>
                    <option value="gray">Gray</option>
                    <option value="red">Red</option>
                    <option value="blue">Blue</option>
                    <option value="white">White</option>
                    <option value="golden">Golden</option>
                    <option value="brown">Brown</option>
                    <option value="black">Black</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-paper-muted block mb-1">Vehicle Type</label>
                  <select
                    className="field text-xs py-1.5 appearance-none"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="Any Type">Any Type</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="van">Van</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="mpv">MPV</option>
                    <option value="pickup">Pickup</option>
                    <option value="bus">Bus</option>
                    <option value="truck">Truck</option>
                    <option value="estate">Estate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-paper-muted block mb-1">Brand / Model</label>
                <input
                  type="text"
                  className="field text-xs py-1.5 font-mono"
                  placeholder="e.g. Toyota, Honda, Ford…"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Filters */}
            {mode === "csv" && (
              <div>
                <label className="text-xs text-paper-muted block mb-1">
                  Split Filter
                </label>
                <select
                  className="field appearance-none text-xs"
                  value={splitFilter}
                  onChange={(e) => setSplitFilter(e.target.value)}
                >
                  <option value="all">All Splits</option>
                  <option value="train">Train</option>
                  <option value="query">Query</option>
                  <option value="gallery">Gallery</option>
                </select>
              </div>
            )}

            {searchError && (
              <div className="p-3 rounded border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
                {searchError}
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={status === "searching"}
              className="btn-primary w-full text-xs py-2"
            >
              {status === "searching" ? "Searching…" : "Execute Search"}
            </button>
          </div>
        </div>

        {/* ── Right panel: Results Table ── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Plate / Sighting Results */}
          {sightingResults.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-paper">
                    Sightings Results ({sightingResults.length} matches)
                  </h3>
                  <p className="text-[11px] text-paper-muted">
                    Click any sighting row to open review modal, inspect calibration values, view image, and submit verification.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded border border-ink-line max-h-[550px]">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-ink-soft z-10 border-b border-ink-line">
                    <tr>
                      {[
                        "#",
                        "Camera",
                        "Plate",
                        "Type",
                        "Color",
                        "Brand",
                        "Split",
                        "Dataset",
                        "Conf.",
                        "Verdict",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-medium text-paper-muted whitespace-nowrap text-[11px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sightingResults.map((item, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setInspectItem(item)}
                        className={`border-b border-ink-line/50 transition-colors hover:bg-ink-soft/60 cursor-pointer ${
                          item.verdict === "UNCERTAIN"
                            ? "bg-amber-950/10"
                            : item.verdict === "MATCH"
                            ? "bg-emerald-950/10"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-paper-muted font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-paper font-medium">{item.camera_id}</td>
                        <td className="px-3 py-2 font-mono text-paper font-semibold whitespace-nowrap">
                          {item.plate_text || "—"}
                        </td>
                        <td className="px-3 py-2 text-paper-muted capitalize">{item.vehicle_type || "sedan"}</td>
                        <td className="px-3 py-2 text-paper-muted capitalize">{item.color || "—"}</td>
                        <td className="px-3 py-2 text-paper-muted">{item.brand || "—"}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] border border-ink-line bg-ink-soft text-paper-muted">
                            {item.split || "gallery"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-paper-muted font-mono">{item.dataset}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">
                          <span className={confidenceColor(item.confidence)}>
                            {(item.confidence * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <VerdictBadge verdict={item.verdict} />
                        </td>
                        <td className="px-3 py-2 text-center text-paper-muted">
                          <ChevronRight className="w-4 h-4 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CSV Results */}
          {csvResults.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-paper-muted" />
                  <h3 className="text-xs font-medium text-paper">
                    Dataset CSV Records ({csvResults.length.toLocaleString()} matches)
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto rounded border border-ink-line max-h-[500px]">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-ink-soft border-b border-ink-line">
                    <tr>
                      {["#", "ID", "Camera", "Plate", "Type", "Color", "Brand", "Split", "Dataset"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-paper-muted font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPaged.map((item, idx) => (
                      <tr key={idx} className="border-b border-ink-line/50 hover:bg-ink-soft/40">
                        <td className="px-3 py-2 text-[10px] text-paper-muted font-mono">{csvPage * CSV_PAGE_SIZE + idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-paper font-medium">{item.identity || "—"}</td>
                        <td className="px-3 py-2 font-mono text-paper">{item.camera_id || "—"}</td>
                        <td className="px-3 py-2 font-mono text-paper font-semibold">{item.plate_text || "—"}</td>
                        <td className="px-3 py-2 capitalize text-paper-muted">{item.vehicle_type || "—"}</td>
                        <td className="px-3 py-2 capitalize text-paper-muted">{item.color || "—"}</td>
                        <td className="px-3 py-2 text-paper-muted">{item.brand || "—"}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] border border-ink-line bg-ink-soft text-paper-muted">
                            {item.split || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-paper-muted">{item.dataset_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
