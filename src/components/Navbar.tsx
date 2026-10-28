"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function Navbar() {
  const pathname = usePathname();
  const [teamName, setTeamName] = useState<string>("");

  const updateTeam = () => {
    const fromCookie = getCookie("team_name");
    const fromStorage = localStorage.getItem("team_name");
    const current = fromCookie || fromStorage || "";
    setTeamName(current);
  };

  useEffect(() => {
    updateTeam();
    window.addEventListener("team_registered", updateTeam);
    return () => window.removeEventListener("team_registered", updateTeam);
  }, []);

  return (
    <header className="border-b border-[#1f1f23] bg-[#09090b]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link
            href="/"
            className="flex items-baseline gap-2.5 text-white hover:opacity-85 transition group"
          >
            <span className="font-mono text-lg font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
              XTREME 101
            </span>
            <span className="font-mono text-xs text-[#71717a]">ARENA</span>
          </Link>

          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link
              href="/"
              className={`transition-colors ${
                pathname === "/" ? "text-white font-semibold" : "text-[#71717a] hover:text-[#e4e4e7]"
              }`}
            >
              Challenges
            </Link>
            <Link
              href="/leaderboard"
              className={`transition-colors ${
                pathname === "/leaderboard" ? "text-white font-semibold" : "text-[#71717a] hover:text-[#e4e4e7]"
              }`}
            >
              Leaderboard
            </Link>
            <Link
              href="/admin"
              className={`transition-colors ${
                pathname.startsWith("/admin") ? "text-white font-semibold" : "text-[#71717a] hover:text-[#e4e4e7]"
              }`}
            >
              Manage
            </Link>
          </nav>
        </div>

        {/* Permanent Team Handle (Locked) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#a1a1aa] py-1.5 px-3 rounded border border-[#27272a] bg-[#121215]">
            <span className="text-[10px] text-[#71717a] uppercase font-mono tracking-wider">TEAM</span>
            <span className="font-mono text-white text-xs font-semibold">
              {teamName || "Unregistered"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
