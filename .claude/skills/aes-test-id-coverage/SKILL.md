---
name: aes-test-id-coverage
description: Verifies every test ID in a task's `_tests.md` coverage matrix (UT-*, IT-*, E2E-*, etc.) is backed by a real test, not just a checked box. Use as part of Spec Contract Parity in aes-final-verify whenever the task being verified has a `_tests.md`. Do not use as a standalone gate outside a completion claim, and skip it when the task has no `_tests.md`.
---

# Test ID Coverage

A `_tests.md` coverage matrix that lists test IDs proves intent, not implementation. This gate checks that every ID actually shows up in a test file — the same "evidence before claims" standard `aes-final-verify` applies to everything else.

## When to Run

Run this as part of `aes-final-verify`'s Spec Contract Parity gate, whenever the task under verification has a `_tests.md`. It is an optional companion gate: `aes-final-verify` probes for this skill and skips the coverage check entirely if it is not installed — never invent a substitute.

## How to Run

The script lives alongside this SKILL.md, at `scripts/check-test-coverage.js`
— resolve it relative to this skill's own directory, not the project root
or the current working directory. The exact install path varies per
project (`.claude/skills/`, `.agents/skills/`, a plugin cache, etc.), so
never hardcode it: use the path this SKILL.md was read from.

For example, if this file was read from
`.claude/skills/aes-test-id-coverage/SKILL.md`, run:

    node .claude/skills/aes-test-id-coverage/scripts/check-test-coverage.js .aes/tasks/<name>/

Options:

- `--test-dir <dir>` — root to search for test files (default: current
  working directory, typically the project root).
- `--json` — machine-readable output.

The script reads the "Matriz de Cobertura" table in `<task>/_tests.md`,
extracts every test ID (e.g. `UT-001`, `IT-002`, `E2E-001`), then
recursively scans `--test-dir` for `*.test.*` / `*.spec.*` files (`.js`,
`.jsx`, `.ts`, `.tsx`) whose content contains those IDs. Adapt the
file-extension pattern inside the script if the project's test suite uses
a different convention (e.g. `.test.py`, `.spec.rb`).

## How to Interpret

- **`gaps`** — IDs present in `_tests.md`'s coverage matrix with no matching test found anywhere under `--test-dir`. A non-empty `gaps` list blocks the completion claim. Fix it by implementing the missing test — never by deleting the ID from `_tests.md` to make the gap disappear.
- **`untracked`** — IDs found in test files that are not listed in `_tests.md`'s coverage matrix. This is a warning only; it does not block the claim, but cite it in the Verification Report so the matrix can be reconciled later.
- **Exit code** — `0` when `gaps` is empty, `1` when `gaps` is non-empty.

Cite the exit code and the `gaps` count (and any `untracked` IDs) on `aes-final-verify`'s Verification Report `Contract parity:` line.
