# GitHub workflow

- Use one repository Project. Treat each versioned milestone as a release epic; keep its goal and completion criteria in the milestone description and assign only executable issues to it.
- Treat issue state and labels as authoritative; use the Project for planning and visibility.
- Give every triaged issue exactly one category label, `bug` or `enhancement`, and one state label: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, or `wontfix`.
- Show active work with the issue assignee and its issue-number branch. Keep `ready-for-agent` until the issue closes.
- Close a feature or bug-fix issue only after its verified changes reach `develop`.
- Initialize the GitHub tracker with `setup-matt-pocock-skills`. Use `to-spec`, `to-tickets`, and `triage` for issue content and readiness; use `gh` for Project and milestone operations.
