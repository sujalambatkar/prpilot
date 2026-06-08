"use client";

import { useState } from "react";
import { updateRepoConfig } from "@/lib/api";

interface Config {
  enabled: boolean;
  agents: Record<string, boolean>;
  min_severity: string;
  auto_approve_on_pass: boolean;
}

interface Props {
  repoId: number;
  initial: Config;
}

const AGENTS = [
  { key: "security", label: "Security", desc: "SQL injection, XSS, hardcoded secrets" },
  { key: "performance", label: "Performance", desc: "N+1 queries, O(n²) loops, memory leaks" },
  { key: "coverage", label: "Test Coverage", desc: "Missing tests, untested edge cases" },
  { key: "docs", label: "Documentation", desc: "Missing docstrings, outdated README" },
];

const SEVERITIES = [
  { value: "critical", label: "Critical only" },
  { value: "high", label: "High & above" },
  { value: "medium", label: "Medium & above" },
  { value: "low", label: "Low & above" },
  { value: "info", label: "All findings" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? "#238636" : "#30363d",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#fff",
        top: 3,
        left: checked ? 21 : 3,
        transition: "left 0.2s",
      }} />
    </button>
  );
}

export function RepoConfig({ repoId, initial }: Props) {
  const [config, setConfig] = useState<Config>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const updateAgent = (key: string, val: boolean) => {
    setConfig((c) => ({ ...c, agents: { ...c.agents, [key]: val } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateRepoConfig(repoId, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Master toggle */}
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Enable PRPilot reviews</div>
          <div style={{ color: "#8b949e", fontSize: 12 }}>
            When disabled, webhooks are received but no reviews are posted.
          </div>
        </div>
        <Toggle checked={config.enabled} onChange={(v) => { setConfig((c) => ({ ...c, enabled: v })); setSaved(false); }} />
      </div>

      {/* Agent toggles */}
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 8,
        marginBottom: 12,
        overflow: "hidden",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #30363d" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Analysis Agents</span>
        </div>
        {AGENTS.map((agent, i) => (
          <div key={agent.key} style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: i < AGENTS.length - 1 ? "1px solid #21262d" : "none",
            opacity: config.enabled ? 1 : 0.5,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{agent.label}</div>
              <div style={{ color: "#8b949e", fontSize: 12 }}>{agent.desc}</div>
            </div>
            <Toggle
              checked={config.agents[agent.key] ?? true}
              onChange={(v) => updateAgent(agent.key, v)}
            />
          </div>
        ))}
      </div>

      {/* Severity threshold */}
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Minimum Severity to Report</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              onClick={() => { setConfig((c) => ({ ...c, min_severity: s.value })); setSaved(false); }}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: `1px solid ${config.min_severity === s.value ? "#8957e5" : "#30363d"}`,
                background: config.min_severity === s.value ? "rgba(137,87,229,0.15)" : "transparent",
                color: config.min_severity === s.value ? "#8957e5" : "#8b949e",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: config.min_severity === s.value ? 600 : 400,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-approve */}
      <div style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Auto-approve on all-pass</div>
          <div style={{ color: "#8b949e", fontSize: 12 }}>
            Automatically submit an Approve review when all agents pass.
          </div>
        </div>
        <Toggle
          checked={config.auto_approve_on_pass}
          onChange={(v) => { setConfig((c) => ({ ...c, auto_approve_on_pass: v })); setSaved(false); }}
        />
      </div>

      {/* Save */}
      {error && (
        <div style={{ color: "#da3633", fontSize: 13, marginBottom: 10 }}>{error}</div>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: saved ? "#238636" : "#8957e5",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 20px",
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "background 0.2s",
        }}
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save Configuration"}
      </button>
    </div>
  );
}
