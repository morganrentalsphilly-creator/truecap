import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnv(file) {
  const p = join(process.cwd(), file);
  if (!existsSync(p)) return;
  const content = readFileSync(p, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
[".env.local", ".env", ".env.development"].forEach(loadEnv);

// CLI args: node reset-passwords.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY>
const supabaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Usage: node lib/reset-passwords.mjs [<SUPABASE_URL> <SERVICE_ROLE_KEY>]");
  console.error("Or set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env / .env.local");
  console.error("Example: node lib/reset-passwords.mjs https://xxxx.supabase.co eyJhbGc...");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Same as server action: BULK_RESET_TARGET_PASSWORD in .env, or "12345678" default.
const NEW_PASSWORD = (process.env.BULK_RESET_TARGET_PASSWORD || "12345678").trim();
if (NEW_PASSWORD.length < 8) {
  console.error("BULK_RESET_TARGET_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

async function main() {
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const {
      data: { users },
      error: listError,
    } = await admin.auth.admin.listUsers({ page, perPage });
    if (listError) {
      console.error("List users error:", listError.message);
      process.exit(1);
    }
    if (!users?.length) {
      if (page === 1) console.log("No users found.");
      break;
    }
    for (const user of users) {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        password: NEW_PASSWORD,
      });
      if (error) console.error(`Failed ${user.email}:`, error.message);
      else console.log(`OK: ${user.email}`);
    }
    if (users.length < perPage) break;
    page += 1;
  }
  console.log("Done.");
}

main();
