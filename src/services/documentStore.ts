export interface Document {
  id: string;
  filename: string;
  size: number;
  blobName: string;
  parseMethod: 'native' | 'azure-ocr';
  pageCount: number;
  chunkCount: number;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  jobId?: string | number;
  createdAt: Date;
  updatedAt: Date;
}

class DocumentStore {
  private documents: Map<string, Document> = new Map();

  add(doc: Document): void {
    this.documents.set(doc.id, doc);
  }

  get(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAll(): Document[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  update(id: string, updates: Partial<Document>): Document | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    
    const updated = { ...doc, ...updates, updatedAt: new Date() };
    this.documents.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.documents.delete(id);
  }

  getStats(): {
    totalDocuments: number;
    totalChunks: number;
    indexedDocuments: number;
    avgChunksPerDoc: number;
  } {
    const docs = this.getAll();
    const totalChunks = docs.reduce((sum, d) => sum + d.chunkCount, 0);
    const indexedDocs = docs.filter(d => d.status === 'indexed').length;
    
    return {
      totalDocuments: docs.length,
      totalChunks,
      indexedDocuments: indexedDocs,
      avgChunksPerDoc: docs.length > 0 ? Math.round(totalChunks / docs.length) : 0,
    };
  }
}

// Singleton instance
export const documentStore = new DocumentStore();
