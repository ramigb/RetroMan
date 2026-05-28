export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "facilitator" | "member";
  org_id?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  product_area?: string;
  team_lead_id?: string;
  team_lead_name?: string;
  org_id: string;
  members?: User[];
  created_at: string;
}

export interface Retrospective {
  id: string;
  title: string;
  sprint_cycle_name?: string;
  start_date?: string;
  end_date?: string;
  status: "draft" | "open" | "grouping" | "voting" | "discussion" | "completed";
  max_votes_per_user: number;
  anonymous_mode: boolean;
  template_id?: string;
  template_categories?: string;
  team_id: string;
  team_name?: string;
  facilitator_id: string;
  facilitator_name?: string;
  feedback_count?: number;
  theme_count?: number;
  open_actions?: number;
  feedback?: FeedbackItem[];
  themes?: Theme[];
  actions?: ActionItem[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackItem {
  id: string;
  text: string;
  is_anonymous: boolean;
  category: string;
  author_id?: string;
  author_name?: string;
  retro_id: string;
  theme_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Theme {
  id: string;
  name: string;
  retro_id: string;
  vote_count: number;
  item_count?: number;
  feedback?: FeedbackItem[];
  discussion_notes?: DiscussionNote[];
  actions?: ActionItem[];
  created_at: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  owner_id?: string;
  owner_name?: string;
  due_date?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "done";
  theme_id?: string;
  retro_id: string;
  retro_title?: string;
  team_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  user_id: string;
  theme_id: string;
  retro_id: string;
  created_at: string;
}

export interface DiscussionNote {
  id: string;
  text: string;
  author_id?: string;
  author_name?: string;
  theme_id: string;
  retro_id: string;
  created_at: string;
}

export interface RetroTemplate {
  id: string;
  name: string;
  description?: string;
  categories: string;
  is_builtin: boolean;
  org_id?: string;
  created_at: string;
}
