# File naming — this folder

## Convention

```
YYYY-MM-DD_project_what-it-is_vN.ext
```

- Lowercase only. Hyphens inside a word-group, underscores between groups.
- No spaces, parentheses, `&`, `#`, `%`.
- Date = when the content is FOR (report/design date), not today, unless same.
- `project` = short stable slug reused across related files.
- `what-it-is` = 2–4 words a stranger would understand. Never "final"/"new"/"updated".
- Version only for real revisions: `_v1`, `_v2`.
- Keep the original extension exactly (incl. the full `.dc.html` tail).

## Project slugs in use

| Slug | Covers |
|---|---|
| `rubrik` | Everything for the rubrik. skill-verification platform: brand assets (`logo-*`, `rubi-mascot*`), product screen mocks (`landing-page`, `skill-picker`, `assessment-session`, `public-resume`), and future docs |

## Documented exceptions (never rename)

- `support.js` — imported by every `.dc.html` mock via `<script src>`
- `uploads/*` — hash/timestamp names; app looks them up by exact name
- `.thumbnail/` — app-managed
- `engine/` — source code: files import each other by exact name; `README.md` kept as the standard tooling name; `package.json`/lockfiles/`.env`/config files if added later
- `NAMING.md` — this file

## Renames applied 2026-08-13

All root design mocks renamed to convention; every cross-link between mocks
updated in the same pass (verified: zero stale references, `support.js`
references intact).
