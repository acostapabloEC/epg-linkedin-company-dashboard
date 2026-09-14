import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import data from "./company-data.json";

const { updatedAt, currentFollowers, totalPostsAllTime, weeklyMetrics, authorStats, authorWeekly, topPostsByWeek } = data;

const GOLD     = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.15)";
const GREEN    = "#3fb950";
const GREEN_DIM= "rgba(63,185,80,0.12)";
const RED      = "#f85149";
const BLUE     = "#58a6ff";
const BLUE_DIM = "rgba(88,166,255,0.1)";
const PURPLE   = "#a855f7";
const MUTED    = "#8892a4";
const BORDER   = "rgba(255,255,255,0.07)";
const SURFACE  = "#111827";
const BG       = "#0a0f1e";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtWeekLabel(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  const end = new Date(d); end.setDate(d.getDate() + 6);
  const startStr = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  const endStr = d.getMonth() === end.getMonth() ? `${end.getDate()}` : `${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
  return `${startStr}–${endStr}`;
}
function fmtDate(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fmtK(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }
function fmtNum(n) { return (n ?? 0).toLocaleString(); }

const latestWeek = weeklyMetrics[weeklyMetrics.length - 1];
const prevWeek   = weeklyMetrics[weeklyMetrics.length - 2];
const delta = (curr, prev) => (prev ? Math.round(((curr - prev) / prev) * 100) : null);

const pageChartData = weeklyMetrics.map(w => ({
  week: fmtWeekLabel(w.week),
  Organic: w.impressionsOrganic,
  Sponsored: w.impressionsSponsored,
  Engagement: w.engagement,
}));

const authorNames = Object.keys(authorWeekly || {});
const authorChartData = {};
for (const author of authorNames) {
  authorChartData[author] = authorWeekly[author].map(w => ({
    week: fmtWeekLabel(w.week),
    Organic: w.impressionsOrganic,
    Sponsored: w.impressionsSponsored,
    Engagement: w.engagement,
  }));
}

const authorSortedByEngagement = [...authorStats].sort((a, b) => b.avgEngagement - a.avgEngagement);
const latestWeekTopPosts = topPostsByWeek[latestWeek.week] || [];

const tooltipNumberFormatter = (value) => fmtNum(value);
const tooltipCursorStyle = { fill: "rgba(255,255,255,0.04)" };

function KpiCard({ label, value, delta: d, deltaLabel, accent, sub, large }) {
  const up = d != null && d >= 0;
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 20px", flex: 1, minWidth: 200 }}>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
        Elite Consulting Partners · LinkedIn Page
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: large ? 34 : 28, fontWeight: 700, color: "#f0f6fc", lineHeight: 1 }}>{value}</div>
      {d != null && (
        <div style={{ marginTop: 8, fontSize: 12, color: up ? GREEN : RED }}>
          {up ? "↑" : "↓"} {Math.abs(d)}% <span style={{ color: MUTED }}>{deltaLabel}</span>
        </div>
      )}
      {sub && <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>{sub}</div>}
    </div>
  );
}

export default function App() {
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const chartData = selectedAuthor === "all" ? pageChartData : authorChartData[selectedAuthor];
  const selectedAuthorStats = selectedAuthor === "all" ? null : authorStats.find(a => a.author === selectedAuthor);

  return (
    <div style={{ background: BG, minHeight: "100vh", color: "#e6edf3", fontFamily: "Inter, system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "#0a0f1e", fontSize: 18 }}>E</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Elite Consulting Partners — LinkedIn Company Page</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: MUTED, marginTop: 2 }}>
                  Company Page · not Frank LaRosa's personal profile · {fmtDate(weeklyMetrics[0].week)} – {fmtDate(latestWeek.week)}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", background: GOLD_DIM, color: GOLD, padding: "5px 12px", borderRadius: 6, border: `1px solid rgba(201,168,76,0.2)`, display: "inline-block" }}>
              Live Dashboard
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Data through {fmtDate(latestWeek.week)} (week ending {fmtDate(new Date(new Date(latestWeek.week+"T12:00:00").getTime()+6*864e5).toISOString().slice(0,10))})</div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <KpiCard label="Total Followers" value={currentFollowers.toLocaleString()} accent={PURPLE} sub={`As of ${fmtDate(latestWeek.week)}`} large />
          <KpiCard label={`Impressions (${fmtWeekLabel(latestWeek.week)})`} value={fmtK(latestWeek.impressions)} delta={delta(latestWeek.impressions, prevWeek?.impressions)} deltaLabel={`vs prior week (${fmtK(prevWeek?.impressions || 0)})`} accent={BLUE} />
          <KpiCard label={`Engagement (${fmtWeekLabel(latestWeek.week)})`} value={latestWeek.engagement.toLocaleString()} delta={delta(latestWeek.engagement, prevWeek?.engagement)} deltaLabel={`vs prior week (${prevWeek?.engagement || 0})`} accent={GREEN} />
          <KpiCard label="Organic vs Sponsored (this week)" value={`${fmtK(latestWeek.impressionsOrganic)} / ${fmtK(latestWeek.impressionsSponsored)}`} sub={`${Math.round((latestWeek.impressionsOrganic/(latestWeek.impressions||1))*100)}% organic`} accent={GOLD} />
        </div>

        {/* Author toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>Show charts for:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", ...authorNames].map(name => {
              const active = selectedAuthor === name;
              const label = name === "all" ? "All (Page Total)" : name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedAuthor(name)}
                  style={{
                    fontFamily: "'DM Mono',monospace", fontSize: 11, padding: "6px 12px", borderRadius: 20,
                    border: `1px solid ${active ? GOLD : BORDER}`,
                    background: active ? GOLD_DIM : "transparent",
                    color: active ? GOLD : MUTED,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly trend chart */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            Weekly Impressions{selectedAuthor === "all" ? " — Organic vs. Sponsored" : ` — ${selectedAuthor}`}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>
            {weeklyMetrics.length} weeks · {fmtDate(weeklyMetrics[0].week)} – {fmtDate(latestWeek.week)}
            {selectedAuthorStats && ` · ${selectedAuthorStats.posts} posts · ${fmtNum(selectedAuthorStats.impressions)} impressions all-time`}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: MUTED, fontSize: 10 }} interval={Math.floor(chartData.length / 10)} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip contentStyle={{ background: "#0d1420", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} formatter={tooltipNumberFormatter} cursor={tooltipCursorStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Organic" stackId="1" stroke={BLUE} fill={BLUE_DIM} />
              <Area type="monotone" dataKey="Sponsored" stackId="1" stroke={GOLD} fill={GOLD_DIM} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly engagement chart */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            Weekly Engagement (Reactions + Comments + Reposts){selectedAuthor !== "all" && ` — ${selectedAuthor}`}
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>
            {selectedAuthor === "all" ? "Organic + sponsored combined" : `${selectedAuthorStats?.avgEngagement ?? 0} avg engagement/post all-time`}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={BORDER} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: MUTED, fontSize: 10 }} interval={Math.floor(chartData.length / 10)} />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip contentStyle={{ background: "#0d1420", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }} formatter={tooltipNumberFormatter} cursor={tooltipCursorStyle} />
              <Bar dataKey="Engagement" fill={GREEN} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Author performance */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Performance by Author (all-time, {totalPostsAllTime} posts)</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>Sorted by average engagement per post — volume and average performance are separate stories</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "left" }}>
                  <th style={{ padding: "6px 10px" }}>Author</th>
                  <th style={{ padding: "6px 10px" }}>Posts</th>
                  <th style={{ padding: "6px 10px" }}>Total Impressions</th>
                  <th style={{ padding: "6px 10px" }}>Avg Impressions/Post</th>
                  <th style={{ padding: "6px 10px" }}>Avg Engagement/Post</th>
                </tr>
              </thead>
              <tbody>
                {authorSortedByEngagement.map((a, i) => (
                  <tr key={a.author} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "10px", fontWeight: i === 0 ? 700 : 400, color: i === 0 ? GOLD : "#e6edf3" }}>{a.author}</td>
                    <td style={{ padding: "10px", color: MUTED }}>{a.posts}</td>
                    <td style={{ padding: "10px", color: MUTED }}>{a.impressions.toLocaleString()}</td>
                    <td style={{ padding: "10px" }}>{a.avgImpressions.toLocaleString()}</td>
                    <td style={{ padding: "10px", fontWeight: 600, color: i === 0 ? GOLD : "#e6edf3" }}>{a.avgEngagement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top posts this week */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Top Posts — Week of {fmtWeekLabel(latestWeek.week)}</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 16 }}>By engagement (likes + comments + reposts)</div>
          {latestWeekTopPosts.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 13 }}>No posts recorded this week.</div>
          ) : latestWeekTopPosts.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 700, color: GOLD, minWidth: 24 }}>#{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#e6edf3", marginBottom: 6 }}>{p.preview}{p.preview.length >= 220 ? "…" : ""}</div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {p.author} · {fmtDate(p.date)} · {p.type} · {p.impressions.toLocaleString()} impr · <span style={{ color: GREEN }}>{p.engagement} eng</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: MUTED, marginTop: 32 }}>
          Elite Consulting Partners · LinkedIn Company Page Dashboard · Source: LinkedIn Page Analytics export (manual, weekly) · Updated {fmtDate(updatedAt)}
        </div>
      </div>
    </div>
  );
}
