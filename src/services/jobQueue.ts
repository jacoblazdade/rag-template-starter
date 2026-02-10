import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { AzureOpenAIService } from './azureOpenAI.js';
import { AzureSearchService } from './azureSearch.js';
import { documentStore } from './documentStore.js';
import type { DocumentChunk } from './chunking.js';

interface ProcessDocumentJob {
  documentId: string;
  chunks: DocumentChunk[];
}

// Redis connection config
const redisConnection = {
  url: env.REDIS_URL,
};

// Lazy-loaded queue
let documentQueue: Queue<ProcessDocumentJob> | null = null;

function getQueue(): Queue<ProcessDocumentJob> {
  if (!documentQueue) {
    documentQueue = new Queue('document-processing', {
      connection: redisConnection,
    });
  }
  return documentQueue;
}

// Worker instance
let worker: Worker | null = null;

// Worker to process jobs
export function startDocumentWorker(): Worker | null {
  // Skip if Redis is not configured
  if (!env.REDIS_URL) {
    console.warn('⚠️  REDIS_URL not set, document processing worker not started');
    return null;
  }

  if (worker) {
    return worker;
  }

  try {
    const openaiService = new AzureOpenAIService();
    const searchService = new AzureSearchService();

    worker = new Worker(
      'document-processing',
      async (job: Job<ProcessDocumentJob>) => {
        const { documentId, chunks } = job.data;

        console.log(`📝 Processing document ${documentId} with ${chunks.length} chunks...`);

        // Update progress
        await job.updateProgress(10);

        // Generate embeddings for all chunks
        const texts = chunks.map((chunk) => chunk.text);
        const embeddings = await openaiService.embedBatch(texts);

        await job.updateProgress(50);

        // Prepare documents for indexing
        const documents = chunks.map((chunk, index) => ({
          id: chunk.id,
          documentId: chunk.metadata.documentId,
          chunkIndex: chunk.metadata.chunkIndex,
          text: chunk.text,
          embedding: embeddings[index].embedding,
          pageNumber: chunk.metadata.pageNumber,
          metadata: {},
        }));

        await job.updateProgress(75);

        // Index in Azure Search
        await searchService.indexChunks(documents);

        await job.updateProgress(100);

        console.log(`✅ Document ${documentId} processed successfully`);

        return { documentId, indexedChunks: chunks.length };
      },
      { connection: redisConnection },
    );

    worker.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, result);
      // Update document status to indexed
      const { documentId } = job.data as ProcessDocumentJob;
      documentStore.update(documentId, { status: 'indexed' });
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err);
      // Update document status to failed
      if (job) {
        const { documentId } = job.data as ProcessDocumentJob;
        documentStore.update(documentId, { status: 'failed' });
      }
    });

    console.log('📋 Document processing worker started');
    return worker;
  } catch (error) {
    console.error('❌ Failed to start document worker:', error);
    return null;
  }
}

// Add job to queue
export async function queueDocumentProcessing(
  documentId: string,
  chunks: DocumentChunk[],
): Promise<Job<ProcessDocumentJob> | null> {
  // Skip if Redis is not configured
  if (!env.REDIS_URL) {
    console.warn('⚠️  REDIS_URL not set, skipping document processing queue');
    return null;
  }

  try {
    return getQueue().add('process-document', {
      documentId,
      chunks,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  } catch (error) {
    console.error('❌ Failed to queue document processing:', error);
    return null;
  }
}
