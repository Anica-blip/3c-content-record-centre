# ⚙️ SETUP.md
### 3C Content Record Centre — Infrastructure & Repo Setup Guide

This file exists so that infrastructure is prepared **before** any code is written, per our working process: Claude specifies what's needed, Chef provisions it, then code is built against confirmed real values — never placeholders guessed by Claude.

---

## 1. Repository Conventions

These apply across every file in this repo:

- **Language:** British English throughout (no exceptions)
- **Timezone:** Europe/Lisbon (same UTC offset as London, UK)
- **Fonts:** Open Sans or Montserrat
  - Labels: minimum 11px
  - Titles: 32px, neon light purple
  - Subtitles: white
  - Pastel orange `#ffbc66` reserved for specific fonts/symbol accents as shown in the Canva mapping
- **Storage model:** No traditional database. Content records are individual JSON files stored in Cloudflare R2. Supabase is **not** used in this repo.
- **Worker hosting:** The Cloudflare Worker is **not** hosted via GitHub Actions/CI. It is deployed directly from local machine to Cloudflare using the Wrangler CLI, with `wrangler.toml` as the single source of deploy configuration.
- **Symbols:** Use the supplied Canva Create icon set (Close, Go Back, Go Next, Return to Menu, Schedule, Exit, View, Link, Index List, Download, Upload, Edit, Copy, Save, Delete) consistently across every popup, button, and index list row. Keep them small — same size/style across this repo and all sibling repos.
- **Writing areas:** Every text input, textarea, and saved-text display container must wrap long unbroken strings (e.g. URLs) using `overflow-wrap: break-word` + `word-break: break-word`. This is a hard requirement from day one, not a later fix.

---

## 2. Infrastructure Checklist — Cloudflare (Chef to complete)

Confirmed approach: same R2 bucket as `3c-boardroom-hq`, new dedicated folder, new dedicated Worker (one Worker per folder).

- [ ] Confirm the **exact** existing R2 bucket name (currently holds `Caelum/` + its Worker)
- [ ] Inside that bucket, create a new folder: `recordmanagement/`
- [ ] Create a new, separate Cloudflare Worker dedicated to this folder
- [ ] Bind the new Worker to the R2 bucket, scoped to `recordmanagement/`
- [ ] Add a custom domain route: `recordmanagement.threadcommand.center` → new Worker
- [ ] Have your Cloudflare **Account ID** ready (Cloudflare dashboard → right sidebar)

---

## 3. What Claude needs back before drafting `wrangler.toml`

Three exact values — no guessing, no placeholders:

1. The exact R2 bucket name as it appears in your Cloudflare dashboard
2. The name you give the new Worker
3. Your Cloudflare Account ID

Once these three are confirmed, `wrangler.toml` and the Worker script (`worker/index.js`) are the next deliverables.

---

## 4. First files in this repo (this delivery)

- `README.md`
- `SETUP.md` *(this file)*
- `LEGAL_DISCLAIMER.md` — Chef to add, adapted from the `3c-boardroom-hq` template
- `LICENSE` — Chef to add via GitHub's built-in MIT license picker

---

## 5. Build order (once infrastructure is confirmed)

1. `wrangler.toml` + `worker/index.js` — R2 read/write API for JSON records
2. `index.html` — Index List page (search bar, platform banners, record rows)
3. Card 1 — front/label popup
4. Card 2 — content/production panel
5. Card 3 — distribution panel (per-platform JSON)
6. Content ID numbering logic
7. PDF export per card

One file at a time, reviewed before the next begins — no stacking.

---

**3C Thread To Success™**
*Think Smarter, Not Harder — Zero Shortcuts*
