#!/usr/bin/env node
// Animatio — publish a release to npm.
//
//   npm run release:dry            rehearse everything, publish nothing
//   npm run release -- current     publish the version already in package.json
//   npm run release -- current --otp=123456
//                                  supply the 2FA code up front; without it npm
//                                  asks for browser auth, which fails in a
//                                  non-interactive shell
//   npm run release -- patch       0.1.0 -> 0.1.1
//   npm run release -- minor       0.1.0 -> 0.2.0
//   npm run release -- major       0.1.0 -> 1.0.0
//   npm run release -- 1.2.3       an explicit version
//
// The order matters and is deliberate: everything that can refuse to publish
// runs BEFORE the version is bumped, so a failed release leaves no orphan
// commit or tag behind. Publishing is the last irreversible step, and npm does
// not let you re-publish a version you have unpublished, so getting the order
// wrong is expensive.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const bump = args.find((a) => !a.startsWith("-")) || "patch";
// A first release should ship the version already chosen, not an invented bump
// on top of it. `current` tags what is here instead of moving it.
const CURRENT = bump === "current";

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: ROOT, stdio: "inherit", ...opts });
const capture = (cmd) =>
  execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

// Git ships with Git Bash but is not always on PATH in PowerShell or cmd, and
// a release that only works from one shell is a trap. Resolve it once, and say
// so plainly if it genuinely is not installed rather than blaming the repo.
const GIT = (() => {
  // path.join rather than hand-written backslashes: an escaped Windows path
  // inside a template literal is one editing mistake away from "C:Program
  // FilesGitcmd", which is exactly what the first version of this printed.
  const candidates = ["git"];
  for (const base of [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs"),
  ]) {
    if (base) candidates.push(join(base, "Git", "cmd", "git.exe"));
  }
  for (const c of candidates) {
    try {
      execSync(`"${c}" --version`, { stdio: "ignore" });
      return c === "git" ? "git" : `"${c}"`;
    } catch {}
  }
  return null;
})();

const git = (args) => capture(`${GIT} ${args}`);

const firstLine = (e) =>
  String(e.stderr || e.message || e).trim().split(String.fromCharCode(10))[0].trim();

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);
const die = (msg, fix) => {
  console.error(`\nanimatio: RELEASE BLOCKED\n  ${msg}`);
  if (fix) console.error(`  fix: ${fix}`);
  process.exit(1);
};

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

console.log(
  `\nanimatio release — ${pkg.name}@${pkg.version} -> ${bump}${DRY ? "  (DRY RUN)" : ""}`
);

// ---------------------------------------------------------------- 1. the tree
// A dirty tree means the tarball would not match any commit, and `npm version`
// refuses to tag one anyway.
step(1, "working tree");
if (!GIT) {
  die(
    "git is not on PATH in this shell",
    "open a shell where `git --version` works (Git Bash), or add " +
      "C:\Program Files\Git\cmd to PATH"
  );
}
let dirty = "";
try {
  dirty = git("status --porcelain");
} catch (e) {
  // Report what actually happened. Guessing "not a git repository" for every
  // failure sent a real PATH problem down the wrong path entirely.
  die(
    `could not read the working tree: ${firstLine(e)}`,
    "run this from the repository root"
  );
}
if (dirty) {
  die(
    `uncommitted changes:\n    ${dirty.split("\n").slice(0, 6).join("\n    ")}`,
    "commit or stash them first"
  );
}
console.log("    clean");

// ------------------------------------------------------------- 2. the account
// Checked BEFORE the build so a two-minute verify does not run just to fail on
// a missing login at the end.
step(2, "npm account");
let who = null;
try {
  who = capture("npm whoami");
  console.log(`    logged in as ${who}`);
} catch {
  if (!DRY) die("not logged in to npm", "npm login");
  console.log("    not logged in (dry run continues)");
}

// ---------------------------------------------------------------- 3. the name
// npm rejects a publish to a name owned by someone else with a 403 that does
// not say why, so the reason is worth surfacing here instead.
step(3, "name availability");
try {
  const owner = capture(`npm view ${pkg.name} maintainers --json`);
  const mine = who && owner.includes(who);
  if (mine) {
    console.log(`    ${pkg.name} exists and you maintain it — publishing an update`);
  } else {
    const msg = `${pkg.name} is already published by someone else`;
    if (!DRY) {
      die(msg, "scope it (@you/animatio) or choose another name in package.json");
    }
    console.log(`    ${msg} (dry run continues)`);
  }
} catch {
  console.log(`    ${pkg.name} is unclaimed`);
}

// --------------------------------------------------------------- 4. the build
// prepublishOnly runs verify again during the real publish; running it here
// means a failure costs nothing, because no version has been bumped yet.
step(4, "verify (build, 19 gates, tests)");
run("npm run verify");

// ------------------------------------------------------------ 5. the contents
// dist/ is gitignored, so this is the check that it actually made it into the
// tarball rather than shipping an empty package.
step(5, "tarball contents");
// prepack runs the build, and its output shares stdout with the JSON, so the
// listing has to be found rather than parsed from the top.
const listing = capture("npm pack --dry-run --json");
const start = listing.search(/^\[$/m);
if (start < 0) die("could not read the npm pack listing", "run npm pack --dry-run by hand");
const [tarball] = JSON.parse(listing.slice(start));
const names = tarball.files.map((f) => f.path);
const needs = ["dist/animatio.css", "dist/catalogue.json", "src/_index.scss", "LICENSE"];
const absent = needs.filter((n) => !names.includes(n));
if (absent.length) die(`tarball is missing: ${absent.join(", ")}`, "check the files array");
console.log(
  `    ${tarball.entryCount} files, ${(tarball.unpackedSize / 1024).toFixed(0)} KB unpacked`
);

if (DRY) {
  console.log(
    `\nanimatio: dry run OK. ${pkg.name}@${pkg.version} would be bumped (${bump}) and published.\n`
  );
  process.exit(0);
}

// --------------------------------------------------------------- 6. the bump
// npm version makes the commit and the tag together, so the published version
// is always reachable from history.
step(6, "version");
if (CURRENT) {
  console.log(`    keeping ${pkg.version}; tagged after a successful publish`);
} else {
  run(`npm version ${bump} -m "release: %s"`);
}
const next = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

// ------------------------------------------------------------ 7. the publish
step(7, "publish");
const otp = (args.find((a) => a.startsWith("--otp=")) || "").slice(6);
try {
  run(`npm publish${otp ? ` --otp=${otp}` : ""}`);
} catch {
  // The advice has to match the mode. In `current` mode nothing was committed
  // and nothing was tagged, so telling the user to reset --hard HEAD~1 would
  // destroy a real commit to undo something that never happened.
  die(
    CURRENT
      ? `publish failed — nothing was committed, tagged or shipped`
      : `publish failed — the version commit and tag v${next} exist locally but nothing shipped`,
    CURRENT
      ? `fix the cause and re-run 'npm run release -- current'`
      : `fix the cause and re-run 'npm publish', or undo with 'git tag -d v${next} && git reset --hard HEAD~1'`
  );
}

console.log(`\nanimatio: published ${pkg.name}@${next}`);
console.log("  next: git push && git push --tags\n");
