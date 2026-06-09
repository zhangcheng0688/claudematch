# linQ — Post-P0 Optimization Roadmap

> **Generated**: 2026-06-09 · **Scope**: 30 source files, ~5,500 LOC, 12 API endpoints, 5 user-journey pages, 3 locales.
> **Companion to**: commit `9cb37b5` (P0 hardening) + the prior commits (v3/v4 AI + WeChat OAuth + i18n).

This document is the prioritized backlog for everything **after** the P0 security work. It's split into three layers:

1. **P1 — polish & observability** (8 items, ~1 week)
2. **P2 — performance & SEO** (11 items total; 3 highest-value called out below, ~1 week)
3. **3-month product roadmap** (sequenced for first paying user)

Each item states: what · why · how · effort · value. Use it as a checklist, not a contract — if Sentry data after launch tells us something different is urgent, re-prioritize.

---

## 🟢 P1 — Polish & Observability (1 week)

### P1-1 · DeepSeek per-call timeout tiers + `traceId`
**Effort**: 2h · **Value**: 5min→5sec incident triage

`src/lib/api/_deepseek.server.ts` currently has one 45s timeout for all 8 calls. v4+ runs 3 Rounds serially; one slow call = full request dies. Plus console.error dumps are indistinguishable — we can't tell which Round failed.

**Change**:
- Default timeout drops to **8s per call** (single Round)
- Long-form synthesis gets **30s** (those need 2200-token outputs)
- Each call injects a `traceId` (UUID) into the system prompt header + console.error payload
- Generate-profile returns the `traceId` to the SPA on error so users can paste it in support tickets

```ts
// _deepseek.server.ts
export async function deepseekChat(
  messages: DSMessage[],
  opts: { ... } & { timeoutMs?: number; traceId?: string } = {},
): Promise<string | null> {
  const traceId = opts.traceId ?? randomUUID();
  const t = opts.timeoutMs ?? 8_000;
  // ... fetch with timeout
  console.error("deepseek_call_failed", { traceId, ms: elapsed, status, callSite: opts.label });
  return null;
}
```

**Why this matters**: today when a user reports "AI 画像 failed" we have to ask them to take a screenshot of the browser console, then grep for which Round. With traceId we just look up the ID in Cloudflare logs.

---

### P1-2 · Smarter fallback when DeepSeek is down
**Effort**: 3h · **Value**: 30% of failed requests produce useful output

`src/routes/api/ai/meet-plan.ts:170-204` and `generate-profile.ts` both have a `fallback` branch that returns `"市中心一家精品咖啡馆"` — completely ignoring user input. When DeepSeek is congested (which happens ~30% of evenings per our current observations), the user gets a generic plan that *demonstrates* "this is not actually AI".

**Change**:
- Extract 3 keywords from user input (`extractInterests(input)`)
- Inject the user's `city` from the profile
- Fallback venue becomes `"<city> 的一家 <first interest> 主题精品店"`
- Fallback match reasons use the same `extractInterests` data
- Document the fallback strategy on each endpoint so the next person doesn't undo it

```ts
function extractInterests(input: string): string[] {
  // 2+ char Chinese tokens + 4+ char English tokens
  return Array.from(
    new Set([
      ...(input.match(/[\u4e00-\u9fa5]{2,}/g) ?? []),
      ...(input.match(/[a-z]{4,}/gi) ?? []),
    ]),
  ).slice(0, 3);
}
```

---

### P1-3 · `migrateAiProfile()` consolidation
**Effort**: 0.5 day · **Value**: -30% LOC in start.tsx, single migration point

`src/types/match.ts` keeps v1 (summary/traits/interests) for back-compat. `start.tsx` (960 lines) has ~30 `ai?.X ?? ai?.Y` defensive reads. Result: v1/v3/v4 records mix freely in `user_profiles.profile_data` and the render path is littered with if-else.

**Change**:
- New `src/lib/api/migrate-profile.ts` with one function: `migrateAiProfile(raw: unknown): AiProfile`
- Called once when reading from Supabase
- `start.tsx` reads normalized `AiProfile` only — no more `??` chains
- Optional Supabase migration: `UPDATE user_profiles SET profile_data = profile_data - 'summary' - 'traits' WHERE updated_at < now() - interval '30 days'` (after a 30-day window for safety)

**Why now**: every future schema change otherwise means touching 30+ defensive reads.

---

### P1-4 · `translateError()` — Supabase messages → user-facing strings
**Effort**: 2h · **Value**: locale-correct error UX

`profile.tsx`, `settings.tsx`, `start.tsx` all do `setErr(e.message)` — which surfaces Supabase's English. The Chinese/yue users see raw "User already registered" in the middle of an otherwise localized page.

**Change**:
- New `src/lib/api/translate-error.ts` with map of 5 common errors × 3 langs
- `safeError()` (already added in P0-4) returns the **English public-safe** string; `translateError()` is the second pass that localizes for the UI

```ts
// translate-error.ts
const MAP = {
  en: { "User already registered": "An account with this email already exists. Try signing in." },
  zh: { "User already registered": "这个邮箱已注册过了，请直接登录。" },
  yue: { "User already registered": "呢個 email 已經註冊咗，直接登入啦。" },
};
```

---

### P1-5 · WeChat unbind Idempotency-Key
**Effort**: 1h · **Value**: prevents double-execution on retry / refresh

`/api/auth/wechat/unbind` has no idempotency. Refresh-the-page on the profile screen while the unbind button is mid-flight → server runs it twice. Attacker holding a JWT can script 1000 unbinds/min on a victim's account.

**Change**:
- Client generates `Idempotency-Key: <uuid>` per click
- Server-side LRU map (24h TTL) keyed by the UUID → returns the original response on repeat
- Reject 2nd request with same key but different body (defense against key collision abuse)

```ts
// _helpers.server.ts
const IDEMPOTENCY_CACHE = new Map<string, { result: Response; body: string }>();
// 24h TTL eviction
```

---

### P1-6 ✅ — `/api/feedback/pattern` de-dup
Already shipped in the P0 commit (`9cb37b5`). 23505 unique_violation treated as success.

---

### P1-7 · `authedFetch` 401 → redirect to /auth
**Effort**: 1h · **Value**: users with expired JWT don't see white-screen-of-nothing

JWT expires in 1h. Currently if the user's session lapses between page-load and a subsequent fetch, every page that calls `authedFetch` (start, profile, match, settings) shows a cryptic "Unauthorized" error. We need a UX-friendly recovery.

**Change**:
```ts
// src/lib/api/authed-fetch.ts
if (res.status === 401 && typeof window !== "undefined") {
  // Capture the page they were on so /auth can return them after re-login
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/auth?reason=session_expired&next=${next}`;
  throw new Error("redirecting_to_signin");
}
```

---

### P1-8 · CookieBanner a11y + persistence
**Effort**: 2h · **Value**: GDPR compliance + screen-reader users

`src/components/CookieBanner.tsx` has no `role="dialog"`, no escape-to-close, no persistent consent record (it just hides the banner). EU users must be able to: (a) know what they're consenting to, (b) decline, (c) revoke later.

**Change**:
- `role="dialog" aria-labelledby="cookie-banner-title"`
- ESC key dismisses with consent = rejected (GDPR principle: no implicit consent via dismissal)
- Write the choice to `localStorage` AND a `cookie_consents` table (for cross-device revoke via API)
- "Manage cookies" link in the footer → settings page to revoke

```ts
// CookieBanner.tsx
onKeyDown={(e) => { if (e.key === "Escape") reject(); }}
aria-labelledby="cookie-banner-title"
```

---

## 🟡 P2 — Performance & SEO (3 high-value items + 8 deferred)

### P2-key-1 · Image optimization (AVIF + WebP + srcset)
**Effort**: 0.5 day · **Value**: Hero LCP 2.5s→1.2s on 4G

`src/routes/index.tsx:6-11` imports 6 raw `moment-*.jpg` (likely 200-400KB each = ~1.8MB total page weight). The Hero loads eagerly; below-fold moments load lazily. This is the single biggest performance win available without touching the app shell.

**Change**:
- Add `scripts/optimize-images.mjs` using `sharp`:
  - Each source → AVIF (q=55) + WebP (q=75) + original
  - Generate 1x and 2x variants
  - Output to `src/assets/moments/{slug}.{format}` + `.{format}@2x`
- Replace `<img>` with `<picture>` + `srcset` in `Moments`, `WeeklyDate`, `Hero` (if applicable)
- All images: `loading="lazy"` (where below fold) + `decoding="async"` + explicit `width`/`height` (CLS)
- Hero image: `fetchpriority="high"`

```tsx
<picture>
  <source srcSet={`${m.src}.avif 1x, ${m.src}@2x.avif 2x`} type="image/avif" />
  <source srcSet={`${m.src}.webp 1x, ${m.src}@2x.webp 2x`} type="image/webp" />
  <img src={`${m.src}.jpg`} alt={m.name} loading="lazy" decoding="async" width={1024} height={1024} />
</picture>
```

**Expected gains**:
- Hero LCP: **2.5s → 1.2s** (mobile 4G)
- Total page weight: **1.8MB → 380KB**
- Lighthouse Performance: **65 → 92**
- LCP Cumulative Layout Shift: 0 (explicit dimensions)

**Build-time CI hook**: `bun run build` should fail if any `*.jpg` in `src/assets` doesn't have a corresponding `.avif` and `.webp`.

---

### P2-key-2 · Dynamic sitemap
**Effort**: 3h · **Value**: every page indexed + hreflang signals

`src/routes/sitemap[.]xml.ts` is hand-written with 8 static routes. New blog posts are not auto-added; the 3 locales (en/zh/yue) are not declared.

**Change**:
- Move `sitemap[.]xml.ts` to a function that:
  - Lists static routes (`/`, `/auth`, `/blog`, `/terms`, `/privacy`, `/cookies`, `/dpa`, `/trust`)
  - Queries `posts` table for blog articles (assumes a future migration; for now returns empty array — file still works)
  - For each URL, emits 3 `<xhtml:link rel="alternate" hreflang="...">` entries
- Add `<lastmod>` from `updated_at`
- Add `Sitemap: https://claudematch.com/sitemap.xml` to `robots.txt`
- Submit to Google Search Console (manual one-time after deploy)

```xml
<url>
  <loc>https://claudematch.com/</loc>
  <lastmod>2026-06-09</lastmod>
  <xhtml:link rel="alternate" hreflang="en" href="https://claudematch.com/" />
  <xhtml:link rel="alternate" hreflang="zh" href="https://claudematch.com/" />
  <xhtml:link rel="alternate" hreflang="yue" href="https://claudematch.com/" />
</url>
```

---

### P2-key-3 · `<html lang>` synced with i18n
**Effort**: 30min · **Value**: screen readers + Google hreflang discovery

`src/routes/__root.tsx:143` hardcodes `<html lang="en">`. Every user — even the yue-speaking Hong Kong user — sees their browser report this page as English. Screen readers pronounce everything with English phonemes; Google's hreflang algorithm relies partly on `<html lang>` to disambiguate.

**Change**:
- Restructure so `LanguageProvider` wraps `RootShell`
- `RootShell` reads `lang` from `useLang()` and sets `<html lang={lang}>`
- The `head()` of each route's `head: () => ({ meta: [{ ... }]})` doesn't need changes (it sets `<title>` etc. via TanStack Router's HeadContent)

```tsx
// __root.tsx
function RootShell({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <HtmlWrapper>{children}</HtmlWrapper>
    </LanguageProvider>
  );
}
function HtmlWrapper({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
```

The `suppressHydrationWarning` is necessary because the SSR pass renders `lang="en"` (default) and the client hydrates with the user's `localStorage` choice.

---

### P2-deferred · 8 items below the cut-line
(We will revisit these after Sentry data tells us what's actually hurting users. Listed for completeness, **not** in this sprint.)

| # | Item | Effort | Reason deferred |
|---|---|---|---|
| P2-4 | 401 auto-recovery toast (in addition to P1-7 redirect) | 1h | Minor UX polish |
| P2-5 | fetch timeout + degraded UI on `useEffect` fetches | 2h | Visible bug only when API is slow; not common |
| P2-6 | Optimistic UI on `authedFetch` mutations (👍/👎 / save preferences) | 0.5 day | UX nice-to-have |
| P2-7 | Virtualize the match list (when > 20 entries) | 0.5 day | Premature for current user count |
| P2-8 | 404 inside `_authenticated` doesn't redirect to /auth (currently goes via `_authenticated/route.tsx:8-9` redirect → /auth, but the in-between redirect causes a flash) | 1h | Cosmetic |
| P2-9 | Service worker for offline read of last AI profile | 1 day | Out of scope until mobile-first users |
| P2-10 | Lighthouse CI in GitHub Actions | 2h | Needs CI setup (Lovable handles builds but no PR-time perf check) |
| P2-11 | README rewrite for contributor onboarding | 2h | Project is single-dev right now |

---

## 🗓️ 3-Month Product Roadmap

**North star**: 100 real waitlist emails + 5 real AI matches running + 1 paying customer.

### Month 1 · Ship + 5 seed users (4 weeks)
**Goal**: production-ready MVP that 5 real people use without fainting.

| Week | Focus | Deliverable |
|---|---|---|
| 1 | P1 全部 8 条 | Single PR; combined coverage + a11y pass |
| 2 | P2 关键 3 条 + Sentry SDK | Lighthouse mobile 90+; error tracking live |
| 3 | Open waitlist publicly | 50 emails collected (no BASE_COUNT fakery) |
| 4 | 5 seed users · 1:1 onboarding calls | Document 3 pain points each, 1 wishlist item each |

**Definition of done**:
- 0 P0, 0 P1
- Lighthouse mobile Performance ≥ 90
- Sentry active with alerts (error rate > 1% → Slack/email)
- 5 seed users completed full journey: sign-up → profile → match → plan → feedback 👍/👎

---

### Month 2 · Conversion optimization (4 weeks)
**Goal**: 100 real emails on the waitlist · first viral loop.

| Week | Task | Expected impact |
|---|---|---|
| 1 | A/B test Hero CTA: "Join 50+" vs "Every Wed · 7pm" (the new copy) | +20-40% click-through |
| 1 | Trust section real stories (3 seed users, opt-in) | -15% bounce on landing |
| 2 | Exit-intent popup (deferred CTA collection) | +5-10% recovered visitors |
| 2 | Referral mechanism (waitlist position = +1 per share) | K factor 0 → 0.3-0.5 |
| 3 | First deep blog post: "AI 匹配 vs Tinder 的根本差异" (2000 字) | SEO long-tail + 信任 |
| 3 | Resend integration: weekly digest to waitlist (the Wed 7pm story) | List warmth |
| 4 | Top-3 Sentry issues resolved | Stability narrative for next round |

**Anti-goals** (we will NOT do these this month):
- Add a 4th language
- Add a 5th AI field
- Mobile app (iOS / Android)
- Discord / Slack bot

---

### Month 3 · First real match + first paying customer (4 weeks)
**Goal**: 5 real AI matches generated, 1 meet-up happens, 1 paid conversion.

| Week | Task |
|---|---|
| 1 | Active outreach to 5 waitlist users → onboard as 2nd cohort (5 more profile matches = 10 candidate pool) |
| 1 | Match score review with first 2 matches · iterate on prompt if needed |
| 2 | Stripe integration: paywall the `business` scenario (¥99/month) OR pay-per-match (¥19) |
| 2 | Email automation: post-match ping ("你的匹配已就绪") + 7-day re-engagement |
| 3 | The first real meet-up happens (we can be present, take notes) |
| 3 | pattern_feedback signals become training data for prompt v5 (small iteration) |
| 4 | 1 paying customer (likely the seed user most engaged) |
| 4 | i18n dictionary merge (one system) + next 3-month plan |

**Decision at end of Month 3**:
- If paying customer exists → raise prices / add enterprise tier
- If not → revisit core value prop (is "AI matching for business/dating/local" too broad?)
- Either way → write public retrospective

---

## 🎯 Decision Points (need user sign-off)

These are the choices I will defer to you rather than assume. The recommendations in **bold** are what I'd pick if I had to.

### Decision 1 · Batch P1+P2 in one PR or split?
- **Single PR** (4 days, atomic, easier to review) — recommended
- Split into 2 PRs (one for security-adjacent P1, one for perf P2) — cleaner git history

### Decision 2 · Open waitlist now or after P1+P2 land?
- **After P1+P2 land** (Week 2) — recommended
- Now (start collecting emails immediately) — but every waitlist signup before the new copy lands is wasted work

### Decision 3 · Sentry vs Lovable built-in error reporting?
- **Sentry** (free tier, 5K events/month; we won't hit it; real stack traces, user feedback widget) — recommended
- Lovable's built-in (`reportLovableError` already wired in `__root.tsx:62`) — no integration, but limited visibility

### Decision 4 · Image optimization: build-time or SaaS?
- **Build-time with `sharp`** in a `bun run optimize-images` script — recommended (zero ongoing cost)
- Cloudinary / imgix (¥150/mo, auto-format/auto-quality, no build step) — nicer for designers, costs ¥1,800/year

### Decision 5 · Pricing model (Month 3)
- **Pay-per-match ¥19** (low friction, charges at the value moment) — recommended
- Subscription ¥99/month for `business` scenario (predictable revenue, harder to convert first customer)
- Free during beta, paid after 100 users (zero early revenue)

---

## 📌 What this document is NOT

- A contract. If Sentry says error X is causing 30% of failures, we do X before anything else, regardless of where it is on this list.
- An estimate of user value. The "value" column is engineering value (what we get for our time), not user value.
- A feature roadmap for the AI itself. v4 is the current model; v5 is a research question, not a sprint item.

---

## 📍 How to use this

- **Now**: Review the Decision Points (5 choices). Reply with your picks (or "go with recommendations").
- **Week 1**: P1 全部, single PR
- **Week 2**: P2 关键 3 条 + Sentry, single PR
- **Week 3+**: Execute Month 1 plan, check in weekly
- **End of each month**: Update this document with what actually happened (don't let it become a fantasy document)
