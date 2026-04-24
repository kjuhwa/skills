"""스킬 허브 키워드 검색 CLI (v2).

`~/.claude/skills-hub/remote/index.json`을 대상으로 키워드를 점수화해
상위 N개 항목을 내보낸다. AI가 "이 주제와 관련된 스킬이 뭐가 있지?"라고
물을 때 첫 진입점으로 쓰인다.

v2 변경점:
  - 한글 → 영문 동의어 맵 (스프링→spring, 카프카→kafka …)
  - 쿼리 토큰 확장 (원본 + 동의어가 모두 검색에 기여)
  - 부분 일치 보너스 (토큰이 name/description/tags 에 substring으로 등장)
  - `--synonyms` 로 어떤 확장이 적용됐는지 미리보기

점수 규칙:
  - name 완전 일치            : +10
  - name substring 일치        : +6
  - description 토큰 일치      : +3
  - tags substring 일치        : +5
  - triggers 토큰 일치         : +4
  - 동의어 경유 매칭은 원본 대비 80%로 가중

사용법:
    py hub_search.py "kafka avro"
    py hub_search.py "스프링 세션"                    # 한글 쿼리 OK
    py hub_search.py -n 20 "websocket"
    py hub_search.py --kind skill "lock"
    py hub_search.py --kind technique "pr publish"
    py hub_search.py --category pitfall "mongo"
    py hub_search.py --json "rate limit"
    py hub_search.py --synonyms "카프카"              # 확장 경로 점검
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import sys
from pathlib import Path

HUB_INDEX = Path.home() / ".claude" / "skills-hub" / "remote" / "index.json"

# 한글 (또는 영문 약어) → 정식 영문 키워드 매핑.
# 값은 공백 구분 가능한 여러 키워드. 양방향 확장을 원하면 역매핑도 추가한다.
SYNONYMS: dict[str, str] = {
    # ── 플랫폼 / 언어 ───────────────────────────────
    "스프링": "spring spring-boot",
    "스프링부트": "spring-boot spring",
    "부트": "boot spring-boot",
    "자바": "java jvm",
    "자바스크립트": "javascript js",
    "타입스크립트": "typescript ts",
    "파이썬": "python",
    "코틀린": "kotlin",
    "고": "go golang",
    "러스트": "rust",
    "스칼라": "scala",
    "스위프트": "swift",
    "리액트": "react reactjs",
    "리액트네이티브": "react-native",
    "뷰": "vue vuejs",
    "앵귤러": "angular",
    "넥스트": "next nextjs",
    "노드": "node node.js nodejs",
    "익스프레스": "express expressjs",
    "장고": "django",
    "플라스크": "flask",
    "라라벨": "laravel",
    # ── 인프라 / 메시징 / 스토리지 ─────────────────────
    "카프카": "kafka",
    "래빗": "rabbitmq",
    "래빗엠큐": "rabbitmq",
    "도커": "docker container",
    "컨테이너": "container docker",
    "쿠버네티스": "kubernetes k8s",
    "쿠버": "kubernetes k8s",
    "헬름": "helm",
    "테라폼": "terraform iac",
    "몽고": "mongo mongodb",
    "몽고디비": "mongodb mongo",
    "포스트그레": "postgres postgresql",
    "포스트그리": "postgres postgresql",
    "마리아": "mariadb mysql",
    "마리아디비": "mariadb mysql",
    "마이에스큐엘": "mysql",
    "오라클": "oracle",
    "에스큐엘": "sql",
    "레디스": "redis cache",
    "엘라스틱": "elasticsearch es",
    "엘라스틱서치": "elasticsearch",
    "옵서버빌리티": "observability monitoring tracing",
    "웹소켓": "websocket stomp",
    "소켓": "socket websocket",
    "그라파나": "grafana dashboard",
    "프로메테우스": "prometheus metrics",
    "클리아우드": "cloud aws gcp azure",
    "에이더블유에스": "aws",
    "지씨피": "gcp google-cloud",
    "애저": "azure",
    "엔진엑스": "nginx",
    "엔진엑스엑스": "nginx",
    # ── 보안 / 인증 ────────────────────────────────
    "인증": "auth authentication jwt oauth",
    "로그인": "login auth authentication session",
    "토큰인증": "jwt token auth",
    "권한": "authorization rbac acl",
    "암호화": "encryption crypto aes rsa",
    "복호화": "decryption crypto",
    "해시": "hash sha bcrypt md5",
    "보안": "security owasp",
    "취약점": "vulnerability owasp",
    "주입": "injection sql-injection xss",
    "씨에스알에프": "csrf xsrf",
    # ── 데이터 / 모델 ───────────────────────────────
    "디비": "db database",
    "데이터베이스": "database db",
    "스키마": "schema",
    "마이그레이션": "migration flyway liquibase",
    "인덱스": "index indexing",
    "트랜잭션": "transaction tx acid",
    "복제": "replica replication",
    "리플리카": "replica replication",
    "샤딩": "sharding shard",
    "파티션": "partition partitioning",
    "이티엘": "etl pipeline",
    "이벤트소싱": "event-sourcing cqrs",
    "시디씨": "cdc change-data-capture",
    "체인지스트림": "change-stream cdc",
    # ── 아키텍처 / 패턴 ─────────────────────────────
    "분산": "distributed",
    "이벤트": "event event-driven",
    "이벤트드리븐": "event-driven event",
    "동시성": "concurrency concurrent",
    "병렬": "parallel",
    "비동기": "async asynchronous",
    "락": "lock mutex",
    "뮤텍스": "mutex lock",
    "세마포어": "semaphore",
    "캐시": "cache caching",
    "캐싱": "caching cache",
    "레이트": "rate-limit rate",
    "레이트리밋": "rate-limit rate-limiting",
    "큐": "queue",
    "파이프라인": "pipeline etl stream",
    "상태": "state",
    "상태머신": "state-machine fsm",
    "서킷": "circuit-breaker",
    "서킷브레이커": "circuit-breaker",
    "사가": "saga",
    "헥사고날": "hexagonal ports-adapters",
    "마이크로서비스": "microservice microservices msa",
    "엠에스에이": "microservice msa",
    "모놀리스": "monolith monolithic",
    "스트랭글러": "strangler-fig migration",
    "벌크헤드": "bulkhead isolation",
    # ── 테스트 / 빌드 / CI ─────────────────────────
    "테스트": "test testing",
    "단위테스트": "unit-test",
    "통합테스트": "integration-test",
    "엔드투엔드": "e2e end-to-end",
    "이투이": "e2e",
    "플레이라이트": "playwright",
    "사이프러스": "cypress",
    "제스트": "jest",
    "주니트": "junit",
    "빌드": "build",
    "그래들": "gradle",
    "메이븐": "maven",
    "배포": "deploy deployment",
    "릴리스": "release",
    "릴리즈": "release",
    "씨아이": "ci continuous-integration",
    "씨디": "cd continuous-deployment",
    "파이프": "pipeline",
    "젠킨스": "jenkins",
    "깃헙액션": "github-actions",
    "깃랩": "gitlab",
    # ── UI / 프런트 ───────────────────────────────
    "디자인": "design",
    "토큰": "token design-tokens",
    "디자인토큰": "design-tokens",
    "컴포넌트": "component",
    "레이아웃": "layout",
    "차트": "chart visualization",
    "그리드": "grid table ag-grid",
    "에이지그리드": "ag-grid grid",
    "드래그": "drag drag-and-drop dnd",
    "디앤디": "dnd drag-and-drop",
    "테이블": "table grid",
    "다크모드": "dark-mode theme",
    "테마": "theme design-tokens",
    "반응형": "responsive layout",
    "모달": "modal dialog",
    "드로어": "drawer",
    "툴팁": "tooltip",
    "폼": "form validation",
    "라우팅": "routing router",
    "모듈페더레이션": "module-federation mfa",
    "엠에프에이": "module-federation mfa",
    # ── 모니터링 / 운영 ─────────────────────────────
    "로그": "log logging",
    "로깅": "logging log",
    "모니터링": "monitoring observability",
    "트레이싱": "tracing trace",
    "메트릭": "metric metrics prometheus",
    "알람": "alert alerting",
    "에이피엠": "apm",
    "헬스체크": "health-check liveness readiness",
    # ── 에이전트 / LLM ──────────────────────────────
    "에이전트": "agent",
    "엘엘엠": "llm",
    "피롬프트": "prompt prompt-engineering",
    "프롬프트": "prompt prompt-engineering",
    "임베딩": "embedding vector",
    "벡터": "vector embedding",
    "래그": "rag retrieval-augmented",
    "엠시피": "mcp",
    "클로드": "claude anthropic",
    "플러그인": "plugin",
    "워크플로": "workflow",
    "워크플로우": "workflow",
    # ── 도메인 / 비즈니스 ───────────────────────────
    "멀티테넌트": "multi-tenant tenant",
    "테넌트": "tenant multi-tenant",
    "조직": "organization tenant",
    "결제": "payment billing",
    "빌링": "billing subscription",
    "구독": "subscription billing",
    "알림": "notification push email sms",
    "이메일": "email smtp",
    "에스엠에스": "sms",
    "푸시": "push notification",
    # ── 게임 ─────────────────────────────────────
    "가챠": "gacha pity",
    "피티": "pity gacha",
    "콤보": "combo",
    "게임": "game game-dev",
    "턴": "turn-based combat",
    "알피지": "rpg",
    # ── 기타 ─────────────────────────────────────
    "깃": "git",
    "깃헙": "github",
    "리베이스": "rebase",
    "머지": "merge",
    "브랜치": "branch",
    "태그": "tag",
    "훅": "hook",
    "사이드카": "sidecar service-mesh",
    "서비스메시": "service-mesh sidecar istio",
    "이스티오": "istio service-mesh",
    "블룸필터": "bloom-filter",
    "컨시스턴트해싱": "consistent-hashing",
    "일관성": "consistency",
    "정합성": "consistency integrity",
    "멱등성": "idempotency idempotent",
    "아웃박스": "outbox outbox-pattern",
    "시디에프씨": "cdc",
}


def tokenize(s: str) -> list[str]:
    s = (s or "").lower()
    return [t for t in re.split(r"[^a-z0-9가-힣]+", s) if t]


def expand_query(tokens: list[str]) -> list[tuple[str, float]]:
    """원본 토큰 + 동의어를 (토큰, 가중치) 목록으로 반환.
    원본 1.0, 동의어 경유 0.8."""
    expanded: list[tuple[str, float]] = []
    seen: set[str] = set()
    for raw in tokens:
        for piece, weight in ((raw, 1.0), *[(syn, 0.8) for syn in SYNONYMS.get(raw, "").split() if syn]):
            if piece in seen:
                continue
            seen.add(piece)
            expanded.append((piece, weight))
    return expanded


def score_entry(entry: dict, tokens: list[tuple[str, float]]) -> int:
    name = (entry.get("name") or "").lower()
    description = (entry.get("description") or "").lower()
    desc_tokens = set(tokenize(description))
    tag_tokens = {t.lower() for t in (entry.get("tags") or [])}
    trigger_raw = " ".join((entry.get("triggers") or [])).lower()
    trigger_tokens = set(tokenize(trigger_raw))
    name_tokens = set(tokenize(name))
    query_joined = " ".join(t for t, _ in tokens if abs(_ - 1.0) < 0.01)

    score = 0.0
    if query_joined and query_joined == name:
        score += 10
    for tok, weight in tokens:
        if tok in name:
            score += 6 * weight
        if tok in name_tokens:
            score += 2 * weight
        if tok in desc_tokens:
            score += 3 * weight
        if tok in description:          # substring
            score += 1 * weight
        if any(tok in tag for tag in tag_tokens):
            score += 5 * weight
        if tok in trigger_tokens:
            score += 4 * weight
        if tok in trigger_raw:          # substring of multi-word trigger
            score += 1 * weight
    return int(round(score))


def render_html(raw_tokens: list[str], expanded: list[tuple[str, float]],
                top: list[tuple[int, dict]], total: int) -> str:
    """다크 테마 카드 UI."""
    now = dt.datetime.now().isoformat(timespec="seconds")
    expansion = [html.escape(t) for t, w in expanded if w < 1.0]
    query_line = html.escape(" ".join(raw_tokens))

    cards: list[str] = []
    for s, e in top:
        name = html.escape(e.get("name") or "")
        desc = html.escape((e.get("description") or "").strip())
        kind = html.escape(e.get("kind") or "")
        cat = html.escape(e.get("category") or "")
        path = html.escape(e.get("path") or "")
        tags = e.get("tags") or []
        tag_html = "".join(
            f'<span class="tag">{html.escape(t)}</span>' for t in tags
        )
        cards.append(f"""
<article class="card">
  <header>
    <span class="score">{s}</span>
    <span class="kind">{kind}/{cat}</span>
    <h2>{name}</h2>
  </header>
  <p class="desc">{desc or "<em>(설명 없음)</em>"}</p>
  <div class="tags">{tag_html}</div>
  <code class="path">{path}</code>
</article>""")

    body_cards = "\n".join(cards) if cards else "<p class='empty'>일치하는 항목이 없습니다.</p>"
    expansion_note = (
        f"<p class='note'>동의어 확장: {' · '.join(expansion)}</p>"
        if expansion else ""
    )

    return f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>hub-search · {query_line}</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{ margin: 0; padding: 24px 32px;
         background: #0b0f14; color: #d7e1ea;
         font-family: ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
         font-size: 14px; line-height: 1.45; }}
  header.top {{ margin-bottom: 20px; }}
  header.top h1 {{ margin: 0 0 4px; font-size: 22px; }}
  header.top small {{ color: #8aa0b4; }}
  p.note {{ color: #86bdf4; font-size: 13px; margin: 4px 0 12px; }}
  main {{ display: grid; gap: 14px; }}
  .card {{ background: #141b23; border: 1px solid #263241;
           border-radius: 10px; padding: 14px 18px; }}
  .card header {{ display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }}
  .card header h2 {{ margin: 0; font-size: 16px; font-weight: 600; color: #e8edf3; }}
  .score {{ background: #1f6fd6; color: white; border-radius: 4px;
            padding: 2px 8px; font-size: 12px; font-weight: 700; min-width: 32px;
            text-align: center; }}
  .kind {{ color: #8fb7e0; font-size: 12px; font-family: ui-monospace, monospace; }}
  .desc {{ margin: 2px 0 8px; color: #c5d0dc; }}
  .tags {{ display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }}
  .tag {{ background: #26344a; color: #8fb7e0; font-size: 11px;
          padding: 2px 8px; border-radius: 999px; }}
  .path {{ color: #6a8096; font-size: 12px; font-family: ui-monospace, monospace; }}
  .empty {{ color: #8aa0b4; }}
  footer {{ margin-top: 24px; color: #5e7183; font-size: 12px; }}
</style></head>
<body>
<header class="top">
  <h1>hub-search &nbsp;·&nbsp; <code>{query_line}</code></h1>
  <small>상위 {len(top)} 카드 · 전체 매칭 {total} · 생성 {now}</small>
  {expansion_note}
</header>
<main>
{body_cards}
</main>
<footer>자동 생성. 원본: <code>~/.claude/skills-hub/remote/</code></footer>
</body></html>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="+", help="키워드 (여러 개 가능)")
    ap.add_argument("-n", "--top", type=int, default=10)
    ap.add_argument("--kind", choices=("skill", "knowledge", "technique", "paper"), default=None)
    ap.add_argument("--category", default=None)
    ap.add_argument("--json", dest="as_json", action="store_true")
    ap.add_argument("--html", dest="as_html", action="store_true",
                    help="HTML 카드 뷰로 출력")
    ap.add_argument("--out", default=None,
                    help="결과를 파일에 저장 (HTML/JSON 모드에서 유용)")
    ap.add_argument("--synonyms", action="store_true",
                    help="동의어 확장 결과만 출력하고 종료")
    args = ap.parse_args()

    raw_tokens = tokenize(" ".join(args.query))
    if not raw_tokens:
        print("검색어를 입력해 주세요.", file=sys.stderr)
        return 2

    expanded = expand_query(raw_tokens)
    if args.synonyms:
        print("원본:", raw_tokens)
        print("확장된 토큰:")
        for tok, w in expanded:
            print(f"  {tok:20} weight={w}")
        return 0

    entries = json.loads(HUB_INDEX.read_text(encoding="utf-8"))
    scored: list[tuple[int, dict]] = []
    for e in entries:
        if args.kind and e.get("kind") != args.kind:
            continue
        if args.category and (e.get("category") or "") != args.category:
            continue
        s = score_entry(e, expanded)
        if s > 0:
            scored.append((s, e))
    scored.sort(key=lambda pair: (-pair[0], pair[1].get("name", "")))
    top = scored[: args.top]

    if args.as_json:
        out = [
            {
                "score": s,
                "kind": e.get("kind"),
                "category": e.get("category"),
                "name": e.get("name"),
                "description": e.get("description", ""),
                "tags": e.get("tags", []),
                "path": e.get("path", ""),
            }
            for s, e in top
        ]
        payload = json.dumps(out, ensure_ascii=False, indent=2)
        if args.out:
            Path(args.out).write_text(payload, encoding="utf-8")
            print(f"wrote {args.out}")
        else:
            print(payload)
        return 0

    if args.as_html:
        html = render_html(raw_tokens, expanded, top, len(scored))
        if args.out:
            Path(args.out).write_text(html, encoding="utf-8")
            print(f"wrote {args.out}")
        else:
            print(html)
        return 0

    if not top:
        print(f"'{' '.join(raw_tokens)}' 관련 항목을 찾지 못했습니다.")
        return 1

    expansion_note = ""
    if len(expanded) > len(raw_tokens):
        added = [t for t, w in expanded if w < 1.0]
        expansion_note = f"  |  동의어 확장: {', '.join(added)}"
    print(f"키워드: {' '.join(raw_tokens)}{expansion_note}")
    print(f"상위 {len(top)} / 전체 매칭 {len(scored)}")
    print()
    for s, e in top:
        kind = e.get("kind", "?")
        cat = e.get("category", "")
        name = e.get("name", "")
        desc = (e.get("description") or "").replace("\n", " ")
        if len(desc) > 160:
            desc = desc[:159] + "…"
        path = e.get("path", "")
        print(f"[{s:3}]  {kind}/{cat:15} {name}")
        print(f"       {desc}")
        print(f"       path: {path}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
