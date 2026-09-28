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

- `src/tui.ts` is the single plugin entry. It registers skill commands,
  handles another `/` in the prompt, and binds the chord. Its helpers stay
  private to the file.
- `test/tui.test.ts` exercises skill selection through the plugin entry with
  a simulated `TuiPluginApi`.
- `test/prepare-release.test.ts` runs release preparation against a temporary
  git repository and checks both resulting files.
- `dist/` is the build output; `bun run build` writes the plugin entry and the
  declaration files that npm ships.

## Tests

Vitest checks skill ordering, origin tags, hotkey errors, dialog selection,
and prompt text through the exported TUI entry. Release tests run the command
in a temporary git repository, including rejected entries and failed writes.

CI runs no real opencode. The live TUI behaviors are covered by the
[manual smoke checklist in the README](../README.md#manual-smoke-checklist).

## How changes land

- Branch from `develop`, open a pull request to `develop`, and let CI pass.
  CI runs the four gates (check, typecheck, test, spell) on every pull request
  and on pushes to `main`.
- Follow Conventional Commits; the commit type decides the next version bump.
- Merges to `main` happen only through release and hotfix branches. Releases
  are automated, see [releasing.md](releasing.md).
