import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
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

function MatchListPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: MatchRow[] } | MatchRow[]>("/api/match", {
          method: "GET",
        });
        setMatches((res as { data: MatchRow[] }).data ?? (res as MatchRow[]));
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppShell
      back={{
        to: "/profile",
        labelEn: "Back to profile",
        labelZh: "返回个人中心",
        labelYue: "返回個人中心",
      }}
    >
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gold-glow">{t("Your matches", "你的匹配", "你嘅配對")}</span>
        </h1>

        {loading ? (
          <div className="mt-8 rounded-sm border border-border bg-background/40 p-12 text-center text-sm text-muted-foreground">
            {t("Loading…", "加载中…", "載入中…")}
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
              {t("Retry", "重试", "重試")}
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="mt-8 rounded-sm border border-border bg-background/40 p-12 text-center">
            <div className="text-4xl">🔍</div>
            <div className="mt-4 text-base font-medium">
              {t("No matches yet", "还没有匹配结果", "仲未有配對結果")}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "AI needs to understand you before it can find someone.",
                "AI 需要先了解你才能找到合适的人。",
                "AI 要先了解你，先可以幫你搵到夾嘅人。",
              )}
            </p>
            <button
              onClick={() => navigate({ to: "/start" })}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" />
              {t("Start AI matching", "开始 AI 匹配", "即刻 AI 配對")}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {matches.length} {t("matches", "个匹配", "個配對")}
              </span>
              <button
                onClick={() => navigate({ to: "/start" })}
                className="text-primary hover:underline"
              >
                ✨ {t("New AI match", "新匹配", "新配對")}
              </button>
            </div>
            {matches.map((m) => (
              <Link key={m.id} to="/match/$id" params={{ id: m.id }} className="block">
                <MatchCard
                  match={m}
                  active={false}
                  loading={false}
                  onPlan={() => navigate({ to: "/match/$id", params: { id: m.id } })}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
