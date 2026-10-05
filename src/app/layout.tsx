import type { Metadata } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

// Condensed, stencil-like headings with a military feel.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "BOBSF", template: "%s · BOBSF" },
  description: "Band of Brothers Sisters and Friends: a members-only community.",
  // Members only: keep the site out of search engines.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${oswald.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:p-3">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="w-full flex-1">
          {children}
        </main>
        <footer className="bg-navy text-slate-300">
          <div className="flag-stripe" aria-hidden="true" />
          <div className="mx-auto max-w-5xl px-4 py-8 text-base">
            <p className="rounded-xl bg-white/5 p-4">
              <strong className="text-white">Veterans Crisis Line:</strong> dial{" "}
              <a className="text-gold" href="tel:988">988</a> then press 1, text{" "}
              <a className="text-gold" href="sms:838255">838255</a>, or{" "}
              <a className="text-gold" href="https://www.veteranscrisisline.net/get-help-now/chat/">chat online</a>.
              Free, confidential, 24/7.
            </p>
            <p className="mt-4">
              <span className="font-display text-lg font-bold uppercase tracking-wide text-white">BOBSF</span>{" "}
              · Band of Brothers Sisters and Friends ·{" "}
              <Link className="text-slate-300" href="/privacy">Privacy</Link> ·{" "}
              <Link className="text-slate-300" href="/terms">Code of conduct</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
