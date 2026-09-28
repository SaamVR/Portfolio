(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.LeadFlowDashboard = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const clampScore = value => Math.max(0, Math.min(100, Number(value) || 0));
  const pct = (value, total) => total ? Math.round((value / total) * 100) : 0;

  function sourceName(lead) {
    return String(lead?.source || "Unspecified").trim() || "Unspecified";
  }

  function actionKey(lead) {
    const raw = String(lead?.action || "").toLowerCase();
    if (raw.includes("sales")) return "salesReview";
    if (raw.includes("human") || raw.includes("review")) return "humanReview";
    if (raw.includes("nurture")) return "nurture";
    return "other";
  }

  function urgencyKey(lead) {
    const raw = String(lead?.timeline || lead?.timelineLabel || "").toLowerCase();
    if (raw.includes("asap") || raw.includes("immediate")) return "asap";
    if (raw.includes("1–2") || raw.includes("1-2") || raw.includes("week")) return "weeks";
    if (raw.includes("month")) return "month";
    return "other";
  }

  function buildDashboardModel(input) {
    const leads = Array.isArray(input) ? input : [];
    const total = leads.length;
    const status = { hot: 0, review: 0, nurture: 0, other: 0 };
    const actions = { salesReview: 0, humanReview: 0, nurture: 0, other: 0 };
    const sourceMap = new Map();
    const urgencyCounts = { asap: 0, weeks: 0, month: 0, other: 0 };

    let scoreTotal = 0;
    for (const lead of leads) {
      const statusKey = ["hot", "review", "nurture"].includes(lead?.status) ? lead.status : "other";
      status[statusKey] += 1;
      actions[actionKey(lead)] += 1;
      urgencyCounts[urgencyKey(lead)] += 1;

      const score = clampScore(lead?.score);
      scoreTotal += score;
      const source = sourceName(lead);
      const current = sourceMap.get(source) || { count: 0, scoreTotal: 0 };
      current.count += 1;
      current.scoreTotal += score;
      sourceMap.set(source, current);
    }

    const sources = [...sourceMap.entries()]
      .map(([name, value]) => ({
        name,
        count: value.count,
        averageScore: Math.round(value.scoreTotal / value.count)
      }))
      .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore || a.name.localeCompare(b.name));

    const urgencyLabels = {
      asap: "ASAP",
      weeks: "1–2 weeks",
      month: "Within a month",
      other: "Exploring / other"
    };

    return {
      total,
      status,
      statusPct: Object.fromEntries(Object.entries(status).map(([key, value]) => [key, pct(value, total)])),
      averageScore: total ? Math.round(scoreTotal / total) : 0,
      immediate: { count: urgencyCounts.asap, pct: pct(urgencyCounts.asap, total) },
      actions,
      sources,
      urgency: Object.entries(urgencyCounts).map(([key, count]) => ({
        key,
        label: urgencyLabels[key],
        count,
        pct: pct(count, total)
      })),
      recentScores: leads.slice(0, 8).map(lead => ({
        name: String(lead?.name || "Unnamed lead"),
        company: String(lead?.company || ""),
        score: clampScore(lead?.score),
        status: ["hot", "review", "nurture"].includes(lead?.status) ? lead.status : "other"
      }))
    };
  }

  return { buildDashboardModel };
});
