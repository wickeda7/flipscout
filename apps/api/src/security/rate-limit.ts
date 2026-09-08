import type { IncomingMessage } from "node:http";

export interface RateLimitRule {
  key: string;
  limit: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  check(
    request: IncomingMessage,
    rule: RateLimitRule,
  ): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const client = clientIdentifier(request);
    const bucketKey = `${rule.key}:${client}`;
    const current = this.buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + rule.windowMs,
      });
      this.cleanup(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    current.count += 1;

    if (current.count <= rule.limit) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  private cleanup(now: number) {
    if (this.buckets.size < 5000) return;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

function clientIdentifier(request: IncomingMessage): string {
  const trustProxy = process.env.TRUST_PROXY === "true";

  if (trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];

    if (typeof forwarded === "string") {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }

    if (Array.isArray(forwarded)) {
      const first = forwarded[0]?.split(",")[0]?.trim();
      if (first) return first;
    }
  }

  return request.socket.remoteAddress ?? "unknown";
}
