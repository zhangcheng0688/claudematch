import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://claudematch.com";
const LOCALES = ["en", "zh", "yue"] as const;
type Locale = (typeof LOCALES)[number];

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// Static routes (the structural pages of the site). P2-key-2: each
// is emitted with hreflang alternates for the 3 locales so Google
// understands the language matrix.
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
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}${path}" />`,
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
        // Build the URL list. Future: read blog posts from Supabase
        // (the `posts` table once it exists) and append them here. For
        // now, /blog itself is in STATIC and we list the 3 sample posts
        // from src/routes/blog.tsx as a static placeholder. When the
        // posts table is added (P1 work), swap the import for a real
        // supabaseAdmin query.
        const urls: SitemapEntry[] = [...STATIC];
        const blogPosts = [
          { slug: "ai-matching-vs-tinder", lastmod: "2026-06-08" },
          { slug: "behavioral-profile-honest", lastmod: "2026-06-08" },
          { slug: "date-night-restaurant-guide-shanghai", lastmod: "2026-06-08" },
        ];
        for (const p of blogPosts) {
          urls.push({
            path: `/blog/${p.slug}`,
            lastmod: p.lastmod,
            changefreq: "monthly",
            priority: "0.6",
          });
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
