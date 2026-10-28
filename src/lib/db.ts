import { createClient, Client } from "@libsql/client";

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL?.trim();
    const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

    if (url) {
      dbInstance = createClient({
        url,
        authToken: authToken || undefined,
      });
    } else {
      // Local fallback to SQLite file
      dbInstance = createClient({
        url: "file:contest.db",
      });
    }
  }
  return dbInstance;
}

export async function initDb() {
  const db = getDb();

  // Enable foreign key support
  await db.execute("PRAGMA foreign_keys = ON;");

  // Create tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS problems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Easy',
      points INTEGER NOT NULL DEFAULT 100,
      time_limit REAL NOT NULL DEFAULT 2.0,
      day INTEGER NOT NULL DEFAULT 4,
      starter_python TEXT DEFAULT '',
      starter_java TEXT DEFAULT '',
      starter_cpp TEXT DEFAULT '',
      starter_javascript TEXT DEFAULT ''
    )
  `);

  try {
    await db.execute("ALTER TABLE problems ADD COLUMN day INTEGER NOT NULL DEFAULT 4;");
  } catch {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS testcases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      problem_id INTEGER NOT NULL,
      input_data TEXT NOT NULL,
      expected_output TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      problem_id INTEGER NOT NULL,
      language TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT NOT NULL,
      passed_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      execution_time REAL NOT NULL,
      score INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (problem_id) REFERENCES problems(id)
    )
  `);

  // Check if problems table is empty, if so, seed initial competition problems
  const check = await db.execute("SELECT COUNT(*) as count FROM problems");
  const count = Number(check.rows[0]?.count || 0);

  if (count === 0) {
    await seedProblems(db);
  }
}

async function seedProblems(db: Client) {
  // Problem 1: Two Sum
  const res1 = await db.execute({
    sql: `
      INSERT INTO problems (
        slug, title, description, difficulty, points,
        starter_python, starter_java, starter_cpp, starter_javascript
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      "two-sum",
      "Two Sum",
      `Given an array of integers \`nums\` and an integer \`target\`, return the 0-based indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

Output the two indices separated by a space in ascending order.

### Input Format
* First line contains integer \`N\` (number of elements).
* Second line contains \`N\` space-separated integers \`nums[i]\`.
* Third line contains integer \`target\`.

### Output Format
* Print two space-separated integers: index 1 and index 2.

### Constraints
* \`2 <= N <= 10^5\`
* \`-10^9 <= nums[i] <= 10^9\`
* \`-10^9 <= target <= 10^9\`
`,
      "Easy",
      100,
      `def twoSum(nums: list[int], target: int) -> list[int]:
    # ── WRITE YOUR SOLUTION HERE ───────────────
    # Return a list with the two indices: [idx1, idx2]
    pass


# ── DRIVER CODE (Do not modify) ───────────────
if __name__ == "__main__":
    n = int(input().strip())
    nums = list(map(int, input().strip().split()))
    target = int(input().strip())

    result = twoSum(nums, target)
    if result:
        print(f"{result[0]} {result[1]}")
`,
      `import java.util.*;

public class Main {
    // ── WRITE YOUR SOLUTION HERE ───────────────
    public static int[] twoSum(int[] nums, int target) {
        // Return new int[]{idx1, idx2}
        return new int[]{};
    }

    // ── DRIVER CODE (Do not modify) ───────────
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] nums = new int[n];
        for (int i = 0; i < n; i++) {
            nums[i] = sc.nextInt();
        }
        int target = sc.nextInt();

        int[] result = twoSum(nums, target);
        if (result.length >= 2) {
            System.out.println(result[0] + " " + result[1]);
        }
    }
}
`,
      `#include <iostream>
#include <vector>

using namespace std;

// ── WRITE YOUR SOLUTION HERE ─────────────────
vector<int> twoSum(const vector<int>& nums, int target) {
    // Return vector<int>{idx1, idx2}
    return {};
}

// ── DRIVER CODE (Do not modify) ───────────────
int main() {
    int n, target;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    cin >> target;

    vector<int> result = twoSum(nums, target);
    if (result.size() >= 2) {
        cout << result[0] << " " << result[1] << "\\n";
    }
    return 0;
}
`,
      `const fs = require('fs');

// ── WRITE YOUR SOLUTION HERE ─────────────────
function twoSum(nums, target) {
    // Return [idx1, idx2]
    return [];
}

// ── DRIVER CODE (Do not modify) ───────────────
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 3) {
    const n = parseInt(input[0]);
    const nums = input.slice(1, 1 + n).map(Number);
    const target = parseInt(input[1 + n]);

    const result = twoSum(nums, target);
    if (result && result.length >= 2) {
        console.log(\`\${result[0]} \${result[1]}\`);
    }
}
`
    ]
  });

  const prob1Id = Number(res1.lastInsertRowid);

  // Test cases for Two Sum
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
    args: [prob1Id, "4\n2 7 11 15\n9", "0 1"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
    args: [prob1Id, "3\n3 2 4\n6", "1 2"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
    args: [prob1Id, "2\n3 3\n6", "0 1"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
    args: [prob1Id, "5\n-1 -2 -3 -4 -5\n-8", "2 4"]
  });

  // Problem 2: Valid Palindrome
  const res2 = await db.execute({
    sql: `
      INSERT INTO problems (
        slug, title, description, difficulty, points,
        starter_python, starter_java, starter_cpp, starter_javascript
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      "valid-palindrome",
      "Valid Palindrome",
      `A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

### Input Format
* A single line containing the string \`s\`.

### Output Format
* Print \`true\` or \`false\` (in lowercase).

### Constraints
* \`1 <= s.length <= 2 * 10^5\`
* \`s\` consists only of printable ASCII characters.
`,
      "Easy",
      100,
      `import sys

def isPalindrome(s: str) -> bool:
    # ── WRITE YOUR SOLUTION HERE ───────────────
    # Return True if s is a palindrome, False otherwise
    pass


# ── DRIVER CODE (Do not modify) ───────────────
if __name__ == "__main__":
    line = sys.stdin.read().strip()
    result = isPalindrome(line)
    print("true" if result else "false")
`,
      `import java.util.*;

public class Main {
    // ── WRITE YOUR SOLUTION HERE ───────────────
    public static boolean isPalindrome(String s) {
        // Return true if palindrome, false otherwise
        return false;
    }

    // ── DRIVER CODE (Do not modify) ───────────
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String s = sc.hasNextLine() ? sc.nextLine() : "";
        boolean result = isPalindrome(s);
        System.out.println(result ? "true" : "false");
    }
}
`,
      `#include <iostream>
#include <string>

using namespace std;

// ── WRITE YOUR SOLUTION HERE ─────────────────
bool isPalindrome(const string& s) {
    // Return true if palindrome, false otherwise
    return false;
}

// ── DRIVER CODE (Do not modify) ───────────────
int main() {
    string s;
    if (!getline(cin, s)) return 0;
    bool result = isPalindrome(s);
    cout << (result ? "true" : "false") << "\\n";
    return 0;
}
`,
      `const fs = require('fs');

// ── WRITE YOUR SOLUTION HERE ─────────────────
function isPalindrome(s) {
    // Return true if palindrome, false otherwise
    return false;
}

// ── DRIVER CODE (Do not modify) ───────────────
const s = fs.readFileSync(0, 'utf-8').trim();
const result = isPalindrome(s);
console.log(result ? "true" : "false");
`
    ]
  });

  const prob2Id = Number(res2.lastInsertRowid);

  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
    args: [prob2Id, "A man, a plan, a canal: Panama", "true"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 1)",
    args: [prob2Id, "race a car", "false"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
    args: [prob2Id, " ", "true"]
  });
  await db.execute({
    sql: "INSERT INTO testcases (problem_id, input_data, expected_output, is_sample) VALUES (?, ?, ?, 0)",
    args: [prob2Id, "0P", "false"]
  });
}
