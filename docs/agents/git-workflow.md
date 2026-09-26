# Git workflow

## Branches

- Use lean GitFlow with permanent `main` and `develop` branches.
- Name temporary branches `feature/<issue-number>`, `bugfix/<issue-number>`, `hotfix/<issue-number>`, or `release/<version>`.
- Branch features and bug fixes from `develop`, then squash them into `develop` through a pull request.
- Branch releases from `develop` and hotfixes from `main`. Merge them with no fast-forward into `main`, then back into `develop`, through pull requests.
- Assign an issue before starting its branch.

## Releases

- Version the repository as one product using [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
- Make `v0.1.0` the first release after the project has a minimally usable baseline. Before `1.0.0`, increment patch for fixes and minor for features or breaking changes; release `1.0.0` only after an explicit stability decision.
- Use annotated `v<version>` tags on `main` as the canonical version source.
- Create a release branch after every required milestone issue is closed and `develop` meets the milestone completion criteria. Limit the branch to release preparation and fixes found during verification.
