## Column Definition Base Interface

```typescript
// shared/models/common/common.ts
interface CommonColumnDefs {
  checkboxSelection?: boolean | ((value: CellRendererParams) => boolean)
  headerCheckboxSelection?: boolean
  autoHeight?: boolean
  displayName?: string
  aliasField?: string
  cellRenderer?: string | React.ComponentType
  cellRendererParams?: (params: any) => any
  filter?: GridFilter.Text | GridFilter.Number | GridFilter.Date
  sortable?: boolean
  flex?: number
  minWidth?: number
  width?: number
  hide?: boolean
  pinned?: 'left' | 'right'
}
```

## Renderer Catalog Organization

```
shared/components/commons/grid/cell-renderer/
├── button/
│   ├── ActionButtonsRenderer.tsx      # Multi-action buttons
│   ├── ApprovalButtonsRenderer.tsx    # Approve/reject flows
│   ├── MultiButtonsRenderer.tsx       # Configurable button array
│   ├── SearchButton.tsx
│   ├── TextButtonRenderer.tsx
│   └── DeleteButton.tsx
├── data-display/
│   ├── AvailabilityCellRenderer.tsx   # Status indicators
│   ├── TickIcon.tsx                    # Boolean checkmark
│   ├── EllipsisCellRenderer.tsx       # Text overflow + tooltip
│   ├── CountNumberRenderer.tsx
│   └── DatePickerCellRenderer.tsx
├── form-editor/
│   ├── DropdownCellRenderer.tsx       # Inline select
│   ├── GroupTreeSelectRenderer.tsx     # Hierarchical select
│   └── TextDropdownCellRenderer.tsx
├── chart/
│   ├── GridChart.tsx                  # Inline sparklines
│   ├── GridChartDetail.tsx
│   └── MaxUtilizationChart.tsx
└── specialized/
    ├── ColorThemeRenderer.tsx
    ├── BookmarkRenderer.tsx
    └── AlarmSeverityDivRenderer.tsx
```

## Renderer Implementation Pattern

### Button Renderer

```tsx
interface MultiButtonsPropsData {
  label: string
  type: TypeButtonVariant
  onClick: () => void
  disabled?: boolean
  icon?: React.ReactNode
}

interface MultiButtonsRendererProps {
  value: MultiButtonsPropsData[]
}

const MultiButtonsRenderer: React.FC<MultiButtonsRendererProps> = ({ value }) => {
  return (
    <div className="cell-buttons">
      {value.map((btn, idx) => (
        <Button key={idx} type={btn.type} onClick={btn.onClick} disabled={btn.disabled}>
          {btn.icon}{btn.label}
        </Button>
      ))}
    </div>
  )
}
```

### Data Display Renderer

```tsx
const EllipsisCellRenderer: React.FC<ICellRendererParams> = ({ value, colDef }) => {
  return (
    <Tooltip title={value}>
      <span className="ellipsis-cell">{value}</span>
    </Tooltip>
  )
}
```

## Column Definition Usage

```tsx
const columnDefs: CommonColumnDefs[] = useMemo(() => [
  {
    field: 'name',
    displayName: tt('cmm.name'),
    cellRenderer: EllipsisCellRenderer,
    flex: 2,
    sortable: true,
    filter: GridFilter.Text,
  },
  {
    field: 'status',
    displayName: tt('cmm.status'),
    cellRenderer: AvailabilityCellRenderer,
    width: 100,
  },
  {
    field: 'actions',
    displayName: '',
    cellRenderer: MultiButtonsRenderer,
    cellRendererParams: (params) => ({
      value: [
        { label: tt('cmm.edit'), type: 'link', onClick: () => handleEdit(params.data) },
        { label: tt('cmm.delete'), type: 'link', onClick: () => handleDelete(params.data) },
      ],
    }),
    pinned: 'right',
    width: 150,
  },
], [])
```

## Key Design Decisions

1. **Category-based organization** — renderers grouped by function (button, display, editor, chart) for discoverability
2. **CommonColumnDefs base** — typed column definitions shared across all grids, extended per domain
3. **`cellRendererParams` as function** — enables dynamic prop injection from row data
4. **`displayName` + `tt()`** — all column headers go through i18n translation
5. **92 renderers at scale** — this catalog approach keeps renderers reusable rather than inline
