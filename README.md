# rag-privacy-first

**Live demo:** not deployed yet — planned at `rag.build-with-deepak.com`. This
repo is complete and locally verified (see [Local setup](#local-setup)); it
has not yet been deployed to the VPS or exercised against a real Ollama
instance. See [Status](#status) before treating anything below as "in
production."

## The problem

A bank, a government agency or a hospital cannot send its documents to
OpenAI to ask questions about them — not because the technology doesn't
work, but because the data isn't allowed to leave their infrastructure in
the first place. Retrieval-augmented generation is well understood; running
the entire pipeline, including the language model itself, on hardware the
organization controls is the harder and less commonly demonstrated half of
it. This is a small, public version of that: upload a PDF (or use the
provided sample), ask questions about it, and get answers with citations —
with every step, from embedding to generation, running on this server and
nothing sent to a third-party model API.

## Try it

The demo is account-gated but frictionless: **Continue with demo account**
issues a real 2-hour session against the real API — same pipeline, same
models, same citations a registered user would get. Registration
(persistent accounts whose documents outlive the demo's one-hour purge) is
in progress; the Register button says so honestly, and so does
`POST /api/auth/register` (501). Every API surface except health and auth
requires a session; the query stream accepts the token as a `?token=`
query param because the browser's `EventSource` cannot set headers — the
only endpoint where that trade-off exists.

## Architecture

```mermaid
flowchart TB
    subgraph Browser
        UI[Angular SPA]
    end

    subgraph VPS -- host nginx, TLS
        Nginx[nginx :443]
    end

    subgraph "Docker Compose stack"
        Web[web container<br/>nginx serving the Angular build]
        API[api container<br/>NestJS]
        Qdrant[(Qdrant<br/>vector store)]
    end

    Ollama[Ollama<br/>already running on the VPS, outside Docker]

    UI -->|HTTPS| Nginx
    Nginx -->|proxy_pass, SSE unbuffered| Web
    Web -->|"/api/*"| API
    API -->|embed, generate| Ollama
    API -->|upsert, search| Qdrant
```

Request flow for a question, once a document is ingested:

1. Browser opens an `EventSource` to `GET /api/query/stream` (SSE requires
   GET — see the note in `apps/api/src/query/query.controller.ts`).
2. The request queues behind `MAX_CONCURRENT_INFERENCE` other in-flight
   generations if the server is busy; the client sees live queue-position
   updates while it waits.
3. The question is embedded (Ollama, `nomic-embed-text`) and the top 4
   chunks are retrieved from Qdrant, filtered to this document, with a
   similarity score per chunk.
4. The retrieved chunks and the question are assembled into a prompt asking
   the model to answer using only that context and cite passage numbers.
5. The answer streams back token-by-token (Ollama's native streaming API,
   not the OpenAI-compatible shim — see the comment in `ollama.service.ts`
   for why).
6. A background job purges any document (and its vectors) older than one
   hour, every 5 minutes.

## Key decisions and trade-offs

**Qdrant over pgvector.** The brief this demo was built from listed pgvector
as the nominal preference — it demonstrates SQL depth alongside a dedicated
vector store. This build uses Qdrant instead, deliberately: it's the same
vector store already running in production for a real system (SmartSitting's
own RAG agent — see `build-with-deepak.com/case-studies/smartsitting`), so
this demo reuses proven judgment rather than introducing a second, unproven
storage choice purely for the sake of variety. The trade-off is a second
piece of infrastructure to operate (a Postgres instance with pgvector would
have piggybacked on infrastructure many stacks already run); Qdrant's own
operational surface is small enough on a single VPS that this was worth it.

**One shared Qdrant collection, not one per document.** Every uploaded
document's chunks live in the same collection, distinguished by a
`documentId` payload field and filtered at query time. A collection per
upload would mean every visitor's PDF creates and eventually tears down its
own HNSW index — fine at a handful of uploads a day, an operational liability
the moment usage grows. Filtering a shared collection costs a small amount of
per-query overhead; recreating collections costs a write-heavy admin
operation on every single upload. For a single-instance public demo, the
shared collection is the one that degrades gracefully under load instead of
under document count.

**Word-count chunking, not a real tokenizer.** 220 words per chunk with a
40-word overlap, chosen as a proxy for roughly 300 embedding tokens with
enough overlap that a sentence straddling a chunk boundary still appears
whole in at least one chunk. A real tokenizer would match the embedding
model's actual token boundaries; it would also mean shipping or downloading
that model's vocabulary file into a service whose whole job is to stay
dependency-light. The approximation has margin built in specifically because
it's an approximation — see the rationale comment in `chunking.service.ts`.

**PDFs are parsed in memory and never written to disk.** `multer`'s
`memoryStorage()` and `pdf-parse`'s buffer-based API mean an uploaded file's
bytes exist only for the duration of the ingest request. Only the resulting
chunk embeddings persist, in Qdrant, bounded by the same one-hour TTL stated
on the page. This isn't required by the brief, but it's the more honest
version of "nothing leaves this server, and nothing sits on it longer than
it has to" — the smaller the blast radius if this box is ever compromised,
the fewer PDFs of other people's documents are sitting in an `uploads/`
directory waiting to be found.

**A hard concurrency cap with a bounded queue, not unlimited fan-out.** A
single Ollama process on a modest VPS serves generations one at a time in
practice; letting every visitor's request hit it concurrently doesn't
increase throughput, it just makes every request slow down together instead
of queuing predictably. `InferenceQueueService` caps concurrent generations
(`MAX_CONCURRENT_INFERENCE`, default 2) and gives everyone waiting a live
position — see `apps/api/src/common/inference-queue.service.ts`, including
the fix (caught by its own unit test) where an early version re-notified
every waiter's position on every new arrival instead of only the ones whose
position actually changed. Beyond `MAX_QUEUE_LENGTH` (default 20) new
requests are rejected outright with a clear "at capacity" message — an
unbounded wait list is not an acceptable failure mode for an unattended
public demo.

**In-memory document registry, not a database.** The source of truth for
"does this document still exist" is Qdrant's own `expiresAt` payload field;
`DocumentsService`'s in-memory map exists only so the purge job and the
query endpoint can answer that question in microseconds instead of a network
round trip. It is rebuilt fresh on every process restart, which is
acceptable specifically because a restart is also a reasonable point to
re-verify state against Qdrant rather than trust a persisted cache.

## Guardrails

- Per-IP rate limiting (`@nestjs/throttler`, configurable via
  `RATE_LIMIT_LIMIT` / `RATE_LIMIT_TTL_MS`).
- PDF-only uploads, size-capped (`MAX_UPLOAD_BYTES`, default 15MB),
  validated both client-side (immediate feedback) and server-side (the
  guarantee that actually matters).
- Documents and their vectors auto-purge after one hour (`DOCUMENT_TTL_MS`)
  — stated on the page, not just in this README.
- Hard concurrency cap with a bounded, visible queue (see above), rather
  than unlimited concurrent inference or an unbounded wait list.
- Every Ollama/Qdrant failure path returns a specific, honest error message
  (cold model, unreachable vector store, capacity exceeded) instead of a
  generic 500 or a silently hung connection.

## What I'd change at 100x scale

The in-memory inference queue and document registry are correct for exactly
the deployment this repo describes: one process, one VPS, one Ollama
instance. Neither survives a second replica — the queue's whole point is
that it holds one true count of in-flight generations, and two processes
each holding their own count would just double the effective concurrency
cap without either process knowing it. At real scale this becomes a job
queue (Redis-backed, or a proper message queue) shared across replicas, with
Ollama itself either horizontally scaled behind a load balancer or replaced
by a dedicated inference-serving layer (vLLM, TGI) built for exactly that.
The document registry would move to Redis alongside it, keyed the same way,
so "does this document exist" stays a fast lookup instead of becoming a
database round trip once it can't just live in one process's memory.

Chunking and embedding would also change: sequential embedding calls
(`OllamaService.embedBatch`) are the right choice against a single-instance
Ollama server today — see the rationale in the code — but they become the
ingestion bottleneck the moment inference capacity is no longer the shared
constraint. At scale, embedding would batch against a dedicated embedding
service sized independently of the generation path, since the two have very
different load profiles (embedding is bursty per-upload, generation is
bursty per-question).

## Local setup

Requires Node.js 22+, pnpm (`corepack enable`), and — for anything beyond a
build/lint/test pass — a locally reachable Ollama instance and Qdrant.
**This has been verified to build, lint and pass its full test suite; it has
not been exercised end-to-end against a real Ollama/Qdrant instance in this
environment, which had neither installed.** Confirm the full pipeline
(upload → embed → retrieve → generate) against real instances before
trusting it in front of a recruiter.

```bash
# from the repo root
corepack enable
pnpm install

# terminal 1 — API (defaults to http://localhost:3000; needs Ollama at
# localhost:11434 and Qdrant at localhost:6333, or override via .env — see
# .env.example)
pnpm --filter api start:dev

# terminal 2 — frontend (http://localhost:4200, proxies /api to :3000 via
# apps/web/proxy.conf.json)
pnpm --filter web start
```

Run the checks that gated this repo before it was written up as done:

```bash
pnpm --filter api build && pnpm --filter api lint && pnpm --filter api test && pnpm --filter api test:e2e
pnpm --filter web build && pnpm --filter web test
```

## Deploying to the VPS

1. `cp .env.example .env` — set `JWT_SECRET` (required; compose refuses to
   start without it) and confirm `OLLAMA_BASE_URL` actually reaches this
   VPS's Ollama instance (see the comment in `docker-compose.yml` about
   `host.docker.internal`).
2. `docker compose up -d --build`. This starts `qdrant`, `api` and `web`;
   only `web` binds a host port, and only on `127.0.0.1:8090` — nothing here
   is exposed to the public internet directly.
3. Copy `nginx/rag.build-with-deepak.com.conf` to this VPS's
   `/etc/nginx/sites-available/`, symlink it into `sites-enabled`, and run
   `certbot --nginx -d rag.build-with-deepak.com` to provision TLS (the
   config's cert paths are placeholders certbot rewrites on first run).
4. `docker compose restart` survives a reboot via each service's
   `restart: unless-stopped` policy, as long as the Docker daemon itself is
   enabled at boot (`systemctl enable docker`) — true by default on most VPS
   images, worth confirming once rather than assuming.
5. Uptime monitoring and the shared `status.build-with-deepak.com` page
   (showing all three demos green) are intentionally **not** built here —
   see [Status](#status).

`GET /api/health` is an unauthenticated liveness probe suitable for
whatever uptime monitor ends up watching this.

## Status

- [x] Full RAG pipeline: chunking, embedding, retrieval with visible
      similarity scores, streamed generation, citations
- [x] Demo-account auth end to end (2h JWT sessions, register = honest 501
      coming-soon), all API surfaces guarded, `?token=` path for EventSource
- [x] Guardrails: rate limiting, upload validation, 1-hour auto-purge,
      concurrency cap with visible queue position and a capacity ceiling
- [x] Builds, lints and passes its full test suite (API: unit + e2e;
      frontend: unit, including a faked-EventSource test of the SSE bridge)
- [x] Docker Compose + Dockerfiles + host nginx config + `.env.example`
      written and internally consistent
- [ ] **Not yet run against a real Ollama or Qdrant instance** — this
      environment had neither installed. Verify the full pipeline before
      relying on it.
- [ ] Not yet deployed to the VPS or exercised behind real TLS
- [ ] Registration/persistent accounts — in progress (demo-first by design)
- [ ] `status.build-with-deepak.com` — deferred until all three demos are
      deployed; a status page for undeployed services would show nothing
      but red
