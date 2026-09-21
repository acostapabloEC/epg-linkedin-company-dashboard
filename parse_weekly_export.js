/**
 * parse_weekly_export.js
 * Parses one week's LinkedIn Company Page export (Metrics + All posts sheets)
 * into the shape needed to update src/company-data.json.
 *
 * Usage: node parse_weekly_export.js <path-to-.xls> <weekStartDate YYYY-MM-DD>
 * Example: node parse_weekly_export.js manual-exports/elite-consulting-partners_content_XXXX.xls 2026-09-14
 *
 * Export it from: LinkedIn Company Page -> Analytics -> Content -> set the
 * date range to the exact Monday-Sunday week -> Export. The dropdown above
 * the chart (Impressions/Reactions/etc.) doesn't matter -- the export always
 * contains every metric regardless of what's selected on screen.
 *
 * This script only prints JSON -- it does not touch company-data.json itself.
 * Review the output, then fold it into src/company-data.json by hand (append
 * to weeklyMetrics, merge into authorStats, add to topPostsByWeek) the same
 * way epg-marketing-dashboard's weekly updates work.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [, , filePath, weekStart] = process.argv;
if (!filePath || !weekStart) {
  console.error('Usage: node parse_weekly_export.js <path-to-xls> <weekStartDate YYYY-MM-DD>');
  process.exit(1);
}
const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`ERROR: file not found: ${resolvedPath}`);
  process.exit(1);
}

function parseUS(dateStr) {
  const [mm, dd, yyyy] = dateStr.split('/');
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), 12);
}
function iso(d) { return d.toISOString().slice(0, 10); }

async function main() {
  const XLSX = await import('xlsx').then(m => m.default || m);
  const wb = XLSX.readFile(resolvedPath);

  const weekStartD = new Date(weekStart + 'T12:00:00');
  const weekEndD = new Date(weekStartD.getTime() + 6 * 864e5);

  // --- Weekly metrics (sum the Metrics sheet's daily rows for this week) ---
  const metricsRows = XLSX.utils.sheet_to_json(wb.Sheets['Metrics'], { header: 1, raw: false }).slice(2);
  const week = {
    week: weekStart,
    impressionsOrganic: 0, impressionsSponsored: 0, impressions: 0,
    clicks: 0, reactions: 0, comments: 0, reposts: 0,
  };
  let daysFound = 0;
  for (const r of metricsRows) {
    const [dateStr, imprOrg, imprSpon, imprTotal, , , , clicksTotal, , , reactTotal, , , commTotal, , , repTotal] = r;
    if (!dateStr) continue;
    const d = parseUS(dateStr);
    if (d < weekStartD || d > weekEndD) continue;
    daysFound++;
    week.impressionsOrganic += parseInt(imprOrg, 10) || 0;
    week.impressionsSponsored += parseInt(imprSpon, 10) || 0;
    week.impressions += parseInt(imprTotal, 10) || 0;
    week.clicks += parseInt(clicksTotal, 10) || 0;
    week.reactions += parseInt(reactTotal, 10) || 0;
    week.comments += parseInt(commTotal, 10) || 0;
    week.reposts += parseInt(repTotal, 10) || 0;
  }
  week.engagement = week.reactions + week.comments + week.reposts;

  if (daysFound !== 7) {
    console.warn(`WARNING: found ${daysFound} day(s) of Metrics data in [${weekStart}, ${iso(weekEndD)}], expected 7. The export's date range may not match the requested week, or LinkedIn's ~2-day data lag means the most recent days aren't in yet.`);
  }

  // --- All posts published this week ---
  const postRows = XLSX.utils.sheet_to_json(wb.Sheets['All posts'], { header: 1, raw: false }).slice(2);
  const posts = postRows.map(r => {
    const [title, link, type, , author, createdDate, , , , impressions, views, , clicks, , likes, comments, reposts, , , contentType] = r;
    const d = createdDate ? parseUS(createdDate) : null;
    return {
      preview: (title || '').replace(/\s+/g, ' ').trim().slice(0, 220),
      link, type, author, date: d ? iso(d) : null,
      impressions: parseInt(impressions, 10) || 0,
      views: parseInt(views, 10) || 0,
      clicks: parseInt(clicks, 10) || 0,
      likes: parseInt(likes, 10) || 0,
      comments: parseInt(comments, 10) || 0,
      reposts: parseInt(reposts, 10) || 0,
      engagement: (parseInt(likes, 10) || 0) + (parseInt(comments, 10) || 0) + (parseInt(reposts, 10) || 0),
      contentType: contentType || type,
    };
  }).filter(p => p.type !== 'Total') // LinkedIn adds a duplicate organic+sponsored summary row per boosted post; drop it or engagement/impressions double-count
    .filter(p => p.date && new Date(p.date + 'T12:00:00') >= weekStartD && new Date(p.date + 'T12:00:00') <= weekEndD);

  const topPosts = [...posts].sort((a, b) => b.engagement - a.engagement).slice(0, 3);

  // --- Per-author stats for this week (merge into authorStats totals by hand) ---
  const authorThisWeek = {};
  for (const p of posts) {
    const a = p.author || '(unknown)';
    if (!authorThisWeek[a]) authorThisWeek[a] = { author: a, posts: 0, impressions: 0, impressionsOrganic: 0, impressionsSponsored: 0, engagement: 0 };
    authorThisWeek[a].posts++;
    authorThisWeek[a].impressions += p.impressions;
    if (p.type === 'Sponsored') authorThisWeek[a].impressionsSponsored += p.impressions;
    else authorThisWeek[a].impressionsOrganic += p.impressions;
    authorThisWeek[a].engagement += p.engagement;
  }

  console.log(JSON.stringify({
    weekStart, weekEnd: iso(weekEndD), daysFoundInMetricsSheet: daysFound,
    weeklyMetricsRow: week,
    postsThisWeek: posts.length,
    topPosts,
    authorThisWeek: Object.values(authorThisWeek),
  }, null, 2));
}

main().catch(err => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
