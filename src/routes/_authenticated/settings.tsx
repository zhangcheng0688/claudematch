import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Heart, Save, Users, Copy, Gift } from "lucide-react";
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
  authorizations: { business: boolean; dating: boolean; partner: boolean; discoverable?: boolean };
};

type Scenarios = { business: boolean; dating: boolean; partner: boolean };

function SettingsPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [scenarios, setScenarios] = useState<Scenarios>({
    business: false,
    dating: false,
    partner: false,
  });
  const [discoverable, setDiscoverable] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [claimCode, setClaimCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: MeResponse } | MeResponse>("/api/user/me", {
          method: "GET",
        });
        const me: MeResponse = (res as { data: MeResponse }).data ?? (res as MeResponse);
        setScenarios(me.authorizations ?? { business: false, dating: false, partner: false });
        setDiscoverable(me.authorizations?.discoverable !== false);
        loadReferral();
        setLoaded(true);
      } catch (e) {
        setErr(translateError(e instanceof Error ? e.message : "Failed to load", lang));
        setLoaded(true);
      }
    })();
  }, []);

  const loadReferral = async () => {
    try {
      const res = await authedFetch<{ data: { code: string | null; signed_up_count: number } }>(
        "/api/referrals",
        { method: "GET" },
      );
      if (res.data?.code) {
        setReferralCode(res.data.code);
        setReferralCount(res.data.signed_up_count ?? 0);
      }
    } catch {
      /* ignore */
    }
  };

  const generateReferral = async () => {
    try {
      const res = await authedFetch<{ data: { code: string } }>("/api/referrals", {
        method: "POST",
      });
      setReferralCode(res.data?.code ?? null);
    } catch {
      /* ignore */
    }
  };

  const copyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const claimReferral = async () => {
    if (!claimCode.trim()) return;
    try {
      await authedFetch("/api/referrals/claim", {
        method: "POST",
        body: JSON.stringify({ code: claimCode.trim() }),
      });
      setClaimCode("");
      setSavedAt(Date.now());
    } catch (e) {
      setErr(translateError(e instanceof Error ? e.message : "Claim failed", lang));
    }
  };

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
        body: JSON.stringify({ ...scenarios, discoverable }),
      });
      setSavedAt(Date.now());
    } catch (e) {
      setErr(translateError(e instanceof Error ? e.message : "Save failed", lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      back={{
        to: "/profile",
        labelEn: "Back to profile",
        labelZh: "返回个人中心",
        labelYue: "返回個人中心",
      }}
    >
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

        <div className="mt-6 overflow-hidden rounded-sm border border-border bg-background/40">
          <label className="flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-accent">
            <div className="flex-1">
              <div className="text-sm font-medium">
                {t("Allow matching", "允许被匹配", "允許被配對")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "Others can see and match with you",
                  "其他人可以发现并匹配你",
                  "其他人可以發現並配對你",
                )}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={discoverable}
              disabled={!loaded}
              onClick={() => setDiscoverable((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${discoverable ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all ${discoverable ? "left-6" : "left-0.5"}`}
              />
            </button>
          </label>
        </div>

        <div className="mt-8 overflow-hidden rounded-sm border border-border bg-background/40 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Gift className="h-4 w-4 text-primary" />
            {t("Invite friends", "邀请朋友", "邀請朋友")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "Share linQ. Both sides get perks as more people join.",
              "分享 linQ。更多人加入后双方都会获得奖励。",
              "分享 linQ。更多人加入後雙方都會獲得獎勵。",
            )}
          </p>
          {referralCode ? (
            <div className="mt-3 flex items-center gap-2">
              <code className="rounded-sm border border-border bg-background px-3 py-1.5 text-sm tracking-wider">
                {referralCode}
              </code>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex h-8 items-center gap-1 rounded-sm border border-border px-3 text-xs hover:bg-accent"
              >
                <Copy className="h-3 w-3" />
                {copied ? t("Copied", "已复制", "複製咗") : t("Copy", "复制", "複製")}
              </button>
              <span className="text-xs text-muted-foreground">
                {referralCount} {t("joined", "已加入", "已加入")}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateReferral}
              className="mt-3 inline-flex h-8 items-center rounded-sm bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("Generate code", "生成邀请码", "生成邀請碼")}
            </button>
          )}
          <div className="mt-4 flex items-center gap-2">
            <input
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder={t("Have a friend's code?", "有朋友的邀请码？", "有朋友嘅邀請碼？")}
              className="flex-1 rounded-sm border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={claimReferral}
              disabled={!claimCode.trim()}
              className="inline-flex h-8 items-center rounded-sm border border-border px-3 text-xs hover:bg-accent disabled:opacity-60"
            >
              {t("Claim", "使用", "使用")}
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving || !loaded}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving
            ? t("Saving…", "保存中…", "儲存緊…")
            : t("Save preferences", "保存设置", "儲存設定")}
        </button>

        {savedAt && !err && (
          <p className="mt-3 text-center text-xs text-primary">
            {t("Saved ✓", "已保存 ✓", "儲存咗 ✓")}
          </p>
        )}
        {err && <p className="mt-3 text-center text-xs text-destructive">{err}</p>}
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
