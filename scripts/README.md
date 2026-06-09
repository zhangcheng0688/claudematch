# scripts/ — Venue data pipeline

> 餐厅数据从"高德 Places API" → JSONL → SQL migration → Supabase venues 表 → meet-plan LLM 选店 → PlanCard 真实展示。

## 一次性 setup（约 20 分钟）

1. **注册高德开发者账号**
   - 去 https://lbs.amap.com 注册（用企业主体通过率高）
   - 创建一个 **Web Service API** 类型的 key（**不是** Web/JS API key）
   - 把 key 写到本地环境变量：
     ```bash
     echo 'AMAP_WEB_API_KEY=你的key' >> .env.local
     ```
   - **不要**把 key commit 到 git — 它已被 .gitignore（如果你的 .env 不在 gitignore 内，我会修）

2. **拉数据**（约 1-2 分钟，~150-200 calls）
   ```bash
   node scripts/scrape-amap.mjs
   # 输出: scripts/output/venues-YYYY-MM-DD.jsonl
   # 预计 250-450 行（深圳 + 上海，加上去重）
   ```

3. **生成 SQL**（秒级）
   ```bash
   node scripts/import-venues.mjs
   # 输出: scripts/output/import-venues.sql
   ```

4. **在 Lovable 跑 migration**
   - Lovable 项目 → 左侧菜单 → **SQL Editor** → 新建 query
   - 打开 `scripts/output/import-venues.sql` → 复制全部 → 粘贴进 query → **Run**
   - 看到 "Success. 400 rows affected" 即可

5. **建 schema 表**（如果还没建）
   - 先跑 `supabase/migrations/20260609210000_venues_and_attributions.sql`（这个建 venues + meetup_attributions 两张表 + RLS）
   - 再跑步骤 4 的数据 import

## 增量更新

新店 / 信息变更时：
```bash
node scripts/scrape-amap.mjs
node scripts/import-venues.mjs
# 把生成的 SQL 再去 Lovable 跑一次
```

`ON CONFLICT (amap_id) DO UPDATE` 语义：
- **会更新**：name / address / lat / lng / tel / photos / rating / opening_hours
- **不会更新**：commission_pct / booking_method / notes / is_active（这些是手工维护的，保留）

## 文件清单

| 文件 | 角色 |
|---|---|
| `scrape-amap.mjs` | 调高德 Places API，写 JSONL |
| `import-venues.mjs` | JSONL → SQL migration |
| `output/venues-*.jsonl` | 抓的原始数据（gitignore 候选） |
| `output/import-venues.sql` | 生成的 SQL（直接跑） |
| `../supabase/migrations/20260609210000_venues_and_attributions.sql` | 建表 + RLS |

## 数据量预期

- 高德免费 tier：6000 calls/天
- 30 关键词 × 2 城市 = ~60 calls（首次 1-2 分钟）
- 25 results/call × 60 calls = 1500 原始 POI → 去重后预计 **250-450** 家
- 目标：每城市 200 家（2 城市 400 家）

## 不抓的字段（说明）

高德 API **不提供**：
- `price_per_person`（人均）—— **null**，等后续手工补
- `review_count`（评价数）—— **null**
- 完整营业时间表（`business_time` 是单行字符串"11:00-22:00"，我们原样存）

解决方案：手工补 50-100 家"必吃榜"时，同时补这些字段。脚本生成的 `notes` 字段用于这类标记（"米其林一星 2024 / 人均 1200"）。

## 下一步（商务推进后）

- 谈下返点协议的餐厅：把 `commission_pct` 改成约定值、`booking_method` 改成 `phone` 或 `wechat`
- 餐厅侧 onboarding 工具（让餐厅管理员登录后台看客流）— 后期
- `meetup_attributions` 累积到 1k+ 行后，写对账查询 — 后期
