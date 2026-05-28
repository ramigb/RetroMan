import { Hono } from "hono";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";

const ai = new Hono();
ai.use("/*", authMiddleware);

ai.post("/auto-cluster", async (c) => {
  const body = await c.req.json();
  const { retro_id } = body;
  if (!retro_id) return c.json({ error: "retro_id required" }, 400);

  const db = getDb();
  const feedback = db.prepare("SELECT * FROM feedback_items WHERE retro_id = ? AND theme_id IS NULL").all(retro_id) as any[];

  if (feedback.length === 0) {
    return c.json({ message: "No unassigned feedback items", clusters: [] });
  }

  const categoryGroups: Record<string, any[]> = {};
  for (const item of feedback) {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
    categoryGroups[item.category].push(item);
  }

  const clusters: any[] = [];
  for (const [category, items] of Object.entries(categoryGroups)) {
    if (items.length === 0) continue;

    const wordFreq: Record<string, number> = {};
    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and", "but", "or", "not", "no", "so", "if", "then", "than", "that", "this", "these", "those", "it", "its", "we", "our", "they", "their", "i", "my", "me"]);

    for (const item of items) {
      const words = item.text.toLowerCase().split(/\s+/);
      for (const word of words) {
        const clean = word.replace(/[^a-z]/g, "");
        if (clean.length > 3 && !stopWords.has(clean)) {
          wordFreq[clean] = (wordFreq[clean] || 0) + 1;
        }
      }
    }

    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

    const themeName = topWords.length > 0 ? topWords.join(" & ") : category;

    clusters.push({
      category,
      suggested_name: themeName,
      item_ids: items.map((i) => i.id),
      item_count: items.length,
    });
  }

  return c.json({ clusters });
});

ai.post("/suggest-theme-name", async (c) => {
  const body = await c.req.json();
  const { item_ids } = body;
  if (!item_ids || item_ids.length === 0) return c.json({ error: "item_ids required" }, 400);

  const db = getDb();
  const items = db.prepare(
    `SELECT text FROM feedback_items WHERE id IN (${item_ids.map(() => "?").join(",")})`
  ).all(...item_ids) as any[];

  const wordFreq: Record<string> = {};
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "for", "on", "with", "and", "but", "or", "not", "it", "we", "they", "i"]);

  for (const item of items) {
    const words = item.text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (clean.length > 3 && !stopWords.has(clean)) {
        wordFreq[clean] = (wordFreq[clean] || 0) + 1;
      }
    }
  }

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const suggestion = topWords.length > 0 ? topWords.join(" & ") : "New Theme";

  return c.json({ suggestion });
});

ai.post("/summarize", async (c) => {
  const body = await c.req.json();
  const { retro_id } = body;
  if (!retro_id) return c.json({ error: "retro_id required" }, 400);

  const db = getDb();
  const retro = db.prepare("SELECT * FROM retrospectives WHERE id = ?").get(retro_id) as any;
  if (!retro) return c.json({ error: "Not found" }, 404);

  const feedback = db.prepare("SELECT * FROM feedback_items WHERE retro_id = ?").all(retro_id) as any[];
  const themes = db.prepare("SELECT * FROM themes WHERE retro_id = ? ORDER BY vote_count DESC").all(retro_id) as any[];
  const actions = db.prepare("SELECT * FROM action_items WHERE retro_id = ?").all(retro_id) as any[];

  const categoryCounts: Record<string, number> = {};
  for (const f of feedback) {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  }

  const topThemes = themes.slice(0, 5).map((t) => ({
    name: t.name,
    votes: t.vote_count,
    items: feedback.filter((f) => f.theme_id === t.id).length,
  }));

  const actionSummary = {
    total: actions.length,
    open: actions.filter((a) => a.status === "open").length,
    in_progress: actions.filter((a) => a.status === "in_progress").length,
    done: actions.filter((a) => a.status === "done").length,
    critical: actions.filter((a) => a.priority === "critical").length,
  };

  const summary = {
    retro_title: retro.title,
    sprint: retro.sprint_cycle_name,
    total_feedback: feedback.length,
    category_breakdown: categoryCounts,
    top_themes: topThemes,
    action_items: actionSummary,
    executive_summary: generateExecutiveSummary(retro, feedback, topThemes, actionSummary, categoryCounts),
  };

  return c.json(summary);
});

ai.post("/suggest-actions", async (c) => {
  const body = await c.req.json();
  const { theme_id } = body;
  if (!theme_id) return c.json({ error: "theme_id required" }, 400);

  const db = getDb();
  const theme = db.prepare("SELECT * FROM themes WHERE id = ?").get(theme_id) as any;
  if (!theme) return c.json({ error: "Not found" }, 404);

  const feedback = db.prepare("SELECT text FROM feedback_items WHERE theme_id = ?").all(theme_id) as any[];

  const suggestions: string[] = [];
  const themeLower = theme.name.toLowerCase();

  if (themeLower.includes("test") || themeLower.includes("ci") || themeLower.includes("bug")) {
    suggestions.push("Implement automated test coverage for critical paths");
    suggestions.push("Set up CI pipeline monitoring and alerts");
  }
  if (themeLower.includes("doc")) {
    suggestions.push("Create documentation templates and standards");
    suggestions.push("Schedule documentation review sessions");
  }
  if (themeLower.includes("communication") || themeLower.includes("meeting")) {
    suggestions.push("Establish async communication guidelines");
    suggestions.push("Review and optimize meeting schedules");
  }
  if (themeLower.includes("performance") || themeLower.includes("slow")) {
    suggestions.push("Conduct performance audit and create optimization plan");
    suggestions.push("Set up performance monitoring and benchmarks");
  }
  if (themeLower.includes("debt") || themeLower.includes("refactor")) {
    suggestions.push("Allocate dedicated tech debt reduction time");
    suggestions.push("Create prioritized tech debt backlog");
  }

  if (suggestions.length === 0) {
    suggestions.push(`Review and address feedback related to "${theme.name}"`);
    suggestions.push(`Create a plan to improve "${theme.name}" based on team input`);
    suggestions.push(`Schedule follow-up discussion on "${theme.name}" with stakeholders`);
  }

  return c.json({ suggestions });
});

ai.get("/patterns/:teamId", (c) => {
  const db = getDb();
  const teamId = c.req.param("teamId");

  const allThemes = db.prepare(`
    SELECT t.name, t.vote_count, r.title as retro_title, r.created_at
    FROM themes t
    JOIN retrospectives r ON t.retro_id = r.id
    WHERE r.team_id = ?
    ORDER BY r.created_at DESC
  `).all(teamId) as any[];

  const nameOccurrences: Record<string, { count: number; totalVotes: number; retros: string[] }> = {};
  for (const t of allThemes) {
    const normalizedName = t.name.toLowerCase().trim();
    if (!nameOccurrences[normalizedName]) {
      nameOccurrences[normalizedName] = { count: 0, totalVotes: 0, retros: [] };
    }
    nameOccurrences[normalizedName].count++;
    nameOccurrences[normalizedName].totalVotes += t.vote_count;
    if (!nameOccurrences[normalizedName].retros.includes(t.retro_title)) {
      nameOccurrences[normalizedName].retros.push(t.retro_title);
    }
  }

  const patterns = Object.entries(nameOccurrences)
    .filter(([_, v]) => v.count > 1)
    .map(([name, v]) => ({
      theme: name,
      occurrences: v.count,
      total_votes: v.totalVotes,
      retros: v.retros,
      risk_level: v.count >= 3 ? "high" : v.count >= 2 ? "medium" : "low",
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return c.json({ patterns });
});

function generateExecutiveSummary(
  retro: any,
  feedback: any[],
  topThemes: any[],
  actionSummary: any,
  categoryCounts: Record<string, number>
): string {
  const parts: string[] = [];

  parts.push(`${retro.title} (${retro.sprint_cycle_name || "Current Sprint"}) gathered ${feedback.length} feedback items from the team.`);

  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    parts.push(`The majority of feedback (${topCategory[1]} items) fell under "${topCategory[0]}".`);
  }

  if (topThemes.length > 0) {
    parts.push(`Top discussion themes were: ${topThemes.slice(0, 3).map((t) => `"${t.name}"`).join(", ")}.`);
  }

  parts.push(`${actionSummary.total} action items were created, with ${actionSummary.open + actionSummary.in_progress} still in progress.`);

  if (actionSummary.critical > 0) {
    parts.push(`${actionSummary.critical} critical items require immediate attention.`);
  }

  return parts.join(" ");
}

export { ai };
