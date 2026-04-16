## Token layer structure

```
tokens/
  $metadata.json
  $themes.json
  base/           # palette, font, layout, size → SCSS vars (theme-independent)
  theme/          # light-mode, dark-mode → SCSS vars scoped to .{theme}-theme
  semantic/       # typography → shorthand typography classes
  extend/         # button, drawer, form, grid, modal, tab, etc. → composition classes
```

## Custom transforms

### HSL color modifier
Applies `$extensions` (lighten, alpha, etc.) from Tokens Studio using `@tokens-studio/sd-transforms`:

```js
StyleDictionary.registerTransform({
    name: 'hslhsl',
    type: 'value',
    transitive: true,
    matcher: (token) => token.original['$extensions'] !== undefined,
    transformer: (token) => transformColorModifiers(token),
})
```

### Typography shorthand
Combines fontWeight, fontSize, lineHeight, fontFamily into CSS `font:` shorthand:

```js
function transformTypography(value) {
    const { fontWeight, fontSize, lineHeight, fontFamily } = value
    return `${fontWeight} ${fontSize}/${lineHeight ? lineHeight : fontSize} ${fontFamily}`
}
```

### Composition → CSS property mapper
Maps Figma composition token keys to CSS properties. Handles `fill` → `color` vs `background-color` based on reference path containing "text":

```js
const fillType = (value) => {
    if (inputValue.includes('text')) {
        return `color: ${value};`
    } else {
        return `background-color: ${value};`
    }
}
```

### Font weight name → numeric
Comprehensive map including German variants (leicht, kräftig, halbfett, dreiviertelfett):

```js
const fontWeightMap = {
    thin: 100, extralight: 200, light: 300, normal: 400,
    regular: 400, medium: 500, semibold: 600, bold: 700,
    extrabold: 800, black: 900, heavy: 900,
    // + German variants
}
```

## Auto @import wiring

`contentAppender()` checks for duplicates and empty token files before appending `@import` lines:

```js
function contentAppender(targetFilePath, data, jsonFilePath) {
    const targetFile = fs.readFileSync(targetFilePath, 'utf8')
    const isDuplicate = targetFile.includes(data)
    const jsonFile = fs.readFileSync(jsonFilePath, 'utf8')
    const isEmpty = jsonFile === '{}'
    !isDuplicate && !isEmpty && fs.appendFileSync(targetFilePath, data)
}
```

## Build config pattern

Each layer produces a separate SD config with specific transforms and output format:

```js
// Base tokens → SCSS variables (no theme selector)
getStyleDictionaryConfig(filePath, baseOnly = true)
  → selector: null, destination: `base/_demo_${fileName}.scss`

// Theme tokens → SCSS variables (scoped to theme class)
getStyleDictionaryConfig(filePath, baseOnly = false)
  → selector: `.${fileName}-theme`, destination: `themes/_demo_${fileName}.scss`

// Typography → typography shorthand classes
getTypographyConfig()
  → format: 'css/typographyClasses', destination: `semantic/_demo_typography.scss`

// Components → composition classes
getCompositionConfig(componentFile)
  → format: 'css/compositionClasses', destination: `extend/_demo_${fileName}.scss`
```

## Dependencies

```json
{
    "@tokens-studio/sd-transforms": "^0.5.7",
    "style-dictionary": "3.9.0",
    "color2k": "parseToRgba for hex→rgba conversion"
}
```

## Script

```json
{ "build": "node split-files.js && rm -f ./tokens/theme/dark-mode.json && node build.js" }
```

Note: `dark-mode.json` is explicitly removed before build (dark mode handled separately or not yet supported in this pipeline).
