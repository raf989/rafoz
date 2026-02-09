# 📁 Project Structure

```
rafoz-matrix-manager/
├── src/
│   ├── components/
│   │   ├── Badge.tsx              # Reusable badge component
│   │   ├── Modals/                # All modal windows
│   │   │   └── (reserved)         # Modals are still in App.tsx
│   │   └── index.ts               # Component exports
│   │
│   ├── hooks/
│   │   ├── useTableData.ts        # Main state management hook
│   │   ├── useColumnStats.ts      # Column statistics
│   │   ├── useFolders.ts          # Folder operations
│   │   └── index.ts               # Hook exports
│   │
│   ├── utils/
│   │   ├── validation.ts          # validateSegments()
│   │   ├── formatting.ts          # formatDate(), truncate(), etc
│   │   ├── csv.ts                 # parseCSV(), stringifyCSV()
│   │   └── index.ts               # Utils exports
│   │
│   ├── types.ts                   # TypeScript interfaces
│   ├── constants.ts               # App constants
│   ├── App.tsx                    # Main component (coordinates everything)
│   ├── index.tsx                  # Entry point
│   └── index.ts                   # Barrel exports
│
├── index.html                     # HTML template
├── index.tsx                       # Deprecated (use src/index.tsx)
├── vite.config.ts                 # Vite configuration
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
└── README.md                      # Project documentation
```

## 📂 What's in each folder?

### `src/components/`
- **Badge.tsx** - UI component for badges/status indicators
- **Modals/** - reserved folder (modals are still inside `App.tsx`)
- **index.ts** - Barrel export for cleaner imports

### `src/hooks/`
- **useTableData.ts** - Custom hook for table state management
- **useColumnStats.ts** - Hook for calculating column statistics
- **useFolders.ts** - Hook for folder CRUD operations
- **index.ts** - Barrel export

### `src/utils/`
- **validation.ts** - Form validation functions
- **formatting.ts** - Text formatting utilities
- **csv.ts** - CSV parsing and stringification
- **index.ts** - Barrel export for easier imports

## 🔄 Migration Progress

✅ **Done:**
- ✅ Created src/ folder structure
- ✅ Moved types to src/types.ts
- ✅ Moved constants to src/constants.ts
- ✅ Extracted utils functions to separate files
- ✅ Updated imports in App.tsx
- ✅ Created index files for exports

⏳ **Next Steps:**
- [ ] Extract modal components from monolithic App.tsx
- [ ] Extract table view component
- [ ] Extract sidebar component

## 💡 How to add new features

1. **New utility function?** → Add to `src/utils/[category].ts`
2. **New component?** → Create `src/components/YourComponent.tsx`
3. **New modal?** → Create `src/components/Modals/YourModal.tsx`
4. **New business logic?** → Create hook in `src/hooks/useYourFeature.ts`

## 📦 Import Examples

```typescript
// Old way (still works):
import { Badge } from './src/components/Badge';
import { formatDate } from './src/utils/formatting';

// New way (recommended):
import { Badge } from './src/components';
import { formatDate } from './src/utils';
```
