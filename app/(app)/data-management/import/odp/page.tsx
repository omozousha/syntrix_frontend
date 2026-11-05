"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, FileText, X, ArrowRight, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useSession } from "@/components/session-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useTranslate, type TFn } from "@/lib/use-locale";

type StepKey = "template" | "upload" | "preview";

export default function OdpBulkImportPage() {
  const router = useRouter();
  const session = useSession();
  const { t } = useTranslate();
  const steps: Array<{ value: StepKey; label: string }> = [
    { value: "template", label: t("import.page.stepTemplate") },
    { value: "upload", label: t("import.page.stepUpload") },
    { value: "preview", label: t("import.page.stepValidation") },
  ];
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
        message: t("odpImport.noSession"),
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
          ? t("odpImport.popAvailableCount", { total })
          : t("odpImport.noPopAvailable");
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
        message: t("odpImport.checkPopFailed", { error: errorMsg }),
      };
      setPopCheck(result);
      return result;
    } finally {
      setIsCheckingPops(false);
    }
  }, [session?.token, t]);

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
      setParseError(t("import.page.invalidFormat"));
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
        if (!sheetName) throw new Error(t("import.page.emptyExcel"));
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        parsed = rows.map((row) =>
          (row as Record<string, unknown>) as Record<string, string>,
        );
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t("import.page.readFailed"));
      setUploadFile(null);
      setFilename(null);
      return;
    }

    if (parsed.length === 0) {
      setParseError(t("import.page.noRows"));
      setUploadFile(null);
      setFilename(null);
      return;
    }

    if (parsed.length > 2000) {
      setParseError(t("import.page.overLimit", { count: parsed.length }));
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
      setParseError(t("import.page.unknownFormat"));
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
        Promise.resolve(getUserScopeRegionIds(session, t)),
      ]);
    } catch (scopeErr) {
      setParseError(
        scopeErr instanceof Error
          ? scopeErr.message
          : t("import.page.unsupportedRole"),
      );
      setUploadFile(null);
      setFilename(null);
      return;
    }

    let preview = parsed.map((data, idx) => {
      const baseRow = validateOdpRow(data, t);
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
                t("odpImport.rowErrRegionUnknown", { region: rawRegion }),
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
                t("odpImport.rowErrRegionOutOfScope", { region: rawRegion }),
              ]),
            ),
          };
        }
        return row;
      });

      if (unknownRegions.size) {
        fileMessage = t("import.page.errRegionUnknownDesc", { regions: Array.from(unknownRegions).join(', ') });
      } else if (role === 'admin' && uniqueRegionIds.size > 1) {
        fileMessage = t("import.page.errMultiRegionDesc", { count: uniqueRegionIds.size });
      } else if (role === 'user_all_region' && allowedRegionIds.length === 0) {
        fileMessage = t("import.page.errScopeNotSetDesc");
      } else if (
        role === 'user_all_region' &&
        uniqueRegionIds.size > 0 &&
        Array.from(uniqueRegionIds).some((id) => !allowedRegionIds.includes(id))
      ) {
        const outOfScopeIds = Array.from(uniqueRegionIds).filter((id) => !allowedRegionIds.includes(id));
        fileMessage = t("import.page.errOutOfScopeDesc", { count: outOfScopeIds.length });
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
      setApplyMessage(t("odpImport.applyNoPop"));
      return;
    }

    if (!session?.token) {
      setApplyState("error");
      setApplyMessage(t("import.page.tokenExpired"));
      return;
    }

    if (!uploadFile) {
      setApplyState("error");
      setApplyMessage(t("import.page.noFile"));
      return;
    }

    // Defense-in-depth: never send a payload to /imports/ingest while the file
    // still has per-row errors or a file-level scope violation surfaced
    // through the synchronous validasi tab.
    if (summary.invalid > 0 || fileLevelError) {
      setApplyState("error");
      setApplyMessage(
        fileLevelError
          ? t("odpImport.applyScopeProblem", { error: fileLevelError })
          : t("import.page.errorRowsApply"),
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
      setApplyMessage(t("import.page.applySuccess"));
    } catch (err) {
      setApplyState("error");
      setApplyMessage(
        err instanceof Error ? err.message : t("import.page.applyFailed"),
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
    <div className="space-y-6 pr-1.5 pb-8">
      {/* Hero */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{t("import.page.title", { entity: "ODP" })}</h2>
          {popCheck && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              popCheck.hasPop
                ? "bg-green-500/10 text-green-500 border-green-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}>
              {popCheck.hasPop
                ? t("import.page.badgeReady", { entity: "POP" })
                : t("import.page.badgeUnavailable", { entity: "POP" })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("import.page.subtitleWithPop", { entity: "ODP" })}
        </p>
      </header>

      <Separator />

      {/* Stepper */}
      <div className="w-full">
        <nav className="flex items-center justify-between border border-border bg-muted/20 p-1.5 rounded-lg max-w-4xl mx-auto" aria-label={t("import.page.progressLabel")}>
          {steps.map((s, idx) => {
            const isActive = step === s.value;
            const isCompleted = steps.findIndex(x => x.value === step) > idx;
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
                  {s.label}
                </button>
                {idx < steps.length - 1 && (
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
            <CardTitle>{t("import.page.templateHeading")}</CardTitle>
            <CardDescription>
              {t("import.page.templateDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">{t("import.page.columnList", { count: 9 })}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">device name</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.deviceName")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">device type</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.deviceType")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">status</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.status")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">region</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.region")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">POP</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.pop")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">longitude</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.longitude")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">latitude</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.latitude")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">kapasitas odp</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.odpCapacity")}</p>
                </div>
                <div className="p-2 border border-border bg-card rounded">
                  <span className="text-primary font-bold">kapasitas splitter</span>
                  <p className="text-muted-foreground text-[10px] mt-1">{t("odpImport.colDesc.splitterCapacity")}</p>
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
            <CardTitle>{t("import.page.uploadHeading", { entity: "ODP" })}</CardTitle>
            <CardDescription>
              {t("import.page.uploadDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>{t("import.page.readError")}</AlertTitle>
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
                <h3 className="text-sm font-semibold uppercase tracking-wider font-mono">{t("import.page.dragDrop")}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {t("import.page.dragDropHint")}
                </p>
                <Label
                  htmlFor="import-file-upload"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer"
                >
                  {t("import.page.pickFile")}
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
                      {(uploadFile.size / 1024).toFixed(1)} KB · {t("import.page.fileReady")}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile} title={t("import.page.removeFile")}>
                  <X className="size-4" />
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-border p-4 bg-muted/5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{t("import.page.checklist", { entity: "ODP" })}</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${popCheck?.hasPop ? "bg-green-500" : "bg-red-500"}`} />
                  {t("import.page.prereqLabel")} POP: {popCheck?.hasPop ? t("import.page.prereqMet") : t("import.page.prereqNotMet")}
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${uploadFile ? "bg-green-500" : "bg-muted-foreground"}`} />
                  {t("import.page.fileSelected")}: {uploadFile ? t("import.page.fileSelectedYes") : t("import.page.fileSelectedNo")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  {t("import.page.maxRows")}
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
              label={t("import.page.totalRows")}
              value={summary.total}
              tone="primary"
            />
            <ImportSummaryStat
              label={t("import.page.validRows")}
              value={summary.valid}
              total={summary.total || 1}
              tone="success"
            />
            <ImportSummaryStat
              label={t("import.page.errorRows")}
              value={summary.invalid}
              total={summary.total || 1}
              tone="destructive"
            />
          </div>

          {summary.invalid > 0 && (
            <Alert variant="destructive" className="max-w-4xl mx-auto">
              <AlertTriangle className="size-4" />
              <AlertTitle>{t("import.page.invalidFound")}</AlertTitle>
              <AlertDescription>
                {t("import.page.invalidDescA", { count: summary.invalid })}{" "}
                <strong className="text-red-600">VALID</strong>{" "}
                {t("import.page.invalidDescB")}{" "}
                {t("odpImport.invalidFilterHint")}
              </AlertDescription>
            </Alert>
          )}

          {fileLevelError && (
            <Alert variant="destructive" className="max-w-4xl mx-auto">
              <AlertCircle className="size-4" />
              <AlertTitle>
                {session?.me?.role === "admin"
                  ? t("import.page.errMultiRegion")
                  : session?.me?.role === "user_all_region"
                    ? t("import.page.errOutOfScope")
                    : t("import.page.errRegionUnknown")}
              </AlertTitle>
              <AlertDescription>{fileLevelError}</AlertDescription>
            </Alert>
          )}

          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t("import.page.previewHeading", { entity: "ODP" })}</CardTitle>
                <CardDescription>
                  {t("import.page.previewDesc")}
                </CardDescription>
              </div>
              {uploadFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>{t("import.page.fileLabel")} <strong>{filename}</strong></span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      removeFile();
                      setStep("upload");
                    }}
                    className="h-7 text-[10px]"
                  >
                    {t("import.page.changeFile")}
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
          {t("import.page.back")}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => router.push("/data-management")}
          >
            {t("import.page.cancel")}
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
            {isTemplateStep && t("import.page.nextUpload")}
            {isUploadStep && t("import.page.viewValidation")}
            {isPreviewStep && t("import.page.apply")}
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
                ? t("import.page.dialog.successTitle", { entity: "ODP" })
                : applyState === "error"
                  ? t("import.page.dialog.errorTitle")
                  : t("import.page.dialog.confirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              {applyState === "success"
                ? t("import.page.dialog.successDesc")
                : applyState === "error"
                  ? t("import.page.dialog.errorDesc")
                  : t("import.page.dialog.confirmDesc")}
            </DialogDescription>
          </DialogHeader>

          {applyState === "idle" && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2.5 text-xs font-mono">
                <h3 className="font-semibold uppercase tracking-wider text-muted-foreground">{t("import.page.dialog.summaryTitle")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.fileName")}</span>
                    <p className="font-semibold text-foreground mt-0.5 truncate">{filename}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.dataCount")}</span>
                    <p className="font-semibold text-foreground mt-0.5">{t("import.page.dialog.rows", { count: summary.total })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.willImport")}</span>
                    <p className="font-semibold text-green-600 mt-0.5">{summary.valid} ODP</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.willSkip")}</span>
                    <p className="font-semibold text-red-500 mt-0.5">{summary.invalid} ODP</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-950/30 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <div className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-1">{t("import.page.dialog.warningTitle")}</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>{t("import.page.dialog.warningCreate", { entity: "ODP" })}</li>
                      <li>{t("import.page.dialog.warningInventory")}</li>
                      <li>{t("odpImport.warningSecondaryRelations")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {applyState === "loading" && (
            <div role="status" aria-label={t("import.page.dialog.saving")} className="space-y-3 py-2">
              <span className="sr-only">{t("import.page.dialog.saving")}</span>
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-2.5 bg-blue-500/10 rounded-full animate-pulse">
                  <Loader2 className="size-6 text-blue-500 animate-spin" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider font-mono text-blue-600">{t("import.page.dialog.saving")}</p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2.5 font-mono text-xs">
                <Skeleton className="h-3.5 w-40 rounded" />
                <div className="grid grid-cols-2 gap-2.5">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <Skeleton className="h-3 w-2/3 rounded" />
              </div>
            </div>
          )}

          {applyState === "success" && importResult && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-full">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider font-mono">{t("import.page.dialog.completeTitle")}</h3>
              </div>

              <div className="rounded-lg border border-border p-3 bg-muted/10 space-y-2.5 font-mono text-xs">
                <h4 className="font-semibold uppercase tracking-wider text-muted-foreground">{t("import.page.dialog.executionTitle")}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.successCount")}</span>
                    <p className="font-bold text-green-600 text-base">{importResult.successCount}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.failedCount")}</span>
                    <p className="font-bold text-red-500 text-base">{importResult.failedCount}</p>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">{t("import.page.dialog.errorListTitle", { count: importResult.errors.length })}</Label>
                  <div className="border border-border rounded-md bg-card max-h-[140px] overflow-y-auto p-2.5 space-y-2 font-mono text-[10px]">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-red-500 border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-bold">{t("import.page.dialog.rowLabel", { row: err.row_index })}</span>
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
                <AlertTitle>{t("import.page.dialog.failedSave")}</AlertTitle>
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
                  {t("import.page.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="w-full sm:w-auto"
                  disabled={summary.valid === 0 || summary.invalid > 0 || fileLevelError !== null}
                  title={
                    summary.invalid > 0
                      ? t("import.page.dialog.retryTitle")
                      : fileLevelError
                        ? fileLevelError
                        : ""
                  }
                >
                  {t("import.page.dialog.apply")}
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
                  {t("import.page.dialog.newImport")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setApplyDialogOpen(false);
                    router.push("/data-management/list/odp");
                  }}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  {t("import.page.dialog.viewList", { entity: "ODP" })}
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
                  {t("import.page.back")}
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="w-full sm:w-auto"
                >
                  {t("import.page.dialog.retry")}
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

function validateOdpRow(row: Record<string, string>, t: TFn): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Normalization helper to map headers regardless of case or spaces
  const getValue = (key: string): string => {
    const foundKey = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
    );
    return foundKey ? String(row[foundKey] ?? "").trim() : "";
  };

  const deviceName = getValue("device name");
  if (!deviceName) errors.push(t("odpImport.val.deviceNameRequired"));

  const status = getValue("status").toLowerCase();
  if (!status) {
    errors.push(t("odpImport.val.statusRequired"));
  } else if (!["draft", "installed", "active", "inactive", "maintenance", "retired"].includes(status)) {
    errors.push(t("odpImport.val.statusInvalid"));
  }

  const region = getValue("region");
  if (!region) errors.push(t("odpImport.val.regionRequired"));

  const pop = getValue("POP");
  if (!pop) errors.push(t("odpImport.val.popRequired"));

  const longStr = getValue("longitude");
  if (!longStr) {
    errors.push(t("odpImport.val.lngRequired"));
  } else {
    const longitude = Number(longStr);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.push(t("odpImport.val.lngRange"));
    }
  }

  const latStr = getValue("latitude");
  if (!latStr) {
    errors.push(t("odpImport.val.latRequired"));
  } else {
    const latitude = Number(latStr);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.push(t("odpImport.val.latRange"));
    }
  }

  const capacityStr = getValue("kapasitas odp");
  if (!capacityStr) {
    errors.push(t("odpImport.val.odpCapRequired"));
  } else {
    const totalPorts = Number(capacityStr);
    if (!Number.isFinite(totalPorts) || totalPorts <= 0 || !Number.isInteger(totalPorts)) {
      errors.push(t("odpImport.val.odpCapPositiveInt"));
    }
  }

  const splitter = getValue("kapasitas splitter");
  if (!splitter) {
    errors.push(t("odpImport.val.splitterRequired"));
  } else if (!/^1:\d+$/.test(splitter)) {
    errors.push(t("odpImport.val.splitterFormat"));
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
  t: TFn,
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
  throw new Error(t("import.page.unsupportedRole"));
}

