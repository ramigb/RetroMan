import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { authMiddleware } from "./auth.js";
import { auth } from "./routes/auth.js";
import { orgs } from "./routes/orgs.js";
import { teams } from "./routes/teams.js";
import { retros } from "./routes/retros.js";
import { feedback } from "./routes/feedback.js";
import { themes } from "./routes/themes.js";
import { votes } from "./routes/votes.js";
import { actions } from "./routes/actions.js";
import { templates } from "./routes/templates.js";
import { discussion } from "./routes/discussion.js";
import { dashboard } from "./routes/dashboard.js";
import { ai } from "./routes/ai.js";
import { users } from "./routes/users.js";
import { getDb } from "./db.js";
import { seedBuiltinTemplates } from "./seed-templates.js";

const app = new Hono();
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });

app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/auth", auth);
app.route("/api/orgs", orgs);
app.route("/api/teams", teams);
app.route("/api/retros", retros);
app.route("/api/feedback", feedback);
app.route("/api/themes", themes);
app.route("/api/votes", votes);
app.route("/api/actions", actions);
app.route("/api/templates", templates);
app.route("/api/discussion", discussion);
app.route("/api/dashboard", dashboard);
app.route("/api/ai", ai);
app.route("/api/users", users);

const retroSockets = new Map<string, Map<string, any>>();

app.get(
  "/ws/retro/:id",
  upgradeWebSocket((c) => {
    const retroId = c.req.param("id") || "";
    const userId = c.req.query("userId") || "anonymous";

    return {
      onOpen(_evt, ws) {
        if (!retroSockets.has(retroId)) {
          retroSockets.set(retroId, new Map());
        }
        retroSockets.get(retroId)!.set(userId, ws);
        
        broadcastUsers(retroId);
      },
      onMessage(evt, ws) {
        try {
          const data = JSON.parse(evt.data as string);
          const clients = retroSockets.get(retroId);
          if (clients) {
            for (const client of clients.values()) {
              if (client !== ws) {
                client.send(JSON.stringify(data));
              }
            }
          }
        } catch (e) {
          console.error("WebSocket message error:", e);
        }
      },
      onClose(_evt, ws) {
        const clients = retroSockets.get(retroId);
        if (clients) {
          clients.delete(userId);
          broadcastUsers(retroId);
        }
      },
    };
  })
);

function broadcastUsers(retroId: string) {
  const clients = retroSockets.get(retroId);
  if (!clients) return;
  
  const userIds = Array.from(clients.keys()).filter(id => id !== 'anonymous');
  const message = JSON.stringify({ type: 'users', userIds });
  
  for (const client of clients.values()) {
    client.send(message);
  }
}

app.get("/api/retros/:id/online-users", authMiddleware, (c) => {
  const retroId = c.req.param("id");
  const clients = retroSockets.get(retroId);
  const userIds = clients ? Array.from(clients.keys()).filter(id => id !== 'anonymous') : [];
  return c.json({ userIds });
});

getDb();
seedBuiltinTemplates();

const port = parseInt(process.env.PORT || "3001");

const server = serve({ fetch: app.fetch, port });
injectWebSocket(server);

console.log(`Server running on http://localhost:${port}`);
