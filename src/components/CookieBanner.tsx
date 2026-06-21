import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

const KEY = "linq.cookie-consent";
// Allowed values: "accepted" (full consent) | "rejected" (no non-essential)
// | undefined (not yet asked).
// "dismissed" used to mean "implicitly accepted via close" — that
// pattern is gone because GDPR requires affirmative consent.

export function CookieBanner() {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v !== "accepted" && v !== "rejected") setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Focus management: when the dialog appears, focus the accept button
  // (the destructive option by default — matches the WAI-ARIA dialog
  // pattern recommendation of focusing the safest action; we want
  // users to make a real choice rather than tabbing past).
  useEffect(() => {
    if (visible) acceptRef.current?.focus();
  }, [visible]);

  // ESC to reject (explicit choice rather than dismissal).
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") reject();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const persist = (v: "accepted" | "rejected") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const accept = () => persist("accepted");
  const reject = () => persist("rejected");

  if (!visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-3xl rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur md:inset-x-6 md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p
            id="cookie-banner-title"
            className="text-sm font-semibold leading-relaxed text-foreground"
          >
            {lang === "zh" ? "我们使用 Cookies" : "We use cookies"}
          </p>
          <p id="cookie-banner-desc" className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {lang === "zh"
              ? "继续浏览即表示你同意我们使用必要的 Cookies 来改善你的体验。"
              : "By continuing, you agree to our necessary cookies to improve your experience. We don't sell data or run third-party trackers."}{" "}
            <Link to="/terms" className="text-primary hover:underline">
              {lang === "zh" ? "条款" : "Terms"}
            </Link>{" "}
            ·{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              {lang === "zh" ? "隐私" : "Privacy"}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Link
            to="/cookies"
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            {lang === "zh" ? "了解更多" : "Learn more"}
          </Link>
          <button
            ref={acceptRef}
            onClick={reject}
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-4 text-xs font-medium text-foreground hover:bg-accent"
          >
            {lang === "zh" ? "仅必要" : "Reject non-essential"}
          </button>
          <button
            onClick={accept}
            className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {lang === "zh" ? "全部接受" : "Accept all"}
          </button>
        </div>
      </div>
    </div>
  );
}
