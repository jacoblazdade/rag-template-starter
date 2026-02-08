import { Router } from 'express';
import { AzureOpenAIService } from '../services/azureOpenAI.js';
import { AzureSearchService } from '../services/azureSearch.js';

const router = Router();

const openaiService = new AzureOpenAIService();
const searchService = new AzureSearchService();

interface QueryRequest {
  query: string;
  documentId?: string;
  topK?: number;
}

// Query endpoint (synchronous)
router.post('/', async (req, res) => {
  try {
    const { query, documentId, topK = 5 }: QueryRequest = req.body;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Query is required' });
      return;
    }

    // Generate embedding for the query
    const { embedding: queryEmbedding } = await openaiService.embedText(query);

    // Search for relevant chunks
    const searchFilter = documentId ? `documentId eq '${documentId}'` : undefined;
    const searchResults = await searchService.search(queryEmbedding, query, {
      top: topK,
      filter: searchFilter,
      hybridSearch: true,
    });

    if (searchResults.length === 0) {
      res.json({
        success: true,
        data: {
          answer: 'I could not find any relevant information in the documents.',
          sources: [],
        },
      });
      return;
    }

    // Build context from search results
    const context = searchResults
      .map((result, idx) => `[${idx + 1}] ${result.text}`)
      .join('\n\n');

    // Generate answer
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. 
If the context doesn't contain relevant information, say so. 
Always cite your sources using the [N] notation.`;

    const completion = await openaiService.generateCompletion(systemPrompt, query, context);

    res.json({
      success: true,
      data: {
        answer: completion.text,
        sources: searchResults.map((result) => ({
          documentId: result.documentId,
          text: result.text.substring(0, 200) + '...',
          score: result.score,
          pageNumber: result.pageNumber,
        })),
        tokenUsage: completion.tokenCount,
      },
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process query',
    });
  }
});

// Streaming query endpoint
router.post('/stream', async (req, res) => {
  try {
    const { query, documentId, topK = 5 }: QueryRequest = req.body;

    if (!query || query.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Query is required' });
      return;
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Generate embedding for the query
    const { embedding: queryEmbedding } = await openaiService.embedText(query);

    // Search for relevant chunks
    const searchFilter = documentId ? `documentId eq '${documentId}'` : undefined;
    const searchResults = await searchService.search(queryEmbedding, query, {
      top: topK,
      filter: searchFilter,
      hybridSearch: true,
    });

    if (searchResults.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'answer', content: 'I could not find any relevant information in the documents.' })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Send sources first
    res.write(`data: ${JSON.stringify({ type: 'sources', sources: searchResults.map(r => ({ documentId: r.documentId, score: r.score, pageNumber: r.pageNumber })) })}\n\n`);

    // Build context from search results
    const context = searchResults
      .map((result, idx) => `[${idx + 1}] ${result.text}`)
      .join('\n\n');

    // Generate streaming answer
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context. 
If the context doesn't contain relevant information, say so. 
Always cite your sources using the [N] notation.`;

    const stream = openaiService.generateStreamingCompletion(systemPrompt, query, context);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ type: 'answer', content: chunk })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Streaming query error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Failed to process query' })}\n\n`);
    res.end();
  }
});

export { router as queryRouter };
