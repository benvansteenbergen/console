# Rate Limiting & Webhook Protection

This document outlines architecture options for rate limiting and protecting n8n webhooks at scale.

## Current State

- n8n **does not have built-in rate limiting** for webhooks
- Console API routes check authentication but have no request throttling
- All traffic flows: `Internet → Console API → n8n webhooks`

---

## Architecture Options

### Option 1: API Gateway in Front

```
Internet → Cloudflare/Kong → n8n webhooks
           (rate limit, auth, WAF)
```

| Tool | What it does | Cost |
|------|--------------|------|
| **Cloudflare** | Rate limiting, DDoS protection, WAF | Free tier available |
| **Kong** | Rate limiting, auth, transformations | Open source / Enterprise |
| **AWS API Gateway** | Rate limiting, throttling, API keys | Pay per request |

**Pros:** No n8n changes, battle-tested, handles DDoS
**Cons:** Extra hop, need to configure per-endpoint rules

**Cloudflare Setup:**
- Add domain to Cloudflare
- Create WAF rate limiting rules per endpoint
- Docs: https://developers.cloudflare.com/waf/rate-limiting-rules/

---

### Option 2: n8n Queue Mode (Built-in)

```
Internet → n8n Main (webhook receiver) → Redis Queue → n8n Workers
```

n8n supports this natively with `EXECUTIONS_MODE=queue`:

- **Main pod**: Receives webhooks, enqueues to Redis (fast, lightweight)
- **Workers**: Pull jobs from queue, execute workflows (scalable)
- **Redis**: BullMQ under the hood

```yaml
# Helm values or environment variables
EXECUTIONS_MODE: queue
QUEUE_BULL_REDIS_HOST: redis-master
QUEUE_BULL_REDIS_PORT: 6379

# Worker scaling
worker:
  replicaCount: 4
  concurrency: 5  # jobs per worker
```

**Pros:** Native n8n feature, horizontal scaling, queue backpressure
**Cons:** Need Redis + K8s/Docker Swarm, more infra to manage

**Reference:** https://magicorn.co/n8n-on-k8s-scalable-worker-setup-with-redis-queue/

---

### Option 3: Redis Rate Limiting in n8n Workflows

Add rate limiting nodes to individual workflows using Upstash Redis:

```
Webhook → Edit Fields → Redis INCR → IF (count > limit) → Response
```

**How it works:**
1. Webhook receives request
2. Edit Fields creates key like `{IP}:{current_minute}`
3. Redis INCR increments counter (TTL 60s = auto-expire)
4. IF node checks if count > threshold (e.g., 4 req/min)
5. Two paths: allow or reject with 429

**Pros:** Works today, flexible (per-IP, per-user, per-client)
**Cons:** Need Redis, adds ~3 nodes to every webhook workflow

**Reference:** https://upstash.com/blog/add-ratelimit-to-n8n

---

### Option 4: Rate Limit at Console API

Add rate limiting in Next.js API routes using `@upstash/ratelimit`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"), // 10 req/min
});

export async function POST(req: Request) {
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }
  // Forward to n8n...
}
```

**Pros:** Single implementation point, per-user limits, no n8n changes
**Cons:** Only works if n8n is not publicly accessible

---

### Option 5: Cloudflare Workers + Queue

```
Internet → Cloudflare Worker → Cloudflare Queue → n8n (private)
           (rate limit at edge)    (durable queue)
```

Cloudflare Workers have built-in rate limiting and can queue to Cloudflare Queues.

**Pros:** Edge rate limiting (global), serverless, very fast
**Cons:** Cloudflare lock-in, Workers have execution limits

**Reference:** https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

---

## Recommendations

| Scenario | Recommended Approach |
|----------|---------------------|
| **Quick win** | Cloudflare WAF rate limiting rules |
| **Console-only access to n8n** | Rate limit at Console API routes |
| **Need horizontal scaling** | n8n queue mode with Redis |
| **Enterprise / high volume** | Cloudflare → n8n queue mode → workers |

---

## Implementation Priority

1. **First:** Ensure n8n is not publicly accessible (only Console can reach it)
2. **Second:** Add Cloudflare in front for DDoS/WAF protection
3. **Third:** Enable n8n queue mode if scaling is needed
4. **Optional:** Add per-user rate limiting in Console API for expensive endpoints (chat, AI, uploads)

---

## Resources

- [n8n Queue Mode Docs](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Kong Rate Limiting Plugin](https://developer.konghq.com/plugins/rate-limiting/)
- [Upstash + n8n Tutorial](https://upstash.com/blog/add-ratelimit-to-n8n)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Webhook Scaling Guide](https://inventivehq.com/blog/webhook-scaling-performance-guide)
