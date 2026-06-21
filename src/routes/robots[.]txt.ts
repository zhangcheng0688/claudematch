import { createFileRoute } from "@tanstack/react-router";

const ROBOTS_TXT = `User-agent: *
Allow: /
Disallow: /founder
Disallow: /_authenticated/
Disallow: /api/
Disallow: /merchant/
Sitemap: https://claudematch.com/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(ROBOTS_TXT, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
