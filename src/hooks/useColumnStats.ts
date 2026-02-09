import { useMemo } from 'react';
import { ProjectTable } from '../types';

interface ColumnStats {
  counts: Record<string, number>;
  emptyCount: number;
}

/**
 * Hook for calculating statistics about column values
 */
export const useColumnStats = (activeTable: ProjectTable | null) => {
  return useMemo(() => {
    if (!activeTable) return {};

    const stats: Record<string, ColumnStats> = {};

    activeTable.columns.forEach(col => {
      stats[col.id] = { counts: {}, emptyCount: 0 };
      activeTable.rows.forEach(row => {
        const val = row.values[col.id] || '';
        if (!val) {
          stats[col.id].emptyCount++;
        } else {
          stats[col.id].counts[val] = (stats[col.id].counts[val] || 0) + 1;
        }
      });
    });

    return stats;
  }, [activeTable]);
};
