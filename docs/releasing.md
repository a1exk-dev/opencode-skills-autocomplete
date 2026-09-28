# Releasing

A release is prepared on its release branch. The branch carries the version
in `package.json` and the `CHANGELOG.md` entry. Your part is writing
Conventional Commits, running the prepare script on the branch, and
reviewing and merging the branch's pull request into `main`. After the
merge, the workflow tags the commit, creates the GitHub Release, publishes
the npm package, and checks that the records agree.

## How a release happens

1. Feature and fix work merges into `develop` as Conventional Commits. The
   commit type decides the bump class: `feat` is minor, `fix` is patch, and
   before `1.0.0` a breaking change also bumps minor.
2. Cut a `release/<version>` branch from `develop` and run
   `bun run release:prepare <version>` on it. The script sets the
   `package.json` version and writes the `CHANGELOG.md` entry from commits
   since the last changelog change on `develop`. It lists `feat` subjects
   under Features and `fix` subjects under Bug Fixes.
3. Open the pull request from the branch into `main` and review it. Check
   that the version fits the changes and that every changelog line is
   accurate. This review is the human gate.
4. Merge the pull request with a merge commit, no fast-forward.
5. On the merge, the workflow on `main` compares the version with the
   latest `v*` tag. If they match, it stops. Otherwise it tags the merge
   commit as `v<version>`, creates the GitHub Release with the changelog
   entry as its body, publishes the npm package via OIDC trusted
   publishing, and runs the publication checks. The workflow fails if any
   check disagrees.

## Verify a publication

After the merge, check:

- the `v<version>` tag exists on the release merge commit
- the GitHub Release body matches the changelog entry
- the npm package is published at that version
- the tag, the GitHub Release, and `CHANGELOG.md` name the same version

## Rules

- The release branch is the only place that changes the `package.json`
  version or `CHANGELOG.md`. Run the prepare script; do not hand-write the
  entry.
- Do not edit a published changelog entry, tag, or GitHub Release. Correct
  a small error with a note in the next release's entry; cut a patch
  release for an error that could mislead an operator or contributor.
- A change that needs a different bump class gets the right Conventional
  Commit type before it merges into `develop`, not in the release pull
  request.
