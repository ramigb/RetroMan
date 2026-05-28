import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "retroman-secret-key-change-in-production";

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, "token") || c.req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = verifyToken(token);
    c.set("user", payload);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user") as JwtPayload;
  if (user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
}

export async function facilitatorMiddleware(c: Context, next: Next) {
  const user = c.get("user") as JwtPayload;
  if (user.role !== "admin" && user.role !== "facilitator") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
}
