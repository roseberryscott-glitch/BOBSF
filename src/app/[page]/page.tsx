import { notFound, redirect } from "next/navigation";
import { PageView } from "@/components/cms/PageView";
import { getViewer } from "@/lib/auth";
import { getBranchLogos, getPage } from "@/lib/site";

// Admin-editable pages: /about, /founders, /charities, and /welcome
// (the public front page, also shown at / to visitors who aren't signed in).
const SLUGS: Record<string, string> = {
  welcome: "home",
  about: "about",
  founders: "founders",
  charities: "charities",
};

export async function generateMetadata(props: PageProps<"/[page]">) {
  const { page } = await props.params;
  const { supabase } = await getViewer();
  const slug = SLUGS[page];
  const data = slug ? await getPage(supabase, slug) : null;
  return { title: data?.title ?? "BOBSF" };
}

export default async function SitePage(props: PageProps<"/[page]">) {
  const { page } = await props.params;
  const sp = await props.searchParams;
  const slug = SLUGS[page];
  if (!slug) notFound();

  // Privacy rules decide visibility: hidden pages are admin-only, and
  // members-only pages need an approved account.
  const { supabase, profile } = await getViewer();
  const [data, logos] = await Promise.all([getPage(supabase, slug), getBranchLogos(supabase)]);
  if (!data) {
    if (!profile) redirect(`/login?next=/${page}`);
    notFound();
  }

  const isAdmin = profile?.status === "approved" && profile.role === "admin";
  return <PageView page={data} isAdmin={isAdmin} logos={logos} watermark={data.slug === "home"} startEditing={sp.edit === "1"} />;
}
