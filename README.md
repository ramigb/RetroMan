# Retroman

Retroman is a collaborative retrospective app for product teams that want useful conversations, not another stiff process tool. It supports live and async retros, anonymous feedback, drag-and-drop grouping, voting, discussion notes, action tracking, team management, analytics, and AI-assisted summaries.

The current UI leans into a muted retro-arcade style: chunky outlines, compact screens, strong typography, and fast board interactions.

## Highlights

- Structured six-phase retro flow from draft to completed outcomes
- Anonymous or attributed feedback collection
- Sticky-note board with category columns and drag-and-drop movement
- Theme grouping with editable theme cards and AI auto-clustering
- Prioritized voting with per-user vote limits
- Live collaboration through WebSockets and online presence
- Discussion notes and action items tied back to themes
- Global action item tracking across retrospectives
- Organization dashboard and analytics for recurring patterns
- Built-in templates for common retro formats
- Role-based access for admins, facilitators, and members

## Product Flow

Retroman guides a retro through a practical workflow:

| Phase | Purpose |
| --- | --- |
| Draft | Facilitator creates the retro, picks the team/template, and configures voting. |
| Open | Team members add anonymous or attributed notes to category columns. |
| Grouping | Facilitator clusters related feedback into themes. |
| Voting | Participants vote on themes to prioritize the discussion. |
| Discussion | The team works through top themes and captures notes/actions. |
| Completed | The retro closes, while action items remain trackable. |

## Built-In Templates

- Start / Stop / Continue
- Mad / Sad / Glad
- 4Ls: Liked, Learned, Lacked, Longed For
- Sailboat: Wind, Anchors, Rocks, Sun
- Sprint Health Check
- Default: Went Well, Problems, Ideas, Risks, Kudos

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI primitives, reusable UI components |
| Backend | Hono on Node.js |
| Database | SQLite with better-sqlite3 |
| Realtime | WebSockets via @hono/node-ws |
| Auth | JWT in httpOnly cookies, bcrypt password hashing |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Seed Demo Data

```bash
npm run seed
```

This creates demo users, teams, retrospectives, templates, and analytics-ready data.

### Run The App

```bash
npm run dev
```

The development servers run at:

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API server | http://localhost:3001 |
| Health check | http://localhost:3001/health |

Vite proxies `/api` and `/ws` requests to the backend.

## Demo Accounts

| Email | Password | Role |
| --- | --- | --- |
| admin@retroman.dev | password123 | Admin |
| lead@acme.com | password123 | Facilitator |
| member1@retroman.dev | password123 | Member |

## Useful Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start web and API servers together. |
| `npm run dev:web` | Start only the Vite frontend. |
| `npm run dev:server` | Start only the Hono API server. |
| `npm run seed` | Populate SQLite with demo data. |
| `npm run build` | Build frontend and backend packages. |

## Project Structure

```text
retroman/
├── server/
│   ├── src/
│   │   ├── index.ts          # Hono app, CORS, routes, WebSocket setup
│   │   ├── db.ts             # SQLite connection and schema
│   │   ├── auth.ts           # JWT helpers and auth middleware
│   │   ├── seed.ts           # Demo data seeder
│   │   ├── seed-templates.ts # Built-in retro templates
│   │   └── routes/           # REST API route modules
│   └── package.json
├── web/
│   ├── src/
│   │   ├── App.tsx           # Router and protected/public routes
│   │   ├── main.tsx          # React entry point
│   │   ├── index.css         # Tailwind layers and theme tokens
│   │   ├── lib/              # API client, auth context, types, sockets
│   │   ├── components/       # App shell and reusable UI primitives
│   │   └── pages/            # Login, dashboard, board, teams, actions
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── PRD.md
├── package.json
└── README.md
```

## API Overview

| Area | Endpoints |
| --- | --- |
| Auth | `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` |
| Organizations | `/api/orgs` |
| Teams | `/api/teams`, `/api/teams/:id/members` |
| Retrospectives | `/api/retros`, `/api/retros/:id`, `/api/retros/:id/advance` |
| Feedback | `/api/feedback`, `/api/feedback/:id` |
| Themes | `/api/themes`, `/api/themes/:id`, `/api/themes/:id/merge` |
| Voting | `/api/votes`, `/api/votes/:themeId` |
| Discussion | `/api/discussion` |
| Actions | `/api/actions`, `/api/actions/:id` |
| Templates | `/api/templates`, `/api/templates/:id` |
| Dashboards | `/api/dashboard/org`, `/api/dashboard/team/:id`, `/api/dashboard/analytics` |
| AI helpers | `/api/ai/auto-cluster`, `/api/ai/summarize`, `/api/ai/suggest-actions`, `/api/ai/patterns/:teamId` |
| Presence | `/api/retros/:id/online-users`, `/ws/retro/:id` |

## Configuration Notes

- The API defaults to port `3001`.
- The frontend defaults to Vite's port `5173`.
- Set `PORT` to change the backend port.
- Set `JWT_SECRET` in production. The development fallback is intentionally not suitable for deployment.
- Auth cookies are marked `secure` when `NODE_ENV=production`.

## Development Notes

- The backend seeds built-in templates when the server starts.
- The main retro board lives in `web/src/pages/RetroBoardPage.tsx`.
- Shared UI styling is centralized in `web/src/components/ui` and `web/src/index.css`.
- The frontend API client lives in `web/src/lib/api.ts`.
- Realtime retro updates are handled by `web/src/lib/websocket.ts` and `/ws/retro/:id`.

## Production Build

```bash
npm run build
```

The frontend build is emitted from `web`, and the backend TypeScript output is emitted from `server`.

## License

Internal use.
