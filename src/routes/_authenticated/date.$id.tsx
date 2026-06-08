import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/date/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "linQ — 本周约会" }] }),
  component: DatePage,
});

const SLOTS = [
  { key: "weekend_day", label: "周末白天", sub: "10:00 – 18:00" },
  { key: "weekend_evening", label: "周末晚", sub: "18:00 – 22:00" },
  { key: "workday_evening", label: "工作日晚", sub: "19:00 – 22:00" },
  { key: "workday_lunch", label: "工作日午休", sub: "12:00 – 14:00" },
] as const;

// Mock 数据,后端 pipeline 上线后从 /api/match/:id 拉
const MOCK = {
  name: "陈澈",
  age: 29,
  headline: "AI 创业者 · 前字节产品",
  city: "国贸",
  scenario: "dating",
  oneLine: "你们都在国贸,都飞盘,都不喜欢寒暄。",
  plan: {
    time: "本周六 14:00 – 16:00",
    venue: "%Arabica 国贸店",
    address: "朝阳区建国门外大街 1 号国贸商城 B2",
    dress: "smart casual · 不用刻意正式",
    icebreakers: [
      "「最近在搞什么不务正业的事?」",
      "「上次飞盘是什么时候?」",
      "聊聊国贸最近开了什么新店",
    ],
    pitfalls: ["别一上来就聊工作 KPI", "TA 不太喜欢被问『以前在哪上班』"],
  },
};

type Status = "pending" | "confirmed" | "rescheduled" | "cancelled";

function DatePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("pending");
  const [showDetail, setShowDetail] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [pickedSlot, setPickedSlot] = useState<string>("weekend_day");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-[380px] w-[380px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-pink-400/10 blur-3xl" />
      </div>

      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
          <Link
            to="/match"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            本周约会
          </span>
          <div className="w-12" />
        </div>
      </header>

      <section className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
        {/* 对方 1 行 */}
        <div className="text-center">
          <p className="text-2xl font-medium">
            {MOCK.name} <span className="text-muted-foreground font-light">· {MOCK.age}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {MOCK.headline} · {MOCK.city}
          </p>
        </div>

        {/* 1 句契合 */}
        <blockquote className="rounded-sm border-l-2 border-primary/60 bg-card/40 px-6 py-6">
          <p className="font-display text-2xl leading-snug">
            <span className="text-gold-glow">{MOCK.oneLine}</span>
          </p>
        </blockquote>

        {/* 见面详情(折叠) */}
        <div className="rounded-sm border border-border bg-background/40">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-card/40"
          >
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              见面详情
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showDetail ? "rotate-180" : ""}`}
            />
          </button>
          {showDetail && (
            <div className="space-y-5 border-t border-border/60 px-5 py-5 text-sm">
              <Detail icon={<Calendar className="h-4 w-4" />} label="时间">
                {MOCK.plan.time}
              </Detail>
              <Detail icon={<MapPin className="h-4 w-4" />} label="地点">
                <p>{MOCK.plan.venue}</p>
                <p className="text-xs text-muted-foreground">{MOCK.plan.address}</p>
              </Detail>
              <Detail icon={<Shirt className="h-4 w-4" />} label="着装">
                {MOCK.plan.dress}
              </Detail>
              <Detail icon={<Clock className="h-4 w-4" />} label="破冰话题">
                <ul className="space-y-1.5 text-muted-foreground">
                  {MOCK.plan.icebreakers.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </Detail>
              <Detail icon={<X className="h-4 w-4" />} label="避坑">
                <ul className="space-y-1.5 text-muted-foreground">
                  {MOCK.plan.pitfalls.map((s, i) => (
                    <li key={i}>· {s}</li>
                  ))}
                </ul>
              </Detail>
            </div>
          )}
        </div>

        {/* 3 按钮 */}
        {status === "pending" && (
          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStatus("confirmed")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              确认
            </button>
            <button
              type="button"
              onClick={() => setReschedOpen(true)}
              className="h-12 rounded-sm border border-border bg-background/40 text-sm hover:border-border/80"
            >
              改时间
            </button>
            <button
              type="button"
              onClick={() => setCancelStep(1)}
              className="h-10 text-xs text-muted-foreground hover:text-destructive"
            >
              无法赴约
            </button>
          </div>
        )}

        {status === "confirmed" && (
          <StatusBanner
            tone="primary"
            title="已确认"
            body="我们会在约会前 1 天 + 3 小时提醒你 · 别让 TA 等。"
          />
        )}
        {status === "rescheduled" && (
          <StatusBanner
            tone="primary"
            title="时间已更新"
            body="新时间已推送给对方 · 不需要对方再确认。"
          />
        )}
        {status === "cancelled" && (
          <StatusBanner
            tone="muted"
            title="本周已取消"
            body="信用分 -20 · 下周三 19:00 再见。"
          />
        )}
      </section>

      {/* 改时间弹窗 */}
      {reschedOpen && (
        <Modal onClose={() => setReschedOpen(false)}>
          <h3 className="font-display text-xl">改成哪个时段?</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            单场约会只有 1 次改时间机会 · 选完直接推送给对方
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setPickedSlot(s.key)}
                className={`rounded-sm border px-3 py-3 text-left text-sm transition-colors ${
                  pickedSlot === s.key
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="mt-0.5 text-xs opacity-70">{s.sub}</div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setReschedOpen(false)}
              className="h-11 flex-1 rounded-sm border border-border text-sm text-muted-foreground hover:text-foreground"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                setReschedOpen(false);
                setStatus("rescheduled");
              }}
              className="h-11 flex-1 rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              推送给对方
            </button>
          </div>
        </Modal>
      )}

      {/* 取消挽留弹窗 */}
      {cancelStep === 1 && (
        <Modal onClose={() => setCancelStep(0)}>
          <div className="text-center">
            <div className="text-5xl">🤔</div>
            <h3 className="mt-4 font-display text-xl">这周就没了</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              TA 已经为你空出这个时间 · 取消后本周就跳过了
            </p>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setCancelStep(0)}
              className="h-11 flex-1 rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              再想想
            </button>
            <button
              type="button"
              onClick={() => setCancelStep(2)}
              className="h-11 flex-1 rounded-sm border border-border text-sm text-muted-foreground hover:text-destructive"
            >
              还是要取消
            </button>
          </div>
        </Modal>
      )}
      {cancelStep === 2 && (
        <Modal onClose={() => setCancelStep(0)}>
          <div className="text-center">
            <div className="text-5xl">😔</div>
            <h3 className="mt-4 font-display text-xl">真的取消吗</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              信用分 -20 · 信用低会影响下周的匹配
            </p>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setCancelStep(0)}
              className="h-11 flex-1 rounded-sm bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              回去
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelStep(0);
                setStatus("cancelled");
              }}
              className="h-11 flex-1 rounded-sm border border-destructive/60 text-sm text-destructive hover:bg-destructive/10"
            >
              确认取消 (-20)
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function StatusBanner({
  tone,
  title,
  body,
}: {
  tone: "primary" | "muted";
  title: string;
  body: string;
}) {
  return (
    <div
      className={`rounded-sm border px-5 py-5 text-center ${
        tone === "primary"
          ? "border-primary/40 bg-primary/10"
          : "border-border bg-background/40"
      }`}
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-lg border border-border bg-card p-6 shadow-2xl sm:rounded-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}