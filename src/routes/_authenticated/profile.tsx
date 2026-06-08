import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Sparkles } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";

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

function ProfilePage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: MeResponse } | MeResponse>("/api/user/me", { method: "GET" });
        setMe((res as { data: MeResponse }).data ?? (res as MeResponse));
        setLoading(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setLoading(false);
      }
    })();
  }, []);

  const email = me?.user?.email ?? "";
  const initial = email ? email[0].toUpperCase() : "?";

  return (
    <AppShell>
      <section className="mx-auto max-w-md px-6 py-12 sm:py-16">
        {loading ? (
          <div className="rounded-sm border border-border bg-background/40 p-12 text-center text-sm text-muted-foreground">
            {t("Loading…", "加载中…", "載入中…")}
          </div>
        ) : err ? (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        ) : me ? (
          <div className="space-y-8">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-semibold text-primary-foreground shadow-lg ring-2 ring-primary/20">
                {initial}
              </div>
              <div className="text-base font-medium">{email}</div>
            </div>

            <div className="overflow-hidden rounded-sm border border-border bg-background/40">
              <Link
                to="/start"
                className="flex items-center gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-accent"
              >
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {t("Edit AI profile", "完善 AI 画像", "編輯 AI 檔案")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("Update how AI sees you", "更新 AI 对你的理解", "更新 AI 對你嘅理解")}
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {t("Matching preferences", "匹配偏好", "配對偏好")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      me.authorizations?.business && t("Business", "工作", "工作"),
                      me.authorizations?.dating && t("Dating", "恋爱", "拍拖"),
                      me.authorizations?.partner && t("Local friends", "本地朋友", "本地朋友"),
                    ]
                      .filter(Boolean)
                      .join(" · ") || t("No scenarios enabled", "未启用任何场景", "未啟用任何場景")}
                  </div>
                </div>
                <span className="text-muted-foreground">→</span>
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t("Sign out via the avatar menu (top right).", "点击右上角头像菜单退出登录。", "撳右上角個樣登出。")}
            </p>

            <div className="text-center text-xs text-muted-foreground">linQ v1.1.0 · Web</div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
