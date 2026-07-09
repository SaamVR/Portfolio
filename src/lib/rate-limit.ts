export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const rateLimits = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(identifier: string, options: RateLimitOptions) {
  const now = Date.now();
  const current = rateLimits.get(identifier);

  if (!current || current.expiresAt < now) {
    rateLimits.set(identifier, { count: 1, expiresAt: now + options.windowMs });
    return { success: true, limit: options.limit, remaining: options.limit - 1, reset: now + options.windowMs };
  }

  if (current.count >= options.limit) {
    return { success: false, limit: options.limit, remaining: 0, reset: current.expiresAt };
  }

  current.count++;
  return { success: true, limit: options.limit, remaining: options.limit - current.count, reset: current.expiresAt };
}

// Clean up expired entries every minute
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimits.entries()) {
      if (value.expiresAt < now) {
        rateLimits.delete(key);
      }
    }
  }, 60000);

  cleanupTimer.unref?.();
}
