# Research: the opencode 2.x plugin surface, measured against the README

<!-- cspell:words anomalyco keymap Keymap autoinvoke frontmatter fuzzysort extmark Renderable renderable renderables qjat -->

Date: 2026-10-20. Ticket: "Research: opencode 2.x plugin surface for parity" (map: 2.0.0, opencode
2.x migration).

Sources: the `anomalyco/opencode` repository at tag `v2.1.1` (commit `ba546ec`, 2026-10-20), with
`v2.0.27` (commit `1f4d07a`) fetched for diffs; the npm registry; the published tarballs of
`@opencode/cli@2.1.1`, `@opencode/plugin@2.1.1`, `@opentui/core@0.6.6`, `@opentui/keymap@0.6.6`
and `@opentui/solid@0.6.6`. The v2 docs are read from their source in the same repository
(`services/www/src/docs/content/`), which is what `opencode.ai/v2/docs` renders. No secondary
write-ups were used.

Citations: `path:line` means the file at `v2.1.1` unless another tag is named, with the URL form
`https://github.com/anomalyco/opencode/blob/v2.1.1/<path>#L<line>`. Tarball paths are relative to
the package root of the named version.

Verification levels:

- **source**: read in the source or the published package. Nothing here was run.
- **live**: observed in a running opencode TUI. No claim in this note reached that level; see
  [What is still unverified live](#what-is-still-unverified-live).

This note builds on `docs/research/opencode-1-19-and-2-x.md` (branch
`research/opencode-1-19-and-2-x`) and corrects one of its claims (Q6).

---

## Headline

Most of `src/tui.ts` has a v2 counterpart, and two README workarounds become unnecessary. One
behavior cannot be kept with a CLI-only plugin:

- **Enter no longer runs a `/name` skill.** In v2 a skill reaches the model only as a skill
  attachment on the prompt. Typed text such as `/grilling ` is sent as plain text. The TUI creates
  attachments only through its own `@` menu and its built-in `/skills` dialog, and the plugin
  context offers no way to add one. The one documented hook that can add skills to a prompt is
  the server-side `session.hook("prompt")`. Using it means shipping a server entrypoint as well
  and having users list the package in `opencode.json`. (Q3)
- **Esc in the built-in slash menu keeps the typed text on v2.** The v1 Esc cursor workaround is
  no longer needed. (Q5)
- **The effective-keybind conflict check has no direct counterpart.** `tuiConfig` and
  `parseKeySequence` are gone from the context. (Q7)

---

## Q1. Latest published version, and what changed since 2.0.27

**Answer (source).** The latest published 2.x is **2.1.1**, released 2026-10-20. Five releases
landed after 2.0.27: 2.0.28 to 2.0.32, then 2.1.0 and 2.1.1.

- npm `@opencode/cli` and `@opencode/plugin` both have `dist-tags.latest = "2.1.1"`.
  `time["2.1.1"] = 2026-10-20T13:33:08.805Z` for the CLI, and `2.1.0` was published the same
  morning (<https://registry.npmjs.org/@opencode%2Fcli>,
  <https://registry.npmjs.org/@opencode%2Fplugin>). The newest git tags are `v2.0.31`,
  `v2.0.32`, `v2.1.0` and `v2.1.1` (`git ls-remote --tags`).
- `@opentui/core` latest is `0.6.6` (2026-10-14T18:32:53Z); `0.5.17` was 2026-10-08
  (<https://registry.npmjs.org/@opentui%2Fcore>).

What changed between `v2.0.27` and `v2.1.1` in the surfaces this plugin touches:

| Surface | Change | Where |
| --- | --- | --- |
| Plugin TUI contract (`Context`, `Definition`) | **None.** `git diff v2.0.27 v2.1.1 -- packages/plugin/src/tui` is empty. | `packages/plugin/src/tui/` |
| `@opencode/plugin` peer deps | `@opentui/core` and `@opentui/solid` raised from `>=0.5.17` to **`>=0.6.6`** | `packages/plugin/package.json` (diff) |
| opentui used by the host | Pinned to `0.6.6` for `core`, `keymap` and `solid` | root `package.json:57-59` (catalog) |
| Built-in slash menu trigger | 2.0.27 opened the menu for **any** standalone `/` before the cursor (`if (slash !== undefined)`, `v2.0.27:packages/tui/src/component/prompt/autocomplete.tsx:806`). 2.1.1 opens it only when that `/` is the **first character** (`if (slash === 0)`, `autocomplete.tsx:813`). | Q5 |
| Prompt offsets | `display.ts` rewritten to measure with opentui's `measureEditText(widthMethod)` in place of the TUI's own `stringWidth` | `packages/tui/src/prompt/display.ts:1-41` |
| Dialog and select UI | `ui/dialog.tsx` (+314 lines) and `ui/dialog-select.tsx` (+561/-) reworked. The plugin `Dialog` interface is unchanged. | `git diff --stat` |
| Skills | Skill scan gains ignore globs (`config/plugin/skill-scan.ts`, new); the skill file sample ignores `FSUtil.ignoreGlobs` (`packages/core/src/skill.ts:57-65`) | |
| Plugin install | `windowsHide: true` added to the Arborist and pacote options. Nothing else changed. | `packages/util/src/npm.ts` (diff) |

`docs` changed too: `build/plugins/cli.mdx:236-254` has a new section, "Plugins built for
OpenTUI 0.5", about 0.6's owner arguments and the removed `getLayoutNode()`. None of the APIs it
lists are used by `src/tui.ts`.

## Q2. Skill list

**Answer (source).** `api.client.app.skills()` is replaced by the cached, location-scoped
collection `context.data.location.skill`, with `list(location)` and `sync(location)`. The three
origin tags can still be told apart without `api.state.path`.

- `Data.location.skill: LocationCollection<SkillInfo>` (`packages/plugin/src/tui/context.ts:138`),
  where `list(location?)` returns `SkillInfo[] | undefined` until synced (`context.ts:55-59`). The
  documented pattern is `await context.data.location.skill.sync(location)` followed by
  `context.data.location.skill.list(location) ?? []` (`services/www/src/docs/content/build/plugins/cli.mdx:168-191`).
  The TUI's own Skills dialog uses the same sequence (`packages/tui/src/component/dialog-skill.tsx:23-29`).
- `SkillInfo = { id, name, description?, autoinvoke?, path, content }`
  (`packages/client/src/promise/generated/types.ts:436-443`). **`id` is the invocation key and
  `name` is only a label.** File skills take `id` from the directory or file name and `name` from
  frontmatter, falling back to `id` (`packages/core/src/config/plugin/skill-file.ts:45-56`). The
  docs say "The frontmatter `name` is only a display label" and "IDs are exact and case-sensitive"
  (`services/www/src/docs/content/skills.mdx`, "IDs" section). The built-ins already differ:
  `id: "opencode"` with `name: "OpenCode"`, and `id: "report"` with `name: "Report"`
  (`packages/core/src/plugin/skill.ts:28-44`). A v2 port should use `id` wherever v1 used `name`
  for `/name`.

**Origin tags:**

- **`(built-in)`**: built-in skills have the synthetic paths `"/builtin/opencode.md"` and
  `"/builtin/report.md"` (`packages/core/src/plugin/skill.ts:33,42`), so the v1 `"<built-in>"`
  sentinel becomes a `path.startsWith("/builtin/")` test. Those are the only two `/builtin` paths in
  `packages/` (grep).
- **`(project)` vs `(user)`**: the current directory is `context.location?.directory`, with
  `context.data.location.default()` when `location` is undefined (`context.ts:546`; docs
  `cli.mdx:29`). The worktree root that v1 read from `api.state.path.worktree` is available from
  `context.client.location.get(...)`, which returns
  `LocationPublicInfo = { directory, project: { id, directory, canonical } }`
  (`packages/client/src/promise/generated/types.ts:323-326`, `client.ts:451-456`, route
  `GET /api/location`). The server fills `project.directory` with the git worktree of this
  checkout (`repo.worktree`; `packages/core/src/project.ts:354-380`,
  `packages/core/src/location.ts:24-28`). `canonical` is the main clone, which can be a different
  directory (`project.ts:43`). So the v1 rule ("under worktree or directory means project,
  otherwise user") ports unchanged.
- Skill sources in v2 are the global config dir, `~/.claude`, `~/.agents`, and a walk from the
  current directory **up to the filesystem root** for `.claude`, `.agents` and `.opencode`
  (`packages/core/src/config/discovery.ts:69-88`; docs `skills.mdx` table "Global / Global
  compatibility / Project / Project compatibility"). URL skills are pulled into a cache and get
  cache paths (`packages/core/src/config/plugin/skill.ts:108-119`), so they tag `(user)`. Skills
  that another plugin adds through `ctx.skill.transform` carry whatever `path` that plugin sets.

## Q3. Slash rows

**Answer (source).** A plugin adds rows to the built-in `/` menu by registering keymap commands
that carry `slash`. A row can insert `/name ` without submitting. **v2 does not list skills in the
`/` menu itself.** It lists them in the `@` menu and in a `/skills` dialog, and **a typed `/name`
does not run a skill on v2.**

How rows get there:

- `KeymapCommand.slash?: { name, aliases?, arguments?: true }`, documented as "Adds a named
  command to prompt slash completion" (`packages/plugin/src/tui/context.ts:422-428`). It needs an
  `id` ("Slash commands require an ID", `packages/tui/src/context/keymap.tsx:264`). Commands are
  registered through `context.keymap.layer(() => ({ commands }))` (`context.ts:470`; docs
  `cli.mdx:278-301`).
- The menu builds one row per slash name and alias, displayed as `/<name>`, with
  `command.description ?? command.title` in the description column. Rows are sorted together with
  server commands by `a.display.localeCompare(b.display)` (`autocomplete.tsx:474-496`). The rows
  appear only while the trigger is at index 0 (`autocomplete.tsx:540-545`).
- Filtering differs from v1. A typed query is fuzzy-matched by fuzzysort over the display text
  **and the description** in command mode ("Match description for slash commands only",
  `autocomplete.tsx:556-557`), and a filtered list is cut to **10 rows**
  (`autocomplete.tsx:549-575`). If the origin tag goes in the description, typing `user` matches
  every `(user)` skill. The README claim "covers the skill name only" then no longer holds unless
  the tag moves out of `description`.

What selecting a row does (`autocomplete.tsx:481`, `select()` at `:615-626`):

- **With `arguments: true`**, selection calls `insertSlash(name)`, which deletes from the prompt
  start to the cursor and inserts `` `/${name} ` ``, with no submit (`autocomplete.tsx:466-472`). But
  on Enter, `argumentSlash` finds the command, clears the prompt and calls `run(rest)` instead of
  sending a message (`packages/tui/src/component/prompt/index.tsx:173-183`, `:1139-1151`). So
  `arguments: true` gives the right insert and takes over the submit.
- **Without `arguments`**, selection first removes the typed `/query` token (`hide(true)`,
  `autocomplete.tsx:744-757`) and then calls the command's `run()`. A plugin can insert `/name `
  itself from `run` through `context.renderer.currentFocusedEditor.insertText`. On Enter, that text
  is sent as an ordinary prompt, because it is neither an argument command nor a server command
  (`index.tsx:1153-1156`, `:1318`).

Why a `/name` prompt does not run the skill on v2:

- Server commands and argument commands are the only slash heads the submit path interprets
  (`index.tsx:1139-1156`). Skills are not commands. The server's command list holds `init`,
  `review`, MCP prompts and config commands (`packages/core/src/plugin/command.ts:27-80`).
- Skills reach the model as `prompt.skills` attachments, resolved in
  `packages/core/src/session/prompt.ts:56-76`. The TUI fills `prompt.skills` only from its own
  extmark-backed parts: the `@` menu's skill rows (`display: "@" + skill.id`, `kind: "skill"`,
  `autocomplete.tsx:427-440`) and the built-in `/skills` dialog (`name: "prompt.skills"`,
  `slash: { name: "skills" }`, `index.tsx:582-616`). The docs say "To load a skill yourself,
  mention it in your prompt as `@skill-id`" (`services/www/src/docs/content/skills.mdx:201`).
- Neither the plugin `Context` (`context.ts:544-560`) nor its `UI` (`context.ts:490-542`) exposes
  the prompt store or a way to add a part. Nothing in the server parses `@` or `/` out of prompt
  text (`packages/core/src/session/` has no mention parsing outside attachment offsets).

Ways to keep "Enter runs the skill", none verified live:

1. **A server companion plugin with a prompt hook.** `ctx.session.hook("prompt", (event) => …)`
   receives a mutable `event.prompt` with `text` and `skills`, and "Files and skills added by a
   hook follow the normal resolution and validation path"
   (`services/www/src/docs/content/build/plugins/index.mdx:1346-1371`; typed in
   `packages/plugin/src/promise/session.ts:14-20,140`). Core uses the hook's output as the prompt
   (`packages/core/src/session/prompt.ts:40-55`). A hook can turn leading `/<id>` tokens into
   `skills: [{ id }]`. The cost is a second (server) entrypoint, and users must list the package in
   `opencode.json`, because `cli.json` plugins are TUI-only (`cli/plugins.mdx:5-10`).
2. **`arguments: true` plus a `run(input)` that sends the prompt itself** through
   `context.client`, with `skills` attached. This replaces the TUI's submit and loses what it does:
   file and agent parts, model and agent selection commit, queueing (`index.tsx:1114-1340`).
   Not recommended.
3. **Switch to native `@id` parts.** Drop `/name` and steer users to v2's `@` menu, or open the
   built-in dialog with `context.keymap.dispatch("prompt.skills")`. That changes README behavior
   rather than keeping it.

## Q4. Raw keys and the editor on opentui 0.6.6

**Answer (source).** Every member the plugin reaches exists in `@opentui/core@0.6.6`. The
listener order that the Esc and `/` handling relies on also still holds.

| Member | 0.6.6 declaration |
| --- | --- |
| `context.renderer` | `CliRenderer` (`packages/plugin/src/tui/context.ts:548`) |
| `renderer.keyInput` | `get keyInput(): KeyHandler` (`renderer.d.ts:443`) |
| `KeyHandler` | `extends EventEmitter<KeyHandlerEventMap>` from `"events"`, with `keypress: [KeyEvent]` (`lib/KeyHandler.d.ts:1,42-50`), so `prependListener` and `off` are Node `EventEmitter` methods |
| `KeyEvent.preventDefault()`, `stopPropagation()`, `name`, `ctrl`, `meta`, `option`, `super` | `lib/KeyHandler.d.ts:4-29` |
| `renderer.currentFocusedEditor` | `EditBufferRenderable \| null` (`renderer.d.ts:418`) |
| `plainText`, `cursorOffset` (get/set), `insertText(text)` | `renderables/EditBufferRenderable.d.ts:97,100-101,154` |

Dispatch order:

- `InternalKeyHandler.emitWithPriority` runs every global `keypress` listener in order, stopping
  early only on `propagationStopped`. It then runs renderable handlers, the focused textarea
  among them, and skips them if `defaultPrevented` (`@opentui/core@0.6.6`
  `chunk-bun-6qjat6qa.js:288-339`). `preventDefault()` on a `/` still keeps it out of the
  textarea, as on v1.
- v2's whole keymap is itself a global listener added with
  `renderer.keyInput.prependListener("keypress", …)` (`@opentui/keymap@0.6.6` `src/opentui.js:69-73`).
  It stops propagation when it consumes a key (`src/index.js:2826-2834,2846`). A plugin that
  `prependListener`s after the keymap exists therefore runs before every binding, the autocomplete
  and dialog Esc included. The keymap is created in `Keymap.Provider` (`keymap.tsx:63-66`) and
  plugins activate later, but that order is inferred from the component tree and was not traced
  step by step.
- The `prependListener` cast in `src/tui.ts:242-248` is still needed, since the context types
  `renderer` as `CliRenderer`. With `@opentui/core` as a peer dependency, the typed
  `EventEmitter` methods may resolve and make the cast unnecessary (unchecked).

One caveat to carry over: v2 measures prompt offsets in editor units (`measureEditText` with the
renderer's `widthMethod`, `packages/tui/src/prompt/display.ts:6-41`). `src/tui.ts` indexes
`plainText[offset]` as though offsets were string indices. That is wrong for wide characters on
either host and was not introduced by v2.

## Q5. The built-in slash menu

**Answer (source).**

**Opening.** On every content change, `onInput` reads the text **before the cursor**. If the menu
is closed and the cursor is not at 0, it opens command mode when `slashTriggerIndex(beforeCursor)`
is `0` (`autocomplete.tsx:780-818`). `slashTriggerIndex` takes the last `/` preceded by whitespace
or the text start, and returns nothing if the query after it holds whitespace or another `/`
(`packages/tui/src/prompt/display.ts:33-41`). In README terms:

- An empty prompt, or `/` at the start, opens the menu. This is unchanged.
- **`/` typed at position 0 before text still opens it.** After the keystroke the text before
  the cursor is just `/`. The README's quiet insert is still needed. Its trick of leaving the
  cursor at 0 during the content change still works, because `onInput` returns early on
  `offset === 0` (`autocomplete.tsx:810`).
- **`/` typed inside the first word does not open it on 2.1.1.** `/a/b` holds a second `/`. On
  v1 it did open. If the menu is already open, it stays open: an open menu closes only when the
  cursor moves to or before the trigger, or whitespace appears after it (`autocomplete.tsx:796-806`).
  With an open menu, the quiet insert at position 0 still closes it, because the cursor lands at 0.
- **A standalone `/` later in the prompt does not open the command menu on 2.1.1**, since it
  requires index 0 (`autocomplete.tsx:813`). On 2.0.27 it opened (`:806` there), with no command
  rows (rows are added only at index 0, `autocomplete.tsx:544`). The plugin's later-slash dialog
  does not compete with a built-in menu on 2.1.1.
- Typing more of the first word reopens a closed menu (same `onInput` path). This is unchanged.

**Esc.** `prompt.autocomplete.hide` is bound to `escape` (`packages/tui/src/config/keybind.ts:276`)
and calls `hide()` with `removeToken = false`. Only `hide(true)` deletes the typed token
(`autocomplete.tsx:690-704,744-757`). Esc therefore **closes the menu and keeps the prompt
text**. The v1 workaround in `src/tui.ts:179-195` (cursor to 0 during Esc) can go. `prompt.clear`
(`ctrl+c`, `keybind.ts:206`) runs `hide(true)` and removes the token.

**Telling the menu is open.** While visible, the autocomplete pushes keymap mode `"autocomplete"`
(`autocomplete.tsx:98-101`), which a plugin reads as `context.keymap.mode.current() ===
"autocomplete"` (`context.ts:481-487`, wired at `packages/tui/src/plugin/api.tsx:198`). This is
the same check v1 made through `api.mode.current()`. `"autocomplete"` covers the `@` and
directory menus as well. The plugin cannot tell command mode apart from them, but in command mode
the trigger sits at index 0, which the plugin can check from `plainText`.

## Q6. Dialog

**Answer (source).**

`context.ui.dialog` (`packages/plugin/src/tui/context.ts:394-405`):

```ts
show(render: () => JSX.Element, onClose?: () => void): void
set(options: DialogOptions): void
clear(): void
alert(...); confirm(...); prompt(...)
select<Value>(options: DialogSelectOptions<Value>): Promise<Value | undefined>
```

Correction to `docs/research/opencode-1-19-and-2-x.md` §3: the interface has `show` and
**`clear()`**, not `close()`, and `show(render, onClose)` is the v2 form of v1's
`replace(render, onClose)`. That has been true since `v2.0.27`: the `Dialog` block there is
identical.

`select` options are `title`, `placeholder?`, `options: { title, value, description?, footer?,
category?, disabled? }[]`, `current?`, `search?(query, enabledOptions)` (to own matching and
order), and `actions?` (`context.ts:355-392`).

**Esc vs selection:** `select` wraps `show` with a once-only `settle`. Enter or click calls
`done(option.value)` and then `clear()`. Esc, `clear()`, or another dialog replacing it calls
`onClose`, which resolves `undefined` (`packages/tui/src/plugin/api.tsx:318-327,387-427`). The
dialog's Esc command calls the top entry's `onClose` (`packages/tui/src/ui/dialog.tsx:345-363`),
and `clear()` calls every entry's `onClose` (`dialog.tsx:389-399`), but `settle` ignores the
second call. The docs say: "Enter or clicking an option resolves the selected value. Escape,
`clear()`, or showing another dialog resolves `undefined`" (`build/plugins/cli.mdx:421-423`). The
plugin's `selected` flag becomes `const value = await dialog.select(...)`, with `undefined`
meaning dismissed.

**Default filtering** is fuzzysort over `title`, `category` and `searchText`
(`packages/tui/src/ui/dialog-select.tsx:211-224`). For the README's case-insensitive name-only
filter, pass `search`.

**Dialog-open check:** there is no `open` boolean. While the dialog stack is non-empty, the host
pushes keymap mode `"modal"` (`dialog.tsx:320-324`), so `context.keymap.mode.current() ===
"modal"` replaces v1's `api.ui.dialog.open`. That is an inference from host internals: the
`"modal"` string is not a documented contract.

One timing note: after a dialog closes, the host refocuses the previous renderable on a
`setTimeout(…, 1)` (`dialog.tsx:326-343`). An insert into the editor that the plugin captured
before opening the dialog happens while the editor is still blurred. Whether that matters is
untested.

## Q7. Hotkey

**Parsing (source).** There is no `parseKeySequence` on the v2 context. `Keymap` exposes `layer`,
`dispatch`, `shortcuts`, `commands`, `pending`, `active` and `mode` (`context.ts:463-488`). The
docs say "OpenTUI handles binding-parse errors" (`cli.mdx:308`, `context.ts:466-468`). The only
host-provided runtime modules are `effect`, `@opencode/plugin/*`, `@opentui/core`,
`@opentui/solid` and `solid-js` (`packages/plugin/src/runtime-modules.ts:7`;
`packages/tui/src/plugin/runtime-plugin-support.bun.ts`; `@opentui/solid@0.6.6`
`scripts/runtime-plugin-support-configure.js:2-18`). `@opentui/keymap` is not among them. A
plugin that wants v1's checks ("more than one key", "single keys are not allowed", "opencode does
not know that key") must parse the string itself or bundle its own `@opentui/keymap`. A bundled
`Keymap` needs a host object, and the stock opentui host subscribes to `keyInput`
(`@opentui/keymap@0.6.6` `src/opentui.js:47-110`), so a bundled copy would need an inert host.
The host's alias expander (`enter`→`return`, `esc`→`escape`, and so on), comma bindings and
leader token (`packages/tui/src/context/keymap.tsx:78-146`) would not apply to such a copy either.

**Effective keybinds (source, partial).** `tuiConfig` is gone (`Context`, `context.ts:544-560`).
The plugin can read two things:

- `context.keymap.commands()`: currently **reachable** commands only (`keymap.tsx:321-353`,
  `visibility: "reachable"`).
- `context.keymap.shortcuts(id)`: formatted shortcuts for any **registered** command id
  (`keymap.tsx:277-309`, `visibility: "registered"`), formatted with `meta` shown as `alt`
  (`keymap.tsx:455-473`).

A conflict check could register its own command, read back `shortcuts(ownId)` as the canonical
form, and compare it with `shortcuts(id)` for every id from `commands()`. That misses bindings
whose commands are not reachable at setup time. The textarea's `ctrl+k`
(`input.delete.to.line.end`, still the default, `keybind.ts:231`) belongs to a layer that is
enabled only while the prompt textarea has focus (`keymap.tsx:92-135`). Whether it shows in
`commands()` at setup is untested. `ctrl+s` is still unbound by default (no match in
`keybind.ts`).

**Users rebinding through config does not work for plugin ids.** The TUI applies a configured
binding for a named command if one exists (`keymap.tsx:240-246`), but `cli.json` `keybinds` only
accepts built-in names: `parse` throws "Unrecognized keybind" for anything else
(`packages/tui/src/config/keybind.ts:306-352`). The `hotkey` option remains the only way to
configure the shortcut.

**Opening the palette (source).** The palette is the command `command.palette.show` (default
`ctrl+p`, `keybind.ts:57`), registered at `packages/tui/src/app.tsx:732-739`. A plugin opens it
with `context.keymap.dispatch("command.palette.show")` (`context.ts:472`). For the shortcut,
register a command with `bind: hotkey` and `run: () => context.keymap.dispatch("command.palette.show")`.
`bindings: [id]` in a layer only activates bindings configured for that id (`keymap.tsx:247`), so
v1's `{ key, cmd: "command.palette.show" }` form has no direct equivalent. Skill rows appear in the
palette with `palette: true`, which requires an `id` (`context.ts:420-421`, `keymap.tsx:263`).

**Options (source).** `setup` receives them as `context.options` (`context.ts:545`), defaulting to
`{}` (`api.tsx:153`). In `cli.json` the entry is the **object** `{ "package": "...", "options":
{ ... } }` (`packages/tui/src/config/index.tsx:47-55,79`; docs
`services/www/src/docs/content/cli/plugins.mdx:35-48`). The v1 tuple `["name", { ... }]` is not
valid `cli.json`. The one-time migration converts a `tui.json` tuple into the object form
(`packages/cli/src/config/migrate.ts:160-165`), so a user's existing `hotkey` option carries over
on first launch. The options travel with a `cli.json` entry (`packages/tui/src/plugin/context.tsx:332`).
Plugins that the TUI discovers from the server's `opencode.json` list are passed as bare targets
(`context.tsx:290-301`), so a package loaded only that way gets `options = {}`.

## Q8. Lifecycle and packaging

**Dispose (source).** `setup` may return a cleanup function, sync or async
(`packages/plugin/src/tui/plugin.ts:5-10`). The host runs it on deactivate, which covers disable,
reload and failed setup (`packages/tui/src/plugin/context.tsx:182-195`; docs `cli.mdx:38-45`).
Keymap layers are removed automatically when the plugin deactivates (`context.ts:463-469`,
`api.tsx:179-192`). The raw `keyInput` listener is not, so the returned cleanup must call
`keyInput.off("keypress", handler)`. `api.lifecycle.onDispose` does not exist on v2.

**Loader contract (source).** The host resolves the package's `./tui` export
(`packages/plugin/src/host.ts:17-43`), imports it, and accepts a default export with a non-empty
string `id` and a `setup` function. Anything else is rejected with "Invalid V2 TUI plugin
module" (`packages/tui/src/plugin/context.tsx:695,741-751`). `Plugin.define` from
`@opencode/plugin/tui` is an identity function (`plugin.ts:12-14`), so it is optional at runtime.

**Package names (source).**

- Import from `@opencode/plugin/tui` (v1: `@opencode-ai/plugin/tui`). The host resolves that
  import at runtime (`cli.mdx:18-19`; `runtime-modules.ts:7`).
- Published `@opencode/plugin@2.1.1`: `exports["./tui"]` is `./dist/tui/index.js`.
  `peerDependencies` are `@opentui/core >=0.6.6`, `@opentui/solid >=0.6.6`, `solid-js >=1.9.0` and
  `@opencode/theme 2.1.1` (npm manifest).
- The docs' publish template lists `@opencode/plugin` under `dependencies` and the opentui
  packages and `solid-js` as `peerDependencies` "when the plugin renders JSX" (`cli.mdx:630-651`).
  This plugin renders no JSX if it uses `dialog.select`, so it needs only the type import plus
  `@opentui/core` for types.

**Compatibility ranges (source).** Nothing on v2 reads one. At `v2.1.1`, `grep -rn
"peerDependencies\|engines\|semver"` over `packages/tui/src/plugin`, `packages/util/src/npm.ts`,
`packages/plugin/src`, `packages/core/src/plugin` and `packages/cli/src` finds only an unrelated
comment in `packages/cli/src/services/updater-action.ts:39`. `resolvePlugin` checks only the
module shape (`context.tsx:652-697`). Installation goes through in-process Arborist with the
user's npm config, as recorded for 2.0.27 in `research/plugin-version-refusal`. Arborist's own
peer handling may still warn or fail on a peer conflict. That is npm behavior, not a version
gate.

---

## What is still unverified live

None of the following has been run:

1. A plugin `keyInput.prependListener` runs before the keymap, so a `/` can be prevented and an
   Esc observed (Q4).
2. The quiet insert at position 0 still keeps the built-in menu shut on 2.1.1, and still closes an
   open one (Q5).
3. Esc in the built-in menu keeps `/query` (Q5).
4. `keymap.mode.current()` reads `"modal"` while a plugin `dialog.select` is open, and
   `"autocomplete"` while the slash menu is open (Q5, Q6).
5. An insert made right after `dialog.select` resolves lands correctly while the editor's refocus
   is still pending (Q6).
6. Inserting `/name ` from a no-arguments slash command's `run` does not reopen the menu (Q3).
7. `context.client.location.get(...)` returns `project.directory` for the session's location, and
   its input shape (Q2).
8. The conflict-check approach with `commands()` and `shortcuts()`, and whether `ctrl+k` is
   visible to it (Q7).
9. Which binding wins when a plugin binds a key that is already bound, given layer `priority`
   (Q7).
10. A server `session.hook("prompt")` that turns `/id` tokens into skill attachments, and whether a
    package with both `.` and `./tui` exports listed in `opencode.json` gets both loaded (Q3).
11. A `tui.json` tuple with `hotkey` migrates to `cli.json` and reaches `context.options` (Q7).

MEMORY.md's sandbox recipe (XDG dirs plus `@opencode/cli`) covers all of them. Swap `2.0.27`
for `2.1.1`.

## Behavior that looks impossible to keep with a CLI-only plugin

- **"Press Enter to run the skill" for `/name `.** Q3: v2 runs skills only as prompt attachments,
  and the TUI plugin context cannot add one. Keeping it needs a server companion plugin with a
  prompt hook. The alternatives are reimplementing submit, or moving to native `@id` mentions,
  which changes the README.
- **The conflict warning "it is already bound" in its v1 form.** Q7: the effective keybinds are
  not exposed. A reachable-commands approximation exists but can miss focus-scoped bindings such
  as `ctrl+k`.
- **"Matching covers the skill name only" in the `/` menu.** Q3: the built-in menu always fuzzy
  matches descriptions too and caps filtered results at 10. The plugin can keep name-only matching
  only by leaving the origin tag out of `description`, which costs the visible tag column. Using
  `title` instead is unverified; the menu shows `command.description ?? command.title`.

Two v1 workarounds that v2 makes unnecessary:

- The Esc cursor trick, because Esc no longer deletes the typed prefix (Q5).
- Guarding a mid-prompt `/` against the built-in menu, because 2.1.1 opens it only at index 0 (Q5).
  The guard for `/` at position 0 is still needed.
