import type { Request } from 'express';
import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { BlobStorageService } from '../services/blobStorage.js';
import { DocumentParserService } from '../services/documentParser.js';
import { ChunkingService } from '../services/chunking.js';
import { queueDocumentProcessing } from '../services/jobQueue.js';
import { documentStore } from '../services/documentStore.js';

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

    // Upload to blob storage
    const uploadResult = await getBlobService().uploadDocument(buffer, originalname);

    // Store document metadata first
    const doc = await documentStore.add({
      filename: originalname,
      size,
      blobName: uploadResult.blobName,
      parseMethod: 'native',
      pageCount: 0,
      chunkCount: 0,
      status: 'uploaded',
      jobId: '',
    });
    
    const documentId = doc.id;

    // Parse document
    const parseResult = await parserService.parseDocument(buffer);

    // Chunk document
    const chunks = chunkingService.chunkDocument(parseResult.text, documentId);

    // Queue chunks for embedding and indexing
    const job = await queueDocumentProcessing(documentId, chunks);

    // Update document with parsed info
    await documentStore.update(documentId, {
      parseMethod: parseResult.method,
      pageCount: parseResult.pageCount,
      chunkCount: chunks.length,
      status: job ? 'processing' : 'uploaded',
      jobId: String(job?.id || ''),
    });

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
        status: job ? 'processing' : 'uploaded',
        jobId: job?.id,
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
    const doc = await documentStore.get(documentId);

    if (!doc) {
      res.status(404).json({
        success: false,
        error: 'Document not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        documentId: doc.id,
        status: doc.status,
        chunkCount: doc.chunkCount,
        jobId: doc.jobId,
        createdAt: doc.createdAt,
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
    const documents = await documentStore.getAll();

    res.json({
      success: true,
      data: {
        documents: documents.map(d => ({
          id: d.id,
          filename: d.filename,
          size: d.size,
          status: d.status,
          chunkCount: d.chunkCount,
          pageCount: d.pageCount,
          createdAt: d.createdAt,
        })),
        total: documents.length,
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

    // Remove from store
    const deleted = await documentStore.delete(documentId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Document not found',
      });
      return;
    }

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
