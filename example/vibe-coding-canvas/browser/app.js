/* ============================================================
   Vibe Coding Canvas — app.js
   Template-based vibe coding engine (no external API)
   ============================================================ */

'use strict';

/* ────────────────────────────────────────────────────────────
   1. KEYWORD DICTIONARIES
   ──────────────────────────────────────────────────────────── */
const KW = {
  components: {
    button:    ['버튼', 'button', 'btn'],
    card:      ['카드', 'card'],
    form:      ['폼', 'form', '입력', '로그인', 'login', '회원가입', 'signup'],
    table:     ['테이블', 'table', '표'],
    nav:       ['네비게이션', 'nav', 'navigation', '메뉴', 'menu', '헤더', 'header'],
    hero:      ['히어로', 'hero', '배너', 'banner', '메인'],
    modal:     ['모달', 'modal', '팝업', 'popup', '다이얼로그', 'dialog'],
    list:      ['리스트', 'list', '목록', '아이템'],
    profile:   ['프로필', 'profile', '아바타', 'avatar', '유저', 'user'],
    dashboard: ['대시보드', 'dashboard', '통계', 'stats', '차트', 'chart'],
  },
  styles: {
    rounded:   ['둥근', 'rounded', '라운드', 'round', '부드러운'],
    gradient:  ['그라데이션', 'gradient', '그라디언트'],
    dark:      ['어두운', 'dark', '다크', '검은', '블랙'],
    light:     ['밝은', 'light', '라이트', '흰', '화이트'],
    large:     ['큰', 'large', '크게', '넓은', 'big'],
    small:     ['작은', 'small', '작게', '좁은', 'tiny'],
    animated:  ['애니메이션', 'animated', 'animation', '움직이는', '동적'],
    neon:      ['네온', 'neon', '발광', '빛나는', 'glow'],
    glass:     ['글래스', 'glass', '글래스모피즘', 'glassmorphism', '투명'],
    minimal:   ['미니멀', 'minimal', 'minimalist', '단순', '심플', 'simple', '깔끔'],
  },
  colors: {
    red:    ['빨간', '빨강', 'red', '레드', '붉은'],
    blue:   ['파란', '파랑', 'blue', '블루', '청색'],
    green:  ['초록', '녹색', 'green', '그린', '초록색'],
    purple: ['보라', '보라색', 'purple', '퍼플', '자주'],
    yellow: ['노란', '노랑', 'yellow', '옐로우', '황색', '금색', 'gold'],
    orange: ['주황', '주황색', 'orange', '오렌지'],
    pink:   ['분홍', '핑크', 'pink'],
    cyan:   ['하늘', '하늘색', 'cyan', '시안', '민트', 'mint', 'teal'],
  },
  quantities: {
    1: ['하나', 'one', '1개', '한개'],
    2: ['두', 'two', '2개', '두개'],
    3: ['세', 'three', '3개', '세개'],
    4: ['네', 'four', '4개', '네개'],
    5: ['다섯', 'five', '5개', '다섯개'],
  },
};

/* ────────────────────────────────────────────────────────────
   2. COLOR PALETTE
   ──────────────────────────────────────────────────────────── */
const COLORS = {
  red:     { primary: '#ef4444', secondary: '#fca5a5', dark: '#991b1b', gradient: '#ef4444, #dc2626' },
  blue:    { primary: '#3b82f6', secondary: '#93c5fd', dark: '#1d4ed8', gradient: '#3b82f6, #2563eb' },
  green:   { primary: '#22c55e', secondary: '#86efac', dark: '#15803d', gradient: '#22c55e, #16a34a' },
  purple:  { primary: '#a855f7', secondary: '#d8b4fe', dark: '#7e22ce', gradient: '#a855f7, #9333ea' },
  yellow:  { primary: '#eab308', secondary: '#fde047', dark: '#a16207', gradient: '#eab308, #ca8a04' },
  orange:  { primary: '#f97316', secondary: '#fdba74', dark: '#c2410c', gradient: '#f97316, #ea580c' },
  pink:    { primary: '#ec4899', secondary: '#f9a8d4', dark: '#be185d', gradient: '#ec4899, #db2777' },
  cyan:    { primary: '#06b6d4', secondary: '#67e8f9', dark: '#0e7490', gradient: '#06b6d4, #0891b2' },
  default: { primary: '#e94560', secondary: '#ff8da1', dark: '#c21d3a', gradient: '#e94560, #7c3aed' },
};

/* ────────────────────────────────────────────────────────────
   3. PARSER
   ──────────────────────────────────────────────────────────── */
class Parser {
  static parse(text) {
    const lower = text.toLowerCase();
    const result = {
      components: [],
      styles: [],
      colors: [],
      quantity: 1,
      raw: text,
    };

    for (const [comp, kws] of Object.entries(KW.components)) {
      if (kws.some(kw => lower.includes(kw))) result.components.push(comp);
    }
    if (result.components.length === 0) result.components.push('card');

    for (const [style, kws] of Object.entries(KW.styles)) {
      if (kws.some(kw => lower.includes(kw))) result.styles.push(style);
    }

    for (const [color, kws] of Object.entries(KW.colors)) {
      if (kws.some(kw => lower.includes(kw))) result.colors.push(color);
    }
    if (result.colors.length === 0) result.colors.push('default');

    for (const [num, kws] of Object.entries(KW.quantities)) {
      if (kws.some(kw => lower.includes(kw))) { result.quantity = parseInt(num); break; }
    }
    // Also parse bare digits like "3"
    const digitMatch = text.match(/\b([2-5])\b/);
    if (digitMatch && result.quantity === 1) result.quantity = parseInt(digitMatch[1]);

    result.nested = /안에|inside|with|포함|containing/i.test(text);
    return result;
  }
}

/* ────────────────────────────────────────────────────────────
   4. COMPONENT TEMPLATES
   ──────────────────────────────────────────────────────────── */
class Templates {

  static _getColor(colors) {
    const name = colors[0] || 'default';
    return COLORS[name] || COLORS.default;
  }

  static _wrapPage(bodyContent, extraCss = '') {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;
  min-height:100vh;padding:24px;
  background:linear-gradient(135deg,#0f0f1e 0%,#1a1a30 100%);
}
${extraCss}
</style>
</head>
<body>${bodyContent}</body>
</html>`;
  }

  /* ── BUTTON ── */
  static button(ctx) {
    const color = this._getColor(ctx.colors);
    const isGradient = ctx.styles.includes('gradient');
    const isRounded  = ctx.styles.includes('rounded');
    const isLarge    = ctx.styles.includes('large');
    const isSmall    = ctx.styles.includes('small');
    const isNeon     = ctx.styles.includes('neon');
    const isAnimated = ctx.styles.includes('animated');
    const isGlass    = ctx.styles.includes('glass');
    const isMinimal  = ctx.styles.includes('minimal');
    const n          = Math.max(1, Math.min(ctx.quantity, 5));

    const bg = isGradient
      ? `linear-gradient(135deg,${color.gradient})`
      : isGlass
        ? 'rgba(255,255,255,0.1)'
        : isMinimal
          ? 'transparent'
          : color.primary;

    const border = isNeon
      ? `2px solid ${color.primary}`
      : isGlass
        ? '1px solid rgba(255,255,255,0.2)'
        : isMinimal
          ? `1px solid ${color.primary}`
          : 'none';

    const boxShadow = isNeon
      ? `0 0 12px ${color.primary}, 0 0 24px ${color.primary}40`
      : isGradient
        ? `0 6px 20px ${color.primary}55`
        : '0 4px 14px rgba(0,0,0,0.3)';

    const radius  = isRounded ? '50px' : '10px';
    const sizeCSS = isLarge ? 'padding:16px 40px;font-size:17px;'
                  : isSmall ? 'padding:8px 20px;font-size:12px;'
                  : 'padding:12px 28px;font-size:14px;';
    const hoverT  = isAnimated ? 'transform:translateY(-3px) scale(1.04);' : 'transform:translateY(-2px);';
    const textClr = (isGlass || isMinimal) ? color.primary : '#fff';

    const labels = ['시작하기', '더 알아보기', '구매하기', '연락하기', '로그인'];
    const buttons = Array.from({length: n}, (_, i) => {
      return `<button class="vbc-btn">${labels[i % labels.length]}</button>`;
    }).join('\n');

    const css = `
.btn-row{display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:center;}
.vbc-btn{
  ${sizeCSS}
  background:${bg};
  border:${border};
  border-radius:${radius};
  color:${textClr};
  font-weight:700;
  font-family:inherit;
  cursor:pointer;
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  box-shadow:${boxShadow};
  letter-spacing:0.3px;
  backdrop-filter:${isGlass ? 'blur(10px)' : 'none'};
  ${isAnimated ? 'position:relative;overflow:hidden;' : ''}
}
.vbc-btn:hover{${hoverT}box-shadow:0 10px 30px ${color.primary}66;}
.vbc-btn:active{transform:translateY(0) scale(0.98);}
${isAnimated ? `.vbc-btn::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),transparent);
  opacity:0;transition:opacity 0.2s;
}
.vbc-btn:hover::after{opacity:1;}` : ''}`;

    return this._wrapPage(`<div class="btn-row">${buttons}</div>`, css);
  }

  /* ── CARD ── */
  static card(ctx) {
    const color = this._getColor(ctx.colors);
    const isGlass    = ctx.styles.includes('glass');
    const isNeon     = ctx.styles.includes('neon');
    const isDark     = ctx.styles.includes('dark');
    const isGradient = ctx.styles.includes('gradient');
    const isAnimated = ctx.styles.includes('animated');
    const isMinimal  = ctx.styles.includes('minimal');
    const hasButton  = ctx.nested || ctx.components.includes('button');
    const n          = Math.max(1, Math.min(ctx.quantity, 4));

    const cardBg = isGlass  ? 'rgba(255,255,255,0.08)'
                 : isDark   ? '#1a1a2e'
                 : isMinimal ? '#fff'
                 : '#1e2130';

    const cardBorder = isNeon   ? `1px solid ${color.primary}`
                     : isGlass  ? '1px solid rgba(255,255,255,0.15)'
                     : isMinimal? '1px solid #e5e7eb'
                     : '1px solid rgba(255,255,255,0.07)';

    const boxShadow = isNeon
      ? `0 0 16px ${color.primary}55, 0 8px 32px rgba(0,0,0,0.4)`
      : '0 8px 32px rgba(0,0,0,0.4)';

    const headerBg = isGradient ? `linear-gradient(135deg,${color.gradient})`
                   : isNeon     ? `${color.primary}22`
                   : isMinimal  ? '#f3f4f6'
                   : `${color.primary}33`;

    const textColor  = isMinimal ? '#1f2937' : '#f0f0f8';
    const subtxtColor= isMinimal ? '#6b7280' : '#888aaa';
    const btnBg      = isGradient ? `linear-gradient(135deg,${color.gradient})` : color.primary;

    const buttonHTML = hasButton ? `<button class="c-btn">자세히 보기</button>` : '';

    const makeCard = (i) => `
<div class="vbc-card${isAnimated ? ' animated' : ''}">
  <div class="c-header">
    <div class="c-avatar">✦</div>
    <div>
      <div class="c-title">컴포넌트 ${i + 1}</div>
      <div class="c-sub">Vibe Coded</div>
    </div>
  </div>
  <div class="c-body">
    <p class="c-desc">자연어로 생성된 카드 컴포넌트입니다. 키워드를 바꿔서 다양한 스타일을 만들어보세요.</p>
  </div>
  <div class="c-footer">${buttonHTML}</div>
</div>`;

    const cards = Array.from({length: n}, (_, i) => makeCard(i)).join('\n');

    const css = `
.card-grid{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;justify-content:center;}
.vbc-card{
  width:280px;
  background:${cardBg};
  border:${cardBorder};
  border-radius:16px;
  overflow:hidden;
  box-shadow:${boxShadow};
  backdrop-filter:${isGlass ? 'blur(16px)' : 'none'};
  transition:all 0.3s ease;
}
.vbc-card.animated{animation:cardIn 0.5s ease both;}
.vbc-card.animated:nth-child(2){animation-delay:0.1s;}
.vbc-card.animated:nth-child(3){animation-delay:0.2s;}
.vbc-card.animated:nth-child(4){animation-delay:0.3s;}
@keyframes cardIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.vbc-card:hover{transform:translateY(-5px);box-shadow:0 20px 50px ${color.primary}44;}
.c-header{
  background:${headerBg};
  padding:18px;
  display:flex;align-items:center;gap:12px;
}
.c-avatar{
  width:44px;height:44px;border-radius:12px;
  background:${color.primary}44;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;color:${color.primary};
  border:1px solid ${color.primary}66;
}
.c-title{font-size:15px;font-weight:700;color:${textColor};}
.c-sub{font-size:11px;color:${subtxtColor};margin-top:2px;}
.c-body{padding:16px 18px;}
.c-desc{font-size:13px;color:${subtxtColor};line-height:1.65;}
.c-footer{padding:0 18px 16px;display:flex;justify-content:flex-end;}
.c-btn{
  padding:8px 20px;background:${btnBg};
  border:none;border-radius:8px;
  color:#fff;font-size:12px;font-weight:600;
  cursor:pointer;transition:all 0.2s;
  box-shadow:0 4px 12px ${color.primary}44;
}
.c-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px ${color.primary}66;}`;

    return this._wrapPage(`<div class="card-grid">${cards}</div>`, css);
  }

  /* ── FORM ── */
  static form(ctx) {
    const color      = this._getColor(ctx.colors);
    const isGlass    = ctx.styles.includes('glass');
    const isNeon     = ctx.styles.includes('neon');
    const isDark     = ctx.styles.includes('dark');
    const isMinimal  = ctx.styles.includes('minimal');
    const isGradient = ctx.styles.includes('gradient');

    const isLogin  = /로그인|login/i.test(ctx.raw);
    const isSignup = /회원가입|signup|register/i.test(ctx.raw);
    const title = isSignup ? '회원가입' : isLogin ? '로그인' : '문의하기';

    const formBg  = isGlass   ? 'rgba(255,255,255,0.07)' : isMinimal ? '#fff' : '#1e2130';
    const inputBg = isGlass   ? 'rgba(255,255,255,0.08)' : isMinimal ? '#f9fafb' : 'rgba(0,0,0,0.3)';
    const textClr = isMinimal ? '#1f2937' : '#f0f0f8';
    const labelClr= isMinimal ? '#374151' : '#9ca3af';
    const inputTxt= isMinimal ? '#1f2937' : '#f0f0f8';
    const borderC = isNeon    ? color.primary : isMinimal ? '#d1d5db' : 'rgba(255,255,255,0.1)';
    const btnBg   = isGradient ? `linear-gradient(135deg,${color.gradient})` : color.primary;

    const extraFields = isSignup ? `
<div class="f-group">
  <label class="f-label">이름</label>
  <input class="f-input" type="text" placeholder="홍길동"/>
</div>` : '';

    const css = `
body{background:${isDark ? 'linear-gradient(135deg,#0a0a14,#111827)' : 'linear-gradient(135deg,#0f0f1e,#1a1a30)'};}
.vbc-form-wrap{width:100%;max-width:380px;}
.vbc-form{
  background:${formBg};
  border:1px solid ${borderC};
  border-radius:18px;
  padding:32px;
  backdrop-filter:${isGlass ? 'blur(20px)' : 'none'};
  box-shadow:${isNeon ? `0 0 30px ${color.primary}44,0 16px 48px rgba(0,0,0,0.5)` : '0 16px 48px rgba(0,0,0,0.4)'};
}
.f-title{font-size:22px;font-weight:800;color:${textClr};text-align:center;margin-bottom:6px;}
.f-sub{font-size:12px;color:${labelClr};text-align:center;margin-bottom:24px;}
.f-group{margin-bottom:16px;}
.f-label{display:block;font-size:11px;font-weight:600;color:${labelClr};margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;}
.f-input{
  width:100%;padding:11px 14px;
  background:${inputBg};
  border:1px solid ${borderC};
  border-radius:10px;
  color:${inputTxt};
  font-size:13px;font-family:inherit;
  outline:none;
  transition:border-color 0.2s,box-shadow 0.2s;
}
.f-input:focus{border-color:${color.primary};box-shadow:0 0 0 3px ${color.primary}33;}
.f-input::placeholder{color:rgba(156,163,175,0.6);}
.f-divider{margin:8px 0 18px;display:flex;align-items:center;gap:10px;}
.f-divider::before,.f-divider::after{content:'';flex:1;height:1px;background:${borderC};}
.f-divider span{font-size:11px;color:${labelClr};}
.f-btn{
  width:100%;padding:13px;
  background:${btnBg};
  border:none;border-radius:10px;
  color:#fff;font-size:14px;font-weight:700;
  font-family:inherit;cursor:pointer;
  transition:all 0.25s;
  box-shadow:0 6px 20px ${color.primary}44;
  margin-top:4px;
}
.f-btn:hover{transform:translateY(-2px);box-shadow:0 10px 28px ${color.primary}66;}
.f-footer{text-align:center;margin-top:16px;font-size:12px;color:${labelClr};}
.f-footer a{color:${color.primary};text-decoration:none;font-weight:600;}`;

    const html = `
<div class="vbc-form-wrap">
  <form class="vbc-form" onsubmit="return false">
    <div class="f-title">${title}</div>
    <div class="f-sub">Vibe Coded Form ✨</div>
    ${extraFields}
    <div class="f-group">
      <label class="f-label">이메일</label>
      <input class="f-input" type="email" placeholder="hello@example.com"/>
    </div>
    <div class="f-group">
      <label class="f-label">비밀번호</label>
      <input class="f-input" type="password" placeholder="••••••••"/>
    </div>
    <div class="f-divider"><span>또는</span></div>
    <button class="f-btn">${title}</button>
    <div class="f-footer">계정이 없으신가요? <a href="#">회원가입</a></div>
  </form>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── TABLE ── */
  static table(ctx) {
    const color     = this._getColor(ctx.colors);
    const isMinimal = ctx.styles.includes('minimal');
    const isNeon    = ctx.styles.includes('neon');
    const isDark    = ctx.styles.includes('dark');

    const tableBg  = isMinimal ? '#fff' : '#1e2130';
    const headerBg = `linear-gradient(135deg,${color.gradient})`;
    const rowHover = isNeon ? `${color.primary}15` : isMinimal ? '#f9fafb' : 'rgba(255,255,255,0.03)';
    const textClr  = isMinimal ? '#1f2937' : '#e2e8f0';
    const border   = isMinimal ? '1px solid #e5e7eb' : '1px solid rgba(255,255,255,0.06)';

    const rows = [
      ['김민준', '개발팀', '시니어 개발자', '재직중'],
      ['이서연', '디자인팀', 'UX 디자이너', '재직중'],
      ['박지호', '마케팅팀', '마케터', '휴직중'],
      ['최수아', '기획팀', 'PM', '재직중'],
      ['정현우', '개발팀', '주니어 개발자', '수습중'],
    ];

    const tRows = rows.map(r => {
      const tagClass = r[3] === '재직중' ? 'badge-green' : r[3] === '휴직중' ? 'badge-yellow' : 'badge-blue';
      return `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><span class="badge ${tagClass}">${r[3]}</span></td></tr>`;
    }).join('');

    const css = `
body{background:${isDark ? 'linear-gradient(135deg,#0a0a14,#111827)' : 'linear-gradient(135deg,#0f0f1e,#1a1a30)'};}
.t-wrap{width:100%;max-width:680px;overflow:hidden;border-radius:16px;
  box-shadow:${isNeon ? `0 0 20px ${color.primary}44,0 8px 32px rgba(0,0,0,0.4)` : '0 8px 32px rgba(0,0,0,0.4)'};
  border:${isNeon ? `1px solid ${color.primary}66` : border};}
table{width:100%;border-collapse:collapse;background:${tableBg};}
thead tr{background:${headerBg};}
thead th{padding:14px 16px;text-align:left;font-size:12px;font-weight:700;color:#fff;letter-spacing:0.5px;text-transform:uppercase;}
tbody tr{border-bottom:${border};transition:background 0.15s;}
tbody tr:last-child{border-bottom:none;}
tbody tr:hover{background:${rowHover};}
td{padding:13px 16px;font-size:13px;color:${textClr};}
.badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:600;}
.badge-green{background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);}
.badge-yellow{background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);}
.badge-blue{background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);}`;

    const html = `
<div class="t-wrap">
  <table>
    <thead><tr><th>이름</th><th>부서</th><th>직함</th><th>상태</th></tr></thead>
    <tbody>${tRows}</tbody>
  </table>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── NAV ── */
  static nav(ctx) {
    const color      = this._getColor(ctx.colors);
    const isGlass    = ctx.styles.includes('glass');
    const isMinimal  = ctx.styles.includes('minimal');
    const isGradient = ctx.styles.includes('gradient');
    const isDark     = ctx.styles.includes('dark');

    const navBg = isGlass    ? 'rgba(255,255,255,0.08)'
                : isMinimal  ? '#fff'
                : isGradient ? `linear-gradient(135deg,${color.gradient})`
                : '#1e2130';

    const textClr = (isMinimal && !isGradient) ? '#374151' : '#f0f0f8';
    const border  = isGlass   ? '1px solid rgba(255,255,255,0.12)'
                  : isMinimal ? '1px solid #e5e7eb'
                  : 'none';
    const btnBg   = (isGradient && !isMinimal) ? 'rgba(255,255,255,0.2)' : color.primary;

    const css = `
body{background:${isDark ? 'linear-gradient(135deg,#0a0a14,#111827)' : 'linear-gradient(135deg,#0f0f1e,#1a1a30)'};align-items:flex-start;padding:0;}
.vbc-nav{
  width:100%;background:${navBg};
  border-bottom:${border};
  padding:0 28px;height:60px;
  display:flex;align-items:center;justify-content:space-between;
  backdrop-filter:${isGlass ? 'blur(20px)' : 'none'};
  box-shadow:0 4px 24px rgba(0,0,0,0.3);
}
.nav-logo{font-size:18px;font-weight:800;color:${isGradient ? '#fff' : color.primary};letter-spacing:-0.5px;}
.nav-links{display:flex;align-items:center;gap:6px;}
.nav-link{
  padding:7px 14px;border-radius:8px;
  color:${textClr};font-size:13px;font-weight:500;
  cursor:pointer;transition:all 0.2s;border:none;background:none;
  font-family:inherit;opacity:0.75;
}
.nav-link:hover,.nav-link.active{opacity:1;background:rgba(255,255,255,0.1);}
.nav-link.active{color:${isGradient ? '#fff' : color.primary};font-weight:700;}
.nav-btn{
  padding:8px 20px;border-radius:8px;
  background:${btnBg};
  border:none;color:#fff;
  font-size:13px;font-weight:700;font-family:inherit;
  cursor:pointer;transition:all 0.2s;
  box-shadow:0 4px 12px ${color.primary}44;
}
.nav-btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px ${color.primary}66;}
.nav-page{padding:60px 40px;color:${textClr};opacity:0.4;font-size:13px;text-align:center;}`;

    const html = `
<div style="width:100%">
  <nav class="vbc-nav">
    <div class="nav-logo">✦ MyApp</div>
    <div class="nav-links">
      <button class="nav-link active">홈</button>
      <button class="nav-link">소개</button>
      <button class="nav-link">서비스</button>
      <button class="nav-link">포트폴리오</button>
      <button class="nav-link">연락처</button>
    </div>
    <button class="nav-btn">시작하기</button>
  </nav>
  <div class="nav-page">페이지 컨텐츠가 여기에 표시됩니다.</div>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── HERO ── */
  static hero(ctx) {
    const color      = this._getColor(ctx.colors);
    const isGradient = ctx.styles.includes('gradient');
    const isAnimated = ctx.styles.includes('animated');
    const isNeon     = ctx.styles.includes('neon');
    const isMinimal  = ctx.styles.includes('minimal');

    const heroBg = isGradient ? `linear-gradient(135deg,${color.gradient},#7c3aed)`
                 : isNeon     ? '#0d0d1a'
                 : isMinimal  ? 'linear-gradient(135deg,#f8faff,#eef0f8)'
                 : 'linear-gradient(135deg,#0f0f1e,#1a1a30)';

    const textClr  = isMinimal ? '#1f2937' : '#f0f0f8';
    const subClr   = isMinimal ? '#6b7280' : 'rgba(240,240,248,0.7)';
    const btnBg1   = isMinimal ? color.primary : isGradient ? 'rgba(255,255,255,0.25)' : color.primary;
    const btn2Bdr  = isMinimal ? `2px solid ${color.primary}` : '2px solid rgba(255,255,255,0.4)';

    const orbs = isAnimated && !isMinimal ? `
<div class="orb orb1"></div>
<div class="orb orb2"></div>
<div class="orb orb3"></div>` : '';

    const css = `
body{padding:0;background:${heroBg};}
.vbc-hero{
  width:100%;min-height:100vh;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  text-align:center;padding:60px 40px;
  position:relative;overflow:hidden;
  background:${heroBg};
}
${isNeon ? `.vbc-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,${color.primary}18 0%,transparent 70%);}` : ''}
.orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:0.3;animation:orbFloat 6s ease-in-out infinite;}
.orb1{width:300px;height:300px;background:${color.primary};top:-100px;left:-100px;animation-delay:0s;}
.orb2{width:200px;height:200px;background:#7c3aed;bottom:-80px;right:-60px;animation-delay:2s;}
.orb3{width:150px;height:150px;background:#06b6d4;top:50%;left:50%;transform:translate(-50%,-50%);animation-delay:4s;}
@keyframes orbFloat{0%,100%{transform:translate(0,0);}50%{transform:translate(20px,20px);}}
.hero-badge{
  display:inline-block;padding:5px 14px;border-radius:20px;
  background:${color.primary}22;border:1px solid ${color.primary}55;
  color:${color.primary};font-size:12px;font-weight:700;
  letter-spacing:1px;text-transform:uppercase;margin-bottom:20px;
  ${isAnimated ? 'animation:badgePop 0.6s ease both;' : ''}
}
@keyframes badgePop{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}
.hero-title{
  font-size:clamp(36px,6vw,60px);font-weight:900;
  color:${textClr};line-height:1.15;
  letter-spacing:-1.5px;margin-bottom:18px;
  ${isAnimated ? 'animation:titleIn 0.7s 0.15s ease both;' : ''}
}
@keyframes titleIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.hero-title span{
  background:linear-gradient(135deg,${color.gradient});
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hero-sub{
  font-size:16px;color:${subClr};
  max-width:520px;line-height:1.7;margin-bottom:36px;
  ${isAnimated ? 'animation:titleIn 0.7s 0.3s ease both;' : ''}
}
.hero-btns{
  display:flex;gap:14px;flex-wrap:wrap;justify-content:center;
  ${isAnimated ? 'animation:titleIn 0.7s 0.45s ease both;' : ''}
}
.h-btn{padding:14px 34px;border-radius:12px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;transition:all 0.25s;}
.h-btn-primary{background:${btnBg1};border:none;color:#fff;box-shadow:0 6px 24px ${color.primary}55;}
.h-btn-primary:hover{transform:translateY(-3px);box-shadow:0 10px 32px ${color.primary}88;}
.h-btn-secondary{background:transparent;border:${btn2Bdr};color:${isMinimal ? color.primary : 'rgba(255,255,255,0.85)'};}
.h-btn-secondary:hover{background:rgba(255,255,255,0.1);transform:translateY(-2px);}`;

    const html = `
<section class="vbc-hero">
  ${orbs}
  <div class="hero-badge">✦ NEW RELEASE</div>
  <h1 class="hero-title">아이디어를<br/><span>현실로</span> 만들다</h1>
  <p class="hero-sub">Vibe Coding Canvas로 자연어만으로 아름다운 UI 컴포넌트를 즉시 생성하세요. 디자인의 미래를 경험하세요.</p>
  <div class="hero-btns">
    <button class="h-btn h-btn-primary">지금 시작하기</button>
    <button class="h-btn h-btn-secondary">더 알아보기</button>
  </div>
</section>`;

    return this._wrapPage(html, css);
  }

  /* ── MODAL ── */
  static modal(ctx) {
    const color      = this._getColor(ctx.colors);
    const isGlass    = ctx.styles.includes('glass');
    const isNeon     = ctx.styles.includes('neon');
    const isMinimal  = ctx.styles.includes('minimal');
    const isAnimated = ctx.styles.includes('animated');

    const modalBg = isGlass   ? 'rgba(255,255,255,0.1)'
                  : isMinimal ? '#fff'
                  : '#1e2130';
    const textClr = isMinimal ? '#1f2937' : '#f0f0f8';
    const subClr  = isMinimal ? '#6b7280' : '#888aaa';
    const border  = isNeon    ? `1px solid ${color.primary}`
                  : isGlass   ? '1px solid rgba(255,255,255,0.15)'
                  : isMinimal ? '1px solid #e5e7eb'
                  : '1px solid rgba(255,255,255,0.07)';
    const btnBg   = `linear-gradient(135deg,${color.gradient})`;

    const css = `
body{background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);}
.modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);}
.vbc-modal{
  background:${modalBg};border:${border};border-radius:20px;padding:32px;
  max-width:420px;width:90%;
  backdrop-filter:${isGlass ? 'blur(24px)' : 'none'};
  box-shadow:${isNeon ? `0 0 30px ${color.primary}55,0 20px 60px rgba(0,0,0,0.5)` : '0 20px 60px rgba(0,0,0,0.5)'};
  ${isAnimated ? 'animation:modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1);' : ''}
}
@keyframes modalIn{from{opacity:0;transform:scale(0.8);}to{opacity:1;transform:scale(1);}}
.modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.modal-title{font-size:18px;font-weight:800;color:${textClr};}
.modal-close{width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,0.08);border:none;color:${subClr};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
.modal-close:hover{background:rgba(233,69,96,0.2);color:#e94560;}
.modal-icon{width:56px;height:56px;border-radius:16px;background:${color.primary}22;border:1px solid ${color.primary}44;display:flex;align-items:center;justify-content:center;font-size:24px;margin:0 auto 16px;}
.modal-body{text-align:center;}
.modal-heading{font-size:17px;font-weight:700;color:${textClr};margin-bottom:10px;}
.modal-desc{font-size:13px;color:${subClr};line-height:1.65;}
.modal-footer{display:flex;gap:10px;margin-top:24px;}
.modal-btn{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;transition:all 0.2s;}
.modal-btn-primary{background:${btnBg};border:none;color:#fff;box-shadow:0 4px 16px ${color.primary}44;}
.modal-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px ${color.primary}66;}
.modal-btn-secondary{background:transparent;border:1px solid ${isMinimal ? '#d1d5db' : 'rgba(255,255,255,0.15)'};color:${subClr};}
.modal-btn-secondary:hover{background:rgba(255,255,255,0.06);}`;

    const html = `
<div class="modal-overlay">
  <div class="vbc-modal">
    <div class="modal-header">
      <span class="modal-title">알림</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-icon">✦</div>
      <div class="modal-heading">작업이 완료되었습니다</div>
      <p class="modal-desc">모든 변경사항이 성공적으로 저장되었습니다. 계속 진행하시겠습니까?</p>
    </div>
    <div class="modal-footer">
      <button class="modal-btn modal-btn-secondary">취소</button>
      <button class="modal-btn modal-btn-primary">확인</button>
    </div>
  </div>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── LIST ── */
  static list(ctx) {
    const color      = this._getColor(ctx.colors);
    const isMinimal  = ctx.styles.includes('minimal');
    const isNeon     = ctx.styles.includes('neon');
    const isGlass    = ctx.styles.includes('glass');
    const isAnimated = ctx.styles.includes('animated');

    const listBg  = isGlass   ? 'rgba(255,255,255,0.07)' : isMinimal ? '#fff' : '#1e2130';
    const textClr = isMinimal ? '#1f2937' : '#f0f0f8';
    const subClr  = isMinimal ? '#6b7280' : '#888aaa';
    const border  = isMinimal ? '1px solid #f3f4f6' : '1px solid rgba(255,255,255,0.06)';
    const hoverBg = isMinimal ? '#f9fafb' : 'rgba(255,255,255,0.04)';

    const items = [
      { icon: '📌', title: '프로젝트 기획서 작성', tag: '중요', done: true },
      { icon: '🎨', title: 'UI 디자인 시스템 구축', tag: '진행중', done: false },
      { icon: '⚡', title: 'API 성능 최적화', tag: '대기', done: false },
      { icon: '🔍', title: '코드 리뷰 진행', tag: '진행중', done: false },
      { icon: '📊', title: '분기별 보고서 작성', tag: '완료', done: true },
    ];

    const listItems = items.map((item, i) => {
      const tagClass = item.tag === '중요' ? 'tag-red' : item.tag === '진행중' ? 'tag-blue' : item.tag === '완료' ? 'tag-green' : 'tag-gray';
      const delay = isAnimated ? ` style="animation-delay:${i * 0.08}s"` : '';
      return `<li class="list-item${item.done ? ' done' : ''}${isAnimated ? ' animated' : ''}"${delay}>
  <span class="li-icon">${item.icon}</span>
  <div class="li-content"><span class="li-title">${item.title}</span></div>
  <span class="li-tag ${tagClass}">${item.tag}</span>
</li>`;
    }).join('');

    const css = `
.vbc-list-wrap{width:100%;max-width:460px;}
.list-title{font-size:16px;font-weight:800;color:${textClr};margin-bottom:12px;padding:0 4px;}
.vbc-list{
  background:${listBg};
  border:1px solid ${isNeon ? color.primary : isGlass ? 'rgba(255,255,255,0.12)' : isMinimal ? '#e5e7eb' : 'rgba(255,255,255,0.07)'};
  border-radius:16px;overflow:hidden;
  backdrop-filter:${isGlass ? 'blur(16px)' : 'none'};
  box-shadow:${isNeon ? `0 0 20px ${color.primary}33,0 8px 32px rgba(0,0,0,0.3)` : '0 8px 32px rgba(0,0,0,0.3)'};
  list-style:none;
}
.list-item{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:${border};transition:background 0.15s;cursor:pointer;}
.list-item:last-child{border-bottom:none;}
.list-item:hover{background:${hoverBg};}
.list-item.animated{animation:listIn 0.4s ease both;}
@keyframes listIn{from{opacity:0;transform:translateX(-12px);}to{opacity:1;transform:translateX(0);}}
.list-item.done .li-title{text-decoration:line-through;opacity:0.4;}
.li-icon{font-size:18px;width:28px;text-align:center;flex-shrink:0;}
.li-content{flex:1;}
.li-title{font-size:13px;font-weight:500;color:${textClr};}
.li-tag{padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;}
.tag-red{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);}
.tag-blue{background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);}
.tag-green{background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);}
.tag-gray{background:rgba(156,163,175,0.12);color:#9ca3af;border:1px solid rgba(156,163,175,0.2);}`;

    const html = `
<div class="vbc-list-wrap">
  <div class="list-title">✦ 작업 목록</div>
  <ul class="vbc-list">${listItems}</ul>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── PROFILE ── */
  static profile(ctx) {
    const color      = this._getColor(ctx.colors);
    const isGlass    = ctx.styles.includes('glass');
    const isMinimal  = ctx.styles.includes('minimal');
    const isNeon     = ctx.styles.includes('neon');
    const isGradient = ctx.styles.includes('gradient');
    const isAnimated = ctx.styles.includes('animated');

    const cardBg  = isGlass   ? 'rgba(255,255,255,0.08)' : isMinimal ? '#fff' : '#1e2130';
    const textClr = isMinimal ? '#1f2937' : '#f0f0f8';
    const subClr  = isMinimal ? '#6b7280' : '#888aaa';
    const border  = isNeon    ? `1px solid ${color.primary}`
                  : isGlass   ? '1px solid rgba(255,255,255,0.15)'
                  : isMinimal ? '1px solid #e5e7eb'
                  : '1px solid rgba(255,255,255,0.07)';
    const headerBg= isGradient ? `linear-gradient(135deg,${color.gradient})` : isNeon ? `${color.primary}18` : `${color.primary}22`;

    const css = `
.vbc-profile{
  width:300px;
  background:${cardBg};
  border:${border};border-radius:20px;overflow:hidden;
  backdrop-filter:${isGlass ? 'blur(20px)' : 'none'};
  box-shadow:${isNeon ? `0 0 24px ${color.primary}44,0 12px 40px rgba(0,0,0,0.5)` : '0 12px 40px rgba(0,0,0,0.4)'};
  ${isAnimated ? 'animation:profileIn 0.5s cubic-bezier(0.34,1.56,0.64,1);' : ''}
}
@keyframes profileIn{from{opacity:0;transform:scale(0.85);}to{opacity:1;transform:scale(1);}}
.p-cover{height:90px;background:${headerBg};position:relative;}
${isNeon ? `.p-cover::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,${color.primary}33,transparent 70%);}` : ''}
.p-avatar-wrap{position:relative;width:72px;height:72px;margin:-36px auto 0;}
.p-avatar{
  width:72px;height:72px;border-radius:50%;
  background:linear-gradient(135deg,${color.gradient});
  border:3px solid ${isMinimal ? '#fff' : '#1e2130'};
  display:flex;align-items:center;justify-content:center;
  font-size:28px;font-weight:900;color:#fff;
  box-shadow:0 4px 16px ${color.primary}55;
}
.p-online{position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid ${isMinimal ? '#fff' : '#1e2130'};}
.p-body{padding:14px 20px 20px;text-align:center;}
.p-name{font-size:18px;font-weight:800;color:${textClr};margin-bottom:3px;}
.p-role{font-size:12px;color:${color.primary};font-weight:600;margin-bottom:10px;}
.p-bio{font-size:12px;color:${subClr};line-height:1.6;margin-bottom:16px;}
.p-stats{display:flex;justify-content:center;margin-bottom:16px;}
.p-stat{flex:1;padding:10px;border-right:1px solid ${isMinimal ? '#e5e7eb' : 'rgba(255,255,255,0.07)'};}
.p-stat:last-child{border-right:none;}
.p-stat-n{font-size:16px;font-weight:800;color:${textClr};}
.p-stat-l{font-size:10px;color:${subClr};margin-top:2px;}
.p-follow{
  width:100%;padding:10px;
  background:linear-gradient(135deg,${color.gradient});
  border:none;border-radius:10px;
  color:#fff;font-size:13px;font-weight:700;font-family:inherit;
  cursor:pointer;transition:all 0.2s;
  box-shadow:0 4px 14px ${color.primary}44;
}
.p-follow:hover{transform:translateY(-2px);box-shadow:0 6px 20px ${color.primary}66;}`;

    const html = `
<div class="vbc-profile">
  <div class="p-cover"></div>
  <div class="p-avatar-wrap">
    <div class="p-avatar">K</div>
    <div class="p-online"></div>
  </div>
  <div class="p-body">
    <div class="p-name">김민준</div>
    <div class="p-role">Senior UI Engineer</div>
    <div class="p-bio">자연어로 UI를 만드는 마법사. Vibe Coding으로 아이디어를 현실로 만듭니다.</div>
    <div class="p-stats">
      <div class="p-stat"><div class="p-stat-n">248</div><div class="p-stat-l">프로젝트</div></div>
      <div class="p-stat"><div class="p-stat-n">1.2k</div><div class="p-stat-l">팔로워</div></div>
      <div class="p-stat"><div class="p-stat-n">560</div><div class="p-stat-l">팔로잉</div></div>
    </div>
    <button class="p-follow">팔로우</button>
  </div>
</div>`;

    return this._wrapPage(html, css);
  }

  /* ── DASHBOARD ── */
  static dashboard(ctx) {
    const color      = this._getColor(ctx.colors);
    const isNeon     = ctx.styles.includes('neon');
    const isAnimated = ctx.styles.includes('animated');

    const bg      = '#0f1117';
    const panelBg = '#1a1d2e';
    const border  = 'rgba(255,255,255,0.07)';
    const textClr = '#f0f0f8';
    const subClr  = '#6b7280';

    const stats = [
      { label: '총 방문자', value: '24,521', icon: '👥', change: '+12.5%', up: true },
      { label: '매출', value: '₩8.4M', icon: '💰', change: '+8.2%', up: true },
      { label: '전환율', value: '3.6%', icon: '📈', change: '-1.1%', up: false },
      { label: '활성 사용자', value: '1,847', icon: '⚡', change: '+22.3%', up: true },
    ];

    const statCards = stats.map((s, i) => {
      const delay = isAnimated ? ` style="animation-delay:${i * 0.1}s"` : '';
      return `<div class="dash-stat${isAnimated ? ' animated' : ''}"${delay}>
  <div class="stat-top"><span class="stat-icon">${s.icon}</span><span class="stat-change ${s.up ? 'up' : 'down'}">${s.change}</span></div>
  <div class="stat-value">${s.value}</div>
  <div class="stat-label">${s.label}</div>
</div>`;
    }).join('');

    const barValues = [65, 80, 45, 90, 55, 70, 85];
    const barLabels = ['월', '화', '수', '목', '금', '토', '일'];
    const bars = barValues.map((v, i) => {
      const delay = isAnimated ? ` style="animation-delay:${0.3 + i * 0.06}s"` : '';
      return `<div class="bar-item">
  <div class="bar-fill${isAnimated ? ' animated' : ''}" style="height:${v}%;background:linear-gradient(to top,${color.gradient});"${delay}></div>
  <div class="bar-label">${barLabels[i]}</div>
</div>`;
    }).join('');

    const css = `
body{background:${bg};padding:0;align-items:flex-start;}
.dash-wrap{width:100%;min-height:100vh;background:${bg};padding:24px;}
.dash-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.dash-title{font-size:20px;font-weight:800;color:${textClr};}
.dash-badge{padding:5px 12px;border-radius:6px;background:${color.primary}22;border:1px solid ${color.primary}44;color:${color.primary};font-size:11px;font-weight:700;}
.dash-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.dash-stat{
  background:${panelBg};
  border:1px solid ${isNeon ? color.primary + '44' : border};
  border-radius:14px;padding:16px;
  ${isAnimated ? 'animation:statIn 0.5s ease both;' : ''}
  transition:transform 0.2s,box-shadow 0.2s;
}
.dash-stat:hover{transform:translateY(-3px);box-shadow:0 8px 24px ${color.primary}22;}
@keyframes statIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
.stat-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.stat-icon{font-size:20px;}
.stat-change{font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;}
.stat-change.up{background:rgba(34,197,94,0.15);color:#22c55e;}
.stat-change.down{background:rgba(239,68,68,0.15);color:#ef4444;}
.stat-value{font-size:22px;font-weight:900;color:${textClr};margin-bottom:3px;}
.stat-label{font-size:11px;color:${subClr};}
.dash-chart{background:${panelBg};border:1px solid ${border};border-radius:14px;padding:18px;}
.chart-title{font-size:13px;font-weight:700;color:${textClr};margin-bottom:16px;}
.bar-chart{display:flex;gap:8px;align-items:flex-end;height:100px;}
.bar-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;height:100%;}
.bar-fill{width:100%;border-radius:4px 4px 0 0;min-height:4px;
  ${isAnimated ? 'animation:barGrow 0.6s ease both;' : ''}
}
@keyframes barGrow{from{height:0!important;}to{}}
.bar-label{font-size:10px;color:${subClr};}`;

    const html = `
<div class="dash-wrap">
  <div class="dash-header">
    <div class="dash-title">✦ 대시보드</div>
    <div class="dash-badge">실시간</div>
  </div>
  <div class="dash-stats">${statCards}</div>
  <div class="dash-chart">
    <div class="chart-title">주간 방문자 통계</div>
    <div class="bar-chart">${bars}</div>
  </div>
</div>`;

    return this._wrapPage(html, css);
  }
}

/* ────────────────────────────────────────────────────────────
   5. COMPONENT GENERATOR
   ──────────────────────────────────────────────────────────── */
class ComponentGenerator {
  generate(promptText) {
    const ctx = Parser.parse(promptText);
    const primary = ctx.components[0];

    const templateMap = {
      button:    'button',
      card:      'card',
      form:      'form',
      table:     'table',
      nav:       'nav',
      hero:      'hero',
      modal:     'modal',
      list:      'list',
      profile:   'profile',
      dashboard: 'dashboard',
    };

    const method = templateMap[primary] || 'card';
    const html   = Templates[method](ctx);
    return { html, ctx, method };
  }
}

/* ────────────────────────────────────────────────────────────
   6. SYNTAX HIGHLIGHTER
   ──────────────────────────────────────────────────────────── */
class SyntaxHighlighter {
  static highlight(code) {
    let out = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // CSS inside <style> blocks
    out = out.replace(
      /(&lt;style[^&]*&gt;)([\s\S]*?)(&lt;\/style&gt;)/g,
      (_, open, body, close) => {
        return `<span class="syn-tag">${open}</span>${this._css(body)}<span class="syn-tag">${close}</span>`;
      }
    );

    // HTML tags
    out = out.replace(
      /(&lt;\/?)([\w!-]+)([^&]*)(&gt;)/g,
      (_, lt, tag, attrs, gt) => {
        const styledAttrs = attrs
          .replace(/([\w:-]+)(=)(&quot;[^&]*&quot;)/g,
            '<span class="syn-attr">$1</span>$2<span class="syn-string">$3</span>')
          .replace(/([\w:-]+)(=)([^\s&>]+)/g,
            '<span class="syn-attr">$1</span>$2<span class="syn-value">$3</span>');
        return `<span class="syn-tag">${lt}${tag}</span>${styledAttrs}<span class="syn-tag">${gt}</span>`;
      }
    );

    return out;
  }

  static _css(css) {
    let out = css.replace(
      /([^{};,\n]+?)(\s*\{)/g,
      '<span class="syn-selector">$1</span>$2'
    );
    out = out.replace(
      /(\s+)([\w-]+)(\s*:\s*)([^;{}]+)(;)/g,
      '$1<span class="syn-prop">$2</span>$3<span class="syn-value">$4</span>$5'
    );
    out = out.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="syn-comment">$1</span>'
    );
    return out;
  }
}

/* ────────────────────────────────────────────────────────────
   7. HISTORY MANAGER
   ──────────────────────────────────────────────────────────── */
class HistoryManager {
  constructor() {
    this.key      = 'vibe_canvas_history';
    this.maxItems = 10;
  }

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  }

  add(prompt, html) {
    const items = this.getAll();
    items.unshift({ prompt, html, ts: Date.now() });
    if (items.length > this.maxItems) items.splice(this.maxItems);
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  clear() {
    localStorage.removeItem(this.key);
  }

  formatTime(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60)    return '방금 전';
    if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

/* ────────────────────────────────────────────────────────────
   8. UI CONTROLLER
   ──────────────────────────────────────────────────────────── */
class VibeCanvas {
  constructor() {
    this.generator   = new ComponentGenerator();
    this.history     = new HistoryManager();
    this.currentHTML = '';
    this.isDark      = true;

    this._bindElements();
    this._bindEvents();
    this._loadHistory();
    this._initResizer();
  }

  _bindElements() {
    this.promptInput        = document.getElementById('promptInput');
    this.generateBtn        = document.getElementById('generateBtn');
    this.clearBtn           = document.getElementById('clearBtn');
    this.previewFrame       = document.getElementById('previewFrame');
    this.previewPlaceholder = document.getElementById('previewPlaceholder');
    this.previewStatus      = document.getElementById('previewStatus');
    this.codeEditor         = document.getElementById('codeEditor');
    this.codePlaceholder    = document.getElementById('codePlaceholder');
    this.codeContent        = document.getElementById('codeContent');
    this.lineNumbers        = document.getElementById('lineNumbers');
    this.copyCodeBtn        = document.getElementById('copyCodeBtn');
    this.historyBtn         = document.getElementById('historyBtn');
    this.historyDropdown    = document.getElementById('historyDropdown');
    this.historyList        = document.getElementById('historyList');
    this.clearHistoryBtn    = document.getElementById('clearHistoryBtn');
    this.themeToggle        = document.getElementById('themeToggle');
    this.charCount          = document.getElementById('charCount');
    this.toast              = document.getElementById('toast');
    this.presetGrid         = document.getElementById('presetGrid');
    this.refreshPreviewBtn  = document.getElementById('refreshPreviewBtn');
  }

  _bindEvents() {
    this.generateBtn.addEventListener('click', () => this._generate());
    this.promptInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this._generate();
    });
    this.promptInput.addEventListener('input', () => {
      this.charCount.textContent = `${this.promptInput.value.length} 자`;
    });
    this.clearBtn.addEventListener('click', () => {
      this.promptInput.value = '';
      this.charCount.textContent = '0 자';
      this.promptInput.focus();
    });
    this.copyCodeBtn.addEventListener('click', () => this._copyCode());

    this.historyBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.historyDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => this.historyDropdown.classList.remove('open'));
    this.historyDropdown.addEventListener('click', e => e.stopPropagation());

    this.clearHistoryBtn.addEventListener('click', () => {
      this.history.clear();
      this._loadHistory();
      this._showToast('히스토리가 삭제되었습니다.');
    });
    this.themeToggle.addEventListener('click', () => this._toggleTheme());

    this.presetGrid.addEventListener('click', e => {
      const btn = e.target.closest('.preset-btn');
      if (!btn) return;
      const preset = btn.dataset.preset;
      this.promptInput.value = preset;
      this.charCount.textContent = `${preset.length} 자`;
      this.promptInput.focus();
      this._generate();
    });

    this.refreshPreviewBtn.addEventListener('click', () => {
      if (this.currentHTML) this._injectPreview(this.currentHTML);
    });
  }

  async _generate() {
    const prompt = this.promptInput.value.trim();
    if (!prompt) {
      this._showToast('설명을 입력해주세요.');
      this.promptInput.focus();
      return;
    }

    this.generateBtn.classList.add('loading');
    this.generateBtn.disabled = true;
    this.previewStatus.textContent = '생성 중...';
    this.previewStatus.className = 'preview-status loading';

    // Brief async pause for UX magic feel
    await new Promise(r => setTimeout(r, 260));

    try {
      const result = this.generator.generate(prompt);
      this.currentHTML = result.html;

      this._injectPreview(result.html);
      this._renderCode(result.html);

      this.history.add(prompt, result.html);
      this._loadHistory();

      this.previewStatus.textContent = '활성';
      this.previewStatus.className = 'preview-status active';
      this.copyCodeBtn.disabled = false;
    } catch (err) {
      this._showToast('생성 중 오류가 발생했습니다.');
      console.error('[VibeCanvas]', err);
    } finally {
      this.generateBtn.classList.remove('loading');
      this.generateBtn.disabled = false;
    }
  }

  _injectPreview(html) {
    this.previewPlaceholder.classList.add('hidden');
    this.previewFrame.classList.remove('hidden');
    this.previewFrame.style.opacity = '0';
    this.previewFrame.srcdoc = html;
    this.previewFrame.onload = () => {
      this.previewFrame.style.transition = 'opacity 0.35s ease';
      this.previewFrame.style.opacity = '1';
    };
  }

  _renderCode(html) {
    this.codePlaceholder.classList.add('hidden');
    this.codeEditor.classList.remove('hidden');
    this.codeEditor.classList.add('slide-in');
    this.codeEditor.addEventListener('animationend', () => {
      this.codeEditor.classList.remove('slide-in');
    }, { once: true });

    const formatted  = this._formatHTML(html);
    const highlighted = SyntaxHighlighter.highlight(formatted);
    this.codeContent.innerHTML = highlighted;

    const lines = formatted.split('\n');
    this.lineNumbers.innerHTML = lines.map((_, i) => i + 1).join('\n');
  }

  _formatHTML(html) {
    // Simple indent pass
    let indent = 0;
    const lines = [];
    const voids = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
    const tokens = html.split(/(?=<)|(?<=>)/g);

    for (const token of tokens) {
      const t = token.trim();
      if (!t) continue;
      if (/^<\//.test(t)) {
        indent = Math.max(0, indent - 1);
        lines.push('  '.repeat(indent) + t);
      } else if (/^<[^/!?]/.test(t)) {
        const tagName = (t.match(/^<([\w-]+)/) || [])[1] || '';
        lines.push('  '.repeat(indent) + t);
        if (!voids.test(tagName) && !t.endsWith('/>')) indent++;
      } else {
        lines.push('  '.repeat(indent) + t);
      }
    }
    return lines.join('\n');
  }

  _copyCode() {
    if (!this.currentHTML) return;
    navigator.clipboard.writeText(this.currentHTML).then(() => {
      this.copyCodeBtn.classList.add('copied');
      this.copyCodeBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg> 복사됨!`;
      this._showToast('코드가 클립보드에 복사되었습니다.');
      setTimeout(() => {
        this.copyCodeBtn.classList.remove('copied');
        this.copyCodeBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg> 복사`;
      }, 2000);
    }).catch(() => this._showToast('클립보드 접근 권한이 없습니다.'));
  }

  _loadHistory() {
    const items = this.history.getAll();
    if (!items.length) {
      this.historyList.innerHTML = '<div class="history-empty">아직 생성된 컴포넌트가 없습니다.</div>';
      return;
    }

    this.historyList.innerHTML = items.map((item, i) => `
<div class="history-item" data-index="${i}">
  <div class="history-item-text">${this._esc(item.prompt)}</div>
  <div class="history-item-time">${this.history.formatTime(item.ts)}</div>
</div>`).join('');

    this.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = items[parseInt(el.dataset.index)];
        this.promptInput.value = item.prompt;
        this.charCount.textContent = `${item.prompt.length} 자`;
        this.currentHTML = item.html;
        this._injectPreview(item.html);
        this._renderCode(item.html);
        this.previewStatus.textContent = '활성';
        this.previewStatus.className = 'preview-status active';
        this.copyCodeBtn.disabled = false;
        this.historyDropdown.classList.remove('open');
      });
    });
  }

  _toggleTheme() {
    this.isDark = !this.isDark;
    document.body.classList.toggle('light-theme', !this.isDark);
    this._showToast(this.isDark ? '다크 모드로 전환됨' : '라이트 모드로 전환됨');
  }

  _showToast(msg, ms = 2500) {
    this.toast.textContent = msg;
    this.toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toast.classList.remove('show'), ms);
  }

  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  _initResizer() {
    const divider = document.getElementById('paneDivider');
    const right   = document.querySelector('.panel-right');
    let dragging = false, startY = 0, startPH = 0, startCH = 0;

    divider.addEventListener('mousedown', e => {
      dragging = true;
      startY  = e.clientY;
      const panes = right.querySelectorAll('.pane');
      startPH = panes[0].offsetHeight;
      startCH = panes[1].offsetHeight;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const delta = e.clientY - startY;
      const nPH   = Math.max(100, startPH + delta);
      const nCH   = Math.max(80,  startCH - delta);
      const total = nPH + nCH;
      const panes = right.querySelectorAll('.pane');
      panes[0].style.flex = `0 0 ${((nPH / total) * 100).toFixed(1)}%`;
      panes[1].style.flex = `0 0 ${((nCH / total) * 100).toFixed(1)}%`;
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    });
  }
}

/* ────────────────────────────────────────────────────────────
   9. BOOT
   ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.vibeCanvas = new VibeCanvas();
});
