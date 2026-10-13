# The plugin's 1.x line is bug-fix-only

Status: accepted

## Context

`1.0.0` is the last release that adds support for opencode 1.x. opencode 2.x
renames the whole plugin contract — the config file, the config key, and the
export shape — so serving it means a new plugin major, not a minor on this
line. `docs/agents/git-workflow.md` required an explicit stability decision
before `1.0.0`, and this is it.

## Decision

`1.0.0` promises that the 1.x line receives bug fixes only. That sentence is
the whole promise: no individual surface is enumerated.

A **bug fix** is a change making something work, or work as expected or
claimed. It adds no feature or functionality.

Two rules follow:

- Bug fixes are patches, so the 1.x line runs `1.0.0`, `1.0.1`, `1.0.2` and
  never reaches `1.1.0`. A minor would need a feature, which the promise
  forbids.
- A `feat` commit on a 1.x branch is a policy error.

The next major serves opencode 2.x.

## What the promise covers

Everything, through the bug-fix definition rather than through a list. The
npm package name, `exports["./tui"]`, the `hotkey` option and its default, the
behavior the README documents, the `engines.opencode` range, and warn-and-skip
degradation are all alike: each may be corrected when it does not work or does
not match its claim, and none may change otherwise.

`engines.opencode` is the case worth spelling out, because `1.0.0` narrows it.
Narrowing the range to match reality is a bug fix and ships as a patch — the
manifest claimed `>=1.0.137` and the claim was false, since `api.mode.current()`
first exists in 1.15.6. Narrowing it to drop hosts that genuinely worked would
remove functionality from working users, so it is not a bug fix and cannot
reach the 1.x line at all.

## Considered options

- **Enumerate the promised surfaces.** Rejected: bug-fix-only already forbids
  the feature minors such a table would govern, so the table would be inert on
  the only line it applies to, while every future fix got argued against it.
- **Keep a minor available on 1.x** for a fix large enough that a patch
  understates it. Rejected: it costs the flat rule, and each fix then needs a
  patch-or-minor judgment call.
- **Refuse any fix that changes documented behavior.** Rejected: the next major
  drops opencode 1.x, so a defect 1.x cannot ship a fix for is one those users
  never get fixed by anyone. It would also have blocked the 0.2.0 fix that
  moved the default shortcut off `ctrl+k`, where the documented default was
  itself the defect.
