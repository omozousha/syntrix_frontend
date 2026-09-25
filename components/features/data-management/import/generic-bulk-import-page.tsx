"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  X,
  ArrowRight,
} from "lucide-react";
import { AppLoading } from "@/components/app-loading-new";
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
  GenericImportTemplateDownload,
  type ColumnDef,
} from "@/components/features/data-management/import/generic-import-template-download";
import {
  BulkImportPrerequisiteDialog,
  type PrerequisiteCheck,
} from "@/components/features/data-management/import/generic-bulk-import-prerequisite-dialog";
import type { BulkImportConfig } from "@/components/features/data-management/import/generic-bulk-import-config";

type StepKey = "template" | "upload" | "preview";

const STEPS: Array<{ value: StepKey; label: string }> = [
  { value: "template", label: "01 · TEMPLATE" },
  { value: "upload", label: "02 · UPLOAD" },
  { value: "preview", label: "03 · VALIDASI" },
];

type Props = {
  config: BulkImportConfig;
};

export function GenericBulkImportPage({ config }: Props) {
  const router = useRouter();
  const session = useSession();
  const {
    pageTitle,
    entityType,
    deviceTypeKey,
    assetGroup,
    templateColumns,
    exampleRows,
    validateRow,
    checkPrerequisite,
    storageKey,
    requiresPop,
    requiresRegion,
    successEntityLabel,
  } = config;

  const [step, setStep] = useState<StepKey>("template");
  const [filename, setFilename] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });
  const [applyState, setApplyState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [applyMessage, setApplyMessage] = useState("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileLevelError, setFileLevelError] = useState<string | null>(null);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<PrerequisiteCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    errors: Array<{ row_index: number; errors: string[] }>;
  } | null>(null);

  const runPrerequisiteCheck = useCallback(async (): Promise<PrerequisiteCheck | null> => {
    if (!session?.token) {
      const r = { hasData: false, count: 0, message: "Tidak ada sesi login.", entityLabel: "DATA" };
      setCheckResult(r);
      return r;
    }
    setIsChecking(true);
    try {
      const r = await checkPrerequisite(session.token);
      setCheckResult(r);
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const r = { hasData: false, count: 0, message: `Gagal memeriksa: ${msg}`, entityLabel: "DATA" };
      setCheckResult(r);
      return r;
    } finally {
      setIsChecking(false);
    }
  }, [checkPrerequisite, session?.token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = localStorage.getItem(storageKey);
    if (persisted !== "true") {
      setNoticeOpen(true);
    }
    void runPrerequisiteCheck();
  }, [runPrerequisiteCheck, storageKey]);

  const proceedAfterNotice = () => setStep("upload");

  const goBack = useCallback(() => {
    if (step === "template") {
      router.push("/data-management");
    } else if (step === "upload") {
      setStep("template");
    } else if (step === "preview") {
      setStep("upload");
    }
  }, [step, router]);

  async function handleFile(file: File) {
    const popResult = checkResult ?? (await runPrerequisiteCheck());
    if (popResult && !popResult.hasData) {
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
        const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) throw new Error("File CSV kosong.");
        const headers = lines[0].split(",").map((h) => h.trim().replaceAll('"', ""));
        parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replaceAll('"', ""));
          const record: Record<string, string> = {};
          headers.forEach((header, idx) => {
            record[header] = values[idx] ?? "";
          });
          parsed.push(record);
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("File excel kosong atau tidak valid");
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        parsed = rows.map((row) => row as Record<string, string>);
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

    const firstRowKeys = Object.keys(parsed[0] || {});
    const matchCount = templateColumns.filter((col) =>
      firstRowKeys.some((k) => k.toLowerCase().trim() === col.label.toLowerCase().trim()),
    ).length;

    if (matchCount < 2) {
      setParseError("Format kolom template tidak dikenal. Pastikan nama kolom sesuai template.");
      setUploadFile(null);
      setFilename(null);
      return;
    }

    let regionsList: Array<{ id: string; region_name: string; code: string }> | null = null;
    let allowedRegionIds: string[] | null = null;
    let popsList: Array<{ id: string; pop_name: string; pop_code: string }> | null = null;

    if (requiresRegion || requiresPop) {
      try {
        const [regions, scopes, pops] = await Promise.all([
          requiresRegion ? loadRegionsCatalog(session?.token) : Promise.resolve(null),
          requiresRegion ? Promise.resolve(getUserScopeRegionIds(session)) : Promise.resolve(null),
          requiresPop ? loadPopsCatalog(session?.token) : Promise.resolve(null),
        ]);
        regionsList = regions as Array<{ id: string; region_name: string; code: string }> | null;
        allowedRegionIds = scopes as string[] | null;
        popsList = pops as Array<{ id: string; pop_name: string; pop_code: string }> | null;
      } catch (scopeErr) {
        setParseError(scopeErr instanceof Error ? scopeErr.message : "Role ini tidak didukung.");
        setUploadFile(null);
        setFilename(null);
        return;
      }
    }

    let preview = parsed.map((data, idx) => {
      const baseRow = validateRow(data);
      return {
        rowIndex: idx + 2,
        valid: baseRow.valid,
        data,
        errors: baseRow.errors,
      };
    });

    let fileMessage: string | null = null;
    const role = session?.me?.role;

    if (regionsList && allowedRegionIds !== null) {
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
        const key = String(raw || "").trim().toLowerCase();
        if (!key) return null;
        return lowerName.get(key) || lowerCode.get(key) || lowerId.get(key) || null;
      };

      const uniqueRegionIds = new Set<string>();
      const unknownRegions = new Set<string>();

      preview = preview.map((row) => {
        const rawRegion = String(row.data?.region ?? "").trim();
        if (!rawRegion) return row;

        const resolved = regionLookup(rawRegion);
        if (!resolved) {
          unknownRegions.add(rawRegion);
          return {
            ...row,
            valid: false,
            errors: Array.from(new Set([...row.errors, `region "${rawRegion}" tidak terdaftar di master regions`])),
          };
        }
        uniqueRegionIds.add(resolved.id);

        if (role === "user_all_region" && !allowedRegionIds.includes(resolved.id)) {
          return {
            ...row,
            valid: false,
            errors: Array.from(new Set([...row.errors, `region "${rawRegion}" tidak termasuk dalam scope admin Anda`])),
          };
        }
        return row;
      });

      if (unknownRegions.size) {
        fileMessage = `Berkas ini memiliki nama region yang tidak dikenali: ${Array.from(unknownRegions).join(", ")}.`;
      } else if (role === "admin" && uniqueRegionIds.size > 1) {
        fileMessage = `Berkas ini berisi ${uniqueRegionIds.size} region berbeda. Untuk role admin, satu file hanya boleh berisi tepat satu region. Pisahkan per region.`;
      } else if (role === "user_all_region" && allowedRegionIds.length === 0) {
        fileMessage = "Akun admin Anda belum memiliki region scope yang ditetapkan. Hubungi administrator.";
      } else if (
        role === "user_all_region" &&
        uniqueRegionIds.size > 0 &&
        Array.from(uniqueRegionIds).some((id) => !allowedRegionIds.includes(id))
      ) {
        const outOfScopeIds = Array.from(uniqueRegionIds).filter((id) => !allowedRegionIds.includes(id));
        fileMessage = `Berkas ini berisi region di luar scope adminregion Anda (${outOfScopeIds.length} region). Hanya region dalam scope yang boleh diimpor.`;
      }
    }

    if (requiresPop && popsList) {
      const lowerPopName = new Map<string, { id: string; rawName: string }>();
      const lowerPopCode = new Map<string, { id: string; rawName: string }>();
      const lowerPopId = new Map<string, { id: string; rawName: string }>();
      for (const p of popsList) {
        const nameKey = p.pop_name.trim().toLowerCase();
        if (nameKey) lowerPopName.set(nameKey, { id: p.id, rawName: p.pop_name });
        const codeKey = p.pop_code.trim().toLowerCase();
        if (codeKey) lowerPopCode.set(codeKey, { id: p.id, rawName: p.pop_name });
        lowerPopId.set(p.id.trim().toLowerCase(), { id: p.id, rawName: p.pop_name });
      }

      const popLookup = (raw: string): { id: string; rawName: string } | null => {
        const key = String(raw || "").trim().toLowerCase();
        if (!key) return null;
        return lowerPopName.get(key) || lowerPopCode.get(key) || lowerPopId.get(key) || null;
      };

      const unknownPops = new Set<string>();

      preview = preview.map((row) => {
        const rawPop = String(
          row.data?.POP ?? row.data?.pop ?? row.data?.["POP Code"] ?? row.data?.["POP ID"] ?? "",
        ).trim();
        if (!rawPop) return row;

        const resolved = popLookup(rawPop);
        if (!resolved) {
          unknownPops.add(rawPop);
          return {
            ...row,
            valid: false,
            errors: Array.from(
              new Set([...row.errors, `POP "${rawPop}" tidak terdaftar di master POP`]),
            ),
          };
        }
        return row;
      });

      if (unknownPops.size && !fileMessage) {
        fileMessage = `Berkas ini memiliki referensi POP yang tidak dikenali: ${Array.from(unknownPops).join(", ")}.`;
      }
    }

    setFileLevelError(fileMessage);

    const validCount = preview.filter((p) => p.valid && !p.errors.length).length;
    const invalidCount = preview.length - validCount;
    setRows(preview);
    setSummary({ total: preview.length, valid: validCount, invalid: invalidCount });
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        void handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile],
  );

  const removeFile = () => {
    setUploadFile(null);
    setFilename(null);
    setRows([]);
    setSummary({ total: 0, valid: 0, invalid: 0 });
    setParseError(null);
    setFileLevelError(null);
  };

  async function handleApply() {
    const popResult = checkResult ?? (await runPrerequisiteCheck());
    if (popResult && !popResult.hasData) {
      setNoticeOpen(true);
      setApplyState("error");
      setApplyMessage("Tidak dapat menerapkan: data prasyarat belum tersedia.");
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

    if (summary.invalid > 0 || fileLevelError) {
      setApplyState("error");
      setApplyMessage(
        fileLevelError ? `Terdapat masalah scope region: ${fileLevelError}` : "Terdapat baris error. Selesaikan dulu sebelum menerapkan.",
      );
      return;
    }

    setApplyState("loading");
    setApplyMessage("");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity_type", entityType);
      if (deviceTypeKey) formData.append("device_type_key", deviceTypeKey);
      if (assetGroup) formData.append("asset_group", assetGroup);
      formData.append("apply", "true");

      const response = await apiFetch<{
        success: boolean;
        data?: {
          import_job?: { success_rows?: number; failed_rows?: number };
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
      setApplyMessage(err instanceof Error ? err.message : "Gagal menerapkan batch di server.");
    }
  }

  const handleStepChange = (next: StepKey) => {
    if (next === "upload" && checkResult && !checkResult.hasData) {
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

  const templateFileName = `template_${(deviceTypeKey || entityType).toLowerCase()}_bulk_import`;

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain space-y-6 pr-1.5 pb-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          {checkResult && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                checkResult.hasData
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }`}
            >
              {checkResult.hasData ? `${checkResult.entityLabel} Siap` : `${checkResult.entityLabel} Tidak Tersedia`}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Tambahkan ratusan atau ribuan data {successEntityLabel} sekaligus menggunakan file CSV atau Excel.
          Pastikan data format koordinat{requiresPop ? ", POP," : ""} dan region sudah valid sebelum diunggah.
        </p>
      </header>

      <Separator />

      <div className="w-full">
        <nav className="flex items-center justify-between border border-border bg-muted/20 p-1.5 rounded-lg max-w-4xl mx-auto" aria-label="Progress">
          {STEPS.map((s, idx) => {
            const isActive = step === s.value;
            const isCompleted = STEPS.findIndex((x) => x.value === step) > idx;
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
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Daftar Kolom ({templateColumns.length} Kolom):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                {templateColumns.map((col) => (
                  <div key={col.key} className="p-2 border border-border bg-card rounded">
                    <span className="text-primary font-bold">{col.label}</span>
                    {col.required && <span className="text-red-500 ml-1">*</span>}
                    <p className="text-muted-foreground text-[10px] mt-1">{col.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <GenericImportTemplateDownload
              config={{
                fileName: templateFileName,
                sheetName: deviceTypeKey || entityType.toUpperCase(),
                pageTitle,
                columns: templateColumns,
                exampleRows,
                instructions: config.instructions,
                validationRules: config.validationRules,
              }}
            />
          </CardContent>
        </Card>
      )}

      {isUploadStep && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>LANGKAH 2: UNGGAH BERKAS DATA {successEntityLabel}</CardTitle>
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
                  isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/10 hover:bg-muted/20"
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                Checklist Impor Massal {successEntityLabel}:
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {requiresPop && (
                  <li className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${checkResult?.hasData ? "bg-green-500" : "bg-red-500"}`}
                    />
                    Prasyarat: {checkResult?.hasData ? "Terpenuhi" : "Belum terpenuhi (Harap buat data pendukung dahulu)"}
                  </li>
                )}
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

      {isPreviewStep && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-4xl mx-auto">
            <ImportSummaryStat label="TOTAL BARIS" value={summary.total} tone="primary" />
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
                <CardTitle>LANGKAH 3: HASIL VALIDASI DATA {successEntityLabel}</CardTitle>
                <CardDescription>
                  Pratinjau maksimum 50 baris data pertama. Lakukan pengecekan status validitas.
                </CardDescription>
              </div>
              {uploadFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>
                    Berkas: <strong>{filename}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      removeFile();
                      setStep("upload");
                    }}
                    className="h-7 text-[10px]"
                  >
                    GANTI FILE
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <ImportPreviewTable rows={rows} columns={templateColumns.map((c) => c.label)} maxRows={50} />
            </CardContent>
          </Card>
        </div>
      )}

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
            onClick={() => router.push("/data-management")}
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

      <Dialog
        open={applyDialogOpen}
        onOpenChange={(open) => {
          if (applyState !== "loading") {
            setApplyDialogOpen(open);
            if (!open) {
              setApplyState("idle");
              setApplyMessage("");
              setImportResult(null);
            }
          }
        }}
      >
        <DialogContent className="w-full sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton={applyState !== "loading"}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-mono">
              {applyState === "success"
                ? `IMPOR MASSAL ${successEntityLabel.toUpperCase()} SELESAI`
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
                    <p className="font-semibold text-green-600 mt-0.5">{summary.valid} {successEntityLabel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Akan Dilewati (Error):</span>
                    <p className="font-semibold text-red-500 mt-0.5">{summary.invalid} {successEntityLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-950/30 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <div className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-1">Perhatian Sebelum Menyimpan:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Aksi ini akan membuat data {successEntityLabel} baru di database Syntrix.</li>
                      <li>Proses pembentukan kode inventori unik akan berjalan secara otomatis di backend.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {applyState === "loading" && <AppLoading variant="card" label="Sedang Menyimpan Data..." />}

          {applyState === "success" && importResult && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-full">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider font-mono">
                  Impor Selesai
                </h3>
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
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    Daftar Error Server ({importResult.errors.length}):
                  </Label>
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
                <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)} className="w-full sm:w-auto">
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
                    router.push(`/data-management/list/${deviceTypeKey?.toLowerCase() || entityType}`);
                  }}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  Lihat List {successEntityLabel}
                </Button>
              </div>
            )}

            {applyState === "error" && (
              <>
                <Button type="button" variant="outline" onClick={() => setApplyState("idle")} className="w-full sm:w-auto">
                  KEMBALI
                </Button>
                <Button type="button" onClick={handleApply} className="w-full sm:w-auto">
                  COBA LAGI
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkImportPrerequisiteDialog
        open={noticeOpen}
        onOpenChange={setNoticeOpen}
        onProceed={proceedAfterNotice}
        checkResult={checkResult}
        isChecking={isChecking}
        onCheck={runPrerequisiteCheck}
        entityLabel={successEntityLabel}
        storageKey={storageKey}
      />
    </div>
  );
}

// ─── Helpers (same as ODP page) ───────────────────────────────────

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
    const collectFromPage = (input: unknown) => {
      const arr = Array.isArray(input) ? input : Array.isArray((input as { items?: unknown[] })?.items) ? (input as { items?: unknown[] }).items : [];
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

const popsCatalogCache: {
  token: string | null;
  value: Array<{ id: string; pop_name: string; pop_code: string }> | null;
} = { token: null, value: null };

async function loadPopsCatalog(
  token: string | undefined,
): Promise<Array<{ id: string; pop_name: string; pop_code: string }> | null> {
  if (!token) return null;
  if (popsCatalogCache.token === token && popsCatalogCache.value) {
    return popsCatalogCache.value;
  }

  const collected: Array<{ id: string; pop_name: string; pop_code: string }> = [];

  try {
    let page = 1;
    const pageSize = 200;
    const collectFromPage = (input: unknown) => {
      const arr = Array.isArray(input)
        ? input
        : Array.isArray((input as { items?: unknown[] })?.items)
          ? (input as { items?: unknown[] }).items
          : [];
      for (const raw of arr as Array<{ id?: unknown; pop_name?: unknown; pop_code?: unknown }>) {
        if (!raw?.id) continue;
        collected.push({
          id: String(raw.id),
          pop_name: String(raw.pop_name || ""),
          pop_code: String(raw.pop_code || ""),
        });
      }
      return Array.isArray(arr) ? arr.length : 0;
    };

    while (page <= 25) {
      const response = await apiFetch<{
        data?: { items?: unknown[] } | unknown[];
        items?: unknown[];
      }>(`/pops?page=${page}&limit=${pageSize}`, { token });

      const got = collectFromPage(response?.data);
      if (got < pageSize) break;
      page += 1;
    }
  } catch {
    return null;
  }

  popsCatalogCache.token = token;
  popsCatalogCache.value = collected;
  return collected;
}

function getUserScopeRegionIds(session: ReturnType<typeof useSession> | undefined): string[] | null {
  const me = session?.me;
  if (!me) return null;
  const role = me.role;
  if (role === "admin") {
    return [];
  }
  if (role === "user_all_region") {
    const scopes = me.app_user?.user_region_scopes || [];
    return scopes.map((s) => s.region_id).filter(Boolean);
  }
  throw new Error("Role ini tidak didukung untuk impor massal.");
}
