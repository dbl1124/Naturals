# Photography Shot List — Request Form

A single-page website that replaces the `Photography_Shot_List.xlsm` workbook.
A brand member fills out a fast online form — with **picture thumbnails** for
shot type, angle/view, orientation, intended use, and priority — and on submit
the site:

1. **Generates a real Excel file** (`.xlsx`) laid out like the original
   workbook (title bar, project line, section bands, one row per shot), and
   downloads it. Uploaded reference images are **embedded inside the file**
   on a "Reference Images" tab.
2. **Opens a pre-addressed email draft** to the photographer with the project
   summary filled in. The requestor attaches the downloaded file and hits send.

No build step, no server, no external libraries — five static files do
everything, including writing the Excel file in the browser.

## How the form flows

- **Project details** are just three fields: project name, your email, and
  general notes.
- **One card per shot**, kept short: **Shot type and Angle/view sit
  side-by-side** in two color-tinted columns (types grouped into Studio,
  Lifestyle & In-Use, Group & Scale, Retail), orientation / intended use /
  priority right below, and the free-text notes last in a two-column grid.
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
| `styles.css` | Styling (clean neutral + blue accent) |
| `config.js` | **The file you edit** — photographer email, company name, all picker options and their thumbnails |
| `app.js` | Form behavior: shot cards, collapse/expand, validation, draft autosave, download + email draft |
| `xlsx.js` | Self-contained `.xlsx` writer (an xlsx is a ZIP of XML — built by hand, no dependencies) |

## Things you'll want to change

All in **`config.js`**:

- **Photographer's email** — set `photographerEmail` to the real address.
  It's no longer shown on the form; every request is addressed there.
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

- **Email sending**: for security reasons, no website can attach a file to an
  email on your behalf — browsers simply don't allow it. So the flow is
  *download + pre-addressed draft + user attaches*. If you later want true
  auto-send with the file attached, wire `app.js` up to a form-email service
  (e.g. EmailJS / Formspree / a small backend) — the data object handed to
  `buildShotListXlsx()` is the single thing you'd post.
- **The form always opens blank** — nothing is saved between visits, so
  every requestor starts from a clean slate. (If you ever want draft
  autosave back, it existed in an earlier version of `app.js`.)
- **Wrike**: as in the original workbook, production status/approvals stay in
  Wrike — this form only creates the request.
