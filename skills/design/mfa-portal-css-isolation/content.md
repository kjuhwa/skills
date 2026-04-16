## Webpack CSS rule (isolated)

```js
// AI Portal CSS: Tailwind CSS v4 via PostCSS
{
    test: /\.css$/,
    include: path.resolve(__dirname, 'shared/components/commons/ai-portal'),
    use: [
        {
            loader: 'style-loader',
            options: { injectType: 'lazyStyleTag' },
        },
        {
            loader: 'css-loader',
            options: { importLoaders: 1, import: false },
        },
        {
            loader: 'postcss-loader',
            options: {
                postcssOptions: {
                    plugins: [
                        '@tailwindcss/postcss',
                        [require.resolve('postcss-prefix-selector'), { /* transform below */ }],
                    ],
                },
            },
        },
    ],
},
// Main CSS rule MUST exclude the same path
{
    test: /\.css$/,
    exclude: path.resolve(__dirname, 'shared/components/commons/ai-portal'),
    use: [/* standard css pipeline */],
},
```

## Selector transform function

```js
{
    prefix: ':where(.nds-root)',
    transform: (prefix, selector, prefixedSelector, filePath, rule) => {
        // @keyframes, @property, @font-face — leave untouched
        if (rule.parent?.type === 'atrule' &&
            ['keyframes', 'property', 'font-face'].includes(rule.parent.name)) {
            return selector;
        }
        // Token scoping: :root, :host → :where(.nds-theme)
        if (selector === ':root' || selector === ':host') {
            return ':where(.nds-theme)';
        }
        // Theme attributes: [data-theme="dark"] → :where(.nds-theme)[data-nds-theme="dark"]
        if (selector.startsWith('[data-theme=')) {
            return selector.replace(/^\[data-theme=/, ':where(.nds-theme)[data-nds-theme=');
        }
        // Class selectors: descendant + self
        if (selector.startsWith('.')) {
            return `${prefixedSelector}, ${prefix}${selector}`;
        }
        // Everything else (*, ::before, ::after): descendant only
        return prefixedSelector;
    },
}
```

### Why `:where()` wrapper

`:where()` has **zero specificity**, so:
- Tailwind utilities inside the scope don't win specificity battles against host styles
- Host styles can override scoped styles without `!important`
- Scoped styles only apply within elements that have `.nds-root` ancestor

## NdsPortalProvider implementation

```tsx
import { Portal } from '@headlessui/react'

// Portal.Group is not publicly exported in types
const PortalGroup = Portal.Group as React.FC<{
    target: React.MutableRefObject<HTMLElement | null>
    children: React.ReactNode
}>

export const NdsPortalProvider: React.FC<{ theme?: string; children: React.ReactNode }> = ({
    theme, children
}) => {
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
    const portalRef = useRef<HTMLElement | null>(null)

    // Create portal root on body (useLayoutEffect to avoid flicker)
    useLayoutEffect(() => {
        const existing = document.getElementById('nds-portal-root')
        if (existing) {
            portalRef.current = existing
            setPortalRoot(existing)
            return
        }
        const root = document.createElement('div')
        root.id = 'nds-portal-root'
        root.className = 'nds-root nds-theme'
        if (theme) root.dataset.ndsTheme = theme
        document.body.appendChild(root)
        portalRef.current = root
        setPortalRoot(root)
        return () => { document.body.removeChild(root) }
    }, [])

    // Sync theme changes
    useEffect(() => {
        if (!portalRoot) return
        if (theme) portalRoot.dataset.ndsTheme = theme
        else delete portalRoot.dataset.ndsTheme
    }, [theme, portalRoot])

    if (!portalRoot) return null

    return (
        <NdsPortalContext.Provider value={portalRoot}>
            <PortalGroup target={portalRef}>
                {children}
            </PortalGroup>
        </NdsPortalContext.Provider>
    )
}
```

## How the pieces connect

1. **postcss-prefix-selector** rewrites CSS at build time:
   - `.btn` → `:where(.nds-root) .btn, :where(.nds-root).btn`
   - `:root { --color-bg: #fff }` → `:where(.nds-theme) { --color-bg: #fff }`
   - `[data-theme="dark"]` → `:where(.nds-theme)[data-nds-theme="dark"]`

2. **Main component tree** wrapped in `<div class="nds-root nds-theme">`:
   - Satisfies `:where(.nds-root)` for all descendant selectors
   - Satisfies `:where(.nds-theme)` for token variables

3. **Portal root** on `<body>` also has `class="nds-root nds-theme"`:
   - Overlays get the same CSS scope without being DOM children of the main tree
   - `data-nds-theme` synced for dark/contrast mode

4. **lazyStyleTag** ensures CSS is injected only when the module mounts:
   - No Tailwind pollution when the module is imported but not rendered
