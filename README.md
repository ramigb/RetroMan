# Retroman

A modern, collaborative team retrospectives platform built for product development teams. Facilitate structured retros that are fast, simple, and engaging — no heavy processes or corporate feel.

## Features

### Core Retrospective Flow
Six-phase workflow that guides teams from feedback collection to actionable outcomes:

1. **Draft** — Facilitator creates and configures the retro (team, template, voting rules)
2. **Open** — Team members add anonymous or attributed feedback into category columns
3. **Grouping** — Facilitator clusters related feedback into named themes via drag-and-drop
4. **Voting** — Team votes on themes to prioritize discussion (limited votes per person)
5. **Discussion** — Discuss top-voted themes, capture live notes, create action items
6. **Completed** — Retro is closed; action items remain trackable

### Feedback Board
- Inline "+" button per column to add notes directly
- Drag-and-drop notes between columns to change category
- Category labels on every note for context during grouping
- Anonymous or attributed posting

### Theme Clustering
- Drag unassigned notes onto theme cards to group them
- Drag notes between themes to reorganize
- Double-click or edit button to rename themes inline
- AI-powered auto-clustering groups feedback by category and keyword analysis

### Voting
- Configurable vote limit per user
- One vote per theme, toggleable
- Real-time vote count updates via WebSocket

### Action Items
- Create from any discussed theme
- Assign owner, priority (low/medium/high/critical), and due date
- Track status: Open → In Progress → Done
- Global action items view across all retros

### Real-time Collaboration
- WebSocket-powered live updates across all connected clients
- Members tab shows who's online in the retro room
- Green/gray presence indicators

### Dashboards & Analytics
- **Organization dashboard** — Total retros, open actions, completion rate, top themes
- **Team dashboard** — Sprint history, participation rates, recurring issues heatmap
- **Analytics page** — Recurring bottlenecks, low-participation teams, unresolved actions, monthly trends

### AI Capabilities
- **Auto-clustering** — Groups unassigned feedback by category and keyword frequency
- **Theme naming** — Suggests concise names from shared keywords
- **Summarization** — Generates executive summary with theme breakdown and action stats
- **Action suggestions** — Recommends concrete actions based on theme context
- **Pattern recognition** — Detects recurring issues across historical retrospectives

### Templates
Six built-in retro templates:
- Start / Stop / Continue
- Mad / Sad / Glad
- 4Ls (Liked, Learned, Lacked, Longed For)
- Sailboat (Wind, Anchors, Rocks, Sun)
- Sprint Health Check
- Default (Went Well, Problems, Ideas, Risks, Kudos)

Custom template builder for creating your own category sets.

### Team Management
- Admin/facilitator can create teams and manage members
- Add/remove members via dedicated dialog
- Role-based access: Admin, Facilitator, Member

### Other
- Dark/light mode toggle
- Responsive sidebar navigation
- JWT cookie-based authentication with persistent sessions
- Direct retro link sharing — team members can join via URL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI primitives |
| Backend | Hono (Node.js) |
| Database | SQLite (better-sqlite3) |
| Real-time | WebSockets (@hono/node-ws) |
| Auth | JWT (httpOnly cookies), bcrypt |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & Run

```bash
npm install
npm run seed    # populate database with demo data
npm run dev     # starts server (port 3001) and web (port 5173)
```

The app will be available at **http://localhost:5173**

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@retroman.dev | password123 | Admin |
| lead@acme.com | password123 | Facilitator |
| member1@retroman.dev | password123 | Member |

### Build for Production

```bash
npm run build
```

## Project Structure

```
retroman/
├── server/
│   └── src/
│       ├── index.ts          # Hono app, WebSocket setup, route mounting
│       ├── db.ts             # SQLite connection and schema
│       ├── auth.ts           # JWT signing, verification, middleware
│       ├── utils.ts          # ID generation
│       ├── seed.ts           # Demo data seeder
│       ├── seed-templates.ts # Built-in template seeder
│       └── routes/
│           ├── auth.ts       # Login, register, logout, /me
│           ├── orgs.ts       # Organization CRUD
│           ├── teams.ts      # Team CRUD, member management
│           ├── retros.ts     # Retrospective CRUD, phase advancement
│           ├── feedback.ts   # Feedback item CRUD
│           ├── themes.ts     # Theme CRUD, merge
│           ├── votes.ts      # Vote create/delete
│           ├── actions.ts    # Action item CRUD
│           ├── templates.ts  # Template CRUD
│           ├── discussion.ts # Discussion notes
│           ├── dashboard.ts  # Org/team/analytics endpoints
│           ├── ai.ts         # Auto-cluster, summarize, patterns
│           └── users.ts      # User listing
├── web/
│   └── src/
│       ├── main.tsx          # React entry point
│       ├── App.tsx           # Router, protected routes
│       ├── index.css         # Tailwind + CSS variables (dark/light)
│       ├── lib/
│       │   ├── api.ts        # API client
│       │   ├── auth.tsx      # Auth context provider
│       │   ├── types.ts      # TypeScript interfaces
│       │   ├── utils.ts      # cn() utility
│       │   └── websocket.ts  # WebSocket hook
│       ├── components/
│       │   ├── Layout.tsx    # Sidebar, header, dark mode
│       │   └── ui/           # shadcn/ui components
│       └── pages/
│           ├── LoginPage.tsx
│           ├── DashboardPage.tsx
│           ├── TeamsPage.tsx
│           ├── RetrosPage.tsx
│           ├── RetroBoardPage.tsx  # Main retro board (all phases)
│           ├── ActionsPage.tsx
│           └── AnalyticsPage.tsx
└── package.json              # Workspace root
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/auth/me | Get current user |
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/teams | List teams |
| POST | /api/teams | Create team |
| PUT | /api/teams/:id | Update team / members |
| GET | /api/retros | List retrospectives |
| POST | /api/retros | Create retrospective |
| POST | /api/retros/:id/advance | Advance to next phase |
| GET/POST/PUT/DELETE | /api/feedback | Feedback CRUD |
| GET/POST/PUT/DELETE | /api/themes | Theme CRUD |
| POST/DELETE | /api/votes | Vote/unvote |
| GET/POST/PUT/DELETE | /api/actions | Action item CRUD |
| GET | /api/dashboard/org | Org dashboard data |
| GET | /api/dashboard/team/:id | Team dashboard data |
| GET | /api/dashboard/analytics | Analytics data |
| POST | /api/ai/auto-cluster | AI auto-clustering |
| POST | /api/ai/summarize | AI retro summary |
| GET | /api/retros/:id/online-users | Online users in retro |
| WS | /ws/retro/:id | Real-time retro updates |

## License

Internal use.
