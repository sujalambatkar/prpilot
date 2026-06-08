"use client";

import { useState } from "react";
import type { AgentResult, Finding } from "@/lib/api";
import { AgentBadge } from "./AgentBadge";

const AGENT_LABELS: Record<string, string> = {
  security: "Security",
  performance: "Performance",
  coverage: "Test Coverage",
  docs: "Documentation",
};

const SEVERITY_STYLE: Record<string, { color: string; label: string }> = {
  critical: { color: "#da3633", label: "CRITICAL" },
  high: { color: "#e08c2d", label: "HIGH" },
  medium: { color: "#d29922", label: "MEDIUM" },
  low: { color: "#388bfd", label: "LOW" },
  info: { color: "#8b949e", label: "INFO" },
};

function FindingRow({ finding }: { finding: Finding }) {
  const sev = SEVERITY_STYLE[finding.severity] || SEVERITY_STYLE.info;
  return (
    <div style={{ padding: "10px 14px", borderBottom: "1px solid #21262d", background: "#0d1117" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: sev.color,
          fontFamily: "JetBrains Mono, monospace",
          minWidth: 64,
          paddingTop: 2,
        }}>[{sev.label}]</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#e6edf3", marginBottom: finding.suggestion ? 4 : 0 }}>
            {finding.issue}
            {(finding.file || finding.line) && (
              <span style={{ color: "#8b949e", marginLeft: 8, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                {finding.file && <span>{finding.file}</span>}
                {finding.file && finding.line && <span>:</span>}
                {finding.line && <span>L{finding.line}</span>}
              </span>
            )}
          </div>
          {finding.suggestion && (
            <div style={{ fontSize: 12, color: "#8b949e", borderLeft: "2px solid #30363d", paddingLeft: 8, marginTop: 4 }}>
              {finding.suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentSection({ result }: { result: AgentResult }) {
  const [open, setOpen] = useState(result.status !== "pass");
  const label = AGENT_LABELS[result.agent] || result.agent;
  const count = result.findings.length;

  return (
    <div style={{ border: "1px solid #30363d", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#161b22",
          border: "none",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          color: "#e6edf3",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{label}</span>
        {count > 0 && (
          <span style={{ fontSize: 12, color: "#8b949e", marginRight: 8 }}>
            {count} finding{count !== 1 ? "s" : ""}
          </span>
        )}
        <AgentBadge status={result.status} />
        <span style={{ color: "#8b949e", marginLeft: 8, fontSize: 16 }}>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div>
          {result.summary && (
            <div style={{
              padding: "10px 16px",
              background: "#0d1117",
              borderBottom: count > 0 ? "1px solid #21262d" : "none",
              fontSize: 13,
              color: "#8b949e",
            }}>
              {result.summary}
            </div>
          )}
          {result.findings.map((f, i) => (
            <FindingRow key={i} finding={f} />
          ))}
          {count === 0 && !result.summary && (
            <div style={{ padding: "12px 16px", background: "#0d1117", color: "#8b949e", fontSize: 13 }}>
              No issues found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReviewCard({ agentResults }: { agentResults: AgentResult[] }) {
  if (!agentResults || agentResults.length === 0) {
    return <div style={{ color: "#8b949e", fontSize: 14, padding: 16 }}>No agent results available.</div>;
  }
  return (
    <div>
      {agentResults.map((r) => (
        <AgentSection key={r.agent} result={r} />
      ))}
    </div>
  );
}
