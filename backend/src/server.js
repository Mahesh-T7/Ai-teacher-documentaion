import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Initialize Database connection and start server
const startServer = async () => {
  try {
    await connectDB();

    const HOST = process.env.HOST || '0.0.0.0';
    const server = app.listen(PORT, HOST, () => {
      console.log(`=======================================================`);
      console.log(` 🚀 Teacher Documentation Portal API is running!`);
      console.log(` 📍 Address: http://${HOST}:${PORT}`);
      console.log(` 🌐 Health: http://localhost:${PORT}/api/health`);
      console.log(` 🛡️  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown
    const handleShutdown = () => {
      console.log('Received termination signal. Closing HTTP server...');
      server.close(() => {
        console.log('HTTP server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', handleShutdown);
    process.on('SIGINT', handleShutdown);

    // Prevent unhandled background worker/async errors from crashing the server
    process.on('unhandledRejection', (reason, promise) => {
      console.warn('[Server Warning] Unhandled Rejection intercepted:', reason?.message || reason);
    });

    process.on('uncaughtException', (err) => {
      console.error('[Server Warning] Uncaught Exception intercepted:', err?.message || err);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
};

startServer();
