import { Hono } from "hono";
import { z } from "zod";
import { getDb } from "../db.js";
import { authMiddleware, facilitatorMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const teams = new Hono();
teams.use("/*", authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  product_area: z.string().optional(),
  org_id: z.string(),
  member_ids: z.array(z.string()).optional(),
});

teams.get("/", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  if (user.role === "admin") {
    const allTeams = db.prepare(`
      SELECT t.*, u.name as team_lead_name 
      FROM teams t 
      LEFT JOIN users u ON t.team_lead_id = u.id 
      ORDER BY t.created_at DESC
    `).all();
    return c.json(allTeams);
  }

  const userTeams = db.prepare(`
    SELECT t.*, u.name as team_lead_name 
    FROM teams t 
    LEFT JOIN users u ON t.team_lead_id = u.id
    JOIN team_members tm ON t.id = tm.team_id 
    WHERE tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(user.userId);

  return c.json(userTeams);
});

teams.get("/:id", (c) => {
  const db = getDb();
  const team = db.prepare(`
    SELECT t.*, u.name as team_lead_name 
    FROM teams t 
    LEFT JOIN users u ON t.team_lead_id = u.id 
    WHERE t.id = ?
  `).get(c.req.param("id"));

  if (!team) return c.json({ error: "Not found" }, 404);

  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.role 
    FROM users u 
    JOIN team_members tm ON u.id = tm.user_id 
    WHERE tm.team_id = ?
  `).all(c.req.param("id"));

  return c.json({ ...(team as any), members });
});

teams.post("/", facilitatorMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid input" }, 400);

  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const id = generateId();

  db.prepare(
    "INSERT INTO teams (id, name, product_area, team_lead_id, org_id) VALUES (?, ?, ?, ?, ?)"
  ).run(id, parsed.data.name, parsed.data.product_area || null, user.userId, parsed.data.org_id);

  if (parsed.data.member_ids?.length) {
    const insertMember = db.prepare("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)");
    for (const memberId of parsed.data.member_ids) {
      insertMember.run(id, memberId);
    }
  }

  db.prepare("INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)").run(id, user.userId);

  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(id);
  return c.json(team, 201);
});

teams.put("/:id", facilitatorMiddleware, async (c) => {
  const body = await c.req.json();
  const db = getDb();

  if (body.name !== undefined || body.product_area !== undefined || body.team_lead_id !== undefined) {
    db.prepare(
      "UPDATE teams SET name = COALESCE(?, name), product_area = COALESCE(?, product_area), team_lead_id = COALESCE(?, team_lead_id) WHERE id = ?"
    ).run(body.name, body.product_area, body.team_lead_id, c.req.param("id"));
  }

  if (body.member_ids) {
    db.prepare("DELETE FROM team_members WHERE team_id = ?").run(c.req.param("id"));
    const insertMember = db.prepare("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)");
    for (const memberId of body.member_ids) {
      insertMember.run(c.req.param("id"), memberId);
    }
  }

  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(c.req.param("id"));
  return c.json(team);
});

teams.delete("/:id", facilitatorMiddleware, (c) => {
  const db = getDb();
  db.prepare("DELETE FROM teams WHERE id = ?").run(c.req.param("id"));
  return c.json({ success: true });
});

teams.get("/:id/members", (c) => {
  const db = getDb();
  const members = db.prepare(`
    SELECT u.id, u.email, u.name, u.role 
    FROM users u 
    JOIN team_members tm ON u.id = tm.user_id 
    WHERE tm.team_id = ?
  `).all(c.req.param("id"));
  return c.json(members);
});

export { teams };
