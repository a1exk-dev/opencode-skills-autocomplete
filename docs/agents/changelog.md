# Changelog and releases

Use this process when cutting a release, when correcting published release documentation, or when verifying a publication.

A release is self-contained on its branch: the branch carries the version in `package.json` and the `CHANGELOG.md` entry, both written by the preparation script. The human gate is the review of the release branch's pull request into `main`. The workflow on `main` is deterministic and does only re-check, tag, release, publish, and verify.

## How a release happens

1. Work merges into `develop` as Conventional Commits per [commit-policy.md](commit-policy.md). The commit type decides the bump class: `feat` is minor, `fix` is patch, and before `1.0.0` a breaking change also bumps minor, per [git-workflow.md](git-workflow.md).
2. Cut a `release/<version>` branch from `develop` per [git-workflow.md](git-workflow.md). On the branch run `bun run release:prepare <version>` (e.g. `bun run release:prepare 0.1.0`). The script sets the `package.json` version and prepends a `## <version> (<date>)` section to root `CHANGELOG.md`, built from the Conventional Commits since the last commit that changed `CHANGELOG.md` on this branch: `feat` subjects under `### Features`, `fix` subjects under `### Bug Fixes`, everything else omitted. This boundary works when the latest `v*` tag is on a squash commit outside `develop`'s history. A squash release merged back into `develop` still leaves earlier `develop` commits in that range, so the script skips any commit whose description already appears as a line in `CHANGELOG.md`. Do not hand-edit the generated entry; change the commit type before a commit merges into `develop`, not after.
3. Review the release branch's pull request into `main`: the version fits the pre-1.0 rule in [git-workflow.md](git-workflow.md) and every changelog line is accurate and understandable to an operator or contributor. This review is the human gate.
4. Merge the pull request with a merge commit, no fast-forward. The push to `main` runs the release workflow.
5. The workflow compares the `package.json` version with the latest `v*` tag: equal means already released, and it stops. Otherwise it verifies `CHANGELOG.md` names the version, tags the merge commit as `v<version>`, creates the GitHub Release with the changelog section as its body, builds and publishes to npm via OIDC trusted publishing, and runs the publication checks below, failing the workflow if any disagree.

The release is ready only when the pull request is merged and every publication check below passes.

## Rules

- Root `CHANGELOG.md` on `main` is the canonical release record. A GitHub Release copies the matching entry; it is not a separate editorial source.
- Feature and bug-fix work never touches `CHANGELOG.md` or the `package.json` version. Only the release branch changes them, through the preparation script.
- The bump class is decided by commit types, so a change that needs a different bump gets the right Conventional Commit type before it merges into `develop`, not in the release pull request.
- A published record is final: edit a changelog entry, tag, or GitHub Release only by cutting the next release. Correct a small error with a note in the next release's entry; prepare a patch release for an error that could cause an operator or contributor to act incorrectly.

## Verify a publication

After the release pull request merges, check:

- the `v<version>` tag exists on the release merge commit;
- the GitHub Release body matches the changelog entry;
- the npm package is published at that version;
- the tag, the GitHub Release, and `CHANGELOG.md` all name the same version.

A publication failure blocks the next pull request into `main` until the records match.
