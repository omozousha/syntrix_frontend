"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, FileText, X, Loader2, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";
import { useSession } from "@/components/session-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImportSummaryStat } from "@/components/features/data-management/import/import-summary-stat";
import { ImportPreviewTable, type ImportPreviewRow } from "@/components/features/data-management/import/import-preview-table";
import {
  ImportTemplateDownload,
  ODP_TEMPLATE_COLUMNS,
} from "@/components/features/data-management/import/import-template-download";
import {
  OdpBulkImportNoticeDialog,
  type PopPrerequisiteCheck,
} from "@/components/features/data-management/import/odp-bulk-import-notice";

type StepKey = "template" | "upload" | "preview";

const STEPS: Array<{ value: StepKey; label: string }> = [
  { value: "template", label: "01 · TEMPLATE" },
  { value: "upload", label: "02 · UPLOAD" },
  { value: "preview", label: "03 · VALIDASI" },
];

export default function OdpBulkImportPage() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState<StepKey>("template");
  const [filename, setFilename] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const [applyState, setApplyState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileLevelError, setFileLevelError] = useState<string | null>(null);

  // Notice dialog state
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [popCheck, setPopCheck] = useState<PopPrerequisiteCheck | null>(null);
  const [isCheckingPops, setIsCheckingPops] = useState(false);

  // Result info from server execution
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    errors: Array<{ row_index: number; errors: string[] }>;
  } | null>(null);

  const checkPopAvailability = useCallback(async (): Promise<PopPrerequisiteCheck | null> => {
    if (!session?.token) {
      setPopCheck({
        hasPop: false,
        popCount: 0,
        message: "Tidak ada sesi login. Silakan login ulang.",
      });
      return null;
    }

    setIsCheckingPops(true);
    try {
      const response = await apiFetch<{
        data: { items: Array<unknown> };
        meta?: { total?: number };
      }>("/pops?page=1&limit=1", { token: session.token });
      const items = response?.data?.items || [];
      const total = response?.meta?.total ?? items.length;
      const message =
        total > 0
          ? `${total} data POP tersedia untuk ODP Anda.`
          : "Belum ada data POP. Silakan buat data POP terlebih dahulu.";
      const result: PopPrerequisiteCheck = {
        hasPop: total > 0,
        popCount: total,
        message,
      };
      setPopCheck(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const result: PopPrerequisiteCheck = {
        hasPop: false,
        popCount: 0,
        message: `Gagal memeriksa data POP: ${errorMsg}`,
      };
      setPopCheck(result);
      return result;
    } finally {
      setIsCheckingPops(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = localStorage.getItem("odp-bulk-import-notice-dismissed");
    if (persisted === "true") {
      void checkPopAvailability();
      return;
    }
    setNoticeOpen(true);
    void checkPopAvailability();
  }, [checkPopAvailability]);

  const handleNoticeCheck = useCallback(async () => {
    await checkPopAvailability();
  }, [checkPopAvailability]);

  const proceedAfterNotice = () => {
    setStep("upload");
  };

  const goBack = useCallback(() => {
    if (step === "template") {
      router.push("/data-management/list/odp");
    } else if (step === "upload") {
      setStep("template");
    } else if (step === "preview") {
      setStep("upload");
    }
  }, [step, router]);

  async function handleFile(file: File) {
    const popResult = popCheck ?? (await checkPopAvailability());
    if (!popResult?.hasPop) {
      setNoticeOpen(true);
      return;
    }

    setParseError(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setParseError("Format file harus .csv, .xlsx, atau .xls");
      setUploadFile(null);
      setFilename(null);
      return;
    }

    setFilename(file.name);
    setUploadFile(file);
    let parsed: Record<string, string>[] = [];

    try {
      if (ext === "csv") {
        const text = await file.text();
        parsed = parseCsv(text);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("File excel kosong atau tidak valid");
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        parsed = rows.map((row) =>
          (row as Record<string, unknown>) as Record<string, string>,
        );
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Gagal membaca berkas.");
      setUploadFile(null);
      setFilename(null);
      return;
    }

    if (parsed.length === 0) {
      setParseError("File tidak memiliki baris data (kosong).");
      setUploadFile(null);
      setFilename(null);
      return;
    }

    if (parsed.length > 2000) {
      setParseError(`Jumlah baris data (${parsed.length}) melebihi batas maksimal 2.000 baris.`);
      setUploadFile(null);
      setFilename(null);
      return;
    }

    // Verify template headers match minimally
    const firstRowKeys = Object.keys(parsed[0] || {});
    const matchCount = ODP_TEMPLATE_COLUMNS.filter(col =>
      firstRowKeys.includes(col) || firstRowKeys.some(k => k.toLowerCase().trim() === col.toLowerCase().trim())
    ).length;

    if (matchCount < 4) {
      setParseError("Format kolom template tidak dikenal. Pastikan nama kolom sesuai template.");
      setUploadFile(null);
      setFilename(null);
      return;
    }

    // Resolve user scope + canonical regions (best-effort, cached after first call).
    let regionsList: Array<{ id: string; region_name: string; code: string }> | null = null;
    let allowedRegionIds: string[] | null = null;
    try {
      [regionsList, allowedRegionIds] = await Promise.all([
        loadRegionsCatalog(session?.token),
        Promise.resolve(getUserScopeRegionIds(session)),
      ]);
    } catch (scopeErr) {
      setParseError(
        scopeErr instanceof Error
          ? scopeErr.message
          : "Role ini tidak didukung untuk impor massal ODP.",
      );
      setUploadFile(null);
      setFilename(null);
      return;
    }

    let preview = parsed.map((data, idx) => {
      const baseRow = validateOdpRow(data);
      return {
        rowIndex: idx + 2, // +1 for 1-indexed, +1 for header row
        valid: baseRow.valid,
        data,
        errors: baseRow.errors,
      };
    });

    let fileMessage: string | null = null;
    const role = session?.me?.role;

    if (regionsList && allowedRegionIds !== null) {
      // Strict canonical lookup: the only acceptable values per row are the
      // canonical region_name (case-insensitive), the region_code, or the
      // UUID. Operator must use the registered region name as printed in the
      // master list. No fuzzy substring or alias map is used here — striktur
      // ensures creation copy stays stable across deployments and regions
      // that contain provincial substrings cannot leak across admin scopes.
      const lowerName = new Map<string, { id: string; rawName: string }>();
      const lowerCode = new Map<string, { id: string; rawName: string }>();
      const lowerId = new Map<string, { id: string; rawName: string }>();
      for (const r of regionsList) {
        const nameKey = r.region_name.trim().toLowerCase();
        if (nameKey) lowerName.set(nameKey, { id: r.id, rawName: r.region_name });
        const codeKey = r.code.trim().toLowerCase();
        if (codeKey) lowerCode.set(codeKey, { id: r.id, rawName: r.region_name });
        lowerId.set(r.id.trim().toLowerCase(), { id: r.id, rawName: r.region_name });
      }

      const regionLookup = (raw: string): { id: string; rawName: string } | null => {
        const key = String(raw || '').trim().toLowerCase();
        if (!key) return null;
        return (
          lowerName.get(key) ||
          lowerCode.get(key) ||
          lowerId.get(key) ||
          null
        );
      };

      const uniqueRegionIds = new Set<string>();
      const unknownRegions = new Set<string>();

      preview = preview.map((row) => {
        const rawRegion = String(row.data?.region ?? '').trim();
        if (!rawRegion) return row;

        const resolved = regionLookup(rawRegion);
        if (!resolved) {
          unknownRegions.add(rawRegion);
          return {
            ...row,
            valid: false,
            errors: Array.from(
              new Set([
                ...row.errors,
                `region "${rawRegion}" tidak terdaftar di master regions`,
              ]),
            ),
          };
        }
        const regionId = resolved.id;

        uniqueRegionIds.add(regionId);

        if (role === 'user_all_region' && !allowedRegionIds.includes(regionId)) {
          return {
            ...row,
            valid: false,
            errors: Array.from(
              new Set([
                ...row.errors,
                `region "${rawRegion}" tidak termasuk dalam scope admin Anda`,
              ]),
            ),
          };
        }
        return row;
      });

      if (unknownRegions.size) {
        fileMessage = `Berkas ini memiliki nama region yang tidak dikenali: ${Array.from(unknownRegions).join(', ')}.`;
      } else if (role === 'admin' && uniqueRegionIds.size > 1) {
        fileMessage = `Berkas ini berisi ${uniqueRegionIds.size} region berbeda. Untuk role admin, satu file hanya boleh berisi tepat satu region. Pisahkan per region.`;
      } else if (role === 'user_all_region' && allowedRegionIds.length === 0) {
        fileMessage = 'Akun admin Anda belum memiliki region scope yang ditetapkan. Hubungi administrator.';
      } else if (
        role === 'user_all_region' &&
        uniqueRegionIds.size > 0 &&
        Array.from(uniqueRegionIds).some((id) => !allowedRegionIds.includes(id))
      ) {
        const outOfScopeIds = Array.from(uniqueRegionIds).filter((id) => !allowedRegionIds.includes(id));
        fileMessage = `Berkas ini berisi region di luar scope adminregion Anda (${outOfScopeIds.length} region). Hanya region dalam scope yang boleh diimpor.`;
      }
    }

    setFileLevelError(fileMessage);

    const validCount = preview.filter((p) => p.valid && !p.errors.length).length;
    const invalidCount = preview.length - validCount;
    setRows(preview);
    setSummary({
      total: preview.length,
      valid: validCount,
      invalid: invalidCount,
    });
    setStep("preview");
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  }, [popCheck, checkPopAvailability]);

  const removeFile = () => {
    setUploadFile(null);
    setFilename(null);
    setRows([]);
    setSummary({ total: 0, valid: 0, invalid: 0 });
    setParseError(null);
    setFileLevelError(null);
  };

  async function handleApply() {
    const popResult = popCheck ?? (await checkPopAvailability());
    if (!popResult?.hasPop) {
      setNoticeOpen(true);
      setApplyState("error");
      setApplyMessage("Tidak dapat menerapkan: data POP belum tersedia.");
      return;
    }

    if (!session?.token) {
      setApplyState("error");
      setApplyMessage("Token session tidak ditemukan. Silakan login ulang.");
      return;
    }

    if (!uploadFile) {
      setApplyState("error");
      setApplyMessage("File belum diunggah.");
      return;
    }

    // Defense-in-depth: never send a payload to /imports/ingest while the file
    // still has per-row errors or a file-level scope violation surfaced
    // through the synchronous validasi tab.
    if (summary.invalid > 0 || fileLevelError) {
      setApplyState("error");
      setApplyMessage(
        fileLevelError
          ? `Terdapat masalah scope region: ${fileLevelError}`
          : "Terdapat baris error. Selesaikan dulu sebelum menerapkan.",
      );
      return;
    }

    setApplyState("loading");
    setApplyMessage("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity_type", "devices");
      formData.append("device_type_key", "ODP");
      formData.append("asset_group", "passive");
      formData.append("apply", "true");

      const response = await apiFetch<{
        success: boolean;
        data?: {
          import_job?: {
            success_rows?: number;
            failed_rows?: number;
          };
          errors?: Array<{ row_index: number; errors: string[] }>;
          message?: string;
        };
      }>("/imports/ingest", {
        method: "POST",
        token: session.token,
        body: formData,
      });

      const successRows = response?.data?.import_job?.success_rows ?? summary.valid;
      const failedRows = response?.data?.import_job?.failed_rows ?? summary.invalid;
      const serverErrors = response?.data?.errors || [];

      setImportResult({
        successCount: successRows,
        failedCount: failedRows,
        errors: serverErrors,
      });
      setApplyState("success");
      setApplyMessage("Batch impor massal berhasil diproses.");
    } catch (err) {
      setApplyState("error");
      setApplyMessage(
        err instanceof Error ? err.message : "Gagal menerapkan batch di server.",
      );
    }
  }

  const handleStepChange = (next: StepKey) => {
    if (next === "upload" && popCheck && !popCheck.hasPop) {
      setNoticeOpen(true);
      return;
    }
    if (next === "preview" && !uploadFile) {
      setStep("upload");
      return;
    }
    setStep(next);
  };

  const isTemplateStep = step === "template";
  const isUploadStep = step === "upload";
  const isPreviewStep = step === "preview";

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1.5 pb-8">
      {/* Hero */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">IMPOR MASSAL ODP</h2>
          {popCheck && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              popCheck.hasPop
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}>
              {popCheck.hasPop ? "POP Siap" : "POP Tidak Tersedia"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Tambahkan ratusan atau ribuan data ODP sekaligus menggunakan fail CSV atau Excel.
          Pastikan data format koordinat, POP, dan region sudah valid sebelum diunggah.
        </p>
      </header>

      <Separator />

      {/* Stepper */}
      <div className="w-full">
        <nav className="flex items-center justify-between border border-border bg-muted/20 p-1.5 rounded-lg max-w-4xl mx-auto" aria-label="Progress">
          {STEPS.map((s, idx) => {
            const isActive = step === s.value;
            const isCompleted = STEPS.findIndex(x => x.value === step) > idx;
            const isLocked = !isCompleted && !isActive;
            return (
              <React.Fragment key={s.value}>
                <button
                  type="button"
                  onClick={() => !isLocked && handleStepChange(s.value)}
                  disabled={isLocked}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium font-mono uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                        ? "text-primary hover:bg-muted"
                        : "text-muted-foreground opacity-50 cursor-not-allowed"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-3.5 text-green-500" />
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border border-current text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                  {s.label.split(" · ")[1]}
                </button>
                {idx < STEPS.length - 1 && (
                  <ArrowRight className="size-3.5 text-muted-foreground/30" />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <Separator />

      {/* STEP 1: TEMPLATE */}
      {isTemplateStep && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>LANGKAH 1: UNDUH TEMPLATE & PETUNJUK</CardTitle>
            <CardDescription>
              Gunakan berkas template resmi agar kolom dan baris terpetakan dengan benar di database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">Daftar Kolom Wajib (9 Kolom):</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">device name</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Nama ODP unik (misal: ODP-JKT-001)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">device type</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Isi "ODP" (selalu bernilai ODP)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">status</span>
                  <p className="text-muted-foreground text-[10px] mt-1">draft / installed / active / inactive / maintenance / retired</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">region</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Nama region lengkap (harus persis sama dengan master di database)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">POP</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Kode POP (CBN), nama POP (Bintaro), atau ID inventori (INV-POP-S89P4U2)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">longitude</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Koordinat desimal (-180 s/d 180)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">latitude</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Koordinat desimal (-90 s/d 90)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">kapasitas odp</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Kapasitas total port (misal: 8)</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">kapasitas splitter</span>
                  <p className="text-muted-foreground text-[10px] mt-1">Format rasio (misal: 1:8)</p>
                </div>
              </div>
            </div>

            <ImportTemplateDownload />
          </CardContent>
        </Card>
      )}

      {/* STEP 2: UPLOAD */}
      {isUploadStep && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>LANGKAH 2: UNGGAH BERKAS DATA ODP</CardTitle>
            <CardDescription>
              Pilih file CSV atau XLSX hasil pengisian template. Batas maksimum impor adalah 2.000 baris data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Kesalahan Pembacaan Berkas</AlertTitle>
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {!uploadFile ? (
              <div
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-center transition-all ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/10 hover:bg-muted/20"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="size-10 text-muted-foreground mb-4" />
                <h3 className="text-sm font-semibold uppercase tracking-wider font-mono">Tarik & Letakkan File</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Dukung format .xlsx, .xls, atau .csv (Maksimal 2.000 baris data)
                </p>
                <Label
                  htmlFor="import-file-upload"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer"
                >
                  Pilih File Manual
                </Label>
                <Input
                  id="import-file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded">
                    {filename?.endsWith(".csv") ? (
                      <FileText className="size-6" />
                    ) : (
                      <FileSpreadsheet className="size-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{filename}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(uploadFile.size / 1024).toFixed(1)} KB · Siap divalidasi
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile} title="Hapus berkas">
                  <X className="size-4" />
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-border p-4 bg-muted/5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">Checklist Impor Massal ODP:</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${popCheck?.hasPop ? "bg-green-500" : "bg-red-500"}`} />
                  Prasyarat POP: {popCheck?.hasPop ? "Terpenuhi" : "Belum terpenuhi (Harap buat POP dahulu)"}
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${uploadFile ? "bg-green-500" : "bg-muted-foreground"}`} />
                  File Terpilih: {uploadFile ? "Ya" : "Belum diunggah"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  Maksimal 2.000 baris data per batch file.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: PREVIEW / VALIDATION */}
      {isPreviewStep && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-4xl mx-auto">
            <ImportSummaryStat
              label="TOTAL BARIS"
              value={summary.total}
              tone="primary"
            />
            <ImportSummaryStat
              label="BARIS VALID"
              value={summary.valid}
              total={summary.total || 1}
              tone="success"
            />
            <ImportSummaryStat
              label="BARIS ERROR"
              value={summary.invalid}
              total={summary.total || 1}
              tone="destructive"
            />
          </div>

          {summary.invalid > 0 && (
            <Alert variant="destructive" className="max-w-4xl mx-auto">
              <AlertTriangle className="size-4" />
              <AlertTitle>Ditemukan Data Tidak Valid</AlertTitle>
              <AlertDescription>
                Terdapat {summary.invalid} baris data yang memiliki kesalahan validasi.
                Hanya baris dengan status <strong className="text-red-600">VALID</strong> yang akan disimpan saat proses penerapan.
                Anda bisa memfilter dan mengunduh baris yang error melalui tabel pratinjau di bawah.
              </AlertDescription>
            </Alert>
          )}

          {fileLevelError && (
            <Alert variant="destructive" className="max-w-4xl mx-auto">
              <AlertCircle className="size-4" />
              <AlertTitle>
                {session?.me?.role === "admin"
                  ? "File Mengandung Multi-Region"
                  : session?.me?.role === "user_all_region"
                    ? "Region Tidak Termasuk Scope Anda"
                    : "Region Tidak Dikenali"}
              </AlertTitle>
              <AlertDescription>{fileLevelError}</AlertDescription>
            </Alert>
          )}

          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>LANGKAH 3: HASIL VALIDASI DATA ODP</CardTitle>
                <CardDescription>
                  Pratinjau maksimum 50 baris data pertama. Lakukan pengecekan status validitas.
                </CardDescription>
              </div>
              {uploadFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>Berkas: <strong>{filename}</strong></span>
                  <Button variant="outline" size="sm" onClick={removeFile} className="h-7 text-[10px]">
                    GANTI FILE
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ImportPreviewTable
                rows={rows}
                columns={[...ODP_TEMPLATE_COLUMNS]}
                maxRows={50}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 pt-3 max-w-4xl mx-auto">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 size-4" />
          KEMBALI
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push("/data-management/list/odp")}
          >
            BATAL
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isTemplateStep) handleStepChange("upload");
              else if (isUploadStep) handleStepChange("preview");
              else if (isPreviewStep) setApplyDialogOpen(true);
            }}
            disabled={
              isUploadStep && !uploadFile
                ? true
                : isPreviewStep && (summary.valid === 0 || summary.invalid > 0 || fileLevelError !== null)
                  ? true
                  : false
            }
            className="rounded-full"
          >
            {isTemplateStep && "LANJUT UNGGAH"}
            {isUploadStep && "LIHAT VALIDASI"}
            {isPreviewStep && "LANJUT TERAPKAN"}
          </Button>
        </div>
      </div>

      {/* STEP 4: APPLY DIALOG (MODAL) */}
      <Dialog open={applyDialogOpen} onOpenChange={(open) => {
        if (applyState !== "loading") {
          setApplyDialogOpen(open);
          if (!open) {
            setApplyState("idle");
            setApplyMessage("");
            setImportResult(null);
          }
        }
      }}>
        <DialogContent className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={applyState !== "loading"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-mono">
              {applyState === "success"
                ? "IMPOR MASSAL SELESAI"
                : applyState === "error"
                  ? "GAGAL MENYIMPAN DATA"
                  : "KONFIRMASI PENYIMPANAN BATCH"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {applyState === "success"
                ? "Berkas berhasil diproses oleh backend server."
                : applyState === "error"
                  ? "Proses impor massal mengalami kegagalan."
                  : "Tinjau ringkasan sebelum menyimpan data ke database."}
            </DialogDescription>
          </DialogHeader>

          {applyState === "idle" && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2.5 text-xs font-mono">
                <h3 className="font-semibold uppercase tracking-wider text-muted-foreground">Ringkasan Impor:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Nama Berkas:</span>
                    <p className="font-semibold text-foreground mt-0.5 truncate">{filename}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Jumlah Data:</span>
                    <p className="font-semibold text-foreground mt-0.5">{summary.total} Baris</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Akan Diimpor (Valid):</span>
                    <p className="font-semibold text-green-600 mt-0.5">{summary.valid} ODP</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Akan Dilewati (Error):</span>
                    <p className="font-semibold text-red-500 mt-0.5">{summary.invalid} ODP</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-950/30 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <div className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-1">Perhatian Sebelum Menyimpan:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Aksi ini akan membuat data ODP baru di database Syntrix.</li>
                      <li>Proses pembentukan kode inventori unik akan berjalan secara otomatis di backend.</li>
                      <li>Relasi kabel feeder, port mapping, dan data sekunder lainnya dapat dilengkapi di halaman Detail ODP setelah impor massal selesai.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {applyState === "loading" && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <Loader2 className="size-8 animate-spin text-primary" />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">Sedang Menyimpan Data...</h3>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-sm">
                  Backend sedang mendaftarkan data ODP ke database, memproses lookup region, dan memicu sequence inventori. Mohon tunggu.
                </p>
              </div>
            </div>
          )}

          {applyState === "success" && importResult && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-full">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider font-mono">Impor Selesai</h3>
              </div>

              <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2.5 font-mono text-xs">
                <h4 className="font-semibold uppercase tracking-wider text-muted-foreground">Hasil Eksekusi:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">Sukses Dibuat:</span>
                    <p className="font-bold text-green-600 text-base">{importResult.successCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gagal/Dilewati:</span>
                    <p className="font-bold text-red-500 text-base">{importResult.failedCount}</p>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">Daftar Error Server ({importResult.errors.length}):</Label>
                  <div className="border border-border rounded-md bg-card max-h-[140px] overflow-y-auto p-2.5 space-y-2 font-mono text-[10px]">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-red-500 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-bold">Baris {err.row_index}:</span>
                        <p className="text-muted-foreground mt-0.5">{err.errors.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {applyState === "error" && (
            <div className="space-y-4 py-2">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Gagal Menyimpan Data</AlertTitle>
                <AlertDescription className="text-xs mt-1">{applyMessage}</AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="mt-2 pt-3 border-t border-border">
            {applyState === "idle" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  BATAL
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="w-full sm:w-auto"
                  disabled={summary.valid === 0 || summary.invalid > 0 || fileLevelError !== null}
                  title={
                    summary.invalid > 0
                      ? "Selesaikan baris error sebelum menerapkan."
                      : fileLevelError
                        ? fileLevelError
                        : ""
                  }
                >
                  MULAI TERAPKAN
                </Button>
              </>
            )}

            {applyState === "loading" && null}

            {applyState === "success" && (
              <div className="flex flex-col sm:flex-row w-full gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setApplyDialogOpen(false);
                    removeFile();
                    setStep("template");
                    setApplyState("idle");
                    setImportResult(null);
                  }}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  Impor File Baru
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setApplyDialogOpen(false);
                    router.push("/data-management/list/odp");
                  }}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  Lihat List ODP
                </Button>
              </div>
            )}

            {applyState === "error" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApplyState("idle")}
                  className="w-full sm:w-auto"
                >
                  KEMBALI
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="w-full sm:w-auto"
                >
                  COBA LAGI
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prerequisite Notice Dialog */}
      <OdpBulkImportNoticeDialog
        open={noticeOpen}
        onOpenChange={setNoticeOpen}
        onProceed={proceedAfterNotice}
        popCheck={popCheck}
        isChecking={isCheckingPops}
        onCheckPops={handleNoticeCheck}
      />
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replaceAll('"', ""));
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split(",").map((v) => v.trim().replaceAll('"', ""));
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    result.push(record);
  }
  return result;
}

function validateOdpRow(row: Record<string, string>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Normalization helper to map headers regardless of case or spaces
  const getValue = (key: string): string => {
    const foundKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
    );
    return foundKey ? (row[foundKey] ?? "").trim() : "";
  };

  const deviceName = getValue("device name");
  if (!deviceName) errors.push("device name wajib diisi");

  const status = getValue("status").toLowerCase();
  if (!status) {
    errors.push("status wajib diisi");
  } else if (!["draft", "installed", "active", "inactive", "maintenance", "retired"].includes(status)) {
    errors.push("status harus draft/installed/active/inactive/maintenance/retired");
  }

  const region = getValue("region");
  if (!region) errors.push("region wajib diisi");

  const pop = getValue("POP");
  if (!pop) errors.push("POP wajib diisi");

  const longStr = getValue("longitude");
  if (!longStr) {
    errors.push("longitude wajib diisi");
  } else {
    const longitude = Number(longStr);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push("longitude harus -180..180");
    }
  }

  const latStr = getValue("latitude");
  if (!latStr) {
    errors.push("latitude wajib diisi");
  } else {
    const latitude = Number(latStr);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.push("latitude harus -90..90");
    }
  }

  const capacityStr = getValue("kapasitas odp");
  if (!capacityStr) {
    errors.push("kapasitas odp wajib diisi");
  } else {
    const totalPorts = Number(capacityStr);
    if (!Number.isFinite(totalPorts) || totalPorts <= 0 || !Number.isInteger(totalPorts)) {
      errors.push("kapasitas odp harus integer > 0");
    }
  }

  const splitter = getValue("kapasitas splitter");
  if (!splitter) {
    errors.push("kapasitas splitter wajib diisi");
  } else if (!/^1:\d+$/.test(splitter)) {
    errors.push("kapasitas splitter harus format 1:N (contoh 1:8)");
  }

  return { valid: errors.length === 0, errors };
}

const regionsCatalogCache: {
  token: string | null;
  value: Array<{ id: string; region_name: string; code: string }> | null;
} = { token: null, value: null };

async function loadRegionsCatalog(
  token: string | undefined,
): Promise<Array<{ id: string; region_name: string; code: string }> | null> {
  if (!token) return null;
  if (regionsCatalogCache.token === token && regionsCatalogCache.value) {
    return regionsCatalogCache.value;
  }

  const collected: Array<{ id: string; region_name: string; code: string }> = [];

  try {
    let page = 1;
    const pageSize = 200;

    // Drain the paginated regions list so very large region catalogs are
    // fully represented in the cache. The production endpoint returns the
    // payload as `data: Array<Region>` (no `items` wrapper) but earlier
    // environments used `{ data: { items: ... } }`. Accept both.
    const collectFromPage = (input: unknown) => {
      const arr = Array.isArray(input) ? input : Array.isArray((input as { items?: unknown[] })?.items) ? (input as { items: unknown[] }).items : [];
      for (const raw of arr as Array<{ id?: unknown; region_name?: unknown; region_code?: unknown; region_id?: unknown }>) {
        if (!raw?.id || !raw?.region_name) continue;
        collected.push({
          id: String(raw.id),
          region_name: String(raw.region_name || ""),
          code: String(raw.region_code || ""),
        });
      }
      return Array.isArray(arr) ? arr.length : 0;
    };

    while (page <= 25) {
      const response = await apiFetch<{
        data?: { items?: unknown[] } | unknown[];
        items?: unknown[];
      }>(`/regions?page=${page}&limit=${pageSize}`, { token });

      const got = collectFromPage(response?.data);
      if (got < pageSize) break;
      page += 1;
    }
  } catch {
    return null;
  }

  regionsCatalogCache.token = token;
  regionsCatalogCache.value = collected;
  return collected;
}

function getUserScopeRegionIds(
  session: ReturnType<typeof useSession> | undefined,
): string[] | null {
  const me = session?.me;
  if (!me) return null;
  const role = me.role;
  if (role === "admin") {
    return []; // superadmin: empty scope means "all regions"
  }
  if (role === "user_all_region") {
    const scopes = me.app_user?.user_region_scopes || [];
    return scopes.map((s) => s.region_id).filter(Boolean);
  }
  throw new Error("Role ini tidak didukung untuk impor massal ODP.");
}

