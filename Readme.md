## Build a Production-Ready Deep Research Agent (Step-by-Step)

This post walks you through a minimal-yet-powerful demo that combines LLMs, a simple web UI, and an agentic backend to perform deep research on any topic. You’ll be able to run it locally, understand each part, and extend it.

The demo includes:
- Backend: Express + Prisma (Postgres) + a LangChain-powered agent that searches the web, analyzes sources, and produces a markdown report.
- Frontend: Next.js App Router UI to create/view research sessions, preview sources/logs, and export a PDF.
- Auth: Lightweight session-token auth to scope user sessions.

You can use this as a template to build your own RAG or agentic workflows.

---

### What the demo does (and why it’s useful)

You enter a research query (e.g., “AI agents for literature review”). The backend spawns an agent run that:
1) Generates search variations and queries a web search tool (Tavily)
2) Fetches pages and extracts content (Cheerio loader)
3) Scores relevance and filters top sources
4) Produces a structured analysis and a long-form markdown report
5) Surfaces logs, sources, and a downloadable PDF in the UI

Why it’s useful:
- Quickly bootstrap an “AI research copilot” for projects or teams
- A clean reference for an agent workflow that’s easy to fork and adapt
- Demonstrates how to glue LLMs + search + scraping + a UI into one coherent system

---

### Prerequisites
- Node 18+
- Postgres database (local or remote)
- API keys:
  - OpenAI: `OPENAI_API_KEY`
  - Tavily: `TAVILY_API_KEY`
- Optional: Unpaywall contact email for PDF resolution: `UNPAYWALL_EMAIL`

---

### Quickstart

1) Clone and install

```bash
git clone https://github.com/your-org/askademic.ai.git
cd askademic.ai

# Backend
cd backend
npm install

# Frontend
cd ../web
npm install
```

2) Configure environment

Create `backend/.env` with:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/askademic"
OPENAI_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."
UNPAYWALL_EMAIL="you@example.com"
NODE_ENV="development"
PORT=8080
```

3) Setup database

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

4) Run the stack

```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd web
npm run dev
```

Visit the frontend at `http://localhost:3000`. The backend health check is at `http://localhost:8080/health`.

---

### Project Architecture

```mermaid
flowchart LR
  subgraph Frontend [Next.js Web]
    UI[Chat/Session Pages]
    PDF[PDF Download]
  end

  subgraph Backend [Express API]
    R[Research Routes]
    C[Controllers]
    S[Services]
    A[Research Agent]
    P[(Postgres via Prisma)]
  end

  UI -->|HTTP| R
  R --> C --> S --> A
  S --> P
  A --> P
  UI -->|Poll status + fetch report/sources/logs| R
  UI --> PDF
```

Key pieces:
- `backend/src/agents/researchAgent.ts`: the LangChain agent orchestrating search → scrape → analyze → report
- `backend/src/services/researchService.ts`: business logic, persistence, data shaping for the UI
- `backend/prisma/schema.prisma`: DB schema for `User`, `Session`, `AgentRun`
- `web/app/chat/[id]/page.tsx`: session UI with tabs for Results, Sources, Logs

---

### Step-by-step: How a research run works

1) Initiate a session

The UI (or curl) calls:

```bash
curl -X POST http://localhost:8080/research/initiate \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"AI agents for literature review","depth":"deep"}'
```

The backend creates a `Session` and `AgentRun(status=pending)`, then starts the agent.

2) Collect sources

The agent:
- Generates 2 search variations via LLM
- Queries Tavily search
- Loads pages with Cheerio (best-effort, tolerant to failures)
- Scores relevance with a lightweight LLM prompt
- Keeps the top N sources based on depth (quick/deep/comprehensive)

3) Analyze

The agent builds a combined context and prompts the LLM for a structured JSON analysis. If parsing fails, it falls back to a safe default.

4) Generate report

The agent creates a long-form markdown report sized by `depth` with sectioned structure (e.g., Background, Key Findings, Recommendations). The `AgentRun` is stored with `status=completed`.

5) Display in UI

The Next.js page polls `/research/status/:sessionId` and, once completed, loads `/report`, `/sources`, `/logs`. You can upload your own PDFs to include as sources.

---

### Minimal API tour (copy-paste ready)

Replace `<SESSION_TOKEN>` and `<SESSION_ID>` accordingly.

```bash
# List your sessions
curl -H "Authorization: Bearer <SESSION_TOKEN>" \
  http://localhost:8080/research/sessions | jq

# Create new research
curl -X POST http://localhost:8080/research/initiate \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query":"Quantum error correction","depth":"deep"}' | jq

# Check status
curl -H "Authorization: Bearer <SESSION_TOKEN>" \
  http://localhost:8080/research/status/<SESSION_ID> | jq

# Get report
curl -H "Authorization: Bearer <SESSION_TOKEN>" \
  http://localhost:8080/research/report/<SESSION_ID> | jq -r .report

# Get sources
curl -H "Authorization: Bearer <SESSION_TOKEN>" \
  http://localhost:8080/research/sources/<SESSION_ID> | jq

# Get logs
curl -H "Authorization: Bearer <SESSION_TOKEN>" \
  http://localhost:8080/research/logs/<SESSION_ID> | jq

# Upload a PDF to include as a source
BASE64=$(base64 -i mypaper.pdf)
curl -X POST http://localhost:8080/research/upload/<SESSION_ID> \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filename":"mypaper.pdf","contentBase64":"'"$BASE64"'"}' | jq

# Provide feedback for refinement
curl -X POST http://localhost:8080/research/feedback \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","feedback":"Focus more on evaluation metrics"}' | jq

# Ask a follow-up question (RAG over report + sources)
curl -X POST http://localhost:8080/research/followup \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<SESSION_ID>","question":"What datasets were cited?"}' | jq
```

---

### Key code snippets (orientation)

Fetch and poll from the UI:

```tsx
// web/app/chat/[id]/page.tsx (excerpt)
const [status, setStatus] = useState("pending");
useEffect(() => {
  const id = sessionId;
  const interval = setInterval(async () => {
    const res = await fetch(`/research/status/${id}`, { headers: getAuthHeaders() });
    if (res.ok) {
      const s = await res.json();
      setStatus(s.status || "unknown");
    }
  }, 2000);
  return () => clearInterval(interval);
}, [sessionId]);
```

Agent orchestration:

```ts
// backend/src/agents/researchAgent.ts (excerpt)
await prisma.agentRun.update({ where: { id: agentRunId }, data: { status: "processing" }});
const { sources } = await this.collectSources(input.query, agentRunId);
const analysis = await this.analyzeSources(sources, input.depth, agentRunId);
const report = await this.generateReport(input.query, analysis, input.format || 'detailed', agentRunId);
await prisma.agentRun.update({ where: { id: agentRunId }, data: { output: { sources, analysis, report, ...meta }, status: "completed" }});
```

---

### Troubleshooting
- Status stuck on "pending": check backend logs; ensure `OPENAI_API_KEY` and `TAVILY_API_KEY` are set.
- No sources: some pages block scraping; try a different query or ensure network access.
- Database errors: verify `DATABASE_URL` and that migrations were applied.
- 401 responses: ensure the session token is present in `Authorization` header.

---

### Extending the demo
- Swap search tool or add provider APIs (arXiv, PubMed) to enrich sources.
- Add vector storage and embeddings for persistent RAG.
- Use streaming UI updates via websockets or server-sent events.
- Introduce multi-agent roles (planner, researcher, writer).

---

### License and credits
Built with Express, Prisma, Next.js, and LangChain. Search by Tavily, optional Unpaywall PDF resolution. Adapt freely to your needs.


