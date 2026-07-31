# Photography Shot List — Request Form

A single-page website that replaces the `Photography_Shot_List.xlsm` workbook.
A brand member fills out a fast online form — with **picture thumbnails** for
shot type, angle/view, orientation, intended use, and priority — then clicks
**Download Shot List** and gets a real Excel file (`.xlsx`) laid out like the
original workbook: title bar, project line, section bands, one row per shot.
Uploaded reference images are **embedded inside that same file** on a
"Reference Images" tab, so one attachment carries everything.

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
  downscaled in the browser); they're embedded in the generated Excel file.
- Clicking **"Next shot"** (or the **Collapse** button in the card header)
  folds the shot into a thin at-a-glance summary bar — so a 20-shot list
  stays scannable instead of becoming one huge scroll. Click any summary
  bar to expand and edit that shot again.

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

**Draft files (anywhere).** **Save draft file** downloads a small `.json`
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
