import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, facilitatorMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const retros = new Hono();
retros.use("/*", authMiddleware);

const createSchema = z.object({
  title: z.string().min(1),
  sprint_cycle_name: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  max_votes_per_user: z.number().int().min(1).optional(),
  anonymous_mode: z.boolean().optional(),
  template_id: z.string().optional(),
  team_id: z.string(),
});

retros.get("/", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const teamId = c.req.query("team_id");
  const status = c.req.query("status");

  let query = `
    SELECT r.*, t.name as team_name, u.name as facilitator_name,
      (SELECT COUNT(*) FROM feedback_items WHERE retro_id = r.id) as feedback_count,
      (SELECT COUNT(*) FROM themes WHERE retro_id = r.id) as theme_count,
      (SELECT COUNT(*) FROM action_items WHERE retro_id = r.id AND status != 'done') as open_actions
    FROM retrospectives r
    JOIN teams t ON r.team_id = t.id
    LEFT JOIN users u ON r.facilitator_id = u.id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (teamId) {
    conditions.push("r.team_id = ?");
    params.push(teamId);
  }

  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }

  if (user.role === "member") {
    conditions.push("r.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?)");
    params.push(user.userId);
  }

  if (conditions.length) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY r.created_at DESC";

  const results = db.prepare(query).all(...params);
  return c.json(results);
});

retros.get("/:id", (c) => {
  const db = getDb();
  const retro = db.prepare(`
    SELECT r.*, t.name as team_name, u.name as facilitator_name,
      rt.categories as template_categories
    FROM retrospectives r
    JOIN teams t ON r.team_id = t.id
    LEFT JOIN users u ON r.facilitator_id = u.id
    LEFT JOIN retro_templates rt ON r.template_id = rt.id
    WHERE r.id = ?
  `).get(c.req.param("id"));

  if (!retro) return c.json({ error: "Not found" }, 404);

  const feedback = db.prepare(`
    SELECT f.*, 
      CASE WHEN f.is_anonymous = 1 THEN NULL ELSE u.name END as author_name
    FROM feedback_items f
    LEFT JOIN users u ON f.author_id = u.id
    WHERE f.retro_id = ?
    ORDER BY f.created_at ASC
  `).all(c.req.param("id"));

  const themes = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM votes WHERE theme_id = t.id) as vote_count,
      (SELECT COUNT(*) FROM feedback_items WHERE theme_id = t.id) as item_count
    FROM themes t
    WHERE t.retro_id = ?
    ORDER BY t.vote_count DESC
  `).all(c.req.param("id"));

  const actions = db.prepare(`
    SELECT a.*, u.name as owner_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.retro_id = ?
    ORDER BY 
      CASE a.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      a.created_at ASC
  `).all(c.req.param("id"));

  return c.json({ ...(retro as any), feedback, themes, actions });
});

retros.post("/", facilitatorMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const id = generateId();

  const template = parsed.data.template_id
    ? (db.prepare("SELECT categories FROM retro_templates WHERE id = ?").get(parsed.data.template_id) as any)
    : null;

  db.prepare(`
    INSERT INTO retrospectives (id, title, sprint_cycle_name, start_date, end_date, max_votes_per_user, anonymous_mode, template_id, team_id, facilitator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parsed.data.title,
    parsed.data.sprint_cycle_name || null,
    parsed.data.start_date || null,
    parsed.data.end_date || null,
    parsed.data.max_votes_per_user || 3,
    parsed.data.anonymous_mode !== undefined ? (parsed.data.anonymous_mode ? 1 : 0) : 1,
    parsed.data.template_id || null,
    parsed.data.team_id,
    user.userId
  );

  const retro = db.prepare("SELECT * FROM retrospectives WHERE id = ?").get(id);
  return c.json({ ...(retro as any), template_categories: template?.categories }, 201);
});

retros.put("/:id", facilitatorMiddleware, async (c) => {
  const body = await c.req.json();
  const db = getDb();

  db.prepare(`
    UPDATE retrospectives SET
      title = COALESCE(?, title),
      sprint_cycle_name = COALESCE(?, sprint_cycle_name),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      status = COALESCE(?, status),
      max_votes_per_user = COALESCE(?, max_votes_per_user),
      anonymous_mode = COALESCE(?, anonymous_mode),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.title,
    body.sprint_cycle_name,
    body.start_date,
    body.end_date,
    body.status,
    body.max_votes_per_user,
    body.anonymous_mode !== undefined ? (body.anonymous_mode ? 1 : 0) : null,
    c.req.param("id")
  );

  const retro = db.prepare("SELECT * FROM retrospectives WHERE id = ?").get(c.req.param("id"));
  return c.json(retro);
});

retros.post("/:id/advance", facilitatorMiddleware, (c) => {
  const db = getDb();
  const retro = db.prepare("SELECT status FROM retrospectives WHERE id = ?").get(c.req.param("id")) as any;
  if (!retro) return c.json({ error: "Not found" }, 404);

  const transitions: Record<string, string> = {
    draft: "open",
    open: "grouping",
    grouping: "voting",
    voting: "discussion",
    discussion: "completed",
  };

  const nextStatus = transitions[retro.status];
  if (!nextStatus) return c.json({ error: "Cannot advance from current status" }, 400);

  db.prepare("UPDATE retrospectives SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    nextStatus,
    c.req.param("id")
  );

  const updated = db.prepare("SELECT * FROM retrospectives WHERE id = ?").get(c.req.param("id"));
  return c.json(updated);
});

retros.delete("/:id", facilitatorMiddleware, (c) => {
  const db = getDb();
  db.prepare("DELETE FROM retrospectives WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { retros };
