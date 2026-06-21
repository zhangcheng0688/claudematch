// src/lib/useT.ts
//
// P2-deferred 4: unified i18n hook. Single source for "translate
// this string", replacing both the `t("dict_key")` dict lookup and
// the `t(en, zh, yue)` triple pattern scattered across 5 business
// pages.
//
// Three ways to call it:
//
//   const t = useT();
//   t("hero_badge")                    // dict key (en/zh/yue all in dict)
//   t("Hero badge", "徽章", "標誌")      // inline triple (literal string)
//   t("Hello", undefined, "你好", "yue")  // mixed: en + zh(yue as zh) + yue-only
//
// Backward compat:
//   t("dict_key") still works the same way (returns the dict value
//   for the active lang, falling back to en if missing).
//
// Why we don't force-migrate the inline triples to dict entries
// yet: many of them are content strings (sentence-length) that
// change frequently with copy iteration. Forcing every string
// through a dict would slow down copy A/B. So we keep both paths
// and the new hook is the entry point for both.
//
// Future migration: when we land a real CMS, all inline triples
// move to dict entries (keyed by stable IDs), and the inline
// overload of t() goes away.

import { useLang, translations, type Lang } from "@/lib/i18n";

type TripleArgs =
  | [string] // dict key only
  | [string, string, string?] // inline triple, last is optional yue
  | [string, undefined, string?, string?]; // dict + zh + yue (overrides)
// The 4-arg form lets you say t("Key", undefined, "中文", "粵語") —
// "key for fallback, then zh, then yue". We only use this in 1-2
// places; the 3-arg form (t(en, zh, yue)) is the workhorse.

export type Translator = {
  /**
   * Translate a string. Two forms:
   *   t("dict_key") — look up in the lang dict
   *   t("English", "中文", "粵語") — inline triple, yue is optional
   */
  (keyOrEn: string, zh?: string, yue?: string): string;
  /** The active language. Useful for code paths that need to know
   *  which lang is active (e.g. AI prompts that should not include
   *  the locale). */
  lang: Lang;
};

/** useT — the new entry point. Drop-in replacement for both:
 *    const t = (en, zh, yue) => lang === "yue" ? yue ?? zh : lang === "zh" ? zh : en;
 *  and
 *    const t = (k) => dict[lang][k] ?? k;
 *  Use it like:
 *    const t = useT();
 *    t("nav_getStarted")  // dict lookup
 *    t("Get started", "开始使用", "即刻開始")  // inline triple
 */
export function useT(): Translator {
  const { lang } = useLang();
  const translator = ((keyOrEn: string, zh?: string, yue?: string): string => {
    // 2-arg or 3-arg form with non-key zh: treat as inline triple
    if (zh !== undefined) {
      // It's a (en, zh, yue?) triple — ignore the dict
      if (lang === "yue") return yue ?? zh;
      if (lang === "zh") return zh;
      return keyOrEn;
    }
    // 1-arg form: dict key. Use the static import — Vite ESM
    // doesn't support `require()` in the client bundle.
    const dict = (translations[lang] as Record<string, string> | undefined) ?? {};
    return dict[keyOrEn] ?? keyOrEn;
  }) as Translator;
  translator.lang = lang;
  return translator;
}
