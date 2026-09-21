// Folds one week's parse_weekly_export.js output into src/company-data.json:
// appends the weeklyMetrics row, merges into authorStats + authorWeekly,
// adds this week's top posts (pruning topPostsByWeek to the most recent 12).
//
// Usage: node parse_weekly_export.js <file> <weekStart> > /tmp/week.json
//        node scripts/apply_weekly_update.mjs /tmp/week.json
import fs from 'fs';

const [, , weekJsonPath] = process.argv;
if (!weekJsonPath) {
  console.error('Usage: node scripts/apply_weekly_update.mjs <path-to-parse_weekly_export-output.json>');
  process.exit(1);
}

const DATA_PATH = new URL('../src/company-data.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(DATA_PATH));
const week = JSON.parse(fs.readFileSync(weekJsonPath));

if (data.weeklyMetrics.some(w => w.week === week.weekStart)) {
  console.error(`ERROR: weeklyMetrics already has a row for ${week.weekStart} — refusing to duplicate. Remove it first if you meant to redo this week.`);
  process.exit(1);
}

data.weeklyMetrics.push(week.weeklyMetricsRow);

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
  postedThisWeek.delete(author);
}
// New author with no prior weekly history: backfill zeros for every earlier week, then this week.
for (const author of postedThisWeek) {
  const a = week.authorThisWeek.find(x => x.author === author);
  data.authorWeekly[author] = data.weeklyMetrics.slice(0, -1).map(w => ({
    week: w.week, impressionsOrganic: 0, impressionsSponsored: 0, engagement: 0, posts: 0,
  }));
  data.authorWeekly[author].push({
    week: week.weekStart, impressionsOrganic: a.impressionsOrganic, impressionsSponsored: a.impressionsSponsored, engagement: a.engagement, posts: a.posts,
  });
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
