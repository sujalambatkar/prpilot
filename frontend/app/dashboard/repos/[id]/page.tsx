"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getRepoConfig, getReviews, type Review } from "@/lib/api";
import { RepoConfig } from "@/components/RepoConfig";
import { VerdictBadge } from "@/components/AgentBadge";

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RepoPage() {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id, 10);

  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"reviews" | "config">("reviews");

  useEffect(() => {
    Promise.all([
      getRepoConfig(repoId),
      getReviews({ repo_id: repoId, per_page: 30 }),
    ]).then(([cfg, revData]) => {
      setConfig(cfg as Record<string, unknown>);
      setReviews(revData.reviews);
    }).finally(() => setLoading(false));
  }, [repoId]);

  const repoName = reviews[0]?.repo_full_name || `Repo #${repoId}`;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    background: "transparent",
    border: "none",
    borderBottom: active ? "2px solid #8957e5" : "2px solid transparent",
    color: active ? "#e6edf3" : "#8b949e",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  });

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      <div style={{ borderBottom: "1px solid #30363d", padding: "14px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/" style={{ color: "#8b949e", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>PRPilot</Link>
        <span style={{ color: "#30363d" }}>/</span>
        <Link href="/dashboard" style={{ color: "#8b949e", fontSize: 14, textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#30363d" }}>/</span>
        <span style={{ fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}>{repoName}</span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>
        <h1 style={{ fontWeight: 700, fontSize: 22, fontFamily: "JetBrains Mono, monospace", marginBottom: 4 }}>{repoName}</h1>

        <div style={{ borderBottom: "1px solid #30363d", marginBottom: 24, display: "flex" }}>
          <button style={tabStyle(tab === "reviews")} onClick={() => setTab("reviews")}>
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </button>
          <button style={tabStyle(tab === "config")} onClick={() => setTab("config")}>
            Configuration
          </button>
        </div>

        {loading ? (
          <div style={{ color: "#8b949e", textAlign: "center", padding: 48 }}>Loading…</div>
        ) : tab === "reviews" ? (
          reviews.length === 0 ? (
            <div style={{ color: "#8b949e", textAlign: "center", padding: 48 }}>No reviews yet for this repository.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reviews.map((review) => (
                <Link key={review.id} href={`/dashboard/reviews/${review.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#8957e5")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#30363d")}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{review.pr_title}</div>
                      <div style={{ fontSize: 12, color: "#8b949e" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace" }}>#{review.pr_number}</span>
                        {" · "}@{review.pr_author}{" · "}{timeAgo(review.created_at)}
                      </div>
                    </div>
                    {review.language && (
                      <span style={{ fontSize: 11, color: "#8957e5", background: "rgba(137,87,229,0.1)", border: "1px solid rgba(137,87,229,0.2)", borderRadius: 10, padding: "2px 8px" }}>{review.language}</span>
                    )}
                    <VerdictBadge verdict={review.verdict} />
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          config && (
            <RepoConfig
              repoId={repoId}
              initial={config as { enabled: boolean; agents: Record<string, boolean>; min_severity: string; auto_approve_on_pass: boolean }}
            />
          )
        )}
      </div>
    </div>
  );
}
