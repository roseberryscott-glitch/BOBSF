"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Globe, Loader2, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { savePage } from "@/app/site-actions";
import {
  SECTION_LABELS,
  blankSection,
  type BranchLogos,
  type Section,
  type SitePage,
} from "@/lib/content";
import { SectionView } from "./Sections";

// Renders an editable site page. Admins get an "Edit page" button that turns
// the page itself into the editor, so what they see is what members get.
export function PageView({ page, isAdmin, logos }: { page: SitePage; isAdmin: boolean; logos: BranchLogos }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(page);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const shown = edit ? draft : page;

  function change(next: Partial<SitePage>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }
  function setSections(sections: Section[]) {
    change({ sections });
  }
  function updateSection(i: number, patch: Partial<Section>) {
    setSections(draft.sections.map((s, j) => (j === i ? ({ ...s, ...patch } as Section) : s)));
  }
  function move(i: number, by: number) {
    const next = [...draft.sections];
    const [s] = next.splice(i, 1);
    next.splice(i + by, 0, s);
    setSections(next);
  }
  function insert(i: number, type: Section["type"]) {
    const next = [...draft.sections];
    next.splice(i, 0, blankSection(type));
    setSections(next);
  }

  function start() {
    setDraft(page);
    setDirty(false);
    setError(null);
    setEdit(true);
  }
  function cancel() {
    if (dirty && !confirm("Throw away your changes to this page?")) return;
    setEdit(false);
    setDirty(false);
  }
  async function save() {
    setSaving(true);
    setError(null);
    const res = await savePage(page.slug, draft);
    setSaving(false);
    if ("error" in res && res.error) return setError(res.error);
    setDirty(false);
    setEdit(false);
    router.refresh();
  }

  return (
    <div className={edit ? "editing pb-24" : ""}>
      {isAdmin && !edit && (
        <button type="button" onClick={start} className="edit-fab">
          <Pencil className="h-5 w-5" /> Edit this page
        </button>
      )}

      {isAdmin && !edit && !page.visible && (
        <p className="bg-amber-100 px-4 py-3 text-center font-semibold text-amber-900">
          This page is hidden. Only admins can see it.
        </p>
      )}

      {edit && (
        <div className="sticky top-14 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-navy">
              <Pencil className="h-4 w-4" /> Editing
            </span>
            <input
              aria-label="Page name in the menu"
              value={draft.title}
              onChange={(e) => change({ title: e.target.value })}
              className="edit-field w-48 text-base font-semibold"
            />
            {page.slug !== "home" && (
              <>
                <button type="button" className="toggle-chip" aria-pressed={draft.visible} onClick={() => change({ visible: !draft.visible })}>
                  {draft.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {draft.visible ? "Shown on site" : "Hidden"}
                </button>
                <button type="button" className="toggle-chip" aria-pressed={!draft.is_public} onClick={() => change({ is_public: !draft.is_public })}>
                  {draft.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {draft.is_public ? "Anyone can see" : "Members only"}
                </button>
              </>
            )}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={cancel} className="btn-secondary btn-small">
                <X className="mr-1 h-4 w-4" /> Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className="btn btn-small">
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save changes
              </button>
            </div>
          </div>
          {error && <p className="bg-red-50 px-4 py-2 text-center text-red-800">{error}</p>}
        </div>
      )}

      {edit && <AddSection onAdd={(t) => insert(0, t)} />}
      {shown.sections.map((section, i) => (
        <div key={section.id} className={edit ? "group relative outline-dashed outline-2 -outline-offset-4 outline-transparent hover:outline-gold/60" : ""}>
          {edit && (
            <div className="absolute right-3 top-3 z-30 flex gap-1 rounded-full bg-white/95 p-1 shadow-lg">
              <span className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">{SECTION_LABELS[section.type]}</span>
              <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move section up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className="icon-btn" disabled={i === shown.sections.length - 1} onClick={() => move(i, 1)} aria-label="Move section down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="icon-btn text-red-700"
                aria-label="Delete section"
                onClick={() => confirm("Delete this section?") && setSections(draft.sections.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <SectionView section={section} edit={edit} update={(p) => updateSection(i, p)} logos={logos} />
          {edit && <AddSection onAdd={(t) => insert(i + 1, t)} />}
        </div>
      ))}
      {!edit && shown.sections.length === 0 && (
        <p className="mx-auto max-w-3xl px-4 py-24 text-center text-slate-500">This page is empty.</p>
      )}
    </div>
  );
}

function AddSection({ onAdd }: { onAdd: (type: Section["type"]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative z-20 flex justify-center py-2">
      <button type="button" className="edit-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Plus className="h-4 w-4" /> Add section here
      </button>
      {open && (
        <div className="absolute top-full mt-1 grid w-72 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {(Object.keys(SECTION_LABELS) as Section["type"][]).map((t) => (
            <button
              key={t}
              type="button"
              className="rounded-lg px-3 py-2 text-left text-base hover:bg-slate-100"
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
            >
              {SECTION_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
