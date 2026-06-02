import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — linQ" },
      { name: "description", content: "How linQ uses cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy — linQ" },
      { property: "og:description", content: "How linQ uses cookies and similar technologies." },
      { property: "og:url", content: "https://claudematch.com/cookies" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="June 2, 2026">
      <p>
        This Cookie Policy explains how linQ uses cookies and similar technologies when you
        visit our website.
      </p>
      <h2>What are cookies?</h2>
      <p>Cookies are small text files stored on your device that help websites remember you and your preferences.</p>
      <h2>How we use cookies</h2>
      <ul>
        <li><b>Strictly necessary:</b> authentication and session management.</li>
        <li><b>Preferences:</b> remembering language and UI choices.</li>
        <li><b>Analytics:</b> understanding how the Service is used so we can improve it.</li>
      </ul>
      <h2>Your choices</h2>
      <p>Most browsers let you manage cookies through settings. Disabling cookies may affect parts of the Service. You can also withdraw consent via the cookie banner at any time.</p>
      <h2>Contact</h2>
      <p>Questions? Email cheng@cttcable.com.</p>
    </LegalLayout>
  );
}