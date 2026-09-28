// Folds one week's parse_weekly_export.js output into src/company-data.json:
// appends the weeklyMetrics row, merges into authorStats + authorWeekly,
// adds this week's top posts (pruning topPostsByWeek to the most recent 12).
//
// Usage: node parse_weekly_export.js <file> <weekStart> > /tmp/week.json
//        node scripts/apply_weekly_update.mjs /tmp/week.json
//        node scripts/apply_weekly_update.mjs /tmp/week.json --replace
//   --replace: this week was already applied (e.g. its first export was a
//   partial week due to LinkedIn's reporting lag) — reverses that week's old
//   contribution out of authorStats first, then re-applies the new numbers,
//   instead of refusing as a duplicate.
import fs from 'fs';

const [, , weekJsonPath, ...rest] = process.argv;
const replace = rest.includes('--replace');
if (!weekJsonPath) {
  console.error('Usage: node scripts/apply_weekly_update.mjs <path-to-parse_weekly_export-output.json> [--replace]');
  process.exit(1);
}

const DATA_PATH = new URL('../src/company-data.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(DATA_PATH));
const week = JSON.parse(fs.readFileSync(weekJsonPath));

const existingIdx = data.weeklyMetrics.findIndex(w => w.week === week.weekStart);
if (existingIdx !== -1 && !replace) {
  console.error(`ERROR: weeklyMetrics already has a row for ${week.weekStart} — refusing to duplicate. Pass --replace to correct it (e.g. backfilling a previously partial week).`);
  process.exit(1);
}
if (existingIdx === -1 && replace) {
  console.error(`ERROR: --replace passed but no existing row for ${week.weekStart} found — nothing to replace.`);
  process.exit(1);
}

if (replace) {
  // Reverse this week's old per-author contribution out of authorStats before re-applying.
  for (const author of Object.keys(data.authorWeekly)) {
    const oldWeek = data.authorWeekly[author].find(w => w.week === week.weekStart);
    if (!oldWeek || !oldWeek.posts) continue;
    const entry = data.authorStats.find(x => x.author === author);
    if (!entry) continue;
    entry.posts -= oldWeek.posts;
    entry.impressions -= (oldWeek.impressionsOrganic + oldWeek.impressionsSponsored);
    entry.engagement -= oldWeek.engagement;
  }
  data.weeklyMetrics.splice(existingIdx, 1);
  for (const author of Object.keys(data.authorWeekly)) {
    data.authorWeekly[author] = data.authorWeekly[author].filter(w => w.week !== week.weekStart);
  }
  // Drop any authorStats entries left at 0 posts (an author whose only contribution was this week).
  data.authorStats = data.authorStats.filter(a => a.posts > 0);
}

data.weeklyMetrics.push(week.weeklyMetricsRow);
data.weeklyMetrics.sort((a, b) => a.week.localeCompare(b.week));

for (const a of week.authorThisWeek) {
  let entry = data.authorStats.find(x => x.author === a.author);
  if (!entry) {
    entry = { author: a.author, posts: 0, impressions: 0, engagement: 0, avgImpressions: 0, avgEngagement: 0 };
    data.authorStats.push(entry);
  }
  entry.posts += a.posts;
  entry.impressions += a.impressions;
  entry.engagement += a.engagement;
  entry.avgImpressions = Math.round(entry.impressions / entry.posts);
  entry.avgEngagement = Math.round((entry.engagement / entry.posts) * 10) / 10;
}
data.authorStats.sort((a, b) => b.impressions - a.impressions);
data.totalPostsAllTime = data.authorStats.reduce((sum, a) => sum + a.posts, 0);

if (!data.authorWeekly) data.authorWeekly = {};
const postedThisWeek = new Set(week.authorThisWeek.map(a => a.author));
for (const author of Object.keys(data.authorWeekly)) {
  const a = week.authorThisWeek.find(x => x.author === author);
  data.authorWeekly[author].push({
    week: week.weekStart,
    impressionsOrganic: a ? a.impressionsOrganic : 0,
    impressionsSponsored: a ? a.impressionsSponsored : 0,
    engagement: a ? a.engagement : 0,
    posts: a ? a.posts : 0,
  });
  data.authorWeekly[author].sort((x, y) => x.week.localeCompare(y.week));
  postedThisWeek.delete(author);
}
// New author with no prior weekly history: backfill zeros for every earlier week, then this week.
for (const author of postedThisWeek) {
  const a = week.authorThisWeek.find(x => x.author === author);
  data.authorWeekly[author] = data.weeklyMetrics.filter(w => w.week !== week.weekStart).map(w => ({
    week: w.week, impressionsOrganic: 0, impressionsSponsored: 0, engagement: 0, posts: 0,
  }));
  data.authorWeekly[author].push({
    week: week.weekStart, impressionsOrganic: a.impressionsOrganic, impressionsSponsored: a.impressionsSponsored, engagement: a.engagement, posts: a.posts,
  });
  data.authorWeekly[author].sort((x, y) => x.week.localeCompare(y.week));
}

data.topPostsByWeek[week.weekStart] = week.topPosts;
const weekKeys = Object.keys(data.topPostsByWeek).sort();
while (weekKeys.length > 12) {
  delete data.topPostsByWeek[weekKeys.shift()];
}

data.updatedAt = new Date().toISOString().slice(0, 10);

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`Applied week ${week.weekStart} (${week.daysFoundInMetricsSheet}/7 days of Metrics data).`);
console.log('weeklyMetrics rows:', data.weeklyMetrics.length, '| authors:', data.authorStats.length, '| totalPostsAllTime:', data.totalPostsAllTime);
