# Memory

## Editing draft items in the private project

- Body/title edits need the draft issue's **content** ID (`DI_...`), not the project item ID: `gh project item-edit 3 --owner a1exk-dev --id DI_... --body "..."`. The `DI_` ID is in `content.id` of `gh project item-list 3 --owner a1exk-dev --format json`.
- This environment's gh (2.101.0) rejects `--owner a1exk-dev` with "unknown owner type" on `gh project` calls; use `--owner "@me"` instead (verified 2026-09-27).
- `--field` cannot be combined with `--id`; Status (single-select) is set via node IDs: `gh project item-edit --id PVTI_... --field-id PVTSSF_lAHOANlzg84Bky-JzhjiP-Y --project-id PVT_kwHOANlzg84Bky-J --single-select-option-id <option-id>`. Option IDs as of 2026-09-27: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Re-resolve if a call errors.
- Field and option IDs resolve via GraphQL: `gh api graphql -f query='{ user(login:"a1exk-dev") { projectV2(number:3) { fields(first:20) { nodes { ... on ProjectV2Field { id name dataType } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'` (this environment's schema has no `ProjectV2CustomField` type, so do not fragment on it).

## opencode TUI plugin: raw key access (2026-09-28)

- The research note on branch `research/opencode-plugin-api` concludes no plugin API exists to intercept raw key events. That is wrong: `api.renderer.keyInput.on("keypress", ...)` (opentui `KeyHandler`, node-EventEmitter style) receives every parsed key. Global listeners run before the focused editor's handler, so at key event time the pressed character is not in the buffer yet; the prompt's current state is readable via `api.renderer.currentFocusedEditor` (`plainText`, `cursorOffset`), and the buffer supports `insertText()`. `key.preventDefault()` suppresses the typed slash before it reaches the editor. Unsubscribe with `keyInput.off` wired through `api.lifecycle.onDispose`. Verified in `@opentui/core` 0.4.5 source and a fresh opencode 1.18.32 TUI session.
- The prompt's slash menu has no command or API to open it; it only (re)opens when `onInput` sees a buffer that starts with `/` and has no whitespace before the cursor. An existing first skill with the cursor before its trailing space also meets that condition, but selecting there erases the first skill. Use `api.mode.current() === "autocomplete"` to distinguish an active built-in menu from that case. For subsequent slashes, `api.ui.dialog.replace(() => api.ui.DialogSelect(...))` shows the skill list without changing the draft. Selection calls `editor.insertText()` at the saved cursor offset. `command.palette.show` opens the Ctrl+P command list, a different menu.
- OpenCode 1.18.32's built-in slash-menu Esc deletes the prefix through the cursor; its Esc handler stops propagation before ordinary `keyInput.on("keypress", ...)` listeners. `keyInput.prependListener("keypress", ...)` runs first. Setting the prompt cursor to 0 during Esc lets the built-in menu close without deleting `/`; restore the cursor in a resolved Promise callback. For the plugin's later-slash dialog, `dialog.replace(render, onClose)` invokes `onClose` on Esc and also on selection's `dialog.clear()`: track selection so only dismissal inserts `/`. Insert it while the cursor is saved, then move the cursor to 0 until the asynchronous `onContentChange` has run; otherwise OpenCode reopens its built-in slash menu when the insertion is before the first whitespace. Verified in a live TUI.

## opencode TUI plugin: built-in slash menu and plain slashes (2026-10-04)

- OpenCode 1.18.34 also opens the built-in menu for a `/` typed at position 0 before text and for a `/` typed inside the first word. The quiet insert in `src/tui.ts` keeps it closed in both cases, and it closes a menu that is already open when the `/` lands at position 0. Typing or backspacing inside that leading word later still reopens the menu.
- Live-test with tmux: `XDG_CONFIG_HOME=<scratch> opencode`, where `<scratch>/opencode/tui.json` lists only the `file://` build, so the globally installed copy does not also handle keys. A run with no plugin shows the unmodified behavior. `ctrl+u` deletes only to the cursor, so clear a prompt with `End` first and `ctrl+u` second, or restart the session between cases. Switching models mid-session opens a Select variant dialog that swallows every keystroke until `Esc`.

## opencode 2.x load path, verified live (2026-10-12)

- Sandbox a 2.x host without disturbing the installed 1.x one: `npm install @opencode/cli@2.0.27` into a scratch directory, then run `node_modules/.bin/opencode` with `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`, `XDG_DATA_HOME` and `XDG_STATE_HOME` all pointed inside that tree. 2.0.27 honours all four, so the real `~/.config/opencode` and `~/.cache/opencode` stay untouched. npm blocks the package's `postinstall` and the binary still runs.
- Given a config holding only a `tui.json`, the first launch writes `cli.json` next to it with `plugins: ["<name>"]` and leaves `tui.json` in place, then installs the package into `$XDG_CACHE_HOME/opencode/npm/<name>@latest/<ms-epoch>/node_modules/<name>/`. The generation directory is a millisecond epoch rather than a sequence number, and `npm/` is a separate root from 1.x's `packages/`.
- A v1-shaped `{ id, tui }` default export fails in three places at once: an error toast (`Plugin failed: <name>` / `Run /plugins to view details.`) that appears about two seconds after launch and lasts about five, a persistent `1 plugin failed /plugins` item in the status bar, and a `/plugins` row marked `failed` whose dialog is titled "TUI plugin error" and reads `Invalid V2 TUI plugin module: <name>`.
- `export default { id, tui, setup }` satisfies both hosts from one file. On 1.19.0 the plugin loads and the skill rows work, `setup` untouched; on 2.0.27 `setup` runs, `/plugins` lists the plugin as loaded with a `disable` action, and the status-bar failure item is gone.
- `context.ui.toast.show({ variant, title, message })` called from `setup` reaches the screen. The message wraps across the toast box instead of being clipped, and `variant: "warning"` draws an amber border (RGB 245,167,66). The cost of being accepted is that the persistent status-bar item disappears, so a user who misses the five-second toast has nothing left to read.
- Patching the cached copy swaps the live module on 2.x as it does on 1.x: rename `<generation>/node_modules/<name>/dist/tui.js` aside and write a wrapper that re-exports it with the extra key. A running session keeps the old code until restart.

## opencode TUI plugin: loading gotchas (2026-09-28)

- TUI plugins load only from the `plugin` array of a `tui.json` (global config, `OPENCODE_CONFIG_DIR`, or `.opencode/tui.json`). Files in `.opencode/plugins/*.js` are NOT auto-loaded as TUI plugins; the server runtime auto-globs that directory and fails a TUI-only plugin there with "must default export an object with server()".
- A file-path plugin (absolute path or `file://` in a `tui.json` `plugin` array) must export `id` on the default export object (`{ tui, id }`); npm-package plugins get the id from the package name. Without `id`, the TUI loader drops the plugin silently.
- TUI loader diagnostics go to `console.error` and do not reach the terminal pty; opencode's own log (`~/.local/share/opencode/log/opencode.log`) only records the server-side plugin load, not TUI plugin activation.
- The npm-cached copy of an installed plugin lives at `~/.cache/opencode/packages/<name>/node_modules/<name>/dist/tui.js` (and a `<name>@latest` twin). Editing that file swaps the live plugin without republishing; a running session keeps the old code until restart.
- OpenCode 1.18.32 binds `ctrl+k` to `input.delete.to.line.end` in its effective TUI keybinds, so the plugin's conflict check skips that shortcut with a startup warning. `ctrl+s` has no default TUI binding and opens the palette when registered by the plugin (checked in a fresh TUI). `OPENCODE_CONFIG_DIR` adds TUI plugins to the global list; for a smoke test of a local build alongside an installed package, give a file-path wrapper a distinct plugin `id`, or the duplicate id is skipped.

## Build branch state

- Maintainer policy (2026-09-27): merge completed, CI-green ticket work into `develop` per ticket, then branch the next ticket from `develop`. First execution: PR #1 (squash) → `develop` at `c319b9f`. Per ticket: work on `feature/<ticket-slug>` off `develop`, push, PR to `develop`, squash-merge once the CI `check` job is green, then move on.
- Branch protection: ruleset `protect-branches` (id 24085471) covers `main` + `develop`: pull request required (0 approvals), status check `check` required, administrators included, merge and square-merge methods only. Direct pushes to `main`/`develop` are rejected; prefer the PR path for everything.

## Release infrastructure (2026-09-28)

- No release-please: its first run computed 1.0.0 (we need 0.1.0) and its release PR is blocked by the repo's "GitHub Actions is not permitted to create pull requests" setting, which we are not changing. The current process is documented in `docs/agents/changelog.md` (agent) and `docs/releasing.md` (human).
- npm OIDC trusted publisher shape: org `a1exk-dev`, repo `opencode-skills-autocomplete`, workflow `.github/workflows/release.yml`, `npm publish` allowed (audience `project:a1exk-dev:opencode-skills-autocomplete`). The npm name is claimed by a one-off `0.0.0` publish.

## Release merges: squash, and what the backmerge costs (2026-10-13)

- A release pull request into `main` is squash-merged, so `main`'s release commit has **one parent** and carries the whole diff since the previous release, although `changelog.md` step 4 asks for a no-fast-forward merge commit. `develop` is therefore never an ancestor of `main`, which is why every release needs the explicit backmerge branch.
- That shape makes the backmerge conflict on **every change the release branch added beyond the generated `CHANGELOG.md` and `package.json` lines**, because `develop` holds those same changes under different commits. Resolve each hunk in favour of `main` and verify the whole merge in one step: `git diff <release branch head>` against the merged tree must be empty, since nothing but the release branch should have reached `main`.
- `gh pr merge --squash` names the squash commit after the **branch's commit**, not the pull request title. On a backmerge branch that commit is the merge, so its second parent's subject wins: 1.0.0's backmerge landed as `chore(release): prepare 1.0.0 (#33) (#34)` instead of naming the backmerge. Pass `--subject` for anything but a single-commit branch. The `protect-branches` ruleset blocks the force-push that would relabel it afterwards.
- `gh pr checks --watch` after `gh pr update-branch` can report the **previous** head's finished run as passing, so it exits green while the real run is still queued. Read `headRefOid` from the pull request and watch the run whose `headSha` matches it (`gh run list --branch <branch>`).

## Vendored skills: deliberate deviations from upstream (2026-10-12)

- `.agents/skills/*` are vendored copies: 17 from `mattpocock/skills` (`skills/<category>/<skill>/`, category is `engineering` except `grilling`, `wait-what`, and `writing-for-agents`, which are `productivity`), and `humanizer` from the root of `blader/humanizer`. Refresh by replacing each directory's files from upstream `main`.
- Two deviations survive a refresh and must be reapplied:
  - Upstream names the glossary `GLOSSARY.md` (and `GLOSSARY-MAP.md`, `GLOSSARY-FORMAT.md`). This repo keeps `CONTEXT.md`, so rename every reference back after pulling. Affects `domain-modeling` (including its `CONTEXT-FORMAT.md` filename), `wait-what`, `triage`, `codebase-design`, `improve-codebase-architecture`, `tdd`.
  - `wait-what` upstream carries `disable-model-invocation: true`, which would stop an agent from running the root `AGENTS.md` writing rule. Drop that line from the vendored copy. Its `agents/openai.yaml` still sets `allow_implicit_invocation: false`, so OpenCode treats the skill as user-invoked only.
- `setup-matt-pocock-skills` is intentionally not vendored. Six skills name it as a fallback for a repo that has not been set up; `docs/agents/` already holds that setup.
- `cspell` reads only `**/*.md` outside `.agents/`, so vendored skill text does not gate CI.
