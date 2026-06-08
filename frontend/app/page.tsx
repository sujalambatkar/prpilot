import Link from "next/link";

const INSTALL_URL = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || "#";

const features = [
  {
    title: "Security Scanning",
    desc: "Catches SQL injection, XSS, hardcoded secrets, command injection, and IDOR before they hit production.",
  },
  {
    title: "Performance Analysis",
    desc: "Detects N+1 queries, O(n²) loops, unnecessary re-renders, synchronous I/O in async contexts.",
  },
  {
    title: "Test Coverage",
    desc: "Identifies untested functions, missing edge cases, and gaps in error handling tests.",
  },
  {
    title: "Documentation",
    desc: "Flags missing docstrings, outdated READMEs, absent type hints, and missing CHANGELOG entries.",
  },
];

const steps = [
  { n: "1", title: "Install GitHub App", desc: "Grant PRPilot access to your repositories." },
  { n: "2", title: "Open a Pull Request", desc: "PRPilot automatically receives the webhook when a PR is opened or updated." },
  { n: "3", title: "Get Your Review", desc: "Five AI agents analyze the diff in parallel and post a structured review within 60 seconds." },
];

export default function LandingPage() {
  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#e6edf3" }}>
      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #30363d",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 1200,
        margin: "0 auto",
      }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>PRPilot</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a href="#how-it-works" style={{ color: "#8b949e", textDecoration: "none", fontSize: 14 }}>How it works</a>
          <a href="#features" style={{ color: "#8b949e", textDecoration: "none", fontSize: 14 }}>Features</a>
          <Link href="/dashboard" style={{
            background: "#238636",
            color: "#fff",
            padding: "6px 16px",
            borderRadius: 6,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 600,
          }}>Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 60px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(137, 87, 229, 0.1)",
            border: "1px solid rgba(137, 87, 229, 0.3)",
            borderRadius: 20,
            padding: "4px 14px",
            fontSize: 13,
            color: "#8957e5",
            marginBottom: 24,
          }}>
            Powered by Groq · llama-3.3-70b-versatile · &lt;60s reviews
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            letterSpacing: "-1.5px",
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            AI Code Review<br />
            <span style={{ color: "#8957e5" }}>in your pull requests</span>
          </h1>
          <p style={{ fontSize: 18, color: "#8b949e", lineHeight: 1.6, marginBottom: 36 }}>
            PRPilot runs 5 parallel AI agents on every PR — security, performance, test coverage,
            documentation, and summary — and posts a structured review back to GitHub automatically.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={INSTALL_URL} style={{
              background: "#238636",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
                <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Install on GitHub
            </a>
            <Link href="/dashboard" style={{
              background: "transparent",
              color: "#e6edf3",
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 600,
              border: "1px solid #30363d",
            }}>
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Mock review */}
        <div style={{
          maxWidth: 800,
          margin: "64px auto 0",
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: 12,
          overflow: "hidden",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
        }}>
          <div style={{
            background: "#21262d",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #30363d",
          }}>
            <span style={{ fontWeight: 600, fontSize: 14, fontFamily: "Inter, sans-serif" }}>PRPilot Review</span>
            <span style={{
              marginLeft: "auto",
              background: "rgba(218, 54, 51, 0.15)",
              color: "#da3633",
              border: "1px solid rgba(218,54,51,0.3)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
            }}>Changes Requested</span>
          </div>
          <div style={{ padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "#8b949e" }}>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #30363d" }}>Agent</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #30363d" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #30363d" }}>Findings</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Security", status: "fail — 2 issues", finding: "Hardcoded API key (line 47)", statusColor: "#da3633" },
                  { name: "Performance", status: "warn — 1 issue", finding: "N+1 query in user loop (line 89)", statusColor: "#d29922" },
                  { name: "Test Coverage", status: "warn — 1 issue", finding: "No test for empty list edge case", statusColor: "#d29922" },
                  { name: "Documentation", status: "pass — 0 issues", finding: "All public methods documented", statusColor: "#238636" },
                ].map((row) => (
                  <tr key={row.name}>
                    <td style={{ padding: "6px 8px", color: "#e6edf3" }}>{row.name}</td>
                    <td style={{ padding: "6px 8px", color: row.statusColor }}>{row.status}</td>
                    <td style={{ padding: "6px 8px", color: "#8b949e" }}>{row.finding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="how-it-works" style={{ borderTop: "1px solid #30363d", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48, letterSpacing: "-0.5px" }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
            {steps.map((s) => (
              <div key={s.n} style={{ display: "flex", gap: 16 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  background: "#8957e5",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                  color: "#fff",
                }}>{s.n}</div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" style={{ padding: "64px 24px", borderTop: "1px solid #30363d" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 48, letterSpacing: "-0.5px" }}>
            Five agents, one review
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {features.map((f) => (
              <div key={f.title} style={{
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 10,
                padding: 24,
              }}>
                <h3 style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>{f.title}</h3>
                <p style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ borderTop: "1px solid #30363d", padding: "64px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Ready to ship better code?</h2>
        <p style={{ color: "#8b949e", marginBottom: 32, fontSize: 15 }}>
          Free to use. No credit card required. Works with any GitHub repository.
        </p>
        <a href={INSTALL_URL} style={{
          background: "#238636",
          color: "#fff",
          padding: "14px 36px",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 16,
          fontWeight: 700,
        }}>
          Install PRPilot on GitHub
        </a>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #30363d",
        padding: "24px",
        textAlign: "center",
        color: "#8b949e",
        fontSize: 13,
      }}>
        PRPilot · MIT License · Built with FastAPI, LangGraph, Groq, Next.js
      </footer>
    </div>
  );
}
