"use client";

import { useEffect, useState } from "react";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Edit3, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  FileText 
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type DeviceLinkBudgetSectionProps = {
  deviceId: string;
  regionId: string;
  token: string;
};

type LinkBudgetEstimate = {
  id: string;
  estimate_id?: string;
  device_id: string;
  region_id: string;
  calculated_loss_db: number | null;
  measured_loss_db: number | null;
  ont_rx_power_dbm: number | null;
  olt_tx_power_dbm: number | null;
  engineering_margin_db: number;
  measurement_date: string | null;
  measurement_method: "otdr" | "power_meter" | "manual" | "estimate" | null;
  evidence_attachment_id: string | null;
  gpon_class: "B_plus" | "C_plus" | null;
  gpon_budget_db: number | null;
  warnings: Array<{ code: string; severity: "critical" | "warning" | "info"; message: string }>;
  notes: string | null;
  updated_at?: string;
};

type SegmentInput = {
  label: string;
  distanceKm: string;
  spliceCount: string;
  connectorCount: string;
};

type CalculationResult = {
  parameters: {
    attenuation_per_km: number;
    splice_loss: number;
    connector_loss: number;
    engineering_margin: number;
  };
  segments: Array<{
    label: string | null;
    distance_km: number;
    splice_count: number;
    connector_count: number;
    fiber_loss_db: number;
  }>;
  splitter_loss_db: number;
  fiber_loss_db: number;
  splice_loss_db: number;
  connector_loss_db: number;
  engineering_margin_db: number;
  calculated_loss_db: number;
  gpon_class: string;
  gpon_budget_db: number;
  margin_db: number;
  warnings: Array<{ code: string; severity: "critical" | "warning" | "info"; message: string }>;
};

export function DeviceLinkBudgetSection({ deviceId, regionId, token }: DeviceLinkBudgetSectionProps) {
  const [estimate, setEstimate] = useState<LinkBudgetEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Form states
  const [gponClass, setGponClass] = useState<"B_plus" | "C_plus">("B_plus");
  const [calculatedLoss, setCalculatedLoss] = useState("");
  const [measuredLoss, setMeasuredLoss] = useState("");
  const [ontRxPower, setOntRxPower] = useState("");
  const [oltTxPower, setOltTxPower] = useState("");
  const [engineeringMargin, setEngineeringMargin] = useState("3.0");
  const [measurementDate, setMeasurementDate] = useState("");
  const [measurementMethod, setMeasurementMethod] = useState<"otdr" | "power_meter" | "manual" | "estimate">("otdr");
  const [notes, setNotes] = useState("");
  const [evidenceAttachmentId, setEvidenceAttachmentId] = useState("");
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Calculator states
  const [splitterRatios, setSplitterRatios] = useState<string>("1:4, 1:8");
  const [segments, setSegments] = useState<SegmentInput[]>([
    { label: "Feeder Segment", distanceKm: "1.5", spliceCount: "3", connectorCount: "2" },
    { label: "Distribution Segment", distanceKm: "0.8", spliceCount: "2", connectorCount: "2" }
  ]);
  const [calculating, setCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);

  useEffect(() => {
    fetchEstimate();
  }, [deviceId, token]);

  const fetchEstimate = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<{ data: { estimate: LinkBudgetEstimate | null } }>(
        `/devices/${encodeURIComponent(deviceId)}/link-budget`,
        { token }
      );
      const est = response?.data?.estimate;
      setEstimate(est);
      if (est) {
        setGponClass(est.gpon_class || "B_plus");
        setCalculatedLoss(est.calculated_loss_db != null ? String(est.calculated_loss_db) : "");
        setMeasuredLoss(est.measured_loss_db != null ? String(est.measured_loss_db) : "");
        setOntRxPower(est.ont_rx_power_dbm != null ? String(est.ont_rx_power_dbm) : "");
        setOltTxPower(est.olt_tx_power_dbm != null ? String(est.olt_tx_power_dbm) : "");
        setEngineeringMargin(est.engineering_margin_db != null ? String(est.engineering_margin_db) : "3.0");
        setMeasurementDate(est.measurement_date || "");
        setMeasurementMethod(est.measurement_method || "otdr");
        setNotes(est.notes || "");
        setEvidenceAttachmentId(est.evidence_attachment_id || "");
      } else {
        resetForm();
      }
    } catch (err) {
      setError((err as Error).message || "Gagal memuat data link budget.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGponClass("B_plus");
    setCalculatedLoss("");
    setMeasuredLoss("");
    setOntRxPower("");
    setOltTxPower("");
    setEngineeringMargin("3.0");
    setMeasurementDate("");
    setMeasurementMethod("otdr");
    setNotes("");
    setEvidenceAttachmentId("");
    setUploadedFileName("");
  };

  const handleAddSegment = () => {
    setSegments([...segments, { label: `Segment ${segments.length + 1}`, distanceKm: "0.0", spliceCount: "0", connectorCount: "0" }]);
  };

  const handleRemoveSegment = (index: number) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSegmentChange = (index: number, field: keyof SegmentInput, value: string) => {
    const next = [...segments];
    next[index] = { ...next[index], [field]: value };
    setSegments(next);
  };

  const runCalculation = async () => {
    setCalculating(true);
    setError("");
    setSuccess("");
    try {
      const parsedRatios = splitterRatios
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);

      const parsedSegments = segments.map((s) => ({
        label: s.label || null,
        distance_km: parseFloat(s.distanceKm) || 0,
        splice_count: parseInt(s.spliceCount, 10) || 0,
        connector_count: parseInt(s.connectorCount, 10) || 0,
      }));

      const body = {
        splitter_ratios: parsedRatios,
        segments: parsedSegments,
        gpon_class: gponClass,
        engineering_margin_db: parseFloat(engineeringMargin) || 3.0,
        measured_loss_db: measuredLoss ? parseFloat(measuredLoss) : null,
      };

      const response = await apiFetch<{ data: CalculationResult }>(
        `/devices/${encodeURIComponent(deviceId)}/link-budget/calculate`,
        {
          method: "POST",
          token,
          body,
        }
      );

      if (response?.data) {
        setCalcResult(response.data);
        setCalculatedLoss(String(response.data.calculated_loss_db));
        setSuccess("Kalkulasi link budget berhasil dijalankan.");
      } else {
        throw new Error("Respon kalkulasi tidak valid.");
      }
    } catch (err) {
      setError((err as Error).message || "Gagal menghitung link budget.");
    } finally {
      setCalculating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("file_category", "field_photo");
      formData.append("entity_type", "devices");
      formData.append("entity_id", deviceId);

      const response = await apiFetch<{ data: { attachment_id: string; original_name: string } }>("/attachments/upload", {
        method: "POST",
        token,
        body: formData,
      });

      if (response?.data?.attachment_id) {
        setEvidenceAttachmentId(response.data.attachment_id);
        setUploadedFileName(response.data.original_name || file.name);
        setSuccess(`File ${file.name} berhasil diunggah.`);
      } else {
        throw new Error("Gagal mengunggah file bukti.");
      }
    } catch (err) {
      setError((err as Error).message || "Gagal mengunggah file bukti.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const body = {
        gpon_class: gponClass,
        calculated_loss_db: calculatedLoss ? parseFloat(calculatedLoss) : null,
        measured_loss_db: measuredLoss ? parseFloat(measuredLoss) : null,
        ont_rx_power_dbm: ontRxPower ? parseFloat(ontRxPower) : null,
        olt_tx_power_dbm: oltTxPower ? parseFloat(oltTxPower) : null,
        engineering_margin_db: parseFloat(engineeringMargin) || 3.0,
        measurement_date: measurementDate || null,
        measurement_method: measurementMethod || null,
        evidence_attachment_id: evidenceAttachmentId || null,
        notes: notes || null,
        warnings: calcResult ? calcResult.warnings : (estimate?.warnings || []),
      };

      const response = await apiFetch<{ data: LinkBudgetEstimate }>(
        `/devices/${encodeURIComponent(deviceId)}/link-budget`,
        {
          method: "PUT",
          token,
          body,
        }
      );

      if (response?.data) {
        setEstimate(response.data);
        setIsEditing(false);
        setIsCalculatorOpen(false);
        setSuccess("Estimasi link budget berhasil disimpan.");
      } else {
        throw new Error("Gagal menyimpan estimasi.");
      }
    } catch (err) {
      setError((err as Error).message || "Gagal menyimpan data link budget.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-visible bg-card">
        <CardContent className="p-6 text-center text-xs font-mono text-text-secondary uppercase">
          [LOADING LINK BUDGET...]
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-visible bg-card text-card-foreground shadow-none">
      <CardHeader className="flex flex-row items-center justify-between border-b border-visible px-4 py-3">
        <div className="space-y-0.5">
          <CardTitle className="font-sans text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Calculator className="size-4 text-text-secondary" />
            Link Budget & Optical Power
          </CardTitle>
          <CardDescription className="font-sans text-xs text-text-secondary">
            Kalkulator redaman teoritis dan pencatatan hasil ukur lapangan (GPON B+/C+)
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => setIsEditing(true)}
            className="font-mono text-[11px] uppercase tracking-wide border-visible hover:bg-surface-raised"
          >
            <Edit3 className="mr-1 size-3" /> Edit / Hitung
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-4 font-sans">
        {/* Messages */}
        {error && (
          <div className="border border-red-500 bg-red-500/10 p-3 text-xs font-mono text-red-500 flex items-start gap-2 rounded-none">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">[ERROR]</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}
        {success && (
          <div className="border border-success bg-success/10 p-3 text-xs font-mono text-success flex items-start gap-2 rounded-none">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">[SUCCESS]</p>
              <p className="mt-0.5 leading-relaxed">{success}</p>
            </div>
          </div>
        )}

        {/* Warnings Display */}
        {estimate?.warnings && estimate.warnings.length > 0 && !isEditing && (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">[STATUS PERINGATAN]</p>
            <div className="space-y-1">
              {estimate.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className={`border p-2 text-xs font-mono flex items-start gap-2 ${
                    w.severity === "critical"
                      ? "border-red-500 bg-red-500/5 text-red-500"
                      : w.severity === "warning"
                      ? "border-amber-500 bg-amber-500/5 text-amber-500"
                      : "border-visible bg-surface text-text-secondary"
                  }`}
                >
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase text-[9px] tracking-wide block">
                      [{w.code}]
                    </span>
                    <span className="mt-0.5 block leading-normal">{w.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isEditing ? (
          /* Stored Link Budget View */
          estimate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="border border-visible p-3 rounded-none bg-surface/50">
                  <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">GPON Class</span>
                  <span className="font-sans font-bold text-sm text-text-primary block mt-0.5">
                    Class {estimate.gpon_class === "C_plus" ? "C+" : "B+"}
                  </span>
                  <span className="font-mono text-[11px] text-text-secondary block mt-1">
                    Budget: {estimate.gpon_budget_db?.toFixed(1) || "28.0"} dB
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-visible p-3 rounded-none bg-surface/50">
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Calculated Loss</span>
                    <span className="font-mono font-bold text-lg text-text-primary block mt-0.5">
                      {estimate.calculated_loss_db != null ? `${estimate.calculated_loss_db.toFixed(2)} dB` : "-"}
                    </span>
                    <span className="font-mono text-[10px] text-text-disabled block">
                      Margin: {estimate.engineering_margin_db?.toFixed(1) || "3.0"} dB
                    </span>
                  </div>

                  <div className="border border-visible p-3 rounded-none bg-surface/50">
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Measured Loss</span>
                    <span className={`font-mono font-bold text-lg block mt-0.5 ${
                      estimate.measured_loss_db != null 
                        ? (estimate.calculated_loss_db != null && Math.abs(estimate.measured_loss_db - estimate.calculated_loss_db) >= 3.0
                            ? "text-amber-500" 
                            : "text-success") 
                        : "text-text-primary"
                    }`}>
                      {estimate.measured_loss_db != null ? `${estimate.measured_loss_db.toFixed(2)} dB` : "-"}
                    </span>
                    <span className="font-mono text-[10px] text-text-disabled block">
                      Link Margin: {estimate.calculated_loss_db != null && estimate.gpon_budget_db != null
                        ? `${(estimate.gpon_budget_db - estimate.calculated_loss_db).toFixed(2)} dB`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-visible p-3 rounded-none bg-surface/50">
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">ONT Rx Power</span>
                    <span className="font-mono font-semibold text-sm text-text-primary block mt-0.5">
                      {estimate.ont_rx_power_dbm != null ? `${estimate.ont_rx_power_dbm.toFixed(2)} dBm` : "-"}
                    </span>
                  </div>

                  <div className="border border-visible p-3 rounded-none bg-surface/50">
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">OLT Tx Power</span>
                    <span className="font-mono font-semibold text-sm text-text-primary block mt-0.5">
                      {estimate.olt_tx_power_dbm != null ? `${estimate.olt_tx_power_dbm.toFixed(2)} dBm` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-visible p-3 rounded-none bg-surface/50 space-y-2">
                  <div>
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Metode Ukur</span>
                    <span className="font-sans text-xs text-text-primary font-medium block mt-0.5">
                      {estimate.measurement_method === "otdr" && "OTDR (Optical Time Domain Reflectometer)"}
                      {estimate.measurement_method === "power_meter" && "OPM (Optical Power Meter)"}
                      {estimate.measurement_method === "manual" && "Manual Wording / Estimasi Lapangan"}
                      {estimate.measurement_method === "estimate" && "Hanya Estimasi Software"}
                      {!estimate.measurement_method && "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Tanggal Ukur</span>
                    <span className="font-mono text-xs text-text-primary block mt-0.5">
                      {estimate.measurement_date || "-"}
                    </span>
                  </div>
                  {estimate.evidence_attachment_id && (
                    <div>
                      <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">File Bukti Lapangan</span>
                      <span className="text-xs text-interactive flex items-center gap-1 mt-0.5">
                        <FileText className="size-3.5" />
                        ID Attachment: {estimate.evidence_attachment_id.substring(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>

                <div className="border border-visible p-3 rounded-none bg-surface/50">
                  <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Catatan Teknis</span>
                  <p className="font-sans text-xs text-text-primary block mt-1 leading-relaxed whitespace-pre-wrap">
                    {estimate.notes || "Tidak ada catatan."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-visible">
              <Calculator className="size-8 text-text-disabled mx-auto mb-2" />
              <p className="text-xs text-text-secondary">Belum ada estimasi link budget tersimpan untuk perangkat ini.</p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setIsEditing(true)}
                className="mt-3 font-mono text-[10px] uppercase border-visible hover:bg-surface-raised"
              >
                Mulai Hitung / Isi Data
              </Button>
            </div>
          )
        ) : (
          /* Editing Form & Calculator */
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-visible">
              <span className="font-mono text-xs text-text-primary uppercase tracking-wide">Form Estimasi Link Budget</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIsEditing(false);
                  setIsCalculatorOpen(false);
                }}
                className="font-mono text-[11px] uppercase tracking-wide hover:bg-surface-raised"
              >
                <X className="mr-1 size-3" /> Batal
              </Button>
            </div>

            {/* Config & Targets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gponClass" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">GPON Wavelength Class</Label>
                <Select
                  value={gponClass}
                  onValueChange={(val: "B_plus" | "C_plus") => setGponClass(val)}
                >
                  <SelectTrigger id="gponClass" className="rounded-none border-visible bg-surface font-sans text-xs">
                    <SelectValue placeholder="Pilih GPON Class" />
                  </SelectTrigger>
                  <SelectContent className="border-visible bg-card font-sans text-xs">
                    <SelectItem value="B_plus">Class B+ (28.0 dB Budget)</SelectItem>
                    <SelectItem value="C_plus">Class C+ (32.0 dB Budget)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="calculatedLoss" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Calculated Loss (dB)</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="calculatedLoss"
                    type="number"
                    step="0.001"
                    placeholder="Hitung otomatis"
                    value={calculatedLoss}
                    onChange={(e) => setCalculatedLoss(e.target.value)}
                    className="rounded-none border-visible bg-surface font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                    className="font-mono text-[11px] border-visible rounded-none hover:bg-surface-raised shrink-0"
                  >
                    Kalkulator {isCalculatorOpen ? <ChevronUp className="ml-1 size-3.5" /> : <ChevronDown className="ml-1 size-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="engineeringMargin" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Engineering Margin (dB)</Label>
                <Input
                  id="engineeringMargin"
                  type="number"
                  step="0.1"
                  value={engineeringMargin}
                  onChange={(e) => setEngineeringMargin(e.target.value)}
                  className="rounded-none border-visible bg-surface font-mono text-xs"
                />
              </div>
            </div>

            {/* Collapsible Calculator */}
            {isCalculatorOpen && (
              <div className="border border-visible p-4 bg-surface/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-xs uppercase font-semibold text-text-primary tracking-wide">
                    Simulasi Link Budget Wavelength
                  </h4>
                  <Badge variant="outline" className="font-mono text-[9px] uppercase">
                    Atten @1310nm = 0.35dB/km
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="splitterRatios" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">
                    Splitter Ratios (Pisahkan dengan koma)
                  </Label>
                  <Input
                    id="splitterRatios"
                    placeholder="Contoh: 1:4, 1:8"
                    value={splitterRatios}
                    onChange={(e) => setSplitterRatios(e.target.value)}
                    className="rounded-none border-visible bg-surface font-sans text-xs"
                  />
                  <p className="text-[10px] text-text-secondary font-mono leading-normal">
                    Standard Splitter Losses: 1:2 (~3.5dB) | 1:4 (~7.2dB) | 1:8 (~10.5dB) | 1:16 (~13.8dB)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Segmen Fiber Kabel</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handleAddSegment}
                      className="font-mono text-[10px] uppercase border-visible hover:bg-surface-raised"
                    >
                      <Plus className="mr-1 size-3" /> Tambah Segmen
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {segments.map((seg, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center border-b border-visible/50 pb-2">
                        <div className="col-span-4">
                          <Input
                            placeholder="Nama Segmen"
                            value={seg.label}
                            onChange={(e) => handleSegmentChange(idx, "label", e.target.value)}
                            className="rounded-none border-visible bg-surface font-sans text-xs h-7"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Km"
                            value={seg.distanceKm}
                            onChange={(e) => handleSegmentChange(idx, "distanceKm", e.target.value)}
                            className="rounded-none border-visible bg-surface font-mono text-xs h-7"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Sambung"
                            value={seg.spliceCount}
                            onChange={(e) => handleSegmentChange(idx, "spliceCount", e.target.value)}
                            className="rounded-none border-visible bg-surface font-mono text-xs h-7"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Konektor"
                            value={seg.connectorCount}
                            onChange={(e) => handleSegmentChange(idx, "connectorCount", e.target.value)}
                            className="rounded-none border-visible bg-surface font-mono text-xs h-7"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleRemoveSegment(idx)}
                            className="text-red-500 hover:bg-red-500/10 h-7 w-7 p-0 rounded-none shrink-0"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-visible">
                  <Button
                    type="button"
                    onClick={runCalculation}
                    disabled={calculating}
                    className="font-mono text-xs uppercase tracking-wider rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {calculating ? "Menghitung..." : "Hitung Redaman"}
                  </Button>
                </div>

                {calcResult && (
                  <div className="border border-visible p-3 bg-surface font-mono text-xs space-y-2 rounded-none">
                    <p className="font-bold text-[10px] text-text-secondary uppercase tracking-wider">[BREAKDOWN REDAMAN]</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] leading-normal text-text-primary">
                      <div>Splitter Loss: {calcResult.splitter_loss_db} dB</div>
                      <div>Fiber Loss: {calcResult.fiber_loss_db} dB</div>
                      <div>Splice Loss: {calcResult.splice_loss_db} dB ({calcResult.parameters.splice_loss} dB/titik)</div>
                      <div>Connector Loss: {calcResult.connector_loss_db} dB ({calcResult.parameters.connector_loss} dB/pasang)</div>
                      <div>Engineering Margin: {calcResult.engineering_margin_db} dB</div>
                      <div className="col-span-2 border-t border-visible/50 pt-1 font-bold">
                        Calculated Loss: {calcResult.calculated_loss_db} dB
                      </div>
                    </div>
                    {calcResult.warnings && calcResult.warnings.length > 0 && (
                      <div className="space-y-1 mt-2 pt-1 border-t border-visible/50">
                        <span className="font-semibold text-[9px] text-amber-500 block uppercase">[WARNING CALCULATOR]</span>
                        {calcResult.warnings.map((w, i) => (
                          <div key={i} className="text-[10px] text-amber-500 flex items-start gap-1">
                            <span>•</span>
                            <span>{w.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Field Measurement Data */}
            <div className="border border-visible p-4 bg-surface/10 space-y-4">
              <h4 className="font-mono text-xs uppercase font-semibold text-text-primary tracking-wide">
                Hasil Pengukuran Aktual Lapangan
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="measuredLoss" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Measured Loss (dB)</Label>
                    <Input
                      id="measuredLoss"
                      type="number"
                      step="0.01"
                      placeholder="Redaman total aktual"
                      value={measuredLoss}
                      onChange={(e) => setMeasuredLoss(e.target.value)}
                      className="rounded-none border-visible bg-surface font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ontRxPower" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">ONT Rx Power (dBm)</Label>
                    <Input
                      id="ontRxPower"
                      type="number"
                      step="0.1"
                      placeholder="Daya terima di sisi ONT"
                      value={ontRxPower}
                      onChange={(e) => setOntRxPower(e.target.value)}
                      className="rounded-none border-visible bg-surface font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="oltTxPower" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">OLT Tx Power (dBm)</Label>
                    <Input
                      id="oltTxPower"
                      type="number"
                      step="0.1"
                      placeholder="Daya kirim dari OLT"
                      value={oltTxPower}
                      onChange={(e) => setOltTxPower(e.target.value)}
                      className="rounded-none border-visible bg-surface font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="measurementMethod" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Metode Pengukuran</Label>
                    <Select
                      value={measurementMethod}
                      onValueChange={(val: "otdr" | "power_meter" | "manual" | "estimate") => setMeasurementMethod(val)}
                    >
                      <SelectTrigger id="measurementMethod" className="rounded-none border-visible bg-surface font-sans text-xs">
                        <SelectValue placeholder="Pilih Metode" />
                      </SelectTrigger>
                      <SelectContent className="border-visible bg-card font-sans text-xs">
                        <SelectItem value="otdr">OTDR (Optical Time Domain Reflectometer)</SelectItem>
                        <SelectItem value="power_meter">OPM (Optical Power Meter)</SelectItem>
                        <SelectItem value="manual">Pengukuran Manual Lapangan</SelectItem>
                        <SelectItem value="estimate">Hanya Estimasi Perangkat Lunak</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="measurementDate" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Tanggal Pengukuran</Label>
                    <Input
                      id="measurementDate"
                      type="date"
                      value={measurementDate}
                      onChange={(e) => setMeasurementDate(e.target.value)}
                      className="rounded-none border-visible bg-surface font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] text-text-secondary uppercase tracking-wider block">Bukti Pengukuran (OTDR File/Photo)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                        id="evidence-file-upload"
                      />
                      <Label
                        htmlFor="evidence-file-upload"
                        className="font-mono text-xs uppercase tracking-wide px-3 py-2 border border-visible bg-surface hover:bg-surface-raised cursor-pointer flex items-center gap-1.5 rounded-none shrink-0"
                      >
                        <Upload className="size-3.5 text-text-secondary" />
                        {uploadingFile ? "Mengunggah..." : "Unggah Bukti"}
                      </Label>
                      <span className="font-sans text-xs text-text-secondary truncate">
                        {uploadedFileName || (evidenceAttachmentId ? "Bukti sudah terunggah." : "Belum ada bukti dilampirkan")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                <Label htmlFor="notes" className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Catatan Teknis Lapangan</Label>
                <Textarea
                  id="notes"
                  placeholder="Tulis detail sambungan atau catatan pengukuran..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-none border-visible bg-surface font-sans text-xs min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-visible">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setIsCalculatorOpen(false);
                }}
                className="font-mono text-xs uppercase tracking-wider border-visible rounded-none hover:bg-surface-raised"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="font-mono text-xs uppercase tracking-wider rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="mr-1.5 size-3.5" />
                {saving ? "Menyimpan..." : "Simpan Estimasi"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
