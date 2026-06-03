"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CellValue = string | number | ReactNode;

type TableRowData = {
  __originalIndex: number;
  __cells: CellValue[];
};

type SortState = {
  columnId: string;
  desc: boolean;
} | null;

export function SimpleTable({
  headers,
  rows,
  rowContextMenu,
  selectedRowIndices,
  onRowClick,
  onRowDoubleClick,
  enableSorting = true,
  disableSortColumns = [],
  enableColumnVisibility = false,
  tableLabel = "Table",
  columnVisibilityLabel = "Columns",
  columnVisibilityLabels,
}: {
  headers: ReactNode[];
  rows: CellValue[][];
  rowContextMenu?: (rowIndex: number) => ReactNode;
  selectedRowIndices?: Set<number>;
  onRowClick?: (rowIndex: number) => void;
  onRowDoubleClick?: (rowIndex: number) => void;
  enableSorting?: boolean;
  disableSortColumns?: number[];
  enableColumnVisibility?: boolean;
  tableLabel?: string;
  columnVisibilityLabel?: string;
  columnVisibilityLabels?: string[];
}) {
  const [sorting, setSorting] = useState<SortState>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const data = useMemo<TableRowData[]>(
    () =>
      rows.map((row, index) => ({
        __originalIndex: index,
        __cells: row,
      })),
    [rows],
  );

  const visibleColumnIndices = useMemo(
    () => headers.map((_, index) => index).filter((index) => columnVisibility[`col_${index}`] !== false),
    [headers, columnVisibility],
  );

  const sortedData = useMemo(() => {
    if (!sorting) return data;

    const columnIndex = Number(sorting.columnId.replace(/^col_/, ""));
    if (!Number.isInteger(columnIndex)) return data;

    return [...data].sort((a, b) => {
      const left = getComparableValue(a.__cells[columnIndex]);
      const right = getComparableValue(b.__cells[columnIndex]);
      if (left < right) return sorting.desc ? 1 : -1;
      if (left > right) return sorting.desc ? -1 : 1;
      return 0;
    });
  }, [data, sorting]);

  function toggleSort(columnIndex: number) {
    const columnId = `col_${columnIndex}`;
    setSorting((current) => {
      if (!current || current.columnId !== columnId) return { columnId, desc: false };
      if (!current.desc) return { columnId, desc: true };
      return null;
    });
  }

  return (
    <div className="space-y-3">
      {enableColumnVisibility ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-4" />
                {columnVisibilityLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{tableLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {headers.map((header, index) => {
                const columnId = `col_${index}`;
                return (
                  <DropdownMenuCheckboxItem
                    key={columnId}
                    checked={columnVisibility[columnId] !== false}
                    onCheckedChange={(value) =>
                      setColumnVisibility((current) => ({
                        ...current,
                        [columnId]: !!value,
                      }))
                    }
                  >
                    {getHeaderLabel(header, columnId, columnVisibilityLabels)}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <TableRow>
              {visibleColumnIndices.map((columnIndex) => {
                const columnId = `col_${columnIndex}`;
                const canSort = enableSorting && !disableSortColumns.includes(columnIndex);
                const sorted = sorting?.columnId === columnId ? (sorting.desc ? "desc" : "asc") : false;
                  return (
                    <TableHead key={columnId} className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 ${canSort ? "hover:text-foreground" : "cursor-default"}`}
                        onClick={canSort ? () => toggleSort(columnIndex) : undefined}
                      >
                        <span className="whitespace-nowrap">{headers[columnIndex]}</span>
                        {canSort ? (
                          sorted === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-60" />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                  );
                })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length ? (
              sortedData.map((row) => {
                const originalIndex = row.__originalIndex;
                const rowCells = visibleColumnIndices.map((columnIndex) => (
                  <TableCell key={`row-${originalIndex}-col-${columnIndex}`} className="max-w-[320px] px-4 py-2 align-middle">
                    {row.__cells[columnIndex] ?? null}
                  </TableCell>
                ));

                if (rowContextMenu) {
                  return (
                    <ContextMenu key={originalIndex}>
                      <ContextMenuTrigger asChild>
                        <TableRow
                          data-state={selectedRowIndices?.has(originalIndex) ? "selected" : undefined}
                          className="cursor-context-menu transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                          onClick={() => onRowClick?.(originalIndex)}
                          onDoubleClick={() => onRowDoubleClick?.(originalIndex)}
                        >
                          {rowCells}
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>{rowContextMenu(originalIndex)}</ContextMenuContent>
                    </ContextMenu>
                  );
                }

                return (
                  <TableRow
                    key={originalIndex}
                    data-state={selectedRowIndices?.has(originalIndex) ? "selected" : undefined}
                    className="transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                    onClick={() => onRowClick?.(originalIndex)}
                    onDoubleClick={() => onRowDoubleClick?.(originalIndex)}
                  >
                    {rowCells}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell className="px-4 py-8 text-center text-muted-foreground" colSpan={Math.max(visibleColumnIndices.length, 1)}>
                  No data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function getComparableValue(cell: CellValue | undefined) {
  if (typeof cell === "number") return cell;
  if (typeof cell === "string") return cell.toLowerCase();
  if (cell == null) return "";
  return extractText(cell).toLowerCase();
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const element = node as { props?: { children?: ReactNode } };
    return extractText(element.props?.children);
  }
  return "";
}

function getHeaderLabel(header: unknown, fallbackId: string, columnVisibilityLabels?: string[]) {
  const columnIndex = Number(fallbackId.replace(/^col_/, ""));
  if (Number.isInteger(columnIndex) && columnVisibilityLabels?.[columnIndex]) return columnVisibilityLabels[columnIndex];
  if (typeof header === "string" && header.trim()) return header;
  if (typeof header === "number") return String(header);
  const fromNode = extractText(header as ReactNode).trim();
  if (fromNode) return fromNode;
  return fallbackId.replace(/^col_/, "Column ");
}
