# Vibe Coding Canvas

> **Why.** "Vibe coding" — describing what you want in natural language and getting working UI — is the hottest trend of 2025. This canvas lets you type component descriptions in Korean or English and instantly see a live preview with generated HTML/CSS code. No AI API needed — pure template-based pattern matching.

## Features

- **10 component types** — 버튼/button, 카드/card, 폼/form, 테이블/table, 네비게이션/nav, 히어로/hero, 모달/modal, 리스트/list, 프로필/profile, 대시보드/dashboard.
- **Style modifiers** — 둥근/rounded, 그라데이션/gradient, 네온/neon, 글래스/glass, 미니멀/minimal, 애니메이션/animated, 어두운/dark, 밝은/light, 큰/large, 작은/small.
- **Color keywords** — 빨간/red, 파란/blue, 초록/green, 보라/purple, 노란/yellow.
- **Nesting** — "카드 안에 버튼 2개" generates a card containing 2 buttons.
- **Live preview** — sandboxed iframe renders generated output instantly.
- **Syntax-highlighted code** — view and copy generated HTML/CSS.
- **History** — last 10 generations stored in localStorage.
- **Preset gallery** — click any component button to auto-fill a template.
- **Zero deps** — opens with `file://`.

## Usage

```
start browser\index.html
```

Try: `파란색 그라데이션 버튼 3개가 있는 카드` or `네온 스타일 로그인 폼`

## File structure

```
browser/
  index.html   — split layout, input panel, preview, code viewer
  styles.css   — neon gradient theme, glassmorphism, syntax colors
  app.js       — Parser, Templates, ComponentGenerator, HistoryManager
```

## Stack

HTML · CSS · JavaScript
