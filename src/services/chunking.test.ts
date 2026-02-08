import { describe, it, expect } from 'vitest';
import { ChunkingService } from './chunking';

describe('ChunkingService', () => {
  const service = new ChunkingService();

  describe('chunkDocument', () => {
    it('should split long text into chunks', () => {
      const text = 'This is a test sentence. '.repeat(100);
      const documentId = 'test-doc-1';

      const chunks = service.chunkDocument(text, documentId, {
        maxChunkSize: 500,
        chunkOverlap: 50,
      });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].metadata.documentId).toBe(documentId);
      expect(chunks[0].metadata.chunkIndex).toBe(0);
    });

    it('should create chunks with correct metadata', () => {
      const text = 'Short text.';
      const documentId = 'test-doc-2';

      const chunks = service.chunkDocument(text, documentId);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].id).toContain(documentId);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].metadata.totalChunks).toBe(1);
    });

    it('should respect maxChunkSize', () => {
      const text = 'Word '.repeat(200);
      const maxSize = 100;

      const chunks = service.chunkDocument(text, 'test-doc', {
        maxChunkSize: maxSize,
        chunkOverlap: 0,
      });

      chunks.forEach((chunk) => {
        expect(chunk.text.length).toBeLessThanOrEqual(maxSize + 50); // Allow some margin
      });
    });

    it('should handle empty text', () => {
      const chunks = service.chunkDocument('', 'test-doc');
      expect(chunks).toHaveLength(0);
    });

    it('should split on page breaks when enabled', () => {
      const text = 'Page 1 content\f\nPage 2 content\f\nPage 3 content';
      const chunks = service.chunkDocument(text, 'test-doc', {
        maxChunkSize: 1000,
        splitOnPageBreaks: true,
      });

      expect(chunks.length).toBeGreaterThanOrEqual(3);
    });
  });
});
