"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// The phone menu. The header stays on screen between pages, so close the
// menu when a link in it is tapped, when the page changes, or when the
// visitor taps somewhere else.
export function MobileMenu({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const menu = ref.current;
      if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details
      ref={ref}
      className="group ml-auto min-[1140px]:hidden"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a") && ref.current) ref.current.open = false;
      }}
    >
      {summary}
      {children}
    </details>
  );
}
