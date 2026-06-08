import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRPilot — AI Pull Request Reviews",
  description: "Automated AI-powered code review for GitHub pull requests. Security, performance, test coverage, and documentation analysis in under 60 seconds.",
  openGraph: {
    title: "PRPilot",
    description: "AI-powered PR reviews: security, performance, coverage, docs — all in 60s.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
