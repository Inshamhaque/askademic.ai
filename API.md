## Askademic API Reference

Base URL: `http://localhost:8080`

All research endpoints require Bearer auth: `Authorization: Bearer <sessionToken>`

---

### Authentication

#### POST /user/signup
Create a new user and return a session token.

Request
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "secret123"
}
```

Response 201
```json
{
  "message": "User created successfully",
  "sessionToken": "<token>",
  "user": { "id": "uuid", "name": "Ada Lovelace", "email": "ada@example.com" }
}
```

Errors
- 400: validation error or user exists
- 500: server error

#### POST /user/signin
Sign in and return a session token.

Request
```json
{ "email": "ada@example.com", "password": "secret123" }
```

Response 200
```json
{
  "message": "Login successful",
  "sessionToken": "<token>",
  "user": { "id": "uuid", "name": "Ada Lovelace", "email": "ada@example.com" }
}
```

Errors
- 400: validation error
- 401: invalid credentials
- 500: server error

#### POST /user/signout
Invalidate the current session token.

Headers: `Authorization: Bearer <sessionToken>`

Response 200
```json
{ "message": "Logout successful" }
```

Errors
- 400: missing token
- 500: server error

---

### Research
All endpoints below require: `Authorization: Bearer <sessionToken>`

#### GET /research/sessions
List research sessions for the authenticated user.

Response 200
```json
{
  "sessions": [
    {
      "id": "uuid",
      "createdAt": "2025-08-27T10:55:23.000Z",
      "query": "AI agents for literature review",
      "depth": "deep",
      "latestStatus": "completed"
    }
  ]
}
```

#### POST /research/initiate
Start a new research run for a query.

Request
```json
{ "query": "AI agents for literature review", "depth": "quick|deep|comprehensive" }
```

Response 201
```json
{
  "sessionId": "uuid",
  "agentRunId": "uuid",
  "status": "initiated",
  "message": "Research initiated successfully"
}
```

Errors
- 400: missing query/depth
- 401: unauthenticated
- 500: failed to initiate

#### GET /research/status/:sessionId
Get the latest agent run status for a session.

Response 200
```json
{ "status": "pending|processing|completed|failed", "message": "Research completed" }
```

Errors
- 401: unauthenticated
- 500: not found or server error

#### GET /research/logs/:sessionId
Get agent logs for the latest run of a session.

Response 200
```json
{ "logs": ["Research initiated for query: ...", "Collected 5 relevant sources", "..."] }
```

#### GET /research/sources/:sessionId
Get curated sources for the session (agent sources + external providers + user uploads).

Response 200
```json
{
  "sources": [
    {
      "title": "Paper title",
      "url": "https://...",
      "content": "sanitized text...",
      "source_type": "tavily|web|arxiv|pubmed|wikipedia|user_upload",
      "relevance_score": 0.85,
      "summary": "Short summary...",
      "pdf_url": "https://... (optional)",
      "doi": "10.1234/abc (optional)"
    }
  ]
}
```

#### POST /research/upload/:sessionId
Attach a user PDF to the session. The file is stored locally and added as a source.

Request
```json
{ "filename": "mypaper.pdf", "contentBase64": "<base64>" }
```

Response 201
```json
{ "key": "<storage-key>", "filename": "mypaper.pdf" }
```

Errors
- 400: missing fields
- 401: unauthenticated
- 500: upload failure

#### POST /research/analyze
Return the analysis stored in the latest agent run (does not re-run analysis).

Request
```json
{ "sessionId": "uuid", "analysisType": "default" }
```

Response 200
```json
{ "analysis": { "summary": "...", "key_findings": ["..."], "confidence_score": 0.8, "recommendations": ["..."] }, "analysisType": "default" }
```

Errors
- 400: missing sessionId/analysisType
- 401: unauthenticated
- 500: not found or server error

#### GET /research/report/:sessionId
Get the generated markdown report for the session.

Response 200
```json
{ "report": "## Executive Summary...", "metadata": { "sources_collected": 5, "analysis_duration": 1234, "confidence_level": 0.82, "total_tokens_used": 9876 }, "status": "completed" }
```

#### POST /research/feedback
Refine the report for the session by providing feedback (spawns a new completed run with refined report).

Request
```json
{ "sessionId": "uuid", "feedback": "Focus more on evaluation metrics", "refinementRequest": "optional details" }
```

Response 200
```json
{ "message": "Research refined successfully", "agentRunId": "uuid", "status": "completed" }
```

Errors
- 400: missing sessionId/feedback
- 401: unauthenticated
- 500: not found or server error

#### POST /research/followup
Ask a follow-up question answered from the session’s sources and report (RAG).

Request
```json
{ "sessionId": "uuid", "question": "What datasets were used?" }
```

Response 200
```json
{ "answer": "..." }
```

Errors
- 400: missing sessionId/question
- 401: unauthenticated
- 500: not found or server error

---

### Health

#### GET /health
Basic service health probe.

Response 200
```json
{ "status": "ok", "timestamp": "2025-08-27T10:55:23.000Z", "service": "askademic-backend" }
```

---

### Common headers
- `Authorization: Bearer <sessionToken>`
- `Content-Type: application/json`

### Error format
Errors return a JSON body:
```json
{ "error": "Message" }
```

### Notes
- Session tokens expire; re-authenticate via `/user/signin` when needed.
- Some pages may block scraping; sources endpoint performs best-effort enhancements with external providers.


