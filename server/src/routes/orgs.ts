import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, adminMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const orgs = new Hono();
orgs.use("/*", authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
});

orgs.get("/", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  if (user.role === "admin") {
    const orgs = db.prepare("SELECT * FROM organizations ORDER BY created_at DESC").all();
    return c.json(orgs);
  }

  const userRow = db.prepare("SELECT org_id FROM users WHERE id = ?").get(user.userId) as any;
  if (!userRow?.org_id) return c.json([]);

  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(userRow.org_id);
  return c.json(org ? [org] : []);
});

orgs.get("/:id", (c) => {
  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(c.req.param("id"));
  if (!org) return c.json({ error: "Not found" }, 404);
  return c.json(org);
});

orgs.post("/", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const id = generateId();
  db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(id, parsed.data.name);

  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(id);
  return c.json(org, 201);
});

orgs.put("/:id", adminMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  db.prepare("UPDATE organizations SET name = ? WHERE id = ?").run(parsed.data.name, c.req.param("id"));

  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(c.req.param("id"));
  return c.json(org);
});

orgs.delete("/:id", adminMiddleware, (c) => {
  const db = getDb();
  db.prepare("DELETE FROM organizations WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

export { orgs };
