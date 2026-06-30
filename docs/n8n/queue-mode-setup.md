# n8n Queue Mode — decouple heavy execution from the interactive console

## Why

n8n currently runs as a **single Node process** (regular mode). The LLM waits inside
Radar do not block (they are async I/O), but the *synchronous* CPU work does: the sweep
parsing large Jina-Reader markdown with regexes per article, big JSON parses, the
concepter/researcher. While that runs it briefly blocks the event loop, and **every
webhook stalls with it**. Symptom seen during diagnosis: webhooks that normally answer in
~0.3s occasionally timing out at 30s, plus a cold-start spike on `portal-userinfo` (~2.9s).

**Queue mode** moves all workflow execution onto separate **worker** processes. The main
instance only receives webhooks and serves the UI; workers pull jobs from Redis and run
them. Heavy Radar work can no longer freeze the user-facing layer — the two are detached.

> **Important:** n8n has **no per-workflow "main vs worker" toggle.** Queue mode is
> instance-wide: in queue mode *all* production executions (webhook-triggered **and** cron,
> so Radar sweep included) run on workers. That is exactly what we want here — the whole
> interactive layer stays flat under load, not just Radar.

## Architecture

```
            ┌──────────────┐     enqueue      ┌─────────┐     pull job     ┌──────────────┐
 webhooks → │  main (web)  │ ───────────────► │  Redis  │ ◄─────────────── │  worker(s)   │
 UI / cron  │  n8n start   │                  │ (Bull)  │                  │  n8n worker  │
            └──────┬───────┘                  └─────────┘                  └──────┬───────┘
                   │                                                              │
                   └──────────────── same Postgres (shared) ─────────────────────┘
```

- **main**: same service you run today, start command stays `n8n start`. Receives webhooks,
  serves UI, runs the scheduler/triggers, enqueues executions.
- **worker**: a new Railway service, same image/repo and **same env**, start command
  `n8n worker`. Runs the executions.
- **Redis**: Railway Redis plugin, the job queue between them.
- **Postgres**: unchanged, shared by both (this is where workflows/credentials/executions live).

## Railway steps

### 1. Add Redis
Railway dashboard → project → **New → Database → Redis**. Note its private connection vars
(`RAILWAY_PRIVATE_DOMAIN`, `REDISPORT`, `REDISPASSWORD`).

### 2. Set these env vars on the EXISTING n8n (main) service
```bash
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=${{Redis.RAILWAY_PRIVATE_DOMAIN}}
QUEUE_BULL_REDIS_PORT=${{Redis.REDISPORT}}
QUEUE_BULL_REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
QUEUE_HEALTH_CHECK_ACTIVE=true
# Optional: keep ad-hoc manual runs off the workers so UI test-runs stay snappy
OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=false
```
Leave the existing `DB_*` / Postgres vars and `N8N_ENCRYPTION_KEY` as they are.

### 3. Add a new "n8n-worker" service
- Same image / repo / Dockerfile as main (identical n8n version).
- **Start command:** `n8n worker --concurrency=5`
  (raise concurrency later if workers sit idle; 5 is a safe start.)
- Copy **all** env vars from main, especially:
  - **`N8N_ENCRYPTION_KEY` — must be byte-identical to main**, or the worker cannot decrypt
    credentials and every node using a credential fails. This is the #1 setup mistake.
  - all `DB_*` Postgres vars (same database).
  - the same `QUEUE_BULL_REDIS_*` and `EXECUTIONS_MODE=queue`.
- The worker needs **no** public domain / port (it pulls from Redis, serves no HTTP).

### 4. Deploy main first, then the worker
After both are up, run any workflow. It should appear in the worker's logs
(`Start job: <id>`), not the main's. The console's webhook latency should now stay flat
even while a Radar sweep or a studio AI turn is running.

## Verify it worked
- Worker logs show `n8n worker is now ready` and `Start job:` lines.
- Trigger a Radar sweep (or any heavy workflow) and simultaneously hit a light webhook
  (`curl https://workflow.wingsuite.io/webhook/portal-usage`) — it should stay ~0.2–0.3s
  instead of spiking.
- In the n8n UI, executions still show normally (they are read from Postgres).

## Caveats / notes
- **Encryption key + DB must match** across main and worker (see step 3).
- Webhooks are still received by `main`. At this scale that is fine; if the *webhook intake*
  itself ever becomes the bottleneck you can add dedicated `n8n webhook` processors, but that
  is not needed now.
- Cron/schedule triggers run on `main` and are enqueued to workers — Radar sweep keeps
  working unchanged.
- Scale out by adding more worker services (or raising `--concurrency`); no code changes.

## Rollback
Set `EXECUTIONS_MODE=regular` on main (or remove it) and delete the worker service. Redis can
stay; it is simply unused. No workflow or data changes are involved, so rollback is instant.

## What this does NOT require
- No changes to any workflow JSON, the console app, or the database schema.
- Purely a Railway/infra change. It cannot be applied via the n8n REST API.
