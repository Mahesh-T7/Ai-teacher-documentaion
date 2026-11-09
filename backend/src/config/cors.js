import cors from 'cors';

export const configureCors = () => {
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:3000',
  ];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, same-origin)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins or wildcard
      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV === 'development' ||
        process.env.CORS_ORIGIN === '*'
      ) {
        return callback(null, true);
      }

      // Check trusted hosting patterns (Vercel, Render, Railway)
      try {
        const hostname = new URL(origin).hostname;
        if (
          hostname.endsWith('.vercel.app') ||
          hostname.endsWith('.onrender.com') ||
          hostname.endsWith('.railway.app') ||
          hostname === 'localhost' ||
          hostname === '127.0.0.1'
        ) {
          return callback(null, true);
        }
      } catch (_) {}

      callback(new Error(`Origin ${origin} is blocked by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });
};
