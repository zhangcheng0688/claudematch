import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { MatchCard } from "@/components/shared/MatchCard";
import type { MatchRow } from "@/types/match";

export const Route = createFileRoute("/_authenticated/match")({
  head: () => ({
    meta: [
      { title: "Your matches — linQ" },
      { name: "description", content: "Your past AI matches on linQ." },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <MatchListPage />
    </LanguageProvider>
  ),
});

// Mirrors the helper in other authenticated routes.
// Will be hoisted to src/lib/api/authed-fetch.ts in the AppShell phase.
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

function MatchListPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/match", { method: "GET" });
        setMatches((res as { data: MatchRow[] }).data ?? []);
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header — inline for now; will be replaced by AppShell later. */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground">
            ← {t("Back to profile", "返回个人中心")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gold-glow">{t("Your matches", "你的匹配")}</span>
        </h1>

        {loading ? (
          <div className="mt-8 rounded-sm border border-border bg-background/40 p-12 text-center text-sm text-muted-foreground">
            {t("Loading…", "加载中…")}
          </div>
        ) : err ? (
          <div className="mt-8 space-y-3">
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {err}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center rounded-sm border border-border bg-background px-4 text-xs font-medium hover:bg-accent"
            >
              {t("Retry", "重试")}
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-8 rounded-sm border border-border bg-background/40 p-12 text-center">
            <div className="text-4xl">🔍</div>
            <div className="mt-4 text-base font-medium">{t("No matches yet", "还没有匹配结果")}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("AI needs to understand you before it can find someone.", "AI 需要先了解你才能找到合适的人。")}
            </p>
            <button
              onClick={() => navigate({ to: "/start" })}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              {t("Start AI matching", "开始 AI 匹配")}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {matches.length} {t("matches", "个匹配")}
              </span>
              <button
                onClick={() => navigate({ to: "/start" })}
                className="text-primary hover:underline"
              >
                ✨ {t("New AI match", "新匹配")}
              </button>
            </div>
            {matches.map((m) => (
              <Link key={m.id} to="/match/$id" params={{ id: m.id }} className="block">
                <MatchCard
                  match={m}
                  active={false}
                  loading={false}
                  onPlan={(e) => {
                    // Don't navigate to match detail if user clicks the Plan button — let the card handle it
                    e?.preventDefault();
                    navigate({ to: "/match/$id", params: { id: m.id } });
                  }}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
