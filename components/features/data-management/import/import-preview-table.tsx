"use client";

import * as React from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, CircleDot, ChevronUp, ChevronDown, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImportPreviewRow = {
  rowIndex: number;
  valid: boolean;
  data: Record<string, string> | null;
  errors: string[];
};

export type ImportPreviewTableProps = {
  rows: ImportPreviewRow[];
  columns: string[];
  maxRows?: number;
};

type FilterType = "all" | "valid" | "error";

export function ImportPreviewTable({
  rows,
  columns,
  maxRows = 50,
}: ImportPreviewTableProps) {
  const [filterType, setFilterType] = React.useState<FilterType>("all");
  const [sortConfig, setSortConfig] = React.useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      if (filterType === "valid") return row.valid && row.errors.length === 0;
      if (filterType === "error") return !row.valid || row.errors.length > 0;
      return true;
    });
  }, [rows, filterType]);

  const visibleRows = React.useMemo(() => {
    let sortedRows = filteredRows.slice(0, maxRows);

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      const direction = sortConfig.direction === "asc" ? 1 : -1;
      sortedRows = [...sortedRows].sort((a, b) => {
        const aVal = a.data?.[sortKey] ?? "";
        const bVal = b.data?.[sortKey] ?? "";

        // Try numeric comparison first
        const aNum = Number(aVal);
        const bNum = Number(bVal);

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return (aNum - bNum) * direction;
        }

        return aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' }) * direction;
      });
    }

    return sortedRows;
  }, [filteredRows, maxRows, sortConfig]);

  const overflow = filteredRows.length - visibleRows.length;

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const renderSortIcon = (column: string) => {
    if (sortConfig.key !== column) return (
      <ChevronUp className="size-3 text-muted-foreground/30" />
    );
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="size-3 text-muted-foreground" />
    ) : (
      <ChevronDown className="size-3 text-muted-foreground" />
    );
  };

  const downloadErrorCsv = () => {
    const errorRows = rows.filter(r => !r.valid || r.errors.length > 0);
    if (errorRows.length === 0) return;

    // Headers: Baris, Kolom..., Error
    const headers = ["Baris", ...columns, "Kesalahan Validasi"].join(",");
    const csvContent = errorRows.map(row => {
      const rowData = columns.map(col => {
        const val = row.data?.[col] ?? "";
        // Escape quotes
        return /[",\n]/.test(val) ? `"${val.replaceAll('"', '""')}"` : val;
      });
      const errorMsg = row.errors.join("; ");
      const escapedError = /[",\n]/.test(errorMsg) ? `"${errorMsg.replaceAll('"', '""')}"` : errorMsg;
      return [row.rowIndex, ...rowData, escapedError].join(",");
    });

    const csv = [headers, ...csvContent].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error_impor_odp_baris_${errorRows.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const errorCount = rows.filter(r => !r.valid || r.errors.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Workspace Header & Action Filters */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
            Filter Validasi ({filteredRows.length} dari {rows.length} baris)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Stepper Buttons for filtering */}
          <div className="flex border border-border rounded-md overflow-hidden bg-muted/20 text-xs font-mono">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={cn(
                "px-3 py-1 hover:bg-muted transition-colors",
                filterType === "all" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              SEMUA ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("valid")}
              className={cn(
                "px-3 py-1 hover:bg-muted transition-colors border-l border-border",
                filterType === "valid" ? "bg-green-600 text-white font-semibold" : "text-muted-foreground"
              )}
            >
              VALID ({rows.length - errorCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("error")}
              className={cn(
                "px-3 py-1 hover:bg-muted transition-colors border-l border-border",
                filterType === "error" ? "bg-red-600 text-white font-semibold" : "text-muted-foreground"
              )}
            >
              ERROR ({errorCount})
            </button>
          </div>

          {errorCount > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadErrorCsv}
              className="h-7 text-xs font-mono border-red-500/30 text-red-600 hover:bg-red-500/5 hover:text-red-700 gap-1.5"
            >
              <Download className="size-3" />
              UNDUH ERROR CSV
            </Button>
          )}
        </div>
      </header>

      {/* Overflow state description */}
      {overflow > 0 && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200 dark:border-amber-950/30 p-2.5 rounded font-mono uppercase tracking-wider text-center">
          +{overflow} baris data disembunyikan. Hanya menampilkan {maxRows} data pertama pada daftar pratinjau.
        </div>
      )}

      {/* Responsive Workspace Table */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th
                className="px-3 py-2 text-right border-r border-border/50 bg-muted/20"
                style={{ width: 64 }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold font-mono">
                  BARIS
                </span>
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left cursor-pointer select-none hover:bg-muted/50 transition-colors font-mono"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {col}
                    </span>
                    {renderSortIcon(col)}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-left" style={{ width: 140 }}>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold font-mono">
                  STATUS VALIDASI
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.rowIndex}
                className={cn(
                  "border-b border-border/50 hover:bg-muted/5 transition-colors",
                  row.valid && row.errors.length === 0
                    ? ""
                    : "bg-red-500/[0.03] dark:bg-red-500/[0.02]"
                )}
              >
                <td
                  className="px-3 py-2.5 text-right border-r border-border/30 bg-muted/5"
                  style={{ width: 64 }}
                >
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {row.rowIndex}
                  </span>
                </td>
                {columns.map((col) => {
                  const val = row.data?.[col] ?? "";
                  return (
                    <td key={col} className="px-3 py-2.5 max-w-[200px]">
                      <span className="truncate block font-mono text-xs" title={val}>
                        {val || <span className="text-muted-foreground/40 font-mono text-xs">—</span>}
                      </span>
                    </td>
                  );
                })}
                <td className="px-3 py-2.5" style={{ width: 140 }}>
                  <StatusCell row={row} />
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-16 text-center"
                >
                  <CircleDot className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    [TIDAK ADA DATA PADA FILTER INI]
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > maxRows && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono text-right">
          Menampilkan {maxRows} dari {filteredRows.length} baris tersaring.
        </p>
      )}
    </div>
  );
}

function StatusCell({ row }: { row: ImportPreviewRow }) {
  if (row.valid && row.errors.length === 0) {
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 h-5 px-2 text-[10px] font-mono font-medium">
        VALID
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-start max-w-[200px]">
      <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/10 h-5 px-2 text-[10px] font-mono font-medium">
        ERROR
      </Badge>
      <div className="text-[10px] text-red-500 font-mono leading-relaxed mt-0.5 max-h-[60px] overflow-y-auto w-full">
        {row.errors.map((err, i) => (
          <p key={i} className="before:content-['•_']">
            {err}
          </p>
        ))}
      </div>
    </div>
  );
}
