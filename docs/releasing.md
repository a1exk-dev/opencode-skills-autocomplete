# Releasing

Releases are automated with [release-please](https://github.com/googleapis/release-please).
Your part is writing Conventional Commits and reviewing the release PR it
opens. release-please generates the version, the `CHANGELOG.md` entry, the
tag, the GitHub Release, and the npm publication.

## How a release happens

1. Feature and fix work merges into `develop` as Conventional Commits. The
   commit type decides the bump class: `feat` is minor, `fix` is patch, and
   before `1.0.0` a breaking change also bumps minor.
2. A release branch merges into `main`.
3. On the merge, release-please opens a release PR on `main` carrying the next
   version and a generated changelog entry covering every commit since the
   previous tag.
4. Review the release PR. Check that the version fits the changes and that
   the entry is accurate. Fix an inaccurate generated line in the PR before
   merging; take a change off the release branch if it should not ship.
5. Merging the release PR creates the annotated `v<version>` tag, the GitHub
   Release with the entry as its body, and publishes the npm package via OIDC
   trusted publishing.

## Verify a publication

After the release PR merges, check:

- the `v<version>` tag exists on the release merge commit
- the GitHub Release body matches the changelog entry
- the npm package is published at that version
- the tag, the GitHub Release, and `CHANGELOG.md` name the same version

## Rules

- Do not hand-write `CHANGELOG.md`, versions, or tags. Only the release PR
  changes the changelog.
- Do not edit a published changelog entry, tag, or GitHub Release. Correct a
  small error with a note in the next release's entry; cut a patch release
  for an error that could mislead an operator or contributor.
- A change that needs a different bump class gets the right Conventional
  Commit type before it merges into `develop`, not in the release PR.
