#!/usr/bin/env node
/* THE TENANT GATE — fails the build when a client fact is written as code.
   (Joe, 2026-08-20: "design safeguards so that when I replicate this process again for a new
   brand we don't end up with gaps".)

   WHY THIS EXISTS. Onboarding a second client surfaced eighteen separate places where something
   true of Blind Corner had been written as a constant: label names, basePath strings, a phone
   redirect, a logo path, `profile.name === "brewery"` used as a shape test. Every one was
   invisible until a second client existed, and — the important part — every one presented as
   MISSING OR WRONG DATA rather than as a naming problem. The account card filtered itself to
   zero rows and confidently printed "Lapsed, 0 cases" for all 412 accounts. The wholesale
   charts summed both labels and ran 24% high. A phone was redirected to a 404. Nothing threw,
   nothing logged; they were found by a human noticing a blank screen.

   A grep cannot understand the app, but it does not need to: every one of those eighteen sites
   contained one of the tokens below. This check is dumb, instant, and would have caught all of
   them before they shipped.

   IT READS CODE, NOT PROSE. The first version reported 98 hits and about ninety were comments
   explaining the very fixes that removed the literal. A check that noisy gets switched off on
   its first day, so block and line comments are stripped before matching.

   THE ESCAPE HATCH IS DELIBERATE. Some files legitimately name a client — lib/profile.js is
   where client facts are supposed to live, lib/brand.js holds each brand's real marks. For a
   one-off line elsewhere, append `// profile-literal-ok` with a reason. Making the exception
   explicit and greppable is what stops someone disabling the whole gate when it is inconvenient.

   Usage:  node scripts/check-profile-literals.mjs
   Wired to `prebuild`, so `vercel build` fails rather than shipping the gap. */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components", "lib"];
const SCAN_FILES = ["proxy.js", "middleware.js", "next.config.mjs", "next.config.js"];

/* Allowed to name a client, because naming clients is their job. */
const ALLOW_FILES = new Set([
  "lib/profile.js",
  "lib/brand.js",
  "scripts/check-profile-literals.mjs",
]);

/* One entry per class of leak we actually suffered. `hint` teaches the fix — a gate that only
   says no gets argued with; one that says what to use instead gets obeyed. */
const BANNED = [
  { re: /BLIND\s?CORNER/i,        name: "Blind Corner",         hint: "HOUSE_PARENT / parentLabelOf() from lib/profile.js" },
  { re: /\bTORCH\b/i,             name: "Torch",                hint: "ALT_PARENT / parentLabelOf() from lib/profile.js" },
  { re: /\bNORTHWIND\b/i,         name: "Northwind",            hint: "HOUSE_PARENT — never hardcode a client, not even the demo" },
  { re: /\bDRIFT\b/i,             name: "Drift",                hint: "ALT_PARENT from lib/profile.js" },
  { re: /blindcorner/,            name: "blindcorner",          hint: "BASE from lib/basePath.js, or brandKeyOf() / defaultBrandKey" },
  { re: /profile\.name\s*[=!]==/, name: "profile.name compare", hint: "isBreweryShape — ask what SHAPE the data is, never what the client is called" },
  { re: /\bTHC\b/,                name: "THC",                  hint: "rules.altParentStyles from lib/profile.js — a per-client data quirk" },
  { re: /BINNY/i,                 name: "Binny's",              hint: "a chain name belongs in `rules`, not in code" },
];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(js|jsx|ts|tsx|mjs)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/* Strip comments so only executable text is matched. Returns "" for a pure comment line. */
function codeOnly(line, state) {
  let s = line;
  if (state.inBlock) {
    const end = s.indexOf("*/");
    if (end < 0) return "";
    s = s.slice(end + 2);
    state.inBlock = false;
  }
  for (;;) {
    const a = s.indexOf("/*");
    if (a < 0) break;
    const b = s.indexOf("*/", a + 2);
    if (b < 0) { s = s.slice(0, a); state.inBlock = true; break; }
    s = s.slice(0, a) + " " + s.slice(b + 2);
  }
  // a // outside a string starts a line comment. Counting quotes before it is crude but the
  // only false negative it can cause is a URL inside a string, which the path rules already own.
  const slash = s.indexOf("//");
  if (slash >= 0) {
    const before = s.slice(0, slash);
    if ((before.match(/["'`]/g) || []).length % 2 === 0) s = before;
  }
  return s;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))),
  ...SCAN_FILES.map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f)),
];

const hits = [];
for (const file of files) {
  const r = rel(file);
  if (ALLOW_FILES.has(r)) continue;
  const state = { inBlock: false };
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((raw, i) => {
    const line = codeOnly(raw, state);
    if (!line.trim()) return;
    if (raw.includes("profile-literal-ok")) return;
    for (const b of BANNED) {
      if (b.re.test(line)) {
        hits.push({ file: r, line: i + 1, token: b.name, hint: b.hint, text: raw.trim().slice(0, 110) });
        break;
      }
    }
  });
}

if (!hits.length) {
  console.log(`tenant gate: clean (${files.length} files scanned)`);
  process.exit(0);
}

console.error(`\ntenant gate FAILED — ${hits.length} client fact(s) written as code\n`);
const byToken = {};
for (const h of hits) (byToken[h.token] ||= []).push(h);
for (const [token, list] of Object.entries(byToken)) {
  console.error(`  ${token}  →  use ${list[0].hint}`);
  for (const h of list) console.error(`      ${h.file}:${h.line}  ${h.text}`);
  console.error("");
}
console.error("A fact true of ONE client belongs in lib/profile.js, never in code.");
console.error("If a line is a genuine exception, append  // profile-literal-ok  with a reason.\n");
process.exit(1);
