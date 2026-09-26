# Issue tracker: GitHub (private project + public issues)

Two surfaces, two rules:

- **Internal work items** (specs, tickets, wayfinder maps) are **draft items** in the private GitHub project **"opencode-skills-autocomplete"** (owner `a1exk-dev`, project `3`, id `PVT_kwHOANlzg84Bky-J`). They are never public GitHub issues.
- **Public Issues and PRs** on `a1exk-dev/opencode-skills-autocomplete` are the external surface: bug reports, proposals, and PRs from other developers. Skills never create them; `/triage` may label/comment/close them.

Use the `gh` CLI for all operations. If the project number changes, resolve it: `gh project list --owner a1exk-dev --format json --jq '.items[] | select(.name == "opencode-skills-autocomplete")'`.

**No access to the project?** The project is private and not shared with repo collaborators. If `gh project list` returns it as missing or a `gh project` call fails with a permission error, stop: don't retry, don't invent a substitute tracker, don't create public issues instead. Ask the maintainer for access, or do the work without publishing tickets.

## Draft items (internal work)

- **Create**: `gh project item-create 3 --owner a1exk-dev --title "..." --body "..."`
- **List**: `gh project item-list 3 --owner a1exk-dev --format json` — items carry a node `id` (`PVTI_...`) used for edits.
- **Edit**: `gh project item-edit 3 --owner a1exk-dev --id <PVTI_id> --field "Status" --value "Todo|In Progress|Done"` (also `--title`, `--body`, `--clear`)
- **Delete**: `gh project item-delete 3 --owner a1exk-dev --id <PVTI_id>`

The project's Status field has exactly three options: `Todo`, `In Progress`, `Done`.

## Public issues / PRs (external surface)

- **Read**: `gh issue view <n> --comments` / `gh pr view <n> --comments`
- **List**: `gh issue list --state open --json number,title,body,labels,comments` / `gh pr list` equivalents
- **Comment / label / close**: `gh issue|pr comment`, `--add-label`/`--remove-label`, `close`

**PRs as a request surface: no.** _(Set to `yes` if external PRs should run through triage as feature requests; `/triage` reads this flag.)_

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42`, falling back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a draft item in the "opencode-skills-autocomplete" project. Never create a public issue for internal work.

## When a skill says "fetch the relevant ticket"

Draft item: `gh project item-list 3 --owner a1exk-dev --format json`, match by title, edit via `--id`. Public issue/PR: `gh issue|pr view <n> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** and **child tickets** are draft items in the project. GitHub sub-issues and native dependencies don't apply to draft items, so edges live in the body:

- **Map**: draft item titled `map: <effort>` holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: draft item whose body starts with `Part of: <map title>`, then a `Type:` line (`research`/`prototype`/`grilling`/`task`) and a `Blocked by: <titles>` line. A ticket is unblocked when every listed ticket is `Done`.
- **Frontier**: open, unblocked children in creation order; first wins.
- **Claim**: set Status to `In Progress` — the session's first write.
- **Resolve**: append the answer under `## Answer` in the item body, set Status to `Done`, and append a context pointer to the map's Decisions-so-far.
