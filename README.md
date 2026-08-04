# Photography Shot List — Request Form

A single-page website that replaces the `Photography_Shot_List.xlsm` workbook.
A brand member fills out a fast online form — with **picture thumbnails** for
shot type, angle/view, orientation, intended use, and priority — then clicks
**Download Shot List** and gets a real Excel file (`.xlsx`) laid out like the
original workbook: title bar, project line, section bands, one row per shot.
Uploaded reference images are **embedded inside that same file**, inline
beside their shot, so one attachment carries everything.

Sending is left to the requestor — download the file, then email it to the
photographer however they normally would.

No build step, no server, no external libraries — five static files do
everything, including writing the Excel file in the browser.

## How the form flows

- **Project details** are just three fields: project name, your email, and
  general notes.
- **One card per shot**, kept short: every section sits in its own
  stroked, tinted box. **Shot type and Angle/view are side-by-side**
  (azure / indigo; types grouped into Studio, Lifestyle & In-Use,
  Retail), then orientation / intended use / priority in a row
  (teal / violet / steel), then free-text notes in a two-column grid.
  All tints are low-saturation siblings of the brand blue, defined as
  `--sec-*` variables at the top of `styles.css`.
- **Reference images**: each shot can carry up to 4 uploaded images (auto
  downscaled in the browser); they're embedded in the generated Excel file
  next to the shot. See *Inline reference thumbnails* below.
- **"All uses apply"**: a checkbox above the intended-use tiles ticks all
  four at once. It stays in sync both ways — untick one tile and it clears
  itself; tick the last one by hand and it turns back on.
- **One shot across many SKUs**: a quiet *"This shot applies to multiple
  SKUs"* link under the SKU field swaps it for a paste box — paste a
  column straight out of Excel. See below.
- Clicking **"Next shot"** (or the **Collapse** button in the card header)
  folds the shot into a thin at-a-glance summary bar — so a 20-shot list
  stays scannable instead of becoming one huge scroll. Click any summary
  bar to expand and edit that shot again.

## Inline reference thumbnails

Reference images sit **in the sheet next to their shot**, not on a separate
tab, so nobody has to cross-reference "shot 7" against another sheet while
standing at a light stand.

Three constraints shaped how:

- **Excel has no true in-cell picture.** Images are floating shapes anchored
  to a cell, so they're placed in the **last column** — a wide column there
  never pushes the spec columns off screen, and the photographer scrolls
  right only when they want the reference.
- **Thumbnails land on a shot group's first row only.** A shot covering 75
  SKUs × 3 angles is 225 rows sharing one reference; repeating the picture
  225 times would be unreadable. It appears once, on row `7.1`.
- **Only those rows get taller** (about 120px). Every other row keeps its
  normal height.

Up to 4 thumbnails sit side by side in that cell, each scaled to fit a
108×112 box with aspect ratio preserved. The embedded file is still the full
downscaled original, so clicking a thumbnail and enlarging it in Excel shows
real detail. Sizes are the `THUMB_*` constants at the top of `xlsx.js`.

**Two known limits**, inherent to anchored images rather than to this code:
sorting or filtering the sheet can leave floating pictures misaligned with
their rows, and opening the file in Google Sheets rather than Excel
occasionally floats them loose. Both are the cost of inline placement; a
separate tab avoided them but made the file worse to work from.

## Angles, and the honest image count

**Angle / view is multi-select.** One studio setup routinely yields front,
3/4, side, and top-down of the same product, and forcing four cards for
one setup was busywork.

The guard against ticking everything isn't a rule, it's arithmetic made
visible. **Every card shows what it's actually asking for** — "This card =
375 images (75 SKUs × 5 angles)" — turning amber past 20, and the header
badge totals the whole request ("Total images requested: 380"). SKUs and angles
multiply, so a requestor sees the real cost of a click before the
photographer discovers it in the spreadsheet. Past 4 angles a soft nudge
asks whether they're all needed (`ANGLE_NUDGE_AT` in `app.js`).

The structural guard is that **props, features, and retouching notes are
shared across every angle on a card**. Ticking three angles is a claim
that all three share one styling direction; if they don't, there's
nowhere to say so and the requestor has to split the card. That's what
keeps genuinely different shots apart, rather than restricting which shot
types may hold multiple angles.

## Open stock: one shot, many SKUs

Requestors with 75 open-stock items that all need the same shot shouldn't
have to fill in 75 cards. Clicking **"This shot applies to multiple SKUs"**
turns the SKU field into a paste box that accepts a column copied from
Excel (newlines, commas, tabs, and semicolons all work). It trims blanks,
drops repeats case-insensitively, and shows a running count.

**In the spreadsheet, each finished image gets its own row** so the
photographer has a checklist to work through on set. SKUs and angles
multiply: a shot numbered 7 covering 75 SKUs from 3 angles becomes rows
`7.1` through `7.225`, every spec column identical, with the shared `7.`
prefix keeping the grouping readable. Rows run SKU-major — all of one
product's angles together, which is how a set actually runs. Shots
producing a single image keep a plain integer. Reference-image notes
appear on the group's first row only.

This is deliberately kept as a *secondary* path so single-SKU stays the
default: it's a small text link rather than a button, it isn't mentioned
in the intro copy, and it changes nothing about validation — a 75-SKU card
still can't be submitted without a shot type. The helper text under the
paste box ("different framing needs its own card") is what discourages
lumping unrelated shots together, and past 25 SKUs a soft nudge asks
whether they're really all shot identically. Change `SKU_NUDGE_AT` in
`app.js` to move that threshold.

## Coming back to an unfinished list

Two independent safety nets, neither needing a server:

**Autosave (this browser).** Every edit is saved to IndexedDB about half a
second later, images included. Reopen the form and a banner offers to
*pick up where you left off*. The draft is **never restored silently** —
an opened form is always blank until the requestor chooses, so a shared
computer never shows one person's work to the next. "Discard it" and
"Clear form" both delete the stored copy.

IndexedDB rather than `localStorage` because reference images are big:
`localStorage` tops out near 5 MB, which is about five images, while
IndexedDB stores the image bytes directly (no base64 padding) with a
quota measured in hundreds of MB.

**Draft files (anywhere).** Draft files are versioned; v1 drafts saved
before multi-SKU support still load, with their single SKU migrated into
the new list. **Save draft file** downloads a small `.json`
containing the whole list, images and all; **Load draft file** reads one
back. That's the way to move a half-finished list between computers, or
hand it to a colleague to finish. A one-shot draft with a reference image
runs a few hundred KB. Loading a file that isn't a draft is refused with a
plain-English message rather than a broken form.

Autosave covers "I closed the tab by accident"; draft files cover "I need
to finish this somewhere else."

## Files

| File | What it does |
|---|---|
| `index.html` | The form page |
| `styles.css` | Styling — brand blue plus the cool section palette |
| `config.js` | **The file you edit** — company name, all picker options and their thumbnails |
| `app.js` | Form behavior: shot cards, collapse/expand, image uploads, validation, download |
| `storage.js` | Draft autosave (IndexedDB) and the save/load draft-file format |
| `xlsx.js` | Self-contained `.xlsx` writer (an xlsx is a ZIP of XML — built by hand, no dependencies) |
| `vercel.json` | Hosting config: security headers, no stale caching |

## Things you'll want to change

All in **`config.js`**:

- **Company name** — `companyName` appears in the header and the Excel title.
- **Options** — every shot type / angle / use / priority is an entry in a
  list with a `value`, a `hint` (tooltip), and an inline `svg` thumbnail.
  Shot types live inside `shotTypeGroups`, each group with a `label` and its
  `options`. Add, remove, regroup, or reword entries and the form updates
  automatically.

## Run it locally

Just open `index.html` in a browser — everything works from a `file://` URL.

## Put it online with Vercel (recommended)

The repo is deploy-ready: it's plain static files, so there's **no build
step and no framework** to configure. `vercel.json` sets security headers
and tells browsers to revalidate `.js`/`.css`/`.html` on every load, so an
edit to `config.js` goes live the moment it's redeployed.

**Option A — connect the Git repo (auto-deploys on every push):**

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import this repository. When asked for a **Framework Preset**, choose
   **Other**. Leave Build Command and Output Directory empty — the root
   of the repo *is* the site.
3. Deploy. You'll get a `https://<project>.vercel.app` URL in under a
   minute, and every later push redeploys automatically.

**Option B — no Git needed:** install the CLI with `npm i -g vercel`, run
`vercel` from this folder, and answer the prompts (accept the defaults;
again, no build command). `vercel --prod` publishes to the production URL.

**Custom domain:** Vercel project → **Settings → Domains → Add**, then
point a `CNAME` record at `cname.vercel-dns.com`. Vercel issues the HTTPS
certificate automatically.

Nothing in this app runs on a server and there are no secrets or
environment variables to set — every requestor's data stays in their own
browser until they download their file.

## Or use GitHub Pages (free)

1. Merge this branch to `main` (or use the branch as-is).
2. In the GitHub repo: **Settings → Pages → Source: "Deploy from a branch"**,
   pick the branch and `/ (root)`, save.
3. After a minute the form is live at `https://<user>.github.io/Naturals/`.
   Share that link with brand members.

Any other static host (Netlify, Vercel, an internal web server) also works —
upload the five files, done.

## Notes & current behavior

- **No email step.** The form just produces the file. If you ever want the
  site to send it automatically, that needs a small backend or a form-email
  service (EmailJS / Formspree / similar) — browsers can't attach a file to
  an email on their own. The data object handed to `buildShotListXlsx()`
  is the single thing you'd post to such a service.
- **The form always opens blank**, even when a draft is stored — restoring
  is always an explicit click. See *Coming back to an unfinished list*.
- **Drafts never leave the requestor's machine.** Autosaved lists live in
  their own browser; draft files land in their own Downloads folder. If
  you ever want drafts that sync across devices or shareable resume links,
  that needs a backend — a serverless function plus blob storage — and a
  decision about who may read stored drafts and for how long.
- **Wrike**: as in the original workbook, production status/approvals stay in
  Wrike — this form only creates the request.
