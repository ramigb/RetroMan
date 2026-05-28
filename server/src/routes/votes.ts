import { Hono } from "hono";
import { getDb } from "../db.js";
import { authMiddleware, JwtPayload } from "../auth.js";
import { generateId } from "../utils.js";

const votes = new Hono();
votes.use("/*", authMiddleware);

votes.get("/", (c) => {
  const db = getDb();
  const retroId = c.req.query("retro_id");
  const user = c.get("user") as JwtPayload;

  if (!retroId) return c.json({ error: "retro_id required" }, 400);

  const userVotes = db.prepare("SELECT * FROM votes WHERE retro_id = ? AND user_id = ?").all(
    retroId,
    user.userId
  );

  return c.json(userVotes);
});

votes.post("/", async (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;

  const body = await c.req.json() as any;
  const { theme_id, retro_id } = body;

  if (!theme_id || !retro_id) return c.json({ error: "theme_id and retro_id required" }, 400);

  const retro = db.prepare("SELECT max_votes_per_user FROM retrospectives WHERE id = ?").get(retro_id) as any;
  if (!retro) return c.json({ error: "Retro not found" }, 404);

  const theme = db.prepare("SELECT id FROM themes WHERE id = ? AND retro_id = ?").get(theme_id, retro_id);
  if (!theme) return c.json({ error: "Theme not found for retro" }, 404);

  const currentVotes = db.prepare("SELECT COUNT(*) as count FROM votes WHERE retro_id = ? AND user_id = ?").get(
    retro_id,
    user.userId
  ) as any;

  if (currentVotes.count >= retro.max_votes_per_user) {
    return c.json({ error: "Vote limit reached" }, 400);
  }

  const id = generateId();
  db.prepare("INSERT INTO votes (id, user_id, theme_id, retro_id) VALUES (?, ?, ?, ?)").run(
    id,
    user.userId,
    theme_id,
    retro_id
  );

  db.prepare("UPDATE themes SET vote_count = (SELECT COUNT(*) FROM votes WHERE theme_id = ?) WHERE id = ?").run(
    theme_id,
    theme_id
  );

  return c.json({ id, theme_id, retro_id }, 201);
});

votes.delete("/:themeId", (c) => {
  const db = getDb();
  const user = c.get("user") as JwtPayload;
  const themeId = c.req.param("themeId");

  const vote = db.prepare(
    "SELECT id FROM votes WHERE user_id = ? AND theme_id = ? ORDER BY created_at DESC, id DESC LIMIT 1"
  ).get(user.userId, themeId) as any;

  if (!vote) return c.json({ error: "No vote found" }, 404);

  db.prepare("DELETE FROM votes WHERE id = ?").run(vote.id);

  db.prepare("UPDATE themes SET vote_count = (SELECT COUNT(*) FROM votes WHERE theme_id = ?) WHERE id = ?").run(
    themeId,
    themeId
  );

  return c.json({ success: true });
});

export { votes };
