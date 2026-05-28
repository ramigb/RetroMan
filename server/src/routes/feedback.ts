import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const feedback = new Hono();
feedback.use("/*", authMiddleware);

const createSchema = z.object({
  text: z.string().min(1),
  is_anonymous: z.boolean().optional(),
  category: z.string().min(1),
  retro_id: z.string(),
});

feedback.get("/", (c) => {
  const db = getDb();
  const retroId = c.req.query("retro_id");
  const themeId = c.req.query("theme_id");

  if (!retroId) return c.json({ error: "retro_id required" }, 400);

  let query = `
    SELECT f.*, 
      CASE WHEN f.is_anonymous = 1 THEN NULL ELSE u.name END as author_name
    FROM feedback_items f
    LEFT JOIN users u ON f.author_id = u.id
    WHERE f.retro_id = ?
  `;
  const params: any[] = [retroId];

  if (themeId) {
    query += " AND f.theme_id = ?";
    params.push(themeId);
  }

  query += " ORDER BY f.created_at ASC";

  const items = db.prepare(query).all(...params);
  return c.json(items);
});

feedback.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const id = generateId();

  db.prepare(`
    INSERT INTO feedback_items (id, text, is_anonymous, category, author_id, retro_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    parsed.data.text,
    parsed.data.is_anonymous !== undefined ? (parsed.data.is_anonymous ? 1 : 0) : 1,
    parsed.data.category,
    user.userId,
    parsed.data.retro_id
  );

  const item = db.prepare(`
    SELECT f.*, 
      CASE WHEN f.is_anonymous = 1 THEN NULL ELSE u.name END as author_name
    FROM feedback_items f
    LEFT JOIN users u ON f.author_id = u.id
    WHERE f.id = ?
  `).get(id);

  return c.json(item, 201);
});

feedback.put("/:id", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  const existing = db.prepare("SELECT * FROM feedback_items WHERE id = ?").get(c.req.param("id")) as any;
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.author_id !== user.userId && user.role !== "admin" && user.role !== "facilitator") {
    return c.json({ error: "Forbidden" }, 403);
  }

  db.prepare(`
    UPDATE feedback_items SET
      text = COALESCE(?, text),
      is_anonymous = COALESCE(?, is_anonymous),
      category = COALESCE(?, category),
      theme_id = COALESCE(?, theme_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    body.text,
    body.is_anonymous !== undefined ? (body.is_anonymous ? 1 : 0) : null,
    body.category,
    body.theme_id !== undefined ? body.theme_id : null,
    c.req.param("id")
  );

  const item = db.prepare(`
    SELECT f.*, 
      CASE WHEN f.is_anonymous = 1 THEN NULL ELSE u.name END as author_name
    FROM feedback_items f
    LEFT JOIN users u ON f.author_id = u.id
    WHERE f.id = ?
  `).get(c.req.param("id"));

  return c.json(item);
});

feedback.delete("/:id", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  const existing = db.prepare("SELECT * FROM feedback_items WHERE id = ?").get(c.req.param("id")) as any;
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (existing.author_id !== user.userId && user.role !== "admin" && user.role !== "facilitator") {
    return c.json({ error: "Forbidden" }, 403);
  }

  db.prepare("DELETE FROM feedback_items WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { feedback };
