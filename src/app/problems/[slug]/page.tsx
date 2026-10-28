import { notFound } from "next/navigation";
import { getDb, initDb } from "@/lib/db";
import ProblemWorkspace from "@/components/ProblemWorkspace";

interface ProblemPageProps {
  params: {
    slug: string;
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProblemPage({ params }: ProblemPageProps) {

  await initDb();
  const db = getDb();

  const probRes = await db.execute({
    sql: "SELECT * FROM problems WHERE slug = ?",
    args: [params.slug]
  });

  if (probRes.rows.length === 0) {
    notFound();
  }

  const problem = probRes.rows[0];

  const tcRes = await db.execute({
    sql: "SELECT id, input_data, expected_output FROM testcases WHERE problem_id = ? AND is_sample = 1",
    args: [problem.id]
  });

  const sampleTestcases = tcRes.rows.map((r: any) => ({
    id: Number(r.id),
    input_data: String(r.input_data),
    expected_output: String(r.expected_output)
  }));

  const formattedProblem = {
    id: Number(problem.id),
    slug: String(problem.slug),
    title: String(problem.title),
    description: String(problem.description),
    difficulty: String(problem.difficulty),
    points: Number(problem.points || 100),
    time_limit: Number(problem.time_limit || 2.0),
    day: Number(problem.day || 4),
    starter_python: String(problem.starter_python || ""),
    starter_java: String(problem.starter_java || ""),
    starter_cpp: String(problem.starter_cpp || ""),
    starter_javascript: String(problem.starter_javascript || "")
  };

  return (
    <ProblemWorkspace
      problem={formattedProblem}
      sampleTestcases={sampleTestcases}
    />
  );
}
