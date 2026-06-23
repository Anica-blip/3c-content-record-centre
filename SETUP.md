# ⚙️ SETUP.md
### 3C Content Record Centre — Infrastructure & Repo Setup Guide

This file tracks real, confirmed infrastructure values as they're locked in — never placeholders. Updated as Phase 1 deployment progresses.

---

## 1. Repository Conventions

These apply across every file in this repo:

- **Language:** British English throughout (no exceptions)
- **Timezone:** Europe/Lisbon (same UTC offset as London, UK)
- **Fonts:** Montserrat (body/UI), Open Sans (fallback)
  - Labels: minimum 11px
  - Titles: 32px, neon light purple
  - Subtitles: white
  - Pastel orange `#ffbc66` reserved for format/symbol accents
- **Storage model:** No traditional database. Content records are individual JSON files in Cloudflare R2. Supabase is **not** used in this repo.
- **Worker hosting:** Not via GitHub Actions/CI. Deployed directly from local machine using the Wrangler CLI, with `wrangler.toml` as the single source of deploy configuration.
- **Symbols:** Canva Create icon set (Close, Back, Next, Return to Menu, Schedule, Exit, View, Link, Index List, Download, Upload, Edit, Copy, Save, Delete) — recreated as inline SVG in `js/icons.js`, consistent size/style throughout.
- **Writing areas:** Every text input, textarea, and saved-text display container wraps long unbroken strings (e.g. URLs) via `overflow-wrap: break-word` + `word-break: break-word`. Built in from the first line of CSS, not a later fix.

---

## 2. Confirmed Infrastructure — Cloudflare ✅

| Item | Value |
|---|---|
| R2 Bucket (shared, existing) | `3c-boardroom-hq` |
| R2 Folder/Prefix (this project) | `records/` |
| R2 Binding name | `RECORDS_BUCKET` |
| Worker name | `recordmanagement` |
| Custom Domain | `recordmanagement.threadcommand.center` — attached to the **Worker** (moved off the bucket) |
| Account ID | `5c482ede9d3c6e016b77a9cb86ed3a29` |

---

## 3. Confirmed Infrastructure — GitHub OAuth App ✅

| Item | Value |
|---|---|
| Application name | `3C Content Record Centre` |
| Homepage URL | `https://recordmanagement.threadcommand.center` |
| Authorization callback URL | `https://recordmanagement.threadcommand.center/auth/callback` |
| Client ID | `Ov23ligayj6Dj10S7kx8` |
| Client Secret | Set directly via `wrangler secret put` — never stored in any file or chat |
| Allowed login (single-user gate) | `Anica-blip` only — enforced in `worker/index.js` |

---

## 4. Repo Files — Status

All delivered and copied into `github.com/Anica-blip/3c-content-record-centre`:

- `css/style.css`
- `js/` — `numbering.js`, `auth.js`, `api.js`, `icons.js`, `card-1.js`, `card-2.js`, `card-3.js`, `pdf-export.js`, `index-list.js`
- `login.html`, `index.html`
- `wrangler.toml`
- `worker/index.js`
- `README.md`, `SETUP.md` *(this file)*, `LEGAL_DISCLAIMER.md`, `LICENSE`

---

## 5. Deployment — Remaining Steps

- [ ] Set the two Worker secrets:
  ```
  wrangler secret put GITHUB_CLIENT_SECRET
  wrangler secret put SESSION_SECRET
  ```
- [ ] `wrangler deploy`
- [ ] Enable **GitHub Pages** for this repo (Settings → Pages → deploy from `main`)
- [ ] Confirm the exact Pages URL it gives you, and report back — `wrangler.toml`'s `ALLOWED_ORIGIN` and `FRONTEND_URL` are currently assumed as `https://anica-blip.github.io/3c-content-record-centre/...` and need correcting if that's wrong
- [ ] Test the full flow: `login.html` → GitHub Access Connection → lands logged in on `index.html`
- [ ] Test styling pass first (Chef), then engineering/functional pass

---

## 6. Phase 2 (later) — Connecting Sibling Repos

Not active work yet — flagged here so it isn't lost once Phase 1 testing is done.

**Content-Schedule-Planner** is the first candidate to connect:
- Currently lives on its own sub-domain (`planner.3c-public-library.org`), which may move under `threadcommand.center` to sit alongside this repo
- Currently uses single GitHub OAuth + Supabase — open question on whether Supabase stays or gets replaced, pending a look at the actual repo
- Decision deferred until Claude has reviewed that repo directly

Order after Planner: 3c-control-center, then full integration with Caelum AI Agent in `3c-boardroom-hq`.

---

**3C Thread To Success™**
*Think Smarter, Not Harder — Zero Shortcuts*
