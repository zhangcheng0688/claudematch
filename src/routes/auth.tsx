import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Mail, KeyRound, Loader2, QrCode, Smartphone } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — linQ" },
      { name: "description", content: "Sign in to linQ with a one-time code sent to your email." },
    ],
  }),
  component: () => (
    <LanguageProvider>
      <AuthPage />
    </LanguageProvider>
  ),
});

function AuthPage() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"wechat" | "phone" | "email">("wechat");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Already signed in? Skip to /start.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/start", replace: true });
    });
  }, [navigate]);

  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(t("Enter a valid email.", "请输入有效邮箱。"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/start` },
    });
    setLoading(false);
    if (error) {
      setErr(t("Failed to send code. Please try again.", "发送验证码失败，请稍后再试。"));
      return;
    }
    setStage("code");
    setMsg(t("Check your email — paste the verification code below.", "请查收邮件，把验证码粘贴到下方。"));
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\d{6,10}$/.test(otp)) {
      setErr(t("Enter the numeric code from the email.", "请输入邮件中的数字验证码。"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/start", replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("Back to home", "返回首页")}
          </Link>
        </div>
      </header>
      <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-20">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gold-glow">{t("Sign in to linQ", "登录 linQ")}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t(
              "Choose your preferred way to sign in. No password needed.",
              "选择你习惯的登录方式，无需密码。",
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-sm border border-border bg-background/40 p-1">
          {([
            { key: "wechat", icon: QrCode, label: t("WeChat", "微信扫码") },
            { key: "phone", icon: Smartphone, label: t("Phone", "手机号") },
            { key: "email", icon: Mail, label: t("Email", "邮箱") },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setErr(null);
                setMsg(null);
              }}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "wechat" ? (
          <ComingSoon
            icon={<QrCode className="h-10 w-10 text-primary/70" />}
            title={t("WeChat QR sign-in", "微信扫码登录")}
            body={t(
              "Coming soon — we're getting WeChat Open Platform verified. For now, please sign in with email.",
              "即将开放 —— 微信开放平台资质审核中。请暂时使用邮箱登录。",
            )}
            cta={t("Use email instead", "改用邮箱登录")}
            onCta={() => setTab("email")}
          />
        ) : tab === "phone" ? (
          <ComingSoon
            icon={<Smartphone className="h-10 w-10 text-primary/70" />}
            title={t("Phone + SMS code", "手机号 + 短信验证码")}
            body={t(
              "Coming soon — SMS provider (Aliyun / Tencent Cloud) being configured. For now, please sign in with email.",
              "即将开放 —— 短信服务商（阿里云 / 腾讯云）接入中。请暂时使用邮箱登录。",
            )}
            cta={t("Use email instead", "改用邮箱登录")}
            onCta={() => setTab("email")}
          />
        ) : stage === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              {t("Email", "邮箱")}
            </label>
            <div className="flex items-center gap-2 rounded-sm border border-border bg-background/60 px-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? t("Sending…", "发送中…") : t("Send me a code", "发送验证码")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-center text-xs text-muted-foreground">
              {t("New here?", "还没账号？")}{" "}
              <span className="text-primary">
                {t("Just enter your email — we'll create your account automatically.", "直接输入邮箱即可，我们会自动创建账号。")}
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              {t("Verification code", "验证码")}
            </label>
            <div className="flex items-center gap-2 rounded-sm border border-border bg-background/60 px-3">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="••••••"
                className="h-12 w-full bg-transparent text-center text-lg tracking-[0.5em] outline-none placeholder:text-muted-foreground/40"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("Verify & continue", "验证并进入")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setStage("email");
                setOtp("");
                setMsg(null);
                setErr(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("Use a different email", "更换邮箱")}
            </button>
          </form>
        )}

        {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </section>
    </main>
  );
}

function ComingSoon({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed border-border/80 bg-background/40 px-6 py-10 text-center">
      {icon}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-2 text-xs text-muted-foreground">{body}</p>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="text-xs font-medium text-primary hover:underline"
      >
        {cta}
      </button>
    </div>
  );
}