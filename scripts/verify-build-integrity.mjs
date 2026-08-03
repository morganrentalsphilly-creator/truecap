#!/usr/bin/env node
/**
 * verify-build-integrity.mjs — tripwire on the files that execute during a build.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS — the 2026-06-01 incident
 * ---------------------------------------------------------------------------
 * On 2026-06-01, commit 15eb1b5 ("Distribution batch: 13 blog OG images +
 * SoftwareApplication schema + /search route + 404 recovery + font hints")
 * touched 34 files. Thirty-three of them were exactly what the message said.
 * The thirty-fourth was `postcss.config.mjs`, and it carried a blockchain-C2
 * loader — code that runs inside `next build`, i.e. on every Vercel production
 * build, with SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
 * STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET and SENTRY_AUTH_TOKEN in
 * the environment. It sat on `main` until it was stripped out on 2026-07-14
 * (ab02311, "security: remove malware injected into postcss.config.mjs").
 * Six weeks. `tsc`, `vitest` and `next build` all passed the whole time —
 * a malicious build config is, by construction, a *working* build config.
 *
 * The lesson is not "review harder". It is that a 21-line change to a build
 * config, buried in a 2,370-line diff, is invisible to a human and invisible
 * to every check we run. So we stop relying on noticing it.
 *
 * This script pins the exact bytes of every file that executes at build time
 * (or that decides what executes at build time) against a committed manifest.
 * Any change — one character in postcss.config.mjs, a new `postinstall` in
 * package.json, a swapped dependency in package-lock.json — fails CI until
 * someone deliberately regenerates the manifest and commits the new hashes.
 * That turns "smuggled in a big diff" into "a separate, conspicuous,
 * hash-shaped line in the diff that has to be signed off on its own".
 *
 * It is the second of two layers. The first is the `build-chain-guard` job in
 * .github/workflows/ci.yml, which hard-fails any change to these paths that
 * did not come from the repo owner. This script is what catches a change that
 * gets past the diff computation (rewritten history, a base ref the runner
 * could not resolve, a push the guard never saw).
 *
 * ---------------------------------------------------------------------------
 * TWO KINDS OF BUILD-EXECUTED FILE
 * ---------------------------------------------------------------------------
 * `files` — pinned byte-for-byte. Nothing writes these except a human who then
 * re-pins them on purpose.
 *
 * `contentScanned` — build-executed files the SEO agent is deliberately allowed
 * to write, so a hash pin would be red on every content PR and would train
 * whoever is on the hook into running `--update` reflexively, which is the one
 * habit that would empty this whole control of meaning. `lib/blog-topics.ts` is
 * the only one: the SEO prompt tells the agent to register every post in it,
 * and `app/blog/page.tsx`, `app/blog/topics/**` and `app/sitemap.ts` import it,
 * so `next build` executes it. Its control is gate 1b's content scan instead.
 *
 * What this script enforces for those is that they have not quietly LOST that
 * coverage: the file must still exist, and ci.yml must still name it. So the
 * registry of build-executed files is complete here even where the mechanism
 * differs. Neither mechanism is a proof — see docs/SECURITY-HARDENING.md.
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   node scripts/verify-build-integrity.mjs            # verify (exit 1 on drift)
 *   node scripts/verify-build-integrity.mjs --update   # accept current bytes
 *
 * `--update` is a deliberate act. Run it only after you have read the actual
 * diff of the build-executed file you changed, line by line, and can say what
 * every line does. Commit the manifest change in its own commit with a message
 * that says why. If you are running --update because "CI was red", stop.
 *
 * No dependencies — node builtins only, so it runs before `npm ci` and can be
 * used as a Vercel "Ignored Build Step" guard. See docs/SECURITY-HARDENING.md.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const MANIFEST_PATH = join(HERE, 'build-integrity-manifest.json')
const MANIFEST_REL = 'scripts/build-integrity-manifest.json'

const INCIDENT_LINE =
  'Ref: 2026-06-01 — a blockchain-C2 loader was smuggled into postcss.config.mjs ' +
  'inside a 34-file "distribution batch" commit (15eb1b5) and executed on every ' +
  'production build for six weeks before it was found (removed in ab02311).'

/** npm lifecycle hooks that run automatically on `npm ci` / `npm install`. */
const INSTALL_LIFECYCLE_HOOKS = [
  'preinstall',
  'install',
  'postinstall',
  'preprepare',
  'prepare',
  'postprepare',
  'prepublish',
  'prepublishOnly',
]

const args = new Set(process.argv.slice(2))
const UPDATE = args.has('--update') || args.has('-u')

function sha256(absPath) {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex')
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    fail([
      `Integrity manifest is missing: ${MANIFEST_REL}`,
      'Someone deleted the tripwire. That is itself the finding — do not regenerate it',
      'without first working out who removed it and why.',
    ])
  }
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  } catch (err) {
    fail([`Integrity manifest is not valid JSON: ${MANIFEST_REL}`, String(err && err.message)])
  }
}

function fail(lines) {
  console.error('')
  console.error('================================================================')
  console.error('  BUILD-CHAIN INTEGRITY CHECK FAILED')
  console.error('================================================================')
  for (const line of lines) console.error(`  ${line}`)
  console.error('')
  console.error(`  ${INCIDENT_LINE}`)
  console.error('')
  console.error('  If YOU made this change and you have read the diff line by line:')
  console.error('      node scripts/verify-build-integrity.mjs --update')
  console.error(`      git add ${MANIFEST_REL} && git commit`)
  console.error('  Commit the manifest bump on its own, with a message saying what')
  console.error('  changed in the build-executed file and why.')
  console.error('')
  console.error('  If you did NOT make this change: do not update the manifest.')
  console.error('  Read the diff of every file listed above first.')
  console.error('================================================================')
  console.error('')
  process.exit(1)
}

function lifecycleScriptsInPackageJson() {
  const pkgPath = join(ROOT, 'package.json')
  if (!existsSync(pkgPath)) return []
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return []
  }
  const scripts = (pkg && pkg.scripts) || {}
  return INSTALL_LIFECYCLE_HOOKS.filter((hook) =>
    Object.prototype.hasOwnProperty.call(scripts, hook),
  )
}

// ---------------------------------------------------------------------------

const manifest = readManifest()
const trackedFiles = Object.keys(manifest.files || {}).sort()

if (trackedFiles.length === 0) {
  fail([
    `${MANIFEST_REL} has an empty "files" map.`,
    'An empty manifest checks nothing — this is a disabled tripwire, not a passing build.',
  ])
}

if (UPDATE) {
  const nextFiles = {}
  const missing = []
  for (const rel of trackedFiles) {
    const abs = join(ROOT, rel)
    if (!existsSync(abs)) {
      missing.push(rel)
      continue
    }
    nextFiles[rel] = sha256(abs)
  }
  if (missing.length > 0) {
    fail([
      'Refusing to regenerate: these manifest entries no longer exist on disk.',
      ...missing.map((f) => `  - ${f}`),
      'Deleting a build-executed file is as significant as editing one. If the',
      `removal is intended, edit "files" in ${MANIFEST_REL} by hand and say so`,
      'in the commit message.',
    ])
  }

  const changed = trackedFiles.filter((rel) => manifest.files[rel] !== nextFiles[rel])
  manifest.files = nextFiles
  manifest.generatedAt = new Date().toISOString()
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`Updated ${MANIFEST_REL}`)
  if (changed.length === 0) {
    console.log('No hashes changed — the manifest was already current.')
  } else {
    console.log('Hashes changed for:')
    for (const rel of changed) console.log(`  - ${rel}`)
    console.log('')
    console.log('Read the diff of each of those files before you commit this.')
    console.log(`${INCIDENT_LINE}`)
  }

  const hooks = lifecycleScriptsInPackageJson()
  const allowedHooks = manifest.allowedLifecycleScripts || []
  const unapproved = hooks.filter((h) => !allowedHooks.includes(h))
  if (unapproved.length > 0) {
    console.log('')
    console.log('WARNING: package.json declares install-time lifecycle scripts that are')
    console.log(`not allow-listed: ${unapproved.join(', ')}`)
    console.log('--update deliberately does NOT allow-list these for you. If they are')
    console.log(`legitimate, add them to "allowedLifecycleScripts" in ${MANIFEST_REL}`)
    console.log('by hand. Verification will keep failing until you do.')
  }
  process.exit(0)
}

// --- verify ----------------------------------------------------------------

const problems = []
const detail = []

for (const rel of trackedFiles) {
  const abs = join(ROOT, rel)
  const expected = manifest.files[rel]
  if (!existsSync(abs)) {
    problems.push(`MISSING   ${rel}`)
    detail.push(`  ${rel}: expected sha256 ${expected}, file does not exist`)
    continue
  }
  const actual = sha256(abs)
  if (actual !== expected) {
    problems.push(`MODIFIED  ${rel}`)
    detail.push(`  ${rel}\n      expected sha256 ${expected}\n      actual   sha256 ${actual}`)
  }
}

for (const rel of manifest.mustNotExist || []) {
  if (existsSync(join(ROOT, rel))) {
    problems.push(`ADDED     ${rel}`)
    detail.push(
      `  ${rel}: this filename is picked up automatically by the toolchain and is not` +
        '\n      part of the reviewed build chain. Adding it silently changes what runs' +
        '\n      at build time.',
    )
  }
}

// --- build-executed files that are content-scanned rather than hash-pinned --
//
// Fail closed on either half of that arrangement going missing: the file
// itself, or gate 1b's coverage of it in ci.yml. ci.yml is hash-pinned above,
// so this cannot be quietly edited — but a re-pin that also dropped a path from
// gate 1b's selection would otherwise look like an ordinary manifest bump.
const GUARD_WORKFLOW_REL = '.github/workflows/ci.yml'
const SELECTION_START = '# gate-1b-selection-start'
const SELECTION_END = '# gate-1b-selection-end'
const contentScanned = manifest.contentScanned || {}
const contentScannedPaths = Object.keys(contentScanned).sort()

if (contentScannedPaths.length > 0) {
  const guardPath = join(ROOT, GUARD_WORKFLOW_REL)
  // The region between the two markers in ci.yml — the actual list of paths
  // gate 1b hands to the content checker. Deliberately NOT the whole file:
  // `lib/blog-topics.ts` is named in half a dozen comments in there, so a
  // whole-file substring test would keep passing after the path was dropped
  // from the selection itself. Asking the wrong question politely is how a
  // control ends up green while doing nothing.
  let selection = null
  if (!existsSync(guardPath)) {
    problems.push(`MISSING   ${GUARD_WORKFLOW_REL}`)
    detail.push(
      `  ${GUARD_WORKFLOW_REL}: the build-chain-guard workflow is gone, so the content` +
        '\n      scan that covers the paths below does not run at all.',
    )
  } else {
    let guardSrc = null
    try {
      guardSrc = readFileSync(guardPath, 'utf8')
    } catch (err) {
      problems.push(`UNREADABLE ${GUARD_WORKFLOW_REL}`)
      detail.push(`  ${GUARD_WORKFLOW_REL}: ${String((err && err.message) || err)}`)
    }
    if (guardSrc !== null) {
      const from = guardSrc.indexOf(SELECTION_START)
      const to = guardSrc.indexOf(SELECTION_END)
      if (from === -1 || to === -1 || to <= from) {
        problems.push(`UNREADABLE ${GUARD_WORKFLOW_REL} (gate 1b selection markers)`)
        detail.push(
          `  ${GUARD_WORKFLOW_REL}: could not find the region between "${SELECTION_START}"` +
            `\n      and "${SELECTION_END}". That region is what decides which build-executed` +
            '\n      modules gate 1b scans, and the paths below are covered by nothing else.',
        )
      } else {
        selection = guardSrc.slice(from, to)
        if (!selection.includes('BLOG_MODULES+=')) {
          problems.push(`UNREADABLE ${GUARD_WORKFLOW_REL} (gate 1b selection is empty)`)
          detail.push(
            `  ${GUARD_WORKFLOW_REL}: the marked region no longer builds the module list` +
              '\n      (no `BLOG_MODULES+=`), so matching a path inside it proves nothing.',
          )
          selection = null
        }
      }
    }
  }

  for (const rel of contentScannedPaths) {
    if (!existsSync(join(ROOT, rel))) {
      problems.push(`MISSING   ${rel}`)
      detail.push(
        `  ${rel}: listed in "contentScanned" as a build-executed file, but it does not` +
          `\n      exist. If it was deliberately removed, remove it from ${MANIFEST_REL} in` +
          '\n      the same commit and say so in the message.',
      )
      continue
    }
    if (selection !== null && !selection.includes(rel)) {
      problems.push(`UNCOVERED ${rel}`)
      detail.push(
        `  ${rel}: build-executed and writable by the SEO agent, but gate 1b's selection` +
          `\n      in ${GUARD_WORKFLOW_REL} no longer includes it, so nothing scans it. It is` +
          '\n      not hash-pinned precisely because the content scan was supposed to be its' +
          "\n      control. Restore it to gate 1b's selection, or hash-pin it in \"files\".",
      )
    }
  }
}

const hooks = lifecycleScriptsInPackageJson()
const allowedHooks = manifest.allowedLifecycleScripts || []
const unapprovedHooks = hooks.filter((h) => !allowedHooks.includes(h))
if (unapprovedHooks.length > 0) {
  problems.push(`LIFECYCLE package.json scripts: ${unapprovedHooks.join(', ')}`)
  detail.push(
    `  package.json declares install-time lifecycle scripts (${unapprovedHooks.join(', ')})` +
      '\n      that are not in "allowedLifecycleScripts". These run automatically on' +
      '\n      `npm ci` — on the CI runner and on the Vercel builder, with production' +
      '\n      secrets in the environment. Nothing in this repo needs one.',
  )
}

if (problems.length > 0) {
  fail([
    `${problems.length} build-chain file(s) do not match ${MANIFEST_REL}:`,
    '',
    ...problems.map((p) => `  ${p}`),
    '',
    'Detail:',
    ...detail,
    '',
    'These files execute during `next build` (or decide what does). A change here',
    'reaches Vercel production with SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,',
    'STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET and SENTRY_AUTH_TOKEN in',
    'the environment.',
  ])
}

console.log(`Build-chain integrity OK — ${trackedFiles.length} files match ${MANIFEST_REL}.`)
if ((manifest.mustNotExist || []).length > 0) {
  console.log(`Also confirmed absent: ${(manifest.mustNotExist || []).length} shadow build-config filenames.`)
}
if (contentScannedPaths.length > 0) {
  console.log(
    `Content-scanned build-executed file(s) still covered by gate 1b: ${contentScannedPaths.join(', ')}.`,
  )
}
console.log('No install-time lifecycle scripts outside the allow-list.')
