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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include", // send httpOnly cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

export async function checkAuth(): Promise<{ github_id: string; login: string } | null> {
  try {
    return await apiFetch("/auth/me");
  } catch {
    return null;
  }
}

export async function getRepos(): Promise<{ repos: Repo[] }> {
  return apiFetch("/dashboard/repos");
}

export async function getReviews(
  params?: { repo_id?: number; page?: number; per_page?: number }
): Promise<{ reviews: Review[]; total: number; page: number; per_page: number }> {
  const qs = new URLSearchParams();
  if (params?.repo_id) qs.set("repo_id", String(params.repo_id));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.per_page) qs.set("per_page", String(params.per_page));
  return apiFetch(`/dashboard/reviews?${qs}`);
}

export async function getReview(id: string): Promise<Review> {
  return apiFetch(`/dashboard/reviews/${id}`);
}

export async function getRepoConfig(repoId: number) {
  return apiFetch(`/repos/${repoId}/config`);
}

export async function updateRepoConfig(repoId: number, config: object) {
  return apiFetch(`/repos/${repoId}/config`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}
