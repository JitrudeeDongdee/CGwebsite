# CGwebsite — project instructions

Operating rules (NO GUESSING, VERIFY BEFORE DONE, DISSENT, SCOPE DRIFT, R0/R1/R2, NEVER MERGE,
LEARNING CAPTURE, SPEC-DRIVEN, TASK TRACKING) live in the global `~/.Codex/AGENTS.md` and apply
here as-is — do not duplicate them in this file. This file holds only what's specific to this repo.

@spec.md
@MEMORY.md

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
