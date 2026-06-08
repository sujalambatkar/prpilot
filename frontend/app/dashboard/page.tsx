"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getRepos, getReviews, type Repo, type Review } from "@/lib/api";
import { VerdictBadge } from "@/components/AgentBadge";

function useToken() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) {
      localStorage.setItem("prpilot_token", urlToken);
      setToken(urlToken);
    } else {
      const stored = localStorage.getItem("prpilot_token") || "";
      setToken(stored);
    }
  }, [searchParams]);

  return token;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const INSTALL_URL = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || "#";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function DashboardContent() {
  const token = useToken();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [reposData, reviewsData] = await Promise.all([
        getRepos(token),
        getReviews(token, { repo_id: selectedRepo ?? undefined, per_page: 20 }),
      ]);
      setRepos(reposData.repos);
      setReviews(reviewsData.reviews);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("401")) {
        localStorage.removeItem("prpilot_token");
        setError("Session expired. Please log in again.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [token, selectedRepo]);

  useEffect(() => { load(); }, [load]);

  if (!token) {
    return (
      <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ color: "#e6edf3", marginBottom: 8, fontWeight: 700 }}>Sign in to PRPilot</h2>
          <p style={{ color: "#8b949e", marginBottom: 24, fontSize: 14 }}>Connect your GitHub account to view review history and configure repos.</p>
          <a
            href={`${API_URL}/auth/github`}
            style={{
              background: "#238636",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: 6,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Sign in with GitHub
          </a>
          <div style={{ marginTop: 16 }}>
            <Link href="/" style={{ color: "#8b949e", fontSize: 13, textDecoration: "none" }}>← Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      <div style={{ borderBottom: "1px solid #30363d", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" style={{ color: "#8b949e", textDecoration: "none", fontSize: 14, fontWeight: 700 }}>PRPilot</Link>
        <span style={{ color: "#30363d" }}>/</span>
        <span style={{ color: "#8b949e", fontSize: 14 }}>Dashboard</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <a href={INSTALL_URL} style={{ background: "#238636", color: "#fff", padding: "6px 14px", borderRadius: 6, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            + Install on repo
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Repositories
          </div>
          <button
            onClick={() => setSelectedRepo(null)}
            style={{
              width: "100%", textAlign: "left",
              background: selectedRepo === null ? "rgba(137,87,229,0.1)" : "transparent",
              border: `1px solid ${selectedRepo === null ? "rgba(137,87,229,0.3)" : "transparent"}`,
              borderRadius: 6, padding: "7px 10px",
              color: selectedRepo === null ? "#8957e5" : "#e6edf3",
              fontSize: 13, cursor: "pointer", marginBottom: 2,
            }}
          >
            All repositories
          </button>
          {loading && repos.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 12, padding: "8px 0" }}>Loading…</div>
          ) : repos.length === 0 ? (
            <div style={{ color: "#8b949e", fontSize: 12, padding: "8px 0" }}>
              No repos yet.{" "}<a href={INSTALL_URL} style={{ color: "#388bfd" }}>Install PRPilot</a>
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.repo_id}
                onClick={() => setSelectedRepo(repo.repo_id)}
                style={{
                  width: "100%", textAlign: "left",
                  background: selectedRepo === repo.repo_id ? "rgba(137,87,229,0.1)" : "transparent",
                  border: `1px solid ${selectedRepo === repo.repo_id ? "rgba(137,87,229,0.3)" : "transparent"}`,
                  borderRadius: 6, padding: "7px 10px",
                  color: selectedRepo === repo.repo_id ? "#8957e5" : "#e6edf3",
                  fontSize: 13, cursor: "pointer", marginBottom: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title={repo.repo_full_name}
              >
                {repo.repo_full_name.split("/")[1] || repo.repo_full_name}
                <span style={{ float: "right", color: "#8b949e", fontSize: 11 }}>{repo.review_count}</span>
              </button>
            ))
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>
              {selectedRepo ? repos.find(r => r.repo_id === selectedRepo)?.repo_full_name || "Reviews" : "All Reviews"}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              {selectedRepo && (
                <Link href={`/dashboard/repos/${selectedRepo}`} style={{ color: "#388bfd", fontSize: 13, textDecoration: "none", padding: "5px 12px", border: "1px solid #30363d", borderRadius: 6 }}>
                  Configure →
                </Link>
              )}
              <button onClick={load} style={{ background: "transparent", border: "1px solid #30363d", color: "#8b949e", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer" }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(218,54,51,0.1)", border: "1px solid rgba(218,54,51,0.3)", borderRadius: 6, padding: "10px 14px", color: "#da3633", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ color: "#8b949e", padding: 32, textAlign: "center" }}>Loading reviews…</div>
          ) : reviews.length === 0 ? (
            <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ maxWidth: 480, margin: "0 auto" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#e6edf3", marginBottom: 24 }}>
                  No reviews yet — here is how to get started
                </div>
                {[
                  { n: "1", title: "Install PRPilot on a repo", desc: "Click \"+ Install on repo\" in the top right, select the repositories you want PRPilot to monitor, and save." },
                  { n: "2", title: "Open a pull request", desc: "On any installed repo, create a new branch, push a change, and open a pull request on GitHub as normal." },
                  { n: "3", title: "Wait 60 seconds", desc: "PRPilot will automatically receive the webhook, run 5 AI agents in parallel, and post a review comment directly on your PR." },
                  { n: "4", title: "View the results here", desc: "Come back to this dashboard to see the full breakdown — agent findings, severity levels, and the posted comment." },
                ].map((step) => (
                  <div key={step.n} style={{ display: "flex", gap: 16, marginBottom: 20, textAlign: "left" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#8957e5", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{step.n}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#e6edf3", marginBottom: 3 }}>{step.title}</div>
                      <div style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reviews.map((review) => (
                <Link key={review.id} href={`/dashboard/reviews/${review.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, cursor: "pointer", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#8957e5")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#30363d")}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#8b949e" }}>{review.repo_full_name} #{review.pr_number}</span>
                        {review.language && (
                          <span style={{ fontSize: 11, color: "#8957e5", background: "rgba(137,87,229,0.1)", border: "1px solid rgba(137,87,229,0.2)", borderRadius: 10, padding: "0 7px" }}>{review.language}</span>
                        )}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#e6edf3", marginBottom: 4 }}>{review.pr_title}</div>
                      <div style={{ fontSize: 12, color: "#8b949e" }}>
                        by @{review.pr_author} · {timeAgo(review.created_at)}
                        {review.status === "processing" && <span style={{ marginLeft: 8, color: "#d29922" }}>Analyzing…</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <VerdictBadge verdict={review.verdict} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0d1117", minHeight: "100vh" }} />}>
      <DashboardContent />
    </Suspense>
  );
}
