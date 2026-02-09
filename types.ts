// Deprecated: use src/types.ts
export * from './src/types';

export interface ProjectTable {
  id: string;
  name: string;
  type: TableType;
  columns: Column[];
  rows: DynamicRow[];
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  description: string;
  tables: ProjectTable[];
  createdAt: number;
  updatedAt: number;
}
