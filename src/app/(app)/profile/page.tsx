import { Avatar } from "@/components/Avatar";
import { BranchBadge } from "@/components/BranchBadge";
import { Messages } from "@/components/Messages";
import { requireApproved } from "@/lib/auth";
import { groupName } from "@/lib/groups";
import { signPhotos } from "@/lib/photos";
import { deleteAccount, removePhoto, saveProfile } from "./actions";
import { PhotoUpload } from "./PhotoUpload";

export const metadata = { title: "My profile" };

function Choice({ name, value, checked, children }: { name: string; value: string; checked: boolean; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 rounded-md border-2 border-border p-3">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="mt-1 h-5 w-5 shrink-0" />
      <span>{children}</span>
    </label>
  );
}

// Members who signed up before first and last name were separate.
function splitName(p: { full_name: string; first_name: string | null; last_name: string | null }) {
  if (p.first_name || p.last_name) return [p.first_name ?? "", p.last_name ?? ""];
  const parts = p.full_name.trim().split(/\s+/);
  return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts.at(-1)!] : [p.full_name, ""];
}

export default async function ProfilePage(props: PageProps<"/profile">) {
  const sp = await props.searchParams;
  const { supabase, profile: p } = await requireApproved({ allowIncompleteProfile: true });
  const photos = await signPhotos(supabase, [p.photo_path]);
  const group = groupName(p.group_id);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1949 }, (_, i) => thisYear - i);
  const today = new Date().toISOString().slice(0, 10);
  const isNew = p.member_since === null || p.member_since >= thisYear;
  const [first, last] = splitName(p);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {p.profile_completed_at ? (
        <h1 className="page-title">My profile</h1>
      ) : (
        <div className="hero-bg rounded-2xl p-8 text-white">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-gold">You&apos;re approved</p>
          <h1 className="font-display text-4xl font-bold uppercase">Complete your member profile</h1>
          <p className="mt-3 text-lg text-slate-200">
            Add a photo and a few details so fellow members can find you, then choose what you&apos;d
            like to share. Click Save profile at the bottom when you&apos;re done.
          </p>
        </div>
      )}
      <Messages error={sp.error} message={sp.message} />

      <section className="card" aria-labelledby="photo-h">
        <h2 id="photo-h" className="mb-4 text-2xl font-bold">Photo</h2>
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={p.full_name} url={p.photo_path ? photos.get(p.photo_path) : null} size={96} />
          <PhotoUpload userId={p.id} />
          {p.photo_path && (
            <form action={removePhoto}>
              <button className="btn-secondary btn-small">Remove photo</button>
            </form>
          )}
        </div>
      </section>

      <form action={saveProfile} className="space-y-8">
        <section className="card space-y-5" aria-labelledby="about-h">
          <h2 id="about-h" className="text-2xl font-bold">About me</h2>
          <p className="flex flex-wrap items-center gap-2">
            Group: <BranchBadge groupId={p.group_id} />
            <span className="text-muted">(ask an admin if this needs to change)</span>
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="first_name">First name</label>
              <input className="input" id="first_name" name="first_name" autoComplete="given-name" defaultValue={first} required />
            </div>
            <div>
              <label className="label" htmlFor="last_name">Last name</label>
              <input className="input" id="last_name" name="last_name" autoComplete="family-name" defaultValue={last} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="date_of_birth">Date of birth</label>
            <input
              className="input max-w-xs"
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              min="1900-01-01"
              max={today}
              autoComplete="bday"
              defaultValue={p.date_of_birth ?? ""}
            />
            <span className="hint">Other members only ever see the month and day, and only if you choose Public below.</span>
          </div>
          <fieldset className="space-y-2">
            <legend className="label">When did you join BOBSF?</legend>
            <Choice name="joined" value="new" checked={isNew}>
              I&apos;m a new member
            </Choice>
            <label className="flex flex-wrap items-center gap-3 rounded-md border-2 border-border p-3">
              <input type="radio" name="joined" value="year" defaultChecked={!isNew} className="h-5 w-5 shrink-0" />
              <span>I joined in</span>
              <select className="input w-32" name="joined_year" aria-label="Year you joined" defaultValue={String(p.member_since ?? thisYear)}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </fieldset>
          <div>
            <label className="label" htmlFor="service_years">Years of service</label>
            <input className="input" id="service_years" name="service_years" placeholder="For example 1998 to 2006" defaultValue={p.service_years ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="bio">A little about you</label>
            <textarea className="input min-h-40" id="bio" name="bio" defaultValue={p.bio ?? ""} />
          </div>
        </section>

        <section className="card space-y-5" aria-labelledby="contact-h">
          <h2 id="contact-h" className="text-2xl font-bold">Contact and mailing address</h2>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input className="input max-w-xs" id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={p.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="address_line1">Street address</label>
            <input className="input" id="address_line1" name="address_line1" autoComplete="address-line1" defaultValue={p.address_line1 ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="address_line2">Apartment, suite or unit <span className="font-normal text-muted">(optional)</span></label>
            <input className="input" id="address_line2" name="address_line2" autoComplete="address-line2" defaultValue={p.address_line2 ?? ""} />
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem_9rem]">
            <div>
              <label className="label" htmlFor="city">City</label>
              <input className="input" id="city" name="city" autoComplete="address-level2" defaultValue={p.city ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <input className="input" id="state" name="state" autoComplete="address-level1" maxLength={30} defaultValue={p.state ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="postal_code">ZIP code</label>
              <input className="input" id="postal_code" name="postal_code" autoComplete="postal-code" inputMode="numeric" maxLength={10} defaultValue={p.postal_code ?? ""} />
            </div>
          </div>
        </section>

        <section className="card space-y-5" aria-labelledby="work-h">
          <h2 id="work-h" className="text-2xl font-bold">Work</h2>
          <div>
            <label className="label" htmlFor="job_title">Current job or title</label>
            <input className="input" id="job_title" name="job_title" autoComplete="organization-title" defaultValue={p.job_title ?? ""} />
          </div>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="retired" defaultChecked={p.retired} className="mt-1 h-5 w-5" />
            <span>I&apos;m retired</span>
          </label>
          <div className="group space-y-5">
            <label className="flex items-start gap-3">
              <input type="checkbox" id="is_business_owner" name="is_business_owner" defaultChecked={p.is_business_owner} className="mt-1 h-5 w-5" />
              <span>I own a business</span>
            </label>
            <div className="hidden space-y-5 rounded-xl border-2 border-border bg-slate-50 p-5 group-has-[input[type=checkbox]:checked]:block">
              <p className="hint">Your business, with your name and branch, is listed on the Support Members page for every BOBSF member to see.</p>
              <div>
                <label className="label" htmlFor="business_name">Company name</label>
                <input className="input" id="business_name" name="business_name" autoComplete="organization" defaultValue={p.business_name ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="business_website">Website</label>
                <input className="input" id="business_website" name="business_website" type="url" placeholder="https://" defaultValue={p.business_website ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="business_phone">Business phone</label>
                <input className="input max-w-xs" id="business_phone" name="business_phone" type="tel" defaultValue={p.business_phone ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="business_description">What does your business do?</label>
                <textarea className="input min-h-28" id="business_description" name="business_description" defaultValue={p.business_description ?? ""} />
              </div>
            </div>
          </div>
        </section>

        <section className="card space-y-5" aria-labelledby="privacy-h">
          <h2 id="privacy-h" className="text-2xl font-bold">Privacy</h2>
          <fieldset className="space-y-2">
            <legend className="label">My personal info: email, phone, mailing address and birthday</legend>
            <Choice name="contact_visibility" value="leaders" checked={p.contact_visibility !== "all"}>
              <strong>Private.</strong> Only site admins see it. Your {group} leader can also see your
              phone and email so they can reach you.
            </Choice>
            <Choice name="contact_visibility" value="all" checked={p.contact_visibility === "all"}>
              <strong>Public.</strong> Members who can see your profile can see it. Your birthday shows
              as month and day only.
            </Choice>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="label">Who can find my name, photo and profile?</legend>
            <Choice name="name_visibility" value="group" checked={p.name_visibility === "group"}>
              Only {group} members
            </Choice>
            <Choice name="name_visibility" value="all" checked={p.name_visibility === "all"}>
              All BOBSF members
            </Choice>
          </fieldset>
          <p className="hint">
            When you post in a forum, your name shows on that post to everyone who can read that forum.
          </p>
        </section>

        <section className="card space-y-3" aria-labelledby="email-h">
          <h2 id="email-h" className="text-2xl font-bold">Email</h2>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="email_forum" defaultChecked={p.email_forum} className="mt-1 h-5 w-5" />
            <span>Email me when someone replies in a discussion I follow</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="email_announcements" defaultChecked={p.email_announcements} className="mt-1 h-5 w-5" />
            <span>Email me announcements from my group leader and admins</span>
          </label>
        </section>

        <button className="btn">{p.profile_completed_at ? "Save profile" : "Save and continue"}</button>
      </form>

      <section className="card space-y-4 border-danger" aria-labelledby="delete-h">
        <h2 id="delete-h" className="text-2xl font-bold">Delete my account</h2>
        <p>This permanently removes your profile and photo. Your forum posts stay, marked as from a former member.</p>
        <form action={deleteAccount} className="space-y-3">
          <label className="label" htmlFor="confirm">Type DELETE to confirm</label>
          <input className="input max-w-xs" id="confirm" name="confirm" autoComplete="off" />
          <button className="btn-danger">Delete my account</button>
        </form>
      </section>
    </div>
  );
}
