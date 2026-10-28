import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await initDb();
    const db = getDb();

    const res = await db.execute({
      sql: "SELECT * FROM problems WHERE slug = ?",
      args: [params.slug]
    });

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    const row = res.rows[0];
    return NextResponse.json({
      id: Number(row.id),
      slug: String(row.slug),
      title: String(row.title),
      description: String(row.description),
      difficulty: String(row.difficulty),
      points: Number(row.points || 100),
      time_limit: Number(row.time_limit || 2.0),
      day: Number(row.day || 4),
      starter_python: String(row.starter_python || ""),
      starter_java: String(row.starter_java || ""),
      starter_cpp: String(row.starter_cpp || ""),
      starter_javascript: String(row.starter_javascript || "")
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
