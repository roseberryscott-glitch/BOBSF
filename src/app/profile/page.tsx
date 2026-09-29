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

export default async function ProfilePage(props: PageProps<"/profile">) {
  const sp = await props.searchParams;
  const { supabase, profile: p } = await requireApproved();
  const photos = await signPhotos(supabase, [p.photo_path]);
  const group = groupName(p.group_id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="page-title">My profile</h1>
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
          <div>
            <label className="label" htmlFor="full_name">Name</label>
            <input className="input" id="full_name" name="full_name" defaultValue={p.full_name} required />
          </div>
          <div>
            <label className="label" htmlFor="service_years">Years of service</label>
            <input className="input" id="service_years" name="service_years" defaultValue={p.service_years ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="city">City or area</label>
            <input className="input" id="city" name="city" defaultValue={p.city ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input className="input" id="phone" name="phone" type="tel" defaultValue={p.phone ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="bio">A little about you</label>
            <textarea className="input min-h-32" id="bio" name="bio" defaultValue={p.bio ?? ""} />
          </div>
        </section>

        <section className="card space-y-5" aria-labelledby="privacy-h">
          <h2 id="privacy-h" className="text-2xl font-bold">Privacy</h2>
          <fieldset className="space-y-2">
            <legend className="label">Who can see my name, photo and profile?</legend>
            <Choice name="name_visibility" value="group" checked={p.name_visibility === "group"}>
              Only {group} members
            </Choice>
            <Choice name="name_visibility" value="all" checked={p.name_visibility === "all"}>
              All BOBSF members
            </Choice>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="label">Who can see my email and phone?</legend>
            <Choice name="contact_visibility" value="leaders" checked={p.contact_visibility === "leaders"}>
              Only my group leader and site admins
            </Choice>
            <Choice name="contact_visibility" value="group" checked={p.contact_visibility === "group"}>
              All {group} members
            </Choice>
            <Choice name="contact_visibility" value="all" checked={p.contact_visibility === "all"}>
              Everyone who can see my profile
            </Choice>
          </fieldset>
          <p className="hint">
            Your group leader and site admins can always see your contact details. When you post in a
            forum, your name shows on that post to everyone who can read that forum.
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

        <button className="btn">Save profile</button>
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
