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

const OUTPUT = "scripts/output/ai-personas-1000.sql";
const COUNT_PER_CITY = 500; // 500 深圳 + 500 上海 = 1000 total
const CITIES = ["shenzhen", "shanghai"] as const;

// ─── Name pools ─────────────────────────────────────────────────────────────
// 80 first names × 60 last names = 4800 unique combos. We only need 200
// so dedup is never an issue. Names are split into CJK-default (80%)
// and bilingual (20%) — the bilingual ones have an English alias
// because that's how ~20% of tier-1 city residents introduce
// themselves on dating apps.

const FIRST_NAMES = [
  // CJK — expanded to 200 for 1000-persona diversity
  "思远", "雨桐", "嘉颖", "宇辰", "梓涵", "一鸣", "书瑶", "子墨", "婉清", "奕辰",
  "予曦", "沐辰", "沁语", "景行", "予安", "若曦", "知言", "晏清", "砚秋", "淮安",
  "柏然", "思齐", "怀瑾", "嘉树", "听澜", "清晏", "令仪", "景铄", "云旗", "安和",
  "栎帆", "其琛", "昱辰", "望舒", "未央", "宁致", "方知", "允执", "徽因",
  "安然", "向晚", "问渠", "知白", "半山", "云深", "归棠", "弥生", "和光", "皎然",
  "知遇", "相宜", "如是", "无恙", "述之", "言蹊", "清欢", "见秋", "南絮", "清宁",
  "怀柔", "时予", "知微", "纯熙", "至简", "清颐", "可期", "时宜", "知止", "若谷",
  "有容", "无隅", "既明", "若初", "不改", "从周", "如一", "以宁", "维舟", "照野",
  "衔青", "枕流", "漱石", "观澜", "听松", "问樵", "牧云", "耕烟", "钓雪", "种月",
  "青崖", "白鹿", "黄鹤", "紫芝", "苍梧", "碧落", "黄泉", "红尘", "浮生", "逆旅",
  "长亭", "短亭", "阳关", "渭城", "姑苏", "临安", "金陵", "长安", "洛阳", "潇湘",
  "云梦", "蓬莱", "瀛洲", "方丈", "昆仑", "瑶池", "扶桑", "若木", "建木", "琅嬛",
  "鹤归", "鹿鸣", "莺啼", "燕语", "蝉噪", "蛙鸣", "松涛", "竹韵", "梅影", "兰香",
  "菊淡", "竹疏", "莲静", "梧幽", "蕉雨", "柳风", "杏雨", "梨云", "桃夭", "李秾",
  "樱落", "枫红", "芦白", "苇苍", "蓼青", "蘋碧", "芷汀", "兰渚", "苔痕", "藓迹",
  "岚气", "霞光", "虹影", "霓裳", "星眸", "月靥", "风鬟", "雾鬓", "雪肤", "花貌",
  "玉骨", "冰肌", "琼枝", "瑶草", "琪花", "琬琰", "琳琅", "璆锵", "璎珞", "翡翠",
  "琉璃", "琥珀", "珊瑚", "玛瑙", "珍珠", "玳瑁", "璎珞", "流苏", "璎珞", "步摇",
  "簪花", "佩月", "怀风", "握露", "掬水", "弄香", "抚琴", "品茗", "焚香", "挂画",
  "插花", "点茶", "听雨", "扫雪", "候月", "瞻星", "负暄", "漱泉", "枕霞", "卧云",
  "骑鲸", "跨鹤", "乘鸾", "驭凤", "御龙", "鞭麟", "笞凤", "烹龙", "煮鹤", "烧琴",
  "枕经", "葄史", "拥彗", "扫门", "负笈", "担簦", "乘桴", "浮海", "凿坏", "遁世",
  "餐英", "饮露", "吸风", "吞霞", "服气", "餐霞", "辟谷", "胎息", "导引", "行禅",
  "坐忘", "心斋", "见独", "葆光", "撄宁", "天府", "坐驰", "撄心", "天府", "葆光",
  "玄览", "静笃", "虚室", "白驹", "过隙", "逝川", "朝露", "浮云", "飞蓬", "转蓬",
  "漂萍", "断梗", "浮鸥", "孤鸿", "独鹤", "离鸾", "别鹤", "孤鸾", "寡鹄", "孤雁",
  "寒蝉", "蟋蟀", "螽斯", "蜉蝣", "蟪蛄", "蠃蚌", "蜗角", "蝇头", "蚁穴", "蜂衙",
  "蝶梦", "鸥盟", "鹭侣", "莺朋", "燕友", "鹤侣", "梅妻", "鹤子", "兰友", "石交",
  "金兰", "肺腑", "胶漆", "琴瑟", "埙篪", "笙磬", "钟吕", "翰墨", "丹青", "诗词",
  "歌赋", "文章", "典籍", "经史", "子集", "辞章", "韵语", "俪句", "偶语", "联珠",
  // Bilingual
  "Olivia", "Ethan", "Ivy", "Lucas", "Emma", "Henry", "Aria", "Leo", "Mia", "Theo",
  "Sara", "Daniel", "Cathy", "Mark", "Lily", "Ben", "Zoe", "Adam", "Joyce", "Wayne",
  "Chloe", "Ryan", "Ella", "Jack", "Grace", "Sam", "Zoey", "Max", "Ruby", "Noah",
  "Amber", "Ian", "Nina", "Owen", "Vera", "Kai", "Maya", "Evan", "Luna", "Axel",
];
const LAST_NAMES = [
  // CJK — expanded to 120 for 1000-persona diversity
  "林", "陈", "黄", "张", "李", "王", "吴", "刘", "蔡", "杨",
  "许", "郑", "谢", "洪", "郭", "邱", "曾", "萧", "赖", "徐",
  "朱", "高", "孙", "施", "游", "苏", "薛", "邓", "宋", "侯",
  "马", "赵", "蒋", "杜", "叶", "程", "钟", "罗", "魏", "方",
  "丁", "金", "卢", "钱", "邵", "江", "白", "韩", "于", "田",
  "康", "谭", "石", "雷", "范", "熊", "顾", "姚", "廖", "严",
  "伍", "韦", "申", "尤", "毕", "聂", "章", "柯", "车", "苗",
  "詹", "关", "靳", "祁", "卜", "纪", "祝", "舒", "凌", "盛",
  "单", "欧", "邓", "任", "袁", "柳", "酆", "鲍", "史", "唐",
  "费", "廉", "岑", "薛", "雷", "贺", "倪", "汤", "滕", "殷",
  "罗", "毕", "郝", "邬", "安", "常", "乐", "于", "时", "傅",
  "皮", "卞", "齐", "康", "伍", "余", "元", "卜", "顾", "孟",
  "平", "黄", "和", "穆", "萧", "尹", "姚", "邵", "湛", "汪",
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
  { title: "用户体验设计师", tags: ["dating", "business", "partner"] },
  { title: "软件工程师", tags: ["dating", "business"] },
  { title: "数据科学家", tags: ["dating", "business"] },
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
  { title: "运营总监", tags: ["business", "dating"] },
  { title: "电商创业者", tags: ["business", "dating"] },
  { title: "社交媒体顾问", tags: ["business", "dating", "partner"] },
  { title: "AI 研究员", tags: ["business", "dating"] },
  { title: "区块链开发者", tags: ["business", "dating"] },
  { title: "可持续时尚设计师", tags: ["business", "dating", "partner"] },
  { title: "瑜伽教练", tags: ["dating", "partner"] },
  { title: "营养师", tags: ["dating", "partner"] },
  { title: "旅行策划师", tags: ["dating", "partner"] },
  { title: "民宿主理人", tags: ["dating", "partner"] },
  { title: "精酿啤酒师", tags: ["dating", "partner"] },
  { title: "陶艺家", tags: ["dating", "partner"] },
  { title: "插画师", tags: ["dating", "partner"] },
  { title: "动画导演", tags: ["dating", "partner"] },
  { title: "播客主播", tags: ["dating", "partner", "business"] },
  { title: "非营利组织负责人", tags: ["business", "dating"] },
  { title: "外交官", tags: ["business", "dating"] },
  { title: "记者", tags: ["dating", "business"] },
  { title: "编辑", tags: ["dating", "business"] },
  { title: "室内设计师", tags: ["dating", "business", "partner"] },
  { title: "珠宝设计师", tags: ["dating", "partner"] },
  { title: "香水评鉴师", tags: ["dating", "partner"] },
  { title: "葡萄酒侍酒师", tags: ["dating", "partner"] },
  { title: "茶道师", tags: ["dating", "partner"] },
  { title: "香道师", tags: ["dating", "partner"] },
  { title: "手冲咖啡师", tags: ["dating", "partner"] },
  { title: "面包师", tags: ["dating", "partner"] },
  { title: "甜品师", tags: ["dating", "partner"] },
  { title: "宠物行为训练师", tags: ["dating", "partner"] },
  { title: "植物设计师", tags: ["dating", "partner"] },
  { title: "可持续生活博主", tags: ["dating", "partner"] },
  { title: "潜水教练", tags: ["dating", "partner"] },
  { title: "滑雪教练", tags: ["dating", "partner"] },
  { title: "攀岩教练", tags: ["dating", "partner"] },
  { title: "马拉松跑者", tags: ["dating", "partner"] },
  { title: "格斗教练", tags: ["dating", "partner"] },
  { title: "舞蹈老师", tags: ["dating", "partner"] },
  { title: "戏剧演员", tags: ["dating", "partner"] },
  { title: "配音演员", tags: ["dating", "partner"] },
  { title: "游戏策划", tags: ["business", "dating"] },
  { title: "独立开发者", tags: ["business", "dating"] },
  { title: "管理咨询顾问", tags: ["business", "dating"] },
  { title: "投行分析师", tags: ["business", "dating"] },
  { title: "税务顾问", tags: ["business"] },
  { title: "人力资源总监", tags: ["business", "dating"] },
  { title: "供应链经理", tags: ["business", "dating"] },
  { title: "医疗器械销售", tags: ["business", "dating"] },
  { title: "企业培训师", tags: ["business", "dating"] },
  { title: "公关总监", tags: ["business", "dating"] },
  { title: "广告创意总监", tags: ["business", "dating", "partner"] },
  { title: "电影制片人", tags: ["business", "dating"] },
  { title: "艺术经纪人", tags: ["business", "dating", "partner"] },
  { title: "古董修复师", tags: ["dating", "partner"] },
  { title: "钟表修复师", tags: ["dating", "partner"] },
  { title: "马术教练", tags: ["dating", "partner"] },
  { title: "高尔夫教练", tags: ["dating", "partner"] },
  { title: "飞盘俱乐部主理人", tags: ["partner", "dating"] },
  { title: "剧本杀 DM", tags: ["partner", "dating"] },
  { title: "密室逃脱设计师", tags: ["partner", "dating"] },
  { title: "桌游馆老板", tags: ["partner", "dating"] },
  { title: "读书会组织者", tags: ["partner", "dating"] },
  { title: "徒步俱乐部领队", tags: ["partner", "dating"] },
  { title: "露营装备测评师", tags: ["partner", "dating"] },
  { title: "城市骑行领队", tags: ["partner", "dating"] },
  { title: "夜跑团组织者", tags: ["partner", "dating"] },
];

// ─── Trait pool (60 entries) ────────────────────────────────────────────────
// 4 dimensions × ~15 entries. A persona picks 1-2 from each
// dimension, plus 1-2 from paradoxes.

const WORK_STYLES = [
  "深度专注型", "多线程切换", "独立工作", "团队协作", "目标驱动",
  "过程享受", "创业节奏", "稳定 9-6", "弹性工作制", "项目制",
  "国际化协作", "本地深耕", "远程办公", "常出差", "有副业",
  "结果导向", "细节控", "大局观", "敏捷迭代", "长期主义",
  "跨界思维", "垂直深耕", "客户导向", "产品思维", "数据驱动",
  "创意发散", "结构化思维", "风险厌恶", "风险偏好", "平衡型",
];
const LIFE_PACES = [
  "节奏感强", "慢生活", "经常运动", "宅家充电", "社交活跃",
  "独处充电", "城市探索", "自然回归", "阅读为主", "美食驱动",
  "艺术展打卡", "音乐节常客", "夜生活型", "早起型", "周末户外",
  "晨跑型", "夜读型", "冥想练习", "瑜伽日常", "游泳爱好者",
  "骑行通勤", "徒步上瘾", "露营爱好者", "冲浪玩家", "滑雪季候鸟",
  "咖啡续命", "茶系养生", "极简生活", "囤积爱好者", "断舍离践行",
];
const SOCIAL_STYLES = [
  "倾听者", "表达者", "小圈子型", "社交达人", "慢热",
  "第一秒就熟", "保守派", "开放派", "理性分析", "感性直觉",
  "幽默感强", "认真严肃", "直来直去", "委婉含蓄", "深度对话型",
  "观察型", "主动发起型", "被动回应型", "边界感强", "容易共情",
  "辩论型", "回避冲突型", "调和者", "领导者", "跟随者",
  "自嘲型", "捧场王", "冷场王", "话题引导者", "细节追问者",
];
const AESTHETICS = [
  "极简", "复古", "日式侘寂", "北欧冷感", "工业风",
  "新中式", "法式优雅", "美式休闲", "街头潮牌", "文艺复古",
  "建筑感", "植物系", "光线感", "色彩感强", "黑白灰",
  "莫兰迪色系", "多巴胺配色", "赛博朋克", "Y2K", "波西米亚",
  "中古风", "包豪斯", "Art Deco", "侘寂风", "田园风",
  "金属质感", "木质温暖", "玻璃通透", "织物柔软", "陶瓷温润",
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
  { surface: "工作中雷厉风行", depth: "感情里反而患得患失" },
  { surface: "喜欢热闹的人群", depth: "却讨厌无意义的寒暄" },
  { surface: "表面随遇而安", depth: "内心对时间极度敏感" },
  { surface: "看起来很会照顾人", depth: "其实不擅长接受照顾" },
  { surface: "说话直接不绕弯", depth: "写长消息会反复删改" },
  { surface: "喜欢尝试新鲜事物", depth: "对旧物却有执念" },
  { surface: "社交媒体上很活跃", depth: "现实中见面反而拘谨" },
  { surface: "看起来不拘小节", depth: "对特定细节异常执着" },
  { surface: "总说不需要仪式感", depth: "收到惊喜会偷偷开心很久" },
  { surface: "很容易被逗笑", depth: "真正难过时反而沉默" },
  { surface: "做决定很快", depth: "事后会反复想另一种可能" },
  { surface: "喜欢给别人建议", depth: "自己的事却拿不定主意" },
  { surface: "看起来很自信", depth: "夸奖面前会不自在" },
  { surface: "享受独处", depth: "太久没人说话会低落" },
  { surface: "对陌生人客气", depth: "对亲近的人口无遮拦" },
  { surface: "追求效率", depth: "却愿意为喜欢的人浪费时间" },
  { surface: "喜欢被关注", depth: "被过度关注又想逃" },
  { surface: "看似冷酷", depth: "其实容易被温柔击倒" },
  { surface: "讨厌承诺", depth: "一旦承诺就会认真兑现" },
  { surface: "喜欢掌控节奏", depth: "遇到心动的人会乱了阵脚" },
  { surface: "外表开放", depth: "内心有一道明确的门槛" },
  { surface: "享受被需要", depth: "害怕成为负担" },
  { surface: "看起来很随性", depth: "对安全感需求很高" },
  { surface: "习惯拒绝帮助", depth: "其实很感激被记得" },
  { surface: "对过去洒脱", depth: "某些瞬间会被回忆击中" },
  { surface: "喜欢深度关系", depth: "建立信任需要很久" },
  { surface: "看起来无欲无求", depth: "只是学会了降低期待" },
  { surface: "渴望被理解", depth: "又害怕被看穿" },
  { surface: "容易原谅别人", depth: "对自己却很苛刻" },
  { surface: "喜欢规划未来", depth: "却也享受当下的失控" },
  { surface: "表面坚强", depth: "一句'我懂你'就能破防" },
  { surface: "习惯领先", depth: "偶尔也想被人领着走" },
  { surface: "讨厌被标签化", depth: "却用标签快速理解世界" },
  { surface: "喜欢给惊喜", depth: "收到惊喜不知如何反应" },
  { surface: "看起来很成熟", depth: "心里住着一个小孩" },
  { surface: "擅长安慰别人", depth: "自己的伤口自己舔" },
  { surface: "喜欢新鲜刺激", depth: "熟悉的环境才睡得安稳" },
  { surface: "对外人宽容", depth: "对亲密的人要求更高" },
  { surface: "嘴硬心软", depth: "说最狠的话做最暖的事" },
  { surface: "享受自由", depth: "自由的尽头是想念" },
  { surface: "看起来很完整", depth: "其实在等一个缺口" },
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
    // Per-city: 300 dating, 120 business, 80 partner = 500
    // Two cities = 1000 total personas.
    const distribution = [
      { scenario: "dating", count: 300 },
      { scenario: "business", count: 120 },
      { scenario: "partner", count: 80 },
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
    `-- Count: ${totalGenerated} AI personas (${CITIES.length} cities, 1000 total)`,
    "",
    "BEGIN;",
    "TRUNCATE public.ai_personas RESTART IDENTITY CASCADE;",
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
  console.log(`Distribution: ${CITIES.length} cities × (300 dating + 120 business + 80 partner) each`);
  console.log(`Next: open Lovable → SQL editor → paste the file → Run`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
