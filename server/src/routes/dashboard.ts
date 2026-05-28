import { Hono } from "hono";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";

const dashboard = new Hono();
dashboard.use("/*", authMiddleware);

dashboard.get("/org", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  let orgFilter = "";
  const params: any[] = [];

  if (user.role !== "admin") {
    const userRow = db.prepare("SELECT org_id FROM users WHERE id = ?").get(user.userId) as any;
    if (userRow?.org_id) {
      orgFilter = "AND t.org_id = ?";
      params.push(userRow.org_id);
    }
  }

  const totalRetros = db.prepare(`
    SELECT COUNT(*) as count FROM retrospectives r
    JOIN teams t ON r.team_id = t.id WHERE 1=1 ${orgFilter}
  `).get(...params) as any;

  const openActions = db.prepare(`
    SELECT COUNT(*) as count FROM action_items a
    JOIN retrospectives r ON a.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    WHERE a.status != 'done' ${orgFilter}
  `).get(...params) as any;

  const completedActions = db.prepare(`
    SELECT COUNT(*) as count FROM action_items a
    JOIN retrospectives r ON a.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    WHERE a.status = 'done' ${orgFilter}
  `).get(...params) as any;

  const totalActions = openActions.count + completedActions.count;
  const completionRate = totalActions > 0 ? Math.round((completedActions.count / totalActions) * 100) : 0;

  const retroTrend = db.prepare(`
    SELECT strftime('%Y-%m', r.created_at) as month, COUNT(*) as count
    FROM retrospectives r
    JOIN teams t ON r.team_id = t.id
    WHERE r.created_at >= datetime('now', '-6 months') ${orgFilter}
    GROUP BY month ORDER BY month
  `).all(...params);

  const topThemes = db.prepare(`
    SELECT th.name, th.vote_count, r.title as retro_title, t.name as team_name
    FROM themes th
    JOIN retrospectives r ON th.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    WHERE 1=1 ${orgFilter}
    ORDER BY th.vote_count DESC LIMIT 10
  `).all(...params);

  return c.json({
    total_retros: totalRetros.count,
    open_actions: openActions.count,
    completion_rate: completionRate,
    retro_trend: retroTrend,
    top_themes: topThemes,
  });
});

dashboard.get("/team/:teamId", (c) => {
  const db = getDb();
  const teamId = c.req.param("teamId");

  const retros = db.prepare(`
    SELECT id, title, sprint_cycle_name, status, start_date, end_date, created_at
    FROM retrospectives WHERE team_id = ? ORDER BY created_at DESC
  `).all(teamId);

  const actionStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress
    FROM action_items WHERE retro_id IN (SELECT id FROM retrospectives WHERE team_id = ?)
  `).get(teamId) as any;

  const participation = db.prepare(`
    SELECT r.id, r.title,
      (SELECT COUNT(DISTINCT author_id) FROM feedback_items WHERE retro_id = r.id) as contributors,
      (SELECT COUNT(*) FROM feedback_items WHERE retro_id = r.id) as feedback_count,
      (SELECT COUNT(*) FROM votes v JOIN themes t ON v.theme_id = t.id WHERE t.retro_id = r.id) as vote_count
    FROM retrospectives r WHERE r.team_id = ? ORDER BY r.created_at DESC
  `).all(teamId);

  const themeHeatmap = db.prepare(`
    SELECT th.name, th.vote_count, r.title as retro_title, r.created_at
    FROM themes th
    JOIN retrospectives r ON th.retro_id = r.id
    WHERE r.team_id = ?
    ORDER BY r.created_at DESC, th.vote_count DESC
    LIMIT 50
  `).all(teamId);

  const recurringIssues = db.prepare(`
    SELECT th.name, COUNT(*) as occurrences, SUM(th.vote_count) as total_votes
    FROM themes th
    JOIN retrospectives r ON th.retro_id = r.id
    WHERE r.team_id = ?
    GROUP BY th.name
    HAVING occurrences > 1
    ORDER BY occurrences DESC, total_votes DESC
    LIMIT 10
  `).all(teamId);

  const completionRate = actionStats?.total > 0
    ? Math.round((actionStats.completed / actionStats.total) * 100)
    : 0;

  return c.json({
    retros,
    action_stats: { ...actionStats, completion_rate: completionRate },
    participation,
    theme_heatmap: themeHeatmap,
    recurring_issues: recurringIssues,
  });
});

dashboard.get("/analytics", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  let orgFilter = "";
  const params: any[] = [];

  if (user.role !== "admin") {
    const userRow = db.prepare("SELECT org_id FROM users WHERE id = ?").get(user.userId) as any;
    if (userRow?.org_id) {
      orgFilter = "AND t.org_id = ?";
      params.push(userRow.org_id);
    }
  }

  const topRecurring = db.prepare(`
    SELECT th.name, COUNT(*) as occurrences, SUM(th.vote_count) as total_votes
    FROM themes th
    JOIN retrospectives r ON th.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    WHERE 1=1 ${orgFilter}
    GROUP BY th.name HAVING occurrences > 1
    ORDER BY occurrences DESC LIMIT 20
  `).all(...params);

  const lowParticipation = db.prepare(`
    SELECT t.name as team_name, t.id as team_id,
      AVG((SELECT COUNT(DISTINCT author_id) FROM feedback_items WHERE retro_id = r.id)) as avg_contributors,
      COUNT(r.id) as retro_count
    FROM teams t
    LEFT JOIN retrospectives r ON t.id = r.team_id
    WHERE 1=1 ${orgFilter}
    GROUP BY t.id ORDER BY avg_contributors ASC LIMIT 10
  `).all(...params);

  const unresolvedActions = db.prepare(`
    SELECT a.title, a.priority, a.created_at, r.title as retro_title, t.name as team_name,
      u.name as owner_name
    FROM action_items a
    JOIN retrospectives r ON a.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.status != 'done' ${orgFilter}
    ORDER BY 
      CASE a.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      a.created_at ASC
    LIMIT 20
  `).all(...params);

  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', r.created_at) as month,
      COUNT(DISTINCT r.id) as retro_count,
      COUNT(DISTINCT a.id) as action_count,
      SUM(CASE WHEN a.status = 'done' THEN 1 ELSE 0 END) as completed_count
    FROM retrospectives r
    JOIN teams t ON r.team_id = t.id
    LEFT JOIN action_items a ON r.id = a.retro_id
    WHERE r.created_at >= datetime('now', '-12 months') ${orgFilter}
    GROUP BY month ORDER BY month
  `).all(...params);

  return c.json({
    top_recurring_issues: topRecurring,
    low_participation_teams: lowParticipation,
    unresolved_actions: unresolvedActions,
    monthly_trend: monthlyTrend,
  });
});

export { dashboard };
