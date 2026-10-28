import JSZip from "jszip";

export interface ParsedTestCase {
  id: string;
  name: string;
  input: string;
  output: string;
  is_sample: boolean;
}

/**
 * Parses a zip file containing test case pairs (.in/.out, input/output .txt)
 */
export async function parseTestCasesZip(fileData: ArrayBuffer | Blob): Promise<ParsedTestCase[]> {
  const zip = await JSZip.loadAsync(fileData);
  const filesMap: Record<string, string> = {};

  // Extract all text files
  const fileEntries = Object.keys(zip.files).filter((path) => {
    return !zip.files[path].dir && !path.startsWith("__MACOSX") && !path.includes(".DS_Store");
  });

  for (const path of fileEntries) {
    const text = await zip.files[path].async("string");
    filesMap[path] = text;
  }

  const inputs: Record<string, { path: string; content: string }> = {};
  const outputs: Record<string, { path: string; content: string }> = {};

  for (const path of fileEntries) {
    const normalized = path.replace(/\\/g, "/");
    const filename = normalized.split("/").pop() || "";
    const lowerName = filename.toLowerCase();

    // Check if output file
    if (
      lowerName.endsWith(".out") ||
      lowerName.endsWith(".ans") ||
      lowerName.startsWith("output") ||
      lowerName.startsWith("out_") ||
      normalized.includes("/output/") ||
      normalized.includes("/outputs/") ||
      normalized.includes("/out/")
    ) {
      const key = getKey(normalized);
      outputs[key] = { path, content: filesMap[path] };
    }
    // Check if input file
    else if (
      lowerName.endsWith(".in") ||
      lowerName.startsWith("input") ||
      lowerName.startsWith("in_") ||
      normalized.includes("/input/") ||
      normalized.includes("/inputs/") ||
      normalized.includes("/in/")
    ) {
      const key = getKey(normalized);
      inputs[key] = { path, content: filesMap[path] };
    }
  }

  const testcases: ParsedTestCase[] = [];
  let counter = 1;

  for (const key of Object.keys(inputs)) {
    if (outputs[key]) {
      const inputEntry = inputs[key];
      const outputEntry = outputs[key];
      const isSample =
        key.toLowerCase().includes("sample") ||
        inputEntry.path.toLowerCase().includes("sample");

      testcases.push({
        id: `zip_tc_${counter++}`,
        name: key,
        input: inputEntry.content.replace(/\r\n/g, "\n").trim(),
        output: outputEntry.content.replace(/\r\n/g, "\n").trim(),
        is_sample: isSample
      });
    }
  }

  // Sort: samples first, then natural numerical sorting (e.g., 1, 2, 10 instead of 1, 10, 2)
  testcases.sort((a, b) => {
    if (a.is_sample && !b.is_sample) return -1;
    if (!a.is_sample && b.is_sample) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });

  return testcases;
}

/**
 * Extracts a normalized matching key from path/filename
 * e.g., "tc1.in" -> "tc1", "input01.txt" -> "01", "in/test_2.txt" -> "test_2"
 */
function getKey(path: string): string {
  const parts = path.split("/");
  const filename = parts[parts.length - 1];

  let base = filename
    .replace(/\.(in|out|ans|txt)$/i, "")
    .replace(/^(input|output|in|out)[-_]?/i, "")
    .trim();

  // If inside directory like "inputs/case1.txt", keep subdirectory context if needed
  if (parts.length > 1) {
    const parentDir = parts[parts.length - 2].toLowerCase();
    if (!["in", "out", "input", "output", "inputs", "outputs"].includes(parentDir)) {
      base = `${parentDir}_${base || "default"}`;
    }
  }

  return base || "default";
}
