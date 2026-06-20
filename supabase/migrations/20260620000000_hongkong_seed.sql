-- Hong Kong market seed (P1-4).
-- Adds AI personas and sample venues so the city is match-ready from day one.

-- ---------------------------------------------------------------------------
-- AI personas: 8 Hong Kong archetypes across dating / business / partner
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_personas (
  name, age, city, occupation, headline, bio, scenario_tags, profile_data, display_priority
) VALUES
(
  'Ivan', 31, 'hongkong', '對沖基金分析師',
  '理性外殼，浪漫內核',
  '中環上班，下班後鐘意行山同影相。講嘢快但聽得更耐，覺得最浪漫嘅事係有人記得你随口講過嘅小事。',
  ARRAY['dating', 'business'],
  '{
    "version": "v4.5",
    "scenario": "dating",
    "lang": "yue",
    "input": "中環做對沖基金分析，工時好長但週末一定留俾重要嘅人。鐘意行山、菲林相、黑咖啡。唔鍾意 loud 嘅場合，覺得兩個人靜靜哋傾偈最舒服。",
    "ai": {
      "headline": "理性外殼，浪漫內核",
      "narrative": "你用 Excel 分析世界，但心底相信數字解釋唔到嘅連結。\\n你習慣把感受收埋喺效率背後，直到某個人發現你記得佢三個月前随口講過嘅一首歌。\\n你嘅浪漫唔係大場面，而係準時出現、記得細節、同埋願意把週末完整留俾一個人。",
      "dimensions": [
        { "key": "決策模式", "score": 0.8, "why": "靠數據同長遠回報評估，但對人會留一條感性後門", "signals": ["做決定前會列 pros/cons", "但問到「feel 啱唔啱」會停一停"] },
        { "key": "信任建立", "score": 0.7, "why": "透過持續出現同記得細節建立信任", "signals": ["準時", "記得對方提过嘅小事"] },
        { "key": "能量來源", "score": 0.6, "why": "獨處充電，但高質素對話會令人上癮", "signals": ["週末行山一個人都得", "但遇到 deep talk 會講到唔願走"] },
        { "key": "衝突處理", "score": 0.7, "why": "傾向冷靜表達，避免情緒化", "signals": ["會先諗清楚再講", "討厭冷戰但唔會即時爆"] },
        { "key": "理想匹配", "score": 0.8, "why": "想找一個看得穿理性外表嘅人", "signals": ["欣賞細心", "重視價值觀多過外在條件"] }
      ],
      "paradoxes": [{ "surface": "做金融講求理性", "depth": "其實最想要不計回報嘅被理解", "tension": "日日計 risk-return，但對人想唔計較" }],
      "archetypes": [{ "name": "浪漫分析師", "why": "用理性包裝感性", "shadow": "容易讓人以為佢唔投入" }],
      "match_signals": { "needs": [{"what":"被記得","why":"細節對佢最有份量"}], "gifts": [{"what":"穩定同專注","why":"願意把時間留俾一個人"}], "risks": [{"what":"顯得疏離","impact":"對方會誤會佢唔在乎"}] },
      "life_themes": [{"name":"尋找意義","evidence":"工時長但堅持週末行山同影相"}],
      "scene_predictions": [{"context":"週末大嶼山行山","behavior":"會默默幫對方準備水同防曬","why":"行動式關心"}],
      "growth_stage": { "stage": "integration", "label": "整合期", "why": "開始把事業成就轉化為關係質量" },
      "aesthetic_signature": { "preferences": ["簡約","自然光","木質空間"], "contradiction": "住喺中環卻鍾意離島嘅靜" },
      "defense_mechanisms": [{ "mechanism": "理性化", "when_triggered": "情緒太強時", "behavior": "把感受轉為分析" }],
      "communication_recipes": [{ "context": "想表達好感", "recipe": "用具體觀察代替直接讚美", "avoid": "講抽象嘅「我鍾意你」" }]
    }
  }'::jsonb,
  10
),
(
  'Maggie', 28, 'hongkong', '品牌設計師',
  '視覺系觀察家',
  '灣仔工作生活，對顏色、字體、空間氣氛異常敏感。相信第一眼感覺，但更相信長時間相處嘅細節。',
  ARRAY['dating', 'partner'],
  '{
    "version": "v4.5",
    "scenario": "dating",
    "lang": "yue",
    "input": "品牌設計師，對美嘅執著滲透晒生活。鍾意咖啡館、展覽、舊樓改建嘅空間。相信氣味同光線會影響一段關係。",
    "ai": {
      "headline": "視覺系觀察家",
      "narrative": "你先看見氣氛，先至聽到對方講乜。\\n一間咖啡館燈光太黃、字體太醜，會令你分心。\\n你唔需要對方好靚，但需要你哋一齊嘅畫面好看。",
      "dimensions": [
        { "key": "決策模式", "score": 0.7, "why": "直覺先行，再用經驗驗證", "signals": ["第一眼已經有判斷", "會用實際相處修正"] },
        { "key": "信任建立", "score": 0.6, "why": "透過共同審美同空間體驗建立信任", "signals": ["願意帶對方去自己私藏嘅店", "記得對方鍾意嘅顏色"] },
        { "key": "能量來源", "score": 0.7, "why": "美好環境同創意對話會充電", "signals": ["展覽後會特別開朗", "討厭嘈雜商場"] },
        { "key": "衝突處理", "score": 0.5, "why": "傾向迴避直接對質", "signals": ["會先沉默", "用訊息多過電話"] },
        { "key": "理想匹配", "score": 0.8, "why": "想找個願意一起建構生活的人", "signals": ["欣賞有品味嘅日常", "重視共同經歷"] }
      ],
      "paradoxes": [{"surface":"外表好有要求","depth":"其實只係想搵個舒服嘅相處節奏","tension":"高標準係保護自己唔好湊合"}],
      "archetypes": [{"name":"生活美學家","why":"把設計眼光放晒喺生活上","shadow":"容易挑剔，錯過樸實嘅好"}],
      "match_signals": { "needs": [{"what":"被欣賞細節","why":"佢觀察到嘅嘢希望對方都見到"}], "gifts": [{"what":"帶對方發現城市","why":"擅長搵特別嘅地方同體驗"}], "risks": [{"what":"顯得挑剔","impact":"對方會覺得自己唔夠好"}] },
      "life_themes": [{"name":"美感作為語言","evidence":"用空間同顏色表達自己"}],
      "scene_predictions": [{"context":"週六下午上環咖啡館","behavior":"會一邊畫 sketch 一邊等對方","why":"創作係佢最放鬆嘅狀態"}],
      "growth_stage": { "stage": "construction", "label": "建構期", "why": "正把自己喜歡嘅生活變成兩個人嘅可能" },
      "aesthetic_signature": { "preferences": ["自然光","水泥牆","綠植"], "contradiction": "熱愛城市但唔鍾意人造感太重" },
      "defense_mechanisms": [{ "mechanism": "迴避", "when_triggered": "關係有壓力時", "behavior": "躲入工作同興趣" }],
      "communication_recipes": [{ "context": "想親近", "recipe": "邀請對方去一個自己有記憶嘅地方", "avoid": "喺大商場約會" }]
    }
  }'::jsonb,
  10
),
(
  'Jason', 35, 'hongkong', '初創公司創辦人',
  '效率型夢想家',
  '剛完成 A 輪，正在把一個 SaaS 產品帶出亞洲。時間係最稀缺資源，但願意為對的人把會議推掉。',
  ARRAY['business', 'dating'],
  '{
    "version": "v4.5",
    "scenario": "business",
    "lang": "yue",
    "input": "初創創辦人，剛完成 A 輪，做 B2B SaaS。每日行程滿到爆，但相信最值錢嘅決定都係同對嘅人傾出嚟。",
    "ai": {
      "headline": "效率型夢想家",
      "narrative": "你習慣用 OKR 衡量一切，除了人。\\n你相信一次高質素對話勝過十個會議。\\n你嘅浪漫係「我把下一個會議推咗，因為你更重要」。",
      "dimensions": [
        { "key": "決策模式", "score": 0.9, "why": "快速判斷，果斷執行", "signals": ["傾完五分鐘已經有決定", "討厭反覆討論"] },
        { "key": "信任建立", "score": 0.7, "why": "靠交付紀錄同直接溝通", "signals": ["講得出做得到", "有困難會開口"] },
        { "key": "能量來源", "score": 0.8, "why": "解決問題同建立關係都會充電", "signals": ["傾到好 idea 會興奮", "享受 mentor 人"] },
        { "key": "衝突處理", "score": 0.7, "why": "直面問題，快速解決", "signals": ["會直接問「你想點」", "唔鍾意拖"] },
        { "key": "理想匹配", "score": 0.8, "why": "想找個並肩作戰嘅夥伴", "signals": ["欣賞獨立", "重視成長速度"] }
      ],
      "paradoxes": [{"surface":"成日講效率","depth":"其實最珍惜無目的嘅相處","tension":"想慢但生活唔俾"}],
      "archetypes": [{"name":"高速建構者","why":"不斷 create 同 scale","shadow":"容易忽略身邊人嘅節奏"}],
      "match_signals": { "needs": [{"what":"被理解忙碌","why":"唔想因為工時被誤會"}], "gifts": [{"what":"資源同視野","why":"習慣連結人同機會"}], "risks": [{"what":"顯得唔專注","impact":"對方會覺得自己排第二"}] },
      "life_themes": [{"name":"證明自己值得","evidence":"A 輪後仍然親力親為"}],
      "scene_predictions": [{"context":"中環某間咖啡館開會","behavior":"會一邊講商業模式一邊觀察對方反應","why":"把每個對話都當pitch嚟聽"}],
      "growth_stage": { "stage": "construction", "label": "建構期", "why": "事業同關係都處於快速擴張" },
      "aesthetic_signature": { "preferences": ["極簡","功能主義","高樓夜景"], "contradiction": "熱愛宏大願景但渴望細膩日常" },
      "defense_mechanisms": [{ "mechanism": "忙碌化", "when_triggered": "情感需求浮現", "behavior": "用工作塞滿時間" }],
      "communication_recipes": [{ "context": "想表達重視", "recipe": "具體行動：推掉會議、預留時間", "avoid": "淨係講「我好忙」" }]
    }
  }'::jsonb,
  10
),
(
  'Chloe', 26, 'hongkong', '瑜伽導師',
  '身體比嘴誠實',
  '早上教課，下午行山，晚上煮飯。相信身體知道答案，亦相信一段關係嘅質量取決於兩個人呼吸嘅節奏。',
  ARRAY['dating', 'partner'],
  '{
    "version": "v4.5",
    "scenario": "dating",
    "lang": "yue",
    "input": "瑜伽導師，生活圍繞身體、呼吸同節奏。鍾意行山、煮健康嘢食、同朋友 deep chat。覺得真正嘅親密係可以一齊安靜。",
    "ai": {
      "headline": "身體比嘴誠實",
      "narrative": "你嘅直覺來自身體，唔係腦。\\n一個人適唔適合，你喺同佢一齊呼吸時已經知道。\\n你唔需要日日見，但需要見嗰陣完全在場。",
      "dimensions": [
        { "key": "決策模式", "score": 0.6, "why": "身體同直覺先行", "signals": ["會講「我 feel 到」", "對氣氛好敏感"] },
        { "key": "信任建立", "score": 0.8, "why": "透過共處嘅身體放鬆度建立", "signals": ["對方能令佢完全放鬆", "記得對方身體語言"] },
        { "key": "能量來源", "score": 0.7, "why": "大自然同修復性活動", "signals": ["行山後會充電", "討厭連續應酬"] },
        { "key": "衝突處理", "score": 0.6, "why": "傾向先照顧自己情緒", "signals": ["會先去行山或瑜伽", "之後再平靜傾"] },
        { "key": "理想匹配", "score": 0.8, "why": "想找個能一起慢下來嘅人", "signals": ["欣賞耐心", "重視身體健康"] }
      ],
      "paradoxes": [{"surface":"看似隨和","depth":"其實對親密好有要求","tension":"容易相處但難走進心"}],
      "archetypes": [{"name":"身體智者","why":"用身體感知世界","shadow":"理性上難解釋自己"}],
      "match_signals": { "needs": [{"what":"被全然接納","why":"唔想扮開朗扮有型"}], "gifts": [{"what":"平靜同專注","why":"能創造讓人放鬆嘅空間"}], "risks": [{"what":"顯得疏離","impact":"對方會覺得唔知點親近"}] },
      "life_themes": [{"name":"回歸身體","evidence":"用瑜伽同大自然平衡城市壓力"}],
      "scene_predictions": [{"context":"清晨西貢行山","behavior":"會放慢腳步配合對方","why":"節奏比速度重要"}],
      "growth_stage": { "stage": "exploration", "label": "探索期", "why": "仍在探索親密嘅不同形式" },
      "aesthetic_signature": { "preferences": ["自然光","木質","綠色"], "contradiction": "住喺城市但身體屬於自然" },
      "defense_mechanisms": [{ "mechanism": "撤退", "when_triggered": "感到被評價", "behavior": "退回自己嘅身體練習" }],
      "communication_recipes": [{ "context": "想親近", "recipe": "邀請對方做一件身體活動：行山、瑜伽、煮飯", "avoid": "只係坐低傾偈" }]
    }
  }'::jsonb,
  10
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sample venues: real-ish Hong Kong venues for meet-plan grounding
-- ---------------------------------------------------------------------------
INSERT INTO public.venues (
  name, city, district, address, lat, lng, cuisine_tags, vibe_tags,
  price_per_person, rating, opening_hours, source, booking_method, commission_pct
) VALUES
(
  'The Coffee Academics (灣仔)', 'hongkong', '灣仔', '灣仔皇后大道東 202 號 QRE Plaza 20 樓',
  22.2760, 114.1714, ARRAY['咖啡','西餐'], ARRAY['安靜','適合聊天','景觀位'],
  180, 4.20, '08:00-22:00', 'manual', 'walk_in', 8
),
(
  'Elephant Grounds (中環)', 'hongkong', '中環', '中環歌賦街 11 號',
  22.2839, 114.1530, ARRAY['咖啡','輕食'], ARRAY['輕鬆','適合聊天','適合拍照'],
  150, 4.30, '09:00-19:00', 'manual', 'walk_in', 7
),
(
  'Amber (置地文華東方)', 'hongkong', '中環', '中環置地廣場文華東方酒店 7 樓',
  22.2810, 114.1580, ARRAY['法國菜','fine dining'], ARRAY['高端','安靜','浪漫'],
  1200, 4.60, '12:00-14:30,18:30-22:30', 'manual', 'phone', 12
),
(
  '22 Ships (灣仔)', 'hongkong', '灣仔', '灣仔船街 22 號',
  22.2755, 114.1695, ARRAY['西班牙菜','tapas'], ARRAY['輕鬆','適合聊天','適合拍照'],
  350, 4.40, '12:00-15:00,18:00-23:00', 'manual', 'walk_in', 9
),
(
  'Teakha (西環)', 'hongkong', '西環', '西環第二街 4 號',
  22.2872, 114.1420, ARRAY['茶','甜品'], ARRAY['安靜','適合聊天','文青'],
  100, 4.20, '11:00-21:00', 'manual', 'walk_in', 6
),
(
  'Man Mo Cafe (上環)', 'hongkong', '上環', '上環差館上街 18 號',
  22.2850, 114.1485, ARRAY['咖啡','fusion'], ARRAY['文青','適合聊天','特色空間'],
  160, 4.10, '09:00-21:00', 'manual', 'walk_in', 7
)
ON CONFLICT DO NOTHING;
