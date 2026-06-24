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

**The actual fix for this, built into the code:** every CSS link, JS import, and image reference across the front-end carries a version query string (e.g. `?v=8`). Whenever a real change is made to any file, **bump the number across every reference at once** — that forces a fresh fetch regardless of what any cache layer thinks it already has. This is now standard practice for this repo, not a one-off patch.

---

## 6. Data Model — Shared Record, Per-Platform Numbering

One JSON record can be filed under several platforms at once, without ever duplicating the file or overriding another platform's work:

```
{
  id: "TG-SV-FL-06-2026-0150",        // storage key — based on the "home" platform
  category, title, persona, date, time, format, playlist, index,   // shared across all platforms
  platforms: ["Telegram", "TikTok"],
  sequences: { Telegram: 150, TikTok: 55, YouTube: null, Pinterest: null },
  content: { notes, references },      // shared (Card 2) — same content regardless of platform
  distribution: {                      // per-platform (Card 3)
    Telegram: { title, description, hashtags, tags, cta, keywords, platformNotes },
    TikTok:   { title, description, hashtags, tags, cta, keywords, platformNotes }
  },
  created, updated
}
```

**Rules that must never break:**
- Adding a platform never reassigns or touches another platform's `sequences` value.
- Nothing persists to storage until Card 1's Close or Card 3's Save — Next/Back between cards is in-memory only.
- Removing a platform (via the index list's delete flow) only ever clears that platform's own `sequences` and `distribution` entries — every other platform's data is untouched. "Delete entire record" is always a deliberate second choice, never the default.
- `platformNotes` (bottom of each Card 3 tab) is the general-purpose escape hatch for any platform-specific tweak that isn't one of the standard distribution fields — Card 1 and Card 2 stay shared/singular, this is where a platform-specific deviation gets noted instead.

---

## 7. Status — Phase 1

**Engineering: complete**, including the shared-record multi-platform rebuild above. Login, the three-card system, search/filter, R2 record storage, PDF export, and independent per-platform numbering are all functioning end to end.

**Now in progress:** Chef loading in existing real cards to stress-test the shared-platform and delete behaviour live, plus a final watermark/styling pass.

---

## 8. Phase 2 — Content Schedule Planner Integration

Spec captured now, ahead of actually starting the build, so nothing gets lost between now and then.

**Planner stays an independent repo** — its own domain, its own Supabase project, its own OAuth. Not merging into this repo. The connection is a bridge, not a migration.

**Bridge mechanism (still open, not yet decided):** a Worker receives the "scheduled" card from this repo. Simplest version: this same Worker (`3ccontentrecordcentre`) sends the card directly to the Planner's own backend when Schedule is pressed. Final call on exact mechanism (push from here vs. Planner polling vs. something else) once both repos are actually in front of us together.

**Calendar event card spec, on the Planner side:**
- Button title = `category`
- Button colour = format colour (already matching exactly: SV `#5e17eb`, LV `#ffbc66`, PC `#03e493`)
- Card shows: format, day, date + time, platform, and a way through to view Card 1
- Same Canva Create symbol set carries over, for visual consistency between the two repos

**Manual entry stays — this is important, not a regression.** The Planner already supports adding content manually for things that live outside the 3C ecosystem entirely, and that freedom must remain. The only requirement: manually-added content should be styled to match this repo's platform/format conventions (e.g. filed under a platform like TG, coloured per format) so everything sits visually consistent on the calendar — ecosystem-sourced and manually-added cards should look like they belong to the same system, even though only one of them is.

Order after Planner: `3c-control-center`, then full integration with Caelum AI Agent in `3c-boardroom-hq`.

---

**3C Thread To Success™**
*Think Smarter, Not Harder — Zero Shortcuts*
