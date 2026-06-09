// src/lib/api/translate-error.ts
//
// Second pass on top of safeError: localize a known error message for
// the UI. The first pass (safeError in _helpers.server.ts) returns an
// English public-safe string; this second pass is what the SPA uses
// before it shows the error to the user. Translates only KNOWN
// messages — anything not in the table falls through to the input
// unchanged (which is already English + public-safe via safeError).

const KNOWN: Record<string, { en: string; zh: string; yue: string }> = {
  // safeError mappings (the English public-safe strings it returns)
  "An account with this email already exists. Try signing in.": {
    en: "An account with this email already exists. Try signing in.",
    zh: "这个邮箱已注册过了，请直接登录。",
    yue: "呢個 email 已經註冊咗，直接登入啦。",
  },
  "That code didn't work. Please check and try again.": {
    en: "That code didn't work. Please check and try again.",
    zh: "验证码不对，请检查后重试。",
    yue: "驗證碼唔啱，check 下再試。",
  },
  "Please confirm your email first by clicking the link we sent.": {
    en: "Please confirm your email first by clicking the link we sent.",
    zh: "请先点击邮件里的链接确认账号。",
    yue: "請先撳 email 入面嘅連結確認帳號。",
  },
  "That link or code has expired. Please request a new one.": {
    en: "That link or code has expired. Please request a new one.",
    zh: "链接或验证码已过期，请重新申请。",
    yue: "連結或驗證碼過咗期，重新申請啦。",
  },
  "Too many attempts. Please wait a few minutes and try again.": {
    en: "Too many attempts. Please wait a few minutes and try again.",
    zh: "尝试次数过多，请稍等几分钟再试。",
    yue: "試咗太多次，抖一陣再試。",
  },
  // Other client-side errors
  "Failed to load": {
    en: "Failed to load",
    zh: "加载失败",
    yue: "載入失敗",
  },
  "Save failed": {
    en: "Save failed",
    zh: "保存失败",
    yue: "儲存失敗",
  },
  "Failed to send code. Please try again.": {
    en: "Failed to send code. Please try again.",
    zh: "验证码发送失败，请重试。",
    yue: "驗證碼傳送失敗，再試多次。",
  },
};

export function translateError(msg: string, lang: "en" | "zh" | "yue"): string {
  const entry = KNOWN[msg];
  if (!entry) return msg;
  return entry[lang];
}
