export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    pageNumber?: number;
    chunkIndex: number;
    totalChunks: number;
  };
}

export interface ChunkingOptions {
  maxChunkSize: number;
  chunkOverlap: number;
  splitOnPageBreaks?: boolean;
}

export class ChunkingService {
  private defaultOptions: ChunkingOptions = {
    maxChunkSize: 1000,
    chunkOverlap: 200,
    splitOnPageBreaks: true,
  };

  chunkDocument(
    text: string,
    documentId: string,
    options: Partial<ChunkingOptions> = {},
  ): DocumentChunk[] {
    const opts = { ...this.defaultOptions, ...options };
    const chunks: DocumentChunk[] = [];

    // Split on page breaks first if enabled
    const pages = opts.splitOnPageBreaks ? text.split(/\f|\n{3,}/) : [text];

    let chunkIndex = 0;

    for (let pageNum = 0; pageNum < pages.length; pageNum++) {
      const pageText = pages[pageNum].trim();
      if (!pageText) continue;

      // Split page into chunks
      const pageChunks = this.splitText(pageText, opts.maxChunkSize, opts.chunkOverlap);

      for (const pageChunk of pageChunks) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          text: pageChunk,
          metadata: {
            documentId,
            pageNumber: pages.length > 1 ? pageNum + 1 : undefined,
            chunkIndex,
            totalChunks: 0, // Will be set after
          },
        });
        chunkIndex++;
      }
    }

    // Update totalChunks
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private splitText(text: string, maxSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // If single sentence is too long, split on words
      if (sentence.length > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        const words = sentence.split(' ');
        let wordChunk = '';
        
        for (const word of words) {
          if ((wordChunk + ' ' + word).length > maxSize) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        
        if (wordChunk) {
          currentChunk = wordChunk;
        }
        continue;
      }

      // Try to add sentence to current chunk
      if ((currentChunk + ' ' + sentence).length <= maxSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        // Start new chunk with overlap
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          
          // Get overlap text from end of previous chunk
          const overlapText = this.getOverlapText(currentChunk, overlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
      }
    }

    // Don't forget the last chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with NLP
    return text
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private getOverlapText(text: string, overlapSize: number): string {
    const words = text.split(' ');
    const overlapWords = words.slice(-Math.floor(overlapSize / 5)); // Approximate words
    return overlapWords.join(' ');
  }
}
