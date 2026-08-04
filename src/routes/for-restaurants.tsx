import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, MapPin, Store, Users } from "lucide-react";

export const Route = createFileRoute("/for-restaurants")({
  head: () => ({
    meta: [
      { title: "餐厅合作 — linQ｜每周三，把真实的约会带到你的店里" },
      {
        name: "description",
        content:
          "linQ 每周三晚为匹配成功的用户订好餐厅。首期开放深圳与香港，前 20 家签约餐厅获得联合曝光资源。",
      },
      { property: "og:title", content: "餐厅合作 — linQ" },
      {
        property: "og:description",
        content: "每周三，把真实的约会带到你的店里。深圳 · 香港，首期 20 家。",
      },
      { property: "og:url", content: "https://claudematch.com/for-restaurants" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/for-restaurants" }],
  }),
  component: ForRestaurantsPage,
});

const CONTACT =
  "mailto:zhangcheng0688@gmail.com?subject=linQ%20%E9%A4%90%E5%8E%85%E5%90%88%E4%BD%9C&body=%E9%A4%90%E5%8E%85%E5%90%8D%E7%A7%B0%EF%BC%9A%0A%E6%89%80%E5%9C%A8%E5%9F%8E%E5%B8%82%2F%E5%95%86%E5%9C%88%EF%BC%9A%0A%E8%81%94%E7%B3%BB%E4%BA%BA%2F%E7%94%B5%E8%AF%9D%EF%BC%9A%0A%E5%A4%87%E6%B3%A8%EF%BC%9A";

function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← 回到首页
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
              <Store className="h-3.5 w-3.5 text-primary" />
              餐厅合作 · 深圳 / 香港 · 首期 20 家
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
              每周三，
              <span className="text-gold-glow font-display">把真实的约会</span>
              <br />
              带到你的店里。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
              linQ 是深圳与香港的 AI 婚恋匹配平台。每周三晚 7 点，我们为匹配成功的用户
              安排好完整约会方案 —— 包括一家真实的餐厅。你的店，可以成为那个「第一次见面的地方」。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href={CONTACT}
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary px-7 text-sm font-medium text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.85_0.17_90/0.55)] transition-colors hover:bg-primary/90"
              >
                申请成为合作餐厅
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border px-7 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
              >
                先看看怎么运作
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Pain point */}
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                为什么是你
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
                周三晚市的空桌，
                <br />
                我们来填。
              </h2>
            </div>
            <div className="space-y-4 text-[15px] leading-[1.8] text-muted-foreground">
              <p>
                周中晚市是餐饮最难做的时段：周末排队，周三空桌。而约会恰好是
                最适合周中的消费场景 —— 不拼桌、不赶时间、客单价高、还爱拍照发圈。
              </p>
              <p>
                linQ 的匹配节奏固定在每周三晚。对用户，这是一场期待已久的第一次见面；
                对你，这是可预期的、每周准时报到的双人客流。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            怎么运作
          </p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
            四步，从匹配到到店。
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-4 md:gap-8">
            {[
              {
                n: "01",
                icon: Users,
                title: "用户匹配成功",
                body: "每周三，AI 为用户匹配约会对象，双方确认赴约。",
              },
              {
                n: "02",
                icon: MapPin,
                title: "系统选定餐厅",
                body: "根据双方位置、口味与氛围偏好，从合作餐厅中选定一家。",
              },
              {
                n: "03",
                icon: CalendarCheck,
                title: "订位与到店",
                body: "约会方案写清时间与人数，用户按约到店，你按常接待。",
              },
              {
                n: "04",
                icon: Store,
                title: "核销与复盘",
                body: "简单的到店核销，每月一份到店数据复盘给你。",
              },
            ].map((s) => (
              <div key={s.n}>
                <div className="flex items-center gap-3 text-sm font-medium text-primary">
                  <s.icon className="h-4 w-4" />
                  {s.n}
                </div>
                <div className="mt-4 h-px w-full bg-border" />
                <h3 className="mt-5 text-lg font-semibold leading-snug tracking-tight">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you give / get */}
      <section className="border-b border-border/60 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
            <div className="bg-background p-8 md:p-12">
              <h2 className="text-2xl font-semibold tracking-tight">你需要做什么</h2>
              <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  周三晚市为 linQ 约会保留少量双人位（数量你定）。
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  配合一次简单的到店核销（扫码或报暗号，10 秒）。
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  保持你一贯的水准就好 —— 第一次见面的人，会记住这家店的氛围。
                </li>
              </ul>
            </div>
            <div className="bg-background p-8 md:p-12">
              <h2 className="text-2xl font-semibold tracking-tight">你能得到什么</h2>
              <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  每周三可预期的双人新客，天然的周中填谷客流。
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  「linQ 约会指定餐厅」联名曝光：App 内推荐位 + 官方内容露出。
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  高质量的口碑场景 —— 第一次约会成功的店，会变成「他们的店」。
                </li>
                <li className="flex gap-3">
                  <span className="text-primary">—</span>
                  首期 20 家签约餐厅：优先选位权与联合营销资源倾斜。
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Cities + CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            首期开放：
            <span className="text-gold-glow font-display">深圳 · 香港</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            深圳（南山 / 福田 / 前海优先）与香港（中环 / 尖沙咀优先）。
            名额按商圈分批释放，先发邮件，我们先聊。
          </p>
          <div className="mt-10 flex items-center justify-center">
            <a
              href={CONTACT}
              className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-7 text-sm font-medium text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.85_0.17_90/0.55)] transition-colors hover:bg-primary/90"
            >
              申请成为合作餐厅
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            或直接写信：zhangcheng0688@gmail.com（标题注明「餐厅合作」）
          </p>
        </div>
      </section>
    </div>
  );
}
