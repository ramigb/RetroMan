import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const actions = new Hono();
actions.use("/*", authMiddleware);

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  theme_id: z.string().optional(),
  retro_id: z.string(),
});

actions.get("/", (c) => {
  const db = getDb();
  const retroId = c.req.query("retro_id");
  const ownerId = c.req.query("owner_id");
  const status = c.req.query("status");
  const user = c.get("user") as JwtPayload;

  let query = `
    SELECT a.*, u.name as owner_name, r.title as retro_title, t.name as team_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    JOIN retrospectives r ON a.retro_id = r.id
    JOIN teams t ON r.team_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (retroId) {
    query += " AND a.retro_id = ?";
    params.push(retroId);
  }

  if (ownerId) {
    query += " AND a.owner_id = ?";
    params.push(ownerId);
  }

  if (status) {
    query += " AND a.status = ?";
    params.push(status);
  }

  if (user.role === "member") {
    query += " AND (a.owner_id = ? OR r.team_id IN (SELECT team_id FROM team_members WHERE user_id = ?))";
    params.push(user.userId, user.userId);
  }

  query += ` ORDER BY 
    CASE a.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    a.created_at DESC`;

  const items = db.prepare(query).all(...params);
  return c.json(items);
});

actions.get("/:id", (c) => {
  const db = getDb();
  const item = db.prepare(`
    SELECT a.*, u.name as owner_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.id = ?
  `).get(c.req.param("id"));

  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item);
});

actions.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const id = generateId();

  db.prepare(`
    INSERT INTO action_items (id, title, description, owner_id, due_date, priority, theme_id, retro_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parsed.data.title,
    parsed.data.description || null,
    parsed.data.owner_id || null,
    parsed.data.due_date || null,
    parsed.data.priority || "medium",
    parsed.data.theme_id || null,
    parsed.data.retro_id
  );

  const item = db.prepare(`
    SELECT a.*, u.name as owner_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.id = ?
  `).get(id);

  return c.json(item, 201);
});

actions.put("/:id", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  db.prepare(`
    UPDATE action_items SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      owner_id = COALESCE(?, owner_id),
      due_date = COALESCE(?, due_date),
      priority = COALESCE(?, priority),
      status = COALESCE(?, status),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.title,
    body.description,
    body.owner_id,
    body.due_date,
    body.priority,
    body.status,
    c.req.param("id")
  );

  const item = db.prepare(`
    SELECT a.*, u.name as owner_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.id = ?
  `).get(c.req.param("id"));

  return c.json(item);
});

actions.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("DELETE FROM action_items WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { actions };
