# opencode-skills-autocomplete

An [opencode](https://opencode.ai) plugin that lists every available skill as a row
in the `/` menu and adds a configurable chord shortcut to the same list. Selecting a
skill inserts `/name ` into the prompt at the cursor. The plugin never submits.

## Install

Add the package to the `plugin` array in your `opencode.json`. opencode installs
named npm packages automatically at startup and caches them.

```json
{
    "plugin": ["opencode-skills-autocomplete"]
}
```

To pin a version:

```json
{
    "plugin": ["opencode-skills-autocomplete@0.1.0"]
}
```

The plugin requires opencode 1.0.137 or newer; older versions skip it at load
time with a compatibility error.

## Usage

Every skill opencode discovers appears as a row in the `/` menu, one row per
skill, in A-to-Z case-insensitive order. The menu is shared with opencode's
built-in rows, which the menu interleaves in its own order. Each row shows the
skill name and its origin in the description column:

- `(user)`: the skill lives under your home or config directories
- `(project)`: the skill lives inside the current project worktree
- `(built-in)`: the skill ships with opencode

Type in the `/` menu to filter. Matching is case-insensitive and covers the
skill name only, using the menu's own filter.

Selecting a skill inserts `/name ` at the cursor, with a trailing space.
opencode does not submit a prompt that contains only `/name`, so the trailing
space is what makes a skill-only prompt sendable: press Enter to run the
skill.

### Chord shortcut

`ctrl+k` by default opens the same command list without typing `/`. Configure
the key with the `hotkey` option below.

### The `hotkey` option

The chord accepts any valid opencode keybind string and defaults to `ctrl+k`:

```json
{
    "plugin": [["opencode-skills-autocomplete", { "hotkey": "ctrl+shift+k" }]]
}
```

If the key is already bound in your effective keybinds, or the value is not a
valid keybind, the plugin shows a warning toast and skips the chord. The `/`
menu keeps working.

## opencode version requirement

The plugin declares `engines.opencode: ">=1.0.137"` in its manifest. 1.0.137 is
the first opencode release that ships the prompt-append primitive the paste
behavior uses. On older versions the opencode loader skips the plugin with a
native compatibility error, so it never runs in a half-working state.

## Development

Requires [bun](https://bun.sh).

```sh
bun install
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `bun run check`     | Biome lint and format check over the repo     |
| `bun run typecheck` | TypeScript check over the source and test     |
| `bun run test`      | Vitest unit and integration tests             |
| `bun run spell`     | cspell over all Markdown files                |
| `bun run build`     | Builds `dist/`, the plugin entry plus types   |

More on the test layout and how changes land in
[docs/development.md](docs/development.md).

### Manual smoke checklist

The live TUI has no automatable driver, so run these by hand after changes
that touch skill registration or paste behavior. Use a project with at least
one user-level, one project-level, and one built-in skill.

1. Open the `/` menu. Each skill shows as a row, in A-to-Z order, with the
   right `(user)`, `(project)`, or `(built-in)` tag.
2. Type a few letters. The list filters by name, case-insensitively.
3. Select a skill. The prompt gains `/name ` with a trailing space at the
   cursor, and the prompt is not submitted.
4. With only `/name ` in the prompt, press Enter. The skill runs.
5. Press `ctrl+k`, or your configured hotkey. The command palette opens with
   the same rows.
6. Set `hotkey` to a key you already bind (for example `ctrl+p`) and restart.
   A warning toast appears, the chord does nothing, and the `/` menu still
   works.
7. Set `hotkey` to a value that is not a keybind (for example `k+k`) and
   restart. Same warn-and-skip behavior.

## Listing the plugin

One-time, manual work after the first release. Neither list has an API or a
per-release path:

- Open a PR to add the plugin to the
  [opencode ecosystem list](https://opencode.ai/docs/ecosystem#plugins).
- Open a PR to add the plugin to
  [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode).

## Reporting bugs

Open a public issue with the bug report template; details in
[docs/bug-reporting.md](docs/bug-reporting.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
