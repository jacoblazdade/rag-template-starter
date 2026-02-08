import 'dotenv/config';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthRouter } from './routes/health.js';
import { env } from './config/env.js';

const app = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/v1/health', healthRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 RAG Template API running on port ${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/api/v1/health`);
});

export { app };
