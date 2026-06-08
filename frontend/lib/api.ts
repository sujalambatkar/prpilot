const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Finding {
  line: number | null;
  file: string | null;
  issue: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  suggestion: string;
}

export interface AgentResult {
  agent: string;
  status: "pass" | "warn" | "fail" | "error" | "skipped";
  findings: Finding[];
  summary: string;
  duration_ms: number;
}

export interface Review {
  id: string;
  repo_full_name: string;
  repo_id: number;
  pr_number: number;
  pr_title: string;
  pr_author: string;
  pr_url: string;
  installation_id: number;
  language: string;
  verdict: "approve" | "request_changes" | "comment" | "pending" | "error";
  status: "queued" | "processing" | "completed" | "failed";
  agent_results: AgentResult[];
  final_comment: string;
  diff_size_bytes: number;
  created_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface Repo {
  repo_id: number;
  repo_full_name: string;
  installation_id: number;
  account_login: string;
  account_avatar_url: string;
  review_count: number;
}

async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

export async function getRepos(token: string): Promise<{ repos: Repo[] }> {
  return apiFetch("/dashboard/repos", token);
}

export async function getReviews(
  token: string,
  params?: { repo_id?: number; page?: number; per_page?: number }
): Promise<{ reviews: Review[]; total: number; page: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.repo_id) qs.set("repo_id", String(params.repo_id));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  return apiFetch(`/dashboard/reviews?${qs}`, token);
}

export async function getReview(token: string, id: string): Promise<Review> {
  return apiFetch(`/dashboard/reviews/${id}`, token);
}

export async function getRepoConfig(token: string, repoId: number) {
  return apiFetch(`/repos/${repoId}/config`, token);
}

export async function updateRepoConfig(token: string, repoId: number, config: object) {
  return apiFetch(`/repos/${repoId}/config`, token, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function getDashboardStats(token: string) {
  return apiFetch("/dashboard/stats", token);
}
