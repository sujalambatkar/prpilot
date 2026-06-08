# PRPilot 🤖

> AI-powered pull request reviews — security, performance, test coverage, and documentation analysis posted directly to GitHub in under 60 seconds.

![PRPilot in action](https://placehold.co/800x400/0d1117/8957e5?text=Add+screen+recording+GIF+here)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## What it does

When a pull request is opened or updated, PRPilot:

1. Receives the webhook from GitHub
2. Fetches the diff and changed file list
3. Runs **5 parallel AI agents** powered by Groq (llama-3.3-70b-versatile)
4. Posts a structured review comment back to the PR — as an official GitHub review (not just a comment)

All within **60 seconds**, on the free tier.

---

## Agent Pipeline

```
PR opened/updated
       │
   fetch_diff
       │
   detect_language
       │
   ┌───┴────────────────────────────────┐
   │           PARALLEL                 │
   ▼           ▼           ▼           ▼
security   performance  coverage    docs
   │           │           │           │
   └───┬────────────────────────────────┘
       │
   write_summary  ──→  post_github_review
```

| Agent | What it checks |
|-------|---------------|
| 🔒 Security | SQL injection, XSS, hardcoded secrets, command injection, IDOR, path traversal |
| ⚡ Performance | N+1 queries, O(n²) loops, unnecessary re-renders, synchronous I/O, large imports |
| 🧪 Test Coverage | Missing tests, untested edge cases (null, empty, boundary), missing error tests |
| 📝 Documentation | Missing docstrings, outdated README, no CHANGELOG, missing type hints |
| 📋 Summary | Aggregates all findings, determines verdict (Approve / Request Changes / Comment) |

---

## Example Review Comment

```markdown
## PRPilot Review 🤖

**Verdict:** ⚠️ Changes Requested

| Agent | Status | Findings |
|-------|--------|----------|
| 🔒 Security | ❌ 2 issues | Hardcoded API key (line 47), SQL injection risk (line 112) |
| ⚡ Performance | ⚠️ 1 warning | N+1 query in user loop (line 89) |
| 🧪 Test Coverage | ⚠️ 1 gap | No test for empty list edge case in parse_items() |
| 📝 Documentation | ✅ Good | All public methods documented |

### 🔒 Security Issues
**[CRITICAL] Hardcoded API key** — `config.py`, line 47
> 💡 Move to environment variable and rotate the exposed key immediately.
```

---

## Installation

### Install the GitHub App

1. Go to your GitHub App URL (see [Self-hosting](#self-hosting) to create one)
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
| `GITHUB_APP_ID` | ✅ | Your GitHub App's numeric ID |
| `GITHUB_PRIVATE_KEY` | ✅ | Base64-encoded PEM private key from GitHub App settings |
| `GITHUB_WEBHOOK_SECRET` | ✅ | Secret string set in GitHub App webhook config |
| `GITHUB_CLIENT_ID` | Optional | OAuth App client ID (for dashboard login) |
| `GITHUB_CLIENT_SECRET` | Optional | OAuth App client secret |
| `GROQ_API_KEY` | ✅ | Get free at [console.groq.com](https://console.groq.com) |
| `HF_API_KEY` | Optional | HuggingFace API key (not used in MVP) |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis URL for webhook deduplication |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis token |
| `APP_BASE_URL` | Optional | Your Render deployment URL |
| `FRONTEND_URL` | Optional | Your Vercel frontend URL |
| `JWT_SECRET` | ✅ | Random secret for dashboard session tokens (`openssl rand -hex 32`) |

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `https://prpilot.onrender.com`) |
| `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` | GitHub App install URL |

---

## Self-Hosting Guide

### 1. Create a GitHub App

1. Go to **github.com/settings/apps → New GitHub App**
2. Set these fields:
   - **Homepage URL**: your frontend URL
   - **Webhook URL**: `https://your-render-url.onrender.com/webhook/github`
   - **Webhook secret**: generate with `openssl rand -hex 20`
3. **Permissions** (Repository):
   - Pull requests: **Read & Write**
   - Contents: **Read**
   - Metadata: **Read**
4. **Subscribe to events**: `Pull request`
5. After creation, note the **App ID**
6. Generate a **Private Key** (`.pem` file), then base64-encode it:
   ```bash
   base64 -i your-private-key.pem | tr -d '\n'
   ```

### 2. Deploy Backend on Render

```bash
# Clone the repo
git clone https://github.com/youruser/prpilot
cd prpilot/backend

# Create a new Web Service on render.com
# Build command: pip install -r requirements.txt
# Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1
# Runtime: Python 3.11
```

Set all environment variables from the table above in the Render dashboard.

Alternatively, use the `render.yaml` in `backend/`:
```bash
render deploy --yaml backend/render.yaml
```

### 3. Deploy Frontend on Vercel

```bash
cd prpilot/frontend
npm install
vercel deploy
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your Render backend URL
- `NEXT_PUBLIC_GITHUB_APP_INSTALL_URL` → your GitHub App install URL

### 4. Set up MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create database user and get connection string
3. Set `MONGODB_URI` in Render

### 5. Set up Upstash Redis (optional, for deduplication)

1. Create a free database at [upstash.com](https://upstash.com)
2. Copy the REST URL and token
3. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

---

## API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/webhook/github` | HMAC | GitHub webhook receiver |
| `GET` | `/health` | None | Health check |
| `GET` | `/auth/github` | None | Start GitHub OAuth flow |
| `GET` | `/auth/callback` | None | OAuth callback |
| `GET` | `/auth/me` | JWT | Current user info |
| `GET` | `/dashboard/repos` | JWT | List repos with PRPilot |
| `GET` | `/dashboard/reviews` | JWT | List reviews (paginated) |
| `GET` | `/dashboard/reviews/{id}` | JWT | Full review detail |
| `GET` | `/dashboard/stats` | JWT | Aggregate stats |
| `GET` | `/repos/{id}/config` | JWT | Get repo configuration |
| `POST` | `/repos/{id}/config` | JWT | Update repo configuration |

---

## Local Development

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill env vars
cp .env.example .env

# Run
uvicorn app.main:app --reload --port 8000
```

Use [smee.io](https://smee.io) or [ngrok](https://ngrok.com) to forward GitHub webhooks to localhost:

```bash
# smee (install: npm install -g smee-client)
smee --url https://smee.io/YOUR_CHANNEL --target http://localhost:8000/webhook/github
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your backend URL
npm run dev
```

---

## Project Structure

```
prpilot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, lifespan, middleware
│   │   ├── config.py            # Pydantic settings
│   │   ├── github/
│   │   │   ├── webhook.py       # POST /webhook/github
│   │   │   ├── client.py        # GitHub REST API (diff, files, reviews)
│   │   │   └── app_auth.py      # JWT + installation token generation
│   │   ├── agents/
│   │   │   ├── orchestrator.py  # Parallel pipeline runner
│   │   │   ├── security_agent.py
│   │   │   ├── performance_agent.py
│   │   │   ├── coverage_agent.py
│   │   │   ├── docs_agent.py
│   │   │   └── summary_agent.py
│   │   ├── api/
│   │   │   ├── auth_router.py   # GitHub OAuth + JWT
│   │   │   ├── dashboard_router.py
│   │   │   └── config_router.py
│   │   ├── db/mongo.py
│   │   └── schemas/review.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
└── frontend/
    ├── app/
    │   ├── page.tsx             # Landing page
    │   └── dashboard/
    │       ├── page.tsx         # Repo list + all reviews
    │       ├── repos/[id]/page.tsx   # Per-repo reviews + config
    │       └── reviews/[id]/page.tsx # Full review detail
    ├── components/
    │   ├── AgentBadge.tsx       # Pass/Warn/Fail/Verdict badges
    │   ├── ReviewCard.tsx       # Collapsible agent finding sections
    │   ├── DiffViewer.tsx       # Syntax-highlighted diff with finding markers
    │   └── RepoConfig.tsx       # Toggle agents, set severity thresholds
    └── lib/api.ts
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, async |
| AI Pipeline | LangGraph, LangChain, Groq (llama-3.3-70b-versatile) |
| Database | MongoDB Atlas (Motor async driver) |
| Cache | Upstash Redis (webhook deduplication) |
| GitHub | GitHub App (JWT auth, webhooks, Reviews API) |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Deployment | Render (backend), Vercel (frontend) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with tests
4. Open a pull request — PRPilot will review it automatically 🤖

---

## License

MIT — see [LICENSE](LICENSE)

---

<sub>Built with FastAPI · LangGraph · Groq · Next.js 15 · MongoDB Atlas</sub>
