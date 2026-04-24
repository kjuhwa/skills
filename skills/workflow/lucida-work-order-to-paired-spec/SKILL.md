---
name: lucida-work-order-to-paired-spec
description: 한 개의 작업지시서(.md)에서 specs/{domain}/planning/*.md 기획서와 specs/{domain}/design/*.html 디자인 목업을 함께 생성하는 워크플로우. 기존 specs/kcm/planning 등의 헤더·메타 관례를 먼저 스캔해 일관성을 맞춘다.
category: workflow
tags: [lucida, planning, design-doc, specs, polestar]
---

# Lucida 작업지시서 → 기획서 + HTML 디자인 문서 페어 생성

## 언제 쓰는가

`examples/*/*.md` 또는 PIMS에서 떨어진 1차 작업지시서(기획 초안 + 요구사항)가 있을 때, 프로젝트 관례에 맞춘 **정리된 기획서**와 **비주얼 검토용 HTML 디자인 문서**를 **한 번에 페어로** 산출하고 싶을 때.

`/product-planning`은 요구사항부터 새로 뽑아내는 상위 스킬이고, 이 스킬은 **이미 작성된 작업지시서**를 두 포맷으로 정돈한다.

## 절차

### 1. 입력 식별
- 사용자가 지목한 파일 경로(예: `examples/alarm/*.md`)를 `Read`.
- 파일명에서 **도메인 추정**: `알람/이벤트 → alarm`, `KCM → kcm`, `계정 → account`. 애매하면 사용자에게 한 번 확인.

### 2. 관례 정찰 (필수)
한 번의 병렬 배치로 세 가지를 동시에 확인:

- `Glob("specs/**/planning/*.md")` — 기존 기획서 존재 여부
- `Read` 가장 최근/가장 정돈된 기획서 상단 80줄 — 메타 헤더 블록 패턴
- `Read("rules/fe/15-design-system-rules.md")` 상단 — NDS/Sirius 토큰·컴포넌트 매핑 참조

레포에 기존 예시가 있으면 **이름 컨벤션·헤더 포맷·디렉터리 구조**를 그대로 따른다. 없으면 아래 §3의 템플릿 사용.

### 3. 출력 경로
```
specs/{domain}/
├── planning/{기능명}_기획서.md
└── design/{기능명}_디자인.html
```
`design/`이 새 디렉터리여도 그대로 생성. `openapi/`는 이 스킬의 범위 밖이다(별도로 `/extract-api-spec`).

### 4. 기획서(.md) 작성 규칙

헤더 메타 블록은 **HTML 주석 + 블록쿼트** 2층 구조로 고정:

```markdown
<!-- source: {원본 경로 또는 PIMS URL} -->
<!-- fetched: YYYY-MM-DD -->

# {기능명} 기능 명세서

> **상태**: 초안 | 확정
> **유형**: 기존 개선 | 신규
> **버전**: Polestar 10.x
> **위치**: {메뉴 경로}
> **영향 범위**: {탭/모듈}
> **작성일**: YYYY-MM-DD
> **원본**: {source 경로}
```

본문 섹션 순서(경험칙, 기존 `specs/kcm/planning/*` 관찰):
1. 화면 개요 (+ 진입 경로 + 핵심 사용 흐름 테이블)
2. 범위 (Scope — 포함/제외)
3. As-Is 분석
4. 요구사항 (FR / NFR 테이블, MoSCoW 컬럼 포함)
5. 기능 상세 설계 (UI/UX · 데이터 모델 · API 설계)
6. 사용자 시나리오
7. 엣지 케이스
8. 구현 우선순위 (Phase 1~4)
9. 수용 기준 (AC)
10. 확장 고려
11. Open Questions
12. 부록 (컬럼 인벤토리 등)

작업지시서가 이미 이 구조를 갖고 있으면 **이름·톤만 정돈**하고 사족 문장은 줄인다. 부족한 섹션을 **창작하지 않는다**.

### 5. 디자인 문서(.html) 작성 규칙
자매 스킬 `selfcontained-nds-design-doc-html`의 템플릿을 사용. 섹션 구성은 기획서와 1:1 매핑되도록 번호를 맞춘다(요약 · As-Is/To-Be · 페이지 맥락 · 다이얼로그 · 인터랙션 · 시나리오 · API · Phase · AC · Open Q).

### 6. 검증
```bash
# 1) 파일 생성 확인 + 라인 수
ls specs/{domain}/planning specs/{domain}/design
wc -l specs/{domain}/planning/*.md specs/{domain}/design/*.html

# 2) HTML 태그 밸런스 (section/div 쌍 매칭)
node -e "const fs=require('fs');const s=fs.readFileSync('<path>','utf8');
const o=(s.match(/<section/g)||[]).length;
const c=(s.match(/<\/section>/g)||[]).length;
const od=(s.match(/<div(?:\s|>)/g)||[]).length;
const cd=(s.match(/<\/div>/g)||[]).length;
console.log('sections',o,'/',c,'  divs',od,'/',cd);"
```
section/div 좌우가 일치해야 한다. 어긋나면 닫힘 태그 누락.

## 실패 모드

| 상황 | 대처 |
|---|---|
| 작업지시서가 이미 `*_기획서.md`로 명명됨 | 파일명은 유지, 내용만 `specs/`의 포맷으로 재조립. `원본` 필드로 추적. |
| 도메인 폴더가 없음 | `specs/{domain}/` 신규 생성. 이후 타 스킬이 이 구조를 그대로 사용. |
| 작업지시서에 API/데이터 모델이 없음 | 기획서에는 해당 섹션 생략, HTML에서도 해당 섹션 카드 자체를 삭제(비우지 말고 섹션 번호를 재정렬). |
| 사용자가 도메인 힌트를 주지 않음 | 파일명 → 메뉴 경로 → 키워드 순서로 추정 후 **한 문장으로만** 확인 질문. |

## 참고 결과물 (이 스킬이 실제로 만든 페어)

- `specs/alarm/planning/알람이벤트_컬럼_개인화설정_기획서.md`
- `specs/alarm/design/알람이벤트_컬럼_개인화설정_디자인.html`
