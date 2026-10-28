import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getCached, setCached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") === "today" ? "today" : "all";
    const cacheKey = `leaderboard_${timeframe}`;

    // Check server-side in-memory cache first (prevents overloading Turso DB)
    const cachedData = getCached<any[]>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
          "X-Cache": "HIT"
        }
      });
    }

    await initDb();
    const db = getDb();

    const query = `
      WITH FilteredSubmissions AS (
        SELECT * FROM submissions
        WHERE (? = 'all' OR DATE(created_at) = DATE('now'))
          AND problem_id IN (SELECT id FROM problems)
      ),
      MaxScores AS (
        SELECT
          username,
          problem_id,
          MAX(score) as best_score
        FROM FilteredSubmissions
        GROUP BY username, problem_id
      ),
      BestSubmissions AS (
        SELECT
          f.username,
          f.problem_id,
          m.best_score,
          MIN(f.created_at) as first_best_time
        FROM FilteredSubmissions f
        JOIN MaxScores m
          ON f.username = m.username
          AND f.problem_id = m.problem_id
          AND f.score = m.best_score
        GROUP BY f.username, f.problem_id, m.best_score
      )
      SELECT
        b.username,
        SUM(b.best_score) as total_score,
        COUNT(CASE WHEN b.best_score > 0 AND b.best_score = (SELECT points FROM problems WHERE id = b.problem_id) THEN 1 END) as problems_solved,
        MAX(b.first_best_time) as last_submission_time
      FROM BestSubmissions b
      GROUP BY b.username
      ORDER BY total_score DESC, problems_solved DESC, last_submission_time ASC
    `;

    const res = await db.execute({
      sql: query,
      args: [timeframe]
    });

    const standings = res.rows.map((r: any, idx: number) => ({
      rank: idx + 1,
      username: String(r.username),
      totalScore: Number(r.total_score || 0),
      problemsSolved: Number(r.problems_solved || 0),
      lastSubmissionTime: String(r.last_submission_time || "")
    }));

    // Cache server-side for 10 seconds
    setCached(cacheKey, standings, 10);

    return NextResponse.json(standings, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        "X-Cache": "MISS"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch leaderboard" }, { status: 500 });
  }
}
