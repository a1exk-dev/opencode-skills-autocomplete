# Reporting bugs

Bug reports are public GitHub issues on
[a1exk-dev/opencode-skills-autocomplete](https://github.com/a1exk-dev/opencode-skills-autocomplete).
Internal work items live in a private tracker and are not part of the public
issue surface.

## Filing a report

Open an issue with the
[bug report template](https://github.com/a1exk-dev/opencode-skills-autocomplete/issues/new?template=bug-report.yml).
It asks for:

- what you expected and what you got instead
- the exact steps to reproduce, including the `plugin` entry from your
  opencode config if the plugin is involved
- the opencode version, from `opencode --version`
- the version of the plugin in use

For chord problems, include the `hotkey` value you configured. Collision and
invalid-key warnings name the key in the toast message, so quote the message
you saw.

## Triage

Every new issue starts with the `needs-triage` label. The maintainer moves it
to one of:

- `needs-info`: the report is missing details and stays open while waiting on
  you
- `ready-for-agent`: fully specified, queued for automated implementation
- `ready-for-human`: queued for a human implementer
- `wontfix`: will not be actioned

Keep the issue about the observable behavior. If a fix lands, the issue
closes when the change reaches `develop`.
