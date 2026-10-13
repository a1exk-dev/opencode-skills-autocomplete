# Changelog

## 1.0.0 (2026-10-13)

1.0.0 is the last release to add support for opencode 1.x, and adds no new
behavior over 0.3.0. From here the 1.x line takes bug fixes only. opencode 2.x
renames the plugin contract and is not supported; that support will come in a
later major version.

The declared opencode range narrows to `>=1.15.6`, the oldest version the
plugin ever actually worked on. On opencode 1.0.137 through 1.15.5 it now stops
loading instead of failing partway through.

### Bug Fixes

- reject a hotkey the shortcut cannot use (#32)
- narrow the declared opencode range to the proven floor (#28)

## 0.3.0 (2026-10-03)

### Features

- open skill selection only for a standalone slash (#20)

## 0.2.1 (2026-09-28)

### Bug Fixes

- keep typed slash after dismissing skill menus (#17)

## 0.2.0 (2026-09-28)

### Features

- stack skills and harden release preparation

### Bug Fixes

- avoid default Ctrl+K collision

## 0.1.0 (2026-09-27)

### Features

- version gate + README + human docs (#4) (#4)
- bind configurable chord to the shared palette (#3)
- skill registration + paste behavior (#2)
- project base + pure helpers (#1)

### Bug Fixes

- replace self-referential skill symlinks with real files
