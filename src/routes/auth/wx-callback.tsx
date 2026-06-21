// src/routes/auth/wx-callback.tsx
// WeChat OAuth lands the user's browser here. The URL shape is:
//   ?status=ok&token=<magic-link-action-link>&next=<path>
//   ?status=error&reason=<text>
//
// On success: use the action-link to establish a Supabase session
// (verifyOtp with token_hash is the supported path), then navigate to next.
// On error: show a friendly message with a "Back to email sign-in" link.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/auth/wx-callback")({
  head: () => ({ meta: [{ title: "WeChat sign-in — linQ" }] }),
  component: () => (
    <LanguageProvider>
      <WxCallbackPage />
    </LanguageProvider>
  ),
});

function WxCallbackPage() {
  const { lang } = useLang();
  const t = (en: string, zh: string, yue: string) =>
    lang === "yue" ? yue : lang === "zh" ? zh : en;
  const navigate = useNavigate();

  const { status, token, next, reason } = Route.useSearch() as {
    status?: "ok" | "error";
    token?: string;
    next?: string;
    reason?: string;
  };

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ok" || !token) return;
    (async () => {
      try {
        // The action_link looks like: https://<host>/auth/v1/verify?token=...
        // &type=magiclink. Extract the token + type and call verifyOtp.
        const url = new URL(token);
        const tokenHash = url.searchParams.get("token") ?? "";
        const type = url.searchParams.get("type") ?? "magiclink";
        if (!tokenHash) {
          setErr("Invalid sign-in link");
          return;
        }
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "magiclink" | "email" | "signup",
        });
        if (error) {
          setErr(error.message);
          return;
        }
        // Session is now set. Navigate to the original target.
        navigate({ to: (next && next.startsWith("/") ? next : "/start") as never, replace: true });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sign-in failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "ok") {
    return (
      <AppShell>
        <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h1 className="text-xl font-semibold">
            {t("Signing you in with WeChat…", "正在用微信登录…", "用微信登入緊…")}
          </h1>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-semibold">
          {t("WeChat sign-in failed", "微信登录失败", "微信登入失敗")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {reason ??
            t("Something went wrong. Please try again.", "出错了，请重试。", "出咗事，再試多次。")}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link
            to="/auth"
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            {t("Use email instead", "改用邮箱登录", "改用 email 登入")}
          </Link>
          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#07c160]/40 bg-[#07c160]/10 px-5 text-sm font-medium text-[#07c160] hover:bg-[#07c160]/20"
          >
            <MessageCircle className="h-4 w-4" />
            {t("Try WeChat again", "重试微信", "再試多次微信")}
          </button>
        </div>
      </section>
    </AppShell>
  );
}
