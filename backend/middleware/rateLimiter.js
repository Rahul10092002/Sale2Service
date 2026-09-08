/**
 * Lightweight In-Memory API Rate Limiter Middleware
 * Prevents rapid automated API requests, double-clicks, and brute-force submissions.
 */
const requestStore = new Map();

// Cleanup stale rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const apiRateLimiter = ({
  windowMs = 60 * 1000, // 1 minute window
  max = 60, // Limit each IP / user to 60 requests per windowMs
  message = "Too many requests. Please wait a moment before trying again.",
} = {}) => {
  return (req, res, next) => {
    // Identify by authenticated user ID or fallback to client IP
    const clientKey = req.user?.userId || req.user?.shopId || req.ip || req.headers["x-forwarded-for"] || "global_client";
    const key = `${req.baseUrl}${req.path}_${clientKey}`;
    const now = Date.now();

    const record = requestStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    requestStore.set(key, record);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        error_code: "RATE_LIMIT_EXCEEDED",
      });
    }

    next();
  };
};

/**
 * Strict Rate Limiter for Mutation / Form Submissions (POST, PUT, DELETE)
 * Prevents double-clicks and rapid duplicacy on form submits.
 */
export const strictMutationRateLimiter = apiRateLimiter({
  windowMs: 10 * 1000, // 10 seconds window
  max: 5, // Max 5 mutation submissions in 10 seconds
  message: "Slow down! You are submitting forms too quickly. Please wait a few seconds.",
});
