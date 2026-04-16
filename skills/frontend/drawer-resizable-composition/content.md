## Drawer Base Component

```tsx
type TypeDrawerWidth = 'default' | '1dp' | '2dp' | '3dp' | '4dp' | '5dp' | '6dp' | '7dp' | 'option'

interface TypeDrawerProps {
  width?: TypeDrawerWidth
  open: boolean
  onClose: () => void
  children: React.ReactNode
  presetBtn?: boolean
  minWidth?: string
  maxWidth?: string
  headerRightContent?: React.ReactNode
  resizable?: boolean
  footerConfirmText?: string    // default: 'Save'
  footerCancelText?: string     // default: 'Close'
  onConfirm?: () => void
}

const Drawer: React.FC<TypeDrawerProps> = ({
  width = 'default',
  open,
  onClose,
  children,
  resizable = false,
  ...rest
}) => {
  const widthValue = resolveWidth(width) // maps '1dp'→'24rem', '7dp'→'100%'

  return (
    <div className={`drawer ${open ? 'open' : ''}`} style={{ width: widthValue }}>
      {resizable && <ResizeHandle />}
      <DrawerHeader rightContent={rest.headerRightContent} onClose={onClose} />
      <DrawerBody>{children}</DrawerBody>
      <DrawerActions
        confirmText={rest.footerConfirmText}
        cancelText={rest.footerCancelText}
        onConfirm={rest.onConfirm}
        onCancel={onClose}
      />
    </div>
  )
}
```

## Parent-Child State Composition

Standard pattern for every drawer usage (463+ instances):

```tsx
// Parent component (list/page)
const ParentPage: React.FC = () => {
  const [openDrawer, setOpenDrawer] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const handleOpenDrawer = (item: Item) => {
    setSelectedItem(item)
    setOpenDrawer(true)
  }

  const handleCloseDrawer = () => {
    setOpenDrawer(false)
    setSelectedItem(null)
  }

  return (
    <>
      <DataGrid onRowClick={handleOpenDrawer} />
      {openDrawer && (
        <ItemDetailDrawer
          openDrawer={openDrawer}
          handleCloseDrawer={handleCloseDrawer}
          item={selectedItem}
        />
      )}
    </>
  )
}
```

```tsx
// Child drawer component
interface ItemDetailDrawerProps {
  openDrawer: boolean
  handleCloseDrawer: () => void
  item: Item | null
}

const ItemDetailDrawer: React.FC<ItemDetailDrawerProps> = ({
  openDrawer,
  handleCloseDrawer,
  item,
}) => {
  return (
    <Drawer open={openDrawer} onClose={handleCloseDrawer} width="4dp" resizable>
      <ItemDetailContent item={item} />
    </Drawer>
  )
}
```

## Width Presets

| Preset | Width | Use Case |
|--------|-------|----------|
| `default` | `24rem` | Simple forms, small detail |
| `1dp` | `24rem` | Narrow panels |
| `2dp` | `36rem` | Standard forms |
| `3dp` | `48rem` | Detail views |
| `4dp` | `60rem` | Complex forms with grids |
| `5dp` | `72rem` | Dashboard-like detail |
| `6dp` | `84rem` | Wide content |
| `7dp` | `100%` | Full-screen overlay |
| `option` | `auto` | Content-driven width |

## Key Design Decisions

1. **Drawer > Modal** — drawers keep parent context visible; better for data-heavy UIs
2. **Conditional rendering** — `{openDrawer && <Drawer />}` unmounts on close, clearing state
3. **Preset widths** — `1dp`–`7dp` scale provides consistent sizing vocabulary
4. **Resizable option** — drag handle for user-adjustable width on complex views
5. **Footer actions** — standardized Save/Close buttons via `DrawerActions` component
