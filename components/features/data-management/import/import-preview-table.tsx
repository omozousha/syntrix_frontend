"use client";

import * as React from "react";
import { NdLabel, NdValue } from "@/components/ui/nothing";
import { CheckCircle2, AlertCircle, CircleDot } from "lucide-react";

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
 * Nothing Design treatment:
 * - Header: small Space Mono ALL CAPS labels
 * - Row: monospace numeric / value
 * - Status column exposes value color (success/warning/accent/disabled) — never decorative
 *   badge
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
        <NdLabel color="secondary">
          PRATINJAU {rows.length ? `(${rows.length} baris)` : ""}
        </NdLabel>
        {overflow > 0 ? (
          <span
            style={{
              fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "var(--nd-text-disabled)",
              textTransform: "uppercase",
            }}
          >
            +{overflow} BARIS TERSEMBUNYI (HANYA 50 PERTAMA)
          </span>
        ) : null}
      </header>

      <div
        className="overflow-x-auto rounded-md border"
        style={{ borderColor: "var(--nd-border-visible)" }}
      >
        <table
          className="w-full"
          style={{
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--nd-surface-raised)",
                borderBottom: "1px solid var(--nd-border-visible)",
              }}
            >
              <th
                className="px-3 py-2 text-left"
                style={{
                  fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--nd-text-secondary)",
                  fontWeight: 400,
                  width: 60,
                }}
              >
                BARIS
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left"
                  style={{
                    fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--nd-text-secondary)",
                    fontWeight: 400,
                  }}
                >
                  {col}
                </th>
              ))}
              <th
                className="px-3 py-2 text-left"
                style={{
                  fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--nd-text-secondary)",
                  fontWeight: 400,
                  width: 120,
                }}
              >
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.rowIndex}
                style={{
                  borderBottom: "1px solid var(--nd-border)",
                  background:
                    row.valid && !row.errors.length
                      ? "transparent"
                      : "rgba(215, 25, 33, 0.05)",
                }}
              >
                <td
                  className="px-3 py-2"
                  style={{
                    color: "var(--nd-text-disabled)",
                    fontVariantNumeric: "tabular-nums",
                    textAlign: "right",
                  }}
                >
                  {row.rowIndex}
                </td>
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2"
                    style={{
                      color: "var(--nd-text-primary)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={row.data?.[col] ?? ""}
                  >
                    {row.data?.[col] ?? <NdValue color="disabled">—</NdValue>}
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
                  style={{
                    color: "var(--nd-text-disabled)",
                    fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  [KOSONG · TIDAK ADA BARIS]
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({ row }: { row: ImportPreviewRow }) {
  if (row.valid && !row.errors.length) {
    return (
      <div className="flex items-center gap-2">
        <CheckCircle2 size={12} style={{ color: "var(--nd-success)" }} />
        <span
          style={{
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--nd-success)",
          }}
        >
          VALID
        </span>
      </div>
    );
  }

  if (row.errors.length > 0) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle size={12} style={{ color: "var(--nd-accent)" }} />
        <span
          style={{
            fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--nd-accent)",
          }}
          title={row.errors.join(" · ")}
        >
          ERROR ({row.errors.length})
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <CircleDot size={12} style={{ color: "var(--nd-text-disabled)" }} />
      <span
        style={{
          fontFamily: "var(--font-nd-mono), 'Space Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--nd-text-disabled)",
        }}
      >
        REVIEW
      </span>
    </div>
  );
}
