# Development

This file covers how to build, test, and land changes to the plugin. For
install and usage, see the [README](../README.md).

## Setup

[bun](https://bun.sh) is the package manager, build tool, and test runner.

```sh
git clone https://github.com/a1exk-dev/opencode-skills-autocomplete.git
cd opencode-skills-autocomplete
bun install
```

## Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `bun run check`     | Biome lint and format check over the repo     |
| `bun run typecheck` | TypeScript check over the source and test     |
| `bun run test`      | Vitest unit and integration tests             |
| `bun run spell`     | cspell over all Markdown files                |
| `bun run build`     | Builds `dist/`, the plugin entry plus types   |

## Layout

- `src/tui.ts` is the single plugin entry. It registers one palette command
  per skill and binds the chord, and it holds the pure helpers (`sortSkills`,
  `originTag`, `parseHotkey`, `pasteText`) in the same module.
- `test/tui.test.ts` unit-tests those helpers and drives the exported entry
  with a mocked `TuiPluginApi`.
- `dist/` is the build output; `bun run build` writes the plugin entry and the
  declaration files that npm ships.

## Tests

Vitest runs two layers:

- Unit tests for the pure helpers: A-to-Z case-insensitive sort, origin
  classification from the skill `location`, hotkey parsing, and paste-text
  assembly.
- One in-process integration test that invokes the exported TUI entry with a
  mocked `TuiPluginApi` and asserts the registered command set, the chord
  binding, the warn-and-skip path on a bad hotkey, and the exact text a
  select inserts.

CI runs no real opencode. The live TUI behaviors are covered by the
[manual smoke checklist in the README](../README.md#manual-smoke-checklist).

## How changes land

- Branch from `develop`, open a pull request to `develop`, and let CI pass.
  CI runs the four gates (check, typecheck, test, spell) on every pull request
  and on pushes to `main`.
- Follow Conventional Commits; the commit type decides the next version bump.
- Merges to `main` happen only through release and hotfix branches. Releases
  are automated, see [releasing.md](releasing.md).
