# linQ

> AI 匹配 — Business / Dating / Local friends
> https://claudematch.com

linQ 把"找对人"这件事从信息流 / 标签匹配，升级为**真人行为画像 + AI 策划线下见面方案**。产品的商业模型是**餐厅返点抽成**——用户真去线下吃饭，餐厅按比例给我们佣金；用户始终不付钱。

## 技术栈

- **前端 / SSR**：TanStack Start + React 19 + TailwindCSS
- **数据 / Auth**：Supabase（Postgres + RLS + Auth + Storage）
- **AI 推理**：DeepSeek（5 轮推理 + Round 6 persona tournament + memory layer）
- **部署**：Lovable Cloud（Cloudflare Workers 前面，60s gateway timeout）
- **邮件**：Resend（24h follow-up / 7-day NPS / weekly digest）

## 仓库结构

```
src/
├── components/        # 共用 UI（AppShell, CookieBanner, MatchCard, PlanCard, …）
├── hooks/              # 自定义 hooks（useFetchWithRetry, …）
├── integrations/
│   └── supabase/       # Supabase 客户端（**auto-gen，不要手改**）
├── lib/
│   ├── api/            # API 工具（authedFetch, _helpers, _deepseek, fetch-with-timeout, …）
│   ├── email/          # 邮件模板 + 发送 + scheduler
│   ├── i18n.tsx        # 3 语言 i18n 上下文
│   └── useT.ts         # 统一 t() hook
├── routes/             # TanStack Router 文件路由
│   ├── _authenticated/ # 需登录的页面（start, match, profile, settings, founder）
│   ├── api/            # server routes
│   │   ├── ai/         # /api/ai/*  (match, meet-plan, generate-profile)
│   │   ├── auth/       # /api/auth/* (login, wechat, wechat/callback, wechat/unbind)
│   │   ├── venues/     # /api/venues/* (lookup, track) — R1 餐厅
│   │   ├── feedback/   # /api/feedback/* (pattern, nps)
│   │   ├── email/      # /api/email/* (visit-confirm) — R1 返点
│   │   ├── admin/      # /api/admin/reconciliation — founder
│   │   ├── user/       # /api/user/* (me, set-city)
│   │   ├── waitlist.ts
│   │   ├── login.ts
│   │   └── stats.ts
│   ├── founder.tsx     # founder 后台（X-Founder-Key auth）
│   ├── __root.tsx      # 根布局
│   ├── index.tsx       # 公开首页
│   ├── auth.tsx        # 登录页
│   ├── blog.tsx        # 博客列表
│   └── ...
├── server.ts           # Cloudflare Worker 入口
└── start.ts            # 工作进程入口

supabase/
└── migrations/         # SQL migration（按时间戳编号）

scripts/                 # 离线脚本（爬虫 / 优化 / founder 工具）
├── scrape-amap.mjs              # 高德 API 餐厅数据抓取（R1）
├── import-venues.mjs            # JSONL → SQL migration
├── generate-ai-personas.mjs     # 200 个 AI 角色（冷启动）
├── optimize-images.mjs          # AVIF + WebP 转换
├── lighthouse.mjs               # Lighthouse audit
├── lighthouse.sh                # 上面那个的 wrapper
├── check-secrets.mjs            # pre-commit hook
└── README.md                    # 脚本使用说明
```

## 本地开发

```bash
# 1. 安装依赖
bun install

# 2. 复制 .env.example 到 .env（先填 Supabase URL/anon key + 后续的 RESEND_API_KEY 等）
cp .env.example .env

# 3. 启动 dev server（Lovable Cloud 在 PR review 流程里跑；本地用 bun run dev）
bun run dev

# 4. 跑 migration（去 Lovable SQL editor，不是这里）
#   supabase/migrations/ 下所有 .sql 文件按时间戳顺序在 Lovable SQL editor 跑
```

## 关键脚本用法

```bash
# 拉餐厅数据（高德 API，需要先注册 key）
node scripts/scrape-amap.mjs           # 输出 scripts/output/venues-*.jsonl
node scripts/import-venues.mjs         # 输出 scripts/output/import-venues.sql → Lovable 跑

# 200 AI 角色（冷启动）
node scripts/generate-ai-personas.mjs  # 输出 scripts/output/ai-personas.sql → Lovable 跑

# 图片优化（生成 AVIF + WebP 变体）
bun add -d sharp
node scripts/optimize-images.mjs      # 输出 src/assets/moment-*.{webp,avif}

# Lighthouse 本地审计
bash scripts/lighthouse.sh

# Pre-commit secret 守卫（装一次）
ln -s ../../scripts/check-secrets.mjs .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## 常见任务

### "我刚加了一个新页面，要怎么接 i18n？"

```tsx
import { LanguageProvider, useLang } from "@/lib/i18n";

function MyPage() {
  const { lang } = useLang();
  // 内联三元组（content string, 频繁 A/B 测试时用）
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;
  return <h1>{t("Hello", "你好", "你好")}</h1>;
}

export const Route = createFileRoute("/my-page")({
  component: () => (
    <LanguageProvider>
      <MyPage />
    </LanguageProvider>
  ),
});
```

### "我要加一个 server route 调 Supabase"

```ts
import { createFileRoute } from "@tanstack/react-router";
import { json, preflight, requireUser, safeError } from "@/lib/api/_helpers.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/my-thing")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;
        // ... your logic
        return json({ data: { ok: true } }, undefined, request);
      },
    },
  },
});
```

### "我要修改 AI 画像的 prompt"

`src/routes/api/ai/generate-profile.ts` 是入口。Round 1-6 都在这。**不要**改 `src/lib/api/_deepseek.server.ts`——它是通用 helper，被所有 AI 路由共享。

### "我要加一个新的 founder dashboard 视图"

`/founder` SPA 调 `/api/admin/reconciliation`。新加 query param 分支：

- `reconciliation.ts` 里加 `if (url.searchParams.get("xxx"))` 分支
- 加 SQL view 到新 migration
- 在 `founder.tsx` 加新 section 组件

## 重要约束

- ❌ **不要修改** `src/integrations/supabase/{client,client.server,auth-attacher,auth-middleware,types}.ts`（Lovable 自动生成）
- ❌ **不要修改** `src/routeTree.gen.ts`（Lovable 自动生成）
- ❌ **不要修改** `vite.config.ts`（Lovable 配置）
- ❌ **不要把 API key 写进任何 git-tracked 文件**（pre-commit hook 会拦截 re\_/sk-/AIza 等格式）
- ✅ 所有 server route 用 `OPTIONS + POST` 两个 handler，`OPTIONS` 必须传 `request` 给 preflight（**否则跨域 preflight 会失败**）
- ✅ 所有 server route 错误用 `safeError(e)` 转换后返回，**不要直接 return json({ error: e.message })**
- ✅ 所有 user-facing 错误用 `translateError(msg, lang)` 本地化（zh/yue/en）

## Founder 工具

- 浏览器打开 https://claudematch.com/founder
- 输 `FOUNDER_API_KEY` env 里的值
- 看 4 个 section：funnel summary / 餐厅排行榜 / NPS / pending 24h confirmations

## 文档

- `OPTIMIZATION.md` — 后 P0 的 backlog + 3 月路线图
- `scripts/README.md` — 离线脚本操作手册
- `~/CLAUDE.md` / `~/AGENTS.md`（如果存在）— Mavis 的跨项目记忆

## 故障排查

**"401 session_expired"** — JWT 过期。`authedFetch` 会自动 signOut + redirect 到 `/auth?reason=session_expired`。

**"Lighthouse LCP > 2.5s"** — Hero 还没优化（pictures/<source> 没生效）。跑 `bun add -d sharp && node scripts/optimize-images.mjs` 然后 commit + push。

**"所有 /api/ai/\* 504"** — Cloudflare 60s gateway 触顶。检查 `optimize-images.mjs` 输出的 v4+ round 5+6 是否还在跑（已经并行化，如果还 504 减 max_tokens）。

**"Founder dashboard 显示 'No data'"** — SQL view 没建。跑 `supabase/migrations/20260610210000_reconciliation_views.sql`。
