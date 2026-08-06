import React, { useMemo } from "react";

import { Table, TableBody, TableCell, TableRow, TableHeader } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export interface TableLoadingProps {
  rows?: number;
  columns?: number;
  rowHeight?: number;
  showHeader?: boolean;
}

const TableLoading: React.FC<TableLoadingProps> = ({
  rows = 5,
  columns = 5,
  rowHeight = 48,
  showHeader = true,
}) => {
  // Fix: pre-generate widths 1 lần, tránh layout shift mỗi re-render
  const cellWidths = useMemo(
    () =>
      Array.from({ length: rows * columns }, () =>
        Math.floor(50 + Math.random() * 40),
      ),
    [rows, columns],
  );

  return (
    <div className="w-full overflow-hidden">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`header-${colIndex}`} className="py-3">
                  <Skeleton
                    className={colIndex === 0 ? "w-[30%] h-5" : "w-[60%] h-5"}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow
              key={`row-${rowIndex}`}
              className="hover:bg-transparent border-b last:border-0"
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="py-2.5"
                  style={{ height: rowHeight }}
                >
                  <Skeleton
                    className="h-4"
                    style={{
                      width: `${cellWidths[rowIndex * columns + colIndex]}%`,
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TableLoading;
