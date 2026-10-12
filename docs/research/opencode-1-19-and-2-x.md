# Research: opencode 1.19 and the 2.x horizon

Date: 2026-10-12. Researched against the opencode git repository, its tags, its GitHub
releases, the npm registry, opencode's own update API, and the opencode docs site. No blog
posts or secondary write-ups were used.

Note on the repository URL: `github.com/sst/opencode` now resolves to
`github.com/anomalyco/opencode` — `gh repo view sst/opencode --json owner` reports
`"owner": {"login": "anomalyco"}`, and the repository's default branch is `dev`. Both URL
forms work; permalinks below use `sst/opencode` for continuity with earlier notes.

Local verification copy: a partial (blob-filtered) clone of the repo was inspected at tags `v1.18.34`,
`v1.19.0` and `v2.0.27`. Line numbers cited as `file:line` are at the tag named in the
sentence.

---

## 1. Latest published opencode 1.x

**The latest 1.x release is 1.19.0, published 2026-10-11. There is no 1.19.1 or any other
1.19.x patch yet — 1.19.0 is both the newest minor and the newest patch on that line.**

- npm `opencode-ai` `dist-tags.latest` is `1.19.0`; the only `1.19.*` version in the
  registry is `1.19.0`, with `time["1.19.0"] = 2026-10-11T01:38:53.143Z`
  (<https://registry.npmjs.org/opencode-ai>).
- The preceding release is `1.18.35` (2026-10-06T20:21:30.784Z), so 1.18.35 — not
  1.18.34 — is the last 1.18.x. The maintainer's "1.19" expectation is correct as a minor
  line; the real latest is exactly `1.19.0`.
- GitHub Releases agrees: `gh release list --repo sst/opencode` shows `v1.19.0` marked
  `Latest`, published 2026-10-11T01:39:22Z, with `v1.18.35` beneath it
  (<https://github.com/sst/opencode/releases/tag/v1.19.0>).
- `@opencode-ai/plugin` tracks the CLI version: its `dist-tags.latest` is also `1.19.0`,
  published 2026-10-11T01:39:30.729Z
  (<https://registry.npmjs.org/@opencode-ai/plugin>).
- The repo's own `packages/opencode/package.json` at `v1.19.0` declares
  `"name": "opencode"`, `"version": "1.19.0"`.

## 2. What changed between 1.18.34 and 1.19.0 in the surfaces this plugin hooks

**Short answer: nothing. Every surface `src/tui.ts` touches is byte-identical between
`v1.18.34` and `v1.19.0`.** This was checked by diffing the owning directories, not by
reading release notes.

`git diff --stat v1.18.34 v1.19.0 -- packages/plugin/src packages/tui/src/component/prompt
packages/tui/src/plugin packages/tui/src/ui/dialog.tsx packages/tui/src/keymap.tsx
packages/opencode/src/plugin` produces **no output** — zero changed files across all six
paths. That covers, surface by surface:

| Surface in `src/tui.ts` | Owning path | Changed 1.18.34 → 1.19.0? |
| --- | --- | --- |
| TUI plugin loader, `tui.json` plugin config | `packages/opencode/src/plugin/` (`loader.ts`, `shared.ts`, `tui/runtime.ts`) | No |
| `api.renderer.keyInput` (opentui `KeyHandler`) | `packages/plugin/src` type surface; `@opentui/core` pinned unchanged | No |
| `api.ui.dialog` (`replace`, `clear`, `open`), `api.ui.DialogSelect` | `packages/tui/src/ui/dialog.tsx`, `packages/tui/src/plugin/` | No |
| `api.mode.current()` | `packages/tui/src/plugin/api.ts`, `packages/tui/src/keymap.tsx` | No |
| Prompt editor (`currentFocusedEditor`, `plainText`, `cursorOffset`, `insertText`) | `packages/tui/src/component/prompt/` | No |
| Built-in slash menu open/close conditions | `packages/tui/src/component/prompt/` | No |
| `app.skills()` and its `location` field | `packages/sdk/js/src/v2/gen/types.gen.ts` | Schema unchanged (see below) |

Supporting detail:

- **`app.skills()` response shape is unchanged and still carries `location`.** At
  `v1.19.0`, `packages/sdk/js/src/v2/gen/types.gen.ts` defines `AppSkillsData.url =
  "/skill"` and `AppSkillsResponses[200] = Array<{ name: string; description?: string;
  location: string; content: string }>`. The only diff in that whole generated file
  between the two tags is one comment line on `Config.autoupdate` — the `git diff` of
  `types.gen.ts` is a single hunk changing that JSDoc string. So `originTag(skill.location,
  …)` in `src/tui.ts:147` and `:198` is safe on 1.19.0.
- **The full 1.18.34 → 1.19.0 TUI diff is one feature: an update-notification system.**
  `git diff --stat v1.18.34 v1.19.0 -- packages/tui` touches only `src/app.tsx`,
  `src/index.tsx`, `src/routes/home.tsx`, `src/util/filetype.ts`, the new
  `src/component/dialog-update.tsx` and `src/context/update-notification.tsx`, plus a test.
  `app.tsx` deletes the old `event.on("installation.update-available", …)` auto-update
  confirm dialog and replaces it with an `UpdateNotificationProvider`.
- **One new conditional entry appears in the command/slash list.** `app.tsx` at `v1.19.0`
  registers, only when an updater is present:
  `{ name: "opencode.update", title: "Update OpenCode", slashName: "update", run: () =>
  update.open?.(), category: "System" }`. This adds a `/update` row to the built-in slash
  menu and command palette. It does not change the menu's open/close logic, but it does
  change what is listed, which matters if the plugin ever asserts on menu contents.
  Documented at `packages/web/src/content/docs/tui.mdx` (new `### update` section): "Check
  for a new version of OpenCode and install it. If a newer OpenCode 1 release is available,
  the dialog installs it. If OpenCode 1 is up to date, it offers to upgrade you to OpenCode
  2.0 instead."
- **Auto-update semantics changed** (not a plugin surface, but it changes what users see).
  `packages/opencode/src/cli/upgrade.ts` at `v1.19.0` carries the comment "Checking never
  installs anything. Updates only happen when the user runs `/update` or `opencode
  upgrade`." The `Config.autoupdate` JSDoc now reads: "Check for new versions and show an
  update notice. Updates are never installed automatically… `true` and `'notify'` behave
  the same."
- **1.19.0 is the release that starts offering OpenCode 2.0 to users.**
  `packages/opencode/src/cli/upgrade.ts` returns `{ type: "major" }` when the installed
  version already equals the latest 1.x, and `packages/tui/src/routes/home.tsx` renders
  `" to upgrade to OpenCode 2.0"` / `" restart to use OpenCode 2.0"` in the home-screen
  notice. `packages/tui/src/context/update-notification.tsx:16` states the rule: "A newer
  OpenCode 1 release wins; OpenCode 2.0 is only suggested once OpenCode 1 is up to date."
  Consequence for this plugin: anyone on an up-to-date 1.19.0 is one `/update` away from a
  runtime where the plugin does not load (see §3).

Caveat: this analysis is a source diff, not a live TUI run. The surfaces are
textually identical, so a behavior regression would have to come from a transitive
dependency. `packages/tui/package.json` and `packages/plugin/package.json` changed only in
their `"version"` field between the tags (1-2 line diffs), and `bun.lock` changes in
1.19.0 are confined to `@ai-sdk/*` patches per the patch files in the diff, so no
`@opentui/*` bump is involved. **Not verified by running 1.19.0 in a live TUI.**

## 3. Is opencode 2.x released, tagged, or announced?

**2.x is tagged, published to npm, and served as the current release by opencode's own
update API. It is not published as a GitHub Release, and no dated public announcement or
roadmap was found.**

What is verifiable:

- **Tagged.** `git tag --list 'v2*'` returns 28 tags, `v2.0.0` through `v2.0.27`.
  `git for-each-ref` sorted by tag creation date dates them 2026-09-11 (`v2.0.0`) to
  2026-10-12 (`v2.0.27`) — `v2.0.27`'s commit is dated 2026-10-12 04:16:59 +0000, i.e.
  today.
- **Published to npm under new names.** `@opencode/cli` has `dist-tags.latest = 2.0.27`,
  with `2.0.0` published 2026-09-11T23:44:52.963Z and `2.0.27` at
  2026-10-12T04:15:00.533Z (28 `2.x` versions in all). `@opencode/plugin` and
  `@opencode/client` likewise sit at `latest = 2.0.27`
  (<https://registry.npmjs.org/@opencode%2Fcli>,
  <https://registry.npmjs.org/@opencode%2Fplugin>).
- **Served as "latest" by opencode's update API.**
  `https://opencode.ai/update/api/latest/cli/npm` returns
  `{"channel":"latest","name":"cli","distribution":"npm","version":"2.0.27",
  "metadata":{"package":"@opencode/cli"},…}`. The full
  `https://opencode.ai/update/api/latest` lists 2.0.27 for every distribution: npm
  (`@opencode/cli`), homebrew (`anomalyco/tap/opencode-v2`), AUR (`opencode-beta`), and
  direct binaries at `https://opencode.ai/files/bin/2.0.27/…`.
- **1.19.0 itself ships the installer for it.**
  `packages/opencode/src/installation/index.ts` at `v1.19.0` adds `upgradeMajor` and a
  `MAJOR_INSTALL` table, with the comment "OpenCode 2 ships under different package names
  but the same `opencode` binary, so package manager installs remove V1 first and restore
  it if the V2 install fails." Concretely: `npm uninstall -g opencode-ai` then
  `npm install -g @opencode/cli`; brew uninstalls the v1 formula and installs
  `anomalyco/tap/opencode-v2`; the curl path fetches `https://opencode.ai/v2/install`,
  which "writes to the same ~/.opencode/bin/opencode path, replacing V1 in place".
  `MAJOR_INSTRUCTIONS = "https://opencode.ai/v2/docs"`.
- **The two update channels are separate.** `Installation.latest()` at `v1.19.0`
  (`packages/opencode/src/installation/index.ts:289-292`) queries
  `<npm registry>/opencode-ai/<channel>` for the npm/bun/pnpm methods, so a 1.x install
  resolves 1.x from the `opencode-ai` package and never trips over 2.0.27. That is why
  1.19.0 users see "1.x up to date" and then the separate 2.0 offer.

What is **not** verifiable:

- **No GitHub Release for any 2.x tag.** `gh release view v2.0.27 --repo sst/opencode`
  returns `release not found`, and `gh release list --repo anomalyco/opencode` tops out at
  `v1.19.0 Latest`. The 2.x tags exist in git with no release object attached.
- **No timeline, GA date, or deprecation date for 1.x could be found.**
  `https://opencode.ai/v2/docs` says nothing about release status or schedule. The AUR
  package is named `opencode-beta` and the brew formula `opencode-v2`, which suggests a
  parallel channel rather than a hard switchover, but neither name is an announcement. **Unverified:
  when (or whether) 2.x becomes the default `opencode` install, and how long 1.x is
  supported.**
- **The 2.x changelog does not describe 2.0 or its breaking changes.** `CHANGELOG.md` at
  `v2.0.27` is headed "Release notes for OpenCode V2, newest first" and contains a single
  entry, `## v2.0.26 — 2026-10-08`. There is no `v2.0.0` entry, no "breaking" section, and a
  case-insensitive grep for "plugin", "breaking" and "migration" over that file returns
  nothing. Its PR links point
  at `github.com/anomalyco/opencode`.

### Breaking changes to the plugin API and the TUI in 2.x

These come from the v2 source tree and the v2 docs, not from a changelog. Each one breaks
this plugin:

- **Package rename.** `@opencode-ai/plugin` → `@opencode/plugin`. At `v2.0.27`,
  `packages/plugin/package.json` declares `"name": "@opencode/plugin"`, `"version":
  "2.0.27"`. The v1 migration guide states it plainly: "V1 imports come from the
  `@opencode-ai/plugin` package. V2 imports come from `@opencode/plugin`"
  (<https://opencode.ai/v2/docs/build/plugins/migrate-v1/>).
- **Plugin shape rename.** The v1 `export default { id, tui }` with
  `tui: async (api, options) => …` is replaced by `Plugin.define`. At `v2.0.27`,
  `packages/plugin/src/tui/plugin.ts` is 14 lines:
  `export interface Definition { readonly id: string; readonly setup: (context: Context) =>
  Promise<Cleanup | void> | Cleanup | void }` and `export function define(plugin:
  Definition)`. The CLI-plugin doc shows `export default Plugin.define({ id, setup(context)
  {} })` imported from `"@opencode/plugin/tui"`
  (<https://opencode.ai/v2/docs/build/plugins/cli/>).
- **Config file and key rename.** `tui.json` becomes `cli.json`, and the `plugin` array
  becomes `plugins`. At `v2.0.27`, `packages/cli/src/config/config.ts:31` reads
  `path.join(global.config, "cli.json")` and `packages/cli/src/config/schema.ts:4` sets
  `SchemaURL = "https://opencode.ai/v2/cli.json"`; `tui.json` appears in v2 source only in
  `packages/cli/src/config/migrate.ts`. The migration guide says "Rename `plugin` to
  `plugins`" and the CLI-plugin doc says to list the package in `"plugins"` inside
  `cli.json`. The published export key `"./tui"` is retained.
- **`api.ui.dialog` is a different interface.** At `v2.0.27`,
  `packages/plugin/src/tui/context.ts:394-405` defines `Dialog` as `show`, `set(options)`,
  `close()`, `alert`, `confirm`, `prompt`, and `select<Value>(options): Promise<Value |
  undefined>`. There is no `replace(render, onClose)`, no `clear()`, no `open` boolean, and
  no `api.ui.DialogSelect` component. `src/tui.ts:173` (`api.ui.dialog.open`),
  `:191` (`dialog.replace`), `:195` (`api.ui.DialogSelect`) and `:202` (`dialog.clear`) all
  have no v2 equivalent in that shape. The promise-based `dialog.select` resolves
  `undefined` on Escape, so the plugin's "dismissed vs selected" bookkeeping would be
  rewritten rather than ported.
- **`api.mode.current()` moves.** In v2 it is `context.keymap.mode.current()`, with
  `push(mode)` returning a pop function (`packages/plugin/src/tui/context.ts:481-487`).
  There is no top-level `api.mode`.
- **Skills lose the `location` field.** At `v2.0.27`,
  `packages/client/src/promise/generated/types.ts:430-437` defines
  `SkillInfo = { id, name, description?, autoinvoke?, path, content }` — `path` replaces
  `location`, and `id`/`autoinvoke` are new. Skills are read through
  `context.data.location.skill.list(location)` / `.sync(location)`
  (`packages/plugin/src/tui/context.ts:138`), not `api.client.app.skills()`.
  `originTag(skill.location, …)` in `src/tui.ts` would need to read `skill.path`.
- **`Context` drops `state`, `lifecycle` and `tuiConfig`.** The whole v2 `Context` is
  `options`, `location`, `app`, `renderer`, `client`, `data`, `attention`, `theme`,
  `themeMode`, `markdown`, `keymap`, `storage`, `ui`
  (`packages/plugin/src/tui/context.ts:544-560`). `src/tui.ts` reads
  `api.state.path.directory`/`.worktree` (`:139-140`), `api.tuiConfig.keybinds.bindings`
  (`:91`) and `api.lifecycle.onDispose` (`:226`); none of those exist on v2's `Context`.
  Cleanup is instead the function `setup` returns.
- **Slash commands become a first-class keymap option.** v2 keymap commands take
  `slash: { name, aliases, arguments }` ("Adds a named command to prompt slash
  completion", `packages/plugin/src/tui/context.ts:422`). That is a supported replacement
  for the quiet-insert/`dialog.replace` dance this plugin implements today — in v2 the
  plugin's core trick may be unnecessary.
- **opentui major bump.** v2's `packages/plugin/package.json` sets peer deps
  `"@opentui/core": ">=0.5.17"` and `"@opentui/solid": ">=0.5.17"`; this repo pins
  `@opentui/keymap`/`@opentui/solid` at `0.4.5` (`package.json`). `context.renderer` in v2
  is typed as opentui's `CliRenderer` (`packages/plugin/src/tui/context.ts:548`), and
  `renderer.currentFocusedEditor` is still used inside v2's own TUI
  (e.g. `packages/tui/src/ui/dialog.tsx:143`, `packages/tui/src/context/keymap.tsx:94`), so
  the raw-renderer escape hatch the plugin relies on plausibly survives.
  **Unverified: whether `renderer.keyInput`, `prependListener("keypress", …)`,
  `KeyEvent.preventDefault()`, `editor.plainText`, `editor.cursorOffset` and
  `editor.insertText()` behave the same across the `@opentui/core` 0.4.5 → 0.5.17+ jump.**
  The v2 CLI-plugin doc offers no raw-key API and routes keyboard handling through
  `context.keymap.layer(...)`.
- **No stated TUI-plugin migration path.** The migration guide "does not describe TUI/CLI
  migration steps"; it only links to `/build/plugins/cli`. It does state "V1 plugin
  implementations do not run in V2" and that dual-support entrypoints (a default export
  combining `Plugin.define` with a V1 `server()`) work on "OpenCode `1.18.29` and newer" —
  but that dual-support shape is described for *server* plugins, and this package is
  TUI-only. **Unverified: whether a single package can serve both the v1 `{ id, tui }` TUI
  entrypoint and a v2 `Plugin.define` CLI entrypoint from the same `./tui` export.**

## 4. Does the loader honour an `engines.opencode` upper bound?

**On opencode 1.x: yes, a full semver range including an upper bound is honoured, and the
plugin is skipped. But for a TUI-only npm plugin like this one, the error is written to
`console.error` and never shown in the terminal. README.md:96's "native compatibility
error, so it never runs in a half-working state" is right about the skip and wrong about
the user-visible error.**

**On opencode 2.x: there is no `engines.opencode` gate at all.** An upper bound in this
package's manifest therefore protects nothing on the very release it would be written to
exclude.

### The loader code

`packages/opencode/src/plugin/shared.ts:194-205` at `v1.19.0`
(<https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/shared.ts#L194-L205>):

```ts
export async function checkPluginCompatibility(target: string, opencodeVersion: string, pkg?: PluginPackage) {
  if (!semver.valid(opencodeVersion) || semver.major(opencodeVersion) === 0) return
  const hit = pkg ?? (await readPluginPackage(target).catch(() => undefined))
  if (!hit) return
  const engines = hit.json.engines
  if (!isRecord(engines)) return
  const range = engines.opencode
  if (typeof range !== "string") return
  if (!semver.satisfies(opencodeVersion, range)) {
    throw new Error(`Plugin requires opencode ${range} but running ${opencodeVersion}`)
  }
}
```

It is called from `packages/opencode/src/plugin/loader.ts:123-131`:

```ts
// npm plugins can declare which opencode versions they support; file plugins are treated
// as local development code and skip this compatibility gate.
if (base.source === "npm") {
  try {
    await checkPluginCompatibility(base.target, InstallationVersion, base.pkg)
  } catch (error) {
    return { ok: false, stage: "compatibility", error }
  }
}
```

### Upper bounds work

- `semver` here is `import semver from "semver"` (`shared.ts:4`), and
  `packages/opencode/package.json` at `v1.19.0` pins `"semver": "^7.6.3"` — node-semver,
  whose `satisfies()` evaluates the whole range expression, not just a floor.
- Verified directly with node-semver 7: `npx semver -r ">=1.0.137 <2.0.0" 1.19.0 2.0.0
  2.0.27 1.0.136` prints only `1.19.0`. So `2.0.0`, `2.0.27` and `1.0.136` are all excluded
  by that range, and `checkPluginCompatibility` would throw for each.
- There is no code path that strips, reinterprets or floors the range — it is passed to
  `semver.satisfies` verbatim.

### Three caveats that blunt it

1. **Dev and prerelease-0 builds skip the check entirely.** `shared.ts:195` returns early
   when `semver.major(opencodeVersion) === 0`. The `opencode-ai` registry is full of
   `0.0.0-dev-*` and `0.0.0-beta-*` builds (its `dist-tags` include `dev`, `beta`, `next`,
   `ci` and dozens of `snapshot-*`), and any of those loads the plugin regardless of the
   declared range.
2. **File-path plugins skip the check.** `loader.ts:125` gates on `base.source === "npm"`.
   A `file://` entry in a `tui.json` `plugin` array — the exact shape MEMORY.md records for
   local smoke tests — bypasses the range.
3. **For a TUI-only plugin the message is not shown to the user.** The two report handlers
   differ:
   - Server-kind plugins publish a session error:
     `packages/opencode/src/plugin/index.ts:204-207` calls
     `publishPluginError("Plugin ${spec} skipped: ${message}")`, and `publishPluginError`
     (`index.ts:139-141`) publishes a `Session.Event.Error`. That reaches the UI.
   - TUI-kind plugins only log. `packages/opencode/src/plugin/tui/runtime.ts:762-764`:
     `if (stage === "compatibility") { fail("tui plugin incompatible", { path: spec, retry,
     error }) }`, and `fail` (`runtime.ts:128-137`) is a `console.error` wrapper.
   This package exports only `"./tui"` and has no `main`, so the server loader cannot even
   reach the compatibility stage for it: `resolvePackageEntrypoint`
   (`shared.ts:103-114`) returns `undefined` for `kind === "server"` when there is no
   `exports["./server"]` and no `main`, which makes `resolve()` return
   `stage: "missing"` at `loader.ts:110-121` — *before* the compatibility check at
   `loader.ts:125`. The server path's `missing()` handler (`index.ts:192`) is an empty
   function. So neither path shows the user anything.

   MEMORY.md records the empirical half of this, verified on 1.18.32: "TUI loader
   diagnostics go to `console.error` and do not reach the terminal pty; opencode's own log
   (`~/.local/share/opencode/log/opencode.log`) only records the server-side plugin load,
   not TUI plugin activation." The code above is unchanged at `v1.19.0`, so that finding
   still applies. **Not re-verified in a live 1.19.0 TUI, and not verified with an actual
   upper-bounded `engines.opencode` in a published package.**

### `engines.opencode` is undocumented, untested upstream, and absent from 2.x

- Undocumented: `git grep -c "engines" v1.19.0 -- packages/web/src/content/docs/` returns
  no hits. The field is not mentioned in `plugins.mdx` or anywhere else on the docs site
  shipped with 1.19.0.
- No upstream test: `git grep -rn "engines" v1.19.0 -- packages/opencode/test` returns
  nothing, and `packages/opencode/test/plugin/shared.test.ts` has no test case mentioning
  compatibility. The gate's behavior rests on `semver.satisfies` alone.
- Gone in 2.x: `git grep -n "engines\b" v2.0.27 -- packages/plugin packages/cli/src
  packages/server/src packages/core/src` returns **no hits**, and
  `git grep -rn "checkPluginCompatibility\|satisfies(" v2.0.27 -- packages/plugin
  packages/cli/src` also returns nothing. The only `engines` occurrences anywhere in
  `v2.0.27` are unrelated `package.json` fields and prose about Office/Rust "engines".
  The v1 migration guide "does not mention an `engines.opencode` field"; its only advice is
  that "Published plugins should depend on a version of `@opencode/plugin` compatible with
  the OpenCode release they target."

### Consequence for README.md:96

The current text is:

> On older versions the opencode loader skips the plugin with a native compatibility error,
> so it never runs in a half-working state.

Accurate parts: the loader does skip the plugin, and it does so by a native semver check
that honours upper bounds as well as lower. Inaccurate part: for this TUI-only package
there is no error the user sees — the skip is silent, which is the opposite of the
reassurance the sentence offers. Adding `<2.0.0` to the range would also do nothing on
opencode 2.x, because 2.x does not read `engines` at all; what actually stops the plugin
there is that `@opencode/cli` looks for plugins in `cli.json`'s `plugins` array and calls a
`Plugin.define` export that this package does not have.

---

## Sources

- opencode repository, tags `v1.18.34`, `v1.19.0`, `v2.0.27`:
  <https://github.com/sst/opencode> (redirects to <https://github.com/anomalyco/opencode>)
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/shared.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/loader.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/index.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/tui/runtime.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/installation/index.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/cli/upgrade.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/tui/src/context/update-notification.tsx`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/tui/src/routes/home.tsx`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/tui/src/app.tsx`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/sdk/js/src/v2/gen/types.gen.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/web/src/content/docs/tui.mdx`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/tui/context.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/tui/plugin.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/package.json`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/config/config.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/config/schema.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/client/src/promise/generated/types.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/CHANGELOG.md`
- <https://github.com/sst/opencode/releases/tag/v1.19.0>
- <https://registry.npmjs.org/opencode-ai>
- <https://registry.npmjs.org/@opencode-ai/plugin>
- <https://registry.npmjs.org/@opencode%2Fcli>
- <https://registry.npmjs.org/@opencode%2Fplugin>
- <https://opencode.ai/update/api/latest>
- <https://opencode.ai/update/api/latest/cli/npm>
- <https://opencode.ai/v2/install>
- <https://opencode.ai/v2/docs>
- <https://opencode.ai/v2/docs/plugins/>
- <https://opencode.ai/v2/docs/build/plugins/>
- <https://opencode.ai/v2/docs/build/plugins/cli/>
- <https://opencode.ai/v2/docs/build/plugins/migrate-v1/>
- This repo: `MEMORY.md`, `src/tui.ts`, `README.md`, `package.json`
