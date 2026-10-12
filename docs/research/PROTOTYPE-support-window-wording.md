# PROTOTYPE — support-window wording (throwaway)

Drafts for "Decide: how the opencode 1.x support window reads". Throwaway: the
validated text lands in `README.md`, `CHANGELOG.md`, `package.json` and
`src/tui.ts`, and this file stays on its own branch.

Three facts have to reach a user:

1. 1.0.0 adds no functionality over 0.3.0.
2. It is the last release to add opencode 1.x support; the 1.x line takes bug
   fixes only from here.
3. opencode 2.x support comes in a later major version, and 2.x is already
   published, with no date for our support.

Two corrections ride along: the floor is `>=1.15.6`, and below the floor the
plugin is skipped silently, which contradicts the "native compatibility error"
claimed at `README.md:27` and `README.md:96`.

The existing README and `docs/releasing.md` use short plain sentences and no
dashes, so these drafts do the same.

## 1. README, the `## opencode version requirement` section

Replaces lines 93 to 97.

### Variant A: one section, four paragraphs (floor, silence, 2.x, promise)

```markdown
## opencode version requirement

This plugin runs on opencode 1.x, version 1.15.6 or newer. 1.15.6 is the first
opencode release that ships every TUI API the plugin calls, and the manifest
declares `engines.opencode: ">=1.15.6"`.

On an older opencode 1.x the loader skips the plugin and says nothing: the
reason goes to standard error, which the TUI never shows. The symptom is a `/`
menu with no skill rows, so check your opencode version first.

This plugin does not run on opencode 2.x, which renames the plugin contract.
opencode 2.x installs the plugin, loads it, and then shows a "Plugin failed"
toast. Supporting 2.x needs a rewrite against the new contract and will come in
a later major version of this plugin. There is no date for it.

1.0.0 is the last release to add opencode 1.x support. From here the 1.x line
takes bug fixes only. The
[1.x bug-fix-only ADR](docs/adr/0001-opencode-1x-is-bug-fix-only.md) has the
reasoning.
```

### Variant B: split, so the requirement stays short and the window gets a heading

```markdown
## opencode version requirement

This plugin runs on opencode 1.x, version 1.15.6 or newer, which is the first
release that ships every TUI API the plugin calls. The manifest declares
`engines.opencode: ">=1.15.6"`.

On an older opencode 1.x the loader skips the plugin and says nothing: the
reason goes to standard error, which the TUI never shows. The symptom is a `/`
menu with no skill rows, so check your opencode version first.

## What this plugin supports, and for how long

1.0.0 is the last release to add opencode 1.x support, and adds no behavior
over 0.3.0. From here the 1.x line takes bug fixes only. The
[1.x bug-fix-only ADR](docs/adr/0001-opencode-1x-is-bug-fix-only.md) has the
reasoning.

This plugin does not run on opencode 2.x, which renames the plugin contract.
opencode 2.x installs the plugin, loads it, and then shows a "Plugin failed"
toast. Supporting 2.x needs a rewrite against the new contract and will come in
a later major version of this plugin. There is no date for it.
```

## 2. README, the install blurb at lines 26 to 27

Current, and false on both halves:

> The plugin requires opencode 1.0.137 or newer; older versions skip it at load
> time with a compatibility error.

### Variant A: correct it in place, point at the section

```markdown
The plugin requires opencode 1.15.6 or newer and does not run on opencode 2.x.
See [opencode version requirement](#opencode-version-requirement).
```

### Variant B: the floor only, no forward pointer

```markdown
The plugin requires opencode 1.15.6 or newer, and does not run on opencode 2.x.
```

## 3. `CHANGELOG.md`, the 1.0.0 note

Goes under `## 1.0.0 (<date>)`, above `### Features` and `### Bug Fixes`. The
release workflow copies it into the GitHub Release body, so one text serves
both.

### Variant A: three sentences, no floor detail

```markdown
1.0.0 is the last release to add support for opencode 1.x, and adds no new
behavior over 0.3.0. From here the 1.x line takes bug fixes only. opencode 2.x
renames the plugin contract and is not supported; that support will come in a
later major version.
```

### Variant B: A, plus the one line that costs a user something

```markdown
1.0.0 is the last release to add support for opencode 1.x, and adds no new
behavior over 0.3.0. From here the 1.x line takes bug fixes only. opencode 2.x
renames the plugin contract and is not supported; that support will come in a
later major version.

The declared opencode range narrows to `>=1.15.6`, the oldest version the
plugin ever actually worked on. On opencode 1.0.137 through 1.15.5 it now stops
loading instead of failing partway through.
```

## 4. The 2.x `setup`-export sentence

One sentence, read by a 2.x user through a toast or a thrown message. "Add a
dual-host setup export" takes its text from here.

### Variant A

```
opencode-skills-autocomplete 1.x supports opencode 1.x only. Support for
opencode 2.x will come in a later major version of this plugin.
```

### Variant B: adds what to do

```
opencode-skills-autocomplete 1.x supports opencode 1.x only. Remove it from
your config; support for opencode 2.x will come in a later major version.
```

## 5. `package.json`, the npm description

Current:

> opencode plugin that lists every available skill as a row in the / menu and
> adds a configurable chord shortcut to the skill list.

### Variant A: unchanged

The npm page renders the README directly below the description, so the window
is on the page either way, and a description that names a version has to be
edited whenever that version moves.

### Variant B: append the host range

```
opencode plugin that lists every available skill as a row in the / menu and
adds a configurable chord shortcut to the skill list. Requires opencode 1.x
(>=1.15.6).
```

## 6. `docs/releasing.md` and `docs/development.md`

Proposal: neither changes. `docs/releasing.md` step 1 already carries the
bug-fix-only promise in plain words, added by "Decide: post-1.0 versioning
rules in the agent docs". `docs/development.md` says only that the commit type
decides the bump, which stays true. Nothing a contributor does changes because
of this policy.
