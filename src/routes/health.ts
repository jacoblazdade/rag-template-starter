import { Router, type Router as RouterType } from 'express';
import { env } from '../config/env.js';

const router: RouterType = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
}

router.get('/', (_req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    version: '1.0.0',
  };
  
  res.json({ success: true, data: health });
});

export { router as healthRouter };
