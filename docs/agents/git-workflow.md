# Git workflow

## Branches

- Use lean GitFlow with permanent `main` and `develop` branches.
- Name temporary branches `feature/<issue-number>`, `bugfix/<issue-number>`, `hotfix/<issue-number>`, or `release/<version>`.
- Branch features and bug fixes from `develop`, then squash them into `develop` through a pull request.
- Branch releases from `develop` and hotfixes from `main`. Merge them with no fast-forward into `main`, then back into `develop`, through pull requests.
- Assign an issue before starting its branch.

## Releases

- Version the repository as one product using [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html): a bug fix bumps patch, a feature bumps minor, and a breaking change bumps major.
- Treat the `1.x` line as bug-fix-only: it runs `1.0.0`, `1.0.1`, `1.0.2` and never reaches `1.1.0`. A `feat` commit on a `1.x` release or hotfix branch is a policy error, and a `feat` merged into `develop` after `1.0.0` commits the next release to `2.0.0`. Read [the 1.x bug-fix-only ADR](../adr/0001-opencode-1x-is-bug-fix-only.md) for the reasoning.
- Use annotated `v<version>` tags on `main` as the canonical version source.
- Create a release branch after every required milestone issue is closed and `develop` meets the milestone completion criteria. Limit the branch to release preparation and fixes found during verification.
