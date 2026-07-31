# Support

## Before opening an issue

Most questions are answered in the docs:

| Question | Where |
|---|---|
| How do I install it? Why does SmartScreen warn me? | [docs/INSTALL.md](docs/INSTALL.md) |
| What's in this release? What isn't? | [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) |
| How do I build from source? | [docs/BUILD.md](docs/BUILD.md) |
| Why is startup ~1.5 s? | [docs/reports/STARTUP_PERFORMANCE.md](docs/reports/STARTUP_PERFORMANCE.md) |
| What's planned next? | [docs/ROADMAP.md](docs/ROADMAP.md) |

## Known limitations

These are already known — no need to report them:

- **The installer is unsigned**, so Windows SmartScreen warns on download.
- **Cold start is ~1.5 s.** About 1 s of that is WebView2 initialising before any app code runs.
- **Windows only.** No macOS or Linux build exists yet.
- Math (KaTeX), Mermaid, GitHub callouts, emoji shortcodes, `[TOC]`, PDF export, auto-save and
  crash-draft recovery are **not implemented**.

The full list is in the [release notes](docs/RELEASE_NOTES.md#known-limitations).

## Reporting a bug

Open a [bug report](https://github.com/sosakib/NotepadSuperPlus/issues/new?template=bug_report.yml).

The single most useful thing you can include is **a document that reproduces it**. Markdown bugs
are almost always about specific input, and a three-line file that misrenders is worth more than
a paragraph of description.

Also helpful: your Windows version, the app version (Settings → About), and whether the file was
UTF-8 or UTF-16, LF or CRLF (shown in the status bar).

## Requesting a feature

Open a [feature request](https://github.com/sosakib/NotepadSuperPlus/issues/new?template=feature_request.yml).

This project is deliberately narrow: it edits and previews Markdown. Requests that make it a
note-taking system, a wiki, or a knowledge graph will likely be declined — not because they are
bad ideas, but because they are a different product. [docs/00_Project_Vision.md](docs/00_Project_Vision.md)
explains the boundary.

## Security

**Do not open a public issue for a security problem.** See [SECURITY.md](SECURITY.md) for the
private reporting route.

## Questions and ideas

[GitHub Discussions](https://github.com/sosakib/NotepadSuperPlus/discussions) for anything that
isn't a bug or a concrete feature request.

## Response times

This is a volunteer-maintained project with no company behind it and no support contract. Issues
are read, but there is no guaranteed response time. Pull requests generally move faster than
requests — see [CONTRIBUTING.md](CONTRIBUTING.md).
