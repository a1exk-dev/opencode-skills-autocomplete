# Research: can this package refuse, or warn, on an unsupported opencode?

Date: 2026-10-12. Researched against the opencode git repository at tags `v1.19.0` and
`v2.0.27`, the source of `@npmcli/arborist` 9.4.0 and `npm-install-checks` 9.0.0 as
published on npm, the `proc-log` 6.0.0 source, Bun's own documentation, `@opentui/core` and
`@opentui/keymap` tarballs from npm, the npm registry, and the real generated manifests in
this machine's `~/.cache/opencode`. No blog posts or secondary write-ups were used.

Builds on `docs/research/opencode-1-19-and-2-x.md` (branch
`research/opencode-1-19-and-2-x`); its findings are taken as given and not re-derived.

Repository note, as in the earlier file: `github.com/sst/opencode` resolves to
`github.com/anomalyco/opencode`. Permalinks use `sst/opencode` for continuity.

Local verification copy: a full (unshallow, unfiltered) clone of the repository, 1043
`vX.Y.Z` tags. Line numbers cited as `file:line` are at the tag named in the sentence.

The two questions:

- **(A)** the user upgrades to opencode 2.x with our v1-shaped plugin configured;
- **(B)** the user's opencode 1.x is older than the APIs `src/tui.ts` calls.

**Headline answers.** Both cases have working mechanisms, and neither is `engines`.

- (A) is already answered by opencode 2.x itself: 2.x **migrates** `tui.json`'s `plugin`
  array into `cli.json`'s `plugins`, installs our package, imports our `./tui` export,
  **runs our module's top-level code**, then rejects the `{id, tui}` default export and
  shows the user an **error toast** plus a `/plugins` entry carrying our message. §4.4, §4.6.
- (B) is answered inside our own `tui()` function: `api.app.version` is the host opencode
  version and has existed since the TUI plugin system's first release (v1.3.4), as has
  `api.ui.toast`. A guard that runs before any newer API is touched can show the user a
  real toast. §6.5.
- The `engines.opencode` field is read only by opencode 1.x's own loader, and for this
  TUI-only package its rejection goes to `console.error` and is never seen. §3.3, §5.1.

---

## 1. How opencode actually installs a plugin package

**No package-manager binary is invoked. Both opencode 1.19.0 and 2.0.27 run npm's install
library, `@npmcli/arborist`, in-process, with `ignoreScripts: true` hard-coded. The
generated manifest contains only a `dependencies` object, and nothing a dependency declares
can add a `trustedDependencies` field to it.**

### 1.1 The v1.19.0 path, in order

`packages/opencode/src/plugin/shared.ts:207-213` at `v1.19.0`
(<https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/shared.ts#L207-L213>):

```ts
export async function resolvePluginTarget(spec: string) {
  if (isPathPluginSpec(spec)) return resolvePathPluginTarget(spec)
  const hit = parse(spec)
  const pkg = hit?.name && hit.raw === hit.name ? `${hit.name}@latest` : spec
  const result = await Npm.add(pkg)
  return result.directory
}
```

A bare package name is rewritten to `<name>@latest`. `Npm.add` is
`packages/core/src/npm.ts:123-145` at `v1.19.0`
(<https://github.com/sst/opencode/blob/v1.19.0/packages/core/src/npm.ts#L123-L145>):

```ts
const add = Effect.fn("Npm.add")(function* (pkg: string) {
  const dir = directory(pkg)
  const name = (() => { try { return npa(pkg).name ?? pkg } catch { return pkg } })()

  if (yield* afs.existsSafe(path.join(dir, "node_modules", name))) {
    return resolveEntryPoint(name, path.join(dir, "node_modules", name))
  }

  const tree = yield* reify({ dir, add: [pkg] })
  …
```

`directory` is `npm.ts:87`: `path.join(global.cache, "packages", sanitize(pkg))`. With
`global.cache` = `~/.cache/opencode` (`packages/core/src/global.ts:12,25`), the install
directory for a bare spec is **`~/.cache/opencode/packages/<name>@latest/`**, and the
package lands in `…/node_modules/<name>/`. This matches `MEMORY.md`'s recorded observation
and this machine's real cache.

`reify` is `npm.ts:88-121`:

```ts
const { Arborist } = yield* Effect.promise(() => import("@npmcli/arborist"))
const add = input.add ?? []
const npmOptions = yield* NpmConfig.load(input.dir)
const arborist = new Arborist({
  ...npmOptions,
  path: input.dir,
  binLinks: true,
  progress: false,
  savePrefix: "",
  ignoreScripts: true,
})
return yield* Effect.tryPromise({
  try: () => arborist.reify({ ...npmOptions, add, save: true, saveType: "prod" }),
  …
```

`@npmcli/arborist` is pinned at `9.4.0` and `@npmcli/config` at `10.8.1` in
`packages/core/package.json` at `v1.19.0`. `NpmConfig.load`
(`packages/core/src/npm-config.ts:12-32`) instantiates npm's own `@npmcli/config` with
`definitions`, `flatten`, `nerfDarts` and `shorthands` from
`@npmcli/config/lib/definitions/index.js`, so **the user's real `.npmrc` chain (registry,
proxy, auth, `engine-strict`, `strict-peer-deps`, `omit`, …) is loaded and spread into both
the Arborist constructor and `reify()`** — except for the five keys opencode sets after the
spread, which includes `ignoreScripts: true`.

There is no `child_process`/`spawn` of `npm`, `bun`, `pnpm` or `yarn` anywhere on this path.
`git grep -ln "npm install\|bun install\|\"install\"" v1.19.0 -- packages/opencode/src
packages/opencode/script` returns six files, none of them in `packages/opencode/src/plugin/`
or `packages/core/src/npm.ts`; the `npm install -g` / `bun install -g` strings in
`packages/opencode/src/installation/index.ts:89-104` upgrade **opencode itself**, not
plugins.

### 1.2 The v2.0.27 path is the same shape

`packages/util/src/npm.ts:209-243` at `v2.0.27`
(<https://github.com/sst/opencode/blob/v2.0.27/packages/util/src/npm.ts#L209-L243>) builds
the same in-process Arborist:

```ts
const arborist = new Arborist({
  ...options,
  path: input.dir,
  binLinks: true,
  progress: false,
  savePrefix: "",
  ignoreScripts: true,
})
```

and `npm.ts:375` repeats `ignoreScripts: true` for the second call site.
`git grep -rn "ignoreScripts\|ignore-scripts" v2.0.27 -- packages/core/src packages/cli/src`
returns no hits; the only `Arborist` in the v2 tree is
`packages/util/src/npm.ts` (`git grep -ln "arborist\|Arborist" v2.0.27 -- packages/`
returns only `packages/util/package.json` and `packages/util/src/npm.ts`).

Two v2 differences that matter later:

- The cache layout changed: `npm.ts:141` is
  `path.join(global.cache, "npm", key(pkg, target))`, with per-install numbered
  *generations* and a 7-day retention (`npm.ts:131`, `collect` at `npm.ts:323-341`). The v2
  app name is still `"opencode"` (`packages/util/src/global.ts:12`), so the cache root is
  shared with v1 but the subdirectory is `npm/` rather than `packages/`. A v1 install's
  cached copy is therefore **not** reused by v2 — v2 installs fresh.
- `bun install --global --trust` does appear at
  `packages/cli/src/services/updater.ts:411`, but that is opencode upgrading **itself**, not
  a plugin install.

### 1.3 The generated manifest: no `trustedDependencies`, and no way to add one

This machine's `~/.cache/opencode/packages/opencode-skills-autocomplete@latest/package.json`,
written by opencode 1.x on 2026-09-29, is in full:

```json
{
  "dependencies": {
    "opencode-skills-autocomplete": "0.2.1"
  }
}
```

and its sibling `package-lock.json` is `"lockfileVersion": 3` — npm's lockfile format, as
expected from Arborist, not Bun's `bun.lock`/`bun.lockb`. The lockfile does record our
`engines` block, which confirms the manifest is being read:

```json
"node_modules/opencode-skills-autocomplete": {
  "version": "0.2.1",
  "resolved": "https://registry.npmjs.org/opencode-skills-autocomplete/-/opencode-skills-autocomplete-0.2.1.tgz",
  "integrity": "sha512-WVwGe4+kF1pN10LUTt2bIEt5kmI7s41RGXqnQlW9ZaE6hTLI2+Aj2VYOgfyFcCi/O2zNGpBDG8FkqTwwS+n9hg==",
  "license": "MIT",
  "engines": { "opencode": ">=1.0.137" }
}
```

`trustedDependencies` is absent, and **a dependency cannot put it there**:

- the root manifest is generated by Arborist's `save: true, saveType: "prod"`, which writes
  dependency entries only;
- `grep -rn "trustedDependencies" <arborist 9.4.0>/lib/` returns **no hits** — Arborist has
  no concept of the field;
- the field is Bun's, and Bun is never invoked on this path (§1.1, §1.2).

---

## 2. Bun lifecycle-script trust, precisely — and why it is moot here

**It is moot: `ignoreScripts: true` means no `preinstall`, `install`, `postinstall` or
`prepare` script of any dependency runs, on either opencode major. The answer would be the
same under Bun for a different reason, and different under a bare `npm install`.**

### 2.1 Arborist with `ignoreScripts: true` runs nothing

Every dependency-script invocation in Arborist 9.4.0 is gated on the flag.
`lib/arborist/rebuild.js:160-172` (`#build`):

```js
if (!this.options.ignoreScripts) {
  await this.#runScripts('preinstall')
}
// links should run prepare scripts and only link bins after that
if (type === 'links') {
  if (!this.options.ignoreScripts) {
    await this.#runScripts('prepare')
  }
}
if (this.options.binLinks) {
  await this.#linkAllBins()
}
if (!this.options.ignoreScripts) {
  await this.#runScripts('install')
  await this.#runScripts('postinstall')
}
```

`lib/arborist/rebuild.js:37-39` additionally short-circuits the whole rebuild when
`ignoreScripts && !binLinks`; opencode passes `binLinks: true`, so bins are still linked but
the four script phases are skipped. The root project's own
`predependencies`/`dependencies`/`postdependencies` are gated too
(`lib/arborist/reify.js:231-234`), and the generated root manifest has no `scripts` block
anyway (§1.3).

**Conclusion: there is no lifecycle-script hook. A `postinstall` that prints a version
warning cannot run, on 1.19.0 or 2.0.27.**

### 2.2 Bun's rules, for the record

From Bun's own documentation:

- `https://bun.com/docs/pm/cli/install`: "Unlike other npm clients, Bun does not execute
  arbitrary lifecycle scripts like `postinstall` for installed dependencies." The project's
  own `{pre|post}install` and `{pre|post}prepare` *do* run.
- To opt a dependency in, you "add the package to `trustedDependencies` in your
  package.json" and reinstall. `--trust` is documented as "Add to trustedDependencies in the
  project's package.json and install the package(s)".
- `--ignore-scripts` skips "lifecycle scripts for all packages, including the project's
  package.json and trusted dependencies."
- `https://bun.com/docs/cli/pm`: `bun pm untrusted` lists dependencies whose "lifecycle
  scripts [were] blocked during install"; `bun pm trust <names>` runs them and adds the
  names to `trustedDependencies`; `bun pm default-trusted` prints the built-in default list.
- The built-in allowlist is a flat newline-separated file of package names in Bun's source,
  `src/install/default-trusted-dependencies.txt`
  (<https://raw.githubusercontent.com/oven-sh/bun/main/src/install/default-trusted-dependencies.txt>),
  366 entries at time of reading (e.g. `@airbnb/node-memwatch`,
  `@anthropic-ai/claude-code`, `@apollo/rover`, …). **Getting on it means a pull request to
  Bun** — it is not something a package can declare about itself. It is also keyed to the
  *consuming* project's manifest, which opencode generates (§1.3) and we do not control.

So even if opencode shelled out to `bun install`, our scripts would be blocked by default
and the only route to trust would run through either Bun's repository or a manifest we
cannot write.

### 2.3 Where the answer would differ

A plain `npm install <pkg>` (no `--ignore-scripts`) *does* run a dependency's
`preinstall`/`install`/`postinstall`, and `pnpm` does too (subject to its own
`onlyBuiltDependencies` gate in pnpm 10+). **Neither is on opencode's plugin-install path**,
so this is noted only to say the flags were checked: §1.1 and §1.2 quote the exact
constructor and `reify` arguments, and `ignoreScripts: true` is set unconditionally in both.

---

## 3. Every other package-controlled hook, ruled in or out

### 3.1 `engines`, any key, under Arborist

**Out as a cross-major gate. `engines.opencode` is invisible to the installer, and
`engines.node`/`engines.npm` are the only keys any installer reads.**

Arborist 9.4.0, `lib/arborist/build-ideal-tree.js:182-205`:

```js
async #checkEngineAndPlatform () {
  const { engineStrict, npmVersion, nodeVersion, omit = [], cpu, os, libc } = this.options
  const omitSet = new Set(omit)
  for (const node of this.idealTree.inventory.values()) {
    if (!node.optional && !node.shouldOmit(omitSet)) {
      try {
        if (!(node.isRoot && node.package.devEngines)) {
          checkEngine(node.package, npmVersion, nodeVersion, this.options.force)
        }
      } catch (err) {
        if (engineStrict) { throw err }
        log.warn(err.code, err.message, { package: err.pkgid, required: err.required, current: err.current })
      }
      checkPlatform(node.package, this.options.force)
    }
    …
```

`checkEngine` is `npm-install-checks` (9.0.0), whose entire engines logic is:

```js
const nodeFail = nodev && eng.node && !semver.satisfies(nodev, eng.node, opt)
const npmFail = npmVer && eng.npm && !semver.satisfies(npmVer, eng.npm, opt)
if (nodeFail || npmFail) { throw Object.assign(new Error('Unsupported engine'), { … code: 'EBADENGINE' }) }
```

Only `eng.node` and `eng.npm` are read. **A non-standard `engines.opencode` key is never
examined by any installer** — it exists purely for opencode 1.x's own loader (§3.3).

`engine-strict` behavior: it is an npm config key, so `NpmConfig.load` (§1.1) picks it up
from the user's `.npmrc` and it reaches Arborist as `engineStrict`. With it set, a failing
`engines.node` would make the whole install **throw**; without it, `log.warn`. That is a
real lever on install success, but it is keyed on the user's **Node version**, not on the
opencode version, so it cannot distinguish 1.x from 2.x and would break every user whose
Node fell outside the range. Out.

Under Bun: Bun documents no `engine-strict` config and `engines` is not described as
enforced on install. Not relevant here regardless, since Bun is not invoked (§1.1).
**Unverified: whether `bun install` enforces `engines.node` at all.** What would verify it:
`bun install` of a package declaring `engines.node: "<0.1.0"` in a scratch directory.

### 3.2 `os` / `cpu` / `libc`

**Out, as the brief assumed, and here is why.** `checkPlatform` (quoted above, called at
`build-ideal-tree.js:203`) throws `EBADPLATFORM` and — unlike `checkEngine` — is **not**
gated by `engineStrict`, so a mismatch is a hard install failure. But its inputs are
`process.platform`, `process.arch` and libc (`npm-install-checks/lib/current-env.js`); there
is no opencode-version dimension to key on. Declaring `"os": ["aix"]` would refuse
*everyone* on every opencode version, and on 1.x the resulting failure lands at
`stage: "install"`, which for a TUI plugin means `console.error` and nothing on screen
(§5.1). Out on both counts.

### 3.3 `engines.opencode` — the only field opencode itself reads

Established in the earlier research file and unchanged: `checkPluginCompatibility`
(`packages/opencode/src/plugin/shared.ts:194-205` at `v1.19.0`) passes the range verbatim to
node-semver `satisfies`, is skipped when the running major is `0`, and is gated on
`base.source === "npm"` at `packages/opencode/src/plugin/loader.ts:123-131`.

Two facts from that file that decide this question:

- For a **TUI** plugin the rejection reaches only `console.error`.
  `packages/opencode/src/plugin/tui/runtime.ts:762-764` routes
  `stage === "compatibility"` to `fail(…)`, and `fail` is
  `runtime.ts:128-137` — a `console.error` wrapper. `warn` (`runtime.ts:140-142`) is
  `console.warn`. Neither reaches the pty (`MEMORY.md`, verified on 1.18.32).
- Because this package has no `main` and no `exports["./server"]`, the **server** loader
  returns `stage: "missing"` at `loader.ts:110-121` — *before* the compatibility check at
  `loader.ts:125` — and the server path's `missing()` handler
  (`packages/opencode/src/plugin/index.ts:192`) is an empty function.

And at `v2.0.27` the field does not exist:
`git grep -n "engines\b" v2.0.27 -- packages/plugin packages/cli/src packages/server/src
packages/core/src` returns no hits, and
`git grep -rn "checkPluginCompatibility\|satisfies(" v2.0.27 -- packages/plugin
packages/cli/src` returns nothing.

**§5.1 shows how to make this field's message visible anyway, at a cost.**

### 3.4 `peerDependencies` / `peerDependenciesMeta`

**Out as a host-version gate.** A peer dependency on `@opencode-ai/plugin` or
`@opencode/plugin` says nothing about the *host binary* — it is a registry package that
Arborist will simply fetch into the plugin's own tree.

Arborist 7+/9 installs missing peers automatically. A peer *conflict* raises `ERESOLVE`
(`lib/arborist/build-ideal-tree.js:1423`), but only when strict:
`build-ideal-tree.js:1344` is `const conflictOK = this.options.force || !isMine && !this.#strictPeerDeps`,
and `strictPeerDeps` defaults to `false` (`build-ideal-tree.js:106`). opencode passes the
user's npm config, so `strict-peer-deps=true` in a user `.npmrc` could turn a conflict into
a failure — again a user-side setting we cannot rely on, keyed on a package tree we do not
control, surfacing at `stage: "install"` → invisible for a TUI plugin (§5.1).

There is also no package whose *version* tracks the installed opencode binary in a way a
peer range could test: the host is `opencode-ai` (v1) or `@opencode/cli` (v2), installed
globally by a different package manager into a different tree entirely
(`packages/opencode/src/installation/index.ts:89-104` at `v1.19.0`).

### 3.5 Module-load-time code in our own entrypoint, on v2

**In, and this is the strongest lever for case (A): on opencode 2.x our module *is*
imported and evaluated.**

`packages/plugin/src/host.ts:17-48` at `v2.0.27`
(<https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/host.ts#L17-L48>):

```ts
export function resolve(target: Target): Entrypoints {
  const entry = (subpaths: readonly string[]) => {
    for (const subpath of subpaths) {
      const specifier = target.name
        ? [target.name, subpath].filter(Boolean).join("/")
        : path.resolve(target.directory, subpath || "index")
      try { return resolveModule(specifier, target.directory) } catch (error) { … }
    }
    return undefined
  }
  return { server: entry(["server", ""]), tui: entry(["tui"]), rpc: entry(["rpc"]) }
}

export function load(entrypoint: string): Promise<unknown> {
  return importModule(entrypoint)
}
```

So v2 resolves the specifier `<package-name>/tui` — **the same `exports["./tui"]` key v1
reads**, not a `./cli` key. There is no `./cli` subpath anywhere in `resolve`.

`resolveModule` is standard resolution: `Bun.resolveSync(specifier, directory)` under Bun
and `import.meta.resolve` behind a `registerHooks` parent override under Node
(`packages/util/src/runtime/import.bun.ts:7-10`,
`packages/util/src/runtime/import.node.ts:20-53`, selected by the `#runtime-import` imports
map in `packages/util/package.json:27-32`, whose `default` is the Bun variant).

`packages/tui/src/plugin/context.tsx:670-679` at `v2.0.27` then calls `Host.load`, which is
a plain dynamic `import()` — **our top-level module code executes**:

```ts
const entrypoint = Host.resolve(target).tui
if (!entrypoint) return { status: "unsupported" as const }
let source = local
  ? await trace("read", …, () => readSource(entrypoint))
  : { version: entrypoint, module: await trace("load", …, () => Host.load(entrypoint)) }
```

Our `dist/tui.js` has no runtime imports (every import in `src/tui.ts` is `import type`) and
no top-level side effects, so it evaluates cleanly on v2 today.

### 3.6 What v2 does with a `{ id, tui }` default export: it throws, and the user sees it

`packages/tui/src/plugin/context.tsx:694-697` and `:742-751` at `v2.0.27`:

```ts
if (typeof mod !== "object" || mod === null || !("default" in mod) || !isPlugin(mod.default))
  throw new Error(`Invalid V2 TUI plugin module: ${spec}`)
return { status: "loaded" as const, plugin: mod.default, version }
…
function isPlugin(value: unknown): value is Plugin.Definition {
  return (
    typeof value === "object" && value !== null &&
    "id" in value && typeof value.id === "string" && value.id.length > 0 &&
    "setup" in value && typeof value.setup === "function"
  )
}
```

`isPlugin` is **pure duck-typing**: `id: string` plus `setup: function`. It does not check
for absent keys, and it does not require `@opencode/plugin`'s `Plugin.define`. Our
`{ id, tui }` has no `setup`, so the throw fires.

The throw is caught at `context.tsx:371-374` into
`{ status: "failed", error: errorMessage(error) }`, pushed into `failures` at `:367-373` with
`target` = the configured spec, and then — `context.tsx:473-486`:

```ts
// Surface newly failing plugins; repeated reconciles stay silent.
for (const state of states)
  if (state.status === "failed" && !store.states.some(…))
    host.toast.show({
      variant: "error",
      title: `Plugin failed: ${state.target}`,
      message: "Run /plugins to view details.",
      action: { label: "Open plugins", run: () => host.keymap.dispatch("plugins.list") },
    })
```

and `packages/tui/src/feature-plugins/system/plugins.tsx:261-263` renders the stored error
string in a dialog titled `"TUI plugin error"`.

**So opencode 2.x already shows the user an error toast for our package as published, with
no change on our side.** Two caveats:

- the toast text is opencode's, not ours — our message only reaches the `/plugins` error
  dialog, as the string `Invalid V2 TUI plugin module: opencode-skills-autocomplete`;
- the sibling status `"unsupported"` (returned at `context.tsx:672` when **no** `./tui`
  entrypoint resolves) is *not* toasted — the loop tests `status === "failed"` — and
  `plugins.tsx:58` filters `unsupported` out of the list entirely. **Deleting
  `exports["./tui"]` would therefore make v2 silent**, the opposite of the goal.

### 3.7 One `exports` map serving both contracts

**v2 reads the same `./tui` key as v1 (§3.5), so there is no second key to publish. But the
two hosts parse the key differently, and that asymmetry is exploitable.**

v1 does **not** use a module resolver. `packages/opencode/src/plugin/shared.ts:71-114` at
`v1.19.0` hand-parses the manifest:

```ts
function extractExportValue(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (!isRecord(value)) return undefined
  for (const key of ["import", "default"]) {
    const nested = value[key]
    if (typeof nested === "string") return nested
  }
  return undefined
}
…
function resolvePackageEntrypoint(spec: string, kind: PluginKind, pkg: PluginPackage) {
  const exports = pkg.json.exports
  if (isRecord(exports)) {
    const raw = extractExportValue(exports[`./${kind}`])
    if (raw) return resolvePackagePath(spec, raw, kind, pkg)
  }
  if (kind !== "server") return
  …
```

Only `import` and `default` are considered, only one level deep, and only when the value is
a `string`. v2 resolves the same subpath through `Bun.resolveSync` / `import.meta.resolve`
(§3.5), which honours the full standard condition set including `"bun"`.

Consequences:

1. **`exports["./tui"]` may carry nested condition objects without breaking v1**, provided a
   top-level `"import"` or `"default"` string is present for v1 to find. For example
   `"./tui": { "bun": "./dist/tui.v2.js", "default": "./dist/tui.js" }` gives v1
   `./dist/tui.js` (its loop finds `default`) and gives a Bun-hosted v2
   `./dist/tui.v2.js`. The published `@opencode/cli` 2.0.27 ships a compiled binary
   (`"bin": { "opencode": "bin/opencode.exe" }` plus twelve `@opencode/cli-<platform>`
   optional dependencies, per <https://registry.npmjs.org/@opencode%2Fcli/2.0.27>), which is
   consistent with a Bun-compiled host, and the `#runtime-import` map's `default` is the Bun
   variant. **Unverified: that an installed `@opencode/cli` 2.0.27 actually resolves plugin
   subpaths under the `"bun"` condition.** What would verify it: install `@opencode/cli`
   2.0.27, configure a plugin whose `./tui` export is
   `{ "bun": "./a.js", "default": "./b.js" }` where each file writes a distinguishable
   marker, and see which marker appears.
2. **A single flat file is simpler and is already enough.** v1's `readV1Plugin`
   (`packages/opencode/src/plugin/shared.ts:272-304` at `v1.19.0`) inspects only
   `default`, `id`, `server` and `tui`, and rejects nothing for extra keys; v2's `isPlugin`
   (§3.6) inspects only `id` and `setup`. So **`export default { id, tui, setup }` satisfies
   both contracts from one file** — v1 ignores `setup`, v2 ignores `tui`. This is the same
   dual-export shape the v1 migration guide describes for server plugins
   (<https://opencode.ai/v2/docs/build/plugins/migrate-v1/>), applied to the TUI entry.
   It needs no import of `@opencode/plugin`: `isPlugin` is structural.
3. **There is a v2 API for showing a notice from `setup`.** `context.ui.toast.show(options)`
   with `{ variant: "info" | "success" | "warning" | "error", title?, message }`
   (`packages/plugin/src/tui/context.ts:269-281`, `:492`, `:559` at `v2.0.27`), reached as
   `context.ui.toast.show(…)` from inside `setup`. A `setup` that only shows a toast and
   returns is a legal v2 plugin — `setup` may return `void`
   (`packages/plugin/src/tui/plugin.ts`, quoted in the earlier research file). Alternatively
   a `setup` that **throws** is caught and routed to the same "Plugin failed" toast plus a
   `/plugins` error dialog carrying our thrown message (`context.tsx:641-647` wraps
   `plugin.setup(context)` and rethrows; `:446-456` collects the error; `:473-486` toasts).

### 3.8 Config migration: does 2.x read our `tui.json` entry? Yes.

**This is what makes case (A) a live case rather than a hypothetical.**
`packages/cli/src/config/migrate.ts:160-166` and `:194` at `v2.0.27`
(<https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/config/migrate.ts#L160-L194>):

```ts
export function migrateV1(legacy: TuiConfigV1.Info | undefined, kv: Record<string, any>): Info {
  const plugins = [
    ...(legacy?.plugin?.map((plugin) =>
      typeof plugin === "string" ? plugin : { package: plugin[0], options: plugin[1] },
    ) ?? []),
    ...Object.entries(legacy?.plugin_enabled ?? {}).map(([id, enabled]) => (enabled ? id : `-${id}`)),
  ]
  …
  ...(plugins.length ? { plugins } : {}),
```

The migration reads `path.join(input.config, "tui.json")` (`migrate.ts:100`) when `cli.json`
does not yet exist, maps both the bare-string and `[spec, options]` forms, and writes the
result as `cli.json`'s `plugins` array (`migrate.ts:105-107`). Our package therefore
survives the upgrade **with its options**, and v2 then auto-installs it: in
`packages/tui/src/plugin/context.tsx:306`, configured plugins enter reconciliation as
`...(config.data.plugins ?? []).map((entry) => ({ entry, install: true, optional: false }))`
— `install: true`, `optional: false`, meaning v2 will run the npm install and will report
failure rather than skipping quietly.

Combined with §1.2's separate `npm/` cache root, a v2 user gets a **fresh install of
`<name>@latest`** on first launch after the upgrade. Anything we publish to the `latest`
dist-tag before that moment is what they run.

### 3.9 npm-registry-side levers

| Lever | What it actually does on opencode's install path | Visible? |
| --- | --- | --- |
| `npm deprecate` | Arborist logs it and nothing else: `lib/arborist/reify.js:647-652` is `const { _id, deprecated } = node.package; … if (deprecated) { log.warn('deprecated', `${_id}: ${deprecated}`) }`. `log` is `proc-log`, whose `warn` is `function (...args) { return process.emit('log', 'warn', ...args) }` (`proc-log` 6.0.0, `lib/index.js`). `git grep -rn "proc-log\|procLog" v1.19.0 -- packages/` and the same at `v2.0.27` return **no hits**, so opencode registers no `process.on('log')` listener and the event is discarded. | **No** |
| New version on `latest` | `resolvePluginTarget` rewrites a bare spec to `<name>@latest` (§1.1), so `latest` is the tag that decides what a *fresh* install gets. But v1 never re-resolves: `Npm.add` returns early whenever `~/.cache/opencode/packages/<name>@latest/node_modules/<name>` exists (`packages/core/src/npm.ts:133-135`), with no version comparison, and there is no cache-invalidation code (`git grep -rn "packages\"" v1.19.0 -- packages/core/src/npm.ts packages/opencode/src` returns only the `directory` definition at `npm.ts:87`). v2 reuses its newest generation unless `update` is set (`packages/util/src/npm.ts:258-260`). | Reaches **new** installs only (which, per §3.8, includes every v2 upgrader) |
| A separate dist-tag (e.g. `v1`) | Only applies if the user's config spells the tag (`opencode-skills-autocomplete@v1`). opencode passes the spec through `npm-package-arg` untouched (`shared.ts:22-34`, `:209-212`). Existing configs say the bare name, so this is a **migration** lever, not a refusal lever. | n/a |
| Unpublishing / a 404 | `stage: "install"` → `fail("failed to resolve tui plugin", …)` → `console.error` on 1.x (§5.1); on v2 → a `status: "failed"` toast (§3.6). Also breaks working installs. | 1.x no / 2.x yes |

**Unverified: whether opencode 1.x or 2.x ever refreshes a cached plugin without the user
asking.** v1's `plug` CLI command (`packages/opencode/src/cli/cmd/plug.ts`) and the TUI's
`api.plugins.install` (`packages/opencode/src/plugin/tui/runtime.ts:1025-1027`) both go
through `installPlugin` → `resolvePluginTarget` → the same early return, and v2 exposes
`opencode plugin check` / `opencode plugin update`
(`packages/cli/src/commands/commands.ts:280-292`). No background-refresh code was found in
either tree. What would verify it: run a 1.x and a 2.x session over several days with a cache
populated and a newer version published, and diff the cache.

### 3.10 Other loader fields a package can trip deliberately

Checked each against where its error lands.

| Field / condition | Loader code | Where the message goes |
| --- | --- | --- |
| `oc-themes` not an array, or an absolute/empty entry | `readPackageThemes` throws `TypeError` (`shared.ts:238-262` at `v1.19.0`), called from `packages/opencode/src/plugin/tui/runtime.ts:366` | TUI: `fail()` → `console.error`. **Invisible.** |
| `id` present but not a string, or empty | `readPluginId` throws `TypeError` (`shared.ts:264-270`) | same. **Invisible.** |
| `exports["./tui"]` points outside the package dir | `resolvePackageFile` throws `Plugin … resolved tui entry outside plugin directory` (`shared.ts:89-97`) → `stage: "entry"` | same. **Invisible.** |
| `exports["./tui"]` declared but the file is missing | v1: the path is built from the string without an existence check (`shared.ts:99-114`), so the failure happens at `import()` in `loader.ts:136-146` → `stage: "load"` → `fail()`. v2: `resolveModule` `stat`s the target (`import.node.ts:32`) / `Bun.resolveSync` throws, so `Host.resolve` swallows `ENOENT` and returns `undefined` → `status: "unsupported"` → **not toasted** (§3.6). | 1.x invisible; 2.x invisible |
| `exports["./tui"]` present but the module throws at import | v1 `stage: "load"` → `console.error`; v2 → `status: "failed"` → **toast + `/plugins` dialog carrying our message** | 1.x no / **2.x yes** |
| default export missing `tui` (v1) / missing `setup` (v2) | `readV1Plugin` throws `Plugin … must default export an object with tui()` (`shared.ts:299-301`); `isPlugin` fails → `Invalid V2 TUI plugin module` (§3.6) | 1.x invisible; **2.x yes** |
| Package name missing from manifest | `resolvePluginId` throws `Plugin package … is missing name` (`shared.ts:306-323`) | 1.x invisible |
| Malformed JSON in the *manifest* | `readPluginPackage` → `Filesystem.readJson` rejects → `stage: "entry"` | 1.x invisible |

The pattern is uniform: **on opencode 1.x, every package-side defect a TUI plugin can
declare ends at `console.error`.** The only v1 path that reaches the UI is the server
loader's `publishPluginError` (§5.1).

---

## 4. Summary of the v2 load sequence for this package, as published

Reading §3.5–§3.8 end to end, with opencode 2.0.27 and today's `0.3.0` on npm:

1. User upgrades. `cli.json` does not exist, so `ConfigMigration.run` reads
   `~/.config/opencode/tui.json`, maps its `plugin` array, and writes
   `cli.json` with `plugins: ["opencode-skills-autocomplete"]`
   (`packages/cli/src/config/migrate.ts:100-116`, `:160-194`).
2. Reconciliation enters our spec with `install: true, optional: false`
   (`packages/tui/src/plugin/context.tsx:306`).
3. `packages.prepare(spec, true)` → `Npm` → in-process Arborist, `ignoreScripts: true`, into
   `~/.cache/opencode/npm/opencode-skills-autocomplete@latest/<generation>/`
   (`packages/util/src/npm.ts:141`, `:209-243`, `:258-320`). `engines.opencode` is read by
   nobody (§3.1, §3.3).
4. `Host.resolve(target).tui` resolves `opencode-skills-autocomplete/tui` → our
   `dist/tui.js` (§3.5).
5. `Host.load` imports it. **Our top-level code runs.**
6. `isPlugin(mod.default)` is false → `throw new Error("Invalid V2 TUI plugin module:
   opencode-skills-autocomplete")` (§3.6).
7. `host.toast.show({ variant: "error", title: "Plugin failed:
   opencode-skills-autocomplete", message: "Run /plugins to view details.", action: … })`,
   and `/plugins` shows our error string under "TUI plugin error" (§3.6).

**Unverified: this sequence has not been run.** What would verify it: install
`@opencode/cli@2.0.27` on a machine with a `tui.json` listing this plugin, launch it, and
check for the toast and the `/plugins` entry.

---

## 5. Case (A) and case (B): the mechanisms that reach the user

### 5.1 Making `engines.opencode`'s message visible on 1.x: add a server entrypoint

The compatibility rejection *is* surfaced — but only on the server loader.
`packages/opencode/src/plugin/index.ts:193-215` at `v1.19.0`:

```ts
error(candidate, _retry, stage, error, resolved) {
  const spec = candidate.plan.spec
  const cause = error instanceof Error ? (error.cause ?? error) : error
  const message = stage === "load" ? errorMessage(error) : errorMessage(cause)
  if (stage === "install") { publishPluginError(`Failed to install plugin …: ${message}`); return }
  if (stage === "compatibility") { publishPluginError(`Plugin ${spec} skipped: ${message}`); return }
  if (stage === "entry") { publishPluginError(`Failed to load plugin ${spec}: ${message}`); return }
  publishPluginError(`Failed to load plugin ${spec}: ${message}`)
},
```

and `publishPluginError` (`index.ts:139-141`) publishes a `Session.Event.Error`, which
reaches the UI. Only `missing` is silent (`index.ts:192` is `missing(candidate, _retry,
message) {}`).

So declaring `exports["./server"]` (or a `main`) would let the server loader reach
`stage: "compatibility"` and publish
`Plugin opencode-skills-autocomplete skipped: Plugin requires opencode >=1.15.6 <2.0.0 but
running 1.14.0`.

**Its cost is real and should not be glossed.** The server and TUI plugin lists are
*separate*:

- `tui.json`'s `plugin` array feeds `plugin_origins` for the TUI runtime only
  (`packages/opencode/src/config/tui.ts:151-170`, `:180`);
- `opencode.json`'s `plugin` array feeds the server's `cfg.plugin_origins`
  (`packages/opencode/src/config/config.ts:344-363`), which is what
  `packages/opencode/src/plugin/index.ts:181` loads with `kind: "server"`.

So the server loader only ever sees us if the user also lists the package in
`opencode.json`. `opencode plug` and the TUI installer do write both files when a package
declares both targets — `packageTargets` (`packages/opencode/src/plugin/install.ts:145-166`)
emits a `server` target from `exports["./server"]` or `main`, and `patchName`
(`install.ts:340-343`) maps `server` → `opencode.json`, `tui` → `tui.json`. But **every
existing user, and anyone following this repo's README, has only the `tui.json` entry**, so
the message would reach new installs only. And the `./server` module must then be a valid
v1 server plugin (`readV1Plugin` with `kind: "server"` requires a `server` function,
`shared.ts:296-298`) for versions that *do* satisfy the range — i.e. shipping a second,
do-nothing entrypoint purely to make an error message appear.

### 5.2 Detecting the host version at load time on 1.x: `api.app.version`

**Yes — the host opencode version is on the api object, from the first release that had TUI
plugins.** `packages/plugin/src/tui.ts:427-429` at `v1.19.0`:

```ts
export type TuiApp = {
  readonly version: string
}
```

with `app: TuiApp` on `TuiPluginApi` (`tui.ts:543`). Identical at `v1.3.4`
(`packages/plugin/src/tui.ts:264-266`). It is populated with `InstallationVersion`
(`packages/tui/src/app.tsx:378`, `version: InstallationVersion` passed into
`createTuiApiAdapters`), which is the build-time global:
`packages/core/src/installation/version.ts`

```ts
declare global {
  const OPENCODE_VERSION: string
  const OPENCODE_CHANNEL: string
}
export const InstallationVersion = typeof OPENCODE_VERSION === "string" ? OPENCODE_VERSION : "local"
```

— the same value `loader.ts:127` feeds to `checkPluginCompatibility`. Caveat: it is the
string `"local"` for unreleased builds, so a guard must treat a non-semver value as
"allow", exactly as `checkPluginCompatibility` does for major `0` (`shared.ts:195`).

No env-var route was found: `git grep -n "OPENCODE_" v1.19.0 --
packages/opencode/src/plugin/pty-environment.ts` returns nothing, and the version is a
compile-time global rather than a file.

Because `api.app.version` and `api.ui.toast` both date from `v1.3.4` (§6), a guard placed at
the very top of `tui()` — before any newer API is touched — can read the version, compare it,
toast, and return. That is the whole mechanism for case (B), and it needs no manifest field
and no second entrypoint.

---

## 6. Case (B): the real 1.x floor

### 6.1 Method

A full unshallow clone; 1043 `vX.Y.Z` tags sorted with `sort -V`; for each API, a binary
search over the 450 tags from `v1.0.0` to `v1.19.0` for the first tag at which
`git grep -q <pattern> <tag> -- <paths>` succeeds (presence is monotonic once a symbol is
added). Paths used: `packages/opencode/src/plugin packages/plugin/src packages/tui/src` for
plugin-API symbols, `packages/sdk packages/opencode/src/server` for client/SDK symbols, and
`packages/` where a symbol could live anywhere. Introducing commits were cross-checked with
`git log --oneline --reverse -S'<symbol>'` and `git tag --contains <sha>`, the procedure that
pinned the original floor.

Four of the APIs belong to opentui, not opencode, so for those the gate is the version
opencode pins in its root catalog. Those versions were downloaded from npm and grepped
directly.

### 6.2 Per-API table

| API used in `src/tui.ts` | How it was dated | First 1.x release tag |
| --- | --- | --- |
| `client.tui.appendPrompt` | `appendPrompt` in `packages/sdk` | **≤ v1.0.0** (present in `v1.0.0:packages/sdk/js/src/gen/sdk.gen.ts`) |
| `client.app.skills` | `AppSkillsResponses` in `packages/sdk` | **v1.1.25** |
| `api.app.version` | `export type TuiApp` in the plugin type file | **v1.3.4** (`tui plugins (#19347)`, 2026-03-27) |
| `api.ui.toast` | `TuiToast`; `toast:` on `api.ui` | **v1.3.4** |
| `api.ui.dialog.replace` / `.clear` / `.open` | `TuiDialogStack`; `readonly open: boolean` | **v1.3.4** |
| `api.ui.DialogSelect` | `DialogSelect` | **v1.3.4** |
| `api.renderer` (the raw `CliRenderer`) | `renderer: CliRenderer` | **v1.3.4** |
| `api.lifecycle.onDispose` | `TuiLifecycle`, `onDispose` | **v1.3.4** |
| `api.state.path.directory` / `.worktree` | `TuiState` with `path`; bounded by the TUI API's own birth | **v1.3.4** |
| `api.tuiConfig.keybinds.bindings` | `tuiConfig`; `TuiBindingLookupView.bindings` | **v1.3.4** |
| `api.keymap` as an opentui `Keymap` | `keymap: TuiKeymap` | **v1.14.44** |
| `api.renderer.currentFocusedEditor` | `currentFocusedEditor` anywhere in `packages/` | **v1.14.42** |
| `api.keymap.parseKeySequence` | `parseKeySequence` anywhere in `packages/` | **v1.14.42** |
| `api.keymap.registerLayer` | `registerLayer` in the plugin paths (`Plugin command API shim (#26564)`, 2026-05-09) | **v1.14.45** |
| `api.mode.current()` | `TuiModeApi` (`use keymap state for layer visibility (#26246)`) | **v1.15.6** |
| `api.renderer.keyInput`, `prependListener` | not spelled in opencode source at all (`git grep keyInput v1.19.0 -- packages/` → no hits); from `@opentui/core` | see §6.3 |
| `editor.plainText`, `editor.cursorOffset`, `editor.insertText` | from `@opentui/core` | see §6.3 |

### 6.3 The opentui half

Root-catalog pins (`git show <tag>:package.json`, `workspaces.catalog`):

| opencode tag | `@opentui/core` / `keymap` / `solid` |
| --- | --- |
| v1.14.42 | 0.2.6 |
| v1.14.45 | 0.2.6 |
| v1.15.6 | 0.2.15 |
| v1.19.0 | 0.4.5 |

Each of `@opentui/core` 0.2.6, 0.2.15 and 0.4.5 declares `keyInput` and
`currentFocusedEditor` in `types.d.ts` and `renderer.d.ts`, and each of `@opentui/keymap`
0.2.6, 0.2.15 and 0.4.5 declares `parseKeySequence` (0.2.15:
`src/keymap.d.ts:14 parseKeySequence(key: KeyLike): readonly KeySequencePart[];`) and
`registerLayer` (`src/keymap.d.ts:32`). `insertText` and `cursorOffset` are present in
opencode's own source from before v1.0.0. **So opentui is not the binding constraint at or
above opencode v1.14.42.**

`prependListener` comes from `keyInput` being a Node-style `EventEmitter`; it is not spelled
in either tree. **Unverified: the exact `@opentui/core` version at which
`keyInput.prependListener` began working as `src/tui.ts` relies on.** `MEMORY.md` records it
verified on `@opentui/core` 0.4.5 in a live 1.18.32 TUI. What would verify the floor end:
run the plugin against an opencode built on opentui 0.2.15.

### 6.4 The resulting floor

**`>=1.15.6`**, set by `api.mode.current()`. Verified directly rather than only by bisect:
at `v1.15.6` the plugin type file contains every member `src/tui.ts` uses, and at
`v1.15.5` — the immediately preceding release — `mode: TuiModeApi` is **absent** while all
the others are present. `parseKeySequence` and `registerLayer` are methods of the opentui
`Keymap` instance and are present in the pinned `@opentui/keymap` 0.2.15 (§6.3).

The current manifest says `>=1.0.137`. That value was pinned for `appendPrompt` alone
(commit `ea7ec60f5`, when the plugin was 0.1.0) and was never re-pinned; the table shows it
understates the real requirement by **fifteen minor versions**. On 1.0.137 through 1.15.5
the loader admits the plugin and `tui()` then throws on a missing API — the exact
half-working state `README.md:96` claims cannot happen.

### 6.5 What actually warns a case-(B) user

A version guard at the top of `tui()`:

- read `api.app.version` (available from v1.3.4, §5.2);
- if it is valid semver, major ≥ 1, and below the floor, call `api.ui.toast({ variant:
  "error", message: … })` (available from v1.3.4) and return;
- touch nothing newer before that point. From the table, the only members used before the
  guard would be `api.app` and `api.ui.toast`, both v1.3.4.

Below v1.3.4 there is no TUI plugin system at all, so there is nothing to warn from and
nothing that loads — `tui.json`'s `plugin` array was introduced by the same commit
(`tui plugins (#19347)`).

Raising `engines.opencode` to `>=1.15.6` is still correct bookkeeping — it stops the plugin
loading on 1.0.137–1.15.5 — but on this TUI-only package the skip is silent (§3.3), and the
two mechanisms are mutually exclusive: if `engines` blocks the load, `tui()` never runs and
cannot toast. **A visible warning requires the range to admit the version so our own code
can speak.**

---

## Unverified claims, collected

Each would need the stated check.

1. **The v2 load sequence (§4) has not been run.** Verify: install `@opencode/cli@2.0.27`
   with a `tui.json` listing this plugin, launch, look for the "Plugin failed" toast and the
   `/plugins` error entry.
2. **That v2 resolves plugin subpaths under the `"bun"` export condition (§3.7).** Verify:
   publish or link a package whose `./tui` export is `{ "bun": "./a.js", "default":
   "./b.js" }` with distinguishable markers, and see which runs.
3. **Whether a dual `export default { id, tui, setup }` is accepted by both hosts in
   practice (§3.7).** Source says yes on both sides (`readV1Plugin` ignores extra keys;
   `isPlugin` duck-types). Verify: run that shape on 1.19.0 and on 2.0.27.
4. **Whether opencode ever refreshes a cached plugin unprompted (§3.9).** Verify: a
   long-running 1.x and 2.x session with a newer version published, then diff
   `~/.cache/opencode/packages/` and `~/.cache/opencode/npm/`.
5. **Whether `bun install` enforces `engines.node` (§3.1).** Moot for this question. Verify:
   `bun install` a package declaring `engines.node: "<0.1.0"`.
6. **The exact `@opentui/core` version at which `keyInput.prependListener` behaves as
   `src/tui.ts` needs (§6.3).** Verify: run the plugin against an opencode built on opentui
   0.2.15.
7. **That `publishPluginError` from `stage: "compatibility"` renders legibly in the 1.19.0
   TUI (§5.1).** The code path is clear; the rendering is not checked. Verify: publish a
   package with `exports["./server"]`, a failing `engines.opencode`, and an `opencode.json`
   entry; launch 1.19.0.
8. **Not re-verified in a live 1.19.0 TUI** that TUI-loader `console.error` output still
   fails to reach the pty. The code is unchanged from the 1.18.32 observation recorded in
   `MEMORY.md`.

---

## Sources

opencode repository, tags `v1.0.0`–`v1.19.0` and `v2.0.27`:
<https://github.com/sst/opencode> (redirects to <https://github.com/anomalyco/opencode>)

- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/shared.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/loader.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/index.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/install.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/plugin/tui/runtime.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/cli/cmd/plug.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/config/config.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/config/tui.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/opencode/src/installation/index.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/core/src/npm.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/core/src/npm-config.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/core/src/global.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/core/src/installation/version.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/core/package.json`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/plugin/src/tui.ts`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/tui/src/app.tsx`
- `https://github.com/sst/opencode/blob/v1.19.0/packages/tui/src/component/dialog-status.tsx`
- `https://github.com/sst/opencode/blob/v1.15.6/packages/plugin/src/tui.ts` (and `v1.15.5`, `v1.14.44`, `v1.3.4`)
- `https://github.com/sst/opencode/blob/v2.0.27/packages/util/src/npm.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/util/src/global.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/util/src/runtime/import.bun.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/util/src/runtime/import.node.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/util/package.json`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/host.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/source.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/tui/context.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/plugin/src/tui/plugin.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/config/migrate.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/commands/commands.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/cli/src/services/updater.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/tui/src/plugin/context.tsx`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/tui/src/plugin/discovery.ts`
- `https://github.com/sst/opencode/blob/v2.0.27/packages/tui/src/feature-plugins/system/plugins.tsx`

npm packages, read from their published tarballs:

- `@npmcli/arborist` 9.4.0 — `lib/arborist/index.js`, `build-ideal-tree.js`, `reify.js`, `rebuild.js` (<https://registry.npmjs.org/@npmcli%2Farborist/9.4.0>)
- `npm-install-checks` 9.0.0 — `lib/index.js` (<https://registry.npmjs.org/npm-install-checks>)
- `proc-log` 6.0.0 — `lib/index.js` (<https://registry.npmjs.org/proc-log/6.0.0>)
- `@opentui/core` 0.2.6, 0.2.15, 0.4.5 — `types.d.ts`, `renderer.d.ts`
- `@opentui/keymap` 0.2.6, 0.2.15, 0.4.5 — `src/keymap.d.ts`, `src/services/compiler.d.ts`
- <https://registry.npmjs.org/@opencode%2Fcli/2.0.27>

Bun documentation and source:

- <https://bun.com/docs/pm/cli/install>
- <https://bun.com/docs/cli/pm>
- <https://raw.githubusercontent.com/oven-sh/bun/main/src/install/default-trusted-dependencies.txt>

opencode docs site:

- <https://opencode.ai/v2/docs/build/plugins/migrate-v1/>

This machine:

- `~/.cache/opencode/packages/opencode-skills-autocomplete@latest/package.json` and `package-lock.json`
- `~/.cache/opencode/packages/@dietrichgebert/ponytail@latest/package.json`
- `opencode --version` → `1.19.0`

This repo: `package.json`, `src/tui.ts`, `README.md`, `MEMORY.md`,
`docs/research/opencode-1-19-and-2-x.md` (branch `research/opencode-1-19-and-2-x`).
