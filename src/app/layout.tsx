import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import TeamRegistrationModal from "@/components/TeamRegistrationModal";

export const metadata: Metadata = {
  title: "Xtreme 101 — BMSCE IEEE Coding Platform",
  description: "Official programming competition and practice arena by BMSCE IEEE Student Branch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#fafafa] min-h-screen flex flex-col font-sans relative">
        {/* Ambient Architectural Dot Grid Pattern */}
        <div className="bg-grid-pattern" aria-hidden="true" />

        <TeamRegistrationModal />
        <Navbar />
        <main className="flex-1 flex flex-col relative z-10">{children}</main>

        <footer className="border-t border-[#1f1f23] py-8 px-6 text-xs text-[#71717a] relative z-10 bg-[#09090b]/80 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-baseline justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
              <span className="font-mono font-medium text-white tracking-tight">XTREME 101</span>
              <span>BMSCE IEEE Student Branch &middot; Branch 06261 &middot; Region 10</span>
            </div>
            <div className="font-mono text-[11px] text-[#52525b]">
              B.M.S. College of Engineering &middot; Bengaluru
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
