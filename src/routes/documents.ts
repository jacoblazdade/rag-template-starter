import type { Request } from 'express';
import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { BlobStorageService } from '../services/blobStorage.js';
import { DocumentParserService } from '../services/documentParser.js';
import { ChunkingService } from '../services/chunking.js';
import { queueDocumentProcessing } from '../services/jobQueue.js';

const router: RouterType = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Lazy-load service that requires credentials
let blobService: BlobStorageService | null = null;
const parserService = new DocumentParserService();
const chunkingService = new ChunkingService();

function getBlobService(): BlobStorageService {
  if (!blobService) {
    blobService = new BlobStorageService();
  }
  return blobService;
}

interface DocumentUploadRequest extends Request {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file?: any;
}

// Upload document
router.post('/', upload.single('file'), async (req: DocumentUploadRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowedTypes.includes(mimetype)) {
      res.status(400).json({
        success: false,
        error: `Unsupported file type: ${mimetype}`,
      });
      return;
    }

    // Generate document ID
    const documentId = randomUUID();

    // Upload to blob storage
    const uploadResult = await getBlobService().uploadDocument(buffer, originalname);

    // Parse document
    const parseResult = await parserService.parseDocument(buffer);

    // Chunk document
    const chunks = chunkingService.chunkDocument(parseResult.text, documentId);

    // Queue chunks for embedding and indexing
    const job = await queueDocumentProcessing(documentId, chunks);

    res.json({
      success: true,
      data: {
        documentId,
        filename: originalname,
        size,
        blobName: uploadResult.blobName,
        parseMethod: parseResult.method,
        pageCount: parseResult.pageCount,
        chunkCount: chunks.length,
        status: 'processing',
        jobId: job.id,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload document',
    });
  }
});

// Get document status
router.get('/:documentId/status', async (req, res) => {
  try {
    const { documentId } = req.params;

    // TODO: Query document status from database

    res.json({
      success: true,
      data: {
        documentId,
        status: 'processing',
        progress: 0.5,
      },
    });
  } catch (error) {
    console.error('Document status error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get document status',
    });
  }
});

// List documents
router.get('/', async (_req, res) => {
  try {
    // TODO: Query documents from database

    res.json({
      success: true,
      data: {
        documents: [],
        total: 0,
      },
    });
  } catch (error) {
    console.error('Document list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list documents',
    });
  }
});

// Delete document
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    // TODO: Delete from database
    // TODO: Delete from blob storage
    // TODO: Delete from search index

    res.json({
      success: true,
      data: { documentId, deleted: true },
    });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document',
    });
  }
});

export { router as documentsRouter };
