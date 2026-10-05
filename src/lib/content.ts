// Shapes of the admin-editable page content stored in site_pages.sections.

export type HeroSection = {
  id: string;
  type: "hero";
  eyebrow: string;
  heading: string;
  body: string;
  image: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};
export type TextSection = { id: string; type: "text"; heading: string; body: string };
export type Card = { title: string; body: string; image: string; href: string };
export type CardsSection = { id: string; type: "cards"; heading: string; items: Card[] };
export type Person = { name: string; role: string; branch: string; photo: string; bio: string };
export type PeopleSection = { id: string; type: "people"; heading: string; items: Person[] };
export type LinkItem = { label: string; href: string };
export type LinksSection = { id: string; type: "links"; heading: string; items: LinkItem[] };
export type ImageSection = { id: string; type: "image"; src: string; alt: string; caption: string };
export type CtaSection = { id: string; type: "cta"; heading: string; body: string; label: string; href: string };
export type BranchesSection = { id: string; type: "branches"; heading: string; body: string };

export type Section =
  | HeroSection
  | TextSection
  | CardsSection
  | PeopleSection
  | LinksSection
  | ImageSection
  | CtaSection
  | BranchesSection;

export type SitePage = {
  slug: string;
  title: string;
  visible: boolean;
  is_public: boolean;
  sections: Section[];
};

export type BranchLogos = Record<string, string>;

// Pages with their own address. "home" is the public welcome page.
export const PAGE_ROUTES: Record<string, string> = {
  home: "/welcome",
  about: "/about",
  founders: "/founders",
  charities: "/charities",
  elected: "/elected",
};
export const MENU_PAGES = ["about", "founders", "charities", "elected"];

export const SECTION_LABELS: Record<Section["type"], string> = {
  hero: "Big banner",
  text: "Text",
  cards: "Cards",
  people: "People",
  links: "Links",
  image: "Picture",
  cta: "Call to action",
  branches: "Branch logos",
};

let counter = 0;
export function newId() {
  counter += 1;
  return `s${Date.now().toString(36)}${counter}`;
}

export function blankSection(type: Section["type"]): Section {
  const id = newId();
  switch (type) {
    case "hero":
      return { id, type, eyebrow: "", heading: "New banner", body: "", image: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" };
    case "text":
      return { id, type, heading: "New heading", body: "Write something here." };
    case "cards":
      return { id, type, heading: "New cards", items: [{ title: "Title", body: "Description", image: "", href: "" }] };
    case "people":
      return { id, type, heading: "People", items: [{ name: "Name", role: "Role", branch: "", photo: "", bio: "" }] };
    case "links":
      return { id, type, heading: "Useful links", items: [{ label: "Link text", href: "https://" }] };
    case "image":
      return { id, type, src: "", alt: "", caption: "" };
    case "cta":
      return { id, type, heading: "Join us", body: "", label: "Ask to join", href: "/signup" };
    case "branches":
      return { id, type, heading: "Every branch. One family.", body: "" };
  }
}

// Only allow ordinary links: no javascript: or data: URLs.
export function safeHref(href: string | undefined | null): string | null {
  const h = (href ?? "").trim();
  if (!h) return null;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (/^(https?:|mailto:|tel:)/i.test(h)) return h;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(h)) return `https://${h}`;
  return null;
}
