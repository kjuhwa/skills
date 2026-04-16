## Token naming rules

```js
const NAME_RULES = [
    { match: p => p[0] === 'color',            fn: p => `--color-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'brand-secondary',   fn: p => `--color-brand-secondary-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'brand',             fn: p => `--color-brand-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'sizing',            fn: p => `--sizing-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'spacing',           fn: p => `--spacing-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'borderRadius',      fn: p => `--radius-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'borderWidth',       fn: p => `--border-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'opacity',           fn: p => `--opacity-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'boxShadow',         fn: p => `--shadow-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'fontFamily',        fn: p => `--font-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'fontWeight',        fn: p => `--font-weight-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'brand-fontSize',    fn: p => `--text-${p.slice(1).join('-')}` },
    { match: p => p[0] === 'brand-lineHeight',  fn: p => `--text-${p[1]}--line-height` },
    { match: p => p[0] === 'brand-letterSpacing',fn: p => `--text-${p[1]}--letter-spacing` },
    { match: p => THEME_CATEGORIES.has(p[0]),   fn: p => `--color-${p.join('-')}` },
];
```

Theme categories: background, layer, field, border, text, link, icon, feedback, interactive, focus, skeleton, overlay, chip, tag, badge, toggle, tooltip, notification, codeblock, prompt-input, chatting-bubble.

## SD v5 configuration

```js
import StyleDictionary from 'style-dictionary';
import { register, permutateThemes } from '@tokens-studio/sd-transforms';

await register(StyleDictionary, {
    'ts/color/modifiers': { format: 'hex' },
});

StyleDictionary.registerTransform({
    name: 'name/custom-css',
    type: 'name',
    transform: (token) => tokenName(token.path),
});

const sd = new StyleDictionary({
    source: sets.map(s => resolve(ROOT, TOKENS_DIR, `${s}.json`)),
    preprocessors: ['tokens-studio'],
    log: { verbosity: 'silent' },
    platforms: {
        css: {
            transforms: [
                'ts/descriptionToComment', 'ts/resolveMath', 'ts/size/px',
                'ts/opacity', 'ts/size/lineheight', 'ts/typography/fontWeight',
                'ts/color/modifiers', 'ts/color/css/hexrgba',
                'ts/size/css/letterspacing', 'ts/shadow/innerShadow',
                'shadow/css/shorthand', 'border/css/shorthand',
                'typography/css/shorthand', 'name/custom-css',
            ],
        },
    },
});

const dict = await sd.exportPlatform('css');
```

## Dark/Contrast override diffing

Only variables that differ from light theme are emitted:

```js
function buildOverrideVars(lightVarMap, overrideTokens) {
    const overrideVarMap = new Map();
    for (const token of overrideTokens) {
        const name = tokenName(token.path);
        const value = formatValue(token);
        overrideVarMap.set(name, value);
    }
    const diffVars = [];
    for (const [name, value] of overrideVarMap) {
        if (lightVarMap.get(name) !== value) {
            diffVars.push([name, value]);
        }
    }
    return diffVars;
}
```

## Breaking change detection

```js
function detectBreakingChanges(outputAbs, newCss) {
    if (!existsSync(outputAbs)) return null;
    const oldCss = readFileSync(outputAbs, 'utf-8');
    const oldVars = extractVarNames(oldCss);  // parse @theme {} block
    const newVars = extractVarNames(newCss);
    const removed = [...oldVars].filter(v => !newVars.has(v));
    const added = [...newVars].filter(v => !oldVars.has(v));
    return { removed, added };
}
// Prints: grep -rn --include="*.tsx" --include="*.css" -E "removed-tokens" src/
```

## Typography composition

Brand font-size, line-height, and letter-spacing composed as triplets:

```js
function buildTypographyVars(groups) {
    const fsTokens = groups.get('brand-fontSize') || [];
    const lhMap = new Map(lhTokens.map(t => [t.path[1], t]));
    const lsMap = new Map(lsTokens.map(t => [t.path[1], t]));

    for (const fs of fsTokens) {
        const role = fs.path[1];
        vars.push([`--text-${role}`, formatValue(fs)]);
        if (lhMap.has(role)) vars.push([`--text-${role}--line-height`, ...]);
        if (lsMap.has(role)) vars.push([`--text-${role}--letter-spacing`, ...]);
    }
}
```

Output:
```css
--text-body-01: 14px;
--text-body-01--line-height: 1.43;
--text-body-01--letter-spacing: 0em;
```

## Dependencies

```json
{
    "style-dictionary": "^4.x (v5 API with exportPlatform)",
    "@tokens-studio/sd-transforms": "latest (register + permutateThemes)"
}
```
