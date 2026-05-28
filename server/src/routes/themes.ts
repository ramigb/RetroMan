import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const themes = new Hono();
themes.use("/*", authMiddleware);

themes.get("/", (c) => {
  const db = getDb();
  const retroId = c.req.query("retro_id");
  if (!retroId) return c.json({ error: "retro_id required" }, 400);

  const items = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM votes WHERE theme_id = t.id) as vote_count,
      (SELECT COUNT(*) FROM feedback_items WHERE theme_id = t.id) as item_count
    FROM themes t
    WHERE t.retro_id = ?
    ORDER BY t.vote_count DESC
  `).all(retroId);

  return c.json(items);
});

themes.get("/:id", (c) => {
  const db = getDb();
  const theme = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM votes WHERE theme_id = t.id) as vote_count,
      (SELECT COUNT(*) FROM feedback_items WHERE theme_id = t.id) as item_count
    FROM themes t
    WHERE t.id = ?
  `).get(c.req.param("id"));

  if (!theme) return c.json({ error: "Not found" }, 404);

  const feedbackItems = db.prepare(`
    SELECT f.*, 
      CASE WHEN f.is_anonymous = 1 THEN NULL ELSE u.name END as author_name
    FROM feedback_items f
    LEFT JOIN users u ON f.author_id = u.id
    WHERE f.theme_id = ?
  `).all(c.req.param("id"));

  const discussionNotes = db.prepare(`
    SELECT d.*, u.name as author_name
    FROM discussion_notes d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.theme_id = ?
    ORDER BY d.created_at ASC
  `).all(c.req.param("id"));

  const actions = db.prepare(`
    SELECT a.*, u.name as owner_name
    FROM action_items a
    LEFT JOIN users u ON a.owner_id = u.id
    WHERE a.theme_id = ?
  `).all(c.req.param("id"));

  return c.json({ ...(theme as any), feedback: feedbackItems, discussion_notes: discussionNotes, actions });
});

themes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({ name: z.string().min(1), retro_id: z.string() }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const id = generateId();

  db.prepare("INSERT INTO themes (id, name, retro_id) VALUES (?, ?, ?)").run(
    id,
    parsed.data.name,
    parsed.data.retro_id
  );

  const theme = db.prepare("SELECT * FROM themes WHERE id = ?").get(id);
  return c.json(theme, 201);
});

themes.put("/:id", async (c) => {
  const body = await c.req.json();
  const db = getDb();

  db.prepare("UPDATE themes SET name = COALESCE(?, name) WHERE id = ?").run(
    body.name,
    c.req.param("id")
  );

  const theme = db.prepare("SELECT * FROM themes WHERE id = ?").get(c.req.param("id"));
  return c.json(theme);
});

themes.post("/:id/merge", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({ source_theme_ids: z.array(z.string()) }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const targetId = c.req.param("id");

  const updateFeedback = db.prepare("UPDATE feedback_items SET theme_id = ? WHERE theme_id = ?");
  for (const sourceId of parsed.data.source_theme_ids) {
    updateFeedback.run(targetId, sourceId);
    db.prepare("DELETE FROM themes WHERE id = ?").run(sourceId);
  }

  const theme = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM votes WHERE theme_id = t.id) as vote_count,
      (SELECT COUNT(*) FROM feedback_items WHERE theme_id = t.id) as item_count
    FROM themes t WHERE t.id = ?
  `).get(targetId);

  return c.json(theme);
});

themes.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("UPDATE feedback_items SET theme_id = NULL WHERE theme_id = ?").run(c.req.param("id"));
  db.prepare("DELETE FROM themes WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { themes };
