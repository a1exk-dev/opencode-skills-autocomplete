# System design

- Treat evidence-led KISS and YAGNI as equal primary system design heuristics. Implement only what current requirements need.
- Consider SOLID for every system design decision, and prefer composition over inheritance.
- Design functionality and tests around standard usage and feasible failures reachable through production inputs, dependencies, or execution paths. Failures possible only through test-only construction are outside scope.

# Questions

1. Ask one question at a time, and wait for the human response before the next.
2. Quote the real sentence or file the question concerns, and show what each answer option does to it. Put the recommended option first.

# Writing

- Classify text by its primary audience.
- Human-facing text (questions, answers, documentation): Process it with `wait-what`, then `humanizer`.
- Agent-facing text (agent docs, instructions, skills): Write it with `writing-for-agents`.

# Knowledge

- Use root `CONTEXT.md` as the canonical domain glossary. Update it in the same change that introduces or changes a domain term.
- Use root `MEMORY.md` for verified, durable lessons that cannot be inferred cheaply from the repository. Read it before starting work. Update it in the same change as the related work; keep task state, history, and duplicated policy in their existing sources.
- When the human corrects the same behavior a second time, record the correction in root `MEMORY.md` as a lesson.

# Workflow

- Git work: Before creating or integrating a branch, opening a pull request, selecting a version, or creating a tag or release, read and follow `docs/agents/git-workflow.md`.
- Commits: Before creating a commit, merging a pull request, or proposing a commit message, read and follow `docs/agents/commit-policy.md`.
- GitHub planning: Before initializing the tracker or creating, triaging, or updating issues, labels, milestones, Projects, or Project items, read and follow `docs/agents/github-workflow.md`.
- Release documentation: Before preparing, correcting, tagging, or publishing a release, read and follow `docs/agents/changelog.md`.

## Agent skills

### Issue tracker

Internal work items live as draft items in the private "opencode-skills-autocomplete" GitHub project; public Issues/PRs are for external bug reports, proposals, and PRs only. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) on public issues/PRs; internal draft items use the project's Status field. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
