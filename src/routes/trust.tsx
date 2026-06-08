import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Safety — linQ" },
      { name: "description", content: "How linQ protects your privacy and keeps the matching experience safe." },
      { property: "og:title", content: "Trust & Safety — linQ" },
      { property: "og:description", content: "How linQ protects your privacy and keeps the matching experience safe." },
      { property: "og:url", content: "https://claudematch.com/trust" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/trust" }],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <LegalLayout title="Trust & Safety" updated="June 2, 2026">
      <p>
        Privacy is the product. linQ is built so the platform sees less about you over time,
        not more. Here is how we keep your data, your matches, and your meet-ups safe.
      </p>
      <h2>Data minimization</h2>
      <p>We collect only what we need to generate your AI profile and to introduce you to a real, mutually-authorized counterpart. No social-graph scraping, no shadow profiles.</p>
      <h2>Security architecture</h2>
      <ul>
        <li>End-to-end TLS encryption for every request.</li>
        <li>Row-level security on every table in our database — your records are scoped to your account by default.</li>
        <li>Service-role keys live only on the server. Browser code uses publishable keys with RLS enforced.</li>
        <li>Webhook signatures verified for every external callback.</li>
      </ul>
      <h2>Three worlds, fully isolated</h2>
      <p>Business, dating, and local data are physically separated. What you do in one never bleeds into another. Always.</p>
      <h2>Safe meet-ups</h2>
      <p>Every AI-generated meeting plan recommends public venues, a suggested duration, dress code guidance, and a "what to avoid" section. We never share contact details — communication runs through linQ until both sides consent.</p>
      <h2>Your rights</h2>
      <p>Access, export, correct, or delete your data at any time. See our{" "}
        <Link to="/privacy">Privacy Policy</Link> for the full list and how to exercise them.
      </p>
      <h2>Report abuse</h2>
      <p>Concerned about a match or a meet-up? Email cheng@cttcable.com. We investigate every report.</p>
    </LegalLayout>
  );
}