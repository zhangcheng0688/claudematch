import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — linQ" },
      { name: "description", content: "The terms that govern your use of linQ." },
      { property: "og:title", content: "Terms of Service — linQ" },
      { property: "og:description", content: "The terms that govern your use of linQ." },
      { property: "og:url", content: "https://claudematch.com/terms" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 2, 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of linQ ("Service"), operated
        by linQ Labs Inc. ("we", "us", "our"). By creating an account or using the Service, you
        agree to be bound by these Terms.
      </p>
      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years old to use linQ. By using the Service you represent that you
        meet this requirement and that the information you provide is accurate.
      </p>
      <h2>2. Your account</h2>
      <p>
        You are responsible for safeguarding your login credentials and for any activity that occurs
        under your account. Notify us immediately of any unauthorized use.
      </p>
      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not impersonate others or misrepresent your identity.</li>
        <li>Do not harass, threaten, or harm other users.</li>
        <li>Do not use the Service for illegal activity or to violate any third-party right.</li>
        <li>Do not attempt to reverse engineer, scrape, or disrupt the Service.</li>
      </ul>
      <h2>4. Matches and meet-ups</h2>
      <p>
        linQ provides AI-curated introductions but does not guarantee outcomes. You are solely
        responsible for your interactions and meetings with other users. Meet in public, share trip
        details with a trusted contact, and use your judgment.
      </p>
      <h2>5. Subscriptions and fees</h2>
      <p>
        Some features may require paid subscriptions. Pricing, billing cycles, and refund terms are
        presented at the point of purchase.
      </p>
      <h2>6. Intellectual property</h2>
      <p>
        The Service, including all software, design, and content we create, is owned by linQ Labs
        Inc. and protected by applicable laws. You retain ownership of content you submit, and grant
        us a limited license to use it to operate and improve the Service.
      </p>
      <h2>7. Termination</h2>
      <p>
        We may suspend or terminate your account at any time for violation of these Terms. You may
        close your account at any time from settings.
      </p>
      <h2>8. Disclaimer</h2>
      <p>
        The Service is provided "as is" and "as available" without warranties of any kind, express
        or implied.
      </p>
      <h2>9. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, linQ Labs Inc. shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages arising from your use of the
        Service.
      </p>
      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of material changes;
        continued use after changes take effect constitutes acceptance.
      </p>
      <h2>11. Contact</h2>
      <p>Questions about these Terms? Contact cheng@cttcable.com.</p>
    </LegalLayout>
  );
}
