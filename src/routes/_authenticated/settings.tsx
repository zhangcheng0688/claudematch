import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Heart, Save, Users } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
import { translateError } from "@/lib/api/translate-error";

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

type Scenarios = { business: boolean; dating: boolean; partner: boolean };

function SettingsPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [scenarios, setScenarios] = useState<Scenarios>({ business: false, dating: false, partner: false });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: MeResponse } | MeResponse>("/api/user/me", { method: "GET" });
        const me: MeResponse = (res as { data: MeResponse }).data ?? (res as MeResponse);
        setScenarios(me.authorizations ?? { business: false, dating: false, partner: false });
        setLoaded(true);
      } catch (e) {
        setErr(translateError(e instanceof Error ? e.message : "Failed to load", lang));
        setLoaded(true);
      }
    })();
  }, []);

  const save = async () => {
    if (!scenarios.business && !scenarios.dating && !scenarios.partner) {
      setErr(t("Enable at least one scenario.", "至少开启一个场景。", "最少開一個場景。"));
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
      setErr(translateError(e instanceof Error ? e.message : "Save failed", lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell back={{ to: "/profile", labelEn: "Back to profile", labelZh: "返回个人中心", labelYue: "返回個人中心" }}>
      <section className="mx-auto max-w-md px-6 py-12 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          <span className="text-gold-glow">{t("Settings", "设置", "設定")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Choose which matching scenarios you'd like to be discovered for.",
            "选择你想被匹配的场景。",
            "揀你想被配對嘅場景。",
          )}
        </p>

        <div className="mt-8 overflow-hidden rounded-sm border border-border bg-background/40">
          <ScenarioRow
            icon={<Heart className="h-4 w-4" />}
            label={t("Dating", "恋爱", "拍拖")}
            desc={t("Find a date", "寻找约会对象", "搵個約會對象")}
            checked={scenarios.dating}
            onChange={(v) => setScenarios((s) => ({ ...s, dating: v }))}
            disabled={!loaded}
          />
          <ScenarioRow
            icon={<Briefcase className="h-4 w-4" />}
            label={t("Business", "工作", "工作")}
            desc={t("Find collaborators or mentors", "寻找合作者或导师", "搵合作拍檔或者師傅")}
            checked={scenarios.business}
            onChange={(v) => setScenarios((s) => ({ ...s, business: v }))}
            disabled={!loaded}
          />
          <ScenarioRow
            icon={<Users className="h-4 w-4" />}
            label={t("Local friends", "本地朋友", "本地朋友")}
            desc={t("Find hobby buddies", "寻找兴趣搭子", "搵興趣班底")}
            checked={scenarios.partner}
            onChange={(v) => setScenarios((s) => ({ ...s, partner: v }))}
            disabled={!loaded}
            last
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !loaded}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? t("Saving…", "保存中…", "儲存緊…") : t("Save preferences", "保存设置", "儲存設定")}
        </button>

        {savedAt && !err && (
          <p className="mt-3 text-center text-xs text-primary">
            {t("Saved ✓", "已保存 ✓", "儲存咗 ✓")}
          </p>
        )}
        {err && (
          <p className="mt-3 text-center text-xs text-destructive">{err}</p>
        )}
      </section>
    </AppShell>
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
