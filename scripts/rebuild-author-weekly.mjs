// One-off: adds per-author weekly impressions/engagement to company-data.json
// (for the author-toggle feature) by regrouping the raw "All posts" sheet by
// author + week, aligned to the same 51 week buckets as weeklyMetrics.
// Also recomputes authorStats to exclude LinkedIn's duplicate "Total" rows
// (Organic + Sponsored summed into one extra row for the one boosted post).
import XLSX from 'xlsx';
import fs from 'fs';

const RAW_EXPORT = 'C:/Users/ECP/Downloads/elite-consulting-partners_content_1789414182758.xls';
const DATA_PATH = new URL('../src/company-data.json', import.meta.url);

function parseUS(dateStr) {
  const [mm, dd, yyyy] = dateStr.split('/');
  return new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), 12);
}
function iso(d) { return d.toISOString().slice(0, 10); }

const data = JSON.parse(fs.readFileSync(DATA_PATH));
const weeks = data.weeklyMetrics.map(w => ({
  start: new Date(w.week + 'T12:00:00'),
  key: w.week,
}));

function weekKeyFor(date) {
  for (const w of weeks) {
    const end = new Date(w.start.getTime() + 6 * 864e5);
    if (date >= w.start && date <= end) return w.key;
  }
  return null;
}

const wb = XLSX.readFile(RAW_EXPORT);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['All posts'], { header: 1, raw: false })
  .slice(2)
  .filter(r => r[2] !== 'Total'); // drop LinkedIn's duplicate organic+sponsored summary row

const authorStatsMap = {};
const authorWeekly = {};

for (const r of rows) {
  const [, , type, , author, createdDate, , , , impressions, , , , , likes, comments, reposts] = r;
  if (!author || !createdDate) continue;
  const d = parseUS(createdDate);
  const impr = parseInt(impressions, 10) || 0;
  const eng = (parseInt(likes, 10) || 0) + (parseInt(comments, 10) || 0) + (parseInt(reposts, 10) || 0);
  const isSponsored = type === 'Sponsored';

  if (!authorStatsMap[author]) authorStatsMap[author] = { author, posts: 0, impressions: 0, engagement: 0 };
  authorStatsMap[author].posts++;
  authorStatsMap[author].impressions += impr;
  authorStatsMap[author].engagement += eng;

  const wk = weekKeyFor(d);
  if (!wk) continue; // post falls outside the 51 established week buckets (most-recent partial week)
  if (!authorWeekly[author]) authorWeekly[author] = {};
  if (!authorWeekly[author][wk]) authorWeekly[author][wk] = { impressionsOrganic: 0, impressionsSponsored: 0, engagement: 0, posts: 0 };
  if (isSponsored) authorWeekly[author][wk].impressionsSponsored += impr;
  else authorWeekly[author][wk].impressionsOrganic += impr;
  authorWeekly[author][wk].engagement += eng;
  authorWeekly[author][wk].posts += 1;
}

const authorStats = Object.values(authorStatsMap).map(a => ({
  ...a,
  avgImpressions: Math.round(a.impressions / a.posts),
  avgEngagement: Math.round((a.engagement / a.posts) * 10) / 10,
})).sort((a, b) => b.impressions - a.impressions);

const authorWeeklySeries = {};
for (const author of Object.keys(authorWeekly)) {
  authorWeeklySeries[author] = weeks.map(w => ({
    week: w.key,
    impressionsOrganic: authorWeekly[author][w.key]?.impressionsOrganic || 0,
    impressionsSponsored: authorWeekly[author][w.key]?.impressionsSponsored || 0,
    engagement: authorWeekly[author][w.key]?.engagement || 0,
    posts: authorWeekly[author][w.key]?.posts || 0,
  }));
}

data.authorStats = authorStats;
data.authorWeekly = authorWeeklySeries;
data.totalPostsAllTime = rows.length;

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
console.log('Rebuilt authorStats (excl. duplicate Total rows) and authorWeekly.');
console.log('totalPostsAllTime:', data.totalPostsAllTime);
console.log('authors:', authorStats.map(a => `${a.author} (${a.posts})`).join(', '));
