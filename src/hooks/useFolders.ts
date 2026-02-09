import { useState, useCallback, useEffect } from 'react';
import { Folder, ProjectTable } from '../types';
import { INITIAL_COLUMNS, INITIAL_ROWS } from '../constants';

const STORAGE_KEY = 'rafoz_data';

/**
 * Hook for managing folders and their tables
 */
export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFolders(JSON.parse(stored));
      } catch {
        console.error('Failed to load folders from localStorage');
      }
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((newFolders: Folder[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFolders));
    } catch {
      console.error('Failed to save folders to localStorage');
    }
  }, []);

  // Create folder
  const createFolder = useCallback((name: string) => {
    const newFolder: Folder = {
      id: `folder_${Date.now()}`,
      name,
      tables: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [...folders, newFolder];
    setFolders(updated);
    saveToStorage(updated);
    return newFolder;
  }, [folders, saveToStorage]);

  // Delete folder
  const deleteFolder = useCallback((folderId: string) => {
    const updated = folders.filter(f => f.id !== folderId);
    setFolders(updated);
    saveToStorage(updated);
  }, [folders, saveToStorage]);

  // Update folder
  const updateFolder = useCallback((folderId: string, updates: Partial<Folder>) => {
    const updated = folders.map(f =>
      f.id === folderId
        ? { ...f, ...updates, updatedAt: Date.now() }
        : f
    );
    setFolders(updated);
    saveToStorage(updated);
  }, [folders, saveToStorage]);

  // Create table in folder
  const createTableInFolder = useCallback((folderId: string, name: string, type: 'classic' | 'pairwise') => {
    const updated = folders.map(f => {
      if (f.id === folderId) {
        const newTable: ProjectTable = {
          id: `table_${Date.now()}`,
          name,
          type,
          columns: [...INITIAL_COLUMNS],
          rows: [...INITIAL_ROWS],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return { ...f, tables: [...f.tables, newTable], updatedAt: Date.now() };
      }
      return f;
    });
    setFolders(updated);
    saveToStorage(updated);
  }, [folders, saveToStorage]);

  // Delete table from folder
  const deleteTableFromFolder = useCallback((folderId: string, tableId: string) => {
    const updated = folders.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          tables: f.tables.filter(t => t.id !== tableId),
          updatedAt: Date.now()
        };
      }
      return f;
    });
    setFolders(updated);
    saveToStorage(updated);
  }, [folders, saveToStorage]);

  // Update table in folder
  const updateTableInFolder = useCallback((folderId: string, tableId: string, updates: Partial<ProjectTable>) => {
    const updated = folders.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          tables: f.tables.map(t =>
            t.id === tableId
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          ),
          updatedAt: Date.now()
        };
      }
      return f;
    });
    setFolders(updated);
    saveToStorage(updated);
  }, [folders, saveToStorage]);

  return {
    folders,
    setFolders,
    createFolder,
    deleteFolder,
    updateFolder,
    createTableInFolder,
    deleteTableFromFolder,
    updateTableInFolder
  };
};
