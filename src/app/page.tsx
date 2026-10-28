import Link from "next/link";
import { getDb, initDb } from "@/lib/db";
import { getCached, setCached } from "@/lib/cache";
import { getDayMeta } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cacheKey = "problems_list";
  let problems = getCached<any[]>(cacheKey);

  if (!problems) {
    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT p.*,
        (SELECT COUNT(*) FROM testcases WHERE problem_id = p.id) as testcase_count,
        (SELECT COUNT(DISTINCT username) FROM submissions WHERE problem_id = p.id AND status = 'Accepted') as accepted_count
      FROM problems p
      ORDER BY p.day ASC, p.id ASC
    `);

    problems = res.rows as any[];
    // Cache for 30 seconds server-side
    setCached(cacheKey, problems, 30);
  }

  const totalPoints = problems.reduce((acc, p) => acc + Number(p.points || 0), 0);

  // Group problems by Day
  const problemsByDay: Record<number, any[]> = {};
  for (const prob of problems) {
    const d = Number(prob.day) || 4;
    if (!problemsByDay[d]) {
      problemsByDay[d] = [];
    }
    problemsByDay[d].push(prob);
  }

  // Days sorted
  const sortedDays = Object.keys(problemsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full space-y-16">
      {/* Unboxed Editorial Hero */}
      <section className="space-y-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
          IEEEXtreme 101 Arena
        </h1>

        <p className="text-base text-[#a1a1aa] leading-relaxed">
          Competitive programming challenges by BMSCE IEEE. Solve each problem in Python, Java, C++, or JavaScript to score points on the live leaderboard.
        </p>

        {/* Minimal Metrics Line */}
        <div className="flex items-center gap-10 pt-4 border-t border-[#1f1f23] text-xs font-mono">
          <div>
            <span className="text-[#71717a] block text-[11px] mb-1">CHALLENGES</span>
            <span className="text-white text-base font-semibold">{problems.length}</span>
          </div>
          <div>
            <span className="text-[#71717a] block text-[11px] mb-1">TOTAL POINTS</span>
            <span className="text-white text-base font-semibold">{totalPoints}</span>
          </div>
          <div>
            <span className="text-[#71717a] block text-[11px] mb-1">LANGUAGES</span>
            <span className="text-white text-base font-semibold">Python &middot; Java &middot; C++ &middot; JS</span>
          </div>
        </div>
      </section>

      {/* Problemset Index */}
      <section className="space-y-8">
        <div className="flex items-baseline justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-[#a1a1aa]">
              Challenge Problemset
            </h2>
            <span className="text-xs font-mono text-[#71717a]">
              &middot; {problems.length} total challenges
            </span>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-mono text-[#a1a1aa] hover:text-white hover:underline transition"
          >
            View Leaderboard &rarr;
          </Link>
        </div>

        {sortedDays.length === 0 ? (
          <div className="border border-[#27272a] rounded-lg p-12 text-center text-[#71717a] font-mono text-xs">
            No active challenges published. Organizers can add problems via /admin.
          </div>
        ) : (
          <div className="space-y-10">
            {sortedDays.map((day) => {
              const dayProblems = problemsByDay[day];
              const meta = getDayMeta(day);
              const isLocked = meta.status === "locked";

              return (
                <div key={day} className="space-y-3">
                  {/* Day Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-mono tracking-tight text-white uppercase">
                        Day {day} {meta.isToday ? "(Today)" : ""}
                      </span>
                      <span className="text-xs font-mono text-[#71717a]">
                        &middot; {meta.dateStr}
                      </span>
                      <span className="text-xs font-mono text-[#71717a]">
                        &middot; {dayProblems.length} {dayProblems.length === 1 ? "problem" : "problems"}
                      </span>
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium border ${meta.badgeColor}`}
                      >
                        {meta.status === "active" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        {meta.status === "locked" && (
                          <span className="text-xs">🔒</span>
                        )}
                        {meta.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="border border-[#27272a] rounded-lg overflow-hidden bg-[#0e0e11]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#1f1f23] text-[#71717a] font-mono uppercase text-[11px] bg-[#121215]">
                          <tr>
                            <th className="py-3 px-5 w-16">#</th>
                            <th className="py-3 px-5">Problem</th>
                            <th className="py-3 px-5 w-28">Difficulty</th>
                            <th className="py-3 px-5 w-24">Points</th>
                            <th className="py-3 px-5 w-28 text-right">Solves</th>
                            <th className="py-3 px-5 w-28 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f1f23]">
                          {dayProblems.map((p: any, idx: number) => {
                            const numStr = String(idx + 1).padStart(2, "0");
                            return (
                              <tr
                                key={String(p.id)}
                                className={`hover:bg-[#151518] transition-colors group ${
                                  isLocked ? "opacity-75" : ""
                                }`}
                              >
                                <td className="py-4 px-5 font-mono text-[#71717a]">{numStr}</td>
                                <td className="py-4 px-5">
                                  {isLocked ? (
                                    <span className="font-medium text-[#71717a] text-sm tracking-tight flex items-center gap-2">
                                      <span>🔒</span> {p.title}
                                    </span>
                                  ) : (
                                    <Link
                                      href={`/problems/${p.slug}`}
                                      className="font-medium text-white hover:text-blue-400 text-sm tracking-tight transition-colors"
                                    >
                                      {p.title}
                                    </Link>
                                  )}
                                </td>
                                <td className="py-4 px-5">
                                  <span
                                    className={`font-mono text-[11px] uppercase tracking-wider ${
                                      p.difficulty === "Easy"
                                        ? "text-emerald-400"
                                        : p.difficulty === "Medium"
                                        ? "text-amber-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {p.difficulty}
                                  </span>
                                </td>
                                <td className="py-4 px-5 font-mono text-[#a1a1aa]">
                                  {meta.status === "ended" ? (
                                    <span title="Practice mode (0 points awarded to leaderboard)">
                                      0 <span className="text-[#52525b] line-through text-[11px]">{p.points}</span>
                                    </span>
                                  ) : (
                                    p.points
                                  )}
                                </td>
                                <td className="py-4 px-5 font-mono text-right text-[#71717a]">
                                  {Number(p.accepted_count || 0)}
                                </td>
                                <td className="py-4 px-5 text-right">
                                  {isLocked ? (
                                    <span className="inline-block font-mono text-xs text-[#52525b] border border-[#27272a] px-3 py-1 rounded bg-[#121215] cursor-not-allowed">
                                      Locked
                                    </span>
                                  ) : (
                                    <Link
                                      href={`/problems/${p.slug}`}
                                      className="inline-block font-mono text-xs text-white hover:bg-white hover:text-black border border-[#27272a] hover:border-white px-3 py-1 rounded bg-[#18181b] transition"
                                    >
                                      {meta.status === "ended" ? "Practice →" : "Solve →"}
                                    </Link>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
