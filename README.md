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
  (azure / indigo; types grouped into Studio, Lifestyle & In-Use, Group &
  Scale, Retail), then orientation / intended use / priority in a row
  (teal / violet / steel), then free-text notes in a two-column grid.
  All tints are low-saturation siblings of the brand blue, defined as
  `--sec-*` variables at the top of `styles.css`.
- **Reference images**: each shot can carry up to 4 uploaded images (auto
  downscaled in the browser); they're embedded in the generated Excel file.
- Clicking **"Next shot"** (or the **Collapse** button in the card header)
  folds the shot into a thin at-a-glance summary bar — so a 20-shot list
  stays scannable instead of becoming one huge scroll. Click any summary
  bar to expand and edit that shot again.

## Files

| File | What it does |
|---|---|
| `index.html` | The form page |
| `styles.css` | Styling — brand blue plus the cool section palette |
| `config.js` | **The file you edit** — company name, all picker options and their thumbnails |
| `app.js` | Form behavior: shot cards, collapse/expand, image uploads, validation, download |
| `xlsx.js` | Self-contained `.xlsx` writer (an xlsx is a ZIP of XML — built by hand, no dependencies) |

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

## Put it online with GitHub Pages (free)

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
- **The form always opens blank** — nothing is saved between visits, so
  every requestor starts from a clean slate. (If you ever want draft
  autosave back, it existed in an earlier version of `app.js`.)
- **Wrike**: as in the original workbook, production status/approvals stay in
  Wrike — this form only creates the request.
