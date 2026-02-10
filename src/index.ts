import 'dotenv/config';
import express, { type Express } from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthRouter } from './routes/health.js';
import { documentsRouter } from './routes/documents.js';
import { queryRouter } from './routes/query.js';
import { adminRouter } from './routes/admin.js';
import { env } from './config/env.js';
import { startDocumentWorker } from './services/jobQueue.js';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/query', queryRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/admin', adminRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(env.PORT, () => {
  console.log(`🚀 RAG Template API running on port ${env.PORT}`);
  console.log(`📊 Health check: http://localhost:${env.PORT}/api/v1/health`);
});

// Start document processing worker (if Redis is available)
const worker = startDocumentWorker();
if (worker) {
  console.log('📋 Document processing worker started');
}

export { app };
