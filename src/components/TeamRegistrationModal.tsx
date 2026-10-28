"use client";

import { useState, useEffect } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function TeamRegistrationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const existingCookie = getCookie("team_name");
    const existingStorage = localStorage.getItem("team_name");

    if (!existingCookie && !existingStorage) {
      setIsOpen(true);
    } else if (!existingCookie && existingStorage) {
      setCookie("team_name", existingStorage);
    } else if (existingCookie && !existingStorage) {
      localStorage.setItem("team_name", existingCookie);
    }
  }, []);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed) {
      setError("Please enter a valid team name.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Team name must be at least 2 characters.");
      return;
    }

    setCookie("team_name", trimmed);
    localStorage.setItem("team_name", trimmed);

    window.dispatchEvent(new Event("team_registered"));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="max-w-sm w-full bg-[#0e0e11] border border-[#27272a] rounded-lg p-6 shadow-2xl space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Enter Team Name
          </h2>
        </div>

        {error && (
          <div className="p-2.5 rounded border border-rose-950 bg-[#1f0e10] text-rose-300 font-mono text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleConfirm} className="space-y-4 font-mono text-xs">
          <input
            type="text"
            required
            autoFocus
            placeholder="Team name"
            value={teamName}
            onChange={(e) => {
              setTeamName(e.target.value);
              setError("");
            }}
            className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white font-sans"
          />

          <button
            type="submit"
            className="w-full bg-white hover:bg-[#e4e4e7] text-black font-semibold text-xs py-2.5 rounded transition"
          >
            Confirm & Enter Arena &rarr;
          </button>
        </form>
      </div>
    </div>
  );
}
