import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Legal</p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight text-gold-glow md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        <article className="prose prose-invert mt-10 max-w-none text-[15px] leading-[1.8] text-foreground/90 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mt-4 [&_p]:text-muted-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted-foreground [&_li]:mt-1 [&_a]:text-primary [&_a:hover]:underline">
          {children}
        </article>
        <div className="mt-16 border-t border-border/60 pt-8 text-sm text-muted-foreground">
          Questions? Email{" "}
          <a href="mailto:cheng@cttcable.com" className="text-primary hover:underline">
            cheng@cttcable.com
          </a>
          .
        </div>
      </main>
    </div>
  );
}