# 🤖 Copilot Instructions for Rafoz Matrix Manager

## Большая картина
- UI и состояние централизованы в [src/App.tsx](src/App.tsx): навигация по папкам/таблицам, модалки, фильтры, импорт/экспорт, CRUD строк/колонок.
- Каноническая модель данных — [src/types.ts](src/types.ts): `Folder` → `ProjectTable` → `DynamicRow`, плюс `Column`, `ActiveFilter`, `TableType`.
- Лимиты/пагинация живут только в [src/constants.ts](src/constants.ts). Не хардкодить числа.
- Форматирование/CSV/валидация в [src/utils](src/utils): `truncate()`, `formatDate()`, `sanitizeFilename()`, `parseCSV()`, `stringifyCSV()`, `validateSegments()`.

## Данные и потоки
- Основное состояние хранится в localStorage под ключом `rafoz_data` (папки/таблицы/строки), UI‑флаг — `rafoz_sidebar_collapsed` (см. [src/App.tsx](src/App.tsx)).
- Выбор активной таблицы идёт через `activeFolderId`/`activeTableId`; фильтрация = deferred‑поиск + `ActiveFilter` include/exclude.
- CSV импорт/экспорт — [src/utils/csv.ts](src/utils/csv.ts); имена файлов нормализуются `sanitizeFilename()` из [src/utils/formatting.ts](src/utils/formatting.ts).

## Доменные правила и UI‑конвенции
- Все лимиты ввода/отображения берём из [src/constants.ts](src/constants.ts) и визуально подсвечиваем в UI.
- В таблицах текст обрезается `truncate(..., TABLE_CELL_LIMIT)`, полный текст показывается в Record View (см. [src/App.tsx](src/App.tsx)).
- Pairwise‑режим: ввод с `/` валидируется `validateSegments()` и генерирует комбинации сегментов (детали в [README.md](README.md)).
- Auto‑ID: при создании таблицы может появиться ID‑колонка; её нельзя удалить, значения read‑only (см. [src/App.tsx](src/App.tsx)).
- Для статусов/лейблов использовать [src/components/Badge.tsx](src/components/Badge.tsx).

## Workflow
- Установка: `npm install`.
- Dev: `npm run dev` (Vite, http://localhost:3000).
- Build: `npm run build` (сначала `tsc`). Preview: `npm run preview`.
- Docker: `docker compose up --build` (stage), `docker compose --profile dev up --build`, `docker compose --profile prod up --build` (см. [README.md](README.md)).
- Тестов нет; стандартные Vite/TypeScript скрипты в [package.json](package.json).
- Стек: React 19 + Vite + TailwindCSS (Tailwind подключён через [index.html](index.html)).

Если что-то неясно (например, конкретный поток или модалка), скажите — уточню и обновлю.
