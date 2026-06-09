import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
const faviconUrl = "/favicon.png";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            lin<span className="font-display text-primary text-2xl align-middle">Q</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">404</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight text-gold-glow md:text-7xl">
          Lost in the links?
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-[1.75] text-muted-foreground">
          The page you're looking for doesn't exist — or maybe it never did. Let's get you back on the right thread.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
            className="inline-flex h-11 items-center rounded-sm border border-border bg-background/60 px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go back
          </button>
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-sm bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "linQ — The Claude-native matching platform" },
      { name: "description", content: "AI-powered matching for work, love, and life. Business, dating, and local friends — one Claude-native connection covers them all." },
      { property: "og:site_name", content: "linQ" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "linQ — The Claude-native matching platform" },
      { property: "og:description", content: "AI-powered matching for work, love, and life." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "linQ — The Claude-native matching platform" },
       { name: "twitter:description", content: "AI-powered matching for work, love, and life." },
     ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: faviconUrl },
      { rel: "apple-touch-icon", href: faviconUrl },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "linQ",
          url: "https://claudematch.com",
          logo: `https://claudematch.com${faviconUrl}`,
          description: "The Claude-native matching platform for business, dating, and local life.",
          email: "cheng@cttcable.com",
          sameAs: [],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // P2-key-3: sync <html lang> with the active i18n language.
  // The SSR pass emits lang="en" (the default in LanguageProvider).
  // The client-side LanguageProvider reads localStorage on mount;
  // when that resolves to a non-English locale we update the <html>
  // element in a useEffect (not in render — that would hydration-
  // mismatch). suppressHydrationWarning on <html> tells React to
  // accept the post-hydration attribute change.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <HtmlLangSync />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Tiny client-only effect that keeps document.documentElement.lang
 * in sync with the active LanguageProvider state. Lives as a separate
 * component (rather than inlined in RootShell) so it gets its own
 * hook scope — without this, we'd need to call useLang in RootShell,
 * which is rendered before any LanguageProvider wraps it.
 *
 * Renders nothing.
 */
function HtmlLangSync() {
  // We import dynamically so this only runs in the browser.
  // (The LanguageProvider is per-page; we read localStorage directly
  // here because we can't rely on a provider existing at the root.)
  useEffect(() => {
    const sync = () => {
      try {
        const v = localStorage.getItem("lang") as "en" | "zh" | "yue" | null;
        let lang: "en" | "zh" | "yue" = "en";
        if (v === "en" || v === "zh" || v === "yue") {
          lang = v;
        } else if (typeof navigator !== "undefined") {
          const n = navigator.language.toLowerCase();
          if (n.startsWith("zh-hk") || n.startsWith("yue")) lang = "yue";
          else if (n.startsWith("zh")) lang = "zh";
        }
        if (document.documentElement.lang !== lang) {
          document.documentElement.lang = lang;
        }
      } catch {
        /* ignore */
      }
    };
    sync();
    // React to localStorage changes from other tabs + in-tab updates
    // (LanguageProvider writes to localStorage on every lang change).
    window.addEventListener("storage", sync);
    // Poll every 1s to catch in-tab updates without the SPA telling us
    // (cheaper than wiring a custom event just for this).
    const id = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
