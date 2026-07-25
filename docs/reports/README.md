# `docs/reports/`

**Historical records. Point-in-time snapshots, not living documentation.**

Each file describes the repository as it stood on the date in its header. They are kept because
the reasoning behind a decision is often more useful than the decision itself — but they are
**not** updated when the code changes, and paths or figures inside them may refer to a layout
that has since moved.

For the current state, read the living docs instead: [`../BUILD.md`](../BUILD.md),
[`../BRAND_GUIDELINES.md`](../BRAND_GUIDELINES.md), [`../ROADMAP.md`](../ROADMAP.md), and the
numbered design docs in [`../`](../).

| Report | Date | Subject |
|---|---|---|
| [`RELEASE_PREPARATION_REPORT.md`](RELEASE_PREPARATION_REPORT.md) | 2026-07-26 | Release pass: de-monetisation, icon integration, theme accessibility, QA. **Start here.** |
| [`PROGRESS.md`](PROGRESS.md) | 2026-07-26 | Phase-by-phase checklist for the above, with every finding's final status |
| [`REMAINING_TASKS.md`](REMAINING_TASKS.md) | 2026-07-21 | Audited gap analysis to v1.0 — the four open blockers live here |
| [`FINAL_AUDIT_REPORT.md`](FINAL_AUDIT_REPORT.md) | 2026-07-21 | Full-repo audit |
| [`FINAL_POLISH_REPORT.md`](FINAL_POLISH_REPORT.md) | 2026-07-21 | Polish pass |
| [`SECURITY_AUDIT_REPORT.md`](SECURITY_AUDIT_REPORT.md) | 2026-07-21 | Sanitizer hardening, filesystem and IPC review |
| [`PERFORMANCE_REPORT.md`](PERFORMANCE_REPORT.md) | 2026-07-21 | Startup, memory and typing-latency measurements |
| [`UI_UX_REFINEMENT_REPORT.md`](UI_UX_REFINEMENT_REPORT.md) | 2026-07-21 | Interface refinement pass |

> `UI_UX_Progress_Report.md` was removed on 2026-07-26. It claimed "6/6 test files, 25/25 unit
> tests" — untrue when written and wildly stale by then (the suite is 14 files / 309 tests) —
> and asserted an Esc-dismissal behaviour that did not exist at the time. A report that is wrong
> is worse than no report.
