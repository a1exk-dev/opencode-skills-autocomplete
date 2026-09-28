# Memory

## Editing draft items in the private project

- Body/title edits need the draft issue's **content** ID (`DI_...`), not the project item ID: `gh project item-edit 3 --owner a1exk-dev --id DI_... --body "..."`. The `DI_` ID is in `content.id` of `gh project item-list 3 --owner a1exk-dev --format json`.
- This environment's gh (2.101.0) rejects `--owner a1exk-dev` with "unknown owner type" on `gh project` calls; use `--owner "@me"` instead (verified 2026-09-27).
- `--field` cannot be combined with `--id`; Status (single-select) is set via node IDs: `gh project item-edit --id PVTI_... --field-id PVTSSF_lAHOANlzg84Bky-JzhjiP-Y --project-id PVT_kwHOANlzg84Bky-J --single-select-option-id <option-id>`. Option IDs as of 2026-09-27: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Re-resolve if a call errors.
- Field and option IDs resolve via GraphQL: `gh api graphql -f query='{ user(login:"a1exk-dev") { projectV2(number:3) { fields(first:20) { nodes { ... on ProjectV2Field { id name dataType } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'` (this environment's schema has no `ProjectV2CustomField` type, so do not fragment on it).

## opencode TUI plugin: raw key access (2026-09-28)

- The research note on branch `research/opencode-plugin-api` concludes no plugin API exists to intercept raw key events. That is wrong: `api.renderer.keyInput.on("keypress", ...)` (opentui `KeyHandler`, node-EventEmitter style) receives every parsed key. Global listeners run before the focused editor's handler, so at key event time the pressed character is not in the buffer yet; the prompt's current state is readable via `api.renderer.currentFocusedEditor` (`plainText`, `cursorOffset`), and the buffer supports `insertText()`. `key.preventDefault()` suppresses the typed slash before it reaches the editor. Unsubscribe with `keyInput.off` wired through `api.lifecycle.onDispose`. Verified in `@opentui/core` 0.4.5 source and a fresh opencode 1.18.32 TUI session.
- The prompt's slash menu has no command or API to open it; it only (re)opens when `onInput` sees a buffer that starts with `/` and has no whitespace before the cursor. An existing first skill with the cursor before its trailing space also meets that condition, but selecting there erases the first skill. Use `api.mode.current() === "autocomplete"` to distinguish an active built-in menu from that case. For subsequent slashes, `api.ui.dialog.replace(() => api.ui.DialogSelect(...))` shows the skill list without changing the draft. Selection calls `editor.insertText()` at the saved cursor offset. `command.palette.show` opens the Ctrl+P command list, a different menu.

## opencode TUI plugin: loading gotchas (2026-09-28)

- TUI plugins load only from the `plugin` array of a `tui.json` (global config, `OPENCODE_CONFIG_DIR`, or `.opencode/tui.json`). Files in `.opencode/plugins/*.js` are NOT auto-loaded as TUI plugins; the server runtime auto-globs that directory and fails a TUI-only plugin there with "must default export an object with server()".
- A file-path plugin (absolute path or `file://` in a `tui.json` `plugin` array) must export `id` on the default export object (`{ tui, id }`); npm-package plugins get the id from the package name. Without `id`, the TUI loader drops the plugin silently.
- TUI loader diagnostics go to `console.error` and do not reach the terminal pty; opencode's own log (`~/.local/share/opencode/log/opencode.log`) only records the server-side plugin load, not TUI plugin activation.
- The npm-cached copy of an installed plugin lives at `~/.cache/opencode/packages/<name>/node_modules/<name>/dist/tui.js` (and a `<name>@latest` twin). Editing that file swaps the live plugin without republishing; a running session keeps the old code until restart.
- OpenCode 1.18.32 binds `ctrl+k` to `input.delete.to.line.end` in its effective TUI keybinds, so the plugin's conflict check skips that chord with a startup warning. `ctrl+s` has no default TUI binding and opens the palette when registered by the plugin (checked in a fresh TUI). `OPENCODE_CONFIG_DIR` adds TUI plugins to the global list; for a smoke test of a local build alongside an installed package, give a file-path wrapper a distinct plugin `id`, or the duplicate id is skipped.

## Build branch state

- Maintainer policy (2026-09-27): merge completed, CI-green ticket work into `develop` per ticket, then branch the next ticket from `develop`. First execution: PR #1 (squash) → `develop` at `c319b9f`. Per ticket: work on `feature/<ticket-slug>` off `develop`, push, PR to `develop`, squash-merge once the CI `check` job is green, then move on.
- Branch protection: ruleset `protect-branches` (id 24085471) covers `main` + `develop`: pull request required (0 approvals), status check `check` required, administrators included, merge and square-merge methods only. Direct pushes to `main`/`develop` are rejected; prefer the PR path for everything.

## Release infrastructure (2026-09-28)

- No release-please: its first run computed 1.0.0 (we need 0.1.0) and its release PR is blocked by the repo's "GitHub Actions is not permitted to create pull requests" setting, which we are not changing. The current process is documented in `docs/agents/changelog.md` (agent) and `docs/releasing.md` (human).
- npm OIDC trusted publisher shape: org `a1exk-dev`, repo `opencode-skills-autocomplete`, workflow `.github/workflows/release.yml`, `npm publish` allowed (audience `project:a1exk-dev:opencode-skills-autocomplete`). The npm name is claimed by a one-off `0.0.0` publish.
