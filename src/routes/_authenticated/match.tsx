import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, ArrowRight, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/match")({
  ssr: false,
  head: () => ({ meta: [{ title: "linQ — 你的周三约会" }] }),
  component: MatchConsole,
});

const SLOTS = [
  { key: "weekend_day", label: "周末白天", sub: "10:00 – 18:00" },
  { key: "weekend_evening", label: "周末晚", sub: "18:00 – 22:00" },
  { key: "workday_evening", label: "工作日晚", sub: "19:00 – 22:00" },
  { key: "workday_lunch", label: "工作日午休", sub: "12:00 – 14:00" },
] as const;

const STORAGE_KEY = "linq.timeWindows";

function nextWednesday(): Date {
  const now = new Date();
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun .. 3 Wed
  let diff = (3 - day + 7) % 7;
  d.setHours(19, 0, 0, 0);
  if (diff === 0 && now.getHours() >= 19) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return { days, hours };
}

// Mock 本周匹配。后端 pipeline 上线后从 /api 拉。
const MOCK_MATCH: {
  id: string;
  name: string;
  age: number;
  headline: string;
  city: string;
  when: string;
  oneLine: string;
} | null = {
  id: "demo",
  name: "陈澈",
  age: 29,
  headline: "AI 创业者",
  city: "国贸",
  when: "本周六 14:00 – 16:00",
  oneLine: "你们都在国贸,都飞盘,都不喜欢寒暄。",
};

function MatchConsole() {
  const target = useMemo(() => nextWednesday(), []);
  const { days, hours } = useCountdown(target);
  const [slots, setSlots] = useState<string[]>(["weekend_day", "weekend_evening"]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlots(JSON.parse(raw));
    } catch {}
  }, []);

  const toggle = (key: string) => {
    setSlots((cur) => {
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* aurora bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-[420px] w-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-pink-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            aria-label="通知"
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-16">
        {/* 倒计时 */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            距下次周三约会推送
          </p>
          <div className="mt-6 flex items-baseline justify-center gap-3 font-display">
            <span className="text-7xl font-light text-primary tabular-nums">{days}</span>
            <span className="text-2xl text-muted-foreground">天</span>
            <span className="ml-3 text-7xl font-light text-primary tabular-nums">{hours}</span>
            <span className="text-2xl text-muted-foreground">小时</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">每周三 19:00 · AI 安排</p>
        </div>

        {/* 时间偏好 */}
        <div>
          <h2 className="font-display text-2xl">你的空闲时间</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            点亮的时段就是你能见面的时间 · 改完影响下周三
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {SLOTS.map((s) => {
              const active = slots.includes(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggle(s.key)}
                  className={`flex flex-col items-start rounded-sm border px-4 py-4 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background/40 text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="mt-1 text-xs opacity-70">{s.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 本周匹配 */}
        <div>
          <h2 className="font-display text-2xl">本周约会</h2>
          {MOCK_MATCH ? (
            <Link
              to="/date/$id"
              params={{ id: MOCK_MATCH.id }}
              className="group mt-6 block rounded-sm border border-border bg-card/60 p-6 transition-colors hover:border-primary/60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-lg font-medium">
                  {MOCK_MATCH.name} <span className="text-muted-foreground">· {MOCK_MATCH.age}</span>
                </p>
                <span className="text-xs text-muted-foreground">{MOCK_MATCH.city}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{MOCK_MATCH.headline}</p>
              <div className="mt-5 flex items-center gap-2 text-sm text-primary">
                <Calendar className="h-4 w-4" />
                {MOCK_MATCH.when}
              </div>
              <p className="mt-3 font-display text-base leading-relaxed text-foreground">
                {MOCK_MATCH.oneLine}
              </p>
              <div className="mt-6 flex items-center gap-1 text-xs font-medium text-primary">
                查看完整方案
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ) : (
            <div className="mt-6 rounded-sm border border-dashed border-border/60 bg-background/40 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">本周还没匹配 · 周三 19:00 见</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}