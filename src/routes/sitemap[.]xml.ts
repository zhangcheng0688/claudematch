import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://claudematch.com";
const LOCALES = ["en", "zh", "yue"] as const;
type Locale = (typeof LOCALES)[number];

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static routes (the structural pages of the site). Each is emitted
// with hreflang alternates for the 3 locales so Google understands
// the language matrix.
const STATIC: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/auth", changefreq: "monthly", priority: "0.7" },
  { path: "/trust", changefreq: "monthly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/dpa", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildHreflangAlternates(path: string): string {
  // The current linQ app is single-page per route; we don't ship
  // /en /zh /yue path prefixes. So hreflang just points every
  // language to the same canonical URL. When (if) we add path
  // prefixes later, this is the one place to change.
  return LOCALES.map(
    (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}${path}" />`,
  ).join("\n");
}

function buildUrlBlock(e: SitemapEntry): string {
  return [
    `  <url>`,
    `    <loc>${escapeXml(BASE_URL + e.path)}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    buildHreflangAlternates(e.path),
    `  </url>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: SitemapEntry[] = [...STATIC];

        // P2-deferred 2: pull published blog posts from Supabase.
        // service-role bypasses RLS so we can read the full table
        // (the SPA-facing RLS only allows reading status='published'
        // rows, but we want to be explicit server-side too).
        try {
          const { data: posts } = await supabaseAdmin
            .from("blog_posts")
            .select("slug, locale, published_at, updated_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(500);

          for (const p of posts ?? []) {
            // We currently serve /blog/[slug] in the default locale
            // only. The other locales share the same canonical URL
            // (the SPA renders the localized content based on the
            // user's active LanguageProvider state, not the path).
            // When we add per-locale paths (/zh/blog/[slug]) this is
            // the one place to split.
            urls.push({
              path: `/blog/${p.slug}`,
              lastmod: (p.updated_at ?? p.published_at ?? new Date().toISOString()).slice(0, 10),
              changefreq: "monthly",
              priority: "0.6",
            });
          }
        } catch (e) {
          // If the table doesn't exist yet (migration not run), we
          // silently fall back to the static entries. The founder
          // dashboard will flag this via the SQL view health check
          // (future). We log the error so the dev sees it.
          console.error(
            JSON.stringify({
              at: "sitemap_blog_query_failed",
              error: e instanceof Error ? e.message : String(e),
            }),
          );
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          // xhtml namespace is required for xhtml:link elements
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
          `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls.map(buildUrlBlock),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            // 1h cache; the SPA deploys and the sitemap invalidates
            // automatically when the new version serves.
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
