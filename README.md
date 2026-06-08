# PRPilot

> AI-powered pull request reviews — security, performance, test coverage, and documentation analysis posted directly to GitHub in under 60 seconds.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## What it does

When a pull request is opened or updated, PRPilot:

1. Receives the webhook from GitHub
2. Fetches the diff and changed file list
3. Runs **5 parallel AI agents** powered by Groq (llama-3.3-70b-versatile)
4. Posts a structured review back to the PR as an official GitHub review

All within **60 seconds**, on the free tier.

---

## Architecture

```
GitHub PR Event
      |
      v
POST /webhook/github
      |
  [HMAC verify]
      |
  [Dedup check] -- Redis (optional)
      |
      v
  MongoDB (queued)
      |
      v
  fetch_diff --> detect_language
                      |
          +-----------+-----------+-----------+
          |           |           |           |
          v           v           v           v
      security   performance  coverage     docs
       agent       agent       agent       agent
          |           |           |           |
          +-----------+-----------+-----------+
                      |
                      v
               summary_agent
              (verdict + markdown)
                      |
                      v
          POST /repos/{owner}/{repo}/pulls/{n}/reviews
                      |
                      v
                  MongoDB (completed)
                      |
                      v
             PRPilot Dashboard (Next.js)
```

### Component Map

```
prpilot/
  backend/
    app/
      main.py                  FastAPI app, CORS, security headers, lifespan
      config.py                Pydantic settings (all env vars)
      github/
        webhook.py             Webhook receiver — HMAC verify, dedup, dispatch
        app_auth.py            GitHub App JWT + installation token generation
        client.py              GitHub REST — fetch diff, files, post review
      agents/
        orchestrator.py        asyncio.gather parallel pipeline
        security_agent.py      SQL injection, XSS, secrets, IDOR, path traversal
        performance_agent.py   N+1 queries, O(n2) loops, memory leaks, sync I/O
        coverage_agent.py      Missing tests, edge cases, error path coverage
        docs_agent.py          Missing docstrings, README gaps, type hints
        summary_agent.py       Verdict logic, GitHub markdown comment builder
      api/
        auth_router.py         GitHub OAuth, JWT session tokens
        dashboard_router.py    Repos, reviews, stats endpoints
        config_router.py       Per-repo agent and severity config
      db/mongo.py              Motor async MongoDB client, indexes
      schemas/review.py        Pydantic models — PRReview, AgentResult, Finding
  frontend/
    app/
      page.tsx                 Landing page
      dashboard/page.tsx       Repo sidebar + review feed
      dashboard/repos/[id]     Per-repo review history + config tab
      dashboard/reviews/[id]   Full review detail — agent cards, findings, comment
    components/
      AgentBadge.tsx           Pass / Warn / Fail / Verdict badges
      ReviewCard.tsx           Collapsible per-agent finding sections
      DiffViewer.tsx           Diff parser with finding line markers
      RepoConfig.tsx           Toggle agents, set severity threshold
    lib/api.ts                 Typed fetch helpers for all backend endpoints
```

---

## Agent Pipeline

| Agent | What it checks |
|-------|---------------|
| Security | SQL injection, XSS, hardcoded secrets, command injection, IDOR, path traversal |
| Performance | N+1 queries, O(n2) loops, unnecessary re-renders, synchronous I/O, large imports |
| Test Coverage | Missing tests, untested edge cases (null, empty, boundary), missing error tests |
| Documentation | Missing docstrings, outdated README, no CHANGELOG, missing type hints |
| Summary | Aggregates all findings, determines verdict (Approve / Request Changes / Comment) |

---

## Example Review Comment

```
PRPilot Review

Verdict: Changes Requested

| Agent        | Status          | Findings                                      |
|--------------|-----------------|-----------------------------------------------|
| Security     | fail - 2 issues | Hardcoded API key (line 47)                   |
| Performance  | warn - 1 issue  | N+1 query in user loop (line 89)              |
| Test Coverage| warn - 1 issue  | No test for empty list edge case              |
| Documentation| pass - 0 issues | No issues                                     |

Summary
This PR introduces a hardcoded API key on line 47 which must be rotated and
moved to an environment variable before merging. The N+1 query pattern in the
user loop will degrade performance at scale. Test coverage for edge cases is
missing in parse_items().
```

---

## Installation

### Install the GitHub App

1. Go to your GitHub App URL (see [Self-hosting](#self-hosting-guide) to create one)
2. Click **Install** and select repositories
3. PRPilot immediately starts reviewing new PRs

---

## Dashboard

Visit `/dashboard` to:
- See all repositories where PRPilot is installed
- Browse review history per repo
- View full agent findings with collapsible sections
- Configure which agents run per repo
- Set minimum severity thresholds

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | Yes | Your GitHub App's numeric ID |
| `GITHUB_PRIVATE_KEY` | Yes | Path to .pem file or base64-encoded PEM |
| `GITHUB_WEBHOOK_SECRET` | Yes | Secret string set in GitHub App webhook config |
| `GITHUB_CLIENT_ID` | Optional | OAuth App client ID (for dashboard login) |
| `GITHUB_CLIENT_SECRET` | Optional | OAuth App client secret |
| `GROQ_API_KEY` | Yes | Get free at console.groq.com |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis URL for webhook deduplication |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis token |
| `FRONTEND_URL` | Yes | Your Vercel URL or http://localhost:3000 locally |
| `JWT_SECRET` | Yes | Random secret — generate with `openssl rand -hex 32` |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. https://prpilot.onrender.com) |
| `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` | GitHub App install URL |

---

## Self-Hosting Guide

### 1. Create a GitHub App

1. Go to **github.com/settings/apps** and click **New GitHub App**
2. Set:
   - **Homepage URL**: your frontend URL
   - **Webhook URL**: `https://your-render-url.onrender.com/webhook/github`
   - **Webhook secret**: `openssl rand -hex 20`
3. Repository permissions: Pull requests (Read & Write), Contents (Read), Metadata (Read)
4. Subscribe to events: Pull request
5. Generate a Private Key — download the `.pem` file

### 2. Deploy Backend on Render

1. Connect this repo to Render as a new Web Service
2. Set runtime to Python 3.11
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
5. Add all environment variables in the Render dashboard
6. Update the GitHub App webhook URL to your Render URL

### 3. Deploy Frontend on Vercel

1. Connect the `frontend/` directory to Vercel
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL
   - `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` — your GitHub App install URL
3. Deploy

### 4. Set up MongoDB Atlas

1. Create a free cluster at cloud.mongodb.com
2. Create a database user and allowlist `0.0.0.0/0`
3. Copy the connection string and set as `MONGODB_URI`

### 5. Set up Upstash Redis (optional)

1. Create a free Redis database at upstash.com
2. Copy the REST URL and token into your environment variables

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhook/github` | HMAC | GitHub webhook receiver |
| GET | `/health` | None | Health check |
| GET | `/auth/github` | None | Start GitHub OAuth flow |
| GET | `/auth/callback` | None | OAuth callback |
| GET | `/auth/me` | JWT | Current user info |
| GET | `/dashboard/repos` | JWT | List repos with PRPilot installed |
| GET | `/dashboard/reviews` | JWT | List reviews (paginated) |
| GET | `/dashboard/reviews/{id}` | JWT | Full review detail |
| GET | `/dashboard/stats` | JWT | Aggregate stats |
| GET | `/repos/{id}/config` | JWT | Get repo configuration |
| POST | `/repos/{id}/config` | JWT | Update repo configuration |

---

## Local Development

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env values
uvicorn app.main:app --reload --port 8000
```

Forward GitHub webhooks to localhost using smee:

```bash
npx smee-client --url https://smee.io/YOUR_CHANNEL --target http://localhost:8000/webhook/github
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI |
| AI Pipeline | LangGraph, Groq (llama-3.3-70b-versatile) |
| Database | MongoDB Atlas, Motor async driver |
| Cache | Upstash Redis |
| GitHub | GitHub App — JWT auth, webhooks, Reviews API |
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Deployment | Render (backend, 512MB), Vercel (frontend) |

---

## Security

- All webhooks verified with HMAC-SHA256 before processing
- OAuth state tokens expire after 10 minutes (CSRF protection)
- JWT tokens signed with HS256, 7-day expiry
- API docs disabled in production
- Security headers on every response (X-Frame-Options, HSTS, nosniff, XSS protection)
- CORS locked to configured frontend origin only
- No user input passed to shell commands or raw queries

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Open a pull request — PRPilot will review it automatically

---

## License

MIT — see [LICENSE](LICENSE)

---

Built with FastAPI, LangGraph, Groq, Next.js 15, MongoDB Atlas
# test change
