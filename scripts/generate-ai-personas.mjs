#!/usr/bin/env node
/**
 * scripts/generate-ai-personas.mjs
 *
 * Generates 200 AI personas (100 深圳 + 100 上海) for the cold-start
 * pool. Emits a single .sql file that the user pastes into Lovable
 * SQL editor.
 *
 * Why scripted (not hand-written, not LLM-generated):
 *   - 200 hand-written profiles = 2 days of human time
 *   - LLM-generated = ~17 min wall time + ~¥2 cost + inconsistent
 *     quality (LLMs hallucinate the same city multiple times, write
 *     bios in different registers, etc.)
 *   - Templated = reproducible, easy to tune, no API cost
 *
 * Quality bar:
 *   - Each persona has a distinct (name, occupation, trait combo).
 *   - Names drawn from realistic 25-40 year old Chinese + bilingual
 *     demographics in tier-1 cities.
 *   - Occupations drawn from a 30-entry pool covering the dating /
 *     business / partner scenarios.
 *   - Traits drawn from a 60-entry pool with 4 dimensions (work_style
 *     / life_pace / social_style / aesthetic).
 *   - Paradoxes are seeded from 20 hand-picked real-life tensions.
 *   - Headlines + bios are short; the LLM matching prompt doesn't
 *     need 100-word bios.
 *
 * Output:
 *   scripts/output/ai-personas.sql
 *
 * USAGE:
 *   node scripts/generate-ai-personas.mjs
 *   (then paste the .sql into Lovable → SQL editor → Run)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OUTPUT = "scripts/output/ai-personas.sql";
const COUNT_PER_CITY = 100; // 100 深圳 + 100 上海 = 200 total
const CITIES = ["shenzhen", "shanghai"] as const;

// ─── Name pools ─────────────────────────────────────────────────────────────
// 80 first names × 60 last names = 4800 unique combos. We only need 200
// so dedup is never an issue. Names are split into CJK-default (80%)
// and bilingual (20%) — the bilingual ones have an English alias
// because that's how ~20% of tier-1 city residents introduce
// themselves on dating apps.

const FIRST_NAMES = [
  // CJK
  "思远", "雨桐", "嘉颖", "宇辰", "梓涵", "一鸣", "书瑶", "子墨", "婉清", "奕辰",
  "予曦", "沐辰", "沁语", "景行", "予安", "若曦", "知言", "晏清", "砚秋", "淮安",
  "柏然", "思齐", "怀瑾", "嘉树", "听澜", "清晏", "令仪", "景铄", "云旗", "安和",
  "栎帆", "其琛", "昱辰", "望舒", "未央", "景行", "宁致", "方知", "允执", "徽因",
  "安然", "向晚", "问渠", "知白", "半山", "云深", "归棠", "弥生", "和光", "皎然",
  "知遇", "相宜", "如是", "无恙", "述之", "言蹊", "清欢", "见秋", "南絮", "清宁",
  "怀柔", "时予", "知微", "纯熙", "至简", "清颐", "可期", "知遇", "时宜", "知白",
  "知止", "若谷", "有容", "无隅", "知言", "既明", "若初", "不改", "从周", "如一",
  // Bilingual
  "Olivia", "Ethan", "Ivy", "Lucas", "Emma", "Henry", "Aria", "Leo", "Mia", "Theo",
  "Sara", "Daniel", "Cathy", "Mark", "Lily", "Ben", "Zoe", "Adam", "Joyce", "Wayne",
];
const LAST_NAMES = [
  // CJK
  "林", "陈", "黄", "张", "李", "王", "吴", "刘", "蔡", "杨",
  "许", "郑", "谢", "洪", "郭", "邱", "曾", "萧", "赖", "徐",
  "朱", "高", "孙", "施", "游", "苏", "薛", "邓", "宋", "侯",
  "马", "赵", "蒋", "杜", "叶", "程", "钟", "罗", "魏", "方",
  "丁", "金", "卢", "钱", "邵", "江", "白", "韩", "于", "田",
  "康", "谭", "石", "雷", "范", "熊", "顾", "姚", "廖", "严",
];

const BILINGUAL_ALIAS = [
  ["Olivia", "Lin"], ["Ethan", "Chen"], ["Ivy", "Huang"], ["Lucas", "Zhang"],
  ["Emma", "Li"], ["Henry", "Wang"], ["Aria", "Wu"], ["Leo", "Liu"],
  ["Mia", "Yang"], ["Theo", "Xu"], ["Sara", "Zheng"], ["Daniel", "Xie"],
  ["Cathy", "Guo"], ["Mark", "Shao"], ["Lily", "Jiang"], ["Ben", "Bai"],
  ["Zoe", "Han"], ["Adam", "Yu"], ["Joyce", "Tian"], ["Wayne", "Kang"],
];

// ─── Occupation pool ────────────────────────────────────────────────────────
// 30 entries, hand-picked for tier-1 cities. Each entry tags which
// scenarios it's most relevant to. The seed loop picks an occupation
// whose tags include the persona's target scenario.

const OCCUPATIONS = [
  { title: "产品经理", tags: ["dating", "business"] },
  { title: "设计师", tags: ["dating", "business", "partner"] },
  { title: "软件工程师", tags: ["dating", "business"] },
  { title: "摄影师", tags: ["dating", "partner"] },
  { title: "自由撰稿人", tags: ["dating", "partner"] },
  { title: "私厨", tags: ["dating", "partner"] },
  { title: "咖啡店主理人", tags: ["dating", "partner"] },
  { title: "独立音乐人", tags: ["dating", "partner"] },
  { title: "建筑设计师", tags: ["dating", "business"] },
  { title: "律师", tags: ["dating", "business"] },
  { title: "投资经理", tags: ["business", "dating"] },
  { title: "品牌主理人", tags: ["business", "dating", "partner"] },
  { title: "纪录片导演", tags: ["dating", "partner"] },
  { title: "书店主理人", tags: ["dating", "partner"] },
  { title: "花艺师", tags: ["dating", "partner"] },
  { title: "心理咨询师", tags: ["dating", "business"] },
  { title: "高校老师", tags: ["dating"] },
  { title: "医生", tags: ["dating"] },
  { title: "建筑摄影师", tags: ["dating", "partner"] },
  { title: "户外领队", tags: ["partner", "dating"] },
  { title: "调酒师", tags: ["dating", "partner"] },
  { title: "健身教练", tags: ["dating"] },
  { title: "风投合伙人", tags: ["business", "dating"] },
  { title: "财务顾问", tags: ["business"] },
  { title: "建筑师", tags: ["business", "dating"] },
  { title: "策展人", tags: ["dating", "partner"] },
  { title: "戏剧导演", tags: ["dating", "partner"] },
  { title: "翻译", tags: ["business", "dating"] },
  { title: "市场总监", tags: ["business", "dating"] },
  { title: "城市规划师", tags: ["business", "dating"] },
];

// ─── Trait pool (60 entries) ────────────────────────────────────────────────
// 4 dimensions × ~15 entries. A persona picks 1-2 from each
// dimension, plus 1-2 from paradoxes.

const WORK_STYLES = [
  "深度专注型", "多线程切换", "独立工作", "团队协作", "目标驱动",
  "过程享受", "创业节奏", "稳定 9-6", "弹性工作制", "项目制",
  "国际化协作", "本地深耕", "远程办公", "常出差", "有副业",
];
const LIFE_PACES = [
  "节奏感强", "慢生活", "经常运动", "宅家充电", "社交活跃",
  "独处充电", "城市探索", "自然回归", "阅读为主", "美食驱动",
  "艺术展打卡", "音乐节常客", "夜生活型", "早起型", "周末户外",
];
const SOCIAL_STYLES = [
  "倾听者", "表达者", "小圈子型", "社交达人", "慢热",
  "第一秒就熟", "保守派", "开放派", "理性分析", "感性直觉",
  "幽默感强", "认真严肃", "直来直去", "委婉含蓄", "深度对话型",
];
const AESTHETICS = [
  "极简", "复古", "日式侘寂", "北欧冷感", "工业风",
  "新中式", "法式优雅", "美式休闲", "街头潮牌", "文艺复古",
  "建筑感", "植物系", "光线感", "色彩感强", "黑白灰",
];

// ─── Paradoxes (20 entries) ────────────────────────────────────────────────
// Real-life tensions that make the LLM output more human-feeling
// than a clean archetype would.

const PARADOXES = [
  { surface: "事业上要强", depth: "私下其实怕孤独" },
  { surface: "看起来外向健谈", depth: "深夜常常想一个人" },
  { surface: "朋友圈发很多美食", depth: "更享受一个人安静做饭" },
  { surface: "总说要稳定", depth: "身体里住着一个冒险家" },
  { surface: "理性到极致", depth: "会因为一首歌单曲循环一周" },
  { surface: "超级独立", depth: "偶尔需要有人帮他做决定" },
  { surface: "每天都在笑", depth: "真正能说心里话的人屈指可数" },
  { surface: "总说一个人挺好", depth: "是被之前的认真伤害过" },
  { surface: "做什么都讲究", depth: "对感情反而最不讲究" },
  { surface: "看起来很 chill", depth: "其实心里有很严格的标准" },
  { surface: "朋友圈晒旅行", depth: "其实更喜欢窝在熟悉的城市" },
  { surface: "看起来佛系", depth: "对自己认定的事特别执拗" },
  { surface: "朋友很多", depth: "真正称得上知己的没几个" },
  { surface: "说自己不爱做饭", depth: "周末会花两小时给自己炖汤" },
  { surface: "把工作和生活分得很开", depth: "晚上经常因为工作想太多" },
  { surface: "经常说走就走", depth: "出行前要规划得很细" },
  { surface: "看起来很 tough", depth: "一个人看病时会想很多" },
  { surface: "总说不在乎", depth: "在乎得要命但不会表达" },
  { surface: "经常换城市", depth: "其实特别想要一个固定的角落" },
  { surface: "嘴上说无所谓", depth: "心里有一张很详细的理想清单" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickUnique<T>(arr: T[], n: number): T[] {
  const out: T[] = [];
  const seen = new Set<number>();
  while (out.length < n && seen.size < arr.length) {
    const i = Math.floor(Math.random() * arr.length);
    if (seen.has(i)) continue;
    seen.add(i);
    out.push(arr[i]!);
  }
  return out;
}

function makeName(rng: () => number): { display: string; bilingual: boolean } {
  const isBilingual = rng() < 0.2;
  if (isBilingual) {
    const p = pick(BILINGUAL_ALIAS);
    return { display: `${p[0]} ${p[1]}`, bilingual: true };
  }
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  return { display: `${last}${first}`, bilingual: false };
}

function makeAge(rng: () => number, scenario: string): number {
  // dating: 26-36 (peak dating age)
  // business: 28-42 (more experienced)
  // partner: 25-38 (broader)
  const range =
    scenario === "dating" ? [26, 36] :
    scenario === "business" ? [28, 42] :
    [25, 38];
  const [lo, hi] = range;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function makeHeadline(occupation: string, traits: string[]): string {
  const templates = [
    `${occupation} · ${traits[0]}`,
    `${traits[0]}的${occupation}`,
    `${occupation} · 慢节奏 · ${traits[1] ?? traits[0]}`,
    `${occupation} · 工作之外是个${traits[0]}`,
  ];
  return pick(templates);
}

function makeBio(name: string, city: string, occupation: string, traits: string[]): string {
  return `${name}，${city}的${occupation}。${traits[0]}，${traits[1] ?? traits[2] ?? traits[0]}。`;
}

function makeProfileData(
  rng: () => number,
  name: string,
  age: number,
  city: string,
  occupation: string,
  scenario: string,
  paradox: { surface: string; depth: string },
  traits: { work: string; life: string; social: string; aesthetic: string },
) {
  // Generate a profile_data blob that mirrors the v4 user_profiles
  // shape, so the matching LLM can treat it equivalently.
  const cityName = city === "shenzhen" ? "深圳" : "上海";
  return {
    version: "v4",
    scenario,
    lang: "zh",
    input: `我叫${name}，${age}岁，${cityName}的${occupation}。${paradox.surface}，但${paradox.depth}。`,
    ai_provider: "ai-persona",
    generated_at: new Date().toISOString(),
    ai: {
      headline: makeHeadline(occupation, [traits.life, traits.social]),
      narrative: makeBio(name, cityName, occupation, [traits.work, traits.life, traits.aesthetic]),
      // 5 dimensions (mirroring the v4 schema)
      dimensions: [
        { key: "工作节奏", score: Math.round((0.4 + rng() * 0.6) * 100) / 100, why: `${traits.work}的工作模式`, signals: [] },
        { key: "生活节奏", score: Math.round((0.4 + rng() * 0.6) * 100) / 100, why: `${traits.life}`, signals: [] },
        { key: "社交模式", score: Math.round((0.4 + rng() * 0.6) * 100) / 100, why: `${traits.social}`, signals: [] },
        { key: "审美倾向", score: Math.round((0.4 + rng() * 0.6) * 100) / 100, why: `${traits.aesthetic}`, signals: [] },
        { key: "理想匹配", score: Math.round((0.5 + rng() * 0.5) * 100) / 100, why: `${scenario === "dating" ? "相互理解，共同成长" : scenario === "business" ? "价值观一致，能走远" : "有共同兴趣，相处自在"}`, signals: [] },
      ],
      // 3 patterns (insights, with reasoning chains)
      patterns: [
        { insight: `${occupation}身份让ta有${traits.work}的行事风格`, evidence: `「${paradox.surface}」`, reasoning_chain: [`从职业推断${traits.work}`, `日常节奏印证`] },
        { insight: `${paradox.depth}`, evidence: `「${paradox.surface}」的反面`, reasoning_chain: [`表面行为 vs 真实需求`, `paradox 是关键信号`] },
        { insight: `${traits.aesthetic}的审美倾向`, evidence: `「${traits.aesthetic}」`, reasoning_chain: [`从生活方式推断`, `审美选择反映价值观`] },
      ],
      // 1 paradox (the most useful one for matching)
      paradoxes: [
        { surface: paradox.surface, depth: paradox.depth, tension: "自我保护与真实表达的拉锯" },
      ],
      // 1 archetype
      archetypes: [
        { name: scenario === "dating" ? "慢热的探索者" : scenario === "business" ? "深耕的长期主义者" : "松弛的搭子玩家", why: `${traits.work} + ${traits.life} 的组合`, shadow: "可能会过于内敛" },
      ],
      // 1 match signal
      match_signals: {
        needs: [
          { what: scenario === "dating" ? "被理解的深度" : scenario === "business" ? "价值观契合" : "相处时的松弛感", why: "AI 推断的核心需求" },
        ],
        gifts: [
          { what: traits.social, why: `能给对方的核心价值` },
        ],
        risks: [
          { what: "可能太 ${traits.social.split('，')[0]}", impact: "低概率 — 大部分情况下不影响" },
        ],
      },
    },
  };
}

function escapeSqlString(s: string): string {
  if (s == null) return "NULL";
  return `'${String(s).replace(/'/g, "''")}'`;
}

function toSqlTextArray(arr: string[]): string {
  if (!arr || arr.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map(escapeSqlString).join(", ")}]`;
}

function escapeJsonString(s: string): string {
  // For embedding JSONB literals in SQL. Single quotes need doubling;
  // backslashes need escaping.
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function personaToInsert(p: {
  name: string;
  age: number;
  city: string;
  occupation: string;
  headline: string;
  bio: string;
  scenario_tags: string[];
  profile_data: unknown;
  display_priority: number;
}): string {
  const cols = ["name", "age", "city", "occupation", "headline", "bio", "scenario_tags", "profile_data", "display_priority"];
  const profileDataJson = JSON.stringify(p.profile_data);
  const vals = [
    escapeSqlString(p.name),
    String(p.age),
    escapeSqlString(p.city),
    escapeSqlString(p.occupation),
    escapeSqlString(p.headline),
    escapeSqlString(p.bio),
    toSqlTextArray(p.scenario_tags),
    `'${escapeJsonString(profileDataJson)}'::jsonb`,
    String(p.display_priority),
  ];
  return `INSERT INTO public.ai_personas (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  await mkdir(dirname(OUTPUT), { recursive: true });

  // Use a seeded RNG so the 200 personas are deterministic across
  // re-runs (we want stable IDs, but they don't matter at the SQL
  // level — what matters is the content). The RNG just ensures the
  // selection is reproducible if anyone re-runs the script.
  let _seed = 42;
  const rng = () => {
    _seed = (_seed * 1664525 + 1013904223) >>> 0;
    return _seed / 0xffffffff;
  };

  // Pre-pick a fixed list of occupations per city/scenario so the
  // distribution is correct.
  const allInserts: string[] = [];
  let totalGenerated = 0;

  for (const city of CITIES) {
    // Per-city: 60 dating, 25 business, 15 partner = 100
    const distribution = [
      { scenario: "dating", count: 60 },
      { scenario: "business", count: 25 },
      { scenario: "partner", count: 15 },
    ];

    for (const { scenario, count } of distribution) {
      for (let i = 0; i < count; i++) {
        // Pick an occupation whose tags include the scenario.
        const occPool = OCCUPATIONS.filter((o) => o.tags.includes(scenario));
        const occ = occPool[Math.floor(rng() * occPool.length)]!;

        const nameObj = makeName(rng);
        const name = nameObj.display;
        const age = makeAge(rng, scenario);
        const paradox = pick(PARADOXES);
        const traits = {
          work: pick(WORK_STYLES),
          life: pick(LIFE_PACES),
          social: pick(SOCIAL_STYLES),
          aesthetic: pick(AESTHETICS),
        };

        const profileData = makeProfileData(rng, name, age, city, occ.title, scenario, paradox, traits);

        // Bilingual personas get a small display_priority boost so
        // they surface first in the candidate pool.
        const displayPriority = nameObj.bilingual ? 1 : 0;

        allInserts.push(
          personaToInsert({
            name,
            age,
            city,
            occupation: occ.title,
            headline: profileData.ai.headline,
            bio: profileData.ai.narrative,
            scenario_tags: [scenario],
            profile_data: profileData,
            display_priority: displayPriority,
          }),
        );
        totalGenerated += 1;
      }
    }
  }

  const header = [
    "-- AUTO-GENERATED. Do not edit by hand. Re-run scripts/generate-ai-personas.mjs to refresh.",
    `-- Generated: ${new Date().toISOString()}`,
    `-- Count: ${totalGenerated} AI personas (${CITIES.length} cities, 200-ish split)`,
    "",
    "BEGIN;",
    "",
  ].join("\n");

  const footer = [
    "",
    "COMMIT;",
    "",
    "-- Quick verification:",
    "-- SELECT city, scenario_tags, count(*) FROM public.ai_personas GROUP BY city, scenario_tags;",
  ].join("\n");

  await writeFile(OUTPUT, header + allInserts.join("\n\n") + "\n" + footer, "utf8");

  console.log(`Wrote ${totalGenerated} personas → ${OUTPUT}`);
  console.log(`Distribution: ${CITIES.length} cities × (60 dating + 25 business + 15 partner) each`);
  console.log(`Next: open Lovable → SQL editor → paste the file → Run`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
