import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, requireUser } from "@/lib/api/_helpers.server";
import { deepseekChat, safeParseJSON } from "@/lib/api/_deepseek.server";

const VALID_SCENARIOS = new Set(["business", "dating", "partner"]);

/**
 * POST /api/ai/match
 * Body: { scenario?: "business" | "dating" | "partner", lang?: "en" | "zh" }
 * Uses the latest user_profiles entry as the user's context, asks DeepSeek
 * to generate 3 high-quality match candidates (real users when available,
 * AI-generated personas otherwise), and persists them to `matches`.
 */
export const Route = createFileRoute("/api/ai/match")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const { userId, supabase } = auth;

        let body: { scenario?: unknown; lang?: unknown } = {};
        try {
          body = await request.json();
        } catch {
          /* allow empty body */
        }
        const scenario =
          typeof body.scenario === "string" && VALID_SCENARIOS.has(body.scenario)
            ? (body.scenario as "business" | "dating" | "partner")
            : "dating";
        const lang = body.lang === "zh" ? "zh" : "en";

        // Load the user's latest AI profile.
        const { data: latestProfile } = await supabase
          .from("user_profiles")
          .select("profile_data, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestProfile) {
          return json({ error: "Generate your profile first" }, { status: 400 });
        }
        const userContext = JSON.stringify(latestProfile.profile_data);

        // Look for real candidates (admin scope crosses RLS for discovery).
        const { data: candidates } = await supabaseAdmin
          .from("user_authorizations")
          .select("user_id")
          .eq(scenario, true)
          .neq("user_id", userId)
          .limit(20);

        const realCandidateIds = (candidates ?? []).map((c) => c.user_id);

        // Build prompt for DeepSeek to generate 3 detailed match results.
        const sys =
          lang === "zh"
            ? "你是 linQ 的 AI 匹配引擎。基于用户画像，为他/她生成 3 个高质量的匹配对象。严格输出 JSON，不要 markdown。"
            : "You are linQ's AI matching engine. Generate 3 high-quality match candidates based on the user's profile. Output JSON only, no markdown.";

        const prompt = `Scenario: ${scenario}\nUser profile (JSON): ${userContext}\n\nReturn JSON of shape:\n{\n  "matches": [\n    {\n      "name": string (a realistic first name + last initial, e.g. "Alex W."),\n      "age": number (22-55),\n      "city": string,\n      "headline": string (1 short line${lang === "zh" ? "，中文" : ""}),\n      "bio": string (2-3 sentences${lang === "zh" ? "，中文" : ""}),\n      "shared_interests": string[] (2-4 items),\n      "match_score": number (60-99, two decimals),\n      "reason": string (1-2 sentences explaining why this is a strong match${lang === "zh" ? "，中文" : ""})\n    }\n  ]\n}\nExactly 3 matches. Make them distinct and grounded in the user's profile.`;

        const raw = await deepseekChat(
          [
            { role: "system", content: sys },
            { role: "user", content: prompt },
          ],
          { json: true, temperature: 0.9, max_tokens: 1600 },
        );

        type AIMatch = {
          name: string;
          age?: number;
          city?: string;
          headline?: string;
          bio?: string;
          shared_interests?: string[];
          match_score?: number;
          reason?: string;
        };
        const parsed = safeParseJSON<{ matches?: AIMatch[] }>(raw);
        let aiMatches: AIMatch[] = Array.isArray(parsed?.matches) ? parsed!.matches!.slice(0, 3) : [];

        if (aiMatches.length === 0) {
          // Fallback personas so the UI is never empty.
          aiMatches = [
            { name: "Alex W.", age: 29, city: "San Francisco", headline: "Product designer, weekend climber", bio: "Builds tools for indie hackers. Reads sci-fi on the BART.", shared_interests: ["design", "startups"], match_score: 88.4, reason: "Shares your appetite for thoughtful product work and casual outdoor weekends." },
            { name: "Priya S.", age: 31, city: "Brooklyn", headline: "ML engineer turned founder", bio: "Ex-Meta, now bootstrapping a research tool. Loves jazz bars and long walks.", shared_interests: ["AI", "music"], match_score: 84.1, reason: "Complementary technical depth and a similar curiosity-first mindset." },
            { name: "Marco V.", age: 34, city: "Lisbon", headline: "Filmmaker & coffee snob", bio: "Shoots documentaries about small towns. Always knows the best espresso bar.", shared_interests: ["coffee", "stories"], match_score: 79.6, reason: "Pulls you out of your usual orbit while still meeting you on craft and conversation." },
          ];
        }

        const rows = aiMatches.map((m, i) => ({
          user_id: userId,
          // Reuse real candidate IDs when present; otherwise use a stable
          // namespace UUID so the row passes NOT NULL without claiming a
          // real user.
          matched_user_id: realCandidateIds[i] ?? syntheticUserId(userId, i),
          match_score: typeof m.match_score === "number" ? m.match_score : 70 + i * 5,
          scenario,
          details: {
            name: m.name ?? `Candidate ${i + 1}`,
            age: m.age,
            city: m.city,
            headline: m.headline ?? "",
            bio: m.bio ?? "",
            shared_interests: Array.isArray(m.shared_interests) ? m.shared_interests : [],
            reason: m.reason ?? "",
            is_real_user: Boolean(realCandidateIds[i]),
            ai_provider: parsed ? "deepseek" : "fallback",
          } as never,
        }));

        const { data: inserted, error: insErr } = await supabase
          .from("matches")
          .insert(rows)
          .select("*");

        if (insErr) return json({ error: insErr.message }, { status: 500 });
        return json({ data: inserted, scenario, message: "Top 3 matches generated" });
      },
    },
  },
});

// Deterministic UUID v4-shape string for synthetic matches. Not a real user.
function syntheticUserId(seed: string, salt: number): string {
  const s = `${seed}:${salt}:linq-synthetic`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0");
  const a = hex(h);
  const b = hex((h * 1103515245 + 12345) >>> 0);
  const c = hex((h ^ 0xdeadbeef) >>> 0);
  const d = hex((h * 2654435761) >>> 0);
  return `${a.slice(0, 8)}-${a.slice(0, 4)}-4${b.slice(1, 4)}-8${c.slice(1, 4)}-${d}${b.slice(0, 4)}`;
}