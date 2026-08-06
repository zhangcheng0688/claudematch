# CloudMatch (linQ) 项目全面分析报告

> **生成日期**: 2026-07-09
> **分析范围**: 3 个 GitHub 仓库、~23,000 行代码、22 个数据库迁移、32 个 API 端点、微信小程序、设计原型
> **品牌状态**: Claude Match → CloudMatch (外部品牌), linQ (内部代号保留)

---

## 一、项目定位

| 维度 | 内容 |
|---|---|
| **品牌名** | **CloudMatch**（外部）/ **linQ**（内部代号） |
| **官网** | https://claudematch.com |
| **一句话定位** | AI 驱动的深度社交匹配平台 |
| **商业模式** | 餐厅返点抽成（用户免费） |
| **品牌色** | 暖橘红 #E8553A + 深紫 #3D2C5C + 暖黄 #F4B860 |
| **赛事投递** | 深创赛 + 港科大深圳 + TRAE 社区 |

---

## 二、GitHub 仓库（3 仓 Public）

| 仓库 | 创建 | 代码量 |
|---|---|---|
| `zhangcheng0688/claudematch` | 2026-06-02 | ~23K LOC, 163 files |
| `zhangcheng0688/claudematch-weapp` | 2026-06-03 | ~1.2K LOC, 7 pages |
| `zhangcheng0688/claudematch-designs` | 2026-07-02 | React 18 CDN prototype |

---

## 三、技术架构

### 主 Web 应用
- TanStack Start + React 19 + TailwindCSS 4 + Vite 7
- Supabase (PostgreSQL + RLS + Auth + Storage + pgvector)
- DeepSeek (3-call profile pipeline) + OpenAI embeddings
- Lovable Cloud → Cloudflare Workers (60s timeout)
- Resend (email), 高德 API (venues)

### AI Pipeline（核心技术壁垒）
1. **Profile**: 3-call pipeline (Perceive → Synthesize → Refine), 由原 8-call 压缩，20-35s
2. **Match**: pgvector HNSW 相似度预过滤 → Top-K → DeepSeek 精细打分（5 维度 + 依恋风格）
3. **Meet Plan**: 真实坐标计算中点 → nearby_venues() 查询 → LLM 从候选集挑选 → server 校验

### 数据模型
22 个 Supabase 迁移覆盖：基础用户表、微信 OAuth、AI 画像、匹配、见面方案、餐厅 venues、返点 attribution、邮件自动化、AI persona 冷启动、pgvector 嵌入、商家 onboarding、增长运营

---

## 四、开发进度

### ✅ 已完成
安全加固、v4→v5 AI 画像、向量预过滤、geo-grounded 推荐、微信登录、i18n 三语、
R1-R4 餐厅返点、1000 AI persona、Founder 后台、邮件自动化、增长运营、小程序 7 页面、
香港市场、商家表结构

### ⬜ 待完成（按优先级）

#### P1（精修，~1 周）
- traceId + timeout tiers
- Smarter AI fallback
- Profile migration consolidation
- Error i18n (translateError)
- WeChat unbind idempotency
- 401 redirect to /auth
- CookieBanner a11y + GDPR

#### P2（性能，~3 天）
- 图片优化 AVIF+WebP (LCP 2.5s→1.2s)
- 动态 sitemap + hreflang
- html lang 同步 i18n

#### R（返点闭环）
- R5: 商家 onboarding 工具（需先签协议）
- R6: 返点对账系统（需 6+ 月数据）

---

## 五、品牌迁移清单

| 项目 | 当前 | 目标 | 优先级 |
|---|---|---|---|
| GitHub 仓库名 | claudematch | cloudmatch | 中（rename 自动 301） |
| 域名 | claudematch.com | cloudmatch.com | 高（先查可用性） |
| README 品牌说明 | linQ only | linQ (内部) + CloudMatch (外部) | 高 |
| 商业计划书 | Claudematch | CloudMatch | 中 |
| 微信小程序 | ClaudeMatch | CloudMatch | 中 |
| 代码内标识符 | claudematch | cloudmatch | 低（渐进替换） |

---

## 六、待决策事项

1. GitHub rename: claudematch → cloudmatch ?
2. 域名: 保留 claudematch.com 还是注册新域名？
3. P1+P2: 现在冲刺还是先聚焦品牌+商务？
4. Waitlist: 何时去掉 BASE_COUNT，开始收集真实用户？

---

## 七、3 月路线图（来自 OPTIMIZATION.md）

**Month 1**: P1 全部 + P2 关键 3 项 + Sentry + 5 seed users
**Month 2**: A/B test Hero CTA + Referral 机制 + 首篇深度博客 + waitlist 100 emails
**Month 3**: 首个真实 match + 首次返点收入验证 + 商家协议签署

**决策点（Month 3 结束）**:
- 返点流程验证通过 → scale 到 10 家餐厅
- 未通过 → 诊断阻塞点（商家 friction? training? booking validation?）
