# Memory

## Editing draft items in the private project

- Body/title edits need the draft issue's **content** ID (`DI_...`), not the project item ID: `gh project item-edit 3 --owner a1exk-dev --id DI_... --body "..."`. The `DI_` ID is in `content.id` of `gh project item-list 3 --owner a1exk-dev --format json`.
- `--field` cannot be combined with `--id`; Status (single-select) is set via node IDs: `gh project item-edit --id PVTI_... --field-id PVTSSF_lAHOANlzg84Bky-JzhjiP-Y --project-id PVT_kwHOANlzg84Bky-J --single-select-option-id <option-id>`. Option IDs as of 2026-09-27: Todo `f75ad846`, In Progress `47fc9ee4`, Done `98236657`. Re-resolve if a call errors.
- Field and option IDs resolve via GraphQL: `gh api graphql -f query='{ user(login:"a1exk-dev") { projectV2(number:3) { fields(first:20) { nodes { ... on ProjectV2Field { id name dataType } ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'` (this environment's schema has no `ProjectV2CustomField` type, so do not fragment on it).

## Build branch state

- `develop` does not carry the scaffold or later ticket commits; the maintainer directs work to be committed to the current feature branch (`feature/scaffold-project-base`), not merged to `develop` by the agent. Branch topology diverges from `docs/agents/git-workflow.md` until the maintainer syncs it.
