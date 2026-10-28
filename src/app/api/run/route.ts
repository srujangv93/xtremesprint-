import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { evaluateCode, Testcase } from "@/lib/judge";
import { getAwardablePoints } from "@/lib/schedule";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { problemId, language, code } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code cannot be empty" }, { status: 400 });
    }

    const db = getDb();

    // Check if challenge is locked
    const probRes = await db.execute({
      sql: "SELECT day FROM problems WHERE id = ?",
      args: [problemId]
    });
    if (probRes.rows.length > 0) {
      const problemDay = Number(probRes.rows[0].day || 4);
      const awardInfo = getAwardablePoints(problemDay, 100);
      if (awardInfo.isLocked) {
        return NextResponse.json(
          { error: `This challenge is locked until 8:00 AM IST on Day ${problemDay}.` },
          { status: 403 }
        );
      }
    }

    const res = await db.execute({
      sql: "SELECT * FROM testcases WHERE problem_id = ? AND is_sample = 1",
      args: [problemId]
    });

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "No sample test cases found for this problem" },
        { status: 404 }
      );
    }

    const testcases: Testcase[] = res.rows.map((r: any) => ({
      id: Number(r.id),
      problem_id: Number(r.problem_id),
      input_data: String(r.input_data),
      expected_output: String(r.expected_output),
      is_sample: Number(r.is_sample)
    }));

    const result = await evaluateCode(code, language, testcases);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to run code" }, { status: 500 });
  }
}
