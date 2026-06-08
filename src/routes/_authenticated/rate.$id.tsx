import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rate/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "linQ — 这次约会如何?" }] }),
  component: RatePage,
});

const OPTIONS = [
  { emoji: "😕", label: "不太合适", value: 1 },
  { emoji: "🙂", label: "一般般", value: 2 },
  { emoji: "😊", label: "还不错", value: 3 },
  { emoji: "😄", label: "挺好", value: 4 },
  { emoji: "🤩", label: "超棒", value: 5 },
];

function RatePage() {
  const navigate = useNavigate();
  const [picked, setPicked] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (picked == null) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setDone(true);
    setTimeout(() => navigate({ to: "/match", replace: true }), 900);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 right-1/3 h-[360px] w-[360px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-6">
          <Link
            to="/match"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-xl flex-col gap-10 px-6 py-16">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">本次评分</p>
          <h1 className="mt-4 font-display text-3xl leading-tight">这次约会如何?</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            你的反馈只用来训练下周更准的匹配 · 对方看不到具体分数
          </p>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {OPTIONS.map((o) => {
            const active = picked === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setPicked(o.value)}
                className={`flex flex-col items-center gap-2 rounded-sm border px-2 py-5 transition-all ${
                  active
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border bg-background/40 text-muted-foreground hover:border-border/80"
                }`}
              >
                <span className="text-4xl">{o.emoji}</span>
                <span className={`text-xs ${active ? "text-foreground" : ""}`}>{o.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            想多说一句?(可选)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 100))}
            rows={3}
            placeholder="比如:聊得很轻松,但下次想换个安静点的地方"
            className="mt-3 w-full resize-none rounded-sm border border-border bg-background/60 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/60"
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground/60">{comment.length}/100</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={picked == null || submitting || done}
            onClick={submit}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {done ? "已收到 · 谢谢" : "提交"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/match", replace: true })}
            className="h-10 text-xs text-muted-foreground hover:text-foreground"
          >
            跳过
          </button>
        </div>
      </section>
    </main>
  );
}