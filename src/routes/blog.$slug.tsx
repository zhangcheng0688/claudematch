import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LanguageProvider, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://claudematch.com";

type Post = {
  slug: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body: string;
  author: string | null;
  published_at: string | null;
};

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [{ title: "linQ 笔记" }],
  }),
  component: () => (
    <LanguageProvider>
      <PostPage />
    </LanguageProvider>
  ),
});

/**
 * Minimal markdown-ish renderer. Bodies are written by the team with a
 * constrained syntax: paragraphs separated by blank lines, "## "/"### "
 * headings, "- " bullet lists, "**bold**" inline. Anything else renders
 * as a plain paragraph — no raw HTML is ever injected.
 */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function Body({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <article className="mt-10 max-w-none text-[15px] leading-[1.85] text-foreground/90">
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-8 text-base font-semibold text-foreground">
              {renderInline(b.slice(4))}
            </h3>
          );
        }
        if (b.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-10 text-xl font-semibold text-foreground">
              {renderInline(b.slice(3))}
            </h2>
          );
        }
        if (b.split("\n").every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={i} className="mt-4 list-disc pl-6 text-muted-foreground">
              {b.split("\n").map((l, j) => (
                <li key={j} className="mt-1.5">
                  {renderInline(l.trim().slice(2))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-4 text-muted-foreground">
            {renderInline(b)}
          </p>
        );
      })}
    </article>
  );
}

function PostPage() {
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    setState("loading");
    supabase
      .from("blog_posts")
      .select("slug, locale, title, excerpt, body, author, published_at")
      .eq("slug", slug)
      .eq("status", "published")
      .then(({ data }) => {
        const rows = (data as Post[] | null) ?? [];
        const pick =
          rows.find((r) => r.locale === lang) ??
          rows.find((r) => r.locale === "zh") ??
          rows[0] ??
          null;
        setPost(pick);
        setState(pick ? "ok" : "missing");
        if (pick) document.title = `${pick.title} — linQ 笔记`;
      });
  }, [slug, lang]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 笔记
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {state === "loading" && (
          <div className="flex justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {state === "missing" && (
          <div className="py-24 text-center">
            <p className="text-muted-foreground">这篇文章不存在或尚未发布。</p>
            <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">
              返回笔记列表
            </Link>
          </div>
        )}
        {state === "ok" && post && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              {post.author ?? "linQ"}
              {post.published_at ? ` · ${post.published_at.slice(0, 10)}` : ""}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight text-gold-glow md:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
            )}
            <Body body={post.body} />
            <div className="mt-16 border-t border-border/60 pt-8 text-sm text-muted-foreground">
              想每周三收到一个真实的约会？{" "}
              <Link to="/auth" className="text-primary hover:underline">
                加入 linQ
              </Link>{" "}
              · <Link to="/blog" className="text-primary hover:underline">更多笔记</Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
