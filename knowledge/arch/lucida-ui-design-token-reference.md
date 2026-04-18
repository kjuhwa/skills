---
version: 0.1.0-draft
name: lucida-ui-design-token-reference
type: knowledge
category: arch
tags: [lucida-ui, nds, design-token, sirius, scss, figma]
summary: "lucida-ui 프로젝트의 실제 디자인 토큰 값 참조표 — 팔레트, 시맨틱, 사이즈, 타이포, 컴포넌트 스타일"
source:
  kind: session
  ref: session-2026-04-16
  repo: D:/21_LUCIDA/lucida-ui
confidence: high
linked_skills:
  - nds-html-mockup-from-tokens
  - plan-to-screen-spec-conversion
supersedes: null
extracted_at: 2026-04-16
extracted_by: skills_extract_knowledge v1
---

## Fact
lucida-ui의 디자인 시스템은 Figma Token Studio → Style Dictionary → SCSS 파이프라인으로 생성된다.
Primary 브랜드 색상은 `#004cff` (blue 계열)이며, `--indigo-6`(#3a55b1)과는 다르다.

## Context / Why
- Figma NDS 디자인 시스템과 코드 사이의 토큰 매핑을 정확히 알아야 목업/코드 생성 시 실제 제품과 동일한 룩앤필 재현 가능
- SCSS 변수($)와 CSS 변수(--)가 혼재: 팔레트는 CSS 변수, 시맨틱 토큰은 SCSS 변수로 정의

## Evidence
- `packages/sirius/src/styles/base/_palette.scss` — CSS 변수 팔레트
- `packages/sirius/src/styles/tokens/themes/_demo_light-mode.scss` — 시맨틱 토큰 (SCSS)
- `packages/sirius/src/styles/tokens/base/_demo_size.scss` — spacing, border-radius
- `packages/sirius/src/styles/tokens/base/_demo_font.scss` — typography
- `packages/sirius/src/styles/base/fonts/_font.scss` — @font-face
- `packages/sirius/src/styles/components/antd/*.scss` — 컴포넌트 오버라이드

## Applies when
- lucida-ui 기반 화면 개발 또는 HTML 목업 생성
- NDS 컴포넌트 스타일 참조가 필요할 때
- 디자인 토큰을 코드에 매핑할 때

## Token Reference

### 팔레트 (CSS 변수, _palette.scss)
```
--white: #ffffff / --black: #000000
--indigo: #0a2042(10) ~ #f1f3f9(1), 기본 #3a55b1(6)
--gray:   #1a1a1a(10) ~ #f7f8f8(1)
--blue:   #0f2a6b(10) ~ #e8f2ff(1), 기본 #437aff(6)
--green:  #002b1f(10) ~ #edfff9(1), 기본 #1ac484(6)
--red:    #5c0011(10) ~ #fff1f0(1), 기본 #f5222d(6)
--orange: #612500(10) ~ #fff7e6(1), 기본 #fa8c16(6)
--yellow: #614700(10) ~ #feffe6(1), 기본 #ffdc25(6)
```

### 시맨틱 토큰 (SCSS, _demo_light-mode.scss)
```
Fill:
  fill-standard-default: #fff
  fill-standard-hover: #f4f5f5
  fill-secondary-default: hsl(180 4.76% 98.8%)
  fill-tertiary-default: hsl(180 4.76% 97.1%)
  fill-primary-default: #004cff       ← PRIMARY 브랜드
  fill-primary-hover: #0042db
  fill-primary-active: #0036b3

Line/Border:
  line-primary-default: #004cff
  line-standard-default: hsl(192 6.49% 92.5%)
  line-secondary-default: #d6dadb
  border-secondary: 1px solid #d6dadb

Text:
  text-standard-default: #1d1f20
  text-secondary-default: #5c6061
  text-tertiary-default: #797f81
  text-inverse-default: #fff
  text-placeholder-default: #c1c6c8
  text-primary-default: #004cff

State:
  state-error-default: #ed121d / opacity: #fde7e8
  state-success-default: #25bb4d / opacity: #e8f8ec
  state-caution-default: #f56a00
  state-warning-default: #f5b800
  state-info-default: #004cff / opacity: #e5edff

Alarm:
  alarm-normal: default #25bb4d / text #156a2c / bg #cdefd6
  alarm-critical: default #ed121d / text #850a10
  alarm-major: default #f56a00 / text #ad4b00
  alarm-info: default #004cff / bg #c2d4ff

Misc:
  sider-background: #000614
  column-bg-hover: hsl(222 100% 96.4%)
  modal-shadow-default: 2px 4px 8px 2px hsl(195 3.13% 25.1%/0.4), ...
```

### 테마 변수 (_lightTheme.scss)
```
--background: var(--white)
--contents-background: var(--gray-1)    (#f7f8f8)
--background-menu: #161f30
--background-menu-active: #152268
--text-primary: var(--black)
--border: rgba(0, 0, 0, 0.15)
```

### 사이즈 (_demo_size.scss)
```
border-radius: none=0 / xs=0.2rem / sm=0.4rem / md=0.8rem / lg=1.2rem
spacing: 0=0.2rem / 1=0.4rem / 2=0.8rem / 3=1.2rem / 4=1.6rem / 5=2rem / 6=2.4rem / 7=2.8rem / 8=3.2rem
```

### 타이포그래피 (실제 font shorthand)
```
font-family: 'Spoqa Han Sans Neo', 'Roboto mono', '맑은고딕', sans-serif
letter-spacing: 0.3px

xs-normal:  400 1rem/1.6rem     sm-normal:  400 1.2rem/2rem
sm-strong:  500 1.2rem/2rem     sm-extra:   700 1.2rem/2rem
md-normal:  400 1.4rem/2.2rem   md-strong:  500 1.4rem/2.2rem   md-extra: 700 1.4rem/2.2rem
lg-normal:  400 1.6rem/2.4rem   lg-extra:   700 1.6rem/2.4rem
xl-extra:   700 2rem/2.8rem
heading-4:  700 2rem/2.8rem     heading-3:  700 2.4rem/3.2rem
```

### 컴포넌트 치수
```
Button:  height 2.8rem, padding 3px 12px, icon-only 2.8rem, sm 2.4rem, lg 4rem
Select:  height 2.8rem, line-height 2.8rem
Tab:     nav padding 0 2rem, tab padding 0.8rem
Modal:   min-width 32rem, content padding 1.6rem 2.4rem
Form:    label font sm-strong, control min-height 3rem
Sider:   menu item height 3.6rem, sub item height 3.4rem, padding 0 1.6rem
```

### 차트 legend 색상
```
level-1: #007bf5   level-2: #007b7e   level-3: #618dec   level-4: #96eb54
level-5: #0088c4   level-6: #437dad   level-7: #ff4e96   level-8: #198fe4
level-9: #f57fe9   level-10: #ff6c2c  level-11: #ffc42c  level-12: #a57ff5
```

## Counter / Caveats
- 토큰은 Figma 동기화 시 변경될 수 있음 (파일 헤더에 "Generated on Mon, 04 Aug 2025" 명시)
- `_demo_*` prefix 파일은 임시 Figma 토큰이며 최종 확정 전 변경 가능성 있음
- 다크 테마 토큰은 `_darkTheme.scss`에 일부만 정의 (완전하지 않음)
- SCSS 변수($)는 빌드 타임에 해소되어 런타임 CSS 변수(--)와 직접 대응하지 않는 경우 있음
