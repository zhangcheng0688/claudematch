import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Sparkles, MessageCircle, CheckCircle2, Loader2, Unlink } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { authedFetch } from "@/lib/api/authed-fetch";
import { translateError } from "@/lib/api/translate-error";

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
  user: { id: string; email: string; wechat_bound: boolean };
  profile: { wechat_nickname?: string; wechat_avatar?: string } | null;
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
  const [wxBusy, setWxBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch<{ data: MeResponse } | MeResponse>("/api/user/me", { method: "GET" });
        setMe((res as { data: MeResponse }).data ?? (res as MeResponse));
        setLoading(false);
      } catch (e) {
        setErr(translateError(e instanceof Error ? e.message : "Failed to load", lang));
        setLoading(false);
      }
    })();
  }, []);

  const email = me?.user?.email ?? "";
  const initial = email ? email[0].toUpperCase() : "?";
  const wxBound = me?.user?.wechat_bound ?? false;
  const wxNickname = me?.profile?.wechat_nickname;

  const startWechatBind = async () => {
    setErr(null);
    setWxBusy(true);
    try {
      const res = await fetch("/api/auth/wechat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirect_to: `${window.location.origin}/auth/wx-callback` }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setErr(
          data.error ??
            t(
              "WeChat binding is being set up. Try again later.",
              "微信绑定准备中，请稍后再试。",
              "微信綁定準備中，遲啲再試。",
            ),
        );
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to start WeChat bind");
    } finally {
      setWxBusy(false);
    }
  };

  const unbindWechat = async () => {
    if (
      !window.confirm(
        t(
          "Unbind WeChat from this account?",
          "确定解除微信绑定？",
          "確定解除微信綁定？",
        ),
      )
    ) {
      return;
    }
    setErr(null);
    setWxBusy(true);
    try {
      // P1-5: send an Idempotency-Key so a page-refresh mid-flight
      // doesn't double-unbind. The key is regenerated per click.
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const res = await authedFetch<{ data?: { unbound?: boolean }; error?: string }>(
        "/api/auth/wechat/unbind",
        { method: "POST", headers: { "Idempotency-Key": idempotencyKey } },
      );
      if (res.error || !res.data?.unbound) {
        setErr(
          res.error ??
            t("Couldn't unbind. Try again?", "解除失败，请重试？", "解除失敗，再試吓？"),
        );
        return;
      }
      // Refetch me to flip the UI
      const fresh = await authedFetch<{ data: MeResponse } | MeResponse>("/api/user/me", {
        method: "GET",
      });
      setMe((fresh as { data: MeResponse }).data ?? (fresh as MeResponse));
    } catch (e) {
      setErr(translateError(e instanceof Error ? e.message : "Failed to unbind", lang));
    } finally {
      setWxBusy(false);
    }
  };

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

            {/* WeChat binding card */}
            <div className="rounded-sm border border-border bg-background/40 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#07c160]/10 text-[#07c160]">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {t("WeChat", "微信", "微信")}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {wxBound
                      ? t(
                          `Linked${wxNickname ? ` as ${wxNickname}` : ""}`,
                          `已绑定${wxNickname ? `（${wxNickname}）` : ""}`,
                          `已綁定${wxNickname ? `（${wxNickname}）` : ""}`,
                        )
                      : t(
                          "Link your WeChat for faster sign-in.",
                          "绑定微信，下次登录更快。",
                          "綁定微信，下次登入更快。",
                        )}
                  </div>
                </div>
                {wxBound ? (
                  <button
                    type="button"
                    onClick={unbindWechat}
                    disabled={wxBusy}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-60"
                  >
                    {wxBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Unlink className="h-3 w-3" />
                    )}
                    {t("Unbind", "解除绑定", "解除綁定")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startWechatBind}
                    disabled={wxBusy}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-[#07c160]/40 bg-[#07c160]/10 px-3 py-1.5 text-xs font-medium text-[#07c160] transition-colors hover:bg-[#07c160]/20 disabled:opacity-60"
                  >
                    {wxBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <MessageCircle className="h-3 w-3" />
                    )}
                    {t("Bind WeChat", "绑定微信", "綁定微信")}
                  </button>
                )}
              </div>
              {wxBound && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("Verified", "已验证", "已驗證")}
                </div>
              )}
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
