import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb, initDb } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";

function checkAdminAuth(): boolean {
  const cookieStore = cookies();
  return cookieStore.get("admin_auth")?.value === "authenticated";
}

// GET all problems for admin dashboard with full metadata
export async function GET() {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDb();
    const db = getDb();

    const res = await db.execute(`
      SELECT p.*,
        (SELECT COUNT(*) FROM testcases WHERE problem_id = p.id) as testcase_count,
        (SELECT COUNT(*) FROM submissions WHERE problem_id = p.id) as submission_count
      FROM problems p
      ORDER BY p.id ASC
    `);

    const problems = res.rows.map((r: any) => ({
      id: Number(r.id),
      slug: String(r.slug),
      title: String(r.title),
      description: String(r.description),
      difficulty: String(r.difficulty),
      points: Number(r.points || 100),
      timeLimit: Number(r.time_limit || 2.0),
      day: Number(r.day || 4),
      testcaseCount: Number(r.testcase_count || 0),
      submissionCount: Number(r.submission_count || 0),
      starterPython: String(r.starter_python || ""),
      starterJava: String(r.starter_java || ""),
      starterCpp: String(r.starter_cpp || ""),
      starterJavascript: String(r.starter_javascript || "")
    }));

    return NextResponse.json(problems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch problems" }, { status: 500 });
  }
}

// POST create a new problem
export async function POST(req: NextRequest) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDb();
    const body = await req.json();
    const {
      title,
      slug,
      description,
      difficulty,
      points,
      timeLimit,
      day,
      sampleInput,
      sampleOutput,
      hiddenInput,
      hiddenOutput,
      customTestcases,
      starterPython,
      starterJava,
      starterCpp,
      starterJavascript
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const problemSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const db = getDb();

    const insertProb = await db.execute({
      sql: `
        INSERT INTO problems (
          slug, title, description, difficulty, points, time_limit, day,
          starter_python, starter_java, starter_cpp, starter_javascript
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        problemSlug,
        title,
        description,
        difficulty || "Easy",
        Number(points) || 100,
        parseFloat(timeLimit) || 2.0,
        Number(day) || 4,
        starterPython || "# Write your Python code here\n",
        starterJava || "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}\n",
        starterCpp || "#include <iostream>\n\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}\n",
        starterJavascript || "// Write your JavaScript code here\n"
      ]
    });

    const problemId = Number(insertProb.lastInsertRowid);

    // Insert custom test cases if provided
    if (Array.isArray(customTestcases) && customTestcases.length > 0) {
      for (const tc of customTestcases) {
        if (tc.input !== undefined && tc.output !== undefined && tc.input !== null && tc.output !== null) {
          await db.execute({
            sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, ?)",
            args: [problemId, String(tc.input), String(tc.output), tc.is_sample ? 1 : 0]
          });
        }
      }
    } else {
      if (sampleInput !== undefined && sampleOutput !== undefined && (sampleInput || sampleOutput)) {
        await db.execute({
          sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
          args: [problemId, String(sampleInput), String(sampleOutput)]
        });
      }

      if (hiddenInput !== undefined && hiddenOutput !== undefined && (hiddenInput || hiddenOutput)) {
        await db.execute({
          sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
          args: [problemId, String(hiddenInput), String(hiddenOutput)]
        });
      }
    }

    invalidateCache("problem");
    invalidateCache("leaderboard_");
    return NextResponse.json({ success: true, problemId, slug: problemSlug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create problem" }, { status: 500 });
  }
}

// PUT update an existing problem
export async function PUT(req: NextRequest) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDb();
    const body = await req.json();
    const {
      id,
      title,
      slug,
      description,
      difficulty,
      points,
      timeLimit,
      day,
      sampleInput,
      sampleOutput,
      hiddenInput,
      hiddenOutput,
      customTestcases,
      replaceTestcases,
      starterPython,
      starterJava,
      starterCpp,
      starterJavascript
    } = body;

    if (!id || !title || !description) {
      return NextResponse.json({ error: "ID, title and description are required" }, { status: 400 });
    }

    const problemSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const db = getDb();

    await db.execute({
      sql: `
        UPDATE problems
        SET slug = ?, title = ?, description = ?, difficulty = ?, points = ?, time_limit = ?, day = ?,
            starter_python = COALESCE(?, starter_python),
            starter_java = COALESCE(?, starter_java),
            starter_cpp = COALESCE(?, starter_cpp),
            starter_javascript = COALESCE(?, starter_javascript)
        WHERE id = ?
      `,
      args: [
        problemSlug,
        title,
        description,
        difficulty || "Easy",
        Number(points) || 100,
        parseFloat(timeLimit) || 2.0,
        Number(day) || 4,
        starterPython !== undefined ? starterPython : null,
        starterJava !== undefined ? starterJava : null,
        starterCpp !== undefined ? starterCpp : null,
        starterJavascript !== undefined ? starterJavascript : null,
        Number(id)
      ]
    });

    // If replaceTestcases is checked, wipe existing test cases first
    if (replaceTestcases) {
      await db.execute({
        sql: "DELETE FROM testcases WHERE problem_id = ?",
        args: [Number(id)]
      });
    }

    // Insert new test cases if provided
    if (Array.isArray(customTestcases) && customTestcases.length > 0) {
      for (const tc of customTestcases) {
        if (tc.input !== undefined && tc.output !== undefined && tc.input !== null && tc.output !== null) {
          await db.execute({
            sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, ?)",
            args: [Number(id), String(tc.input), String(tc.output), tc.is_sample ? 1 : 0]
          });
        }
      }
    } else {
      if (sampleInput !== undefined && sampleOutput !== undefined && (sampleInput || sampleOutput)) {
        await db.execute({
          sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
          args: [Number(id), String(sampleInput), String(sampleOutput)]
        });
      }

      if (hiddenInput !== undefined && hiddenOutput !== undefined && (hiddenInput || hiddenOutput)) {
        await db.execute({
          sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
          args: [Number(id), String(hiddenInput), String(hiddenOutput)]
        });
      }
    }

    invalidateCache("problem");
    invalidateCache("leaderboard_");
    return NextResponse.json({ success: true, id, slug: problemSlug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update problem" }, { status: 500 });
  }
}

// DELETE a problem
export async function DELETE(req: NextRequest) {
  try {
    if (!checkAdminAuth()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Problem ID is required" }, { status: 400 });
    }

    await initDb();
    const db = getDb();

    // Delete testcases and submissions for this problem
    await db.execute({
      sql: "DELETE FROM testcases WHERE problem_id = ?",
      args: [Number(id)]
    });
    await db.execute({
      sql: "DELETE FROM submissions WHERE problem_id = ?",
      args: [Number(id)]
    });
    await db.execute({
      sql: "DELETE FROM problems WHERE id = ?",
      args: [Number(id)]
    });

    invalidateCache("problem");
    invalidateCache("leaderboard_");

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete problem" }, { status: 500 });
  }
}
