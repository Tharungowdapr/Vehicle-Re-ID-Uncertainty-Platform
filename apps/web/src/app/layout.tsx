import type { Metadata } from "next";
import Link from "next/link";
import { ServiceStatus } from "@/components/features/ServiceStatus";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vehicle Re-ID — Surveillance System",
  description: "Jarvis-style vehicle tracking and re-identification system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col overflow-hidden">
        <header className="sticky top-0 z-50 w-full border-b border-ink-line bg-ink/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-14">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-normal text-paper">
                Vehicle Re-ID
              </span>
            </Link>
            <nav className="flex space-x-5 text-sm font-normal text-paper-muted items-center">
              <Link href="/" className="hover:text-paper transition-colors">Overview</Link>
              <Link href="/dataset" className="hover:text-paper transition-colors">Datasets</Link>
              <Link href="/ingest" className="hover:text-paper transition-colors">Video Ingest</Link>
              <Link href="/live" className="hover:text-paper transition-colors">Live Streams</Link>
              <Link href="/search" className="hover:text-paper transition-colors">Search &amp; Inspect</Link>
              <div className="pl-3 border-l border-ink-line">
                <ServiceStatus />
              </div>
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8 relative">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
