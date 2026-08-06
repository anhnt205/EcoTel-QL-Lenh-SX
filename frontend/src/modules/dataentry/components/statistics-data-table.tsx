import React from 'react';
import type { StatisticRow } from '@/modules/dataentry/types/statistic.types';
import AppDataTable from '@/components/table/AppDataTable';
import { getStatisticsColumns } from './statistics-columns';

interface StatisticsDataTableProps {
  rows: StatisticRow[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  vehicleSource: string;
}

export function StatisticsDataTable({
  rows,
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  selectedIds,
  onSelectionChange,
}: StatisticsDataTableProps) {
  const columns = React.useMemo(
    () =>
      getStatisticsColumns({
        onEdit,
        selectedIds,
        onSelectionChange,
        rows,
      }),
    [onEdit, selectedIds, onSelectionChange, rows]
  );

  return (
    <AppDataTable
      data={rows}
      columns={columns}
      manualPagination={true}
      pageCount={totalPages || Math.ceil(totalItems / 20) || 1}
      totalCount={totalItems}
      page={currentPage - 1}
      rowsPerPage={20}
      onPageChange={(zeroBasedPage) => onPageChange(zeroBasedPage + 1)}
      showToolbar={false}
      bordered
      striped
      hoverable
    />
  );
}


