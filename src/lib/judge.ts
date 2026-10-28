export interface Testcase {
  id: number;
  problem_id?: number;
  input_data: string;
  expected_output: string;
  is_sample: number;
}

export interface TestResult {
  testcase_id: number;
  is_sample: number;
  input: string;
  expected_output: string;
  actual_output: string;
  stderr: string;
  status: string;
  passed: boolean;
  time: number;
}

export interface EvaluationResult {
  status: string;
  all_passed: boolean;
  passed_count: number;
  total_count: number;
  total_time: number;
  results: TestResult[];
  score?: number;
}

const LANGUAGE_IDS: Record<string, number> = {
  python: 100,      // Python 3.12.5
  java: 91,         // Java (JDK 17.0.6)
  cpp: 105,         // C++ (GCC 14.1.0)
  javascript: 102   // JavaScript (Node.js 22.08)
};

const JUDGE0_URL = process.env.JUDGE0_API_URL || "https://ce.judge0.com";

function normalize(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => {
      const trimmedLine = line.trimEnd();
      const normalizedLine = trimmedLine.replace(/\[\s*/g, "[").replace(/\s*\]/g, "]").replace(/\s*,\s*/g, ",");
      return /^(true|false)$/i.test(normalizedLine)
        ? normalizedLine.toLowerCase()
        : normalizedLine;
    })
    .join("\n");
}

export async function executeSingleTest(
  code: string,
  language: string,
  stdin: string,
  timeoutSeconds = 5.0
): Promise<{
  status: string;
  stdout: string;
  stderr: string;
  time: number;
  memory: number;
}> {
  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    return {
      status: "Language Not Supported",
      stdout: "",
      stderr: `Language "${language}" is not supported. Choose python, java, cpp, or javascript.`,
      time: 0,
      memory: 0
    };
  }

  const payload = {
    language_id: langId,
    source_code: code,
    stdin: stdin ? stdin.replace(/\r\n/g, "\n") : "",
    cpu_time_limit: Math.min(timeoutSeconds, 5.0)
  };

  try {
    const res = await fetch(`${JUDGE0_URL}/submissions?wait=true`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Judge0 responded with HTTP ${res.status}`);
    }

    const data = await res.json();
    const statusDesc = data.status?.description || "Unknown";
    const stdout = data.stdout || "";
    const stderr = data.stderr || data.compile_output || "";
    const execTime = parseFloat(data.time || "0.0");
    const memory = data.memory || 0;

    return {
      status: statusDesc,
      stdout,
      stderr,
      time: execTime,
      memory
    };
  } catch (err: any) {
    return {
      status: "Judge Error",
      stdout: "",
      stderr: err.message || "Failed to reach judge execution server",
      time: 0,
      memory: 0
    };
  }
}

export async function evaluateCode(
  code: string,
  language: string,
  testcases: Testcase[]
): Promise<EvaluationResult> {
  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    return {
      status: "Language Not Supported",
      all_passed: false,
      passed_count: 0,
      total_count: testcases.length,
      total_time: 0,
      results: testcases.map((tc) => ({
        testcase_id: tc.id,
        is_sample: tc.is_sample,
        input: tc.input_data,
        expected_output: tc.expected_output,
        actual_output: "",
        stderr: `Language "${language}" is not supported. Choose python, java, cpp, or javascript.`,
        status: "Language Not Supported",
        passed: false,
        time: 0
      }))
    };
  }

  if (testcases.length === 0) {
    return {
      status: "No Test Cases",
      all_passed: false,
      passed_count: 0,
      total_count: 0,
      total_time: 0,
      results: []
    };
  }

  // 1. Submit all test cases as a parallel batch to Judge0
  const submissions = testcases.map((tc) => ({
    language_id: langId,
    source_code: code,
    stdin: tc.input_data ? tc.input_data.replace(/\r\n/g, "\n") : "",
    cpu_time_limit: 3.0
  }));

  let tokens: string[] = [];
  try {
    const postRes = await fetch(`${JUDGE0_URL}/submissions/batch?base64_encoded=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissions }),
      signal: AbortSignal.timeout(12000)
    });

    if (!postRes.ok) {
      throw new Error(`Judge server returned HTTP ${postRes.status}`);
    }

    const postData = await postRes.json();
    if (!Array.isArray(postData) || postData.length === 0) {
      throw new Error("Invalid batch response from judge server");
    }
    tokens = postData.map((item: any) => item.token);
  } catch (err: any) {
    return {
      status: "Judge Server Error",
      all_passed: false,
      passed_count: 0,
      total_count: testcases.length,
      total_time: 0,
      results: testcases.map((tc) => ({
        testcase_id: tc.id,
        is_sample: tc.is_sample,
        input: tc.input_data,
        expected_output: tc.expected_output,
        actual_output: "",
        stderr: `Judge Error: ${err.message || "Failed to submit batch to execution server. Please try again."}`,
        status: "Judge Error",
        passed: false,
        time: 0
      }))
    };
  }

  // 2. Poll Judge0 batch endpoint until all test cases complete or timeout reached
  const tokenQuery = tokens.join(",");
  const maxPollTimeMs = 45000; // 45 seconds maximum polling time
  const pollIntervalMs = 1200;
  const startTime = Date.now();
  let completedSubmissions: any[] = [];

  while (Date.now() - startTime < maxPollTimeMs) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    try {
      const getRes = await fetch(
        `${JUDGE0_URL}/submissions/batch?tokens=${tokenQuery}&base64_encoded=false`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (getRes.ok) {
        const getData = await getRes.json();
        const batchResults = getData.submissions || [];

        // If any submission has a Compilation Error (status.id === 6), all of them will share it
        const compileErr = batchResults.find((s: any) => s.status?.id === 6);
        if (compileErr) {
          completedSubmissions = batchResults.map((s: any) => (s.status?.id ? s : compileErr));
          break;
        }

        const pending = batchResults.filter((s: any) => !s.status || s.status.id <= 2);
        completedSubmissions = batchResults;

        if (pending.length === 0 && batchResults.length === tokens.length) {
          break;
        }
      }
    } catch {
      // transient fetch error during polling, retry next iteration
    }
  }

  // 3. Process each testcase result
  const results: TestResult[] = [];
  let allPassed = true;
  let overallStatus = "Accepted";
  let totalTime = 0.0;
  let passedCount = 0;

  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];
    const sub = completedSubmissions[i];

    if (!sub || !sub.status || sub.status.id <= 2) {
      allPassed = false;
      if (overallStatus === "Accepted") overallStatus = "Time Limit Exceeded";
      results.push({
        testcase_id: tc.id,
        is_sample: tc.is_sample,
        input: tc.input_data,
        expected_output: tc.expected_output,
        actual_output: "",
        stderr: "Judge execution timed out in queue. Please submit again.",
        status: "Time Limit Exceeded",
        passed: false,
        time: 3.0
      });
      continue;
    }

    const execTime = parseFloat(sub.time || "0.0");
    totalTime += execTime;

    const stdout = sub.stdout || "";
    const stderr = sub.stderr || sub.compile_output || "";
    const actualNorm = normalize(stdout);
    const expectedNorm = normalize(tc.expected_output);

    let passed = false;
    let tcStatus = sub.status.description || "Unknown";

    if (sub.status.id === 3) { // Accepted in Judge0
      if (actualNorm === expectedNorm) {
        passed = true;
        tcStatus = "Accepted";
        passedCount++;
      } else {
        passed = false;
        tcStatus = "Wrong Answer";
        allPassed = false;
        if (overallStatus === "Accepted") overallStatus = "Wrong Answer";
      }
    } else {
      passed = false;
      allPassed = false;
      if (overallStatus === "Accepted") {
        overallStatus = tcStatus;
      }
    }

    results.push({
      testcase_id: tc.id,
      is_sample: tc.is_sample,
      input: tc.input_data,
      expected_output: tc.expected_output,
      actual_output: stdout,
      stderr: stderr,
      status: tcStatus,
      passed,
      time: execTime
    });
  }

  return {
    status: allPassed ? "Accepted" : overallStatus,
    all_passed: allPassed,
    passed_count: passedCount,
    total_count: testcases.length,
    total_time: Math.round(totalTime * 1000) / 1000,
    results
  };
}
