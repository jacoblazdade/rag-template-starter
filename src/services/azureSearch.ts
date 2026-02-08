import {
  SearchClient,
  SearchIndexClient,
  AzureKeyCredential,
  SearchIndex,
} from '@azure/search-documents';
import { env } from '../config/env.js';

export interface DocumentChunkIndex {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  pageNumber?: number;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  documentId: string;
  text: string;
  score: number;
  pageNumber?: number;
}

export interface SearchOptions {
  top?: number;
  filter?: string;
  hybridSearch?: boolean;
}

export class AzureSearchService {
  private searchClient: SearchClient<DocumentChunkIndex>;
  private indexClient: SearchIndexClient;
  private indexName: string;

  constructor() {
    const credential = new AzureKeyCredential(env.AZURE_SEARCH_API_KEY);
    this.indexName = env.AZURE_SEARCH_INDEX_NAME;

    this.searchClient = new SearchClient<DocumentChunkIndex>(
      env.AZURE_SEARCH_ENDPOINT,
      this.indexName,
      credential,
    );

    this.indexClient = new SearchIndexClient(env.AZURE_SEARCH_ENDPOINT, credential);
  }

  /**
   * Create or update the search index
   */
  async createIndex(): Promise<void> {
    const index: SearchIndex = {
      name: this.indexName,
      fields: [
        {
          name: 'id',
          type: 'Edm.String',
          key: true,
          filterable: true,
        },
        {
          name: 'documentId',
          type: 'Edm.String',
          filterable: true,
          sortable: true,
        },
        {
          name: 'chunkIndex',
          type: 'Edm.Int32',
          filterable: true,
          sortable: true,
        },
        {
          name: 'text',
          type: 'Edm.String',
          searchable: true,
          analyzerName: 'en.microsoft',
        },
        {
          name: 'embedding',
          type: 'Collection(Edm.Single)',
          searchable: true,
          vectorSearchDimensions: 3072, // text-embedding-3-large
          vectorSearchProfileName: 'default-vector-profile',
        },
        {
          name: 'pageNumber',
          type: 'Edm.Int32',
          filterable: true,
          sortable: true,
        },
        {
          name: 'metadata',
          type: 'Edm.ComplexType',
          fields: [
            { name: 'title', type: 'Edm.String', searchable: true },
            { name: 'author', type: 'Edm.String', searchable: true },
            { name: 'createdAt', type: 'Edm.DateTimeOffset', filterable: true, sortable: true },
          ],
        },
      ],
      vectorSearch: {
        algorithms: [
          {
            name: 'default-algorithm',
            kind: 'hnsw',
            hnswParameters: {
              metric: 'cosine',
              m: 4,
              efConstruction: 400,
              efSearch: 500,
            },
          },
        ],
        profiles: [
          {
            name: 'default-vector-profile',
            algorithm: 'default-algorithm',
          },
        ],
      },
    };

    await this.indexClient.createOrUpdateIndex(index);
  }

  /**
   * Index document chunks
   */
  async indexChunks(chunks: DocumentChunkIndex[]): Promise<void> {
    try {
      await this.searchClient.uploadDocuments(chunks);
    } catch (error) {
      console.error('Index error:', error);
      throw new Error('Failed to index document chunks');
    }
  }

  /**
   * Vector search with optional hybrid search
   */
  async search(
    queryEmbedding: number[],
    queryText: string,
    options: SearchOptions = {},
  ): Promise<SearchResult[]> {
    try {
      const { top = 5, filter, hybridSearch = true } = options;

      const searchResults = await this.searchClient.search(hybridSearch ? queryText : undefined, {
        vectorSearchOptions: {
          queries: [
            {
              kind: 'vector',
              vector: queryEmbedding,
              kNearestNeighborsCount: top,
              fields: ['embedding'],
            },
          ],
        },
        select: ['id', 'documentId', 'text', 'pageNumber'],
        top,
        filter,
      });

      const results: SearchResult[] = [];
      for await (const result of searchResults.results) {
        results.push({
          id: result.document.id,
          documentId: result.document.documentId,
          text: result.document.text,
          score: result.score || 0,
          pageNumber: result.document.pageNumber,
        });
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Failed to search documents');
    }
  }

  /**
   * Delete document chunks by documentId
   */
  async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      // First, search for all chunks of this document
      const results = await this.searchClient.search('*', {
        filter: `documentId eq '${documentId}'`,
        select: ['id'],
      });

      const idsToDelete: string[] = [];
      for await (const result of results.results) {
        idsToDelete.push(result.document.id);
      }

      if (idsToDelete.length > 0) {
        await this.searchClient.deleteDocuments('id', idsToDelete);
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete document chunks');
    }
  }
}
