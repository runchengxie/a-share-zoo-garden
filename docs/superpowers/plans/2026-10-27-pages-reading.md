# Pages reading and publication consistency

User-approved scope follows the 2026-10-27 Pages audit. Keep reviewed data and research boundaries unchanged.

- Make Cloudflare publication follow successful main-branch daily publication as well as code pushes. Serialize releases and always read main, because a GITHUB_TOKEN data push does not start a new push workflow.
- Format public dates for the selected locale, including dates in the shell and evidence tables. Retain machine dates in JSON.
- Make mobile navigation wrap and reduce oversized introductions without hiding evidence. Explain strict/extended groups and the NAV base date alongside the snapshot.
- Validate workflow triggering, locale date behavior, frontend tests and build, and mobile navigation/evidence access in both languages.
- Commit, open a PR, verify current target checks, then merge and verify both public hosts. Do not recalculate data or change research rules.

Review focus includes invalid/missing dates, failed upstream runs, fork-origin runs, long translated labels, and research proxy warnings remaining visible.
