import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout } from "@/components/LegalLayout";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Agreement — linQ" },
      {
        name: "description",
        content: "linQ's Data Processing Agreement for enterprise customers.",
      },
      { property: "og:title", content: "Data Processing Agreement — linQ" },
      {
        property: "og:description",
        content: "linQ's Data Processing Agreement for enterprise customers.",
      },
      { property: "og:url", content: "https://claudematch.com/dpa" },
    ],
    links: [{ rel: "canonical", href: "https://claudematch.com/dpa" }],
  }),
  component: DpaPage,
});

function DpaPage() {
  return (
    <LegalLayout title="Data Processing Agreement" updated="June 2, 2026">
      <p>
        This Data Processing Agreement ("DPA") forms part of the agreement between linQ Labs Inc.
        ("Processor") and the customer ("Controller") for the processing of personal data in
        connection with the Service.
      </p>
      <h2>1. Subject matter</h2>
      <p>
        linQ processes personal data on behalf of the Controller for the purpose of providing the
        matching Service described in the main agreement.
      </p>
      <h2>2. Roles</h2>
      <p>
        The Controller determines the purposes and means of the processing. linQ acts solely as
        Processor and processes personal data on documented instructions from the Controller.
      </p>
      <h2>3. Confidentiality</h2>
      <p>
        linQ ensures that personnel authorized to process personal data are bound by confidentiality
        obligations.
      </p>
      <h2>4. Security measures</h2>
      <p>
        linQ implements appropriate technical and organizational measures including encryption in
        transit, role-based access controls, database row-level security, and regular security
        reviews.
      </p>
      <h2>5. Sub-processors</h2>
      <p>
        linQ engages sub-processors for cloud hosting, email delivery, and AI inference. A current
        list is available on request.
      </p>
      <h2>6. Data subject rights</h2>
      <p>
        linQ assists the Controller in responding to data subject requests for access,
        rectification, erasure, restriction, portability, and objection.
      </p>
      <h2>7. Breach notification</h2>
      <p>
        linQ notifies the Controller without undue delay after becoming aware of a personal data
        breach.
      </p>
      <h2>8. Deletion or return</h2>
      <p>
        Upon termination, linQ deletes or returns all personal data unless retention is required by
        law.
      </p>
      <h2>9. International transfers</h2>
      <p>
        Where personal data is transferred outside the EEA, UK, or other applicable region, linQ
        relies on appropriate safeguards such as Standard Contractual Clauses.
      </p>
      <h2>10. Contact</h2>
      <p>For DPA execution or questions: cheng@cttcable.com.</p>
    </LegalLayout>
  );
}
