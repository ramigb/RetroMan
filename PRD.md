Here is a cleaned-up, highly structured version of your Product Requirements Document (PRD). It is organized logically so that an AI coding agent can easily digest the architecture, data models, user flows, and technical requirements.

---

# Product Requirements Document: Team Retrospectives

## 1. Project Overview

**Product Name:** Team Retrospectives
**Target Audience:** Product Development Teams
**Purpose:** An internal web application designed to facilitate structured retrospectives and continuous improvement sessions.
**Core Value Proposition:** Build a tool that product teams *actually want to use*. It must feel fast, simple, and collaborative, completely avoiding heavy processes or a rigid "corporate HR system" feel.

### Core Goals

* **Maximize Participation:** Engage everyone, especially quieter team members.
* **Psychological Safety:** Support fully anonymous input.
* **Action-Oriented:** Turn discussions into concrete, trackable actions.
* **Knowledge Retention:** Preserve history, track trends, and surface recurring themes over time.
* **Flexibility:** Support both live (synchronous) and offline (asynchronous) retrospective formats.

---

## 2. UI/UX & Design Principles

* **Vibe:** Modern, clean, minimalistic, friendly, and highly responsive.
* **Layout:** Desktop-first with a fluid, distraction-free interface.
* **Theming:** Dark/Light mode support.
* **Interactions:** Heavy emphasis on intuitive Drag-and-Drop functionality (especially for retro notes and clustering).
* **Real-time Feel:** Instant updates across clients without page reloads.

---

## 3. Technology Stack

* **Frontend:** React, TypeScript
* **Backend/Database:** SQLite (Relational structure)
* **Real-time:** WebSockets (for live collaboration, voting, and note dragging)

---

## 4. User Roles & Authentication

* **Authentication:** Email/Password login. Users are assigned to a Team after login.
* **Roles:**
* **Admin:** Manages organizations, teams, and global settings.
* **Team Lead / Facilitator:** Can create/configure retrospectives, manage phases, and invite members.
* **Team Member:** Can participate, add notes, vote, and own action items.



---

## 5. Data Architecture (Core Entities)

| Entity | Attributes |
| --- | --- |
| **Organization** | `id`, `name` |
| **Team** | `id`, `name`, `members` (relation), `team_lead_id`, `product_area`, `org_id` |
| **Retrospective** | `id`, `title`, `sprint_cycle_name`, `start_date`, `end_date`, `status` (Draft, Open, Discussion, Completed), `team_id` |
| **Feedback Item** | `id`, `text`, `is_anonymous` (boolean), `author_id` (nullable), `created_at`, `category` (Went well, Problems, etc.), `retro_id`, `theme_id` (nullable) |
| **Theme** | `id`, `name`, `retro_id`, `vote_count` |
| **Action Item** | `id`, `title`, `description`, `owner_id`, `due_date`, `priority`, `status` (Open, In Progress, Done), `theme_id` |

---

## 6. Core User Flows & App State

### Phase 1: Creation (Facilitator)

* Select target team and retro template.
* Configure phase timings and define voting rules (e.g., max votes per user).
* Toggle anonymous mode on/off.
* Invite participants via link or direct notification.

### Phase 2: Feedback Collection (Live or Async)

* **UI:** Sticky-note style board.
* **Default Categories:** Went well, Problems, Ideas, Risks, Kudos.
* **Member Actions:** Add notes privately, edit own notes, add tags, and submit notes asynchronously prior to the live meeting.

### Phase 3: Theme Clustering (Collaborative)

* **Interactions:** Drag-and-drop notes onto each other to group them.
* **Theme Management:** Merge related feedback items and assign a Theme Name.

### Phase 4: Voting

* **Member Actions:** Vote on clustered themes to prioritize discussion.
* **Constraints:** Limited number of votes per user.
* **Anonymity:** Votes remain hidden until the phase ends.

### Phase 5: Discussion & Action Generation

* **Facilitator Actions:** Open one prioritized theme at a time.
* **Collaboration:** Capture live discussion notes.
* **Action Creation:** Generate distinct `Action Items` directly from the discussed themes, assigning an owner, due date, priority, and status.

---

## 7. Dashboards & Analytics

### Organization Dashboard

* Total number of retrospectives held.
* Total open action items and global completion rate.
* High-level trends over time.

### Team Dashboard

* Sprint/cycle history.
* Action item completion rate per team.
* Participation rates (number of items/votes per retro).
* **Heatmap:** Visual representation of recurring issues or themes.

### Analytics Insights

* Top recurring issues/bottlenecks.
* Teams with historically low participation.
* Repeated action items (actions created but never resolved).
* Overall delivery and morale trends.

---

## 8. AI Capabilities

To be integrated as background tasks or on-demand facilitator tools:

* **Auto-clustering:** Group similar feedback items automatically.
* **Theme Naming:** Suggest concise titles for grouped sticky notes.
* **Summarization:** Generate a post-retro summary and an executive summary for leadership.
* **Action Suggestions:** Recommend concrete action items based on the context of a theme.
* **Pattern Recognition:** Detect recurring problems or "Top Risks" across historical retrospectives and flag them to the Facilitator.

---

## 9. Built-in Templates

Provide out-of-the-box configurations for standard retro formats, plus a **Custom Template Builder**:

1. Start / Stop / Continue
2. Mad / Sad / Glad
3. 4Ls (Liked, Learned, Lacked, Longed for)
4. Sailboat (Wind, Anchors, Rocks, Sun)
5. Sprint Health Check

---

## 10. Development & Implementation Requirements

* **Demo Readiness:** The application must include a seed script to populate a database with demo Organizations, Teams, historical Retrospectives, and generated analytics to test UI states immediately.
* **State Management:** Ensure robust state management for the WebSocket transitions between phases (Draft -> Open -> Discussion -> Completed) so all connected clients stay perfectly in sync.