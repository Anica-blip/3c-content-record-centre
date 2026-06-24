# ⚙️ SETUP.md
### 3C Content Record Centre — Infrastructure & Setup Reference

This file tracks real, confirmed infrastructure values and the actual gotchas hit while deploying — so if this project ever needs touching again, none of it has to be rediscovered.

---

## 1. Repository Conventions

- **Language:** British English throughout (no exceptions)
- **Timezone:** Europe/Lisbon (same UTC offset as London, UK)
- **Fonts:** Montserrat (body/UI), Open Sans (fallback)
- **Storage model:** No traditional database. Content records are individual JSON files in Cloudflare R2. Supabase is **not** used in this repo.
- **Worker hosting:** Not via GitHub Actions/CI, not via the Cloudflare dashboard's inline editor. Deployed only via the Wrangler CLI from a local folder, with `wrangler.toml` as the single source of truth.
- **Symbols:** Canva Create icon set, recreated as inline SVG in `js/icons.js`.
- **Writing areas:** Every input/textarea/text-display container wraps long unbroken strings via `overflow-wrap: break-word` + `word-break: break-word`, built in from the start.

---

## 2. Confirmed Infrastructure — Cloudflare ✅

| Item | Value |
|---|---|
| R2 Bucket (shared, existing) | `3c-boardroom-hq` |
| R2 Folder/Prefix (this project) | `records/` |
| R2 Binding name | `RECORDS_BUCKET` |
| Worker name | `3ccontentrecordcentre` |
| Custom Domain | `recordmanagement.threadcommand.center` — attached to the **Worker** |
| Account ID | `5c482ede9d3c6e016b77a9cb86ed3a29` |

## 3. Confirmed Infrastructure — GitHub OAuth App ✅

| Item | Value |
|---|---|
| Application name | `3C Content Record Centre` |
| Homepage URL | `https://recordmanagement.threadcommand.center` |
| Callback URL | `https://recordmanagement.threadcommand.center/auth/callback` |
| Client ID | `Ov23ligayj6Dj10S7kx8` (plain var in `wrangler.toml` — not secret, GitHub shows it openly anyway) |
| Client Secret | Set via `wrangler secret put GITHUB_CLIENT_SECRET` — never in any file |
| Session signing secret | Set via `wrangler secret put SESSION_SECRET` — random string, never in any file |
| Allowed login (single-user gate) | `Anica-blip` only — enforced in `worker/index.js` |

## 4. Wrangler CLI — Local Deploy Setup ✅

- Installed globally: `npm install -g wrangler` (a local/project-scoped install is why `wrangler: command not found` happened the first time — global fixes it permanently)
- Deploy folder: `~/3c-deploy/3c-content-record-centre/`
  - `wrangler.toml` at that folder's root
  - `worker/index.js` inside a `worker/` subfolder there
- Authenticated once via `wrangler login`
- Deploy command, run from inside that folder: `wrangler deploy`
- **Front-end files (HTML/CSS/JS) are never part of this folder** — Wrangler only deploys the Worker; GitHub Pages serves the static site independently

---

## 5. Known Gotchas — Read Before Touching This Again

**Cross-site cookies don't work — and never will, by browser design.**
Originally the session was a cookie set by the Worker (`recordmanagement.threadcommand.center`) and read by the front-end (`anica-blip.github.io`) — two different sites. Firefox's Total Cookie Protection (and Safari's ITP) silently blocks exactly this pattern; the cookie is set but never actually reaches the place trying to read it. No error is thrown — it just quietly never works, which is why this took so long to pin down.

**Fix in place now:** the Worker hands back a signed session token in the URL fragment (`#token=...`) after login. The front-end stores it in `localStorage` and sends it as `Authorization: Bearer <token>` on every API call. No cookie involved in cross-site communication at all. If this project is ever extended, **never reintroduce a cookie for the session** — keep using the bearer token pattern.

**`wrangler.toml` is the full source of truth, not an addition.**
Whatever's written in this file is what Cloudflare ends up with — bindings, vars, all of it. If a variable exists in the dashboard as a different "kind" than it is in this file (e.g. `GITHUB_CLIENT_ID` was once both a dashboard Secret *and* a `wrangler.toml` var at the same time), Wrangler will warn and ask before resolving the conflict — that's what caused the early `client_id=undefined` bug. Keep every value defined in exactly one place going forward: secrets via `wrangler secret put` only, everything else in `wrangler.toml` only.

**Caching, three separate layers, all need clearing independently:**
1. Browser page/asset cache (Firefox, regular "Clear Data")
2. Browser favicon cache specifically (Firefox keeps this separate — a normal cache clear doesn't always touch it)
3. GitHub Pages' own CDN edge cache (separate from both of the above)

**The actual fix for this, built into the code:** every CSS link, JS import, and image reference across the front-end carries a version query string (`?v=3` currently). Whenever a real change is made to any file, **bump the number across every reference at once** — that forces a fresh fetch regardless of what any cache layer thinks it already has. This is now standard practice for this repo, not a one-off patch.

---

## 6. Status — Phase 1

**Engineering: complete.** Login, the three-card system, search/filter, R2 record storage, and PDF export are all functioning end to end.

**Now in progress:** Chef's full visual/styling review, page by page, before final sign-off on Phase 1.

---

## 7. Phase 2 (later) — Connecting Sibling Repos

Not active work yet.

**Content-Schedule-Planner** is the first candidate:
- Currently on its own sub-domain (`planner.3c-public-library.org`) — may move under `threadcommand.center`
- Currently uses single GitHub OAuth + Supabase — whether Supabase stays is an open question pending a direct look at that repo

Order after Planner: `3c-control-center`, then full integration with Caelum AI Agent in `3c-boardroom-hq`.

---

**3C Thread To Success™**
*Think Smarter, Not Harder — Zero Shortcuts*
