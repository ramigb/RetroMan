import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const templates = new Hono();
templates.use("/*", authMiddleware);

templates.get("/", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  const builtin = db.prepare("SELECT * FROM retro_templates WHERE is_builtin = 1").all();

  let custom: any[] = [];
  if (user.role === "admin") {
    custom = db.prepare("SELECT * FROM retro_templates WHERE is_builtin = 0").all() as any[];
  } else {
    const userRow = db.prepare("SELECT org_id FROM users WHERE id = ?").get(user.userId) as any;
    if (userRow?.org_id) {
      custom = db.prepare("SELECT * FROM retro_templates WHERE is_builtin = 0 AND org_id = ?").all(userRow.org_id) as any[];
    }
  }

  return c.json([...builtin, ...custom]);
});

templates.get("/:id", (c) => {
  const db = getDb();
  const template = db.prepare("SELECT * FROM retro_templates WHERE id = ?").get(c.req.param("id"));
  if (!template) return c.json({ error: "Not found" }, 404);
  return c.json(template);
});

templates.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    categories: z.string(),
    org_id: z.string().optional(),
  }).safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const id = generateId();

  db.prepare("INSERT INTO retro_templates (id, name, description, categories, is_builtin, org_id) VALUES (?, ?, ?, ?, 0, ?)").run(
    id,
    parsed.data.name,
    parsed.data.description || null,
    parsed.data.categories,
    parsed.data.org_id || null
  );

  const template = db.prepare("SELECT * FROM retro_templates WHERE id = ?").get(id);
  return c.json(template, 201);
});

templates.delete("/:id", (c) => {
  const db = getDb();
  const template = db.prepare("SELECT * FROM retro_templates WHERE id = ?").get(c.req.param("id")) as any;
  if (!template) return c.json({ error: "Not found" }, 404);
  if (template.is_builtin) return c.json({ error: "Cannot delete built-in template" }, 400);

  db.prepare("DELETE FROM retro_templates WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { templates };
