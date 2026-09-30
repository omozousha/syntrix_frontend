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
import { useTranslate } from "@/lib/use-locale";
import { type MessageKey } from "@/lib/locales";

type StepKey = "template" | "upload" | "preview";

const STEPS: Array<{ value: StepKey; label: MessageKey }> = [
  { value: "template", label: "import.page.stepTemplate" },
  { value: "upload", label: "import.page.stepUpload" },
  { value: "preview", label: "import.page.stepValidation" },
];

type Props = {
  config: BulkImportConfig;
};

export function GenericBulkImportPage({ config }: Props) {
  const router = useRouter();
  const session = useSession();
  const { t } = useTranslate();
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
    requiresServiceType,
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
  const [fileLevelError, setFileLevelError] = useState<{ title: string; description: string } | null>(null);

  const [noticeOpen, setNoticeOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<PrerequisiteCheck | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    errors: Array<{ row_index: number; errors: string[] }>;
  } | null>(null);

  const runPrerequisiteCheck = useCallback(async (): Promise<PrerequisiteCheck | null> => {
    // ponytail: messages here are stored in state and rendered later; using t() would
    // need it in deps -> re-fetch on every locale toggle. Upgrade path: store a key+vars,
    // resolve at render.
    if (!session?.token) {
      const r = { hasData: false, count: 0, message: t("import.page.noSession"), entityLabel: "DATA" };
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
        const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) throw new Error(t("import.page.emptyFile"));
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
        if (!sheetName) throw new Error(t("import.page.emptyExcel"));
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        parsed = rows.map((row) => row as Record<string, string>);
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

    const firstRowKeys = Object.keys(parsed[0] || {});
    const matchCount = templateColumns.filter((col) =>
      firstRowKeys.some((k) => k.toLowerCase().trim() === col.label.toLowerCase().trim()),
    ).length;

    if (matchCount < 2) {
      setParseError(t("import.page.unknownFormat"));
      setUploadFile(null);
      setFilename(null);
      return;
    }

    let regionsList: Array<{ id: string; region_name: string; code: string }> | null = null;
    let allowedRegionIds: string[] | null = null;
    let popsList: Array<{ id: string; pop_id: string; pop_name: string; pop_code: string }> | null = null;
    let serviceTypesList: Array<{ id: string; service_type_name: string; service_type_code: string }> | null = null;

    if (requiresRegion || requiresPop || requiresServiceType) {
      try {
        const [regions, scopes, pops, svcTypes] = await Promise.all([
          requiresRegion ? loadRegionsCatalog(session?.token) : Promise.resolve(null),
          requiresRegion ? Promise.resolve(getUserScopeRegionIds(session)) : Promise.resolve(null),
          requiresPop ? loadPopsCatalog(session?.token) : Promise.resolve(null),
          requiresServiceType ? loadServiceTypesCatalog(session?.token) : Promise.resolve(null),
        ]);
        regionsList = regions as Array<{ id: string; region_name: string; code: string }> | null;
        allowedRegionIds = scopes as string[] | null;
        popsList = pops as Array<{ id: string; pop_id: string; pop_name: string; pop_code: string }> | null;
        serviceTypesList = svcTypes as Array<{ id: string; service_type_name: string; service_type_code: string }> | null;
      } catch (scopeErr) {
        setParseError(scopeErr instanceof Error ? scopeErr.message : t("import.page.unsupportedRole"));
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

    let fileErrorObj: { title: string; description: string } | null = null;
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
        fileErrorObj = {
          title: t("import.page.errRegionUnknown"),
          description: t("import.page.errRegionUnknownDesc", { regions: Array.from(unknownRegions).join(", ") }),
        };
      } else if (role === "admin" && uniqueRegionIds.size > 1) {
        fileErrorObj = {
          title: t("import.page.errMultiRegion"),
          description: t("import.page.errMultiRegionDesc", { count: uniqueRegionIds.size }),
        };
      } else if (role === "user_all_region" && allowedRegionIds.length === 0) {
        fileErrorObj = {
          title: t("import.page.errScopeNotSet"),
          description: t("import.page.errScopeNotSetDesc"),
        };
      } else if (
        role === "user_all_region" &&
        uniqueRegionIds.size > 0 &&
        Array.from(uniqueRegionIds).some((id) => !allowedRegionIds.includes(id))
      ) {
        const outOfScopeIds = Array.from(uniqueRegionIds).filter((id) => !allowedRegionIds.includes(id));
        fileErrorObj = {
          title: t("import.page.errOutOfScope"),
          description: t("import.page.errOutOfScopeDesc", { count: outOfScopeIds.length }),
        };
      }
    }

    if (requiresPop && popsList) {
      const lowerPopName = new Map<string, { id: string; rawName: string }>();
      const lowerPopCode = new Map<string, { id: string; rawName: string }>();
      const lowerPopId = new Map<string, { id: string; rawName: string }>();
      const lowerPopInventoryId = new Map<string, { id: string; rawName: string }>();
      for (const p of popsList) {
        const nameKey = p.pop_name.trim().toLowerCase();
        if (nameKey) lowerPopName.set(nameKey, { id: p.id, rawName: p.pop_name });
        const codeKey = p.pop_code.trim().toLowerCase();
        if (codeKey) lowerPopCode.set(codeKey, { id: p.id, rawName: p.pop_name });
        if (p.id) lowerPopId.set(p.id.trim().toLowerCase(), { id: p.id, rawName: p.pop_name });
        if (p.pop_id) lowerPopInventoryId.set(p.pop_id.trim().toLowerCase(), { id: p.id, rawName: p.pop_name });
      }

      const popLookup = (raw: string): { id: string; rawName: string } | null => {
        const key = String(raw || "").trim().toLowerCase();
        if (!key) return null;
        return (
          lowerPopInventoryId.get(key) ||
          lowerPopCode.get(key) ||
          lowerPopName.get(key) ||
          lowerPopId.get(key) ||
          null
        );
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

      if (unknownPops.size && !fileErrorObj) {
        fileErrorObj = {
          title: t("import.page.errPopUnknown"),
          description: t("import.page.errPopUnknownDesc", { pops: Array.from(unknownPops).join(", ") }),
        };
      }
    }

    if (requiresServiceType && serviceTypesList) {
      const lowerStName = new Map<string, { id: string; rawName: string }>();
      const lowerStCode = new Map<string, { id: string; rawName: string }>();
      const lowerStId = new Map<string, { id: string; rawName: string }>();
      for (const st of serviceTypesList) {
        const nameKey = st.service_type_name.trim().toLowerCase();
        if (nameKey) lowerStName.set(nameKey, { id: st.id, rawName: st.service_type_name });
        const codeKey = st.service_type_code.trim().toLowerCase();
        if (codeKey) lowerStCode.set(codeKey, { id: st.id, rawName: st.service_type_name });
        if (st.id) lowerStId.set(st.id.trim().toLowerCase(), { id: st.id, rawName: st.service_type_name });
      }

      const stLookup = (raw: string): { id: string; rawName: string } | null => {
        const key = String(raw || "").trim().toLowerCase();
        if (!key) return null;
        return (
          lowerStName.get(key) ||
          lowerStCode.get(key) ||
          lowerStId.get(key) ||
          null
        );
      };

      const unknownSts = new Set<string>();

      preview = preview.map((row) => {
        const rawSt = String(
          row.data?.["service type"] ?? row.data?.service_type ?? row.data?.["Service Type"] ?? "",
        ).trim();
        if (!rawSt) return row;

        const resolved = stLookup(rawSt);
        if (!resolved) {
          unknownSts.add(rawSt);
          return {
            ...row,
            valid: false,
            errors: Array.from(
              new Set([...row.errors, `Service Type "${rawSt}" tidak terdaftar di master database`]),
            ),
          };
        }
        return row;
      });

      if (unknownSts.size && !fileErrorObj) {
        fileErrorObj = {
          title: t("import.page.errServiceTypeUnknown"),
          description: t("import.page.errServiceTypeUnknownDesc", { types: Array.from(unknownSts).join(", ") }),
        };
      }
    }

    setFileLevelError(fileErrorObj);

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
      setApplyMessage(t("import.page.applyPrereqMissing"));
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

    if (summary.invalid > 0 || fileLevelError) {
      setApplyState("error");
      setApplyMessage(
        fileLevelError
          ? t("import.page.fileProblem", { description: fileLevelError.description })
          : t("import.page.errorRowsApply"),
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
      setApplyMessage(t("import.page.applySuccess"));
    } catch (err) {
      setApplyState("error");
      setApplyMessage(err instanceof Error ? err.message : t("import.page.applyFailed"));
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
    <div className="space-y-6 pr-1.5 pb-8">
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
              {checkResult.hasData ? t("import.page.badgeReady", { entity: checkResult.entityLabel }) : t("import.page.badgeUnavailable", { entity: checkResult.entityLabel })}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {requiresPop ? t("import.page.subtitleWithPop", { entity: successEntityLabel }) : t("import.page.subtitleWithoutPop", { entity: successEntityLabel })}
        </p>
      </header>

      <Separator />

      <div className="w-full">
        <nav className="flex items-center justify-between border border-border bg-muted/20 p-1.5 rounded-lg max-w-4xl mx-auto" aria-label={t("import.page.progressLabel")}>
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
                  {t(s.label)}
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
            <CardTitle>{t("import.page.templateHeading")}</CardTitle>
            <CardDescription>
              {t("import.page.templateDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-border p-4 bg-muted/10 space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {t("import.page.columnList", { count: templateColumns.length })}
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
            <CardTitle>{t("import.page.uploadHeading", { entity: successEntityLabel })}</CardTitle>
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
                  isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/10 hover:bg-muted/20"
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
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {t("import.page.checklist", { entity: successEntityLabel })}
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {requiresPop && (
                  <li className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${checkResult?.hasData ? "bg-green-500" : "bg-red-500"}`}
                    />
                    {t("import.page.prereqLabel")}: {checkResult?.hasData ? t("import.page.prereqMet") : t("import.page.prereqNotMet")}
                  </li>
                )}
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

      {isPreviewStep && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 max-w-4xl mx-auto">
            <ImportSummaryStat label={t("import.page.totalRows")} value={summary.total} tone="primary" />
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
                <strong className="text-red-600">{t("import.preview.badgeValid")}</strong>{" "}
                {t("import.page.invalidDescB")}
              </AlertDescription>
            </Alert>
          )}

          {fileLevelError && (
            <Alert variant="destructive" className="max-w-4xl mx-auto">
              <AlertCircle className="size-4" />
              <AlertTitle>{fileLevelError.title}</AlertTitle>
              <AlertDescription>{fileLevelError.description}</AlertDescription>
            </Alert>
          )}

          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t("import.page.previewHeading", { entity: successEntityLabel })}</CardTitle>
                <CardDescription>
                  {t("import.page.previewDesc")}
                </CardDescription>
              </div>
              {uploadFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span>
                    {t("import.page.fileLabel")} <strong>{filename}</strong>
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
                    {t("import.page.changeFile")}
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
                ? t("import.page.dialog.successTitle", { entity: successEntityLabel.toUpperCase() })
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
                    <p className="font-semibold text-green-600 mt-0.5">{summary.valid} {successEntityLabel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("import.page.dialog.willSkip")}</span>
                    <p className="font-semibold text-red-500 mt-0.5">{summary.invalid} {successEntityLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-950/30 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <div className="flex gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-1">{t("import.page.dialog.warningTitle")}</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>{t("import.page.dialog.warningCreate", { entity: successEntityLabel })}</li>
                      <li>{t("import.page.dialog.warningInventory")}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {applyState === "loading" && <AppLoading variant="card" label={t("import.page.dialog.saving")} />}

          {applyState === "success" && importResult && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-2.5 bg-green-500/10 text-green-500 rounded-full">
                  <CheckCircle2 className="size-6" />
                </div>
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider font-mono">
                  {t("import.page.dialog.completeTitle")}
                </h3>
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
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    {t("import.page.dialog.errorListTitle", { count: importResult.errors.length })}
                  </Label>
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
                <Button type="button" variant="outline" onClick={() => setApplyDialogOpen(false)} className="w-full sm:w-auto">
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
                        ? fileLevelError.description
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
                    router.push(`/data-management/list/${deviceTypeKey?.toLowerCase() || entityType}`);
                  }}
                  className="w-full sm:flex-1 font-mono text-xs uppercase tracking-wider"
                >
                  {t("import.page.dialog.viewList", { entity: successEntityLabel })}
                </Button>
              </div>
            )}

            {applyState === "error" && (
              <>
                <Button type="button" variant="outline" onClick={() => setApplyState("idle")} className="w-full sm:w-auto">
                  {t("import.page.back")}
                </Button>
                <Button type="button" onClick={handleApply} className="w-full sm:w-auto">
                  {t("import.page.dialog.retry")}
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
  value: Array<{ id: string; pop_id: string; pop_name: string; pop_code: string }> | null;
} = { token: null, value: null };

async function loadPopsCatalog(
  token: string | undefined,
): Promise<Array<{ id: string; pop_id: string; pop_name: string; pop_code: string }> | null> {
  if (!token) return null;
  if (popsCatalogCache.token === token && popsCatalogCache.value) {
    return popsCatalogCache.value;
  }

  const collected: Array<{ id: string; pop_id: string; pop_name: string; pop_code: string }> = [];

  try {
    let page = 1;
    const pageSize = 200;
    const collectFromPage = (input: unknown) => {
      const arr = Array.isArray(input)
        ? input
        : Array.isArray((input as { items?: unknown[] })?.items)
          ? (input as { items?: unknown[] }).items
          : [];
      for (const raw of arr as Array<{ id?: unknown; pop_id?: unknown; pop_name?: unknown; pop_code?: unknown }>) {
        if (!raw?.id) continue;
        collected.push({
          id: String(raw.id),
          pop_id: String(raw.pop_id || ""),
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

const serviceTypesCatalogCache: {
  token: string | null;
  value: Array<{ id: string; service_type_name: string; service_type_code: string }> | null;
} = { token: null, value: null };

async function loadServiceTypesCatalog(
  token: string | undefined,
): Promise<Array<{ id: string; service_type_name: string; service_type_code: string }> | null> {
  if (!token) return null;
  if (serviceTypesCatalogCache.token === token && serviceTypesCatalogCache.value) {
    return serviceTypesCatalogCache.value;
  }

  const collected: Array<{ id: string; service_type_name: string; service_type_code: string }> = [];

  try {
    let page = 1;
    const pageSize = 200;
    const collectFromPage = (input: unknown) => {
      const arr = Array.isArray(input)
        ? input
        : Array.isArray((input as { items?: unknown[] })?.items)
          ? (input as { items?: unknown[] }).items
          : [];
      for (const raw of arr as Array<{ id?: unknown; service_type_name?: unknown; service_type_code?: unknown }>) {
        if (!raw?.id) continue;
        collected.push({
          id: String(raw.id),
          service_type_name: String(raw.service_type_name || ""),
          service_type_code: String(raw.service_type_code || ""),
        });
      }
      return Array.isArray(arr) ? arr.length : 0;
    };

    while (page <= 25) {
      const response = await apiFetch<{
        data?: { items?: unknown[] } | unknown[];
        items?: unknown[];
      }>(`/serviceTypes?page=${page}&limit=${pageSize}`, { token });

      const got = collectFromPage(response?.data);
      if (got < pageSize) break;
      page += 1;
    }
  } catch {
    return null;
  }

  serviceTypesCatalogCache.token = token;
  serviceTypesCatalogCache.value = collected;
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
