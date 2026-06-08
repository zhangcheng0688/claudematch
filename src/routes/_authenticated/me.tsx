import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogOut, Bell, Globe, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me")({
  ssr: false,
  head: () => ({ meta: [{ title: "linQ — 我的" }] }),
  component: MePage,
});

const SLOTS = [
  { key: "weekend_day", label: "周末白天", sub: "10:00 – 18:00" },
  { key: "weekend_evening", label: "周末晚", sub: "18:00 – 22:00" },
  { key: "workday_evening", label: "工作日晚", sub: "19:00 – 22:00" },
  { key: "workday_lunch", label: "工作日午休", sub: "12:00 – 14:00" },
] as const;

const STORAGE_KEY = "linq.timeWindows";

function creditTier(score: number) {
  if (score >= 80) return { label: "优秀", tone: "text-primary" };
  if (score >= 60) return { label: "良好", tone: "text-emerald-400" };
  if (score >= 40) return { label: "观察", tone: "text-amber-400" };
  return { label: "冻结", tone: "text-destructive" };
}

function MePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [slots, setSlots] = useState<string[]>(["weekend_day", "weekend_evening"]);
  const [scenarios, setScenarios] = useState({ business: true, local: true, dating: true });

  // mock credit until backend is wired
  const credit = 80;
  const tier = creditTier(credit);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlots(JSON.parse(raw));
    } catch {}
  }, []);

  const toggleSlot = (k: string) => {
    setSlots((cur) => {
      const next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-0 h-[380px] w-[380px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link
            to="/match"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">我的</span>
          <div className="w-12" />
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12">
        {/* 资料卡 */}
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card text-2xl font-display text-primary">
            {(email[0] || "Q").toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-display text-xl">{email || "linQ 用户"}</p>
            <p className="mt-1 text-xs text-muted-foreground">北京 · 默认场景:三个均开放</p>
          </div>
        </div>

        {/* 信用分 */}
        <div className="rounded-sm border border-border bg-card/40 px-6 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">信用分</p>
          <div className="mt-3 flex items-baseline gap-4">
            <span className={`font-display text-6xl font-light tabular-nums ${tier.tone}`}>
              {credit}
            </span>
            <span className={`text-sm ${tier.tone}`}>{tier.label}</span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            初始 80 · 到场 +5 · 好评 +3 · 反馈 +2 · 取消 -20 · 爽约 -20 · 跌破 40 冻结一周。
          </p>
        </div>

        {/* 时间偏好 */}
        <div>
          <h2 className="font-display text-2xl">空闲时间</h2>
          <p className="mt-2 text-sm text-muted-foreground">改完影响下周三匹配</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {SLOTS.map((s) => {
              const active = slots.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSlot(s.key)}
                  className={`flex flex-col items-start rounded-sm border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="mt-1 text-xs opacity-70">{s.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 场景开关 */}
        <div>
          <h2 className="font-display text-2xl">场景</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            三个世界数据物理隔离 · 关掉某个场景就不会再匹配
          </p>
          <div className="mt-5 space-y-2">
            {([
              { key: "business", label: "商务", desc: "找搭档、找客户、找合作" },
              { key: "local", label: "同城搭子", desc: "找一起飞盘、看展、吃饭的人" },
              { key: "dating", label: "恋爱", desc: "找认真的另一半" },
            ] as const).map((it) => {
              const on = scenarios[it.key];
              return (
                <div
                  key={it.key}
                  className="flex items-center justify-between rounded-sm border border-border bg-background/40 px-5 py-4"
                >
                  <div>
                    <p className="text-sm font-medium">{it.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScenarios((s) => ({ ...s, [it.key]: !on }))}
                    aria-pressed={on}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      on ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${
                        on ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 设置入口 */}
        <div>
          <h2 className="font-display text-2xl">设置</h2>
          <div className="mt-5 divide-y divide-border/60 rounded-sm border border-border bg-background/40">
            <Row icon={<Bell className="h-4 w-4" />} label="通知" />
            <Row icon={<Globe className="h-4 w-4" />} label="语言" />
            <Row icon={<ShieldCheck className="h-4 w-4" />} label="账号与隐私" />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm text-destructive hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      {label}
      <span className="ml-auto text-xs text-muted-foreground">即将开放</span>
    </div>
  );
}