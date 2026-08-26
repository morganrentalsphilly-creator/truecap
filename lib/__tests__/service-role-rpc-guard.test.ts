import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Four RPCs mutate shared server-owned state: the public analyses counter and
 * the metered third-party budget counters (RentCast / Anthropic), plus the
 * privileged SMS trigger. They were reachable unauthenticated at
 * /rest/v1/rpc/<name> because Postgres grants EXECUTE to PUBLIC by default;
 * migration 20260826120000 revokes PUBLIC/anon/authenticated and keeps only
 * service_role.
 *
 * The database now enforces that. This suite enforces the code side: every
 * call site must use the service-role client, so nobody "fixes" a broken
 * anon call by re-granting instead of switching clients.
 */

const root = process.cwd();

const SERVICE_ROLE_ONLY_RPCS = [
  "sms_invoke_sender",
  "increment_analysis_runs",
  "increment_app_counter_if_under",
  "decrement_app_counter",
] as const;

const SEARCH_DIRS = ["app", "lib", "components", "hooks"];
const SKIP_DIR = new Set(["node_modules", ".next", "__tests__"]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(join(root, dir));
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry)) continue;
    const rel = join(dir, entry);
    const full = join(root, rel);
    if (statSync(full).isDirectory()) {
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      acc.push(rel);
    }
  }
  return acc;
}

/** The receiver of `.rpc("name")` — e.g. `admin` in `admin.rpc("x")`. */
function rpcReceivers(source: string, rpcName: string): string[] {
  const pattern = new RegExp(
    `([A-Za-z_$][\\w$]*)\\s*\\n?\\s*\\.rpc\\(\\s*["'\`]${rpcName}["'\`]`,
    "g"
  );
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

const files = SEARCH_DIRS.flatMap((dir) => sourceFiles(dir));

// Read the tree exactly once. Re-reading it per assertion pushed this suite
// past the 5s timeout when the whole suite shares one fork.
const sources = new Map<string, string>(
  files
    .map((file) => [file, readFileSync(join(root, file), "utf8")] as const)
    .filter(([, source]) =>
      SERVICE_ROLE_ONLY_RPCS.some((rpc) => source.includes(rpc))
    )
);

describe("service-role-only RPCs are never called with a user-scoped client", () => {
  it("finds the source tree (guard against a silently empty sweep)", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const rpc of SERVICE_ROLE_ONLY_RPCS) {
    it(`${rpc} is only invoked through a service-role client`, () => {
      const offenders: string[] = [];
      for (const [file, source] of sources) {
        for (const receiver of rpcReceivers(source, rpc)) {
          // The service-role client is conventionally bound to `admin` in this
          // codebase (createAdminSupabaseClient()). Anything else — a browser
          // client, a cookie-scoped server client — would need a PUBLIC/anon
          // grant that no longer exists.
          if (!/^admin/i.test(receiver)) {
            offenders.push(`${relative(".", file)} → ${receiver}.rpc("${rpc}")`);
          }
        }
      }
      expect(offenders, offenders.join("; ")).toEqual([]);
    });
  }

  it("every call site imports the service-role client", () => {
    const callers = [...sources].filter(([, source]) =>
      SERVICE_ROLE_ONLY_RPCS.some((rpc) => rpcReceivers(source, rpc).length > 0)
    );
    expect(callers.length).toBeGreaterThan(0);
    for (const [file, source] of callers) {
      expect(source, `${file} calls a service-role-only RPC`).toContain(
        "createAdminSupabaseClient"
      );
    }
  });

  it("the hardening migration is present and revokes PUBLIC, not just anon", () => {
    const migration = readFileSync(
      join(
        root,
        "supabase/migrations/20260826120000_revoke_anon_execute_on_service_role_functions.sql"
      ),
      "utf8"
    );
    // Revoking `anon` alone is the classic incomplete fix: `anon` still
    // inherits the default PUBLIC grant.
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("revoke execute on function %s from authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
    for (const rpc of SERVICE_ROLE_ONLY_RPCS) {
      expect(migration).toContain(`'${rpc}'`);
    }
  });
});
