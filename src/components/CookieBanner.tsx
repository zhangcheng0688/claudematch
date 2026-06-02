import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const KEY = "linq.cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, "accepted");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-3xl rounded-xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur md:inset-x-6 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies to improve your experience. By continuing, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Link
            to="/cookies"
            className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent"
          >
            Learn more
          </Link>
          <button
            onClick={accept}
            className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}