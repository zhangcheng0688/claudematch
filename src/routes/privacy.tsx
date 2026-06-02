import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — linQ" },
      { name: "description", content: "How linQ collects, uses, and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — linQ" },
      { property: "og:description", content: "How linQ collects, uses, and protects your personal information." },
      { property: "og:url", content: "https://claudematch.com/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 2, 2026">
      <p>
        This Privacy Policy explains how linQ Labs Inc. ("linQ", "we", "us") collects,
        uses, discloses, and protects your personal information when you use our Service.
      </p>
      <h2>1. Information we collect</h2>
      <ul>
        <li><b>Account data:</b> email address and authentication metadata.</li>
        <li><b>Profile data:</b> the answers, preferences, and signals you submit for matching.</li>
        <li><b>Usage data:</b> device, browser, IP address, and product interactions.</li>
        <li><b>Communications:</b> messages you send to support or to other users via linQ.</li>
      </ul>
      <h2>2. How we use it</h2>
      <ul>
        <li>To create AI-generated profiles and match you with other users.</li>
        <li>To send transactional emails (verification codes, match notifications, meeting plans).</li>
        <li>To improve the Service, ensure safety, and prevent abuse.</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <h2>3. Sharing</h2>
      <p>We share limited profile information with the user you are matched with. We use trusted infrastructure providers (cloud hosting, email delivery, AI inference) under contractual safeguards. We do not sell your personal information.</p>
      <h2>4. Your rights</h2>
      <p>Subject to applicable law, you may access, correct, delete, or export your personal information, and object to or restrict certain processing. Contact cheng@cttcable.com to exercise these rights.</p>
      <h2>5. Retention</h2>
      <p>We retain personal information for as long as your account is active or as needed to provide the Service, comply with legal obligations, resolve disputes, and enforce agreements.</p>
      <h2>6. Security</h2>
      <p>We use industry-standard safeguards including encryption in transit, role-based access, and row-level security on our database. No method of transmission or storage is 100% secure.</p>
      <h2>7. International transfers</h2>
      <p>Your information may be processed in countries other than your own. Where required, we rely on appropriate transfer mechanisms.</p>
      <h2>8. Children</h2>
      <p>linQ is not directed to anyone under 18 and we do not knowingly collect information from minors.</p>
      <h2>9. Changes</h2>
      <p>We will update this Policy as our practices evolve and notify you of material changes.</p>
      <h2>10. Contact</h2>
      <p>Privacy questions or requests: cheng@cttcable.com.</p>
    </LegalLayout>
  );
}