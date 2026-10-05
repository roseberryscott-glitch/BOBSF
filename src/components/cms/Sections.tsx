"use client";

import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { BranchBadge } from "@/components/BranchBadge";
import { BranchLogo } from "@/components/BranchLogo";
import { Watermark } from "@/components/Watermark";
import type {
  BranchLogos,
  BranchesSection,
  CardsSection,
  CtaSection,
  HeroSection,
  ImageSection,
  LinksSection,
  PeopleSection,
  Section,
  TextSection,
} from "@/lib/content";
import { GROUPS } from "@/lib/groups";
import { EImage, ELink, EText } from "./Editable";

type Props<S> = { s: S; edit: boolean; update: (patch: Partial<S>) => void; logos: BranchLogos };

function ItemControls({ onRemove }: { onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="edit-chip absolute right-2 top-2 z-10" aria-label="Remove this item">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function AddItem({ onAdd, label }: { onAdd: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-h-32 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-6 font-semibold text-slate-500 hover:border-gold hover:text-navy"
    >
      <Plus className="h-5 w-5" /> {label}
    </button>
  );
}

function replaceAt<T>(list: T[], i: number, patch: Partial<T>) {
  return list.map((item, j) => (j === i ? { ...item, ...patch } : item));
}

// ---------------------------------------------------------------------------

function Hero({ s, edit, update, watermark }: Props<HeroSection> & { watermark?: boolean }) {
  return (
    <section className="hero-bg relative isolate overflow-hidden text-white">
      {s.image && (
        <EImage
          value={s.image}
          onChange={() => {}}
          edit={false}
          alt=""
          folder="hero"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
        />
      )}
      <div className="stars absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      {watermark && <Watermark />}
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
        <EText
          as="p"
          label="Small heading"
          value={s.eyebrow}
          edit={edit}
          onChange={(eyebrow) => update({ eyebrow })}
          className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-gold"
        />
        <EText
          as="h1"
          label="Heading"
          value={s.heading}
          edit={edit}
          onChange={(heading) => update({ heading })}
          className="font-display max-w-3xl text-5xl font-bold uppercase leading-[1.05] tracking-tight sm:text-7xl"
        />
        <EText
          as="p"
          label="Text"
          value={s.body}
          edit={edit}
          onChange={(body) => update({ body })}
          className="mt-6 max-w-2xl text-xl text-slate-200"
        />
        <div className="mt-10 flex flex-wrap gap-4">
          <ELink
            label={s.primaryLabel}
            href={s.primaryHref}
            edit={edit}
            onChange={(primaryLabel, primaryHref) => update({ primaryLabel, primaryHref })}
            className="btn-gold"
          />
          <ELink
            label={s.secondaryLabel}
            href={s.secondaryHref}
            edit={edit}
            onChange={(secondaryLabel, secondaryHref) => update({ secondaryLabel, secondaryHref })}
            className="btn-ghost"
          />
        </div>
        {edit && (
          <div className="mt-8">
            <EImage
              value={s.image}
              onChange={(image) => update({ image })}
              edit
              alt=""
              folder="hero"
              className="h-40 w-full max-w-md rounded-xl object-cover"
              placeholder={<div className="flex h-40 w-full max-w-md items-center justify-center rounded-xl border-2 border-dashed border-white/40 text-white/70">Background picture (optional)</div>}
            />
          </div>
        )}
      </div>
      <div className="flag-stripe" aria-hidden="true" />
    </section>
  );
}

function Text({ s, edit, update }: Props<TextSection>) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="section-title" />
      <EText as="p" label="Text" value={s.body} edit={edit} onChange={(body) => update({ body })} className="mt-5 text-xl leading-relaxed text-slate-700" />
    </section>
  );
}

function Cards({ s, edit, update }: Props<CardsSection>) {
  const set = (items: CardsSection["items"]) => update({ items });
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="section-title mb-10 text-center" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {s.items.map((c, i) => (
          <article key={i} className="lift-card relative flex flex-col overflow-hidden">
            {edit && <ItemControls onRemove={() => set(s.items.filter((_, j) => j !== i))} />}
            <EImage
              value={c.image}
              onChange={(image) => set(replaceAt(s.items, i, { image }))}
              edit={edit}
              alt=""
              folder="cards"
              className="h-48 w-full object-cover"
              placeholder={edit ? <div className="h-24 bg-slate-100" /> : <div className="h-1.5 bg-gradient-to-r from-navy via-olive to-gold" />}
            />
            <div className="flex flex-1 flex-col p-6">
              <EText as="h3" label="Title" value={c.title} edit={edit} onChange={(title) => set(replaceAt(s.items, i, { title }))} className="font-display text-2xl font-bold uppercase tracking-wide text-navy" />
              <EText as="p" label="Description" value={c.body} edit={edit} onChange={(body) => set(replaceAt(s.items, i, { body }))} className="mt-3 flex-1 text-slate-700" />
              <div className="mt-4">
                <ELink
                  label={edit ? c.href : c.href ? "Learn more" : ""}
                  href={c.href}
                  edit={false}
                  onChange={() => {}}
                  className="inline-flex items-center gap-1 font-semibold text-navy"
                >
                  <ArrowRight className="h-4 w-4" />
                </ELink>
                {edit && (
                  <input
                    aria-label="Card link"
                    value={c.href}
                    placeholder="Optional link, e.g. https://…"
                    onChange={(e) => set(replaceAt(s.items, i, { href: e.target.value }))}
                    className="edit-field w-full text-base"
                  />
                )}
              </div>
            </div>
          </article>
        ))}
        {edit && <AddItem label="Add card" onAdd={() => set([...s.items, { title: "Title", body: "", image: "", href: "" }])} />}
      </div>
    </section>
  );
}

function People({ s, edit, update, logos }: Props<PeopleSection>) {
  const set = (items: PeopleSection["items"]) => update({ items });
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="section-title mb-10 text-center" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {s.items.map((p, i) => (
          <article key={i} className="lift-card relative p-6 text-center">
            {edit && <ItemControls onRemove={() => set(s.items.filter((_, j) => j !== i))} />}
            <div className="mx-auto mb-4 flex justify-center">
              <EImage
                value={p.photo}
                onChange={(photo) => set(replaceAt(s.items, i, { photo }))}
                edit={edit}
                alt={p.name}
                folder="people"
                className="h-36 w-36 rounded-full border-4 border-gold object-cover shadow-lg"
                placeholder={
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-slate-100">
                    {p.branch ? <BranchLogo groupId={p.branch} logos={logos} size={80} /> : <span className="text-slate-400">Photo</span>}
                  </div>
                }
              />
            </div>
            <EText as="h3" label="Name" value={p.name} edit={edit} onChange={(name) => set(replaceAt(s.items, i, { name }))} className="font-display text-2xl font-bold uppercase text-navy" />
            <EText as="p" label="Role" value={p.role} edit={edit} onChange={(role) => set(replaceAt(s.items, i, { role }))} className="mt-1 font-semibold uppercase tracking-wider text-olive" />
            <div className="mt-3 flex justify-center">
              {edit ? (
                <select
                  aria-label="Branch"
                  value={p.branch}
                  onChange={(e) => set(replaceAt(s.items, i, { branch: e.target.value }))}
                  className="edit-field text-base"
                >
                  <option value="">No branch</option>
                  {GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              ) : (
                p.branch && <BranchBadge groupId={p.branch} size="sm" />
              )}
            </div>
            <EText as="p" label="About this person" value={p.bio} edit={edit} onChange={(bio) => set(replaceAt(s.items, i, { bio }))} className="mt-4 text-slate-700" />
          </article>
        ))}
        {edit && <AddItem label="Add person" onAdd={() => set([...s.items, { name: "Name", role: "", branch: "", photo: "", bio: "" }])} />}
      </div>
    </section>
  );
}

function Links({ s, edit, update }: Props<LinksSection>) {
  const set = (items: LinksSection["items"]) => update({ items });
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="section-title mb-8 text-center" />
      <ul className="space-y-3">
        {s.items.map((l, i) => (
          <li key={i} className="lift-card relative flex items-center justify-between gap-3 px-6 py-4">
            {edit ? (
              <>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                  <input aria-label="Link text" value={l.label} onChange={(e) => set(replaceAt(s.items, i, { label: e.target.value }))} className="edit-field flex-1" placeholder="Link text" />
                  <input aria-label="Link address" value={l.href} onChange={(e) => set(replaceAt(s.items, i, { href: e.target.value }))} className="edit-field flex-1" placeholder="https://…" />
                </div>
                <button type="button" className="edit-chip" aria-label="Remove link" onClick={() => set(s.items.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <ELink label={l.label} href={l.href} edit={false} onChange={() => {}} className="flex w-full items-center justify-between text-lg font-semibold text-navy">
                <ArrowRight className="h-5 w-5" />
              </ELink>
            )}
          </li>
        ))}
      </ul>
      {edit && (
        <button type="button" className="edit-chip mx-auto mt-4" onClick={() => set([...s.items, { label: "", href: "" }])}>
          <Plus className="h-4 w-4" /> Add link
        </button>
      )}
    </section>
  );
}

function Picture({ s, edit, update }: Props<ImageSection>) {
  return (
    <figure className="mx-auto max-w-5xl px-4 py-12">
      <EImage
        value={s.src}
        onChange={(src) => update({ src })}
        edit={edit}
        alt={s.alt}
        folder="pictures"
        className="max-h-[36rem] w-full rounded-2xl object-cover shadow-xl"
        placeholder={edit ? <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-500">Add a picture</div> : null}
      />
      {edit && (
        <input aria-label="Picture description" value={s.alt} onChange={(e) => update({ alt: e.target.value })} placeholder="Describe the picture (for screen readers)" className="edit-field mt-3 w-full text-base" />
      )}
      <EText as="p" label="Caption" value={s.caption} edit={edit} onChange={(caption) => update({ caption })} className="mt-3 text-center text-slate-600" />
    </figure>
  );
}

function Cta({ s, edit, update }: Props<CtaSection>) {
  return (
    <section className="px-4 py-16">
      <div className="cta-bg mx-auto max-w-5xl rounded-3xl px-8 py-14 text-center text-white shadow-2xl">
        <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="font-display text-4xl font-bold uppercase sm:text-5xl" />
        <EText as="p" label="Text" value={s.body} edit={edit} onChange={(body) => update({ body })} className="mx-auto mt-4 max-w-2xl text-lg text-slate-200" />
        <div className="mt-8">
          <ELink label={s.label} href={s.href} edit={edit} onChange={(label, href) => update({ label, href })} className="btn-gold" />
        </div>
      </div>
    </section>
  );
}

function Branches({ s, edit, update, logos }: Props<BranchesSection>) {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <EText as="h2" label="Heading" value={s.heading} edit={edit} onChange={(heading) => update({ heading })} className="section-title" />
        <EText as="p" label="Text" value={s.body} edit={edit} onChange={(body) => update({ body })} className="mx-auto mt-4 max-w-2xl text-lg text-slate-600" />
        <ul className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-7">
          {GROUPS.map((g) => (
            <li key={g.id} className="flex flex-col items-center gap-3">
              <BranchLogo groupId={g.id} logos={logos} size={88} className="transition-transform hover:-translate-y-1" />
              <span className="font-display text-lg font-bold uppercase tracking-wide text-navy">{g.name}</span>
            </li>
          ))}
        </ul>
        {edit && <p className="mt-6 text-sm text-slate-500">Upload the branch logos in Admin, under Branch logos.</p>}
      </div>
    </section>
  );
}

export function SectionView({
  section,
  edit,
  update,
  logos,
  watermark,
}: {
  section: Section;
  edit: boolean;
  update: (patch: Partial<Section>) => void;
  logos: BranchLogos;
  watermark?: boolean;
}) {
  // Each renderer only receives patches for its own section type.
  const u = update as (patch: object) => void;
  switch (section.type) {
    case "hero":
      return <Hero s={section} edit={edit} update={u} logos={logos} watermark={watermark} />;
    case "text":
      return <Text s={section} edit={edit} update={u} logos={logos} />;
    case "cards":
      return <Cards s={section} edit={edit} update={u} logos={logos} />;
    case "people":
      return <People s={section} edit={edit} update={u} logos={logos} />;
    case "links":
      return <Links s={section} edit={edit} update={u} logos={logos} />;
    case "image":
      return <Picture s={section} edit={edit} update={u} logos={logos} />;
    case "cta":
      return <Cta s={section} edit={edit} update={u} logos={logos} />;
    case "branches":
      return <Branches s={section} edit={edit} update={u} logos={logos} />;
    default:
      return null;
  }
}
