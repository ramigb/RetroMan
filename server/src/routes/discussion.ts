import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const discussion = new Hono();
discussion.use("/*", authMiddleware);

discussion.get("/", (c) => {
  const db = getDb();
  const themeId = c.req.query("theme_id");
  if (!themeId) return c.json({ error: "theme_id required" }, 400);

  const notes = db.prepare(`
    SELECT d.*, u.name as author_name
    FROM discussion_notes d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.theme_id = ?
    ORDER BY d.created_at ASC
  `).all(themeId);

  return c.json(notes);
});

discussion.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({
    text: z.string().min(1),
    theme_id: z.string(),
    retro_id: z.string(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const id = generateId();

  db.prepare("INSERT INTO discussion_notes (id, text, author_id, theme_id, retro_id) VALUES (?, ?, ?, ?, ?)").run(
    id,
    parsed.data.text,
    user.userId,
    parsed.data.theme_id,
    parsed.data.retro_id
  );

  const note = db.prepare(`
    SELECT d.*, u.name as author_name
    FROM discussion_notes d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.id = ?
  `).get(id);

  return c.json(note, 201);
});

discussion.delete("/:id", (c) => {
  const db = getDb();
  db.prepare("DELETE FROM discussion_notes WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { discussion };
