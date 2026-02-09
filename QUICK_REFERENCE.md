# 📚 Краткая справка по файлам

## Где что находится?

### 🎨 Компоненты UI
📍 **Расположение:** `src/components/`

| Файл | Что делает |
|---|---|
| `Badge.tsx` | Компонент для отображения статусов/тегов |
| `Modals/` | Папка для модальных окон (в разработке) |

**Импорт:**
```typescript
import { Badge } from './src/components';
```

---

### 🪝 Custom Hooks (Состояние & Логика)
📍 **Расположение:** `src/hooks/`

| Hook | Что делает |
|---|---|
| `useFolders()` | Управление папками и таблицами (MAIN HOOK) |
| `useTableData()` | Операции с таблицами (альтернатива) |
| `useColumnStats()` | Расчет статистики по колонкам |

**Импорт:**
```typescript
import { useFolders, useColumnStats } from './src/hooks';

const { folders, createFolder } = useFolders();
const stats = useColumnStats(activeTable);
```

---

### 🔧 Утилиты (Функции без состояния)
📍 **Расположение:** `src/utils/`

| Файл | Функции |
|---|---|
| `validation.ts` | `validateSegments()` — валидация текста |
| `formatting.ts` | `formatDate()`, `truncate()`, `sanitizeFilename()`, `normalizeLabel()` |
| `csv.ts` | `parseCSV()`, `stringifyCSV()` — работа с CSV |

**Импорт:**
```typescript
import { formatDate, truncate } from './src/utils';
import { validateSegments } from './src/utils/validation';
```

---

### 📋 Types & Constants
📍 **Расположение:** `src/`

| Файл | Содержит |
|---|---|
| `types.ts` | Интерфейсы: `Column`, `DynamicRow`, `ProjectTable`, `Folder` |
| `constants.ts` | Лимиты и пределы: `NAME_LIMIT`, `SEGMENT_CHAR_LIMIT` и т.д. |

**Импорт:**
```typescript
import { ProjectTable, Column, Folder } from './src/types';
import { NAME_LIMIT, ROWS_PER_PAGE } from './src/constants';
```

---

## 🔍 Как найти нужную функцию?

### Нужна функция для работы со строками?
→ Смотри `src/utils/formatting.ts`
- `truncate()` - обрезать текст
- `normalizeLabel()` - привести к нижнему регистру
- `sanitizeFilename()` - очистить имя файла

### Нужна валидация?
→ Смотри `src/utils/validation.ts`
- `validateSegments()` - проверить размер сегментов

### Нужно управлять папками/таблицами?
→ Используй `useFolders()` из `src/hooks/`
```typescript
const { folders, createFolder, deleteFolder } = useFolders();
```

### Нужна статистика по колонкам?
→ Используй `useColumnStats()` из `src/hooks/`
```typescript
const stats = useColumnStats(activeTable);
```

### Нужно работать с CSV?
→ Смотри `src/utils/csv.ts`
- `parseCSV()` - преобразовать текст в массив
- `stringifyCSV()` - преобразовать массив в CSV

---

## 📖 Полная документация

- **Структура проекта:** [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Руководство разработчика:** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **Отчет о рефакторинге:** [REFACTORING_REPORT.md](./REFACTORING_REPORT.md)

---

## 🎯 Типичные сценарии

### Сценарий 1: Добавить новую функцию форматирования
1. Открыть `src/utils/formatting.ts`
2. Добавить функцию
3. Использовать везде: `import { myFunc } from './src/utils'`

### Сценарий 2: Создать новый компонент
1. Создать `src/components/MyComponent.tsx`
2. Добавить в `src/components/index.ts`: `export { MyComponent } from './MyComponent'`
3. Использовать: `import { MyComponent } from './src/components'`

### Сценарий 3: Добавить новый hook
1. Создать `src/hooks/useMyHook.ts`
2. Добавить в `src/hooks/index.ts`: `export { useMyHook } from './useMyHook'`
3. Использовать: `import { useMyHook } from './src/hooks'`

---

## ⚡ Быстрые ссылки

```typescript
// Форматирование
import { formatDate, truncate } from './src/utils';

// Валидация
import { validateSegments } from './src/utils';

// CSV
import { parseCSV, stringifyCSV } from './src/utils';

// Hooks
import { useFolders, useColumnStats } from './src/hooks';

// Типы
import { ProjectTable, Column } from './src/types';

// Константы
import { NAME_LIMIT, ROWS_PER_PAGE } from './src/constants';

// UI Компоненты
import { Badge } from './src/components';
```

---

**Помните:** Если не уверены где что-то находится, ищите в `src/` в соответствующей папке! 🔍
