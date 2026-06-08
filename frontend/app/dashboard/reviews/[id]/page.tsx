"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getReview, type Review } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";
import { DiffViewer } from "@/components/DiffViewer";
import { VerdictBadge, AgentBadge } from "@/components/AgentBadge";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function DurationBadge({ ms }: { ms: number }) {
  return (
    <span style={{ fontSize: 12, color: "#8b949e" }}>
      {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
    </span>
  );
}

const AGENT_META: Record<string, { label: string }> = {
  security: { label: "Security" },
  performance: { label: "Performance" },
  coverage: { label: "Test Coverage" },
  docs: { label: "Documentation" },
};

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"findings" | "comment">("findings");

  useEffect(() => {
    const t = localStorage.getItem("prpilot_token") || "";
    setToken(t);
    if (!t || !id) return;

    getReview(t, id)
      .then(setReview)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

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

  if (loading) {
    return (
      <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8b949e" }}>Loading review…</div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div style={{ background: "#0d1117", minHeight: "100vh", padding: 32 }}>
        <div style={{ color: "#da3633" }}>{error || "Review not found."}</div>
        <Link href="/dashboard" style={{ color: "#388bfd", fontSize: 13 }}>← Back to dashboard</Link>
      </div>
    );
  }

  const totalFindings = review.agent_results.reduce((n, r) => n + r.findings.length, 0);
  const allFindings = review.agent_results.flatMap((r) => r.findings);
  const totalDuration = review.agent_results.reduce((n, r) => n + (r.duration_ms || 0), 0);

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #30363d", padding: "14px 24px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "#8b949e", fontSize: 14, fontWeight: 700, textDecoration: "none" }}>PRPilot</Link>
        <span style={{ color: "#30363d" }}>/</span>
        <Link href="/dashboard" style={{ color: "#8b949e", fontSize: 14, textDecoration: "none" }}>Dashboard</Link>
        <span style={{ color: "#30363d" }}>/</span>
        <Link
          href={`/dashboard/repos/${review.repo_id}`}
          style={{ color: "#8b949e", fontSize: 14, textDecoration: "none", fontFamily: "JetBrains Mono, monospace" }}
        >
          {review.repo_full_name}
        </Link>
        <span style={{ color: "#30363d" }}>/</span>
        <span style={{ fontSize: 14, fontFamily: "JetBrains Mono, monospace" }}>PR #{review.pr_number}</span>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
        {/* PR title + verdict */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <h1 style={{ fontWeight: 700, fontSize: 20, flex: 1, minWidth: 200 }}>{review.pr_title}</h1>
            <VerdictBadge verdict={review.verdict} />
          </div>
          <div style={{ fontSize: 13, color: "#8b949e", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>
              <a href={review.pr_url} target="_blank" rel="noopener" style={{ color: "#388bfd", textDecoration: "none" }}>
                {review.repo_full_name}#{review.pr_number} ↗
              </a>
            </span>
            <span>by @{review.pr_author}</span>
            {review.language && <span>Language: {review.language}</span>}
            <span>Reviewed {fmt(review.created_at)}</span>
            {totalDuration > 0 && <span>⏱ {(totalDuration / 1000).toFixed(1)}s total</span>}
          </div>
        </div>

        {/* Agent summary strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 24,
        }}>
          {review.agent_results.map((r) => {
            const meta = AGENT_META[r.agent] || { label: r.agent };
            return (
              <div key={r.agent} style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 8,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <AgentBadge status={r.status} />
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{r.findings.length}</div>
                    <DurationBadge ms={r.duration_ms} />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: "12px 14px",
          }}>
            <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 4 }}>Total Findings</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{totalFindings}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid #30363d", marginBottom: 20, display: "flex" }}>
          <button style={tabStyle(activeTab === "findings")} onClick={() => setActiveTab("findings")}>
            Agent Findings {totalFindings > 0 && `(${totalFindings})`}
          </button>
          <button style={tabStyle(activeTab === "comment")} onClick={() => setActiveTab("comment")}>
            Posted Comment
          </button>
        </div>

        {activeTab === "findings" ? (
          <ReviewCard agentResults={review.agent_results} />
        ) : (
          <div style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 8,
            padding: 20,
          }}>
            {review.final_comment ? (
              <pre style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                color: "#e6edf3",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.6,
              }}>
                {review.final_comment}
              </pre>
            ) : (
              <div style={{ color: "#8b949e", fontSize: 13 }}>
                {review.status === "processing" ? "Review is still being processed…" : "No comment posted."}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {review.status === "failed" && review.error && (
          <div style={{
            marginTop: 16,
            background: "rgba(218,54,51,0.1)",
            border: "1px solid rgba(218,54,51,0.3)",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#da3633",
            fontSize: 13,
          }}>
            <strong>Pipeline error:</strong> {review.error}
          </div>
        )}
      </div>
    </div>
  );
}
