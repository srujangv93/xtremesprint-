"use client";

import { useEffect, useState } from "react";

interface Standing {
  rank: number;
  username: string;
  totalScore: number;
  problemsSolved: number;
  lastSubmissionTime: string;
}

export default function LeaderboardPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [timeframe, setTimeframe] = useState<"all" | "today">("all");

  const fetchStandings = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${tf}`);
      const data = await res.json();
      setStandings(data);
    } catch (err) {
      console.error("Failed to load standings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings(timeframe);
    let name = "";
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )team_name=([^;]+)/);
      name = match ? decodeURIComponent(match[2]) : localStorage.getItem("team_name") || "";
    }
    if (name) setCurrentUsername(name);

    const interval = setInterval(() => fetchStandings(timeframe), 15000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const handleTimeframeChange = (newTf: "all" | "today") => {
    setTimeframe(newTf);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full space-y-10">
      {/* Header with Title and Toggle */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6 border-b border-[#27272a] pb-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 font-mono text-xs text-[#a1a1aa] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>BMSCE IEEE &middot; Live Standings</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="text-xs text-[#a1a1aa] font-mono leading-relaxed">
            {timeframe === "today"
              ? "Showing submissions evaluated today (UTC). Scores reflect highest score per challenge."
              : "All-time competition rankings. Tie-breaking determined by submission velocity."}
          </p>
        </div>

        {/* Action Controls & Toggle */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Today vs Overall Toggle Switch */}
          <div className="flex items-center bg-[#121215] border border-[#27272a] p-1 rounded-md text-xs font-mono">
            <button
              onClick={() => handleTimeframeChange("today")}
              className={`px-3 py-1.5 rounded transition ${
                timeframe === "today"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              Today&apos;s Challenges
            </button>
            <button
              onClick={() => handleTimeframeChange("all")}
              className={`px-3 py-1.5 rounded transition ${
                timeframe === "all"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              Overall Leaderboard
            </button>
          </div>

          <button
            onClick={() => fetchStandings(timeframe)}
            disabled={loading}
            className="text-xs font-mono text-[#a1a1aa] hover:text-white border border-[#27272a] hover:border-[#3f3f46] px-3.5 py-2 rounded bg-[#121215] transition disabled:opacity-50"
            title="Refresh rankings"
          >
            {loading ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Standings Table */}
      <div className="border border-[#27272a] rounded-lg overflow-hidden bg-[#0e0e11]/90 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#1f1f23] text-[#71717a] font-mono uppercase text-[11px] bg-[#121215]">
              <tr>
                <th className="py-3 px-5 w-20">Rank</th>
                <th className="py-3 px-5">Team / Contestant</th>
                <th className="py-3 px-5 w-32 text-center">Problems Solved</th>
                <th className="py-3 px-5 w-32 text-right">Total Score</th>
                <th className="py-3 px-5 w-48 text-right">Latest Submission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f23] font-mono">
              {standings.map((st) => {
                const isCurrentUser =
                  currentUsername &&
                  st.username.toLowerCase() === currentUsername.toLowerCase();
                const rankFormatted = String(st.rank).padStart(2, "0");

                return (
                  <tr
                    key={st.username}
                    className={`transition-colors ${
                      isCurrentUser
                        ? "bg-[#18181b] text-white"
                        : "hover:bg-[#141417] text-[#d4d4d8]"
                    }`}
                  >
                    <td className="py-4 px-5 text-[#71717a] font-semibold text-sm">
                      {rankFormatted}
                    </td>
                    <td className="py-4 px-5 font-medium text-white flex items-center gap-2.5">
                      <span className="text-sm">{st.username}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-blue-400 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase font-mono">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center text-[#a1a1aa] text-sm">
                      {st.problemsSolved}
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-base text-white">
                      {st.totalScore} <span className="text-[11px] text-[#71717a] font-normal">pts</span>
                    </td>
                    <td className="py-4 px-5 text-right text-[#71717a] text-[11px]">
                      {st.lastSubmissionTime
                        ? st.lastSubmissionTime.slice(0, 19).replace("T", " ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {standings.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-[#71717a] font-mono">
                    {timeframe === "today"
                      ? "No submissions logged today yet. Be the first to solve a challenge today!"
                      : "No evaluated submissions recorded yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
