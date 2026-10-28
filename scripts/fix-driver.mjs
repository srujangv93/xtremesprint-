import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}

const db = createClient({ url, authToken });

async function fix() {
  const newMergePython = `import sys

def solve(nums1: list[int], nums2: list[int]) -> list[int]:
    # Replace pass with your own solution
    pass


# ── DRIVER CODE (Do not modify) ───────────────

if __name__ == "__main__":
    tokens = sys.stdin.read().split()
    if not tokens:
        sys.exit(0)

    idx = 0
    n1 = int(tokens[idx])
    idx += 1
    nums1 = [int(x) for x in tokens[idx : idx + n1]]
    idx += n1

    n2 = int(tokens[idx])
    idx += 1
    nums2 = [int(x) for x in tokens[idx : idx + n2]]

    result = solve(nums1, nums2)
    print(*result)
`;

  await db.execute({
    sql: "UPDATE problems SET starter_python = ? WHERE slug = 'merge-two-sorted-arrays'",
    args: [newMergePython]
  });

  console.log("✓ Successfully updated starter_python for merge-two-sorted-arrays in Turso!");

  // Verify
  const check = await db.execute("SELECT slug, starter_python FROM problems WHERE slug = 'merge-two-sorted-arrays'");
  console.log("Updated template:\n", check.rows[0].starter_python);
}

fix().catch(console.error);
