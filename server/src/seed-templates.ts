import { getDb } from "./db.js";

export function seedBuiltinTemplates() {
  const db = getDb();

  const existing = db.prepare("SELECT COUNT(*) as count FROM retro_templates WHERE is_builtin = 1").get() as any;
  if (existing.count > 0) return;

  const templates = [
    {
      name: "Start / Stop / Continue",
      description: "Identify what the team should start doing, stop doing, and continue doing.",
      categories: JSON.stringify(["Start", "Stop", "Continue"]),
    },
    {
      name: "Mad / Sad / Glad",
      description: "Express feelings about the sprint to surface emotional insights.",
      categories: JSON.stringify(["Mad", "Sad", "Glad"]),
    },
    {
      name: "4Ls (Liked, Learned, Lacked, Longed For)",
      description: "Reflect on what was liked, learned, lacked, and longed for.",
      categories: JSON.stringify(["Liked", "Learned", "Lacked", "Longed For"]),
    },
    {
      name: "Sailboat",
      description: "Wind (helps), Anchors (hinders), Rocks (risks), Sun (appreciation).",
      categories: JSON.stringify(["Wind", "Anchors", "Rocks", "Sun"]),
    },
    {
      name: "Sprint Health Check",
      description: "Assess the overall health of the sprint across multiple dimensions.",
      categories: JSON.stringify(["Went Well", "Problems", "Ideas", "Risks", "Kudos"]),
    },
    {
      name: "Default Retrospective",
      description: "Standard retro categories for general use.",
      categories: JSON.stringify(["Went Well", "Problems", "Ideas", "Risks", "Kudos"]),
    },
  ];

  const insert = db.prepare(
    "INSERT INTO retro_templates (id, name, description, categories, is_builtin) VALUES (?, ?, ?, ?, 1)"
  );

  for (const t of templates) {
    const id = `builtin-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    insert.run(id, t.name, t.description, t.categories);
  }

  console.log(`Seeded ${templates.length} built-in templates`);
}
