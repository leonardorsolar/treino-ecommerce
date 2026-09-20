#!/usr/bin/env node
"use strict";

// Uses dynamic import() only (no static `require`/`import`) so this file
// runs correctly whether the host project resolves .js as CommonJS or as an
// ES module (i.e. regardless of the nearest package.json's "type" field).

const ID_PATTERN = /\b(UT|IT|E2E)-\d{2,4}\b/g;
const TEST_FILE_PATTERN = /\.(test|spec)\.(jsx?|tsx?)$/;
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".next", ".turbo"]);

function fail(message) {
  console.error(`check-test-coverage: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = { taskDir: null, testDir: null, json: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--test-dir") {
      args.testDir = argv[++i];
    } else if (arg === "--json") {
      args.json = true;
    } else {
      positional.push(arg);
    }
  }
  args.taskDir = positional[0] || null;
  return args;
}

// Extracts test IDs (e.g. UT-001, E2E-001) from table rows under the
// "Matriz de Cobertura" heading in _tests.md. Falls back to scanning the
// whole file if that heading isn't found, so a differently-titled matrix
// still yields IDs instead of silently reporting zero coverage.
function extractCoverageMatrixIds(testsMdContent) {
  const lines = testsMdContent.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^#{1,6}\s*.*matriz de cobertura/i.test(line));

  let sectionLines;
  if (headingIndex === -1) {
    sectionLines = lines;
  } else {
    const headingLevel = lines[headingIndex].match(/^#+/)[0].length;
    const rest = lines.slice(headingIndex + 1);
    const endOffset = rest.findIndex((line) => {
      const match = line.match(/^(#{1,6})\s/);
      return Boolean(match && match[1].length <= headingLevel);
    });
    sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
  }

  const ids = new Set();
  for (const line of sectionLines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(trimmed)) continue; // separator row
    const matches = trimmed.match(ID_PATTERN);
    if (matches) matches.forEach((id) => ids.add(id));
  }
  return { ids: [...ids].sort(), matrixFound: headingIndex !== -1 };
}

function walk(fs, path, dir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fs, path, full, files);
    } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      files.push(full);
    }
  }
}

function extractFoundIds(fs, path, testDir) {
  const files = [];
  walk(fs, path, testDir, files);
  const found = new Map(); // id -> relative file paths that mention it
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(ID_PATTERN);
    if (!matches) continue;
    for (const id of matches) {
      if (!found.has(id)) found.set(id, new Set());
      found.get(id).add(path.relative(testDir, file));
    }
  }
  return found;
}

async function main() {
  const fs = await import("node:fs");
  const path = await import("node:path");

  const args = parseArgs(process.argv.slice(2));
  if (!args.taskDir) {
    fail("usage: check-test-coverage.js <task-dir> [--test-dir <dir>] [--json]");
  }

  const taskDir = path.resolve(args.taskDir);
  const testsMdPath = path.join(taskDir, "_tests.md");
  if (!fs.existsSync(testsMdPath)) {
    fail(`_tests.md not found at ${testsMdPath}`);
  }

  const testDir = path.resolve(args.testDir || process.cwd());
  const testsMdContent = fs.readFileSync(testsMdPath, "utf8");
  const { ids: specifiedIds, matrixFound } = extractCoverageMatrixIds(testsMdContent);
  const foundMap = extractFoundIds(fs, path, testDir);
  const foundIds = [...foundMap.keys()].sort();

  const specifiedSet = new Set(specifiedIds);
  const gaps = specifiedIds.filter((id) => !foundMap.has(id));
  const untracked = foundIds.filter((id) => !specifiedSet.has(id));

  const result = {
    taskDir,
    testsMdPath,
    testDir,
    matrixHeadingFound: matrixFound,
    specified: specifiedIds,
    found: foundIds,
    gaps,
    untracked,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Coverage matrix: ${testsMdPath}`);
    console.log(`Test dir: ${testDir}`);
    console.log(`Specified IDs (${specifiedIds.length}): ${specifiedIds.join(", ") || "(none)"}`);
    console.log(`Found IDs (${foundIds.length}): ${foundIds.join(", ") || "(none)"}`);
    console.log(`Gaps (${gaps.length}): ${gaps.join(", ") || "(none)"}`);
    console.log(`Untracked (${untracked.length}): ${untracked.join(", ") || "(none)"}`);
  }

  process.exit(gaps.length > 0 ? 1 : 0);
}

main();
