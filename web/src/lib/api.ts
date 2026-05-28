const BASE = "/api";

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    me: () => request("/auth/me"),
    login: (email: string, password: string) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    register: (email: string, password: string, name: string) =>
      request("/auth/register", { method: "POST", body: JSON.stringify({ email, password, name }) }),
    logout: () => request("/auth/logout", { method: "POST" }),
  },
  orgs: {
    list: () => request("/orgs"),
    get: (id: string) => request(`/orgs/${id}`),
    create: (name: string) => request("/orgs", { method: "POST", body: JSON.stringify({ name }) }),
    update: (id: string, name: string) => request(`/orgs/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
    delete: (id: string) => request(`/orgs/${id}`, { method: "DELETE" }),
  },
  teams: {
    list: () => request("/teams"),
    get: (id: string) => request(`/teams/${id}`),
    create: (data: any) => request("/teams", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/teams/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/teams/${id}`, { method: "DELETE" }),
    members: (id: string) => request(`/teams/${id}/members`),
  },
  retros: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/retros${qs}`);
    },
    get: (id: string) => request(`/retros/${id}`),
    create: (data: any) => request("/retros", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/retros/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    advance: (id: string) => request(`/retros/${id}/advance`, { method: "POST" }),
    delete: (id: string) => request(`/retros/${id}`, { method: "DELETE" }),
    onlineUsers: (id: string) => request(`/retros/${id}/online-users`),
  },
  feedback: {
    list: (retroId: string, themeId?: string) => {
      const params = new URLSearchParams({ retro_id: retroId });
      if (themeId) params.set("theme_id", themeId);
      return request(`/feedback?${params}`);
    },
    create: (data: any) => request("/feedback", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/feedback/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/feedback/${id}`, { method: "DELETE" }),
  },
  themes: {
    list: (retroId: string) => request(`/themes?retro_id=${retroId}`),
    get: (id: string) => request(`/themes/${id}`),
    create: (data: any) => request("/themes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/themes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    merge: (id: string, sourceIds: string[]) =>
      request(`/themes/${id}/merge`, { method: "POST", body: JSON.stringify({ source_theme_ids: sourceIds }) }),
    delete: (id: string) => request(`/themes/${id}`, { method: "DELETE" }),
  },
  votes: {
    list: (retroId: string) => request(`/votes?retro_id=${retroId}`),
    create: (themeId: string, retroId: string) =>
      request("/votes", { method: "POST", body: JSON.stringify({ theme_id: themeId, retro_id: retroId }) }),
    delete: (themeId: string) => request(`/votes/${themeId}`, { method: "DELETE" }),
  },
  actions: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return request(`/actions${qs}`);
    },
    get: (id: string) => request(`/actions/${id}`),
    create: (data: any) => request("/actions", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/actions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/actions/${id}`, { method: "DELETE" }),
  },
  templates: {
    list: () => request("/templates"),
    get: (id: string) => request(`/templates/${id}`),
    create: (data: any) => request("/templates", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/templates/${id}`, { method: "DELETE" }),
  },
  discussion: {
    list: (themeId: string) => request(`/discussion?theme_id=${themeId}`),
    create: (data: any) => request("/discussion", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => request(`/discussion/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    org: () => request("/dashboard/org"),
    team: (teamId: string) => request(`/dashboard/team/${teamId}`),
    analytics: () => request("/dashboard/analytics"),
  },
  ai: {
    autoCluster: (retroId: string) =>
      request("/ai/auto-cluster", { method: "POST", body: JSON.stringify({ retro_id: retroId }) }),
    suggestThemeName: (itemIds: string[]) =>
      request("/ai/suggest-theme-name", { method: "POST", body: JSON.stringify({ item_ids: itemIds }) }),
    summarize: (retroId: string) =>
      request("/ai/summarize", { method: "POST", body: JSON.stringify({ retro_id: retroId }) }),
    suggestActions: (themeId: string) =>
      request("/ai/suggest-actions", { method: "POST", body: JSON.stringify({ theme_id: themeId }) }),
    patterns: (teamId: string) => request(`/ai/patterns/${teamId}`),
  },
  users: {
    list: () => request("/users"),
  },
};
