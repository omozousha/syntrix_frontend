"use client";

import * as React from "react";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, CircleDot } from "lucide-react";
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

/**
 * Compact preview table for import rows.
 * 
 * - Header: small uppercase labels
 * - Row: monospace numeric / value
 * - Status column uses Badge with semantic colors (success/warning/destructive)
 * - 50-row default limit (current spec); user sees summary for larger batches
 */
export function ImportPreviewTable({
  rows,
  columns,
  maxRows = 50,
}: ImportPreviewTableProps) {
  const visibleRows = rows.slice(0, maxRows);
  const overflow = rows.length - visibleRows.length;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          PRATINJAU {rows.length ? `(${rows.length} baris)` : ""}
        </span>
        {overflow > 0 ? (
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
            +{overflow} BARIS TERSEMBUNYI (HANYA 50 PERTAMA)
          </span>
        ) : null}
      </header>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th
                className="px-3 py-2 text-left text-right"
                style={{ width: 60 }}
              >
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  BARIS
                </span>
              </th>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {col}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-left" style={{ width: 120 }}>
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  STATUS
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.rowIndex}
                className={cn(
                  "border-b border-border/50",
                  row.valid && !row.errors.length
                    ? ""
                    : "bg-destructive/5"
                )}
              >
                <td
                  className="px-3 py-2 text-right"
                  style={{ width: 60 }}
                >
                  <span className="font-mono text-xs text-muted-foreground tabular-nums text-right">
                    {row.rowIndex}
                  </span>
                </td>
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2" style={{ maxWidth: 180 }}>
                    <span className="truncate block max-w-[180px]" title={row.data?.[col] ?? ""}>
                      {row.data?.[col] ?? (
                        <span className="text-muted-foreground font-mono text-xs">—</span>
                      )}
                    </span>
                  </td>
                ))}
                <td className="px-3 py-2" style={{ width: 120 }}>
                  <StatusCell row={row} />
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-12 text-center"
                >
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    [KOSONG · TIDAK ADA BARIS]
                  </span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {rows.length > maxRows && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
          Menampilkan {maxRows} dari {rows.length} baris. Sisa {overflow} baris disembunyikan.
        </p>
      )}
    </div>
  );
}

function StatusCell({ row }: { row: ImportPreviewRow }) {
  if (row.valid && !row.errors.length) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 h-5 px-2 text-xs">
          VALID
        </Badge>
      </div>
    );
  }

  if (row.errors.length > 0) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="h-5 px-2 text-xs">
          ERROR ({row.errors.length})
        </Badge>
      </div>
    );
  }

  return (
    <Badge variant="secondary" className="h-5 px-2 text-xs">
      REVIEW
    </Badge>
  );
}