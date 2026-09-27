# Contributing

Bug reports and proposals go through public issues; see
[docs/bug-reporting.md](docs/bug-reporting.md). This file covers code
changes.

## Development setup

[docs/development.md](docs/development.md) has the setup steps, the scripts,
and how the tests are organized. In short: install with `bun install`, and
keep the four gates green (`bun run check`, `bun run typecheck`,
`bun run test`, `bun run spell`); CI runs them on every pull request.

## Branching and commits

- Branch from `develop` and open a pull request to `develop`. Merges to
  `main` happen only through release and hotfix branches.
- Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/).
  The commit type decides the next version bump: `feat` is minor, `fix` is
  patch.

## Releases

Releases are automated with release-please; see
[docs/releasing.md](docs/releasing.md).

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
