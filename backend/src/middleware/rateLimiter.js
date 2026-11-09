// In-memory sliding window rate limiter
const ipRequestMap = new Map();

// Periodic cleanup of expired rate limit buckets (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Too many requests from this IP, please try again later.',
}) => {
  return (req, res, next) => {
    // In test environment or health checks, skip rate limit
    if (process.env.NODE_ENV === 'test' || req.path === '/api/health') {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || req.path}_${ip}`;
    const now = Date.now();

    let record = ipRequestMap.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipRequestMap.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
};

// Pre-configured rate limiters
export const standardLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // 25 attempts
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

export const generationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 doc/AI generation requests per minute
  message: 'Document generation rate limit exceeded. Please wait a moment.',
});
