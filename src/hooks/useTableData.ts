import { useState, useCallback, useEffect } from 'react';
import { ProjectTable, DynamicRow, Column } from '../types';

const STORAGE_KEY = 'rafoz_tables';

/**
 * Hook for managing table data and CRUD operations
 */
export const useTableData = (folderId: string) => {
  const [tables, setTables] = useState<ProjectTable[]>([]);
  
  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setTables(data[folderId] || []);
      } catch {
        console.error('Failed to load tables from localStorage');
      }
    }
  }, [folderId]);

  // Save to localStorage
  const saveToStorage = useCallback((newTables: ProjectTable[]) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allData = stored ? JSON.parse(stored) : {};
      allData[folderId] = newTables;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch {
      console.error('Failed to save tables to localStorage');
    }
  }, [folderId]);

  // Create table
  const createTable = useCallback((name: string, type: 'classic' | 'pairwise') => {
    const newTable: ProjectTable = {
      id: `table_${Date.now()}`,
      name,
      type,
      columns: [],
      rows: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [...tables, newTable];
    setTables(updated);
    saveToStorage(updated);
    return newTable;
  }, [tables, saveToStorage]);

  // Delete table
  const deleteTable = useCallback((tableId: string) => {
    const updated = tables.filter(t => t.id !== tableId);
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  // Update table
  const updateTable = useCallback((tableId: string, updates: Partial<ProjectTable>) => {
    const updated = tables.map(t => 
      t.id === tableId 
        ? { ...t, ...updates, updatedAt: Date.now() } 
        : t
    );
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  // Add column
  const addColumn = useCallback((tableId: string, label: string) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: [...t.columns, { id: `col_${Date.now()}`, label }],
          updatedAt: Date.now()
        };
      }
      return t;
    });
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  // Delete column
  const deleteColumn = useCallback((tableId: string, columnId: string) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.filter(c => c.id !== columnId),
          rows: t.rows.map(r => {
            const { [columnId]: _, ...rest } = r.values;
            return { ...r, values: rest };
          }),
          updatedAt: Date.now()
        };
      }
      return t;
    });
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  // Add row
  const addRow = useCallback((tableId: string, values: Record<string, string>) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          rows: [...t.rows, { id: `row_${Date.now()}`, values, updatedAt: Date.now() }],
          updatedAt: Date.now()
        };
      }
      return t;
    });
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  // Update row
  const updateRow = useCallback((tableId: string, rowId: string, values: Record<string, string>) => {
    const updated = tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          rows: t.rows.map(r => 
            r.id === rowId 
              ? { ...r, values, updatedAt: Date.now() } 
              : r
          ),
          updatedAt: Date.now()
        };
      }
      return t;
    });
    setTables(updated);
    saveToStorage(updated);
  }, [tables, saveToStorage]);

  return {
    tables,
    setTables,
    createTable,
    deleteTable,
    updateTable,
    addColumn,
    deleteColumn,
    addRow,
    updateRow
  };
};
