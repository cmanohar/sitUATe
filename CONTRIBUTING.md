# Contributing to Situate

Thanks for your interest in improving Situate — an embeddable in-app feedback + UAT overlay for
Vite/React apps. This guide covers how to propose changes and get your local environment running.

## Ways to contribute

- **Report a bug or request a feature** — open an [issue](https://github.com/cmanohar/sitUATe/issues).
  Include repro steps, expected vs. actual behavior, and your environment (Node version, browser).
- **Submit a change** — fork, branch, and open a Pull Request (see below).

## Proposing changes (fork → branch → PR)

The `main` branch is protected: it can't be deleted or force-pushed, and **all changes land via Pull
Request**. The flow:

1. **Fork** this repo and clone your fork.
2. **Branch** off `main`: `git checkout -b feat/short-description` (use `fix/`, `docs/`, etc. as fits).
3. Make your change, keeping it focused — one logical change per PR.
4. **Build and test** locally (see below) — green tests and types are required.
5. **Commit** with a clear, present-tense message (e.g. `fix: handle empty selector in capture`).
6. **Push** to your fork and **open a Pull Request** against `cmanohar/sitUATe:main`.
   Describe what changed and why; link any related issue.

A maintainer will review and merge. Your fork is never written to by us — your repo only changes when
*you* push.

## Local development

This is an npm-workspaces monorepo (Node ≥ 18). From the repo root:

```bash
npm install            # install all workspace deps
npm run build          # build in dependency order: core → widget → server → admin
npm test               # run core + widget Vitest suites
npm run typecheck      # tsc --noEmit across all workspaces
npm run dev:example    # run examples/vite-react host with the overlay mounted
```

Per-package (from root):

```bash
npm test -w @situate/core      # one package's tests
npm test -w @situate/widget
```

Before opening a PR, please make sure `npm run build`, `npm test`, and `npm run typecheck` all pass.

## Conventions

A few project-specific rules worth knowing — see [`CLAUDE.md`](CLAUDE.md) and
[`docs/DESIGN.md`](docs/DESIGN.md) for the full picture:

- **One-way dependencies.** `widget` and `admin` import `core`; nothing imports `widget`; the widget
  never imports `server`. Keep `core` **React-free**.
- **ESM with explicit `.js` extensions** on relative imports, even from `.ts` sources
  (e.g. `import { UatRoot } from './UatRoot.js'`).
- **Heritage `Uat*` naming is intentional** — `UatRoot`, `useUatSession`, the `/uat/feedback` route,
  etc. read as the **UAT** inside sit·UAT·e. Please don't bulk-rename them.
- **Never commit** `.situate/sessions/` or `.situate/data/` — they hold real feedback + screenshots
  (already gitignored), nor `dist/` build output.
- Tests are **Vitest** (+ jsdom for `core`, + Testing Library for `widget`). Add or update tests for
  behavior you change.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE) that
covers this project.
