"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";
import { useSession } from "@/components/session-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

type StepKey = "template" | "upload" | "preview" | "apply";
const STEPS: Array<{ value: StepKey; label: string }> = [
  { value: "template", label: "01 · TEMPLATE" },
  { value: "upload", label: "02 · UPLOAD" },
  { value: "preview", label: "03 · VALIDASI" },
  { value: "apply", label: "04 · TERAPKAN" },
];

/**
 * ODP Bulk Import page — aligned with platform design system.
 *
 * Steps:
 * 1. Download template (XLSX/CSV)
 * 2. Upload file (CSV/XLSX) — local parse + client-side preview
 * 3. Validation preview (50-row limit), per-row errors
 * 4. Apply batch (POST /imports/ingest)
 *
 * Also includes:
 * - Interactive prerequisite notice dialog (with "don't show again" + localStorage)
 * - POP availability check before allowing import
 */
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

  // Notice dialog state — dialog always opens on first visit (unless user
  // dismissed via "don't show again" stored in localStorage).
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [popCheck, setPopCheck] = useState<PopPrerequisiteCheck | null>(null);
  const [isCheckingPops, setIsCheckingPops] = useState(false);

  /**
   * Check whether POPs exist in the user's accessible region before
   * allowing ODP import. Each ODP must reference a valid POP, so POPs
   * need to be created first.
   */
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

  // Show the notice dialog automatically on every page visit (unless the user
  // explicitly dismissed it via the "don't show again" checkbox).
  // The dialog intentionally always opens, even when POPs already exist, to
  // ensure users always see the prerequisite notice first (per requirement).
  // However, the heavy prereq check (POP availability) only runs after the
  // dialog has opened, not before.
  useEffect(() => {
    // localStorage is read synchronously; we resolve dismissed state in a
    // separate effect and only open the dialog once dismissed === false.
    if (typeof window === "undefined") return;
    const persisted = localStorage.getItem(
      "odp-bulk-import-notice-dismissed",
    );
    if (persisted === "true") {
      return; // user opted out; do not show
    }
    setNoticeOpen(true);
    // Trigger POP availability check in parallel so the dialog can show
    // status (or "Loading...") immediately on open.
    void checkPopAvailability();
    // Run only once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNoticeCheck = useCallback(async () => {
    await checkPopAvailability();
  }, [checkPopAvailability]);

  const goBack = useCallback(() => {
    if (step === "template") {
      router.push("/data-management/list/odp");
    } else if (step === "upload") {
      setStep("template");
    } else if (step === "preview") {
      setStep("upload");
    } else {
      setStep("preview");
    }
  }, [step, router]);

  async function handleFile(file: File) {
    // Re-verify POP availability when user uploads a file (gate)
    const popResult = popCheck ?? (await checkPopAvailability());
    if (!popResult?.hasPop) {
      setNoticeOpen(true);
      return;
    }

    setFilename(file.name);
    setUploadFile(file); // Keep original file so we can re-upload on Apply
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsed: Record<string, string>[] = [];

    if (ext === "csv") {
      const text = await file.text();
      parsed = parseCsv(text);
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      parsed = rows.map((row) =>
        (row as Record<string, unknown>) as Record<string, string>,
      );
    } else {
      setUploadFile(null);
      setApplyState("error");
      setApplyMessage("Format file harus .csv atau .xlsx");
      return;
    }

    const preview = parsed.map((data, idx) => {
      const { valid, errors } = validateOdpRow(data);
      return {
        rowIndex: idx + 2, // +1 for 1-indexed, +1 for header row
        valid,
        data,
        errors,
      };
    });

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

  async function handleApply() {
    // Re-verify POP availability before applying
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
      setApplyMessage("File belum diunggah. Silakan balik ke langkah Unggah.");
      return;
    }

    setApplyState("loading");
    setApplyMessage("");

    try {
      // Backend /imports/ingest expects multipart/form-data with a `file` field.
      // apiFetch handles FormData by skipping the JSON Content-Type and passing
      // the FormData directly (browser sets correct multipart boundary header).
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("entity_type", "devices");
      formData.append("device_type_key", "ODP");
      formData.append("asset_group", "passive");
      formData.append("apply", "true");

      const response = await apiFetch("/imports/ingest", {
        method: "POST",
        token: session.token,
        body: formData,
      });
      setApplyState("success");
      setApplyMessage(
        typeof response === "string"
          ? response
          : "Batch berhasil diterapkan. Mengalihkan ke list ODP...",
      );
      setTimeout(() => router.push("/data-management/list/odp"), 1500);
    } catch (err) {
      setApplyState("error");
      setApplyMessage(
        err instanceof Error ? err.message : "Gagal menerapkan batch.",
      );
    }
  }

  const proceedAfterNotice = () => {
    // Do nothing — notice dialog can only be closed.
    // User can manually navigate or re-trigger the file upload flow.
  };

  // Gate step navigation: block Upload step if POPs are missing
  const handleStepChange = (next: StepKey) => {
    if (next === "upload" && popCheck && !popCheck.hasPop) {
      setNoticeOpen(true);
      return;
    }
    setStep(next);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">IMPOR MASSAL ODP</h2>
        <p className="text-sm text-muted-foreground">
          Unggah CSV atau Excel hingga 2.000 baris. Cocok untuk rollout area
          luas. Sisanya (relasi topologi, project, attachment) bisa dilengkapi
          nanti lewat Detail ODP.
        </p>
      </header>

      <Separator />

      {/* Step tabs */}
      <Tabs value={step} onValueChange={(v) => handleStepChange(v as StepKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {STEPS.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Separator />

      {/* Step 1: Template */}
      {step === "template" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">LANGKAH 1 · UNDUH TEMPLATE</h3>
            <p className="text-sm text-muted-foreground">
              Persiapkan file Excel/CSV Anda. Template berisi 9 kolom wajib
              dan 3 contoh baris valid.
            </p>
          </div>

          <ImportTemplateDownload />
        </div>
      )}

      {/* Step 2: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">LANGKAH 2 · UNGGAH FILE</h3>
            <p className="text-sm text-muted-foreground">
              Klik area ini atau drop file di sini. Maks 2.000 baris.
            </p>
          </div>

          <label
            htmlFor="import-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-border bg-muted/30 py-12 transition-colors hover:bg-muted/50"
          >
            <Upload size={32} className="text-muted-foreground" />
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              UPLOAD CSV ATAU XLSX
            </Label>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Klik area ini atau drop file di sini. Maks 2.000 baris.
            </p>
            <Input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </label>
          {filename && (
            <p className="text-sm text-muted-foreground">
              FILE TERPILIH: <strong>{filename}</strong>
            </p>
          )}
        </div>
      )}

      {/* Step 3: Preview / Validation */}
      {step === "preview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ImportSummaryStat
              label="TOTAL BARIS"
              value={summary.total}
              tone="primary"
            />
            <ImportSummaryStat
              label="BARIS VALID"
              value={summary.valid}
              total={summary.total || 100}
              tone="success"
            />
            <ImportSummaryStat
              label="BARIS ERROR"
              value={summary.invalid}
              total={summary.total || 100}
              tone="destructive"
            />
          </div>

          <Separator />

          <ImportPreviewTable
            rows={rows}
            columns={[...ODP_TEMPLATE_COLUMNS]}
            maxRows={50}
          />
        </div>
      )}

      {/* Step 4: Apply */}
      {step === "apply" && (
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Setelah Anda klik TERAPKAN, sistem akan mengirim{" "}
              <strong>{summary.valid}</strong> baris valid ke server dan
              membuat record <code>devices</code> bertipe <code>ODP</code>.
              Baris dengan error akan dilewati dan dapat di-export sebagai
              CSV terpisah bila diperlukan.
            </p>

            {applyState === "success" && (
              <Alert>
                <AlertTitle className="text-xs uppercase tracking-wider text-green-600">
                  [OK]
                </AlertTitle>
                <AlertDescription>{applyMessage}</AlertDescription>
              </Alert>
            )}
            {applyState === "error" && (
              <Alert variant="destructive">
                <AlertTitle className="text-xs uppercase tracking-wider">
                  [ERROR]
                </AlertTitle>
                <AlertDescription>{applyMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-2 pt-3">
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
            onClick={
              step === "template"
                ? () => handleStepChange("upload")
                : step === "upload"
                  ? () => handleStepChange("preview")
                  : step === "preview"
                    ? () => handleStepChange("apply")
                    : handleApply
            }
            disabled={
              step === "upload"
                ? false
                : step === "preview"
                  ? summary.valid === 0
                  : step === "apply"
                    ? applyState === "loading"
                    : false
            }
            className="rounded-full"
          >
            {step === "template" && "LANJUT UNGGAH"}
            {step === "upload" && "LIHAT VALIDASI"}
            {step === "preview" && "LANJUT TERAPKAN"}
            {step === "apply" && applyState === "loading"
              ? "MENGIRIM..."
              : step === "apply" && applyState === "success"
                ? "BERHASIL"
                : "TERAPKAN SEKARANG"}
          </Button>
        </div>
      </div>

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
    .replace(/^\uFEFF/, "")
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

/**
 * Client-side row-level validator mirroring the 9 required ODP columns.
 * Returns { valid: boolean, errors: string[] }.
 */
function validateOdpRow(row: Record<string, string>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const deviceName = row["device name"] ?? row["device_name"] ?? "";
  if (!deviceName.trim()) errors.push("device name wajib diisi");

  const status = (row["status"] ?? "").toLowerCase().trim();
  if (!["installed", "planned", "maintenance"].includes(status)) {
    errors.push("status harus installed/planned/maintenance");
  }

  const longitude = Number(row["longitude"]);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push("longitude harus -180..180");
  }
  const latitude = Number(row["latitude"]);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push("latitude harus -90..90");
  }

  const totalPorts = Number(row["kapasitas odp"]);
  if (!Number.isFinite(totalPorts) || totalPorts <= 0) {
    errors.push("kapasitas odp harus integer > 0");
  }

  const splitter = (row["kapasitas splitter"] ?? "").trim();
  if (!/^1:\d+$/.test(splitter)) {
    errors.push("kapasitas splitter harus format 1:N (contoh 1:8)");
  }

  return { valid: errors.length === 0, errors };
}
