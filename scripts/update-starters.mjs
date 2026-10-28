import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  console.log("Updating starter templates in Turso database...");

  // Two Sum
  const twoSumPy = `def twoSum(nums: list[int], target: int) -> list[int]:
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
`;

  const twoSumJava = `import java.util.*;

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
`;

  const twoSumCpp = `#include <iostream>
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
`;

  const twoSumJs = `const fs = require('fs');

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
`;

  await client.execute({
    sql: `UPDATE problems SET starter_python = ?, starter_java = ?, starter_cpp = ?, starter_javascript = ? WHERE slug = 'two-sum'`,
    args: [twoSumPy, twoSumJava, twoSumCpp, twoSumJs]
  });
  console.log("✓ Two Sum starter templates updated successfully.");

  // Valid Palindrome
  const palPy = `import sys

def isPalindrome(s: str) -> bool:
    # ── WRITE YOUR SOLUTION HERE ───────────────
    # Return True if s is a palindrome, False otherwise
    pass


# ── DRIVER CODE (Do not modify) ───────────────
if __name__ == "__main__":
    line = sys.stdin.read().strip()
    result = isPalindrome(line)
    print("true" if result else "false")
`;

  const palJava = `import java.util.*;

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
`;

  const palCpp = `#include <iostream>
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
`;

  const palJs = `const fs = require('fs');

// ── WRITE YOUR SOLUTION HERE ─────────────────
function isPalindrome(s) {
    // Return true if palindrome, false otherwise
    return false;
}

// ── DRIVER CODE (Do not modify) ───────────────
const s = fs.readFileSync(0, 'utf-8').trim();
const result = isPalindrome(s);
console.log(result ? "true" : "false");
`;

  await client.execute({
    sql: `UPDATE problems SET starter_python = ?, starter_java = ?, starter_cpp = ?, starter_javascript = ? WHERE slug = 'valid-palindrome'`,
    args: [palPy, palJava, palCpp, palJs]
  });
  console.log("✓ Valid Palindrome starter templates updated successfully.");
}

run().catch(console.error);
