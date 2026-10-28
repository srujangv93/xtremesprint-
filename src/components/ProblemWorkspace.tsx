"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Play, Send, RotateCcw, Copy, Check, CheckCircle2, XCircle } from "lucide-react";
import CodeEditor from "./CodeEditor";
import { getDayMeta } from "@/lib/schedule";

interface ProblemWorkspaceProps {
  problem: {
    id: number;
    slug: string;
    title: string;
    description: string;
    difficulty: string;
    points: number;
    day?: number;
    time_limit: number;
    starter_python: string;
    starter_java: string;
    starter_cpp: string;
    starter_javascript: string;
  };
  sampleTestcases: Array<{
    id: number;
    input_data: string;
    expected_output: string;
  }>;
}

export default function ProblemWorkspace({
  problem,
  sampleTestcases
}: ProblemWorkspaceProps) {
  const dayMeta = getDayMeta(problem.day || 4);
  const isLocked = dayMeta.status === "locked";
  const isPractice = dayMeta.status === "ended";

  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"description" | "results">("description");
  const [activeTestcaseIndex, setActiveTestcaseIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Resizable split state (default 46% left, 54% right)
  const [splitPercent, setSplitPercent] = useState<number>(46);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(typeof window !== "undefined" ? window.innerWidth >= 768 : true);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const getStarterCode = (lang: string) => {
    switch (lang) {
      case "python":
        return problem.starter_python || "# Python 3\n";
      case "java":
        return (
          problem.starter_java ||
          "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Solution\n    }\n}\n"
        );
      case "cpp":
        return (
          problem.starter_cpp ||
          "#include <iostream>\n\nusing namespace std;\n\nint main() {\n    // Solution\n    return 0;\n}\n"
        );
      case "javascript":
        return problem.starter_javascript || "// Node.js\n";
      default:
        return "";
    }
  };

  useEffect(() => {
    const savedCodeKey = `code_${problem.slug}_${language}`;
    const saved = localStorage.getItem(savedCodeKey);
    if (saved) {
      setCode(saved);
    } else {
      setCode(getStarterCode(language));
    }
  }, [language, problem.slug]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
  };

  const handleResetCode = async () => {
    if (confirm("Reset editor to default template?")) {
      try {
        const res = await fetch(`/api/problems/${problem.slug}`);
        if (res.ok) {
          const fresh = await res.json();
          let defaultCode = "";
          if (language === "python") defaultCode = fresh.starter_python;
          else if (language === "java") defaultCode = fresh.starter_java;
          else if (language === "cpp") defaultCode = fresh.starter_cpp;
          else if (language === "javascript") defaultCode = fresh.starter_javascript;

          if (defaultCode) {
            setCode(defaultCode);
            localStorage.setItem(`code_${problem.slug}_${language}`, defaultCode);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh template:", err);
      }

      const defaultCode = getStarterCode(language);
      setCode(defaultCode);
      localStorage.setItem(`code_${problem.slug}_${language}`, defaultCode);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    localStorage.setItem(`code_${problem.slug}_${language}`, newCode);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setSubmissionFeedback(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          code
        })
      });

      if (!res.ok) {
        if (res.status === 504) {
          alert("Judge server timed out due to heavy traffic. Please wait a moment and run again.");
          return;
        }
        const errData = await res.json().catch(() => null);
        alert(errData?.error || `Execution failed (HTTP ${res.status}).`);
        return;
      }

      const data = await res.json();
      setEvaluationResult(data);
      setActiveTab("results");
    } catch (err: any) {
      alert("Execution error: " + (err.message || "Failed to reach judge server."));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    let username = "Team";
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(^| )team_name=([^;]+)/);
      username = match ? decodeURIComponent(match[2]) : localStorage.getItem("team_name") || "Team";
    }
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          code,
          username
        })
      });

      if (!res.ok) {
        if (res.status === 504) {
          alert("Submission timed out on the judge server due to high traffic. Please retry your submission.");
          return;
        }
        const errData = await res.json().catch(() => null);
        alert(errData?.error || `Submission failed (HTTP ${res.status}).`);
        return;
      }

      const data = await res.json();
      setEvaluationResult(data);
      setSubmissionFeedback(data);
      setActiveTab("results");
    } catch (err: any) {
      alert("Submission error: " + (err.message || "Failed to communicate with judge server."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Drag handler for panel resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 28 && newPercent <= 72) {
        setSplitPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-49px)] overflow-hidden bg-[#09090b]">
      {/* Top Navigation & Action Bar */}
      <div className="bg-[#0e0e12] border-b border-[#1f1f24] px-5 py-2.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white transition px-2 py-1 rounded hover:bg-zinc-800/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Problemset</span>
          </Link>
          <span className="text-zinc-600 font-mono">/</span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-white tracking-tight">
              {problem.title}
            </h1>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded font-medium ${
                problem.difficulty === "Easy"
                  ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
                  : problem.difficulty === "Medium"
                  ? "bg-amber-950/70 text-amber-400 border border-amber-800/60"
                  : "bg-rose-950/70 text-rose-400 border border-rose-800/60"
              }`}
            >
              {problem.difficulty}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#1e1e24] border border-[#2e2e38] text-blue-300">
              Day {problem.day || 4}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${dayMeta.badgeColor}`}>
              {dayMeta.statusLabel}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <select
            value={language}
            disabled={isLocked}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#18181c] border border-zinc-700/80 rounded-md px-3 py-1.5 text-sm font-mono text-zinc-100 hover:border-zinc-500 focus:outline-none focus:border-white transition cursor-pointer disabled:opacity-50"
          >
            <option value="python">Python 3 (3.12)</option>
            <option value="java">Java 17</option>
            <option value="cpp">C++ 14 (GCC)</option>
            <option value="javascript">JavaScript (Node.js)</option>
          </select>

          {/* Reset Template */}
          <button
            onClick={handleResetCode}
            disabled={isLocked}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-zinc-800/60 transition disabled:opacity-40"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Run Code */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting || isLocked}
            className="flex items-center gap-1.5 text-sm font-semibold font-mono border border-zinc-700 bg-[#16161a] hover:bg-[#202025] hover:border-zinc-500 text-zinc-200 hover:text-white px-4 py-1.5 rounded-md transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isLocked ? "Locked" : isRunning ? "Testing..." : "Run Tests"}</span>
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmitCode}
            disabled={isRunning || isSubmitting || isLocked}
            className="flex items-center gap-1.5 text-sm font-semibold font-mono bg-white hover:bg-zinc-200 text-black px-5 py-1.5 rounded-md transition disabled:opacity-50 shadow-sm"
          >
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>{isLocked ? "Locked" : isSubmitting ? "Evaluating..." : isPractice ? "Submit (Practice)" : "Submit Solution"}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Split */}
      <div ref={containerRef} className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Pane: Problem Description & Test Console */}
        <div
          style={isDesktop ? { width: `${splitPercent}%` } : undefined}
          className="w-full md:h-full flex flex-col bg-[#09090b] min-h-0 overflow-hidden border-r border-[#1f1f24]"
        >
          {/* Tab Navigation */}
          <div className="flex items-center gap-8 border-b border-[#1f1f24] bg-[#0c0c0f] px-6 text-sm font-medium shrink-0 select-none">
            <button
              onClick={() => setActiveTab("description")}
              className={`py-3 border-b-2 transition ${
                activeTab === "description"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Statement
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`py-3 border-b-2 transition flex items-center gap-2 ${
                activeTab === "results"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>Test Console</span>
              {evaluationResult && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    evaluationResult.all_passed ? "bg-emerald-400" : "bg-rose-400"
                  }`}
                />
              )}
            </button>
          </div>

          {/* Pane Content */}
          <div className="flex-1 overflow-y-auto px-6 py-7 lg:px-8">
            {activeTab === "description" ? (
              <div className="w-full space-y-6 text-[#d4d4d8]">
                {/* Title & Metadata Pills */}
                <div className="border-b border-[#1f1f24] pb-5">
                  <h2 className="text-3xl font-bold text-white tracking-tight mb-3.5">
                    {problem.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
                    <span
                      className={`px-2.5 py-1 rounded font-medium ${
                        problem.difficulty === "Easy"
                          ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
                          : problem.difficulty === "Medium"
                          ? "bg-amber-950/70 text-amber-400 border border-amber-800/60"
                          : "bg-rose-950/70 text-rose-400 border border-rose-800/60"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#1e1e24] border border-[#2e2e38] text-blue-300 font-medium">
                      Day {problem.day || 4}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#16161a] border border-zinc-800 text-zinc-300 font-medium">
                      Points: <strong className="text-white">{isPractice ? `0 (${problem.points})` : problem.points}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#16161a] border border-zinc-800 text-zinc-300 font-medium">
                      Time Limit: <strong className="text-white">{problem.time_limit}s</strong>
                    </span>
                  </div>
                </div>

                {/* Day Schedule Notice */}
                {isLocked && (
                  <div className="p-4 rounded-lg border border-zinc-700 bg-zinc-900/90 text-zinc-300 text-xs font-mono flex items-start gap-3">
                    <span className="text-base">🔒</span>
                    <div className="space-y-1">
                      <span className="font-bold text-white block">Day {problem.day || 4} Challenge Locked</span>
                      <p className="text-zinc-400 leading-relaxed">
                        This challenge is scheduled for {dayMeta.dateStr} and unlocks at <strong>8:00 AM IST</strong>. Viewing and editing code are temporarily disabled.
                      </p>
                    </div>
                  </div>
                )}

                {isPractice && (
                  <div className="p-4 rounded-lg border border-amber-800/60 bg-amber-950/30 text-amber-300 text-xs font-mono flex items-start gap-3">
                    <span className="text-base">⚡</span>
                    <div className="space-y-1">
                      <span className="font-bold text-amber-200 block">Practice Mode Active</span>
                      <p className="text-amber-300/80 leading-relaxed">
                        Day {problem.day || 4} contest officially ended at 9:00 PM IST. You can still test and submit solutions freely for practice, but <strong>0 points</strong> will be awarded to the live leaderboard.
                      </p>
                    </div>
                  </div>
                )}

                {/* Markdown Problem Description */}
                <div className="text-base leading-relaxed text-zinc-200">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider mt-7 mb-3 border-b border-zinc-800/80 pb-1.5">
                          {children}
                        </h3>
                      ),
                      h2: ({ children }) => (
                        <h3 className="text-base font-bold text-white uppercase tracking-wider mt-7 mb-3 border-b border-zinc-800/80 pb-1.5">
                          {children}
                        </h3>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-bold text-white uppercase tracking-wider mt-6 mb-3 border-b border-zinc-800/80 pb-1.5">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1.5 my-3 pl-1 text-zinc-300">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1.5 my-3 pl-1 text-zinc-300">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      code: ({ children }) => (
                        <code className="bg-[#18181c] border border-zinc-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono text-sm">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-[#141418] border border-zinc-800 p-3.5 rounded-lg font-mono text-sm text-zinc-100 overflow-x-auto my-3">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {problem.description}
                  </ReactMarkdown>
                </div>

                {/* Sample test cases */}
                {sampleTestcases.length > 0 && (
                  <div className="space-y-4 pt-6 border-t border-[#1f1f24]">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                      Sample Test Cases
                    </h3>
                    <div className="space-y-4">
                      {sampleTestcases.map((stc, idx) => (
                        <div
                          key={stc.id}
                          className="border border-[#222227] rounded-lg bg-[#111114] p-4 space-y-3.5"
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                            <span>Case {idx + 1}</span>
                            <button
                              onClick={() => copyToClipboard(stc.input_data, idx)}
                              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 transition"
                              title="Copy input"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Input</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                              Input:
                            </span>
                            <pre className="text-sm font-mono text-zinc-100 bg-[#16161a] border border-zinc-800/80 p-3 rounded-md overflow-x-auto leading-relaxed">
                              {stc.input_data}
                            </pre>
                          </div>

                          <div>
                            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                              Expected Output:
                            </span>
                            <pre className="text-sm font-mono text-emerald-400 bg-[#16161a] border border-zinc-800/80 p-3 rounded-md overflow-x-auto leading-relaxed">
                              {stc.expected_output}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Results console */
              <div className="w-full space-y-6">
                {submissionFeedback && (
                  <div
                    className={`p-5 rounded-lg border font-mono text-sm space-y-2 ${
                      submissionFeedback.all_passed
                        ? "bg-[#0b1d12] border-emerald-800/70 text-emerald-300"
                        : "bg-[#200e12] border-rose-800/70 text-rose-300"
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-base tracking-tight flex items-center gap-2">
                        {submissionFeedback.all_passed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400" />
                        )}
                        VERDICT: {submissionFeedback.status.toUpperCase()}
                      </span>
                      <span className="font-bold text-base">
                        {submissionFeedback.score} / {problem.points} PTS
                      </span>
                    </div>
                    {submissionFeedback.practice_notice && (
                      <div className="text-xs text-amber-300 font-mono bg-amber-950/50 p-2.5 rounded border border-amber-800/60 flex items-center gap-2">
                        <span>⚡</span>
                        <span>{submissionFeedback.practice_notice}</span>
                      </div>
                    )}
                    <div className="text-xs opacity-90">
                      Passed {submissionFeedback.passed_count} of {submissionFeedback.total_count} test cases ({submissionFeedback.total_time}s)
                    </div>
                  </div>
                )}

                {evaluationResult ? (
                  <div className="space-y-5">
                    {/* Testcase selector */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#1f1f24]">
                      {evaluationResult.results.map((res: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveTestcaseIndex(idx)}
                          className={`px-3.5 py-1.5 text-xs font-mono rounded-md transition flex items-center gap-1.5 ${
                            activeTestcaseIndex === idx
                              ? "bg-zinc-700 text-white font-medium"
                              : "bg-[#141418] text-zinc-400 hover:text-white border border-zinc-800"
                          }`}
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              res.passed ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                          <span>Case {idx + 1}</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Case Details */}
                    {evaluationResult.results[activeTestcaseIndex] && (() => {
                      const activeCase = evaluationResult.results[activeTestcaseIndex];
                      const isSample = Boolean(activeCase.is_sample);
                      return (
                        <div className="border border-[#222227] rounded-lg bg-[#111114] p-5 space-y-4 font-mono text-sm">
                          <div className="flex items-baseline justify-between pb-3 border-b border-zinc-800">
                            <span className="text-zinc-300">
                              Status:{" "}
                              <strong
                                className={
                                  activeCase.passed
                                    ? "text-emerald-400 font-bold"
                                    : "text-rose-400 font-bold"
                                }
                              >
                                {activeCase.status}
                              </strong>
                            </span>
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded font-mono border ${
                                  isSample
                                    ? "bg-[#102416] text-emerald-300 border-emerald-900/60"
                                    : "bg-[#181820] text-zinc-400 border-zinc-800"
                                }`}
                              >
                                {isSample ? "Sample" : "Hidden"}
                              </span>
                              <span className="text-zinc-500 text-xs">
                                {activeCase.time}s
                              </span>
                            </div>
                          </div>

                          {isSample ? (
                            <>
                              <div>
                                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Input</div>
                                <pre className="bg-[#16161a] border border-zinc-800/80 p-3 rounded-md text-zinc-100 overflow-x-auto text-sm leading-relaxed">
                                  {activeCase.input}
                                </pre>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Your Output</div>
                                <pre className="bg-[#16161a] border border-zinc-800/80 p-3 rounded-md text-zinc-100 overflow-x-auto text-sm leading-relaxed">
                                  {activeCase.actual_output || "(empty output)"}
                                </pre>
                              </div>

                              <div>
                                <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5">Expected Output</div>
                                <pre className="bg-[#16161a] border border-zinc-800/80 p-3 rounded-md text-emerald-400 overflow-x-auto text-sm leading-relaxed">
                                  {activeCase.expected_output}
                                </pre>
                              </div>
                            </>
                          ) : (
                            <div className="bg-[#141417] border border-zinc-800/80 rounded-md p-4 text-xs text-zinc-400 space-y-1">
                              <p className="font-semibold text-zinc-300">Confidential Test Case</p>
                              <p>Test input and expected output are masked to preserve contest fairness.</p>
                            </div>
                          )}

                          {activeCase.stderr && (
                            <div>
                              <div className="text-xs text-rose-400 uppercase tracking-wider mb-1.5">Runtime / Compile Error</div>
                              <pre className="bg-[#1d0d10] border border-rose-900/60 p-3 rounded-md text-rose-300 overflow-x-auto text-sm whitespace-pre-wrap leading-relaxed">
                                {activeCase.stderr}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="py-24 text-center font-mono text-sm text-zinc-500 space-y-2">
                    <p className="text-zinc-400 font-medium">No tests executed yet.</p>
                    <p className="text-xs text-zinc-600">
                      Use &quot;Run Tests&quot; for sample validation or &quot;Submit Solution&quot; for scoring.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={`hidden md:flex w-2 bg-[#141418] hover:bg-zinc-500 active:bg-zinc-400 cursor-col-resize items-center justify-center transition-colors border-x border-[#1f1f24] shrink-0 ${
            isDragging ? "bg-zinc-400" : ""
          }`}
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-8 bg-zinc-600 rounded-full" />
        </div>

        {/* Right Pane: Native Code Editor or Locked Message */}
        <div
          style={isDesktop ? { width: `calc(100% - ${splitPercent}% - 8px)` } : undefined}
          className="w-full md:h-full flex flex-col min-h-0 overflow-hidden"
        >
          {isLocked ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#0d0d11]">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-3xl mb-4">
                🔒
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Challenge Locked</h3>
              <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
                This challenge belongs to <strong>Day {problem.day || 4}</strong> ({dayMeta.dateStr}) and unlocks tomorrow morning at <strong>8:00 AM IST</strong>. Viewing and editing code are disabled until the challenge officially opens.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#18181b] border border-zinc-700 text-xs font-mono text-white hover:border-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Arena
              </Link>
            </div>
          ) : (
            <CodeEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
