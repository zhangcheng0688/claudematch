import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Minus, Headphones } from "lucide-react";
import moment1 from "@/assets/moment-1.jpg";
import moment2 from "@/assets/moment-2.jpg";
import moment3 from "@/assets/moment-3.jpg";
import moment4 from "@/assets/moment-4.jpg";
import moment5 from "@/assets/moment-5.jpg";
import moment6 from "@/assets/moment-6.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "linQ — The Claude-native matching platform" },
      { name: "description", content: "AI-powered matching for work, love, and life. Business, dating, and local friends — one AI connection covers them all." },
      { property: "og:title", content: "linQ — The AI-native matching platform" },
      { property: "og:description", content: "AI-powered matching for work, love, and life." },
    ],
  }),
  component: Index,
});

function Nav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#" className="text-lg font-semibold tracking-tight">
          lin<span className="font-display text-primary text-2xl align-middle">Q</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#values" className="transition-colors hover:text-foreground">Why linQ</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <a href="#moments" className="transition-colors hover:text-foreground">Moments</a>
          <a href="#compare" className="transition-colors hover:text-foreground">Compare</a>
          <a href="#trust" className="transition-colors hover:text-foreground">Trust</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#support"
            className="hidden md:inline-flex h-9 items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Headphones className="h-3.5 w-3.5" />
            24/7 Support
          </a>
          <a
            href="#cta"
            className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative border-b border-border/60 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 py-28 md:py-40">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            The Claude-native matching platform
          </div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            <span className="text-gold-glow">Claude-powered</span>{" "}
            <span className="font-display text-gold-glow">connections</span>
            <br />
            for <span className="font-display text-gold-glow">work</span>,{" "}
            <span className="font-display text-gold-glow">love</span>,{" "}
            <span className="font-display text-gold-glow">life</span>.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl leading-relaxed text-muted-foreground md:text-lg text-base whitespace-pre-line">
            Less effort, more meaningful links.{"\n"}Business partners, dating, local friends —
            one AI connection covers them all. No forms. No tags. Just the real you.
          </p>
          <div className="mt-12 flex items-center justify-center">
            <a
              href="#cta"
              className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-7 text-sm font-medium text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.85_0.17_90/0.55)] transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const values = [
  {
    title: "Effortless AI profile",
    body: "No forms, no tags. AI quietly learns who you really are from the way you act — not the way you self-describe.",
  },
  {
    title: "Three scenarios, one platform",
    body: "Business collaboration, dating, and local companions. One account covers every kind of human connection you need.",
  },
  {
    title: "AI meeting co-pilot",
    body: "From match to meet-up — linQ plans the entire encounter. No awkward chats, no flaked plans, just real-world results.",
  },
];

function Values() {
  return (
    <section id="values" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Why linQ</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            A new kind of matching, built on real behavior.
          </h2>
        </div>
        <div className="mt-16 grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-3">
          {values.map((v, i) => (
            <div key={i} className="bg-background p-8 md:p-10">
              <div className="text-sm font-medium text-primary">0{i + 1}</div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">{v.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    n: "01",
    title: "Sign up & authorize",
    body: "Register and grant scenario-level permissions. Privacy stays in your control from day one.",
  },
  {
    n: "02",
    title: "AI profile builds",
    body: "Behavioral signals are analyzed silently. A multi-dimensional profile of the real you is generated.",
  },
  {
    n: "03",
    title: "Smart matching",
    body: "AI dynamically weights each scenario and surfaces the highest-fit people for what you need now.",
  },
  {
    n: "04",
    title: "Meet with AI plan",
    body: "Get a full meet-up plan — time, place, ice-breakers. Just show up. linQ handles the rest.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            From sign-up to sitting across the table.
          </h2>
        </div>
        <div className="mt-16 grid gap-12 md:grid-cols-4 md:gap-8">
          {steps.map((s) => (
            <div key={s.n}>
              <div className="text-sm font-medium text-primary">{s.n}</div>
              <div className="mt-4 h-px w-full bg-border" />
              <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const compareRows = [
  ["Profile building", "Tinder / Hinge — endless swiping & curated personas", "Effortless Claude-powered behavioral profile"],
  ["Authenticity", "RedNote · Coffee Chat — performative posts & filtered selves", "Honest signals from how you actually behave"],
  ["Onboarding", "RedNote / WeChat — fill bio, tags, MBTI, hobbies, photos, voice intro…", "Zero forms. Claude reads your real behavior."],
  ["Getting a reply", "WeChat — add friend, wait for accept, send 50 messages, maybe meet", "One tap. AI sends a ready-to-go invite to both sides."],
  ["Scenarios", "Siloed apps: LinkedIn for work, Hinge for love, Meetup for friends", "Business, dating & local — one unified graph"],
  ["Effort to meet", "Match, then 100+ messages of small talk", "AI plans the meet-up. Just show up."],
  ["Outcome", "Ghosting, flakes, and dead chats", "Real-world dates, deals, and friendships"],
];

function Compare() {
  return (
    <section id="compare" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Compare</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Why linQ beats traditional matching.
          </h2>
        </div>
        <div className="mt-16 overflow-hidden rounded-sm border border-border">
          <div className="grid grid-cols-3 border-b border-border bg-secondary/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="p-5"></div>
            <div className="p-5">Traditional platforms</div>
            <div className="p-5 text-foreground">linQ</div>
          </div>
          {compareRows.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 text-sm ${i !== compareRows.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="p-5 font-medium">{row[0]}</div>
              <div className="flex items-start gap-2 p-5 text-muted-foreground">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                <span>{row[1]}</span>
              </div>
              <div className="flex items-start gap-2 p-5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{row[2]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const trust = [
  {
    title: "Three-tier privacy",
    body: "Granular authorization with physically isolated data layers across scenarios.",
  },
  {
    title: "No data misuse",
    body: "Nothing is sold. Nothing is force-collected. Compliance is the floor, not the goal.",
  },
  {
    title: "Explainable AI",
    body: "Every match comes with reasoning. Fair, auditable, and accountable by design.",
  },
];

function Trust() {
  return (
    <section id="trust" className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Trust & Compliance</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            Privacy is the product.
          </h2>
        </div>
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {trust.map((t, i) => (
            <div key={i} className="border-t border-foreground pt-6">
              <h3 className="text-lg font-semibold tracking-tight">{t.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="cta" className="border-b border-border/60">
      <div className="mx-auto max-w-5xl px-6 py-28 text-center md:py-40">
        <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
          <span className="text-gold-glow">Start</span>{" "}
          <span className="font-display text-gold-glow">matching</span>.
          <br />
          <span className="text-muted-foreground">For real this time.</span>
        </h2>
        <div className="mt-12 flex items-center justify-center">
          <a
            href="#"
            className="group inline-flex h-12 items-center gap-2 rounded-sm bg-primary px-7 text-sm font-medium text-primary-foreground shadow-[0_8px_40px_-8px_oklch(0.85_0.17_90/0.55)] transition-colors hover:bg-primary/90"
          >
            Start Matching
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

const moments = [
  { src: moment1, name: "Leo & Maya", tag: "Coffee Chat · SF", quote: "AI nailed our vibe. Two hours flew by.", rotate: "-rotate-3" },
  { src: moment2, name: "Jay & Priya", tag: "Rooftop · NYC", quote: "Way better than juggling 10 Hinge chats.", rotate: "rotate-2" },
  { src: moment3, name: "Founders Dinner", tag: "Business · Shanghai", quote: "Met my co-founder on linQ. Closed seed in 6 weeks.", rotate: "-rotate-2" },
  { src: moment4, name: "Alex & Jordan", tag: "Partnership · London", quote: "Skipped 20 LinkedIn DMs. Just met. Just clicked.", rotate: "rotate-1" },
  { src: moment5, name: "Mia & Daniel", tag: "First Date · Tokyo", quote: "AI picked the place. We picked each other.", rotate: "-rotate-1" },
  { src: moment6, name: "Game Night Crew", tag: "Local Friends · Austin", quote: "Found my Sunday people in one tap.", rotate: "rotate-3" },
];

function Moments() {
  const loop = [...moments, ...moments];
  return (
    <section id="moments" className="border-b border-border/60">
      <div className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Moments</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            <span className="font-display text-gold-glow">Unforgettable</span> great times.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            Real people. Real meet-ups. Curated by Claude, lived by you.
          </p>
        </div>
        <div
          className="marquee-wrap mt-16 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="marquee px-6">
            {loop.map((m, i) => (
              <figure
                key={i}
                className={`polaroid ${m.rotate} w-[220px] shrink-0 md:w-[260px]`}
              >
                <img
                  src={m.src}
                  alt={`${m.name} — ${m.tag}`}
                  loading="lazy"
                  width={1024}
                  height={1024}
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="mt-3 px-1 text-left">
                  <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "oklch(0.45 0.03 260)" }}>{m.tag}</div>
                  <div className="mt-1 text-sm font-medium" style={{ color: "oklch(0.2 0.03 260)" }}>{m.name}</div>
                  <p className="mt-1 text-xs leading-snug" style={{ color: "oklch(0.35 0.03 260)" }}>"{m.quote}"</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-4">
        <div className="md:col-span-2 text-base">
          <div className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The Claude-native matching platform for business, dating, and local life.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Product</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li><a href="#values" className="text-foreground/80 hover:text-foreground">Why linQ</a></li>
            <li><a href="#how" className="text-foreground/80 hover:text-foreground">How it works</a></li>
            <li><a href="#compare" className="text-foreground/80 hover:text-foreground">Compare</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Company</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li><a href="#trust" className="text-foreground/80 hover:text-foreground">Trust</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-foreground">Privacy</a></li>
            <li><a href="#" className="text-foreground/80 hover:text-foreground">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} linQ. All rights reserved.</p>
          <p>Made for real connections.</p>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="aurora" aria-hidden="true">
        <div className="aurora-extra" />
      </div>
      <Nav />
      <main>
        <Hero />
        <Values />
        <HowItWorks />
        <Moments />
        <Compare />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
