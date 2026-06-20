// src/lib/api/_moderation.server.ts
// Lightweight LLM-based input moderation. Returns flags for NSFW, PII,
// hate speech, harassment, and spam. The check is best-effort and should
// never block obviously benign input because of a model hiccup.

import { llmChatEx, safeParseJSON } from "@/lib/api/_llm.server";

export type ModerationResult = {
  safe: boolean;
  nsfw?: boolean;
  pii?: boolean;
  hate?: boolean;
  harassment?: boolean;
  spam?: boolean;
  reason?: string;
};

export async function moderateText(
  text: string,
  llmLang: "zh" | "en" = "zh",
  label = "moderation",
): Promise<ModerationResult> {
  if (text.trim().length === 0) return { safe: true };

  const sys = llmLang === "zh"
    ? "你是 linQ 的内容安全审核员。判断以下用户输入是否包含：NSFW/色情、个人隐私信息（PII）、仇恨言论、骚扰/威胁、垃圾广告。只输出 JSON，不要解释。"
    : "You are linQ's content safety moderator. Decide if the user input contains: NSFW/porn, PII, hate speech, harassment/threats, or spam. Output JSON only, no explanation.";

  const user = llmLang === "zh"
    ? `输入："""${text.slice(0, 2000)}"""\n\n输出 JSON：\n{\n  "safe": boolean,\n  "nsfw": boolean,\n  "pii": boolean,\n  "hate": boolean,\n  "harassment": boolean,\n  "spam": boolean,\n  "reason": "如果 unsafe，简短说明原因"\n}`
    : `Input: """${text.slice(0, 2000)}"""\n\nOutput JSON:\n{\n  "safe": boolean,\n  "nsfw": boolean,\n  "pii": boolean,\n  "hate": boolean,\n  "harassment": boolean,\n  "spam": boolean,\n  "reason": "short reason if unsafe"\n}`;

  try {
    const res = await llmChatEx(
      [{ role: "system", content: sys }, { role: "user", content: user }],
      { json: true, temperature: 0.1, max_tokens: 400, label, deadlineMs: 10_000 },
    );
    const parsed = safeParseJSON<ModerationResult>(res?.content ?? null);
    const result = parsed ?? { safe: true };
    // Be conservative: if the model fails to give a clear safe=true, treat as safe.
    return { ...result, safe: result.safe !== false };
  } catch (e) {
    console.warn(JSON.stringify({ at: "moderation:failed", label, error: String(e) }));
    return { safe: true };
  }
}
