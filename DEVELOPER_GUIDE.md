# 🎯 Developer Guide - Новая структура проекта

## Быстрый старт

### Импорт компонентов
```typescript
// ❌ Старый способ (ещё работает)
import { Badge } from './src/components/Badge';

// ✅ Новый способ (рекомендуется)
import { Badge } from './src/components';

// ✅ Супер-новый способ (из главного индекса)
import { Badge } from './src';
```

### Импорт утилит
```typescript
// ✅ Всё работает
import { formatDate, truncate } from './src/utils';
import { formatDate, truncate } from './src';
```

### Импорт hooks
```typescript
// ✅ Используйте так
import { useFolders, useTableData } from './src/hooks';
import { useFolders, useTableData } from './src';
```

---

## 📚 Основные hooks

### `useFolders()` - Управление папками
```typescript
const {
  folders,           // Все папки
  createFolder,      // (name: string) => void
  deleteFolder,      // (folderId: string) => void
  updateFolder,      // (folderId, updates) => void
  createTableInFolder,    // (folderId, name, type) => void
  deleteTableFromFolder,  // (folderId, tableId) => void
  updateTableInFolder     // (folderId, tableId, updates) => void
} = useFolders();
```

### `useColumnStats()` - Статистика по колонкам
```typescript
const stats = useColumnStats(activeTable);
// stats = {
//   columnId: {
//     counts: { "value1": 5, "value2": 3 },
//     emptyCount: 2
//   }
// }
```

### `useTableData()` - Операции с таблицами (deprecated - используйте useFolders)
```typescript
const {
  tables,
  createTable,
  deleteTable,
  updateTable,
  addColumn,
  deleteColumn,
  addRow,
  updateRow
} = useTableData(folderId);
```

---

## 🛠 Утилиты

### Валидация
```typescript
import { validateSegments } from './src/utils';

const { isValid, invalidSegments } = validateSegments('value1 / value2');
```

### Форматирование
```typescript
import { formatDate, truncate, sanitizeFilename, normalizeLabel } from './src/utils';

formatDate(Date.now());           // "08.02.2026"
truncate('Long text', 10);        // "Long te..."
sanitizeFilename('файл@123.csv'); // "файл_123.csv"
normalizeLabel('  BIG Text  ');   // "big text"
```

### CSV
```typescript
import { parseCSV, stringifyCSV } from './src/utils';

const rows = parseCSV(csvText);      // string[][] 
const csv = stringifyCSV(rows);      // string
```

---

## 🎨 Компоненты

### Badge
```typescript
import { Badge } from './src/components';

<Badge variant="primary">Status</Badge>
<Badge variant="secondary">Tag</Badge>
```

---

## ✅ Что дальше?

### Следующие шаги по рефакторингу:

1. **Модальные окна** (в `src/components/Modals/`)
   ```
   CreateFolderModal.tsx
   CreateTableModal.tsx
   RenameTableModal.tsx
   AddRowModal.tsx
   EditRowModal.tsx
   AddColumnModal.tsx
   ```

2. **Основные компоненты представлений**
   ```
   src/components/TableView.tsx      - Главная таблица
   src/components/Sidebar.tsx         - Фильтры (уже пересмотреть)
   src/components/FolderList.tsx      - Список папок
   src/components/TableList.tsx       - Список таблиц в папке
   ```

3. **Дополнительные hooks**
   ```
   src/hooks/useFilters.ts           - Фильтрация
   src/hooks/usePagination.ts        - Пагинация
   src/hooks/useSelection.ts         - Выделение строк
   ```

---

## 💡 Когда добавлять новые файлы?

| Что добавляю | Куда | Пример |
|---|---|---|
| Новая функция валидации | `src/utils/validation.ts` | `validateEmail()` |
| Новое форматирование | `src/utils/formatting.ts` | `formatCurrency()` |
| UI компонент | `src/components/Name.tsx` | `<SearchBar />` |
| Модальное окно | `src/components/Modals/XyzModal.tsx` | `<DeleteModal />` |
| Бизнес-логика с состоянием | `src/hooks/useXyz.ts` | `useSearch()` |

---

## 🚀 Примеры использования

### Пример: Добавить новую функцию форматирования

1. Добавить в `src/utils/formatting.ts`:
```typescript
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(amount);
};
```

2. Использовать в компоненте:
```typescript
import { formatCurrency } from './src/utils';

<div>{formatCurrency(1000)}</div> // "1 000,00 ₽"
```

### Пример: Создать новый hook

1. Создать `src/hooks/useSearch.ts`:
```typescript
import { useState, useCallback } from 'react';

export const useSearch = (items: any[], searchKey: string) => {
  const [query, setQuery] = useState('');
  
  const results = items.filter(item =>
    item[searchKey].toLowerCase().includes(query.toLowerCase())
  );
  
  return { query, setQuery, results };
};
```

2. Экспортировать в `src/hooks/index.ts`:
```typescript
export { useSearch } from './useSearch';
```

3. Использовать в компоненте:
```typescript
import { useSearch } from './src/hooks';

const { query, setQuery, results } = useSearch(tables, 'name');
```

---

## 📋 Структура App.tsx (после рефакторинга)

```typescript
import { useFolders } from './hooks';
import { FolderList, TableView, Sidebar } from './components';

export default function App() {
  const { folders, createFolder, deleteFolder, ... } = useFolders();
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  
  return (
    <div className="flex">
      <Sidebar folders={folders} />
      <TableView />
      {/* Модалки */}
    </div>
  );
}
```

---

**Помните:** Регулярный рефакторинг = счастливый код! 🎉
