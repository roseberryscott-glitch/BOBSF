/* eslint-disable @next/next/no-img-element -- decorative background image */
// The club crest, faint, behind the main page's hero. The parent needs
// `relative isolate overflow-hidden`.
export function Watermark() {
  return (
    <img
      src="/bobsf-logo.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(95vw,620px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.13] select-none md:left-auto md:right-2 md:translate-x-0 md:opacity-[0.2]"
    />
  );
}
