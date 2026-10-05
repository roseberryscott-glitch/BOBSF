"use client";

/* eslint-disable @next/next/no-img-element -- admin-uploaded pictures from storage */
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { safeHref } from "@/lib/content";
import { uploadSiteImage } from "./upload";

// Building blocks that show content normally, and turn into in-place inputs
// when an admin is editing the page.

type TextProps = {
  value: string;
  onChange: (v: string) => void;
  edit: boolean;
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  placeholder?: string;
  label: string;
};

export function EText({ value, onChange, edit, as: Tag = "p", className = "", placeholder, label }: TextProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Grow the box to fit its text (also after fonts load or the window resizes).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [value, edit]);

  if (!edit) {
    return value ? <Tag className={`whitespace-pre-line ${className}`}>{value}</Tag> : null;
  }
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={label}
      value={value}
      placeholder={placeholder ?? `Add ${label.toLowerCase()}…`}
      onChange={(e) => onChange(e.target.value)}
      className={`edit-field block w-full resize-none overflow-hidden ${className}`}
    />
  );
}

export function EImage({
  value,
  onChange,
  edit,
  alt,
  folder,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  edit: boolean;
  alt: string;
  folder: string;
  className?: string;
  placeholder?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!edit) {
    if (value) return <img src={value} alt={alt} className={className} />;
    return placeholder ?? null;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadSiteImage(file, folder));
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="relative">
      {value ? (
        <img src={value} alt={alt} className={className} />
      ) : (
        placeholder ?? <div className={`flex items-center justify-center bg-slate-100 text-slate-500 ${className}`}>No picture</div>
      )}
      <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-center gap-2">
        <label className="edit-chip cursor-pointer">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {value ? "Change picture" : "Add picture"}
          <input type="file" accept="image/*" className="sr-only" onChange={onFile} disabled={busy} />
        </label>
        {value && (
          <button type="button" className="edit-chip" onClick={() => onChange("")}>
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

// A link or button. In edit mode the label and address are both editable.
export function ELink({
  label,
  href,
  onChange,
  edit,
  className = "",
  children,
}: {
  label: string;
  href: string;
  onChange: (label: string, href: string) => void;
  edit: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  if (edit) {
    return (
      <span className="inline-flex flex-col gap-1">
        <span className={className}>
          <input
            aria-label="Button text"
            value={label}
            placeholder="Button text (leave empty to hide)"
            onChange={(e) => onChange(e.target.value, href)}
            className="w-56 min-w-0 bg-transparent text-center outline-none placeholder:opacity-60"
          />
        </span>
        <span className="edit-chip self-center">
          <Link2 className="h-4 w-4 shrink-0" />
          <input
            aria-label="Link address"
            value={href}
            placeholder="/signup or https://…"
            onChange={(e) => onChange(label, e.target.value)}
            className="w-44 bg-transparent outline-none"
          />
        </span>
      </span>
    );
  }
  const url = safeHref(href);
  if (!label || !url) return null;
  const external = /^https?:/i.test(url);
  return external ? (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer">
      {label}
      {children}
    </a>
  ) : (
    <Link href={url} className={className}>
      {label}
      {children}
    </Link>
  );
}
