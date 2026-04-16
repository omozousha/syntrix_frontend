"use client";

type CellValue = string | number | React.ReactNode;

export function SimpleTable({ headers, rows }: { headers: string[]; rows: CellValue[][] }) {
  return (
    <div className="overflow-auto rounded border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-slate-100">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-4 text-slate-500" colSpan={headers.length}>
                No data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
