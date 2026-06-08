"use client";

type Status = "pass" | "warn" | "fail" | "error" | "skipped";

const config: Record<Status, { label: string; bg: string; color: string; border: string }> = {
  pass: { label: "Pass", bg: "rgba(35, 134, 54, 0.15)", color: "#238636", border: "rgba(35,134,54,0.3)" },
  warn: { label: "Warn", bg: "rgba(210, 153, 34, 0.15)", color: "#d29922", border: "rgba(210,153,34,0.3)" },
  fail: { label: "Fail", bg: "rgba(218, 54, 51, 0.15)", color: "#da3633", border: "rgba(218,54,51,0.3)" },
  error: { label: "Error", bg: "rgba(218, 54, 51, 0.1)", color: "#da3633", border: "rgba(218,54,51,0.2)" },
  skipped: { label: "Skip", bg: "rgba(139,148,158,0.1)", color: "#8b949e", border: "rgba(139,148,158,0.2)" },
};

interface Props {
  status: Status;
  compact?: boolean;
}

export function AgentBadge({ status, compact }: Props) {
  const c = config[status] || config.skipped;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 20,
      padding: compact ? "1px 8px" : "3px 10px",
      fontSize: compact ? 11 : 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    approve: { label: "Approved", color: "#238636", bg: "rgba(35,134,54,0.15)", border: "rgba(35,134,54,0.3)" },
    request_changes: { label: "Changes Requested", color: "#da3633", bg: "rgba(218,54,51,0.15)", border: "rgba(218,54,51,0.3)" },
    comment: { label: "Comment", color: "#388bfd", bg: "rgba(56,139,253,0.15)", border: "rgba(56,139,253,0.3)" },
    pending: { label: "Pending", color: "#8b949e", bg: "rgba(139,148,158,0.1)", border: "rgba(139,148,158,0.2)" },
    error: { label: "Error", color: "#da3633", bg: "rgba(218,54,51,0.1)", border: "rgba(218,54,51,0.2)" },
  };
  const v = map[verdict] || map.pending;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      borderRadius: 20,
      padding: "4px 12px",
      fontSize: 13,
      fontWeight: 700,
    }}>
      {v.label}
    </span>
  );
}
