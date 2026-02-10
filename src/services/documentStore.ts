import { prisma } from '../lib/prisma.js';
import type { Document, Chunk } from '@prisma/client';

export type { Document, Chunk };

export class DocumentStore {
  async add(doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    return prisma.document.create({
      data: doc as Document,
    });
  }

  async get(id: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { id },
      include: { chunks: true },
    });
  }

  async getAll(): Promise<Document[]> {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updates: Partial<Document>): Promise<Document | null> {
    return prisma.document.update({
      where: { id },
      data: updates,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.document.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    indexedDocuments: number;
    avgChunksPerDoc: number;
  }> {
    const [
      totalDocuments,
      totalChunks,
      indexedDocuments,
      avgChunks,
    ] = await Promise.all([
      prisma.document.count(),
      prisma.chunk.count(),
      prisma.document.count({ where: { status: 'indexed' } }),
      prisma.document.aggregate({
        _avg: { chunkCount: true },
      }),
    ]);

    return {
      totalDocuments,
      totalChunks,
      indexedDocuments,
      avgChunksPerDoc: Math.round(avgChunks._avg?.chunkCount || 0),
    };
  }

  // Chunk operations
  async addChunk(chunk: Omit<Chunk, 'id'>): Promise<Chunk> {
    return prisma.chunk.create({
      data: chunk as Chunk,
    });
  }

  async getChunksByDocumentId(documentId: string): Promise<Chunk[]> {
    return prisma.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }
}

export const documentStore = new DocumentStore();
