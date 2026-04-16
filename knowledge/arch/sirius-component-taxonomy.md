---
name: sirius-component-taxonomy
description: Sirius design system (@nkia/sirius) organizes 200+ components into 5 categories — data-display, data-entry, feedback, layout, navigation
category: arch
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Sirius Design System Component Taxonomy

## Fact

The `@nkia/sirius` package (v0.2.21) provides 200+ React components organized into 5 categories following Ant Design's categorization model. Components are consumed via direct source imports, not compiled packages.

## Categories

### data-display/ (visualization & read-only)
AlarmCard, Avatar, Badge, Card, CardSummary, Chart, ChartLegendGrid, EqualizerChart, HexagonChart, Collapse, CollapsePanel, Descriptions, DescriptionsForm, Grid, GridPercentBar, Popover, PopConfirm, Progress, Slider, Segmented, Tabs, Tag, TagFilterList, Tooltip, Tour, Tree

### data-entry/ (forms & input)
AutoComplete, Button, CascadingSelect, CheckboxGroup, CheckboxMulti, CheckboxSingle, CodeEditor, ColorPicker, DatePicker, Dropdown, DropdownButton, DropdownSearch, FileUpload, Form, FormItem, FormTable, Input, InputNumber, JsonViewer, Radio, RangePicker, Select, Switch, TextArea, TimePicker, Toggle, Upload

### feedback/ (user notifications)
Confirm, Drawer (basic, preset, resizable), Empty, InfoBox, LoadingDot, Message, Modal, Spin

### layout/ (structure & spacing)
Col, Row, Divider, Space, FormTitleTemplate, GridTitleTemplate, Layout variants (Layout_h2, Layout_h3, Layout_v2–v10), Titlebar

### navigation/ (routing & wayfinding)
Anchor, Breadcrumb, Menu, Pagination, TextLink, Wizard

## Import Pattern

```typescript
// Direct source import (not compiled)
import { Button, Tabs, Icon } from '@nkia/sirius/src/components'
```

## Evidence

- `packages/sirius/src/components/index.ts`: barrel export of all 200+ components
- `packages/sirius/src/styles/components/`: matching SCSS per component category
- `packages/sirius/src/components/hoc/`: HOCs (withAccess, withCellEditorValueChange)
- Used by all 25 remotes + host via workspace dependency
