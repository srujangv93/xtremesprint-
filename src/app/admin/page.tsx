"use client";

import { useState, useEffect, useRef } from "react";
import { parseTestCasesZip, ParsedTestCase } from "@/lib/zipParser";

interface ProblemItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  day: number;
  timeLimit: number;
  testcaseCount: number;
  submissionCount: number;
  starterPython: string;
  starterJava: string;
  starterCpp: string;
  starterJavascript: string;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [editingProblemId, setEditingProblemId] = useState<number | null>(null);

  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [testCaseMode, setTestCaseMode] = useState<"zip" | "manual">("zip");
  const [zipTestCases, setZipTestCases] = useState<ParsedTestCase[]>([]);
  const [zipParsing, setZipParsing] = useState(false);
  const [zipError, setZipError] = useState("");
  const [replaceTestcases, setReplaceTestcases] = useState(false);
  const [starterTab, setStarterTab] = useState<"python" | "java" | "cpp" | "javascript">("python");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultForm = {
    title: "",
    slug: "",
    difficulty: "Easy",
    points: 100,
    day: 4,
    timeLimit: 2.0,
    description: "",
    sampleInput: "",
    sampleOutput: "",
    hiddenInput: "",
    hiddenOutput: "",
    starterPython: "# Python 3\nimport sys\n\ndef solve():\n    pass\n\nif __name__ == '__main__':\n    solve()\n",
    starterJava: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Solution\n    }\n}\n",
    starterCpp: "#include <iostream>\n\nusing namespace std;\n\nint main() {\n    // Solution\n    return 0;\n}\n",
    starterJavascript: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n\n// Solution\n"
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/auth");
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        fetchProblems();
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchProblems = async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/problems");
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
      }
    } catch (err) {
      console.error("Failed to load problems", err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok) {
        setIsAuthenticated(true);
        setPasswordInput("");
        fetchProblems();
      } else {
        setLoginError(data.error || "Incorrect password");
      }
    } catch {
      setLoginError("Connection error");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setIsAuthenticated(false);
  };

  // Start creating a new challenge
  const handleAddNew = () => {
    setEditingProblemId(null);
    setForm(defaultForm);
    setZipTestCases([]);
    setSuccessMsg("");
    setErrorMsg("");
    setViewMode("form");
  };

  // Edit existing challenge
  const handleEdit = (prob: ProblemItem) => {
    setEditingProblemId(prob.id);
    setForm({
      title: prob.title,
      slug: prob.slug,
      difficulty: prob.difficulty,
      points: prob.points,
      day: prob.day || 4,
      timeLimit: prob.timeLimit,
      description: prob.description,
      sampleInput: "",
      sampleOutput: "",
      hiddenInput: "",
      hiddenOutput: "",
      starterPython: prob.starterPython || defaultForm.starterPython,
      starterJava: prob.starterJava || defaultForm.starterJava,
      starterCpp: prob.starterCpp || defaultForm.starterCpp,
      starterJavascript: prob.starterJavascript || defaultForm.starterJavascript
    });
    setZipTestCases([]);
    setReplaceTestcases(false);
    setSuccessMsg("");
    setErrorMsg("");
    setViewMode("form");
  };

  // Delete challenge
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/problems?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSuccessMsg(`Deleted "${title}".`);
        fetchProblems();
      } else {
        const d = await res.json();
        setErrorMsg(d.error || "Failed to delete.");
      }
    } catch {
      setErrorMsg("Network error deleting challenge.");
    }
  };

  const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setZipParsing(true);
    setZipError("");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await parseTestCasesZip(arrayBuffer);

      if (extracted.length === 0) {
        setZipError(
          "No matching test case pairs found in archive. Ensure files use .in/.out or input01.txt/output01.txt pairings."
        );
      } else {
        setZipTestCases(extracted);
      }
    } catch (err: any) {
      setZipError(`Failed to extract archive: ${err.message || "Invalid zip format"}`);
    } finally {
      setZipParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleSample = (index: number) => {
    const updated = [...zipTestCases];
    updated[index].is_sample = !updated[index].is_sample;
    setZipTestCases(updated);
  };

  const removeZipTestCase = (index: number) => {
    setZipTestCases(zipTestCases.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const isEditing = editingProblemId !== null;
      const payload: any = {
        ...form,
        points: Number(form.points) || 100,
        day: Number(form.day) || 4,
        timeLimit: Number(form.timeLimit) || 2.0,
        id: editingProblemId,
        replaceTestcases
      };

      if (testCaseMode === "zip" && zipTestCases.length > 0) {
        payload.customTestcases = zipTestCases;
      }

      const res = await fetch("/api/admin/problems", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(
          isEditing
            ? `Challenge "${form.title}" updated successfully.`
            : `Challenge "${form.title}" published successfully.`
        );
        fetchProblems();
        setViewMode("list");
      } else {
        setErrorMsg(data.error || "Failed to save problem");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-[#71717a] font-mono text-xs">
        Verifying authorization...
      </div>
    );
  }

  // Login Gate
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-sm w-full border border-[#27272a] rounded-lg p-8 bg-[#0e0e11] space-y-6">
          <div className="space-y-1">
            <h1 className="text-lg font-medium text-white tracking-tight">
              Administrative Access
            </h1>
            <p className="text-xs text-[#71717a] font-mono">
              Provide passkey to manage challenges and test suites.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded border border-rose-950 bg-[#1f0e10] text-rose-300 font-mono text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3 font-mono text-xs">
            <input
              type="password"
              required
              placeholder="Admin passkey"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-white focus:outline-none focus:border-[#52525b]"
              autoFocus
            />

            <button
              type="submit"
              className="w-full bg-white hover:bg-[#e4e4e7] text-black font-medium py-2 rounded transition"
            >
              Authenticate &rarr;
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full space-y-10">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-baseline justify-between gap-4 border-b border-[#27272a] pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Challenge Management
          </h1>
          <p className="text-xs text-[#a1a1aa] font-mono">
            View, author, and edit competition problems stored in Turso libSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === "form" ? (
            <button
              onClick={() => setViewMode("list")}
              className="text-xs font-mono text-[#a1a1aa] hover:text-white border border-[#27272a] px-3.5 py-1.5 rounded transition"
            >
              &larr; Back to Challenges
            </button>
          ) : (
            <button
              onClick={handleAddNew}
              className="text-xs font-mono font-medium bg-white hover:bg-[#e4e4e7] text-black px-4 py-2 rounded transition"
            >
              + Add Challenge
            </button>
          )}

          <button
            onClick={handleLogout}
            className="text-xs font-mono text-[#71717a] hover:text-white border border-[#27272a] hover:border-[#3f3f46] px-3 py-1.5 rounded transition"
          >
            Lock Session
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded border border-emerald-950 bg-[#0e1c12] text-emerald-300 font-mono text-xs">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded border border-rose-950 bg-[#1c0e10] text-rose-300 font-mono text-xs">
          {errorMsg}
        </div>
      )}

      {/* VIEW 1: CHALLENGES LIST */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <div className="flex items-baseline justify-between border-b border-[#27272a] pb-3">
            <h2 className="text-sm font-mono uppercase tracking-wider text-[#a1a1aa]">
              Published Challenges ({problems.length})
            </h2>
            <button
              onClick={fetchProblems}
              disabled={loadingList}
              className="text-xs font-mono text-[#71717a] hover:text-white"
            >
              {loadingList ? "Refreshing..." : "Refresh List"}
            </button>
          </div>

          <div className="border border-[#27272a] rounded-lg overflow-hidden bg-[#0e0e11]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-[#1f1f23] text-[#71717a] uppercase text-[11px] bg-[#121215]">
                  <tr>
                    <th className="py-3 px-5 w-16">#</th>
                    <th className="py-3 px-5 w-20">Day</th>
                    <th className="py-3 px-5">Title</th>
                    <th className="py-3 px-5 w-28">Difficulty</th>
                    <th className="py-3 px-5 w-24">Points</th>
                    <th className="py-3 px-5 w-28">Test Cases</th>
                    <th className="py-3 px-5 w-28">Submissions</th>
                    <th className="py-3 px-5 w-36 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f23]">
                  {problems.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-[#141417] text-[#d4d4d8]">
                      <td className="py-4 px-5 text-[#71717a]">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-4 px-5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#1e1e24] border border-[#2e2e38] text-blue-300">
                          Day {p.day || 4}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-sans font-medium text-white text-sm">
                        {p.title}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`text-[11px] uppercase ${
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
                      <td className="py-4 px-5 text-[#a1a1aa]">{p.points}</td>
                      <td className="py-4 px-5 text-[#a1a1aa]">{p.testcaseCount}</td>
                      <td className="py-4 px-5 text-[#a1a1aa]">{p.submissionCount}</td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="px-2.5 py-1 text-xs text-white border border-[#27272a] hover:border-white rounded bg-[#18181b] transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.title)}
                          className="px-2.5 py-1 text-xs text-rose-400 border border-rose-950/60 hover:border-rose-700 rounded bg-[#1a0f12] transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {problems.length === 0 && !loadingList && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-[#71717a]">
                        No challenges currently stored in database. Click &quot;+ Add Challenge&quot; to author one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AUTHOR / EDIT FORM */}
      {viewMode === "form" && (
        <form onSubmit={handleSubmit} className="space-y-8 border border-[#27272a] p-8 rounded-lg bg-[#0e0e11] max-w-4xl">
          <div className="flex items-baseline justify-between border-b border-[#1f1f23] pb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {editingProblemId !== null ? `Edit Challenge: ${form.title}` : "Add New Challenge"}
            </h2>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="text-xs font-mono text-[#71717a] hover:text-white"
            >
              Cancel
            </button>
          </div>

          {/* Row 1: Title & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Problem Title
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Invert Binary Tree"
                className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#52525b]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#52525b] cursor-pointer"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Row 2: Contest Day, Points & Time Limit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Contest Day (1 – 14)
              </label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) || 4 })}
                className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#52525b] cursor-pointer"
              >
                {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d} {d === 4 ? "(Today · Oct 19)" : d === 5 ? "(Tomorrow · Oct 20)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Points Awarded
              </label>
              <input
                type="number"
                value={form.points}
                onChange={(e) => setForm({ ...form, points: e.target.value === "" ? ("" as any) : parseInt(e.target.value) || 0 })}
                className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#52525b]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                step="0.5"
                value={form.timeLimit}
                onChange={(e) => setForm({ ...form, timeLimit: e.target.value === "" ? ("" as any) : parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#141417] border border-[#27272a] rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#52525b]"
              />
            </div>
          </div>

          {/* Problem Statement */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
              Problem Statement (Markdown)
            </label>
            <textarea
              required
              rows={8}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe problem, input specification, output specification, and constraints..."
              className="w-full bg-[#141417] border border-[#27272a] rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-[#52525b] leading-relaxed"
            />
          </div>

          {/* Starter Code Templates */}
          <div className="space-y-3 pt-6 border-t border-[#1f1f23]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa]">
                Starter Code Templates (Optional)
              </label>
              <div className="flex items-center gap-1 bg-[#121215] border border-[#27272a] p-1 rounded text-xs font-mono">
                {(["python", "java", "cpp", "javascript"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStarterTab(lang)}
                    className={`px-2.5 py-1 rounded transition uppercase text-[11px] ${
                      starterTab === lang
                        ? "bg-white text-black font-semibold"
                        : "text-[#71717a] hover:text-white"
                    }`}
                  >
                    {lang === "javascript" ? "JS" : lang}
                  </button>
                ))}
              </div>
            </div>

            {starterTab === "python" && (
              <textarea
                rows={6}
                value={form.starterPython}
                onChange={(e) => setForm({ ...form, starterPython: e.target.value })}
                placeholder="# Python 3 starter template with driver code"
                className="w-full bg-[#141417] border border-[#27272a] rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-[#52525b] leading-relaxed"
              />
            )}
            {starterTab === "java" && (
              <textarea
                rows={6}
                value={form.starterJava}
                onChange={(e) => setForm({ ...form, starterJava: e.target.value })}
                placeholder="// Java 17 starter template with class Main"
                className="w-full bg-[#141417] border border-[#27272a] rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-[#52525b] leading-relaxed"
              />
            )}
            {starterTab === "cpp" && (
              <textarea
                rows={6}
                value={form.starterCpp}
                onChange={(e) => setForm({ ...form, starterCpp: e.target.value })}
                placeholder="// C++ starter template with main function"
                className="w-full bg-[#141417] border border-[#27272a] rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-[#52525b] leading-relaxed"
              />
            )}
            {starterTab === "javascript" && (
              <textarea
                rows={6}
                value={form.starterJavascript}
                onChange={(e) => setForm({ ...form, starterJavascript: e.target.value })}
                placeholder="// JavaScript Node.js starter template"
                className="w-full bg-[#141417] border border-[#27272a] rounded p-3 text-xs font-mono text-white focus:outline-none focus:border-[#52525b] leading-relaxed"
              />
            )}
          </div>

          {/* Test Case Suite */}
          <div className="pt-6 border-t border-[#1f1f23] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[#a1a1aa] block">
                  {editingProblemId !== null ? "Update Test Cases (Optional)" : "Test Suite Specification"}
                </span>
                {editingProblemId !== null && (
                  <label className="inline-flex items-center gap-2 mt-1 cursor-pointer font-mono text-xs text-[#a1a1aa]">
                    <input
                      type="checkbox"
                      checked={replaceTestcases}
                      onChange={(e) => setReplaceTestcases(e.target.checked)}
                      className="rounded bg-[#141417] border-[#27272a]"
                    />
                    <span>Replace existing test cases with new upload</span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setTestCaseMode("zip")}
                  className={`px-3 py-1 rounded transition ${
                    testCaseMode === "zip"
                      ? "bg-white text-black font-medium"
                      : "text-[#71717a] hover:text-white"
                  }`}
                >
                  Archive (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => setTestCaseMode("manual")}
                  className={`px-3 py-1 rounded transition ${
                    testCaseMode === "manual"
                      ? "bg-white text-black font-medium"
                      : "text-[#71717a] hover:text-white"
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {testCaseMode === "zip" ? (
              <div className="space-y-4">
                <div className="border border-dashed border-[#27272a] hover:border-[#3f3f46] rounded-lg p-6 text-center bg-[#121215] transition">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".zip"
                    onChange={handleZipFileChange}
                    className="hidden"
                    id="admin-zip-input"
                  />
                  <label
                    htmlFor="admin-zip-input"
                    className="cursor-pointer space-y-2 block"
                  >
                    <div className="text-sm text-white font-medium">
                      {zipParsing ? "Extracting archive..." : "Select or drop testcase archive (.zip)"}
                    </div>
                    <p className="text-xs text-[#71717a] font-mono max-w-md mx-auto">
                      Pairs matching <code>.in</code>/<code>.out</code> or <code>input*.txt</code>/<code>output*.txt</code>. Files with &quot;sample&quot; are automatically marked visible.
                    </p>
                  </label>
                </div>

                {zipError && (
                  <div className="p-3 rounded border border-rose-950 bg-[#1c0e10] text-rose-300 font-mono text-xs">
                    {zipError}
                  </div>
                )}

                {zipTestCases.length > 0 && (
                  <div className="border border-[#27272a] rounded bg-[#121215] p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
                      <span className="text-[#a1a1aa]">
                        Parsed Cases: {zipTestCases.length}
                      </span>
                      <span className="text-[#71717a]">
                        {zipTestCases.filter((c) => c.is_sample).length} visible sample &middot;{" "}
                        {zipTestCases.filter((c) => !c.is_sample).length} hidden
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {zipTestCases.map((tc, idx) => (
                        <div
                          key={tc.id}
                          className="bg-[#18181b] border border-[#27272a] p-2.5 rounded flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-white">{tc.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleSample(idx)}
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                                tc.is_sample
                                  ? "bg-[#102416] text-emerald-300 border border-emerald-900/60"
                                  : "bg-[#181820] text-[#a1a1aa] border border-[#27272a]"
                              }`}
                            >
                              {tc.is_sample ? "Sample" : "Hidden"}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeZipTestCase(idx)}
                            className="text-[#71717a] hover:text-rose-400 px-2 py-0.5"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 font-mono text-xs">
                <div className="border border-[#27272a] rounded p-4 bg-[#121215] space-y-3">
                  <div className="text-[11px] uppercase text-[#a1a1aa]">Sample Case (Visible)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#71717a] block mb-1">Input</label>
                      <textarea
                        rows={3}
                        value={form.sampleInput}
                        onChange={(e) => setForm({ ...form, sampleInput: e.target.value })}
                        placeholder="e.g. 4\n2 7 11 15\n9"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#71717a] block mb-1">Expected Output</label>
                      <textarea
                        rows={3}
                        value={form.sampleOutput}
                        onChange={(e) => setForm({ ...form, sampleOutput: e.target.value })}
                        placeholder="e.g. 0 1"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-[#27272a] rounded p-4 bg-[#121215] space-y-3">
                  <div className="text-[11px] uppercase text-[#a1a1aa]">Hidden Case (Evaluation)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#71717a] block mb-1">Input</label>
                      <textarea
                        rows={3}
                        value={form.hiddenInput}
                        onChange={(e) => setForm({ ...form, hiddenInput: e.target.value })}
                        placeholder="e.g. 5\n-1 -2 -3 -4 -5\n-8"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#71717a] block mb-1">Expected Output</label>
                      <textarea
                        rows={3}
                        value={form.hiddenOutput}
                        onChange={(e) => setForm({ ...form, hiddenOutput: e.target.value })}
                        placeholder="e.g. 2 4"
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-[#1f1f23] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="text-xs font-mono text-[#71717a] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || zipParsing}
              className="font-mono text-xs font-medium bg-white hover:bg-[#e4e4e7] text-black px-6 py-2.5 rounded transition disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : editingProblemId !== null
                ? "Update Challenge"
                : "Publish Challenge"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
