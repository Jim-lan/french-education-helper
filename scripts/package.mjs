// Create a portable installation ZIP from a committed revision. Never packages local files.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const revision = git("rev-parse", "HEAD");
const packageJson = JSON.parse(git("show", `${revision}:package.json`));
const tracked = git("ls-tree", "-r", "--name-only", "-z", revision)
  .split("\0")
  .filter(Boolean);
const rootFiles = new Set([
  "README.md",
  "Dockerfile",
  "compose.yaml",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "next-env.d.ts",
  "tsconfig.json",
  "vitest.config.ts",
  "AGENTS.md",
  ".env.example",
  ".dockerignore",
  ".gitignore",
  ".gitattributes",
  ".nvmrc",
]);
const files = tracked.filter((name) => {
  if (
    name
      .split("/")
      .some((part) => part.startsWith(".env") && name !== ".env.example")
  )
    return false;
  if (/\.(sqlite(?:-shm|-wal)?|db|log)$/i.test(name)) return false;
  return rootFiles.has(name) || /^(src|public|scripts|docs|tests)\//.test(name);
});
for (const required of [
  ".env.example",
  "compose.yaml",
  "scripts/start.sh",
  "scripts/start.ps1",
]) {
  if (!files.includes(required))
    throw new Error(`Commit ${required} before packaging.`);
}
const outputDirectory = path.join(root, "dist");
mkdirSync(outputDirectory, { recursive: true });
const filename = `french-education-helper-${packageJson.version}-${revision.slice(0, 7)}.zip`;
const output = path.join(outputDirectory, filename);
execFileSync(
  "git",
  [
    "archive",
    "--format=zip",
    "--prefix=french-education-helper/",
    `--output=${output}`,
    revision,
    "--",
    ...files,
  ],
  { cwd: root },
);
const sha256 = createHash("sha256").update(readFileSync(output)).digest("hex");
writeFileSync(`${output}.sha256`, `${sha256}  ${filename}\n`);
writeFileSync(
  `${output}.manifest.json`,
  JSON.stringify(
    {
      version: packageJson.version,
      revision,
      sha256,
      files: files.length,
      install:
        "Docker + Compose on macOS, Windows (Linux containers), or Linux. Internet is required for the first build and for new AI requests. No credentials or learning history are included.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Package: ${output}\nSHA-256: ${sha256}\nCommitted revision: ${revision}`,
);
