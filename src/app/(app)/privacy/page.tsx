export const metadata = { title: "Privacy" };

// DRAFT: have BOBSF leadership review before launch.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="page-title">Privacy policy</h1>
      <p className="notice">Draft. BOBSF leadership should review this before the site launches.</p>
      <h2 className="text-2xl font-bold">What we collect</h2>
      <p>
        Your name, email address, branch of service, and anything you choose to add to your profile
        (photo, phone, city, years of service, a short bio). We also keep the posts you write and the
        events you RSVP to.
      </p>
      <h2 className="text-2xl font-bold">Who can see it</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Your name and profile are visible to members of your group, or to all members if you choose.</li>
        <li>Your email and phone are visible only to your group leader and site admins, unless you choose to share them more widely.</li>
        <li>Posts you write in a forum show your name to everyone who can read that forum.</li>
        <li>The site is members-only and hidden from search engines. We never sell your information.</li>
      </ul>
      <h2 className="text-2xl font-bold">Email</h2>
      <p>
        We email you about your account, replies to discussions you follow, and announcements from
        leaders and admins. Every non-account email has a link to stop them.
      </p>
      <h2 className="text-2xl font-bold">Deleting your account</h2>
      <p>
        You can delete your account at any time from your profile page. Your profile and photo are
        removed; your forum posts remain but are shown as from a former member.
      </p>
    </article>
  );
}
