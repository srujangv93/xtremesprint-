import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { evaluateCode, Testcase } from "@/lib/judge";
import { invalidateCache } from "@/lib/cache";
import { getAwardablePoints } from "@/lib/schedule";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { problemId, language, code, username } = body;

    const userHandle = (username || "Contestant").trim();

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code cannot be empty" }, { status: 400 });
    }

    const db = getDb();

    // Fetch problem details
    const probRes = await db.execute({
      sql: "SELECT * FROM problems WHERE id = ?",
      args: [problemId]
    });

    if (probRes.rows.length === 0) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const problem = probRes.rows[0];
    const problemDay = Number(problem.day || 4);
    const standardPoints = Number(problem.points || 100);
    const awardInfo = getAwardablePoints(problemDay, standardPoints);

    if (awardInfo.isLocked) {
      return NextResponse.json(
        { error: `This challenge is locked until 8:00 AM IST on Day ${problemDay}.` },
        { status: 403 }
      );
    }

    // Fetch ALL test cases (sample + hidden)
    const tcRes = await db.execute({
      sql: "SELECT * FROM testcases WHERE problem_id = ? ORDER BY is_sample DESC, id ASC",
      args: [problemId]
    });

    if (tcRes.rows.length === 0) {
      return NextResponse.json(
        { error: "No test cases configured for this problem" },
        { status: 400 }
      );
    }

    const testcases: Testcase[] = tcRes.rows.map((r: any) => ({
      id: Number(r.id),
      problem_id: Number(r.problem_id),
      input_data: String(r.input_data),
      expected_output: String(r.expected_output),
      is_sample: Number(r.is_sample)
    }));

    // Evaluate code against all test cases
    const result = await evaluateCode(code, language, testcases);

    // Compute awarded score based on active window vs practice window
    let score = 0;
    if (result.all_passed) {
      score = awardInfo.awardPoints;
    } else {
      score = Math.floor(awardInfo.awardPoints * (result.passed_count / result.total_count));
    }
    result.score = score;
    (result as any).is_practice = awardInfo.isPractice;
    if (awardInfo.isPractice) {
      (result as any).practice_notice = "Submitted in Practice Mode (post 9:00 PM IST). 0 points awarded.";
    }

    // Record submission
    await db.execute({
      sql: `
        INSERT INTO submissions (
          username, problem_id, language, code, status,
          passed_count, total_count, execution_time, score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        userHandle,
        problemId,
        language,
        code,
        result.status,
        result.passed_count,
        result.total_count,
        result.total_time,
        score
      ]
    });

    // Invalidate cached leaderboard so ranks update immediately
    invalidateCache("leaderboard_");

    // For competitive integrity, sanitize hidden testcases so inputs/outputs are never leaked
    const sanitizedResults = result.results.map((r) => {
      if (r.is_sample) {
        return r;
      }
      return {
        ...r,
        input: "[Hidden Test Case]",
        expected_output: "[Hidden]",
        actual_output: r.passed ? "[Passed]" : "[Hidden]",
      };
    });

    return NextResponse.json({
      ...result,
      results: sanitizedResults
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit code" }, { status: 500 });
  }
}
