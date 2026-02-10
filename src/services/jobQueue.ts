import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { AzureOpenAIService } from './azureOpenAI.js';
import { AzureSearchService } from './azureSearch.js';
import type { DocumentChunk } from './chunking.js';

interface ProcessDocumentJob {
  documentId: string;
  chunks: DocumentChunk[];
}

// Redis connection
const redisConnection = {
  url: env.REDIS_URL,
};

// Job queue
export const documentQueue = new Queue('document-processing', {
  connection: redisConnection,
});

// Worker to process jobs
export function startDocumentWorker(): Worker {
  const openaiService = new AzureOpenAIService();
  const searchService = new AzureSearchService();

  const worker = new Worker(
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
        metadata: {
          totalChunks: chunk.metadata.totalChunks,
        },
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
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err);
  });

  return worker;
}

// Add job to queue
export async function queueDocumentProcessing(
  documentId: string,
  chunks: DocumentChunk[],
): Promise<Job<ProcessDocumentJob>> {
  return documentQueue.add('process-document', {
    documentId,
    chunks,
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  });
}
