
export interface Column {
  id: string;
  label: string;
}

export interface DynamicRow {
  id: string;
  values: Record<string, string>;
  updatedAt: number;
  comment?: string;
}

export interface ActiveFilter {
  columnId: string;
  value: string;
  mode: 'include' | 'exclude';
}

export type TableType = 'classic' | 'pairwise';

export interface ProjectTable {
  id: string;
  name: string;
  type: TableType;
  columns: Column[];
  rows: DynamicRow[];
  autoIdEnabled?: boolean;
  autoIdColumnId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  tables: ProjectTable[];
  createdAt: number;
  updatedAt: number;
}
