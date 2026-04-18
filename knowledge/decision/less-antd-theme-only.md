---
version: 0.1.0-draft
tags: [decision, less, antd, theme, only]
name: less-antd-theme-only
category: decision
summary: LESS files (71 total) and less-loader exist solely for Ant Design modifyVars theming — LESS is not a general-purpose styling choice in this project
source:
  kind: project
  ref: lucida-ui@4b922a90
evidence:
  - webpack.base.js lines 302-326 — less-loader config with modifyVars for primary-color, link-color, border-radius-base
  - 71 .less files found, all Ant Design related
  - No custom .less files outside Ant Design context
---

# LESS Usage: Ant Design Theme Customization Only

## Fact

The project contains 71 `.less` files and configures `less-loader` in webpack — but this is **exclusively** for Ant Design's theming mechanism (`modifyVars`). LESS is not used as a general-purpose stylesheet language.

Webpack config:
```js
{
    loader: 'less-loader',
    options: {
        lessOptions: {
            modifyVars: {
                'primary-color': '#1DA57A',
                'link-color': '#1DA57A',
                'border-radius-base': '2px',
            },
            javascriptEnabled: true,
        },
    },
}
```

## Why

Ant Design v4 uses LESS for its theme system. The `modifyVars` option is the official way to customize Ant Design's design tokens without ejecting. The project chose to keep this minimal rather than extending LESS usage to custom components.

## How to apply

- **Never write new `.less` files** for custom components — use SCSS (for sirius layer) or Tailwind CSS (for AI Portal)
- LESS config changes affect Ant Design's appearance globally
- `javascriptEnabled: true` is required because Ant Design's LESS uses inline JavaScript expressions
- If migrating away from Ant Design, the entire LESS pipeline can be removed
