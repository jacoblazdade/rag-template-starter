import { Router, type Router as RouterType } from 'express';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const router: RouterType = Router();

// Serve admin dashboard HTML
router.get('/', async (_req, res) => {
  try {
    const html = await readFile(resolve(process.cwd(), 'src/admin/dashboard.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// Get admin stats
router.get('/stats', async (_req, res) => {
  try {
    // TODO: Get real stats from database
    // For now, return mock data
    res.json({
      success: true,
      data: {
        totalDocuments: 0,
        totalChunks: 0,
        indexedDocuments: 0,
        avgChunksPerDoc: 0,
        lastUpload: null,
        storageUsed: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get stats',
    });
  }
});

// Get chunks for a document
router.get('/documents/:documentId/chunks', async (req, res) => {
  try {
    const { documentId } = req.params;
    // TODO: Get real chunks from database/Azure Search
    res.json({
      success: true,
      data: {
        documentId,
        chunks: [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get chunks',
    });
  }
});

// Get job status
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    // TODO: Get real job status from BullMQ
    res.json({
      success: true,
      data: {
        jobId,
        status: 'unknown',
        progress: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get job status',
    });
  }
});

export { router as adminRouter };
