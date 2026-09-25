"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText } from "lucide-react";

export type ColumnDef = {
  key: string;
  label: string;
  description: string;
  required?: boolean;
};

export type ValidationRule = {
  rule: string;
  message: string;
};

type TemplateConfig = {
  fileName: string;
  sheetName: string;
  pageTitle: string;
  columns: ColumnDef[];
  exampleRows: Record<string, string>[];
  instructions: string[][];
  validationRules: ValidationRule[];
};

type Props = {
  config: TemplateConfig;
};

function buildCsv(columns: ColumnDef[], exampleRows: Record<string, string>[]): string {
  const headers = columns.map((c) => c.label).join(",");
  const rows = exampleRows.map((row) =>
    columns.map((col) => csvEscape(row[col.key])).join(","),
  );
  return [headers, ...rows].join("\n");
}

function csvEscape(value: string | undefined): string {
  if (!value) return "";
  if (/[",\n]/.test(value)) return `"${value.replaceAll(`"`, `""`)}"`;
  return value;
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GenericImportTemplateDownload({ config }: Props) {
  const { columns, exampleRows, fileName, sheetName, instructions, validationRules } = config;

  function downloadCsv() {
    const csv = buildCsv(columns, exampleRows);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `${fileName}.csv`);
  }

  function downloadXlsx() {
    const headerRow = columns.map((c) => c.label);
    const dataRows = [headerRow, ...exampleRows.map((row) => columns.map((c) => row[c.key]))];
    const wsData = XLSX.utils.aoa_to_sheet(dataRows);
    (wsData as Record<string, unknown>)["!cols"] = columns.map((col) => ({
      wch: Math.max(16, col.label.length + 2),
    }));

    const wsPetunjuk = XLSX.utils.aoa_to_sheet(instructions);
    const wsValidasi = XLSX.utils.aoa_to_sheet([
      ["ATURAN VALIDASI"],
      [""],
      ["Rule", "Pesan Error"],
      ...validationRules.map((r) => [r.rule, r.message]),
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsData, sheetName);
    XLSX.utils.book_append_sheet(workbook, wsPetunjuk, "Petunjuk");
    XLSX.utils.book_append_sheet(workbook, wsValidasi, "Validasi");

    const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    triggerDownload(blob, `${fileName}.xlsx`);
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Unduh Template
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={downloadXlsx} className="gap-2">
          <FileSpreadsheet className="size-4" />
          Unduh Template XLSX
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={downloadCsv}
          className="gap-2"
        >
          <FileText className="size-4" />
          Unduh Template CSV
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Template XLSX berisi 3 sheet: <strong>{sheetName}</strong> (data +{" "}
        {exampleRows.length} contoh baris), <strong>Petunjuk</strong>,{" "}
        <strong>Validasi</strong>. Format CSV adalah header plain-text untuk
        editor teks.
      </p>
    </div>
  );
}
