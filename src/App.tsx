import React, { useState, useMemo, useEffect, useCallback, useDeferredValue, useRef } from 'react';
import { Column, DynamicRow, ActiveFilter, ProjectTable, Folder, TableType } from './types';
import { 
  INITIAL_COLUMNS,
  FOLDERS_PER_PAGE,
  TABLES_PER_PAGE,
  ROWS_PER_PAGE,
  SEGMENT_CHAR_LIMIT,
  COMMENT_LIMIT,
  DESCRIPTION_LIMIT,
  NAME_LIMIT,
  TABLE_CELL_LIMIT
} from './constants';
import { Badge } from './components/Badge';
import { formatDate, truncate, sanitizeFilename, normalizeLabel } from './utils/formatting';
import { validateSegments } from './utils/validation';
import { parseCSV, stringifyCSV } from './utils/csv';

const renderCellValue = (col: Column, value: string, isIdColumn?: boolean) => {
  const val = value || '';
  return (
    <span className={`text-sm font-bold text-center w-full block ${isIdColumn ? 'text-black/50' : 'text-black'} ${val ? '' : 'opacity-10'}`}>
      {truncate(val, TABLE_CELL_LIMIT)}
    </span>
  );
};

const renderDetailValue = (col: Column, value: string) => {
  const val = value || '';
  return <p className="text-sm font-bold text-black break-words">{val || <span className="opacity-20 italic">No data</span>}</p>;
};

// --- UI COMPONENTS ---

const CustomCheckbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) => (
  <label className="flex items-center gap-3 cursor-pointer group">
    <div className="relative flex items-center justify-center">
      <input 
        type="checkbox" 
        className="peer w-5 h-5 appearance-none border-2 border-black/10 rounded-lg bg-white checked:bg-black checked:border-black transition-all"
        checked={checked}
        onChange={onChange}
      />
      <svg className="absolute w-3 h-3 text-white pointer-events-none hidden peer-checked:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </div>
    {label && <span className="text-xs font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">{label}</span>}
  </label>
);

const PaginationControls = ({ 
  current, 
  total, 
  onPageChange,
  label
}: { 
  current: number; 
  total: number; 
  onPageChange: (p: number) => void;
  label?: string;
}) => {
  if (total <= 1) return null;
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pages = useMemo(() => Array.from({ length: total }, (_, i) => i + 1), [total]);
  return (
    <div className="flex items-center justify-center mt-10 pt-8 border-t border-gray-100 w-full">
      <div className="flex items-center gap-3">
        <button 
          disabled={current === total} 
          onClick={() => onPageChange(total)} 
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-gray-50 transition-colors"
        >
          Last
        </button>
        <div 
          className="relative"
          tabIndex={0}
          onBlur={() => setIsPickerOpen(false)}
        >
          <button
            onClick={() => setIsPickerOpen(v => !v)}
            className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors min-w-[120px]"
            aria-label={`${label || 'Page'} picker`}
          >
            {current} / {total}
          </button>
          {isPickerOpen && (
            <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              {pages.map(p => (
                <button
                  key={p}
                  onClick={() => { onPageChange(p); setIsPickerOpen(false); }}
                  className={`w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center transition-colors ${p === current ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
        <button 
          disabled={current === total} 
          onClick={() => onPageChange(current + 1)} 
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-gray-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const TableRow = React.memo(({ 
  row, 
  columns,
  autoIdColumnId,
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete,
  onViewRow
}: { 
  row: DynamicRow; 
  columns: Column[]; 
  autoIdColumnId?: string;
  isSelected: boolean; 
  onToggleSelect: (id: string) => void;
  onEdit: (row: DynamicRow) => void;
  onDelete: (id: string) => void;
  onViewRow: (row: DynamicRow) => void;
}) => {
  const hasComment = !!row.comment;
  
  return (
    <tr 
      onClick={() => onViewRow(row)}
      className={`group transition-all duration-75 cursor-pointer ${isSelected ? 'bg-black/[0.04]' : hasComment ? 'bg-[#fdf6e3] hover:bg-[#f9f0d4]' : 'hover:bg-gray-50'}`}
    >
      <td onClick={(e) => e.stopPropagation()} className="px-6 py-3 text-center sticky left-0 z-[2] border-r border-gray-100 bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] min-w-[80px] w-[80px]">
        <div className="flex justify-center items-center">
          <input 
            type="checkbox" 
            className="w-4 h-4 accent-black cursor-pointer"
            checked={isSelected} 
            onChange={() => onToggleSelect(row.id)} 
          />
        </div>
      </td>
      {columns.map((col, idx) => {
        const isIdColumn = autoIdColumnId === col.id;
        if (isIdColumn) {
          return (
            <td
              key={col.id}
              className="min-w-[56px] w-[56px] sticky left-16 z-[1] bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] px-0 py-3 border-r border-gray-100/50"
            >
              <span className="block w-full text-center text-sm font-bold text-black/50">
                {truncate(row.values[col.id] || '', TABLE_CELL_LIMIT)}
              </span>
            </td>
          );
        }
        return (
          <td key={col.id} className="px-6 py-3 whitespace-nowrap border-r border-gray-100/50 min-w-[180px] text-center">
            <div className="flex items-center justify-center gap-2">
              {renderCellValue(col, row.values[col.id] || '')}
              {idx === 0 && hasComment && (
                <div title="Has comment" className="text-amber-500 flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" /></svg>
                </div>
              )}
            </div>
          </td>
        );
      })}
      <td className={`px-6 py-3 whitespace-nowrap border-r border-gray-100/50 text-center relative ${isSelected ? 'bg-black/[0.04]' : hasComment ? 'bg-[#fdf6e3]' : 'bg-white group-hover:bg-gray-50'}`}>
        <span className="text-[10px] font-black uppercase text-black/40">
          {formatDate(row.updatedAt)}
        </span>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(row); }} className="p-1.5 text-black hover:bg-gray-200 rounded-md transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(row.id); }} className="p-1.5 text-black hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </div>
      </td>
    </tr>
  );
});

const App: React.FC = () => {
  // --- STATE ---
  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const saved = localStorage.getItem('rafoz_data');
      if (saved) return JSON.parse(saved);
      return [];
    } catch { return []; }
  });

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  
  const [foldersPage, setFoldersPage] = useState(1);
  const [tablesPage, setTablesPage] = useState(1);
  const [rowsPage, setRowsPage] = useState(1);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingTableId, setRenamingTableId] = useState<string | null>(null);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [showImportFormatModal, setShowImportFormatModal] = useState(false);
  const [showExportFormatModal, setShowExportFormatModal] = useState(false);
  const [jsonExportData, setJsonExportData] = useState<string>('');
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');
  
  const [modalInput, setModalInput] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalTableType, setModalTableType] = useState<TableType>('classic');
  const [modalInputError, setModalInputError] = useState(false);
  const [isAutoIdEnabled, setIsAutoIdEnabled] = useState(false);

  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [renamingColId, setRenamingColId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<DynamicRow | null>(null);
  const [viewingRow, setViewingRow] = useState<DynamicRow | null>(null);
  const [rowCommentInput, setRowCommentInput] = useState('');
  
  const [isMassUpdating, setIsMassUpdating] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rafoz_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Column filtering state
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({});

  const [newRowValues, setNewRowValues] = useState<Record<string, string>>({});
  const [editRowValues, setEditRowValues] = useState<Record<string, string>>({});
  const [massUpdateFields, setMassUpdateFields] = useState<Record<string, { enabled: boolean; value: string }>>({});
  const [newColLabel, setNewColLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputJsonRef = useRef<HTMLInputElement>(null);

  // Persist sidebar collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('rafoz_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {}
  }, [isSidebarCollapsed]);

  // --- PERSISTENCE & NAV ---
  useEffect(() => { localStorage.setItem('rafoz_data', JSON.stringify(folders)); }, [folders]);
  useEffect(() => { setTablesPage(1); setActiveTableId(null); }, [activeFolderId]);
  useEffect(() => { setRowsPage(1); setSelectedRowIds([]); setActiveFilters([]); setSearchInput(''); }, [activeTableId]);

  // --- DERIVED STATE ---
  const activeFolder = useMemo(() => folders.find(f => f.id === activeFolderId), [folders, activeFolderId]);
  const activeTable = useMemo(() => activeFolder?.tables.find(t => t.id === activeTableId), [activeFolder, activeTableId]);

  const paginatedFolders = useMemo(() => folders.slice((foldersPage-1)*FOLDERS_PER_PAGE, foldersPage*FOLDERS_PER_PAGE), [folders, foldersPage]);
  const totalFoldersPages = Math.ceil(folders.length / FOLDERS_PER_PAGE);

  const paginatedTables = useMemo(() => (activeFolder?.tables || []).slice((tablesPage-1)*TABLES_PER_PAGE, TABLES_PER_PAGE * tablesPage), [activeFolder, tablesPage]);
  const totalTablesPages = activeFolder ? Math.ceil(activeFolder.tables.length / TABLES_PER_PAGE) : 0;

  const filteredRows = useMemo(() => {
    if (!activeTable) return [];
    const searchLower = deferredSearch.toLowerCase();
    return activeTable.rows.filter(row => {
      const matchesSearch = !deferredSearch || Object.values(row.values).some(v => String(v).toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
      return activeFilters.every(f => {
        const rowValue = row.values[f.columnId] || '';
        return f.mode === 'exclude' ? rowValue !== f.value : rowValue === f.value;
      });
    });
  }, [activeTable, deferredSearch, activeFilters]);

  const paginatedRows = useMemo(() => filteredRows.slice((rowsPage-1)*ROWS_PER_PAGE, rowsPage*ROWS_PER_PAGE), [filteredRows, rowsPage]);
  const totalRowsPages = Math.ceil(filteredRows.length / ROWS_PER_PAGE);

  const isNewRowDataValid = useMemo(() => {
    return Object.values(newRowValues).every(val => validateSegments(val).isValid);
  }, [newRowValues]);

  // Calculate unique values for each column from ALL table rows
  const columnValueStats = useMemo(() => {
    if (!activeTable) return {};
    const stats: Record<string, { counts: Record<string, number>, emptyCount: number }> = {};
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

  // Intelligent filter list based on sidebar search
  const visibleSidebarColumns = useMemo(() => {
    if (!activeTable) return [];
    if (!sidebarSearch.trim()) return activeTable.columns;

    const query = sidebarSearch.toLowerCase();
    return activeTable.columns.filter(col => {
      // Check column name
      if (col.label.toLowerCase().includes(query)) return true;
      // Check values inside column
      const values = Object.keys(columnValueStats[col.id]?.counts || {});
      return values.some(v => v.toLowerCase().includes(query));
    });
  }, [activeTable, sidebarSearch, columnValueStats]);

  // Auto-expand columns that match the search term in their values
  useEffect(() => {
    if (!sidebarSearch.trim() || !activeTable) return;
    const query = sidebarSearch.toLowerCase();
    const newExpanded: Record<string, boolean> = { ...expandedCols };
    
    activeTable.columns.forEach(col => {
      const values = Object.keys(columnValueStats[col.id]?.counts || {});
      const hasMatchInValues = values.some(v => v.toLowerCase().includes(query));
      if (hasMatchInValues) {
        newExpanded[col.id] = true;
      }
    });
    setExpandedCols(newExpanded);
  }, [sidebarSearch, activeTable, columnValueStats]);

  // --- ACTIONS ---
  const createFolder = () => {
    if (!modalInput.trim()) return;
    const now = Date.now();
    setFolders(prev => [{ id: `folder_${now}`, name: modalInput, description: modalDesc, tables: [], createdAt: now, updatedAt: now }, ...prev]);
    setIsCreatingFolder(false); setModalInput(''); setModalDesc(''); setFoldersPage(1);
  };

  const createTableInFolder = () => {
    if (!modalInput.trim() || !activeFolderId) return;
    const now = Date.now();
    const idColumn = isAutoIdEnabled ? { id: `col_${now}_id`, label: 'ID' } : null;
    const columns = idColumn ? [...INITIAL_COLUMNS, idColumn] : [...INITIAL_COLUMNS];
    const newTable: ProjectTable = {
      id: `table_${now}`,
      name: modalInput,
      type: modalTableType,
      columns,
      rows: [],
      autoIdEnabled: isAutoIdEnabled,
      autoIdColumnId: idColumn?.id,
      createdAt: now,
      updatedAt: now
    };
    setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, tables: [newTable, ...f.tables], updatedAt: now } : f));
    setIsCreatingTable(false); setModalInput(''); setIsAutoIdEnabled(false); setActiveTableId(newTable.id);
  };

  const updateActiveTable = useCallback((updater: (table: ProjectTable) => ProjectTable) => {
    setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, tables: f.tables.map(t => t.id === activeTableId ? { ...updater(t), updatedAt: Date.now() } : t), updatedAt: Date.now() } : f));
  }, [activeFolderId, activeTableId]);

  const handleDeleteColumn = (colId: string) => {
    if (activeTable?.autoIdColumnId === colId) return;
    updateActiveTable(t => ({
      ...t,
      autoIdEnabled: t.autoIdColumnId === colId ? false : t.autoIdEnabled,
      autoIdColumnId: t.autoIdColumnId === colId ? undefined : t.autoIdColumnId,
      columns: t.columns.filter(c => c.id !== colId),
      rows: t.rows.map(r => {
        const nv = { ...r.values };
        delete nv[colId];
        return { ...r, values: nv };
      })
    }));
  };

  const handleSelectEmpty = (colId: string) => {
    if (!activeTable) return;
    const emptyRowIds = activeTable.rows
      .filter(r => !r.values[colId] || !r.values[colId].trim())
      .map(r => r.id);
    
    setSelectedRowIds(prev => {
      const newIds = new Set([...prev, ...emptyRowIds]);
      return Array.from(newIds);
    });
  };

  const handleAddRow = () => {
    if (!activeTable || !isNewRowDataValid) return;
    const idColumnId = activeTable.autoIdEnabled ? activeTable.autoIdColumnId : undefined;
    const hasIdColumn = !!idColumnId && activeTable.columns.some(c => c.id === idColumnId);
    const nextIdStart = (() => {
      if (!hasIdColumn || !idColumnId) return 1;
      const maxId = activeTable.rows.reduce((max, row) => {
        const raw = row.values[idColumnId] ?? '';
        const num = Number.parseInt(String(raw), 10);
        if (Number.isNaN(num)) return max;
        return num > max ? num : max;
      }, 0);
      return maxId + 1;
    })();
    
    if (activeTable.type === 'classic') {
      const colValuesMap: Record<string, string[]> = {};
      let maxRows = 0;
      
      activeTable.columns.forEach(col => {
        const val = newRowValues[col.id] || '';
        const parts = val.split('/').map(p => p.trim());
        colValuesMap[col.id] = parts;
        if (parts.length > maxRows) maxRows = parts.length;
      });

      const now = Date.now();
      const newRows: DynamicRow[] = [];
      
      for (let i = 0; i < maxRows; i++) {
        const rowValues: Record<string, string> = {};
        const rowId = `row_${now}_${i}`;
        activeTable.columns.forEach(col => {
          rowValues[col.id] = colValuesMap[col.id][i] || '';
        });
        if (hasIdColumn && idColumnId) {
          rowValues[idColumnId] = String(nextIdStart + i);
        }
        newRows.push({
          id: rowId,
          values: rowValues,
          updatedAt: now
        });
      }

      updateActiveTable(t => ({ ...t, rows: [...newRows, ...t.rows] }));
      setNewRowValues({}); setIsAddingRow(false); setRowsPage(1);
    } else {
      setIsProcessing(true);
      setTimeout(() => {
        const options: Record<string, string[]> = {};
        activeTable.columns.forEach(col => {
          const val = newRowValues[col.id] || '';
          const parts = val.split('/').map(s => s.trim()).filter(Boolean);
          options[col.id] = parts.length > 0 ? parts : [''];
        });
        const combinations: Record<string, string>[] = [];
        const keys = Object.keys(options);
        const generate = (idx: number, current: Record<string, string>) => {
          if (combinations.length >= 2000) return;
          if (idx === keys.length) { combinations.push({ ...current }); return; }
          options[keys[idx]].forEach(val => { current[keys[idx]] = val; generate(idx + 1, current); });
        };
        generate(0, {});
        const now = Date.now();
        const newRows: DynamicRow[] = combinations.map((combo, i) => {
          const rowId = `row_${now}_${i}`;
          const values = { ...combo } as Record<string, string>;
          if (hasIdColumn && idColumnId) {
            values[idColumnId] = String(nextIdStart + i);
          }
          return { id: rowId, values, updatedAt: now };
        });
        updateActiveTable(t => ({ ...t, rows: [...newRows, ...t.rows] }));
        setNewRowValues({}); setIsAddingRow(false); setIsProcessing(false); setRowsPage(1);
      }, 50);
    }
  };

  const addTeamFields = () => {
    if (!activeTable) return;
    const missing: string[] = [];
    if (missing.length === 0) return;
    const now = Date.now();
    const newCols = missing.map((label, i) => ({ id: `col_${now}_${i}`, label }));
    updateActiveTable(t => ({
      ...t,
      columns: [...t.columns, ...newCols],
      rows: t.rows.map(r => {
        const values = { ...r.values };
        newCols.forEach(c => { values[c.id] = values[c.id] ?? ''; });
        return { ...r, values };
      })
    }));
  };

  const handleExportCSV = () => {
    if (!activeTable) return;
    setModalInput(activeTable.name || 'table');
    setModalInputError(false);
    setIsExportingCSV(true);
  };

  const confirmExportCSV = () => {
    if (!activeTable || !modalInput.trim()) return;
    const header = activeTable.columns.map(c => c.label);
    const rows = activeTable.rows.map(row => (
      activeTable.columns.map(col => {
        return row.values[col.id] || '';
      })
    ));
    const csv = stringifyCSV([header, ...rows]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = sanitizeFilename(modalInput) || 'table';
    a.download = `${safeFilename}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setIsExportingCSV(false);
    setModalInput('');
  };

  const confirmExportJSON = () => {
    if (!activeTable) {
      alert('No table selected');
      return;
    }
    const data = {
      name: activeTable.name,
      type: activeTable.type,
      columns: activeTable.columns,
      rows: activeTable.rows
    };
    const json = JSON.stringify(data, null, 2);
    setJsonExportData(json);
  };

  const confirmExportJSONFile = () => {
    if (!jsonExportData || !modalInput.trim()) return;
    const blob = new Blob([jsonExportData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = sanitizeFilename(modalInput) || 'table';
    a.download = `${safeFilename}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setJsonExportData('');
    setIsExportingJSON(false);
    setModalInput('');
  };

  const copyJsonToClipboard = () => {
    if (!jsonExportData) return;
    navigator.clipboard.writeText(jsonExportData).then(() => {
      alert('JSON copied to clipboard!');
      setJsonExportData('');
      setIsExportingJSON(false);
    });
  };

  const handlePasteJSON = () => {
    if (!activeTable || !jsonImportText.trim()) return;
    try {
      const idColumnId = activeTable.autoIdEnabled ? activeTable.autoIdColumnId : undefined;
      const hasIdColumn = !!idColumnId && activeTable.columns.some(c => c.id === idColumnId);
      const nextIdStart = (() => {
        if (!hasIdColumn || !idColumnId) return 1;
        const maxId = activeTable.rows.reduce((max, row) => {
          const raw = row.values[idColumnId] ?? '';
          const num = Number.parseInt(String(raw), 10);
          if (Number.isNaN(num)) return max;
          return num > max ? num : max;
        }, 0);
        return maxId + 1;
      })();
      const parsed = JSON.parse(jsonImportText);
      let dataArray: any[] = [];

      // Формат экспорта приложения: { columns: [], rows: [] }
      if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        const now = Date.now();
        const columnsFromFile = parsed.columns.filter((c: any) => c && typeof c.id === 'string' && typeof c.label === 'string');
        if (columnsFromFile.length === 0) {
          alert('No columns found in JSON');
          return;
        }
        const rowsFromFile = parsed.rows.filter((r: any) => r && r.values);
        const newRows = rowsFromFile.map((row: any, rowIdx: number) => {
          const values: Record<string, string> = {};
          Object.entries(row.values || {}).forEach(([key, val]) => {
            values[key] = val !== null && val !== undefined ? String(val) : '';
          });
          if (hasIdColumn && idColumnId) {
            values[idColumnId] = String(nextIdStart + rowIdx);
          }
          return {
            id: `row_${now}_${rowIdx}`,
            values,
            updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : now,
            comment: row.comment
          };
        });

        updateActiveTable(t => {
          const existingIds = new Set(t.columns.map(c => c.id));
          const columnsToAdd = columnsFromFile.filter((c: any) => !existingIds.has(c.id));
          return {
            ...t,
            columns: [...t.columns, ...columnsToAdd],
            rows: [...t.rows, ...newRows]
          };
        });

        alert(`Imported ${newRows.length} rows with ${columnsFromFile.length} columns`);
        setJsonImportText('');
        setShowJsonImportModal(false);
        return;
      }

      // Если это объект с массивом "data", используй его
      if (parsed.data && Array.isArray(parsed.data)) {
        dataArray = parsed.data;
      }
      // Если это прямо массив объектов
      else if (Array.isArray(parsed)) {
        dataArray = parsed;
      }
      // Если это объект со строками, конвертируй в массив
      else if (typeof parsed === 'object' && parsed !== null) {
        dataArray = [parsed];
      }

      if (!dataArray || dataArray.length === 0) {
        alert('No data found in JSON');
        return;
      }

      // Извлеки все уникальные ключи из объектов как названия колонок
      const allKeys = new Set<string>();
      dataArray.forEach(row => {
        if (typeof row === 'object' && row !== null) {
          Object.keys(row).forEach(key => allKeys.add(key));
        }
      });

      if (allKeys.size === 0) {
        alert('No properties found in objects');
        return;
      }

      const colKeys = Array.from(allKeys);
      const now = Date.now();

      // Создай новые колонки
      const newColumns = colKeys.map((key, idx) => ({
        id: `col_${now}_${idx}`,
        label: key
      }));

      // Распакуй массивы в отдельные строки
      const expandedRows: any[] = [];
      dataArray.forEach(obj => {
        const arrayKeys = Object.keys(obj).filter(key => Array.isArray(obj[key]));
        if (arrayKeys.length === 0) {
          expandedRows.push(obj);
        } else {
          const firstArrayKey = arrayKeys[0];
          const arrayValues = obj[firstArrayKey];
          arrayValues.forEach((val: any) => {
            expandedRows.push({ ...obj, [firstArrayKey]: val });
          });
        }
      });

      // Создай новые строки из развёрнутых данных
      const newRows = expandedRows.map((obj, rowIdx) => {
        const values: Record<string, string> = {};
        newColumns.forEach(col => {
          const keyIndex = colKeys.indexOf(col.label);
          const val = obj[colKeys[keyIndex]];
          values[col.id] = val !== null && val !== undefined 
            ? String(val)
            : '';
        });
        if (hasIdColumn && idColumnId) {
          values[idColumnId] = String(nextIdStart + rowIdx);
        }
        return { id: `row_${now}_${rowIdx}`, values, updatedAt: now };
      });

      // Обнови таблицу
      updateActiveTable(t => {
        const existingLabels = new Set(t.columns.map(c => normalizeLabel(c.label)));
        const columnsToAdd = newColumns.filter(col => !existingLabels.has(normalizeLabel(col.label)));
        
        return {
          ...t,
          columns: [...t.columns, ...columnsToAdd],
          rows: [...t.rows, ...newRows]
        };
      });

      alert(`Imported ${expandedRows.length} rows with ${colKeys.length} columns`);
      setJsonImportText('');
      setShowJsonImportModal(false);
    } catch (err) {
      alert('Failed to parse JSON: ' + String(err).substring(0, 50));
    }
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeTable) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const idColumnId = activeTable.autoIdEnabled ? activeTable.autoIdColumnId : undefined;
        const hasIdColumn = !!idColumnId && activeTable.columns.some(c => c.id === idColumnId);
        const nextIdStart = (() => {
          if (!hasIdColumn || !idColumnId) return 1;
          const maxId = activeTable.rows.reduce((max, row) => {
            const raw = row.values[idColumnId] ?? '';
            const num = Number.parseInt(String(raw), 10);
            if (Number.isNaN(num)) return max;
            return num > max ? num : max;
          }, 0);
          return maxId + 1;
        })();
        const text = String(reader.result || '');
        const parsed = JSON.parse(text);
        let dataArray: any[] = [];

        // Формат экспорта приложения: { columns: [], rows: [] }
        if (parsed && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
          const now = Date.now();
          const columnsFromFile = parsed.columns.filter((c: any) => c && typeof c.id === 'string' && typeof c.label === 'string');
          if (columnsFromFile.length === 0) {
            alert('No columns found in JSON');
            event.target.value = '';
            return;
          }
          const rowsFromFile = parsed.rows.filter((r: any) => r && r.values);
          const newRows = rowsFromFile.map((row: any, rowIdx: number) => {
            const values: Record<string, string> = {};
            Object.entries(row.values || {}).forEach(([key, val]) => {
              values[key] = val !== null && val !== undefined ? String(val) : '';
            });
            if (hasIdColumn && idColumnId) {
              values[idColumnId] = String(nextIdStart + rowIdx);
            }
            return {
              id: `row_${now}_${rowIdx}`,
              values,
              updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : now,
              comment: row.comment
            };
          });

          updateActiveTable(t => {
            const existingIds = new Set(t.columns.map(c => c.id));
            const columnsToAdd = columnsFromFile.filter((c: any) => !existingIds.has(c.id));
            return {
              ...t,
              columns: [...t.columns, ...columnsToAdd],
              rows: [...t.rows, ...newRows]
            };
          });

          alert(`Imported ${newRows.length} rows with ${columnsFromFile.length} columns`);
          event.target.value = '';
          setShowImportFormatModal(false);
          return;
        }

        // Если это объект с массивом "data", используй его
        if (parsed.data && Array.isArray(parsed.data)) {
          dataArray = parsed.data;
        }
        // Если это прямо массив объектов
        else if (Array.isArray(parsed)) {
          dataArray = parsed;
        }
        // Если это объект со строками, конвертируй в массив
        else if (typeof parsed === 'object' && parsed !== null) {
          dataArray = [parsed];
        }

        if (!dataArray || dataArray.length === 0) {
          alert('No data found in JSON');
          event.target.value = '';
          return;
        }

        // Извлеки все уникальные ключи из объектов как названия колонок
        const allKeys = new Set<string>();
        dataArray.forEach(row => {
          if (typeof row === 'object' && row !== null) {
            Object.keys(row).forEach(key => allKeys.add(key));
          }
        });

        if (allKeys.size === 0) {
          alert('No properties found in objects');
          event.target.value = '';
          return;
        }

        const colKeys = Array.from(allKeys);
        const now = Date.now();

        // Создай новые колонки
        const newColumns = colKeys.map((key, idx) => ({
          id: `col_${now}_${idx}`,
          label: key
        }));

        // Распакуй массивы в отдельные строки
        const expandedRows: any[] = [];
        dataArray.forEach(obj => {
          const arrayKeys = Object.keys(obj).filter(key => Array.isArray(obj[key]));
          if (arrayKeys.length === 0) {
            expandedRows.push(obj);
          } else {
            const firstArrayKey = arrayKeys[0];
            const arrayValues = obj[firstArrayKey];
            arrayValues.forEach((val: any) => {
              expandedRows.push({ ...obj, [firstArrayKey]: val });
            });
          }
        });

        // Создай новые строки из развёрнутых данных
        const newRows = expandedRows.map((obj, rowIdx) => {
          const values: Record<string, string> = {};
          newColumns.forEach(col => {
            const keyIndex = colKeys.indexOf(col.label);
            const val = obj[colKeys[keyIndex]];
            values[col.id] = val !== null && val !== undefined 
              ? String(val)
              : '';
          });
          if (hasIdColumn && idColumnId) {
            values[idColumnId] = String(nextIdStart + rowIdx);
          }
          return { id: `row_${now}_${rowIdx}`, values, updatedAt: now };
        });

        // Обнови таблицу
        updateActiveTable(t => {
          const existingLabels = new Set(t.columns.map(c => normalizeLabel(c.label)));
          const columnsToAdd = newColumns.filter(col => !existingLabels.has(normalizeLabel(col.label)));
          
          return {
            ...t,
            columns: [...t.columns, ...columnsToAdd],
            rows: [...t.rows, ...newRows]
          };
        });

        alert(`Imported ${expandedRows.length} rows with ${colKeys.length} columns`);
        event.target.value = '';
        setShowImportFormatModal(false);
      } catch (err) {
        alert('Failed to parse JSON: ' + String(err).substring(0, 50));
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeTable) return;
    const reader = new FileReader();
    reader.onload = () => {
      const idColumnId = activeTable.autoIdEnabled ? activeTable.autoIdColumnId : undefined;
      const hasIdColumn = !!idColumnId && activeTable.columns.some(c => c.id === idColumnId);
      const nextIdStart = (() => {
        if (!hasIdColumn || !idColumnId) return 1;
        const maxId = activeTable.rows.reduce((max, row) => {
          const raw = row.values[idColumnId] ?? '';
          const num = Number.parseInt(String(raw), 10);
          if (Number.isNaN(num)) return max;
          return num > max ? num : max;
        }, 0);
        return maxId + 1;
      })();
      const text = String(reader.result || '');
      const rows = parseCSV(text);
      if (rows.length < 2) {
        alert('CSV должен содержать заголовок и минимум одну строку данных.');
        event.target.value = '';
        return;
      }
      const headers = rows[0].map(h => h.trim());
      if (headers[0]) headers[0] = headers[0].replace(/^\uFEFF/, '');
      const dataRows = rows.slice(1).filter(r => r.some(cell => cell.trim() !== ''));
      updateActiveTable(t => {
        const existingByLabel = new Map(t.columns.map(c => [normalizeLabel(c.label), c]));
        const usedExisting = new Set<string>();
        const newColumns: Column[] = [...t.columns];
        const addedColumns: Column[] = [];
        const headerToColId: string[] = [];
        const now = Date.now();
        headers.forEach((raw, idx) => {
          const label = raw || `Column ${idx + 1}`;
          const norm = normalizeLabel(label);
          let existing = existingByLabel.get(norm);
          if (existing && !usedExisting.has(existing.id)) {
            usedExisting.add(existing.id);
            headerToColId.push(existing.id);
            return;
          }
          const col = { id: `col_${now}_${idx}`, label };
          newColumns.push(col);
          addedColumns.push(col);
          headerToColId.push(col.id);
        });

        const addedDefaults: Record<string, string> = {};
        addedColumns.forEach(c => { addedDefaults[c.id] = ''; });
        const newRows: DynamicRow[] = dataRows.map((row, rIdx) => {
          const values: Record<string, string> = {};
          headerToColId.forEach((cid, i) => {
            values[cid] = row[i] ?? '';
          });
          newColumns.forEach(c => { if (!(c.id in values)) values[c.id] = ''; });
          if (hasIdColumn && idColumnId) {
            values[idColumnId] = String(nextIdStart + rIdx);
          }

          return { id: `row_${now}_${rIdx}`, values, updatedAt: now };
        });

        const existingRows = t.rows.map(r => ({ ...r, values: { ...addedDefaults, ...r.values } }));
        return { ...t, columns: newColumns, rows: [...existingRows, ...newRows] };
      });
      alert(`Импортировано строк: ${dataRows.length}`);
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const toggleFilter = (cid: string, val: string) => {
    setActiveFilters(prev => {
      const ex = prev.find(f => f.columnId === cid && f.value === val);
      if (!ex) return [...prev, { columnId: cid, value: val, mode: 'include' }];
      if (ex.mode === 'include') return prev.map(f => (f.columnId === cid && f.value === val) ? { ...f, mode: 'exclude' } : f);
      return prev.filter(f => !(f.columnId === cid && f.value === val));
    });
    setRowsPage(1);
  };

  const removeFilter = (colId: string, val: string) => {
    setActiveFilters(prev => prev.filter(f => !(f.columnId === colId && f.value === val)));
  };

  const [dragColId, setDragColId] = useState<string | null>(null);

  const handleColumnDragStart = (colId: string) => {
    if (activeTable?.autoIdColumnId === colId) return;
    setDragColId(colId);
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColumnDrop = (targetColId: string) => {
    if (activeTable?.autoIdColumnId === targetColId) {
      setDragColId(null);
      return;
    }
    if (!activeTable || !dragColId || dragColId === targetColId) {
      setDragColId(null);
      return;
    }

    updateActiveTable(t => {
      const fromIndex = t.columns.findIndex(c => c.id === dragColId);
      const toIndex = t.columns.findIndex(c => c.id === targetColId);
      if (fromIndex === -1 || toIndex === -1) return t;
      const nextColumns = [...t.columns];
      const [moved] = nextColumns.splice(fromIndex, 1);
      nextColumns.splice(toIndex, 0, moved);
      return { ...t, columns: nextColumns };
    });

    setDragColId(null);
  };

  // --- VIEWS ---

  if (!activeFolderId) {
    return (
      <div className="min-h-screen bg-white text-black font-sans antialiased">
        <header className="px-10 py-12 border-b border-gray-100 max-w-[1400px] mx-auto flex justify-between items-center">
          <div><h1 className="text-4xl font-black tracking-tighter uppercase">Rafoz</h1><p className="text-[10px] font-black text-black/30 uppercase mt-2 tracking-widest">{folders.length} Folders</p></div>
          <button onClick={() => { setModalInput(''); setModalDesc(''); setIsCreatingFolder(true); }} className="px-8 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Create Folder</button>
        </header>
        <main className="px-10 py-16 max-w-[1400px] mx-auto">
          {folders.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[3rem] opacity-20 uppercase font-black tracking-widest">No folders</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {paginatedFolders.map(f => (
                  <div key={f.id} onClick={() => setActiveFolderId(f.id)} className="group relative bg-gray-50 border-2 border-transparent hover:border-black hover:bg-white p-8 rounded-[2rem] cursor-pointer transition-all duration-300 flex flex-col h-full min-h-[240px]">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-black text-white p-3 rounded-2xl"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setRenamingFolderId(f.id); setModalInput(f.name); setModalDesc(''); }} className="p-2 hover:bg-gray-100 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                        <button onClick={(e) => { e.stopPropagation(); setFolders(prev => prev.filter(x => x.id !== f.id)); }} className="p-2 hover:bg-red-50 text-red-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                      </div>
                    </div>
                    <h3 title={f.name} className="text-xl font-black uppercase mb-2 truncate">{f.name}</h3>
                    <div className="pt-4 border-t border-black/5"><p className="text-[10px] font-black uppercase tracking-widest text-black/30">{f.tables.length} Tables</p></div>
                  </div>
                ))}
              </div>
              <PaginationControls current={foldersPage} total={totalFoldersPages} onPageChange={setFoldersPage} label="Folders"/>
            </>
          )}
        </main>
        {(isCreatingFolder || renamingFolderId) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
              <h2 className="text-lg font-black uppercase text-center mb-6">{renamingFolderId ? 'Rename Folder' : 'New Folder'}</h2>
              <div className="space-y-4 mb-8">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black uppercase opacity-40 ml-1 block">Name</label>
                    <span className={`text-[8px] font-black ${modalInput.length >= NAME_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/{NAME_LIMIT}</span>
                  </div>
                  <input type="text" maxLength={NAME_LIMIT} autoFocus className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black" value={modalInput} onChange={e => setModalInput(e.target.value)}/>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black uppercase opacity-40 ml-1 block">Description</label>
                    <span className={`text-[8px] font-black ${modalDesc.length >= DESCRIPTION_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{modalDesc.length}/{DESCRIPTION_LIMIT}</span>
                  </div>
                  <textarea maxLength={DESCRIPTION_LIMIT} rows={4} className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-black resize-none" value={modalDesc} onChange={e => setModalDesc(e.target.value)}/>
                </div>
              </div>
              <div className="flex justify-center gap-4">
                <button onClick={() => { setIsCreatingFolder(false); setRenamingFolderId(null); setModalInput(''); setModalDesc(''); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
                <button onClick={() => {
                  if (renamingFolderId) setFolders(prev => prev.map(f => f.id === renamingFolderId ? { ...f, name: modalInput, description: modalDesc, updatedAt: Date.now() } : f));
                  else createFolder();
                  setIsCreatingFolder(false); setRenamingFolderId(null); setModalInput(''); setModalDesc('');
                }} className="px-8 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!activeTableId) {
    return (
      <div className="min-h-screen bg-white text-black font-sans antialiased">
        <header className="px-10 py-12 border-b border-gray-100 max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button onClick={() => setActiveFolderId(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg></button>
            <div><p className="text-[10px] font-black uppercase text-black/30 truncate max-w-[200px]">Rafoz / {activeFolder?.name}</p><h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Tables</h1></div>
          </div>
          <button onClick={() => { setModalInput(''); setModalTableType('classic'); setIsAutoIdEnabled(false); setIsCreatingTable(true); }} className="px-8 py-4 bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">Create Table</button>
        </header>
        <main className="px-10 py-16 max-w-[1400px] mx-auto">
          {activeFolder?.tables.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-[3rem] opacity-20 uppercase font-black tracking-widest">Empty Folder</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {paginatedTables.map(t => (
                  <div key={t.id} onClick={() => setActiveTableId(t.id)} className="group relative bg-gray-50 border-2 border-transparent hover:border-black hover:bg-white p-10 rounded-[2.5rem] cursor-pointer transition-all duration-300">
                    <div className="flex justify-between items-start mb-10">
                      <div className="bg-black text-white p-3 rounded-2xl">
                        {t.type === 'classic' ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7"/></svg>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[8px] uppercase">{t.type}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setRenamingTableId(t.id); setModalInput(t.name); }} className="p-2 hover:bg-gray-100 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                          <button onClick={(e) => { e.stopPropagation(); setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, tables: f.tables.filter(x => x.id !== t.id) } : f)); }} className="p-2 hover:bg-red-50 text-red-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                      </div>
                    </div>
                    <h3 title={t.name} className="text-2xl font-black uppercase mb-2 truncate pr-4">{t.name}</h3>
                    <p className="text-[10px] font-black uppercase text-black/30 tracking-widest">{t.rows.length} Records</p>
                  </div>
                ))}
              </div>
              <PaginationControls current={tablesPage} total={totalRowsPages} onPageChange={setTablesPage} label="Tables"/>
            </>
          )}
        </main>
        {(isCreatingTable || renamingTableId) && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
              <h2 className="text-lg font-black uppercase text-center mb-6">{renamingTableId ? 'Rename Table' : 'New Table'}</h2>
              {!renamingTableId && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setModalTableType('classic')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${modalTableType === 'classic' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg><span className="text-[9px] font-black uppercase">Classic</span></button>
                  <button onClick={() => setModalTableType('pairwise')} className={`p-4 border-2 rounded-2xl flex flex-col items-center gap-2 transition-all ${modalTableType === 'pairwise' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7"/></svg><span className="text-[9px] font-black uppercase">Pairwise</span></button>
                </div>
              )}
              <div className="flex justify-between items-center mb-1">
                <label className="text-[9px] font-black uppercase opacity-40 ml-1 block">Table Name</label>
                <span className={`text-[8px] font-black ${modalInput.length >= NAME_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/{NAME_LIMIT}</span>
              </div>
              <input
                type="text"
                maxLength={NAME_LIMIT}
                autoFocus
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 mb-6 ${modalInputError ? 'bg-red-50 border border-red-500 focus:ring-red-200' : 'bg-gray-100 border border-gray-100 focus:ring-black'}`}
                placeholder="Name..."
                value={modalInput}
                onChange={e => { setModalInput(e.target.value); setModalInputError(false); }}
              />
              {!renamingTableId && (
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[9px] font-black uppercase opacity-40">ID</span>
                  <button
                    type="button"
                    onClick={() => setIsAutoIdEnabled(prev => !prev)}
                    className={`w-11 h-6 rounded-full p-[2px] transition-colors ${isAutoIdEnabled ? 'bg-black' : 'bg-gray-200'}`}
                    aria-pressed={isAutoIdEnabled}
                  >
                    <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${isAutoIdEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}
              {modalInputError && (
                <div className="text-xs text-red-600 font-bold mb-4 text-center">Поле Name обязательно для заполнения</div>
              )}
              <div className="flex justify-center gap-4">
                <button onClick={() => { setIsCreatingTable(false); setRenamingTableId(null); setModalInput(''); setModalInputError(false); setIsAutoIdEnabled(false); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
                <button
                  onClick={() => {
                    if (!modalInput.trim()) {
                      setModalInputError(true);
                      return;
                    }
                    if (renamingTableId) setFolders(prev => prev.map(f => f.id === activeFolderId ? { ...f, tables: f.tables.map(t => t.id === renamingTableId ? { ...t, name: modalInput, updatedAt: Date.now() } : t) } : f));
                    else createTableInFolder();
                    setIsCreatingTable(false); setRenamingTableId(null); setModalInput(''); setModalInputError(false); setIsAutoIdEnabled(false);
                  }}
                  className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
                >Confirm</button>
              </div>
            </div>
          </div>
        )}
      
      </div>

    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white text-black font-sans flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-[100] px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveTableId(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg></button>
            <div className="flex flex-col">
              <p className="text-[8px] font-black uppercase text-black/30 truncate max-w-[150px]">{activeFolder?.name} /</p>
              <div className="flex items-center gap-2">
                <h1 title={activeTable?.name} className="text-xl font-black uppercase tracking-tighter truncate max-w-[300px]">{activeTable?.name}</h1>
                <Badge variant="secondary" className="text-[8px] uppercase tracking-tighter opacity-50">{activeTable?.type}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <input type="text" placeholder="Global search..." className="w-full lg:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-black" value={searchInput} onChange={e => setSearchInput(e.target.value)}/>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-20"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div>
            </div>
            {selectedRowIds.length > 0 && (
              <div className="flex gap-2">
                <div className="px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-black/60">
                  Selected: {selectedRowIds.length}
                </div>
                <button onClick={() => {
                  const initial: Record<string, { enabled: boolean; value: string }> = {};
                  activeTable?.columns.forEach(c => { const f = activeFilters.find(x => x.columnId === c.id); initial[c.id] = { enabled: !!f, value: f ? f.value : '' }; });
                  setMassUpdateFields(initial); setIsMassUpdating(true);
                }} className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Bulk Edit</button>
                <button onClick={() => { const set = new Set(selectedRowIds); updateActiveTable(t => ({ ...t, rows: t.rows.filter(r => !set.has(r.id)) })); setSelectedRowIds([]); }} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Delete</button>
              </div>
            )}
            <button onClick={() => setShowImportFormatModal(true)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold">Import</button>
            <button onClick={() => { setShowExportFormatModal(true); setModalInput(activeTable?.name || 'table'); setModalInputError(false); }} disabled={!activeTable} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed">Export</button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCSV} />
            <input ref={fileInputJsonRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImportJSON} />
            <button onClick={() => setIsAddingCol(true)} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold">+ Col</button>
            <button onClick={() => { setNewRowValues({}); setIsAddingRow(true); }} className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">
              {activeTable?.type === 'classic' ? '+ Add Rows' : 'Bulk Add'}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="fixed left-2 top-24 z-[120] w-9 h-9 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center"
            aria-label="Expand filters"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <aside className={`bg-white border-r border-gray-100 transition-all ${isSidebarCollapsed ? 'w-12' : 'w-72'} flex flex-col h-full z-20`}>
          <div className="p-4 space-y-4 border-b border-gray-50 bg-gray-50/30 relative">
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && <h3 className="text-[10px] font-black text-black opacity-40 uppercase tracking-widest">Filter Data</h3>}
              {!isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center ml-auto"
                  aria-label="Collapse filters"
                >
                  <svg
                    className="w-3.5 h-3.5 transition-transform rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search filters..." 
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-black transition-all"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                {sidebarSearch && (
                  <button onClick={() => setSidebarSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg></button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden">
            {!isSidebarCollapsed && visibleSidebarColumns.map(col => {
              const stats = columnValueStats[col.id];
              const uniqueValues = Object.keys(stats?.counts || {}).sort();
              const isExpanded = expandedCols[col.id] ?? false;
              const hasActiveFilters = activeFilters.some(f => f.columnId === col.id);
              const isIdCol = activeTable?.autoIdColumnId === col.id;
              
              const query = sidebarSearch.toLowerCase();
              const filteredValues = uniqueValues.filter(v => v.toLowerCase().includes(query));

              return (
                <div key={col.id} className="border-b border-gray-50 last:border-0">
                  <button 
                    onClick={() => setExpandedCols(prev => ({...prev, [col.id]: !isExpanded}))}
                    className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-1.5 h-1.5 rounded-full ${hasActiveFilters ? 'bg-black' : 'bg-transparent'}`} />
                      <span className="text-xs font-black uppercase tracking-tight truncate">{col.label}</span>
                    </div>
                    <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-5 py-2 bg-white pb-4">
                      {/* ACTIONS BLOCK */}
                      <div className="mb-3 flex items-center gap-2">
                        {stats.emptyCount > 0 && (
                          <button 
                            onClick={() => handleSelectEmpty(col.id)}
                            className="flex-1 px-2 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[9px] font-black uppercase text-red-700 transition-all flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                            Empty ({stats.emptyCount})
                          </button>
                        )}
                        {!isIdCol && (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => { setRenamingColId(col.id); setNewColLabel(col.label); }}
                              className="p-1.5 text-black hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 shadow-sm"
                              title="Rename Field"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteColumn(col.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100 shadow-sm"
                              title="Delete Field"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1-1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                        {filteredValues.length === 0 && stats.emptyCount === 0 ? (
                          <p className="text-[10px] font-bold opacity-20 text-center py-2 italic uppercase">No results</p>
                        ) : (
                          <>
                            {stats.emptyCount > 0 && (
                              <button 
                                onClick={() => toggleFilter(col.id, '')}
                                className={`w-full group flex items-center justify-between p-2 rounded-lg text-left transition-all ${activeFilters.find(f => f.columnId === col.id && f.value === '') ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className={`w-3 h-3 border rounded ${activeFilters.find(f => f.columnId === col.id && f.value === '') ? 'bg-white border-white' : 'border-black/10 bg-white group-hover:border-black/30'}`} />
                                  <span className="text-[10px] font-bold italic opacity-60">(Empty)</span>
                                </div>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${activeFilters.find(f => f.columnId === col.id && f.value === '') ? 'bg-white/20' : 'bg-gray-200 opacity-40'}`}>
                                  {stats.emptyCount}
                                </span>
                              </button>
                            )}
                            {filteredValues.map(val => {
                              const filter = activeFilters.find(f => f.columnId === col.id && f.value === val);
                              const count = stats.counts[val];
                              const isMatch = sidebarSearch && val.toLowerCase().includes(query);
                              return (
                                <button 
                                  key={val}
                                  onClick={() => toggleFilter(col.id, val)}
                                  className={`w-full group flex items-center justify-between p-2 rounded-lg text-left transition-all ${filter ? 'bg-black text-white' : 'hover:bg-gray-100'} ${isMatch ? 'border border-black/10' : ''}`}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <div className={`w-3 h-3 border rounded ${filter ? 'bg-white border-white' : 'border-black/10 bg-white group-hover:border-black/30'}`} />
                                    <span className={`text-[10px] font-bold truncate pr-2 ${isMatch ? 'bg-yellow-100 text-black' : ''}`}>{val}</span>
                                  </div>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${filter ? 'bg-white/20' : 'bg-gray-200 opacity-40'}`}>
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="px-6 py-2.5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 opacity-40">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
              <span className="text-[10px] font-black uppercase tracking-widest">Active Filters</span>
            </div>
            {activeFilters.length === 0 ? (
              <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest">None</span>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((f, i) => {
                    const col = activeTable?.columns.find(c => c.id === f.columnId);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-tighter transition-all ${f.mode === 'exclude' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-black'}`}>
                        <span className="opacity-40">{col?.label || 'Col'}:</span>
                        <span>{f.value || '(Empty)'}</span>
                        <button onClick={() => removeFilter(f.columnId, f.value)} className="hover:scale-125 transition-transform"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg></button>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setActiveFilters([])} className="text-[10px] font-black uppercase text-red-600 hover:underline">Clear All</button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-center border-collapse min-w-full">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                  <th className="px-6 py-3.5 min-w-[80px] w-[80px] text-center border-r border-gray-200 sticky left-0 z-[3] bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]">
                    <input type="checkbox" className="w-4 h-4 accent-black" checked={paginatedRows.length > 0 && paginatedRows.every(r => selectedRowIds.includes(r.id))} onChange={() => { const vids = paginatedRows.map(r => r.id); const all = vids.every(id => selectedRowIds.includes(id)); setSelectedRowIds(prev => all ? prev.filter(id => !vids.includes(id)) : [...new Set([...prev, ...vids])]); }}/>
                  </th>
                  {activeTable?.columns.map(col => (
                    <th
                      key={col.id}
                      draggable={activeTable?.autoIdColumnId !== col.id}
                      onDragStart={() => handleColumnDragStart(col.id)}
                      onDragOver={handleColumnDragOver}
                      onDrop={() => handleColumnDrop(col.id)}
                      className={`group px-6 py-3.5 text-[10px] font-black text-black/50 uppercase tracking-widest whitespace-nowrap min-w-[180px] relative text-center ${dragColId === col.id ? 'opacity-40' : ''} ${activeTable?.autoIdColumnId === col.id ? 'min-w-[56px] w-[56px] sticky left-16 z-[2] bg-gray-50 shadow-[1px_0_0_0_rgba(0,0,0,0.06)] text-center' : ''}`}
                      title="Drag to reorder"
                    >
                      <div className={`flex items-center ${activeTable?.autoIdColumnId === col.id ? 'justify-center' : 'justify-center'}`}>
                        <span>{col.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3.5 text-[10px] font-black text-black/50 uppercase tracking-widest whitespace-nowrap w-32 border-r border-gray-200 text-center">Last Mod</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map(row => (
                  <TableRow 
                    key={row.id} 
                    row={row} 
                    columns={activeTable!.columns} 
                    autoIdColumnId={activeTable?.autoIdColumnId}
                    isSelected={selectedRowIds.includes(row.id)}
                    onToggleSelect={id => setSelectedRowIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                    onEdit={r => { setEditingRow(r); setEditRowValues({ ...r.values }); }}
                    onDelete={id => updateActiveTable(t => ({ ...t, rows: t.rows.filter(x => x.id !== id) }))}
                    onViewRow={r => { setViewingRow(r); setRowCommentInput(r.comment || ''); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100"><PaginationControls current={rowsPage} total={totalRowsPages} onPageChange={setRowsPage} label="Rows"/></div>
        </section>
      </main>

      {/* MODALS */}
      {viewingRow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <Badge variant="secondary" className="mb-2 text-[9px] uppercase tracking-widest opacity-50">Row Details</Badge>
                <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Record View</h2>
              </div>
              <button onClick={() => setViewingRow(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {activeTable?.columns.map(col => (
                  <div key={col.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-black uppercase opacity-30 block mb-1">{col.label}</label>
                    {renderDetailValue(col, viewingRow.values[col.id] || '')}
                  </div>
                ))}
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase opacity-30">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                    Note / Comment
                  </label>
                  <span className={`text-[9px] font-black ${rowCommentInput.length >= COMMENT_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{rowCommentInput.length} / {COMMENT_LIMIT}</span>
                </div>
                <textarea 
                  maxLength={COMMENT_LIMIT}
                  className="w-full p-5 bg-gray-50 rounded-3xl text-sm font-bold min-h-[100px] outline-none focus:ring-2 focus:ring-black/10 border border-gray-100 resize-none transition-all placeholder:text-black/20"
                  placeholder="Write something important..."
                  value={rowCommentInput}
                  onChange={e => setRowCommentInput(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button onClick={() => setViewingRow(null)} className="px-6 py-3 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">Close</button>
              <button 
                onClick={() => {
                  updateActiveTable(t => ({ ...t, rows: t.rows.map(r => r.id === viewingRow.id ? { ...r, comment: rowCommentInput, updatedAt: Date.now() } : r) }));
                  setViewingRow(null);
                }}
                className="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {renamingTableId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl text-center">
            <h2 className="text-lg font-black uppercase mb-6">Rename Table</h2>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase opacity-40">Name</span>
              <span className={`text-[8px] font-black ${modalInput.length >= NAME_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/{NAME_LIMIT}</span>
            </div>
            <input type="text" maxLength={NAME_LIMIT} autoFocus className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 focus:ring-black mb-6" value={modalInput} onChange={e => setModalInput(e.target.value)}/>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setRenamingTableId(null); setModalInput(''); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button onClick={() => { updateActiveTable(t => t.id === renamingTableId ? { ...t, name: modalInput } : t); setRenamingTableId(null); setModalInput(''); }} className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase">Update</button>
            </div>
          </div>
        </div>
      )}

      {renamingColId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl text-center">
            <h2 className="text-lg font-black uppercase mb-6">Rename Field</h2>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black uppercase opacity-40">Label</span>
              <span className={`text-[8px] font-black ${newColLabel.length >= NAME_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{newColLabel.length}/{NAME_LIMIT}</span>
            </div>
            <input 
              type="text" 
              maxLength={NAME_LIMIT}
              autoFocus 
              disabled={activeTable?.autoIdColumnId === renamingColId}
              className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none mb-6 ${activeTable?.autoIdColumnId === renamingColId ? 'bg-gray-100/70 text-black/40 cursor-not-allowed' : 'bg-gray-100 focus:ring-2 focus:ring-black'}`}
              value={newColLabel} 
              onChange={e => setNewColLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newColLabel.trim() && activeTable?.autoIdColumnId !== renamingColId) {
                  updateActiveTable(t => ({ ...t, columns: t.columns.map(c => c.id === renamingColId ? { ...c, label: newColLabel } : c) }));
                  setRenamingColId(null);
                }
              }}
            />
            <div className="flex justify-center gap-4">
              <button onClick={() => setRenamingColId(null)} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button 
                onClick={() => {
                  if (newColLabel.trim() && activeTable?.autoIdColumnId !== renamingColId) {
                    updateActiveTable(t => ({ ...t, columns: t.columns.map(c => c.id === renamingColId ? { ...c, label: newColLabel } : c) }));
                    setRenamingColId(null);
                  }
                }} 
                disabled={activeTable?.autoIdColumnId === renamingColId}
                className={`px-6 py-3 text-[10px] font-black rounded-lg uppercase ${activeTable?.autoIdColumnId === renamingColId ? 'bg-black/20 text-white/60 cursor-not-allowed' : 'bg-black text-white'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingRow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8">
            <h2 className="text-lg font-black uppercase mb-6">{activeTable?.type === 'classic' ? 'New Row' : 'Bulk Add'}</h2>
            {activeTable?.columns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm opacity-50 mb-6">Сначала добавьте поля (колонки) в таблицу</p>
                <button 
                  onClick={() => { setIsAddingRow(false); setIsAddingCol(true); }} 
                  className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
                >
                  Add Field
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-6 max-h-[50vh] overflow-y-auto mb-8 pr-2">
                  {activeTable?.columns.map(col => {
                    const val = newRowValues[col.id] || '';
                    const isIdField = activeTable?.autoIdEnabled && activeTable.autoIdColumnId === col.id;
                    const { isValid } = validateSegments(val);
                    const segments = val.split('/');
                    const currentSegment = segments[segments.length - 1];
                    const isOverLimit = currentSegment.length >= SEGMENT_CHAR_LIMIT;
                    const suggestions = Object.keys(columnValueStats[col.id]?.counts || {});
                    
                    return (
                      <div key={col.id} className="space-y-1.5">
                        <div className="flex justify-between items-end">
                          <label className="text-[9px] font-black opacity-40 uppercase">{col.label}</label>
                          {val && (
                            <div className="flex gap-2">
                              <span className={`text-[8px] font-black ${isOverLimit ? 'text-red-500' : 'text-green-600'}`}>
                                {currentSegment.length} / {SEGMENT_CHAR_LIMIT}
                              </span>
                            </div>
                          )}
                        </div>
                        <input 
                          className={`w-full px-4 py-2.5 border rounded-xl text-sm font-bold transition-all outline-none focus:ring-2 ${isIdField ? 'bg-gray-100 text-black/40' : 'bg-gray-50'} ${!isValid && !isIdField ? 'border-red-500 focus:ring-red-100 ring-offset-0' : 'border-gray-100 focus:ring-black/5 focus:border-black'}`}
                          placeholder={isIdField ? 'Auto' : 'Value / Value...'} 
                          value={val} 
                          onChange={e => setNewRowValues({...newRowValues, [col.id]: e.target.value})} 
                          disabled={!!isIdField}
                        />
                        {!isValid && (
                          <p className="text-[8px] text-red-500 font-bold uppercase tracking-tight">Limit: {SEGMENT_CHAR_LIMIT} chars per part</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setIsAddingRow(false)} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
                  <button onClick={handleAddRow} disabled={!isNewRowDataValid || isProcessing} className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase disabled:opacity-20">Save</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {editingRow && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8">
            <h2 className="text-lg font-black uppercase mb-6">Edit Record</h2>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-8 pr-2">
              {activeTable?.columns.map(col => {
                const val = editRowValues[col.id] || '';
                const isIdField = activeTable?.autoIdEnabled && activeTable.autoIdColumnId === col.id;
                const suggestions = Object.keys(columnValueStats[col.id]?.counts || {});

                return (
                  <div key={col.id}>
                    <label className="text-[9px] font-black opacity-40 uppercase mb-1 block">{col.label}</label>
                    <input 
                      className={`w-full px-4 py-2 border rounded-lg text-sm font-bold ${isIdField ? 'bg-gray-100 text-black/40' : 'bg-gray-50'}`}
                      placeholder={isIdField ? 'Auto' : 'Type...'}
                      value={val}
                      onChange={e => setEditRowValues({...editRowValues, [col.id]: e.target.value})}
                      disabled={!!isIdField}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-4">
              <button onClick={() => setEditingRow(null)} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button onClick={() => {
                updateActiveTable(t => ({ ...t, rows: t.rows.map(r => r.id === editingRow.id ? { ...r, values: editRowValues, updatedAt: Date.now() } : r) }));
                setEditingRow(null);
              }} className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase">Save</button>
            </div>
          </div>
        </div>
      )}

      {isAddingCol && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl text-center">
            <h2 className="text-lg font-black uppercase mb-6">New Field</h2>
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[9px] font-black uppercase opacity-40">Label</span>
              <span className={`text-[8px] font-black ${newColLabel.length >= NAME_LIMIT ? 'text-red-500' : 'text-green-600'}`}>{newColLabel.length}/{NAME_LIMIT}</span>
            </div>
            <input maxLength={NAME_LIMIT} autoFocus placeholder="Field label..." className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold text-center mb-6 focus:ring-2 focus:ring-black outline-none" value={newColLabel} onChange={e => setNewColLabel(e.target.value)}/>
            <div className="flex justify-center gap-4">
              <button onClick={() => setIsAddingCol(false)} className="text-[10px] font-black opacity-30 uppercase">Discard</button>
              <button onClick={() => { if(!newColLabel.trim()) return; updateActiveTable(t => ({ ...t, columns: [...t.columns, { id: `col_${Date.now()}`, label: newColLabel }] })); setNewColLabel(''); setIsAddingCol(false); }} className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase">Add</button>
            </div>
          </div>
        </div>
      )}

      {isMassUpdating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 overflow-hidden flex flex-col max-h-[85vh]">
            <h2 className="text-xl font-black uppercase mb-6">Bulk Edit ({selectedRowIds.length})</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {activeTable?.columns.map(col => {
                const data = massUpdateFields[col.id] || { enabled: false, value: '' };
                const isIdField = activeTable?.autoIdEnabled && activeTable.autoIdColumnId === col.id;
                return (
                  <div key={col.id} className={`p-4 rounded-2xl border-2 ${data.enabled ? 'border-black bg-white' : 'border-gray-100 bg-gray-50 opacity-60'} ${isIdField ? 'opacity-50' : ''}`}>
                    <CustomCheckbox checked={data.enabled && !isIdField} onChange={() => !isIdField && setMassUpdateFields(prev => ({...prev, [col.id]: {...prev[col.id], enabled: !data.enabled}}))} label={col.label} />
                    {data.enabled && !isIdField && <input className="w-full mt-2 px-4 py-2 bg-gray-50 border rounded-lg text-sm font-bold" value={data.value} onChange={e => setMassUpdateFields(prev => ({...prev, [col.id]: {...prev[col.id], value: e.target.value}}))} />}
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex justify-end gap-6">
              <button onClick={() => setIsMassUpdating(false)} className="text-[10px] font-black opacity-30 uppercase">Discard</button>
              <button onClick={() => {
                const fields = Object.entries(massUpdateFields).filter(x => x[1].enabled);
                const set = new Set(selectedRowIds);
                const now = Date.now();
                updateActiveTable(t => ({ ...t, rows: t.rows.map(r => {
                  if (!set.has(r.id)) return r;
                  const nv = { ...r.values };
                  fields.forEach(([cid, d]) => {
                    nv[cid] = d.value;
                  });
                  return { ...r, values: nv, updatedAt: now };
                }) }));
                setIsMassUpdating(false); setSelectedRowIds([]);
              }} className="px-8 py-4 bg-black text-white text-[10px] font-black rounded-xl uppercase">Apply</button>
            </div>
          </div>
        </div>
      )}
      
      {isExportingCSV && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-6">Export as CSV</h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-50">Filename</label>
                <span className={`text-[8px] font-black ${modalInput.length >= 100 ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                autoFocus
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 ${modalInputError ? 'bg-red-50 border border-red-500 focus:ring-red-200' : 'bg-gray-100 border border-gray-100 focus:ring-black'}`}
                placeholder="filename.csv"
                value={modalInput}
                onChange={e => { setModalInput(e.target.value); setModalInputError(false); }}
              />
            </div>
            {modalInputError && (
              <div className="text-xs text-red-600 font-bold mb-4 text-center">Filename is required</div>
            )}
            <div className="flex justify-center gap-4">
              <button onClick={() => { setIsExportingCSV(false); setModalInput(''); setModalInputError(false); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button
                onClick={() => {
                  if (!modalInput.trim()) {
                    setModalInputError(true);
                    return;
                  }
                  confirmExportCSV();
                }}
                className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
              >Download</button>
            </div>
          </div>
        </div>
      )}
      
      {isExportingJSON && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-6">Export as JSON</h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-50">Filename</label>
                <span className={`text-[8px] font-black ${modalInput.length >= 100 ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                autoFocus
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 ${modalInputError ? 'bg-red-50 border border-red-500 focus:ring-red-200' : 'bg-gray-100 border border-gray-100 focus:ring-black'}`}
                placeholder="filename.json"
                value={modalInput}
                onChange={e => { setModalInput(e.target.value); setModalInputError(false); }}
              />
            </div>
            {modalInputError && (
              <div className="text-xs text-red-600 font-bold mb-4 text-center">Filename is required</div>
            )}
            <div className="flex justify-center gap-4">
              <button onClick={() => { setIsExportingJSON(false); setModalInput(''); setModalInputError(false); setJsonExportData(''); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button
                onClick={() => {
                  if (!modalInput.trim()) {
                    setModalInputError(true);
                    return;
                  }
                  confirmExportJSONFile();
                }}
                className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
              >Download</button>
            </div>
          </div>
        </div>
      )}
      
      {showImportFormatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-8">Choose Import Format</h2>
            <div className="space-y-3">
              <button
                onClick={() => { fileInputRef.current?.click(); setShowImportFormatModal(false); }}
                className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-black text-sm font-black rounded-xl uppercase transition-colors"
              >
                CSV
              </button>
              <button
                onClick={() => { fileInputJsonRef.current?.click(); setShowImportFormatModal(false); }}
                className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-black text-sm font-black rounded-xl uppercase transition-colors"
              >
                JSON File
              </button>
              <button
                onClick={() => { setShowImportFormatModal(false); setShowJsonImportModal(true); }}
                className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-black text-sm font-black rounded-xl uppercase transition-colors"
              >
                Paste JSON
              </button>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setShowImportFormatModal(false)} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {showJsonImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-6">Paste JSON</h2>
            <textarea
              value={jsonImportText}
              onChange={e => setJsonImportText(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full h-64 px-4 py-3 rounded-xl text-sm font-bold border border-gray-200 outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={() => { setShowJsonImportModal(false); setJsonImportText(''); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button
                onClick={handlePasteJSON}
                className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
              >Import</button>
            </div>
          </div>
        </div>
      )}
      
      {showExportFormatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-8">Choose Export Format</h2>
            <div className="space-y-3">
              <button
                onClick={() => { setShowExportFormatModal(false); setIsExportingCSV(true); }}
                className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-black text-sm font-black rounded-xl uppercase transition-colors"
              >
                CSV
              </button>
              <button
                onClick={() => {
                  if (!activeTable) {
                    alert('No table selected');
                    return;
                  }
                  const data = {
                    name: activeTable.name,
                    type: activeTable.type,
                    columns: activeTable.columns,
                    rows: activeTable.rows
                  };
                  setJsonExportData(JSON.stringify(data, null, 2));
                  setModalInput(activeTable.name || 'table');
                  setModalInputError(false);
                  setShowExportFormatModal(false);
                  setIsExportingJSON(true);
                }}
                className="w-full px-6 py-4 bg-gray-100 hover:bg-gray-200 text-black text-sm font-black rounded-xl uppercase transition-colors"
              >
                JSON
              </button>
            </div>
            <div className="mt-6 text-center">
              <button onClick={() => setShowExportFormatModal(false)} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isExportingJSON && jsonExportData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl">
            <h2 className="text-lg font-black uppercase text-center mb-6">Export as JSON</h2>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-50">Filename</label>
                <span className={`text-[8px] font-black ${modalInput.length >= 100 ? 'text-red-500' : 'text-green-600'}`}>{modalInput.length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                autoFocus
                className={`w-full px-4 py-3 rounded-xl text-sm font-bold text-center outline-none focus:ring-2 ${modalInputError ? 'bg-red-50 border border-red-500 focus:ring-red-200' : 'bg-gray-100 border border-gray-100 focus:ring-black'}`}
                placeholder="filename.json"
                value={modalInput}
                onChange={e => { setModalInput(e.target.value); setModalInputError(false); }}
              />
            </div>
            {modalInputError && (
              <div className="text-xs text-red-600 font-bold mb-4 text-center">Filename is required</div>
            )}
            <div className="flex justify-center gap-4">
              <button onClick={() => { setIsExportingJSON(false); setModalInput(''); setModalInputError(false); setJsonExportData(''); }} className="text-[10px] font-black opacity-30 uppercase">Cancel</button>
              <button
                onClick={() => {
                  if (!modalInput.trim()) {
                    setModalInputError(true);
                    return;
                  }
                  confirmExportJSONFile();
                }}
                className="px-6 py-3 bg-black text-white text-[10px] font-black rounded-lg uppercase"
              >Download</button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};

export default App;
