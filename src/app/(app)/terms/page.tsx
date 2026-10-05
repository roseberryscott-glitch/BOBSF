export const metadata = { title: "Code of conduct" };

// DRAFT: have BOBSF leadership review before launch.
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="page-title">Code of conduct</h1>
      <p className="notice">Draft. BOBSF leadership should review this before the site launches.</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Treat every member with respect. Disagree with ideas, not people.</li>
        <li>No harassment, threats, hate speech, or personal attacks.</li>
        <li>Keep other members&apos; contact details private. Don&apos;t share them outside BOBSF.</li>
        <li>No spam, selling, or fundraising without an admin&apos;s OK.</li>
        <li>
          If you&apos;re worried about a member&apos;s safety, tell an admin and point them to the Veterans
          Crisis Line: dial 988 then press 1.
        </li>
      </ul>
      <p>
        Group leaders and admins can hide posts, lock discussions and suspend accounts that break
        these rules. Use &quot;Report this post&quot; to flag anything that concerns you.
      </p>
    </article>
  );
}
