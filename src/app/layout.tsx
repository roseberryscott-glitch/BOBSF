import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
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
    <html lang="en" className={`${sourceSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:p-3">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-6 text-base">
            <p>
              <strong>Veterans Crisis Line:</strong> dial <a href="tel:988">988</a> then press 1,
              text <a href="sms:838255">838255</a>, or{" "}
              <a href="https://www.veteranscrisisline.net/get-help-now/chat/">chat online</a>. Free,
              confidential, 24/7.
            </p>
            <p className="mt-2 text-muted">
              Band of Brothers Sisters and Friends ·{" "}
              <Link href="/privacy">Privacy</Link> · <Link href="/terms">Code of conduct</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
