// A digest of the simulation core's CODE, with comments removed.
//
// `docs/analysis/plot-005.R` captions its figures "model frozen at 12e7b08" and
// used to verify that with `git diff --quiet 12e7b08 -- sim`, which compares
// BYTES. Commit b2a6ce9 corrected two doc comments in sim/ and nothing else, and
// from then on 005's figures refused to regenerate, through v1.0.1 and v1.0.2,
// while the claim they were refusing on stayed true. The claim is about what
// the model computes, so this measures that: every .ts file is passed through
// TypeScript's own compiler with `removeComments`, which also drops type
// annotations and re-prints the code, so comments, formatting and types cannot
// move the digest and any change to emitted code does. Other files are hashed
// as raw bytes. File paths are part of the digest, so an added, removed or
// renamed file moves it too.
//
// Usage (from the repository root; runs on the system node, v18):
//   node scripts/sim-code-digest.mjs --ref <commit>   sim/ at that commit
//   node scripts/sim-code-digest.mjs --dir <path>     a directory on disk
// Prints one line: a sha256 hex digest. Any failure exits non-zero.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";

const [mode, target] = process.argv.slice(2);
if (!["--ref", "--dir"].includes(mode) || !target) {
  process.stderr.write(
    "usage: sim-code-digest.mjs --ref <commit> | --dir <path>\n",
  );
  process.exit(2);
}

/** @type {[string, Buffer][]} relative path and contents, one per file */
const files = [];
if (mode === "--ref") {
  const names = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", target, "--", "sim"],
    {
      encoding: "utf8",
    },
  )
    .split("\n")
    .filter(Boolean);
  if (names.length === 0) throw new Error(`no files under sim/ at ${target}`);
  for (const n of names) {
    files.push([
      n.slice("sim/".length),
      execFileSync("git", ["show", `${target}:${n}`]),
    ]);
  }
} else {
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else
        files.push([relative(target, p).split(sep).join("/"), readFileSync(p)]);
    }
  };
  walk(target);
  if (files.length === 0) throw new Error(`no files under ${target}`);
}

const hash = createHash("sha256");
for (const [name, buf] of files.sort((a, b) =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
)) {
  const body = name.endsWith(".ts")
    ? ts.transpileModule(buf.toString("utf8"), {
        compilerOptions: {
          removeComments: true,
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
        },
        fileName: name,
      }).outputText
    : buf;
  hash.update(name).update("\0").update(body).update("\0");
}
process.stdout.write(`${hash.digest("hex")}\n`);
