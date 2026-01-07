# GitHub Copilot Instructions for Trading Card Monitor

## Quick Overview
- Small, TypeScript-first codebase to monitor trading cards and their market data.
- Entry: `src/main.ts` (currently empty — implement startup/CLI/server behavior here).
- Build: `tsup` produces **CJS** and **ESM** builds in `dist/` and emits `.d.ts` files.
- Type system: **strict** TypeScript settings; prefer `Readonly` types and explicit `Promise` returns.

## What to know (architecture & patterns)
- Core domain types live in `src/core/` (e.g., `Card`, `CardPrinting`). Search helpers live in `src/search/` (`CardCatalog`, `CardPrototype`).
- Files use `type` aliases and `Readonly` wrappers for immutable shapes (example: `export type Card = Readonly<{ name: string; printings: CardPrinting[] }>`).
- Imports use the TypeScript path alias: `@/` → `./src/`. Example:
  - `import type { Card } from '@/core/card'`
- APIs are async and return `Promise<T | undefined>` (not `null`) for optional lookup results (see `CardCatalog.fuzzySearch`).

## Developer workflows (essential commands)
- Install: `npm install` ✅
- Type-check: `npm run check` (runs `tsc --noEmit`) — always run before PRs.
- Lint: `npm run lint` (ESLint config: `eslint.config.mjs`) — note rule exceptions: unused args may be prefixed with `_`.
- Build: `npm run build` (runs `tsup`) → `dist/` contains `cjs`, `esm`, and `.d.ts` outputs.
- Run (after build): `npm start` (relies on `package.json` `main` field that points to `dist/main.js`).

## Conventions & best practices for contributions
- Keep domain types minimal and immutable (use `Readonly` and `type` aliases).
- Prefer `undefined` for absent values.
- Prefer `async` rather than explicit `Promise` return types for async functions.
- When adding features that require a runtime entry, register the new entry in `tsup.config.mjs` or ensure `src/main.ts` orchestrates behavior.
- Add new implementation files under the relevant folder (e.g., `src/search/` for search/catalog code) and expose interfaces from `index` files if necessary.

## Linting & Type quirks to watch
- ESLint disables type-checked rules for JS files; TypeScript files use strict, type-checked rules.
- The linter includes stylistic rules and is used as a formatter — **follow formatting conventions** defined in `eslint.config.mjs`.
- Rule notes: `@typescript-eslint/no-unused-vars` allows `_`-prefixed names; `@typescript-eslint/restrict-template-expressions` allows numbers—follow existing patterns.

## Integration points
- No runtime (prod) dependencies declared — mostly dev tooling (TypeScript, eslint, tsup).
- Build emits both module formats and type declarations; CI and packaging assume `dist/` is produced.

## Examples (copyable)
- Importing a type:
  - `import type { CardPrototype } from './card-prototype'`
- Interface signature (see `src/search/card-catalog.ts`):
  - `fuzzySearch(name: string): Promise<CardPrototype | undefined>`
