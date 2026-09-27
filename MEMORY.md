# Memory

## Editing draft items in the private project

- Body/title edits need the draft issue's **content** ID (`DI_...`), not the project item ID: `gh project item-edit 3 --owner a1exk-dev --id DI_... --body "..."`. The `DI_` ID is in `content.id` of `gh project item-list 3 --owner a1exk-dev --format json`.
- This environment's gh (2.101.0) rejects `--owner a1exk-dev` with "unknown owner type" on `gh project` calls; use `--owner "@me"` instead (verified 2026-09-27).
- `--field` cannot be combined with `--id`; Status (single-select) is set via node IDs: `gh project item-edit --id PVTI_... --field-id PVTSSF_lAHOANlzg84Bky-JzhjiP-Y --project-id PVT_kwHOANlzg84Bky-J --single-select-option-id <option-id>`. Option IDs as of 2026-09-27: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Re-resolve if a call errors.
- Field and option IDs resolve via GraphQL: `gh api graphql -f query='{ user(login:"a1exk-dev") { projectV2(number:3) { fields(first:20) { nodes { ... on ProjectV2Field { id name dataType } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'` (this environment's schema has no `ProjectV2CustomField` type, so do not fragment on it).

## Build branch state

- Maintainer policy (2026-09-27): merge completed, CI-green ticket work into `develop` per ticket, then branch the next ticket from `develop`. First execution: PR #1 (squash) → `develop` at `c319b9f`. Per ticket: work on `feature/<ticket-slug>` off `develop`, push, PR to `develop`, squash-merge once the CI `check` job is green, then move on.
- Branch protection: ruleset `protect-branches` (id 24085471) covers `main` + `develop`: pull request required (0 approvals), status check `check` required, administrators included, merge and square-merge methods only. Direct pushes to `main`/`develop` are rejected; prefer the PR path for everything.

## Release infrastructure (2026-09-28)

- No release-please: its first run computed 1.0.0 (we need 0.1.0) and its release PR is blocked by the repo's "GitHub Actions is not permitted to create pull requests" setting, which we are not changing. The current process is documented in `docs/agents/changelog.md` (agent) and `docs/releasing.md` (human).
- npm OIDC trusted publisher shape: org `a1exk-dev`, repo `opencode-skills-autocomplete`, workflow `.github/workflows/release.yml`, `npm publish` allowed (audience `project:a1exk-dev:opencode-skills-autocomplete`). The npm name is claimed by a one-off `0.0.0` publish.
