## Config file

`figma.config.json` at project root:

```json
{
    "codeConnect": {
        "parser": "react",
        "include": [
            "shared/components/commons/ai-portal/**/*.figma.tsx",
            "shared/components/commons/ai-portal/**/*.tsx"
        ],
        "exclude": ["node_modules/**", "temp/**"]
    }
}
```

## File naming convention

```
components/
  primitives/
    Button.tsx           ← runtime component
  figma/
    Button.figma.tsx     ← Code Connect mapping (not bundled in prod)
```

## Mapping pattern

### Basic props with enum mapping

```tsx
import figma from '@figma/code-connect'
import { Button } from '../primitives/Button'

const FIGMA_URL = 'https://www.figma.com/file/XXXX?node-id=YYYY'

const sharedProps = {
    tone: figma.enum('tone', {
        primary: 'primary' as const,
        secondary: 'secondary' as const,
        danger: 'danger' as const,
    }),
    size: figma.enum('size', {
        sm: 'sm' as const,
        md: 'md' as const,
        lg: 'lg' as const,
    }),
    disabled: figma.enum('disabled', {
        true: true,
        false: undefined,  // omit prop when false
    }),
}
```

### Variant-filtered connections

One Figma component can have multiple `figma.connect()` calls filtered by variant:

```tsx
// Text button variant
figma.connect(Button, FIGMA_URL, {
    variant: { iconOnly: 'false' },
    props: {
        ...sharedProps,
        children: figma.string('label'),
        iconStart: figma.boolean('leadingIcon', {
            true: figma.instance('LeadingIcon'),
            false: undefined,
        }),
    },
    example: ({ tone, size, children, iconStart }) => (
        <Button tone={tone} size={size} iconStart={iconStart}>
            {children}
        </Button>
    ),
})

// Icon-only variant
figma.connect(Button, FIGMA_URL, {
    variant: { iconOnly: 'true' },
    props: {
        ...sharedProps,
        iconOnly: figma.instance('iconSlot'),
    },
    example: ({ tone, size, iconOnly }) => (
        <Button tone={tone} size={size} iconOnly={iconOnly} />
    ),
})
```

### Boolean → optional instance

```tsx
iconStart: figma.boolean('leadingIcon', {
    true: figma.instance('LeadingIcon'),  // render the instance
    false: undefined,                      // omit the prop
})
```

## Tips

- Use `as const` on enum values to preserve literal types
- `undefined` in enum/boolean maps means "omit this prop" in the generated code
- `sharedProps` pattern avoids duplication across variant connections
- Figma URL `node-id` parameter identifies the specific component frame
