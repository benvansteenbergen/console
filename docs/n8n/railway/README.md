# Railway runbook: switch n8n to queue mode (worker)

Paste-ready config for moving heavy n8n execution onto a worker, so Radar's CPU-heavy
sweep/concepter/researcher stop stalling the interactive console. Background and the why are
in [`../queue-mode-setup.md`](../queue-mode-setup.md); this folder is the concrete Railway part.

Files:
- [`main-additions.env`](./main-additions.env) — variables to ADD to the existing n8n service.
- [`worker.env`](./worker.env) — variables for the new worker service.

## Steps (≈15 min, reversible)

1. **Add Redis.** Railway project → New → Database → **Redis**. No config needed.

2. **Update the main n8n service.** Open it → Variables → Raw Editor → paste the contents of
   `main-additions.env` (keep all existing variables) → Deploy. The `${{Redis.*}}` references
   resolve automatically once Redis exists in the same project.

3. **Create the worker service.** New service from the **same source/image** as the main n8n
   (duplicate it if Railway offers that). Then:
   - Settings → **Start Command**: `n8n worker --concurrency=5`
   - Variables: make them match the main service for everything in `worker.env`
     (especially **`N8N_ENCRYPTION_KEY`** and all `DB_*` — these must be byte-identical).
   - It needs **no public domain**.

4. **Deploy order:** main first (step 2), then the worker.

5. **Verify.**
   - Worker logs show `n8n worker is now ready` and `Start job: <id>` lines when workflows run.
   - Trigger a Radar sweep (or any heavy workflow) and at the same time hit a light webhook:
     `curl https://workflow.wingsuite.io/webhook/portal-usage` — it should stay ~0.2–0.3s
     instead of spiking into seconds.
   - The n8n UI still shows executions normally (read from Postgres).

## CLI alternative (instead of the dashboard)
```bash
railway link                       # pick the project
railway add --plugin redis         # add Redis
# set the main-service additions:
railway variables --service n8n --set EXECUTIONS_MODE=queue \
  --set QUEUE_BULL_REDIS_HOST='${{Redis.RAILWAY_PRIVATE_DOMAIN}}' \
  --set QUEUE_BULL_REDIS_PORT=6379 \
  --set QUEUE_BULL_REDIS_PASSWORD='${{Redis.REDISPASSWORD}}' \
  --set QUEUE_HEALTH_CHECK_ACTIVE=true \
  --set OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=false
# then create the worker service from the same image with start command: n8n worker --concurrency=5
```

## Rollback
On the main service set `EXECUTIONS_MODE=regular` (or remove the variable) and delete the worker
service. Redis can stay (unused). No workflow or database changes are involved, so it is instant.

## Gotchas
- **`N8N_ENCRYPTION_KEY` must match** main and worker, or credentials fail to decrypt on the worker.
- Both services point at the **same Postgres**.
- Webhooks are still received by main and enqueued — no per-workflow main/worker toggle exists,
  and that is fine: in queue mode all production executions (incl. the Radar cron) run on workers.
- Use the Redis **private** domain (`RAILWAY_PRIVATE_DOMAIN`, port 6379) to avoid egress costs.
