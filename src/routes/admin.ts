import { Router, type Router as RouterType } from 'express';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { documentStore } from '../services/documentStore.js';
import { AzureSearchService } from '../services/azureSearch.js';

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
    const stats = await documentStore.getStats();
    const allDocs = await documentStore.getAll();
    const lastDoc = allDocs[0];

    res.json({
      success: true,
      data: {
        ...stats,
        lastUpload: lastDoc?.createdAt || null,
        storageUsed: allDocs.reduce((sum, d) => sum + d.size, 0),
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
    const searchService = new AzureSearchService();
    const chunks = await searchService.getChunksByDocumentId(documentId);
    
    res.json({
      success: true,
      data: {
        documentId,
        chunks: chunks.map((c: { id: string; text: string; pageNumber?: number }) => ({
          id: c.id,
          text: c.text,
          pageNumber: c.pageNumber,
        })),
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
