"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowLeft } from "lucide-react";
import * as XLSX from "xlsx";
import {
  NdHero,
  NdLabel,
  NdDivider,
  NdCard,
  NdCardSection,
  NdSegmented,
} from "@/components/ui/nothing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportSummaryStat } from "@/components/features/data-management/import/import-summary-stat";
import {
  ImportPreviewTable,
  type ImportPreviewRow,
} from "@/components/features/data-management/import/import-preview-table";
import {
  ImportTemplateDownload,
  ODP_TEMPLATE_COLUMNS,
} from "@/components/features/data-management/import/import-template-download";
import { useSession } from "@/components/session-context";
import { apiFetch } from "@/lib/api";

type StepKey = "template" | "upload" | "preview" | "apply";
const STEPS: Array<{ value: StepKey; label: string }> = [
  { value: "template", label: "01 · TEMPLATE" },
  { value: "upload", label: "02 · UPLOAD" },
  { value: "preview", label: "03 · VALIDASI" },
  { value: "apply", label: "04 · TERAPKAN" },
];

/**
 * ODP Bulk Import page — Nothing Design layout.
 *
 * Step 1: Download XLSX/CSV template (primary XLSX)
 * Step 2: Upload file (CSV/XLSX) — local XLSX parse, client row-indexed preview
 * Step 3: Validation preview (50 row limit), per-row errors
 * Step 4: Apply batch (POST /imports/ingest)
 */
export default function OdpBulkImportPage() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState<StepKey>("template");
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, valid: 0, invalid: 0 });
const [applyState, setApplyState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [applyMessage, setApplyMessage] = useState("");

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
    setFilename(file.name);
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
    if (!session?.token) {
      setApplyState("error");
      setApplyMessage("Token session tidak ditemukan. Silakan login ulang.");
      return;
    }
    setApplyState("loading");
    setApplyMessage("");

    try {
      const response = await apiFetch("/imports/ingest", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          entity_type: "devices",
          device_type_key: "ODP",
          asset_group: "passive",
          apply: true,
          preview_rows: rows.map((r) => ({
            row_index: r.rowIndex,
            data: r.data,
          })),
        }),
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

  function resetAll() {
    setStep("template");
    setFilename(null);
    setRows([]);
    setSummary({ total: 0, valid: 0, invalid: 0 });
    setApplyState("idle");
    setApplyMessage("");
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="space-y-2">
        <NdLabel color="secondary">IMPOR MASSAL</NdLabel>
        <NdHero size="lg">IMPOR MASSAL ODP</NdHero>
        <p
          className="nd-body"
          style={{ fontSize: 14, color: "var(--nd-text-secondary)" }}
        >
          Unggah CSV atau Excel hingga 2.000 baris. Cocok untuk rollout area
          luas. Sisanya (relasi topologi, project, attachment) bisa dilengkapi
          nanti lewat Detail ODP.
        </p>
      </header>

      <NdDivider />

      {/* Step segmented control */}
      <NdSegmented<StepKey>
        value={step}
        onChange={setStep}
        options={STEPS}
      />

      <NdDivider />

      {step === "template" && (
        <NdCard padding="md">
          <NdCardSection title="LANGKAH 1 · UNDUH TEMPLATE">
            <div className="space-y-4">
              <p
                className="nd-body"
                style={{ fontSize: 14, color: "var(--nd-text-primary)" }}
              >
                Persiapkan file Excel/CSV Anda. Template berisi 9 kolom wajib
                dan 3 contoh baris valid.
              </p>
              <ImportTemplateDownload />
            </div>
          </NdCardSection>
          <FooterButtons
            onBack={goBack}
            cancelHref="/data-management/list/odp"
            onPrimary={() => setStep("upload")}
            primaryLabel="LANJUT UNGGAH"
          />
        </NdCard>
      )}

      {step === "upload" && (
        <NdCard padding="md">
          <NdCardSection title="LANGKAH 2 · UNGGAH FILE">
            <label
              htmlFor="import-file"
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed py-12 transition-colors"
              style={{
                borderColor: "var(--nd-border-visible)",
                background: "var(--nd-surface-raised)",
              }}
            >
              <Upload size={32} style={{ color: "var(--nd-text-secondary)" }} />
              <NdLabel color="secondary">UNGGAH CSV ATAU XLSX</NdLabel>
              <p
                className="nd-body"
                style={{
                  fontSize: 12,
                  color: "var(--nd-text-disabled)",
                  textAlign: "center",
                  maxWidth: 360,
                }}
              >
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
              <p
                className="nd-body"
                style={{ fontSize: 12, color: "var(--nd-text-secondary)" }}
              >
                FILE TERPILIH: <strong>{filename}</strong>
              </p>
            )}
          </NdCardSection>
          <FooterButtons
            onBack={goBack}
            cancelHref="/data-management/list/odp"
            onPrimary={() => setStep("preview")}
            primaryLabel="LIHAT VALIDASI"
            primaryDisabled={!rows.length}
          />
        </NdCard>
      )}

      {step === "preview" && (
        <NdCard padding="md">
          <NdCardSection title="LANGKAH 3 · VALIDASI">
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
                tone="accent"
              />
            </div>

            <NdDivider />

            <ImportPreviewTable
              rows={rows}
              columns={[...ODP_TEMPLATE_COLUMNS]}
              maxRows={50}
            />
          </NdCardSection>
          <FooterButtons
            onBack={goBack}
            cancelHref="/data-management/list/odp"
            onPrimary={() => setStep("apply")}
            primaryLabel="LANJUT TERAPKAN"
            primaryDisabled={summary.valid === 0}
          />
        </NdCard>
      )}

      {step === "apply" && (
        <NdCard padding="md">
          <NdCardSection title="LANGKAH 4 · TERAPKAN">
            <div className="flex flex-col gap-4">
              <p
                className="nd-body"
                style={{
                  fontSize: 14,
                  color: "var(--nd-text-primary)",
                  lineHeight: 1.5,
                }}
              >
                Setelah Anda klik TERAPKAN, sistem akan mengirim{" "}
                <strong>{summary.valid}</strong> baris valid ke server dan
                membuat record <code>devices</code> bertipe{" "}
                <code>ODP</code>. Baris dengan error akan dilewati dan dapat
                di-export sebagai CSV terpisah bila diperlukan.
              </p>

              {applyState === "success" && (
                <div
                  style={{
                    fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--nd-success)",
                  }}
                >
                  [OK] {applyMessage}
                </div>
              )}
              {applyState === "error" && (
                <div
                  style={{
                    fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--nd-accent)",
                  }}
                >
                  [ERROR] {applyMessage}
                </div>
              )}
            </div>
          </NdCardSection>
          <FooterButtons
            onBack={goBack}
            cancelHref="/data-management/list/odp"
            onPrimary={handleApply}
            primaryLabel={
              applyState === "loading"
                ? "MENGIRIM..."
                : applyState === "success"
                  ? "BERHASIL"
                  : "TERAPKAN SEKARANG"
            }
            primaryDisabled={
              applyState === "success" || summary.valid === 0 || !session?.token
            }
          />
        </NdCard>
      )}
    </div>
  );
}

function FooterButtons({
  onBack,
  cancelHref,
  onPrimary,
  primaryLabel,
  primaryDisabled,
}: {
  onBack: () => void;
  cancelHref: string;
  onPrimary: () => void;
  primaryLabel: string;
  primaryDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 pt-3">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="rounded-full"
        style={{
          fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontSize: 13,
        }}
      >
        <ArrowLeft className="mr-2 size-4" />
        KEMBALI
      </Button>

      <div className="flex items-center gap-2">
        <Button
          asChild
          type="button"
          variant="ghost"
          className="rounded-full"
          style={{
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: 13,
          }}
        >
          <a href={cancelHref}>BATAL</a>
        </Button>
        <Button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="rounded-full"
          style={{
            background: primaryDisabled
              ? "var(--nd-surface-raised)"
              : "var(--nd-text-display)",
            color: primaryDisabled
              ? "var(--nd-text-disabled)"
              : "var(--nd-black)",
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: 13,
          }}
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replaceAll(`"`, ""));
  const result: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? "";
    });
    result.push(record);
  }
  return result;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === `"` && line[i + 1] === `"` && inQuotes) {
      cur += `"`;
      i += 1;
    } else if (ch === `"`) {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/**
 * Client-side row-level validator mirroring the 9 required ODP columns.
 * Returns errors[] (empty array when valid).
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
