import bcrypt from "bcryptjs";
import { getDb } from "./db.js";
import { seedBuiltinTemplates } from "./seed-templates.js";
import { generateId } from "./utils.js";

function seed() {
  const db = getDb();
  seedBuiltinTemplates();

  const orgCount = (db.prepare("SELECT COUNT(*) as c FROM organizations").get() as any).c;
  if (orgCount > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const org1Id = generateId();
  const org2Id = generateId();
  db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(org1Id, "Acme Corp");
  db.prepare("INSERT INTO organizations (id, name) VALUES (?, ?)").run(org2Id, "TechStart Inc");

  const hash = bcrypt.hashSync("password123", 10);

  const adminId = generateId();
  const facilitator1Id = generateId();
  const facilitator2Id = generateId();
  const members = Array.from({ length: 8 }, () => generateId());

  db.prepare("INSERT INTO users (id, email, password_hash, name, role, org_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    adminId, "admin@retroman.dev", hash, "Admin User", "admin", org1Id
  );
  db.prepare("INSERT INTO users (id, email, password_hash, name, role, org_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    facilitator1Id, "lead@acme.com", hash, "Sarah Chen", "facilitator", org1Id
  );
  db.prepare("INSERT INTO users (id, email, password_hash, name, role, org_id) VALUES (?, ?, ?, ?, ?, ?)").run(
    facilitator2Id, "lead@techstart.com", hash, "Mike Johnson", "facilitator", org2Id
  );

  const memberNames = [
    "Alex Rivera", "Jordan Lee", "Taylor Kim", "Morgan Patel",
    "Casey Brooks", "Riley Quinn", "Avery Santos", "Drew Nakamura"
  ];

  for (let i = 0; i < members.length; i++) {
    const orgId = i < 5 ? org1Id : org2Id;
    db.prepare("INSERT INTO users (id, email, password_hash, name, role, org_id) VALUES (?, ?, ?, ?, ?, ?)").run(
      members[i],
      `member${i + 1}@retroman.dev`,
      hash,
      memberNames[i],
      "member",
      orgId
    );
  }

  const team1Id = generateId();
  const team2Id = generateId();
  const team3Id = generateId();

  db.prepare("INSERT INTO teams (id, name, product_area, team_lead_id, org_id) VALUES (?, ?, ?, ?, ?)").run(
    team1Id, "Platform Team", "Core Platform", facilitator1Id, org1Id
  );
  db.prepare("INSERT INTO teams (id, name, product_area, team_lead_id, org_id) VALUES (?, ?, ?, ?, ?)").run(
    team2Id, "Frontend Squad", "User Experience", facilitator1Id, org1Id
  );
  db.prepare("INSERT INTO teams (id, name, product_area, team_lead_id, org_id) VALUES (?, ?, ?, ?, ?)").run(
    team3Id, "Backend Crew", "API & Services", facilitator2Id, org2Id
  );

  const teamAssignments = [
    { team: team1Id, members: [facilitator1Id, members[0], members[1], members[2], members[3]] },
    { team: team2Id, members: [facilitator1Id, members[0], members[2], members[4]] },
    { team: team3Id, members: [facilitator2Id, members[5], members[6], members[7]] },
  ];

  for (const { team, members: mIds } of teamAssignments) {
    for (const mId of mIds) {
      db.prepare("INSERT OR IGNORE INTO team_members (team_id, user_id) VALUES (?, ?)").run(team, mId);
    }
  }

  const categories = ["Went Well", "Problems", "Ideas", "Risks", "Kudos"];
  const retroData = [
    { teamId: team1Id, facilitatorId: facilitator1Id, sprints: 4 },
    { teamId: team2Id, facilitatorId: facilitator1Id, sprints: 3 },
    { teamId: team3Id, facilitatorId: facilitator2Id, sprints: 3 },
  ];

  const feedbackTexts: Record<string, string[]> = {
    "Went Well": [
      "Great collaboration on the API migration",
      "Code review turnaround time improved significantly",
      "New CI/CD pipeline reduced deployment time by 50%",
      "Team communication during incidents was excellent",
      "Successfully delivered the feature ahead of schedule",
    ],
    "Problems": [
      "Flaky tests causing CI failures",
      "Too many meetings disrupting focus time",
      "Documentation is outdated in several areas",
      "Unclear requirements led to rework",
      "Technical debt slowing down development",
    ],
    "Ideas": [
      "Introduce pair programming sessions",
      "Set up a dedicated tech debt sprint",
      "Create a shared component library",
      "Implement feature flags for safer rollouts",
      "Start a weekly knowledge sharing session",
    ],
    "Risks": [
      "Key team member going on leave next sprint",
      "Third-party API deprecation in 3 months",
      "Security vulnerabilities in legacy dependencies",
      "Scaling concerns with growing user base",
    ],
    "Kudos": [
      "Shoutout to the team for the weekend hotfix",
      "Amazing work on the performance optimization",
      "Great mentoring of new team members",
      "Excellent presentation at the all-hands meeting",
    ],
  };

  const themeNames = [
    "CI/CD Improvements", "Code Quality", "Communication", "Documentation",
    "Testing Strategy", "Performance", "Technical Debt", "Team Culture",
    "Deployment Process", "Knowledge Sharing",
  ];

  const actionTitles = [
    "Set up automated dependency updates",
    "Create documentation template",
    "Implement feature flag system",
    "Refactor authentication module",
    "Add integration test suite",
    "Set up monitoring dashboards",
    "Create onboarding guide",
    "Optimize database queries",
    "Implement caching layer",
    "Review and update security policies",
  ];

  const priorities = ["low", "medium", "high", "critical"] as const;
  const statuses = ["open", "in_progress", "done"] as const;

  for (const { teamId, facilitatorId, sprints } of retroData) {
    for (let s = 0; s < sprints; s++) {
      const retroId = generateId();
      const sprintNum = s + 1;
      const daysAgo = (sprints - s) * 14;
      const startDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
      const endDate = new Date(Date.now() - (daysAgo - 13) * 86400000).toISOString().split("T")[0];
      const isCompleted = s < sprints - 1;

      db.prepare(`
        INSERT INTO retrospectives (id, title, sprint_cycle_name, start_date, end_date, status, team_id, facilitator_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        retroId,
        `Sprint ${sprintNum} Retrospective`,
        `Sprint ${sprintNum}`,
        startDate,
        endDate,
        isCompleted ? "completed" : "open",
        teamId,
        facilitatorId
      );

      const teamMembers = teamAssignments.find((t) => t.team === teamId)!.members;

      for (let f = 0; f < 8 + Math.floor(Math.random() * 5); f++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const texts = feedbackTexts[cat];
        const text = texts[Math.floor(Math.random() * texts.length)];
        const authorId = teamMembers[Math.floor(Math.random() * teamMembers.length)];
        const feedbackId = generateId();

        db.prepare(`
          INSERT INTO feedback_items (id, text, is_anonymous, category, author_id, retro_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(feedbackId, text, Math.random() > 0.3 ? 1 : 0, cat, authorId, retroId);
      }

      if (isCompleted) {
        const numThemes = 3 + Math.floor(Math.random() * 3);
        const themeIds: string[] = [];

        for (let t = 0; t < numThemes; t++) {
          const themeId = generateId();
          themeIds.push(themeId);
          const name = themeNames[Math.floor(Math.random() * themeNames.length)];

          db.prepare("INSERT INTO themes (id, name, retro_id, vote_count) VALUES (?, ?, ?, ?)").run(
            themeId, name, retroId, 0
          );
        }

        const allFeedback = db.prepare("SELECT id FROM feedback_items WHERE retro_id = ?").all(retroId) as any[];
        for (const fb of allFeedback) {
          const themeId = themeIds[Math.floor(Math.random() * themeIds.length)];
          db.prepare("UPDATE feedback_items SET theme_id = ? WHERE id = ?").run(themeId, fb.id);
        }

        for (const themeId of themeIds) {
          const voteCount = Math.floor(Math.random() * teamMembers.length);
          for (let v = 0; v < voteCount && v < teamMembers.length; v++) {
            const voteId = generateId();
            try {
              db.prepare("INSERT INTO votes (id, user_id, theme_id, retro_id) VALUES (?, ?, ?, ?)").run(
                voteId, teamMembers[v], themeId, retroId
              );
            } catch {}
          }
          db.prepare("UPDATE themes SET vote_count = (SELECT COUNT(*) FROM votes WHERE theme_id = ?) WHERE id = ?").run(themeId, themeId);
        }

        const numActions = 2 + Math.floor(Math.random() * 3);
        for (let a = 0; a < numActions; a++) {
          const actionId = generateId();
          const title = actionTitles[Math.floor(Math.random() * actionTitles.length)];
          const ownerId = teamMembers[Math.floor(Math.random() * teamMembers.length)];
          const priority = priorities[Math.floor(Math.random() * priorities.length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];
          const dueDate = new Date(Date.now() + (7 + Math.floor(Math.random() * 21)) * 86400000).toISOString().split("T")[0];
          const themeId = themeIds[Math.floor(Math.random() * themeIds.length)];

          db.prepare(`
            INSERT INTO action_items (id, title, description, owner_id, due_date, priority, status, theme_id, retro_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(actionId, title, `Action item from sprint retro`, ownerId, dueDate, priority, status, themeId, retroId);
        }
      }
    }
  }

  console.log("Seed data created successfully!");
  console.log("Login with: admin@retroman.dev / password123");
  console.log("Or: lead@acme.com / password123");
  console.log("Or: member1@retroman.dev / password123");
}

seed();
