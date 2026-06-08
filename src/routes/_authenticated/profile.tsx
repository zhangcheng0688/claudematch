import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Sparkles } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — linQ" },
      { name: "description", content: "Your linQ account and preferences." },
      { property: "og:title", content: "Profile — linQ" },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <ProfilePage />
    </LanguageProvider>
  ),
});

type MeResponse = {
  user: { id: string; email: string };
  profile: unknown;
  authorizations: { business: boolean; dating: boolean; partner: boolean };
  ai_profile: unknown;
};

// Mirrors the helper in routes/_authenticated/start.tsx. Will be hoisted to
// src/lib/api/authed-fetch.ts in the AppShell + hooks phase.
async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body;
}

function ProfilePage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/user/me", { method: "GET" });
        setMe((res as { data: MeResponse }).data ?? (res as MeResponse));
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    })();
  }, []);

  const signOut = async () => {
    if (typeof window !== "undefined" && !window.confirm(t("Sign out of linQ?", "确定退出登录？"))) return;
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const email = me?.user?.email ?? "";
  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header — inline for now; will be replaced by AppShell in the next phase. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/start" className="text-xs text-muted-foreground hover:text-foreground">
            ← {t("Back", "返回")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-md px-6 py-12 sm:py-16">
        {loading ? (
          <div className="rounded-sm border border-border bg-background/40 p-12 text-center text-sm text-muted-foreground">
            {t("Loading…", "加载中…")}
          </div>
        ) : err ? (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        ) : me ? (
          <div className="space-y-8">
            {/* User identity */}
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-semibold text-primary-foreground shadow-lg ring-2 ring-primary/20">
                {initial}
              </div>
              <div className="text-base font-medium">{email}</div>
            </div>

            {/* Menu — Settings link is intentionally absent; that page is built in the next phase. */}
            <div className="overflow-hidden rounded-sm border border-border bg-background/40">
              <Link
                to="/start"
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent"
              >
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{t("Edit AI profile", "完善 AI 画像")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("Update how AI sees you", "更新 AI 对你的理解")}
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
            </div>

            {/* Sign out */}
            <button
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              {t("Sign out", "退出登录")}
            </button>

            {/* Version */}
            <div className="text-center text-xs text-muted-foreground">linQ v1.1.0 · Web</div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
