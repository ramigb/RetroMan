import { Hono } from "hono";
import { getDb } from "../db.js";
import { authMiddleware, facilitatorMiddleware, JwtPayload } from "../auth.js";

const users = new Hono();
users.use("/*", authMiddleware);

users.get("/", facilitatorMiddleware, (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  let query = "SELECT id, email, name, role, org_id FROM users";
  const params: any[] = [];

  if (user.role !== "admin") {
    const userRow = db.prepare("SELECT org_id FROM users WHERE id = ?").get(user.userId) as any;
    if (userRow?.org_id) {
      query += " WHERE org_id = ?";
      params.push(userRow.org_id);
    }
  }

  query += " ORDER BY name";

  const allUsers = db.prepare(query).all(...params);
  return c.json(allUsers);
});

export { users };
