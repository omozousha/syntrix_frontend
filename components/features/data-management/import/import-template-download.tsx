"use client";

import * as React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Template columns required for ODP bulk import.
 * Field names match the user-approved brief (lowercase + spaces).
 */
export const ODP_TEMPLATE_COLUMNS = [
  "device name",
  "device type",
  "status",
  "region",
  "POP",
  "longitude",
  "latitude",
  "kapasitas odp",
  "kapasitas splitter",
] as const;

const EXAMPLE_ROW_1: Record<string, string> = {
  "device name": "ODP-JKT-001",
  "device type": "ODP",
  "status": "installed",
  "region": "REG-000005",
  "POP": "POP-JKT-01",
  "longitude": "106.84513",
  "latitude": "-6.21462",
  "kapasitas odp": "8",
  "kapasitas splitter": "1:8",
};

const EXAMPLE_ROW_2: Record<string, string> = {
  "device name": "ODP-JKT-002",
  "device type": "ODP",
  "status": "installed",
  "region": "REG-000005",
  "POP": "POP-JKT-01",
  "longitude": "106.85120",
  "latitude": "-6.21800",
  "kapasitas odp": "16",
  "kapasitas splitter": "1:16",
};

const EXAMPLE_ROW_3: Record<string, string> = {
  "device name": "ODP-BDG-001",
  "device type": "ODP",
  "status": "planned",
  "region": "REG-000006",
  "POP": "POP-BDG-03",
  "longitude": "107.61912",
  "latitude": "-6.90389",
  "kapasitas odp": "8",
  "kapasitas splitter": "1:8",
};

const EXAMPLE_ROWS = [EXAMPLE_ROW_1, EXAMPLE_ROW_2, EXAMPLE_ROW_3];

/**
 * Renders the ODP bulk-import template generator.
 *
 * - Primary action: download `.xlsx` (with 3 sheets: ODP, Petunjuk, Validasi)
 * - Secondary action: download `.csv` (header + 3 example rows)
 *
 * Browser-only — uses `xlsx` client-side, no backend call required.
 */
export function ImportTemplateDownload({
  fileName = "template_odp_bulk_import",
}: {
  fileName?: string;
}) {
  function buildCsv(): string {
    const headers = ODP_TEMPLATE_COLUMNS.join(",");
    const rows = EXAMPLE_ROWS.map((row) =>
      ODP_TEMPLATE_COLUMNS.map((col) => csvEscape(row[col])).join(","),
    );
    return [headers, ...rows].join("\n");
  }

  function csvEscape(value: string | undefined): string {
    if (!value) return "";
    if (/[",\n]/.test(value)) return `"${value.replaceAll(`"`, `""`)}"`;
    return value;
  }

  function downloadCsv() {
    const csv = buildCsv();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `${fileName}.csv`);
  }

  function buildOdpRows(): string[][] {
    const rows: string[][] = [ODP_TEMPLATE_COLUMNS as unknown as string[]];
    EXAMPLE_ROWS.forEach((row) => {
      rows.push(ODP_TEMPLATE_COLUMNS.map((c) => row[c]));
    });
    return rows;
  }

  function buildPetunjukRows(): string[][] {
    const rows: string[][] = [
      ["PETUNJUK PENGGUNAAN TEMPLATE ODP BULK IMPORT"],
      [""],
    ];
    ODP_TEMPLATE_COLUMNS.forEach((col) => {
      rows.push([col, "Wajib diisi sesuai contoh di sheet 'ODP'"]);
    });
    return rows;
  }

  function buildValidasiRows(): string[][] {
    return [
      ["ATURAN VALIDASI"],
      [""],
      ["Rule", "Pesan Error"],
      ["device name wajib", "Kolom device name wajib diisi"],
      ["device name unik per region", "Nama ODP sudah digunakan di region ini"],
      ["device type wajib ODP", "device type harus ODP"],
      ["status valid (installed / planned / maintenance)", "Status tidak valid"],
      ["region harus valid", "Region tidak ditemukan"],
      ["POP harus valid di region yang sama", "POP tidak valid untuk region"],
      ["longitude -180..180", "Longitude di luar range"],
      ["latitude -90..90", "Latitude di luar range"],
      ["kapasitas odp integer > 0", "Kapasitas ODP harus angka > 0"],
      ["kapasitas splitter format 1:N", "Format harus 1:N (contoh 1:8)"],
      ["Maks 2.000 baris per batch", "Batch terlalu besar"],
    ];
  }

  function downloadXlsx() {
    const wsOdp = XLSX.utils.aoa_to_sheet(buildOdpRows());
    (wsOdp as Record<string, unknown>)["!cols"] = ODP_TEMPLATE_COLUMNS.map((col) => ({
      wch: Math.max(18, col.length + 2),
    }));

    const wsPetunjuk = XLSX.utils.aoa_to_sheet(buildPetunjukRows());
    const wsValidasi = XLSX.utils.aoa_to_sheet(buildValidasiRows());

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsOdp, "ODP");
    XLSX.utils.book_append_sheet(workbook, wsPetunjuk, "Petunjuk");
    XLSX.utils.book_append_sheet(workbook, wsValidasi, "Validasi");

    const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    triggerDownload(blob, `${fileName}.xlsx`);
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
        Template XLSX berisi 3 sheet: <strong>ODP</strong> (data + 3 contoh baris),{" "}
        <strong>Petunjuk</strong>, <strong>Validasi</strong>. Format CSV adalah
        header plain-text untuk editor teks.
      </p>
    </div>
  );
}
