import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Heart, LogOut, Save, Users } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — linQ" },
      { name: "description", content: "Manage your linQ matching preferences." },
      { property: "og:title", content: "Settings — linQ" },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <SettingsPage />
    </LanguageProvider>
  ),
});

type MeResponse = {
  user: { id: string; email: string };
  authorizations: { business: boolean; dating: boolean; partner: boolean };
};

// Mirrors the helper in routes/_authenticated/{start,profile}.tsx.
// Will be hoisted to src/lib/api/authed-fetch.ts in the AppShell + hooks phase.
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

type Scenarios = { business: boolean; dating: boolean; partner: boolean };

function SettingsPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const [scenarios, setScenarios] = useState<Scenarios>({ business: false, dating: false, partner: false });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch("/api/user/me", { method: "GET" });
        const me: MeResponse = (res as { data: MeResponse }).data ?? (res as MeResponse);
        setScenarios(me.authorizations ?? { business: false, dating: false, partner: false });
        setLoaded(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoaded(true);
      }
    })();
  }, []);

  const save = async () => {
    if (!scenarios.business && !scenarios.dating && !scenarios.partner) {
      setErr(t("Enable at least one scenario.", "至少开启一个场景。"));
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      await authedFetch("/api/authorize", {
        method: "POST",
        body: JSON.stringify(scenarios),
      });
      setSavedAt(Date.now());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    if (typeof window !== "undefined" && !window.confirm(t("Sign out of linQ?", "确定退出登录？"))) return;
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

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

      <section className="mx-auto max-w-md px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gold-glow">{t("Settings", "设置")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Choose which matching scenarios you'd like to be discovered for.", "选择你想被匹配的场景。")}
        </p>

        {/* Scenarios */}
        <div className="mt-8 overflow-hidden rounded-sm border border-border bg-background/40">
          <ScenarioRow
            icon={<Heart className="h-4 w-4" />}
            label={t("Dating", "恋爱")}
            desc={t("Find a date", "寻找约会对象")}
            checked={scenarios.dating}
            onChange={(v) => setScenarios((s) => ({ ...s, dating: v }))}
            disabled={!loaded}
          />
          <ScenarioRow
            icon={<Briefcase className="h-4 w-4" />}
            label={t("Business", "工作")}
            desc={t("Find collaborators or mentors", "寻找合作者或导师")}
            checked={scenarios.business}
            onChange={(v) => setScenarios((s) => ({ ...s, business: v }))}
            disabled={!loaded}
          />
          <ScenarioRow
            icon={<Users className="h-4 w-4" />}
            label={t("Local friends", "本地朋友")}
            desc={t("Find hobby buddies", "寻找兴趣搭子")}
            checked={scenarios.partner}
            onChange={(v) => setScenarios((s) => ({ ...s, partner: v }))}
            disabled={!loaded}
            last
          />
        </div>

        {/* Save */}
        <button
          onClick={save}
          disabled={saving || !loaded}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("Saving…", "保存中…") : t("Save preferences", "保存设置")}
        </button>

        {savedAt && !err && (
          <p className="mt-3 text-center text-xs text-primary">
            {t("Saved ✓", "已保存 ✓")}
          </p>
        )}
        {err && (
          <p className="mt-3 text-center text-xs text-destructive">{err}</p>
        )}

        {/* Sign out */}
        <div className="mt-12 border-t border-border/60 pt-8">
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t("Sign out", "退出登录")}
          </button>
        </div>
      </section>
    </main>
  );
}

function ScenarioRow({
  icon,
  label,
  desc,
  checked,
  onChange,
  disabled,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  last?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-accent ${
        last ? "" : "border-b border-border"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
