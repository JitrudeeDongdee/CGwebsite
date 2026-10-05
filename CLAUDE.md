# CGwebsite — project instructions

Operating rules (NO GUESSING, VERIFY BEFORE DONE, DISSENT, SCOPE DRIFT, R0/R1/R2, NEVER MERGE,
LEARNING CAPTURE, SPEC-DRIVEN, TASK TRACKING) live in the global `~/.claude/CLAUDE.md` and apply
here as-is — do not duplicate them in this file. This file holds only what's specific to this repo.

@spec.md
@MEMORY.md

## Tracking — spec/memory driven, NO Phak

This repo is **spec/memory driven** and is **opted out of Phak PM** (the global TASK TRACKING rule
does not apply here). Do **not** connect to or call the Phak MCP for this project.

- **Source of truth = this repo's `spec.md` + `MEMORY.md`.** Read both at session start; keep
  `spec.md` ("Current state", decisions, data contracts) updated after each task, and log failures /
  gotchas to `MEMORY.md` (what happened / root cause / correct behavior) per LEARNING CAPTURE.
- All other global operating rules still apply (NO GUESSING, VERIFY BEFORE DONE, DISSENT, SCOPE
  DRIFT, R0/R1/R2, NEVER MERGE, SPEC-DRIVEN, LEARNING CAPTURE, GIT FLOW + SEMVER).
- The **Deploy Fail Log** (a separate Phak project in the global rules) is also skipped here; if a
  deploy fails, record it in `MEMORY.md` instead.

## Package manager: pnpm — not npm/yarn

This project uses **pnpm** exclusively. Do not run `npm install`, `npm run *`, or `yarn *`, and do
not let `package-lock.json` or `yarn.lock` get regenerated — `pnpm-lock.yaml` is the only lockfile
tracked in git.

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
```

## Stack
Vite + React 19 + react-three-fiber (three.js), TypeScript, oxlint. UI chrome must use MUI
(Material-UI) with a custom theme — see `spec.md` for architecture, data contracts, and current state.
