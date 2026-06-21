# linQ 后端接口文档

所有接口路径均为 `/api/*`，部署在与前端同源的 TanStack 服务端运行时上（Lovable Cloud 自动部署，无需单独运维 Node.js 进程）。

- **Base URL（生产）**：`https://claudematch.com` 或 `https://claudematch.lovable.app`
- **Base URL（预览）**：`https://project--9a68cb65-7598-4a71-94dc-0abbed0b959d.lovable.app`
- **认证方式**：需要登录的接口在请求头中带 `Authorization: Bearer <access_token>`。token 由 `/api/login` 流程产出（魔法链接 / OTP 登录后，前端的 `supabase.auth.getSession()` 即可取到）。
- **响应包装**：成功 `{ data, message? }`；失败 `{ error }` + HTTP 4xx/5xx。

---

## 1. POST `/api/waitlist`

加入内测排队。无需登录。

```json
// Request
{ "email": "you@example.com" }

// Response 200
{ "data": { "id": "...", "email": "you@example.com", "status": "pending", "created_at": "..." }, "message": "Joined the waitlist" }
```

## 2. GET `/api/stats`

获取首页统计（含基数 156,000 + 真实排队数）。无需登录。

```json
{ "data": { "waitlist_count": 156073, "real_signups": 73, "updated_at": "..." } }
```

## 3. POST `/api/login`

邮箱魔法链接 / OTP 登录。无需登录。

```json
// Request
{ "email": "you@example.com", "redirect_to": "https://claudematch.com/auth/callback" }

// Response 200
{ "message": "Login email sent. Check your inbox for the magic link or 6-digit code." }
```

用户点击邮件链接后由 Supabase 完成登录，前端通过 `supabase.auth.onAuthStateChange` 拿到 session。

## 4. POST `/api/authorize` 🔒

保存三个场景的授权开关。

```json
// Request
{ "business": true, "dating": true, "partner": false }

// Response 200
{ "data": { "id": "...", "user_id": "...", "business": true, "dating": true, "partner": false, ... } }
```

## 5. POST `/api/ai/generate-profile` 🔒

生成 AI 无感画像（当前为规则占位逻辑，接口稳定，后续可无痛接入真实模型）。

```json
// Request: {}（无 body 亦可）
// Response 200
{ "data": { "id": "...", "user_id": "...", "profile_data": { "version": "v1", "traits": {...}, "interests": [...], ... } } }
```

## 6. POST `/api/ai/match` 🔒

AI 智能匹配 3 人。

```json
// Request
{ "scenario": "dating" }  // 可选: business | dating | partner，默认 dating

// Response 200
{ "data": [
  { "id": "...", "matched_user_id": "...", "match_score": 92.13, "scenario": "dating" },
  ...
], "scenario": "dating" }
```

## 7. POST `/api/ai/meet-plan` 🔒

为某次匹配生成 AI 见面方案。

```json
// Request
{ "match_id": "<uuid>" }

// Response 200
{ "data": { "id": "...", "match_id": "...", "plan_content": { "when": "...", "where": "Blue Bottle Coffee", "activity": "coffee & walk", "icebreakers": [...] } } }
```

## 8. GET `/api/user/me` 🔒

获取当前用户聚合信息。

```json
{ "data": {
  "user": { "id": "...", "email": "..." },
  "profile": { ... },
  "authorizations": { "business": false, "dating": true, "partner": false },
  "ai_profile": { ... } | null
} }
```

🔒 = 需登录。

---

## 前端调用示例

```ts
import { supabase } from "@/integrations/supabase/client";

// 公开接口
await fetch("/api/waitlist", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});

// 受保护接口
const {
  data: { session },
} = await supabase.auth.getSession();
await fetch("/api/user/me", {
  headers: { Authorization: `Bearer ${session?.access_token}` },
}).then((r) => r.json());
```

---

## 数据库结构概览

| 表                  | 字段                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| profiles            | id (=auth.users.id), email, created_at, updated_at                      |
| user_authorizations | id, user_id (unique), business, dating, partner, created_at, updated_at |
| user_profiles       | id, user_id, profile_data (jsonb), created_at                           |
| matches             | id, user_id, matched_user_id, match_score, scenario, created_at         |
| meet_plans          | id, match_id, plan_content (jsonb), created_at                          |
| waitlist            | id, email (unique), status, created_at                                  |

所有用户数据均启用了 RLS：只能读写属于自己的行；`waitlist` 仅服务端可访问。

---

## 本地开发

```bash
bun install
bun run dev    # 前后端一起启动在 http://localhost:8080
```

`.env` 已由 Lovable Cloud 自动配置，无需手动填写数据库地址或密钥。
