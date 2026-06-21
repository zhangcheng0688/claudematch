# linQ — Post-P0 Optimization Roadmap

> **Generated**: 2026-06-09 · **Scope**: 30 source files, ~5,500 LOC, 12 API endpoints, 5 user-journey pages, 3 locales.
> **Companion to**: commit `9cb37b5` (P0 hardening) + the prior commits (v3/v4 AI + WeChat OAuth + i18n).

This document is the prioritized backlog for everything **after** the P0 security work. It's split into three layers:

1. **P1 — polish & observability** (8 items, ~1 week)
2. **P2 — performance & SEO** (11 items total; 3 highest-value called out below, ~1 week)
3. **R — 餐厅返点专项** (the actual revenue model; **highest priority after P0**)
4. **3-month product roadmap** (sequenced for first 返点 收入)

Each item states: what · why · how · effort · value. Use it as a checklist, not a contract — if Sentry data after launch tells us something different is urgent, re-prioritize.

---

## 🔴 R — 餐厅返点专项 (the **revenue model**; this is what pays the bills)

> **Hard constraint from product owner**: linQ 的商业模式 = **用户实际去线下 date 的餐厅返点抽成**。 This is the _only_ way the product makes money. Every P1 / P2 / roadmap item below is downstream of this: if the restaurant data + booking flow isn't perfect, none of the other work matters.

### R1 · 餐厅数据：600 calls → ~400 家深圳 + 上海好餐厅

**Effort**: 1-2h (script write, already done) + 20min setup (高德 key) + 1min run + 5min SQL import
**Value**: **the entire product** — without this, meet-plan is a fiction

**What was done in the R1 commit**:

- `supabase/migrations/20260609210000_venues_and_attributions.sql` — `venues` table (city / district / lat / lng / cuisine_tags / vibe_tags / price_per_person / rating / tel / photos / booking_method / commission_pct / is_active / notes) + `meetup_attributions` table
- `scripts/scrape-amap.mjs` — AMap Places Web API scraper. 30 keywords × 2 cities × 25 results/keyword = ~1500 raw POIs → dedup → expected 250-450 unique venues per city
- `scripts/import-venues.mjs` — JSONL → SQL migration generator. The output is a single .sql file the user pastes into Lovable's SQL editor
- `scripts/README.md` — step-by-step operator guide

**Why AMap (not 大众点评)**:

- AMap has a public, free, documented Web Service API (6000 calls/day)
- 大众点评 has no API, aggressive anti-bot measures, and explicit ToS forbidding scraping
- AMap data is missing 1-2 fields (rating, price_per_person) — we leave those NULL for now, fill in manually for the top 50 必吃榜 entries

**User one-time setup** (estimated 20 minutes total):

1. Register at https://lbs.amap.com (企业账号, faster approval)
2. Create a Web Service API key
3. Set env `AMAP_WEB_API_KEY=<key>` locally
4. `node scripts/scrape-amap.mjs` — wait 1-2 min
5. `node scripts/import-venues.mjs` — instant
6. Open Lovable SQL editor → paste `scripts/output/import-venues.sql` → Run
7. (Pre-req) Run the venues schema migration first if not yet run

---

### R2 · `meet-plan` LLM prompt 改为"从 venues 清单挑店"

**Effort**: 0.5 day (already done in R2 commit) · **Value**: meet-plan 方案是**真实可去的餐厅**

The v2 `meet-plan.ts` asked the LLM to invent `name_example: "xx 区 yy 路某品牌精品咖啡"`. The v3 (in the R2 commit):

1. Server loads ~30 candidate venues from the `venues` table (filtered by user's city + scenario-derived vibe_tags)
2. Embeds the candidate list in the LLM prompt with the requirement: "**MUST pick venue_id from this list — never invent**"
3. Server validates the LLM's `venue_id` outputs against the candidate set (drops hallucinations)
4. Pre-resolves the venue rows into `plan_content.venue_lookup` so the SPA doesn't have to do a follow-up fetch

**Failure mode if venues table is empty**:

- The prompt falls back to "no candidates available, output empty venue_options". The PlanCard renders the old free-text layout in that case. Graceful degradation.

---

### R3 · PlanCard 加"预订 modal" — 3 个一键动作

**Effort**: 0.5 day (already done in R2 commit) · **Value**: the user actually goes to the restaurant

The 3 actions, all **inside linQ** (no external jumping):

- **📞 电话预订** — if `venue.tel` is set, `tel:` URL scheme (opens native dialer); tracks `tap_call` event server-side
- **🗺️ 导航** — `https://uri.amap.com/navigation?to=lng,lat,name&src=linQ&coordinate=gaode` (high-accuracy AMap deep link; falls back to general `maps:` scheme if amap:// not available); tracks `tap_navigate`
- **✅ 我去了** — explicit "I went" confirmation; tracks `confirm_i_went` (the gold signal for future 返点 reconciliation)

**UX notes**:

- The modal is `role="dialog"`, closes on backdrop click + close button + ESC
- The "I went" button is _visually_ the primary CTA (after a successful click it shows a checkmark, no further interaction needed)
- All 3 actions fire-and-forget server tracking; UI doesn't wait for the response

---

### R4 · `meetup_attributions` 表 + `/api/venues/track`

**Effort**: 2h (already done in R2 commit) · **Value**: raw signal for the future 返点 reconciliation query

Append-only table:

```
(user_id, match_id, venue_id, action, metadata, created_at)
```

- `action` enum-ish: `view_details` (modal open), `tap_call`, `tap_navigate`, `confirm_i_went`
- `metadata` JSONB for future fields (e.g. `plan_id`, `deeplink`, `lang`)
- RLS: each user can read their own; writes only via the service-role-backed endpoint (so a malicious client can't attribute other users)
- The endpoint `/api/venues/track` POSTs one row per user action

**What it doesn't do yet** (intentionally):

- No restaurant-side "this user actually showed up" confirmation (we don't have restaurant sign-on yet)
- No 返点 reconciliation query (we wait for actual 数据 to design that query)
- No anonymized aggregate for the founder dashboard (P2 work, not R work)

---

### R5 (deferred) · 商家 onboarding 工具

**When**: After first signed 返点 agreement
**Why deferred**: We have no signed agreements yet. Building a restaurant admin tool before we have users on the other side is YAGNI.

---

### R6 (deferred) · 返点对账系统

**When**: After 6+ months of data
**Why deferred**: We don't know what the right reconciliation shape is until we have 商家 + 流水 + 退款 + 争议. Building prematurely locks in wrong schema.

---

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

`src/routes/api/ai/meet-plan.ts:170-204` and `generate-profile.ts` both have a `fallback` branch that returns `"市中心一家精品咖啡馆"` — completely ignoring user input. When DeepSeek is congested (which happens ~30% of evenings per our current observations), the user gets a generic plan that _demonstrates_ "this is not actually AI".

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
  <img
    src={`${m.src}.jpg`}
    alt={m.name}
    loading="lazy"
    decoding="async"
    width={1024}
    height={1024}
  />
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
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

The `suppressHydrationWarning` is necessary because the SSR pass renders `lang="en"` (default) and the client hydrates with the user's `localStorage` choice.

---

### P2-deferred · 8 items below the cut-line

(We will revisit these after Sentry data tells us what's actually hurting users. Listed for completeness, **not** in this sprint.)

| #     | Item                                                                                                                                                                   | Effort  | Reason deferred                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------- |
| P2-4  | 401 auto-recovery toast (in addition to P1-7 redirect)                                                                                                                 | 1h      | Minor UX polish                                                   |
| P2-5  | fetch timeout + degraded UI on `useEffect` fetches                                                                                                                     | 2h      | Visible bug only when API is slow; not common                     |
| P2-6  | Optimistic UI on `authedFetch` mutations (👍/👎 / save preferences)                                                                                                    | 0.5 day | UX nice-to-have                                                   |
| P2-7  | Virtualize the match list (when > 20 entries)                                                                                                                          | 0.5 day | Premature for current user count                                  |
| P2-8  | 404 inside `_authenticated` doesn't redirect to /auth (currently goes via `_authenticated/route.tsx:8-9` redirect → /auth, but the in-between redirect causes a flash) | 1h      | Cosmetic                                                          |
| P2-9  | Service worker for offline read of last AI profile                                                                                                                     | 1 day   | Out of scope until mobile-first users                             |
| P2-10 | Lighthouse CI in GitHub Actions                                                                                                                                        | 2h      | Needs CI setup (Lovable handles builds but no PR-time perf check) |
| P2-11 | README rewrite for contributor onboarding                                                                                                                              | 2h      | Project is single-dev right now                                   |

---

## 🗓️ 3-Month Product Roadmap

**North star**: 100 real waitlist emails + 5 real AI matches running + first 返点 收入 to bank account.

### Month 1 · Ship + 5 seed users (4 weeks)

**Goal**: production-ready MVP that 5 real people use without fainting.

| Week | Focus                               | Deliverable                                       |
| ---- | ----------------------------------- | ------------------------------------------------- |
| 1    | P1 全部 8 条                        | Single PR; combined coverage + a11y pass          |
| 2    | P2 关键 3 条 + Sentry SDK           | Lighthouse mobile 90+; error tracking live        |
| 3    | Open waitlist publicly              | 50 emails collected (no BASE_COUNT fakery)        |
| 4    | 5 seed users · 1:1 onboarding calls | Document 3 pain points each, 1 wishlist item each |

**Definition of done**:

- 0 P0, 0 P1
- Lighthouse mobile Performance ≥ 90
- Sentry active with alerts (error rate > 1% → Slack/email)
- 5 seed users completed full journey: sign-up → profile → match → plan → feedback 👍/👎

---

### Month 2 · Conversion optimization (4 weeks)

**Goal**: 100 real emails on the waitlist · first viral loop.

| Week | Task                                                              | Expected impact                    |
| ---- | ----------------------------------------------------------------- | ---------------------------------- |
| 1    | A/B test Hero CTA: "Join 50+" vs "Every Wed · 7pm" (the new copy) | +20-40% click-through              |
| 1    | Trust section real stories (3 seed users, opt-in)                 | -15% bounce on landing             |
| 2    | Exit-intent popup (deferred CTA collection)                       | +5-10% recovered visitors          |
| 2    | Referral mechanism (waitlist position = +1 per share)             | K factor 0 → 0.3-0.5               |
| 3    | First deep blog post: "AI 匹配 vs Tinder 的根本差异" (2000 字)    | SEO long-tail + 信任               |
| 3    | Resend integration: weekly digest to waitlist (the Wed 7pm story) | List warmth                        |
| 4    | Top-3 Sentry issues resolved                                      | Stability narrative for next round |

**Anti-goals** (we will NOT do these this month):

- Add a 4th language
- Add a 5th AI field
- Mobile app (iOS / Android)
- Discord / Slack bot

---

### Month 3 · First real match + first 返点 收入 (4 weeks)

**Goal**: 5 real AI matches generated, 1 real meet-up happens, **first 返点 收入**（用户真去餐厅 + 餐厅返点回款）.

| Week | Task                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| 1    | Active outreach to 5 waitlist users → onboard as 2nd cohort (5 more profile matches = 10 candidate pool)                    |
| 1    | Match score review with first 2 matches · iterate on prompt if needed                                                       |
| 2    | (P0 of Month 3) Confirm first 返点 agreement signed — 任何 1 家餐厅，验证返点流程跑通（不用 SaaS，**所有收费 = 餐厅返点**） |
| 2    | Email automation: post-match ping ("你的匹配已就绪") + 7-day re-engagement                                                  |
| 3    | The first real meet-up happens (we can be present, take notes)                                                              |
| 3    | pattern_feedback signals become training data for prompt v5 (small iteration)                                               |
| 4    | First 返点 收入 to bank account · validate the _reconciliation_ query against the merchant's POS data                       |
| 4    | i18n dictionary merge (one system) + next 3-month plan                                                                      |

**Decision at end of Month 3**:

- If 返点 流程 validated → scale to 10 餐厅 agreements + launch the **restaurant admin tool** (R5 unblock)
- If not → what's blocking? Is it 商家 sign-on friction? 商家 staff training? Booking validation? 针对性的修
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

### Decision 5 · Pricing model — **N/A for linQ**

- **linQ does not charge users**. The product is free at the user layer; revenue comes from **餐厅返点** (offline). The user never sees a paywall. This is decided and not up for debate.
- If we ever need to fund early ops, it's via 商家 pre-payments (locked-in 返点 in advance) — not via charging users.
- Any other pricing model (subscription, pay-per-match, freemium) violates the product owner's hard constraint and should be rejected on sight.

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
