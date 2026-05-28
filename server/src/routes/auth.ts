import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "../db.js";
import { signToken, verifyToken } from "../auth.js";
import { generateId } from "../utils.js";

const auth = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

auth.get("/me", (c) => {
  const token = getCookie(c, "token");
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  try {
    const payload = verifyToken(token);
    const db = getDb();
    const user = db.prepare("SELECT id, email, name, role, org_id FROM users WHERE id = ?").get(payload.userId) as any;
    
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    return c.json(user);
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
});

auth.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
  }

  const { email, password, name } = parsed.data;
  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare("INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)").run(
    id,
    email,
    passwordHash,
    name,
    "member"
  );

  const token = signToken({ userId: id, email, role: "member" });
  setCookie(c, "token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return c.json({ id, email, name, role: "member" }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input" }, 400);
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  setCookie(c, "token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    org_id: user.org_id,
  });
});

auth.post("/logout", (c) => {
  deleteCookie(c, "token", { path: "/" });
  return c.json({ success: true });
});

export { auth };
