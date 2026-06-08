"use client";

import { useState } from "react";
import type { Finding } from "@/lib/api";

interface Props {
  diff: string;
  findings: Finding[];
}

function parseDiffIntoFiles(diff: string): { filename: string; lines: { type: "add" | "remove" | "context" | "header"; content: string; lineNum?: number }[] }[] {
  const files: ReturnType<typeof parseDiffIntoFiles> = [];
  let current: (typeof files)[0] | null = null;
  let addLine = 0;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git")) {
      current = { filename: raw.replace(/.*b\//, ""), lines: [] };
      files.push(current);
      addLine = 0;
    } else if (!current) {
      continue;
    } else if (raw.startsWith("@@")) {
      const match = raw.match(/\+(\d+)/);
      addLine = match ? parseInt(match[1]) - 1 : addLine;
      current.lines.push({ type: "header", content: raw });
    } else if (raw.startsWith("+") && !raw.startsWith("+++")) {
      addLine++;
      current.lines.push({ type: "add", content: raw.slice(1), lineNum: addLine });
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      current.lines.push({ type: "remove", content: raw.slice(1) });
    } else if (!raw.startsWith("---") && !raw.startsWith("+++") && !raw.startsWith("index ") && !raw.startsWith("new file") && !raw.startsWith("deleted file")) {
      addLine++;
      current.lines.push({ type: "context", content: raw.slice(1), lineNum: addLine });
    }
  }
  return files;
}

const LINE_BG: Record<string, string> = {
  add: "rgba(35, 134, 54, 0.12)",
  remove: "rgba(218, 54, 51, 0.1)",
  context: "transparent",
  header: "rgba(56, 139, 253, 0.08)",
};
const LINE_COLOR: Record<string, string> = {
  add: "#238636",
  remove: "#da3633",
  context: "#8b949e",
  header: "#388bfd",
};
const LINE_PREFIX: Record<string, string> = {
  add: "+",
  remove: "−",
  context: " ",
  header: "",
};

export function DiffViewer({ diff, findings }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!diff) {
    return <div style={{ color: "#8b949e", fontSize: 13, padding: 16 }}>No diff available.</div>;
  }

  const files = parseDiffIntoFiles(diff);
  const findingsByFile: Record<string, Set<number>> = {};
  for (const f of findings) {
    if (f.file && f.line) {
      if (!findingsByFile[f.file]) findingsByFile[f.file] = new Set();
      findingsByFile[f.file].add(f.line);
    }
  }

  const displayFiles = showAll ? files : files.slice(0, 3);

  return (
    <div>
      {displayFiles.map((file, fi) => {
        const flaggedLines = findingsByFile[file.filename] || new Set();
        return (
          <div key={fi} style={{ marginBottom: 12, border: "1px solid #30363d", borderRadius: 8, overflow: "hidden" }}>
            <div style={{
              background: "#21262d",
              padding: "8px 14px",
              fontSize: 12,
              fontFamily: "JetBrains Mono, monospace",
              color: "#e6edf3",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ color: "#8b949e" }}>📄</span>
              <span>{file.filename}</span>
              {flaggedLines.size > 0 && (
                <span style={{
                  marginLeft: "auto",
                  background: "rgba(218,54,51,0.15)",
                  color: "#da3633",
                  border: "1px solid rgba(218,54,51,0.3)",
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: 11,
                }}>
                  {flaggedLines.size} finding{flaggedLines.size !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
                <tbody>
                  {file.lines.map((line, li) => {
                    const isFlagged = line.lineNum && flaggedLines.has(line.lineNum);
                    return (
                      <tr key={li} style={{
                        background: isFlagged ? "rgba(218,54,51,0.08)" : LINE_BG[line.type],
                        borderLeft: isFlagged ? "3px solid #da3633" : "3px solid transparent",
                      }}>
                        <td style={{
                          width: 40,
                          textAlign: "right",
                          padding: "1px 8px",
                          color: "#8b949e",
                          userSelect: "none",
                          borderRight: "1px solid #21262d",
                        }}>
                          {line.lineNum || ""}
                        </td>
                        <td style={{
                          width: 20,
                          textAlign: "center",
                          color: LINE_COLOR[line.type],
                          userSelect: "none",
                        }}>
                          {LINE_PREFIX[line.type]}
                        </td>
                        <td style={{
                          padding: "1px 8px 1px 4px",
                          color: line.type === "header" ? LINE_COLOR.header : "#e6edf3",
                          whiteSpace: "pre",
                        }}>
                          {line.content}
                          {isFlagged && (
                            <span style={{ marginLeft: 12, color: "#da3633", fontSize: 11 }}>◄ finding</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {files.length > 3 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          style={{
            background: "transparent",
            border: "1px solid #30363d",
            color: "#8b949e",
            borderRadius: 6,
            padding: "6px 16px",
            fontSize: 13,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {showAll ? "Show fewer files" : `Show ${files.length - 3} more file${files.length - 3 !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
