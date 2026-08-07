import { createFileRoute, Link } from "@tanstack/react-router";
import { delay, revealDelay, useReveal } from "@/lib/reveal";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "理念 Manifesto — linQ" },
      {
        name: "description",
        content:
          "我们为什么做 linQ：不滑动、不表演、不放鸽子。每周三，在深圳或香港，约一场真实的见面。",
      },
      { property: "og:title", content: "理念 Manifesto — linQ" },
      {
        property: "og:description",
        content: "不滑动、不表演、不放鸽子。每周三，约一场真实的见面。",
      },
      { property: "og:url", content: "https://claudematch.com/manifesto" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/manifesto" }],
  }),
  component: ManifestoPage,
});

function ManifestoPage() {
  useReveal();
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
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p
          className="animate-blur-fade-up text-xs font-medium uppercase tracking-[0.18em] text-primary"
          style={delay(100)}
        >
          Manifesto
        </p>
        <h1
          className="animate-blur-fade-up mt-3 font-display text-4xl leading-tight tracking-tight text-gold-glow md:text-5xl"
          style={delay(220)}
        >
          见面，胜过一百条消息。
        </h1>
        <article className="prose prose-invert mt-10 max-w-none text-[15px] leading-[1.8] text-foreground/90 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-4 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-1 [&_a]:text-primary [&_a:hover]:underline">
          <p data-reveal>
            我们做 linQ，是因为厌倦了两件事：在屏幕上无休止地滑动，和在聊天框里慢慢聊死。
            现代社交软件把「认识一个人」变成了一场表演 —— 精修的照片、包装的简介、
            斟酌再三才发出的开场白。你越努力展示，越不像你自己。
          </p>
          <h2 data-reveal>我们相信什么</h2>
          <ul data-reveal style={revealDelay(90)}>
            <li>真实的关系发生在真实的空间里：一张桌子，两杯咖啡，一个小时。</li>
            <li>了解一个人最快的方式不是看他的资料，而是坐下来和他聊一次。</li>
            <li>AI 的价值不是替你聊天，而是帮你省去一百条寒暄，直接到见面的那一步。</li>
            <li>承诺要具体：不是「回头约」，而是「每周三晚 7 点」。</li>
          </ul>
          <h2 data-reveal>我们怎么做</h2>
          <p data-reveal style={revealDelay(90)}>
            你跟 AI 聊 5 分钟 —— 不填表、不贴标签。它从你的表达里读懂你是谁。
            每周三晚 7 点，你收到一个匹配、一份完整的见面方案：时间、一家真实的餐厅、
            破冰话题，以及为什么是你们俩的推荐理由。你只管赴约。
          </p>
          <p data-reveal style={revealDelay(140)}>
            首期，我们只开放深圳和香港。把两座城做透，再谈其他。
          </p>
          <h2 data-reveal>我们的诚实原则</h2>
          <ul data-reveal style={revealDelay(90)}>
            <li>不用假数字。用户还少的时候，我们展示机制，不展示编造的繁荣。</li>
            <li>不用假好评。你看到的每一条匹配理由都是引擎真实的输出格式，并明确标注为示例。</li>
            <li>
              冷启动阶段，平台内置 AI 练习账号帮你熟悉流程 —— 它们会被明确标注，绝不伪装成真人。
            </li>
            <li>你的数据是你的。分级授权，随时撤回，绝不出售。</li>
          </ul>
          <h2 data-reveal>之后</h2>
          <p data-reveal style={revealDelay(90)}>
            婚恋是第一件事，不是唯一的事。商务合作与本地伙伴场景已在产品里就绪，
            会在深圳和香港跑通之后开放。一次真实的见面，能开启的不只是爱情。
          </p>
          <p className="mt-10" data-reveal style={revealDelay(140)}>
            <Link to="/">回到首页</Link> · <Link to="/trust">信任与安全</Link> ·{" "}
            <Link to="/for-restaurants">餐厅合作</Link>
          </p>
        </article>
        <div
          className="mt-16 border-t border-border/60 pt-8 text-sm text-muted-foreground"
          data-reveal
        >
          有问题？写信给{" "}
          <a href="mailto:zhangcheng0688@gmail.com" className="text-primary hover:underline">
            zhangcheng0688@gmail.com
          </a>
          。
        </div>
      </main>
    </div>
  );
}
