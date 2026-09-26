# Changelog and release notes

Use this process when a pull request will merge into `main`, when correcting published release documentation, or when creating an annotated version tag or GitHub Release.

Root `CHANGELOG.md` on `main` is the canonical release record. A GitHub Release copies the completed changelog entry. It is not a separate editorial source.

Only the release or hotfix branch that will merge into `main` edits `CHANGELOG.md`. Feature and bug-fix work leaves it unchanged.

## Prepare a candidate

1. Follow [`git-workflow.md`](git-workflow.md) for version, tag, and back-merge rules. A pull request into `main` is a release and requires a new version.
2. Check the source branch. A release uses `release/<version>`, where `<version>` is a new stable Semantic Version. Its matching version milestone must exist and all required issues must be closed. A hotfix uses `hotfix/<issue-number>` and the next patch version after the latest annotated tag; it does not need a version milestone.
3. Choose the release date in UTC. The changelog date, annotated tag date, and GitHub Release publication date must match.
4. Build the release inventory. For a release branch, start with its version milestone. For a release or hotfix branch, reconcile every merged pull request and direct commit from the previous annotated version tag through the candidate head. When no annotated version tag exists, the range starts at the first repository commit; `v0.1.0` used that rule because the earlier `release/0.0.0` merge left no tag.
5. Add the reconciliation ledger to the release pull request body. Account for each inventory item exactly once as included, combined into another entry, or omitted with a reason. Keep this evidence out of the changelog and GitHub Release.
6. Add exactly one completed version entry to root `CHANGELOG.md` under [Common Changelog](https://common-changelog.org/). The new entry version must match a release branch version or the hotfix's next patch version. Describe effects that a Host Project operator or contributor needs to understand, can observe, or must act on. Remove noise, combine related work, omit changes that cancel before release, and use the best starting reference.
7. Run `bun run check` and every configured release-documentation check. Resolve objective failures before asking for review. Treat automated prose advice as non-blocking review input.
8. Ask the repository owner to review the final candidate head. Any later commit invalidates approval and requires another owner review.

The candidate is ready only when the ledger covers its complete inventory, the changelog passes the objective rules below, and the repository owner accepts the editorial choices and final head.

## Reconciliation ledger

Use this structure in the release pull request body. A hotfix omits the milestone table.

```markdown
## Release reconciliation

- Version: `<version>`
- Milestone: `<link>`
- Range: `<previous-tag>..<candidate-head>`

### Milestone items

| Item | Disposition | Changelog entry or reason |
| --- | --- | --- |
| `<issue link>` | `included`, `combined`, or `omitted` | `<entry text, related row, or reason>` |

### Merged pull requests

| Pull request | Disposition | Changelog entry or reason |
| --- | --- | --- |
| `<pull request link>` | `included`, `combined`, or `omitted` | `<entry text, related row, or reason>` |

### Direct commits

| Commit | Disposition | Changelog entry or reason |
| --- | --- | --- |
| `<commit link>` | `included`, `combined`, or `omitted` | `<entry text, related row, or reason>` |
```

The ledger must not omit or duplicate an item from its source lists. Rows for an issue and the pull request that closed it can point to the same changelog entry; each source item still gets one row.

## Changelog rules

- Name the file `CHANGELOG.md` and start it with `# Changelog`.
- Do not add an `Unreleased` section.
- Add exactly one new stable Semantic Version entry for each candidate and sort all versions in descending Semantic Version order.
- Write the heading as `## [VERSION] - YYYY-MM-DD`, without a `v` prefix. Add a reference-style version link to the matching GitHub Release.
- After the heading, use one single-sentence notice, change groups, or a notice followed by change groups. Use a notice when a first release has no changes to list.
- Use only `Changed`, `Added`, `Removed`, and `Fixed` groups, in that order. Each group contains only an unnumbered list.
- Start each change with an imperative, present-tense verb. Make it understandable without its group heading and keep it on one line.
- Put breaking entries first in their group and prefix them with `**Breaking:**`.
- Put every reference after the change, on the same line, in parentheses. Link relevant commits and, when available, the best issue or pull request starting point.
- Order non-breaking entries by importance, then latest first.

A candidate may also correct a historical entry when its ledger identifies the correction and reason. Every already-published entry must otherwise match its GitHub Release.

## Owner review

The repository owner decides whether:

- the version and breaking-change treatment fit the release;
- each entry is notable to a Host Project operator or contributor;
- entries are accurate, self-contained, well written, grouped correctly, and ordered by importance;
- every included, combined, omitted, cancelled, or corrected item has the right treatment;
- each entry uses the most useful reference.

Automation can enforce structure and equality. It does not decide prose quality, importance, audience impact, or factual correctness.

## Publish the release

After the approved pull request merges into `main`:

1. Create the unique annotated `v<version>` tag on the release merge commit. Keep the published tag unchanged.
2. Create the GitHub Release for that tag on the changelog's UTC date.
3. Copy only the notice and change groups below the matching changelog heading into the GitHub Release body. Do not add the heading, generated notes, a compare summary, or separate prose.
4. Verify that the tag version and UTC date match the changelog, the changelog version link resolves to the GitHub Release, and the release body exactly matches the canonical entry.
5. Verify that every historical GitHub Release still matches its changelog entry.

The release is complete only after all publication checks pass. A publication failure blocks the next pull request into `main` until the records match.

## Correct a published entry

Keep every published tag unchanged.

- Wait for the next release to fix a small spelling, wording, or factual error that cannot cause incorrect action. Declare the correction and reason in that release's ledger, then apply it to the historical changelog entry and matching GitHub Release.
- Prepare a patch release for a material error that could cause a Host Project operator or contributor to act incorrectly. Explain the correction in the new release entry. The same release may correct the historical changelog entry and matching GitHub Release when its ledger declares the change.

No correction merges into `main` outside a release.
