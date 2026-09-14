# epg-linkedin-company-dashboard

Analytics dashboard for the **Elite Consulting Partners LinkedIn Company Page**
(2,782 followers as of the initial build). This is a **separate product from
Frank LaRosa's personal LinkedIn profile dashboard** (`epg-marketing-dashboard`)
— different LinkedIn export, different audience, different page entirely.

Do not confuse the two:
- `epg-marketing-dashboard` = Frank LaRosa's **personal profile** (Creator Analytics export). Feeds Carla's weekly engagement email and John's report.
- `epg-linkedin-company-dashboard` (this repo) = the **ECP Company Page** (Page Analytics export). No email reports tied to it yet — dashboard only.

## Data source: manual export, not scraping

Same safety decision as the personal dashboard: Pablo does not want any
automated browser/API activity against LinkedIn (risk of a scraping alert on
the account). All data comes from a human-initiated manual export.

**How to export (Pablo does this weekly):**
1. LinkedIn Company Page admin view → Analytics → Content
2. Set the date range to the exact Monday–Sunday week
3. Click Export → downloads an `.xls` workbook
4. The dropdown above the chart (Impressions / Reactions / etc.) does **not**
   matter — the exported workbook always contains every metric on the
   "Metrics" sheet regardless of what's selected on screen.

The export has two sheets:
- **Metrics** — one row per day, full year, columns for organic/sponsored/
  total impressions, clicks, reactions, comments, reposts, engagement rate.
- **All posts** — one row per post (all-time), including full caption text,
  the "Posted by" author, impressions, views, clicks, CTR, likes, comments,
  reposts, follows, engagement rate, content type. Unlike the personal
  profile, captions come **built into the export** — no separate post-preview
  fetch step is needed.

## Weekly update process

1. Pablo drops the new export file into `manual-exports/`.
2. Run:
   ```
   node parse_weekly_export.js manual-exports/<file>.xls <weekStartDate YYYY-MM-DD>
   ```
   This prints JSON with that week's summed metrics, the week's posts sorted
   into `topPosts`, and a per-author breakdown for the week. It does **not**
   touch `src/company-data.json` — review the output first.
3. Manually fold the result into `src/company-data.json`:
   - Append the `weeklyMetricsRow` to `weeklyMetrics`.
   - Merge `authorThisWeek` into the running `authorStats` totals (recompute
     each author's avg engagement / avg impressions across all their posts).
   - Add the week's top posts to `topPostsByWeek`, keyed by the week's ISO
     start date. Keep only the most recent ~12 weeks in this map to keep the
     file size reasonable — older weeks' post detail can be recovered from
     git history if ever needed (same pattern used for the personal dashboard).
   - Bump `updatedAt` and `currentFollowers` / `totalPostsAllTime` if the
     export's totals moved.
4. `npm run build` to confirm no errors.
5. Commit, push, deploy: `npx vercel@latest deploy --prod --yes`.
6. Verify the live URL (`https://epg-linkedin-company-dashboard.vercel.app`)
   matches local before telling Pablo it's done.

**⚠ No scraper exists for this dashboard and none should be built without
Pablo's explicit sign-off.** The manual-export pattern is a deliberate,
requested safety choice — same reasoning as the personal profile dashboard's
paused Playwright scraper.

## Key facts from the initial seed data (Sep 15 2025 – Aug 31 2026, 51 weeks)

- 268 posts all-time across 6 distinct authors.
- Frank LaRosa's own posts as an individual author **underperform** several
  other contributors on the page by both impressions and engagement — this
  was flagged to Pablo as a notable finding, not assumed.
- Organic vs. sponsored is broken out as its own KPI on the dashboard (Pablo
  confirmed this explicitly: "totally").
- Weeks are Monday-start, same convention as every other EPG dashboard.

## Stack

React 19 + Vite 8 + recharts 3.8, same dependency versions and configs as
`epg-google-reviews-dashboard` (copied `vite.config.js`, `eslint.config.js`,
`.gitignore`, `main.jsx`, `index.css` from there). Deploys to Vercel
(`epg-linkedin-company-dashboard` project). Repo:
`github.com/acostapabloEC/epg-linkedin-company-dashboard`. Dev server runs on
port 5187 (`.claude/launch.json` entry: `epg-linkedin-company-dashboard`).

Includes the shared "Elite Tracker" Power Automate visitor-tracking script in
`index.html`, same as sibling dashboards.
