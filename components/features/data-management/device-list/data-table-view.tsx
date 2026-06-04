"use client";

import type { ReactNode } from "react";
import { SimpleTable } from "@/components/simple-table";
import { TooltipProvider } from "@/components/ui/tooltip";

type CellValue = string | number | ReactNode;

export function DataTableView({
  headers,
  rows,
  tableLabel,
  selectedRowIndices,
  hiddenOnMobile,
  onRowClick,
  onRowDoubleClick,
  rowContextMenu,
}: {
  headers: ReactNode[];
  rows: CellValue[][];
  tableLabel: string;
  selectedRowIndices?: Set<number>;
  hiddenOnMobile: boolean;
  onRowClick: (rowIndex: number) => void;
  onRowDoubleClick: (rowIndex: number) => void;
  rowContextMenu: (rowIndex: number) => ReactNode;
}) {
  return (
    <div className={hiddenOnMobile ? "hidden md:block" : ""}>
      <TooltipProvider>
        <SimpleTable
          headers={headers}
          rows={rows}
          tableLabel={tableLabel}
          enableColumnVisibility
          enableSorting
          disableSortColumns={[0]}
          selectedRowIndices={selectedRowIndices}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          rowContextMenu={rowContextMenu}
        />
      </TooltipProvider>
    </div>
  );
}
