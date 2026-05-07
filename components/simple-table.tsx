"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  const data = useMemo<TableRowData[]>(
    () =>
      rows.map((row, index) => ({
        __originalIndex: index,
        __cells: row,
      })),
    [rows],
  );

  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () =>
      headers.map((header, index) => ({
        id: `col_${index}`,
        header: () => header,
        accessorFn: (row) => row.__cells[index],
        enableSorting: enableSorting && !disableSortColumns.includes(index),
        sortingFn: (a, b, columnId) => {
          const left = getComparableValue(a.getValue(columnId) as CellValue);
          const right = getComparableValue(b.getValue(columnId) as CellValue);
          if (left < right) return -1;
          if (left > right) return 1;
          return 0;
        },
        cell: ({ row }) => row.original.__cells[index] ?? null,
      })),
    [headers, enableSorting, disableSortColumns],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-3">
      {enableColumnVisibility ? (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{tableLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {getHeaderLabel(column.columnDef.header, column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className="w-full overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id} className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 ${
                            header.column.getCanSort() ? "hover:text-foreground" : "cursor-default"
                          }`}
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        >
                          <span className="whitespace-nowrap">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {header.column.getCanSort() ? (
                            sorted === "asc" ? (
                              <ChevronUp className="size-3.5" />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronsUpDown className="size-3.5 opacity-60" />
                            )
                          ) : null}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const originalIndex = row.original.__originalIndex;
                const rowCells = row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="max-w-[320px] px-4 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ));

                if (rowContextMenu) {
                  return (
                    <ContextMenu key={row.id}>
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
                    key={row.id}
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
                <TableCell className="px-4 py-8 text-center text-muted-foreground" colSpan={headers.length}>
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

function getHeaderLabel(header: unknown, fallbackId: string) {
  if (typeof header === "string" && header.trim()) return header;
  if (typeof header === "number") return String(header);
  const fromNode = extractText(header as ReactNode).trim();
  if (fromNode) return fromNode;
  return fallbackId.replace(/^col_/, "Column ");
}
