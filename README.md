# opencode-skills-autocomplete

An [opencode](https://opencode.ai) plugin that lists every available skill in
the `/` menu. After selecting a skill, type a standalone `/` to open a
searchable skill list and add another one. Selecting a skill inserts `/name `
into the prompt at the cursor. The plugin never submits.

## Install

Add the package to the `plugin` array in your `tui.json`. opencode installs
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

Type a standalone `/` after the first skill to open the searchable Skills
dialog. Select another skill to keep both in the prompt, for example
`/grilling /tdd `. Press Esc to close either menu and keep the `/` you typed
at the cursor.

A `/` is standalone when the character directly before it is whitespace
(such as a space, tab, or line break) or the start of the prompt, and the
character directly after it is whitespace or the end of the prompt. Any other
`/` is plain text and opens no menu:

- `fix this /` opens the Skills dialog.
- `path/to/file`, `http://`, and `see (/` type a plain `/`.
- With the cursor directly before `more` in `ask more` (after the space), a
  typed `/` is a plain `/` in front of `more`.

The rule covers opencode's own `/` menu too:

- A `/` typed at the start of the prompt directly before text, or in the first
  word of a prompt that starts with `/`, is plain text and opens no menu.
- If that menu is already open, a `/` typed at the very start closes it.
- An empty prompt, or a `/` at the start before whitespace, still opens the
  menu.
- Typing more characters in that first word can open the menu again.

### Chord shortcut

`ctrl+s` by default opens the command palette without typing `/`. OpenCode
uses `ctrl+k` to delete to the end of the input line, so the plugin cannot use
that key unless you free it in your TUI keybinds. Configure the shortcut with
the `hotkey` option below.

### The `hotkey` option

The chord accepts any valid opencode keybind string and defaults to `ctrl+s`:

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

Run these in a fresh TUI after changes that touch skill registration or
paste behavior. Use a project with at least
one user-level, one project-level, and one built-in skill.

1. Open the `/` menu. Each skill shows as a row, in A-to-Z order, with the
   right `(user)`, `(project)`, or `(built-in)` tag. Press Esc: the menu closes
   and `/` stays in the prompt.
2. Reopen the `/` menu and type a few letters. The list filters by name,
   case-insensitively.
3. Select a skill. The prompt gains `/name ` with a trailing space at the
   cursor, and the prompt is not submitted.
4. Type a standalone `/` (a space before it, nothing after it), filter the
   Skills dialog, and select a second skill. Both `/name ` entries remain in
   the prompt. Open the dialog again and press Esc: the typed `/` remains at
   the cursor.
5. Type `path/` in an empty prompt, then ` /`. The first `/` opens no menu and
   the second opens the Skills dialog.
6. Clear the prompt, type `abc`, press Home, and type `/`. The prompt reads
   `/abc` and no menu opens.
7. Clear the prompt, type `/ab`, and press Esc. Move the cursor between `a` and
   `b`, and type `/`. The prompt reads `/a/b` and no menu opens.
8. Clear the prompt, type `/ab` with opencode's menu open, press Home, and type
   `/`. The menu closes and the prompt reads `//ab`.
9. With only `/name ` in the prompt, press Enter. The skill runs.
10. Press `ctrl+s`, or your configured hotkey. The command palette opens with
    the same rows.
11. Set `hotkey` to a key you already bind (for example `ctrl+p`) and restart.
    A warning toast appears, the chord does nothing, and the `/` menu still
    works.
12. Set `hotkey` to a value that is not a keybind (for example `k+k`) and
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
