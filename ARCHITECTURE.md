# RAG Template Starter - System Architecture

## Executive Summary

A production-ready, enterprise-grade RAG (Retrieval-Augmented Generation) system built on Azure-native services with TypeScript. Designed for GDPR compliance, horizontal scalability, and developer experience.

---

## Core Design Principles

1. **Azure-Native First**: Leverage managed services (OpenAI, AI Search, Container Apps)
2. **Type Safety**: Full TypeScript coverage with strict mode
3. **GDPR by Design**: EU data residency, encryption, audit logging
4. **Developer Experience**: Local development with Docker, clear abstractions
5. **Production-Ready**: Observability, error handling, rate limiting

---

## System Architecture

### High-Level Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   API Gateway    │────▶│   RAG Core      │
│  (Web/Mobile)   │     │  (Express.js)    │     │   (Node.js)     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                               ┌──────────────────────────┼──────────────────────────┐
                               │                          │                          │
                               ▼                          ▼                          ▼
                        ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
                        │ Azure OpenAI │          │ Azure AI     │          │ Document     │
                        │   (LLM)      │          │   Search     │          │   Store      │
                        │              │          │  (Vectors)   │          │  (Blob)      │
                        └──────────────┘          └──────────────┘          └──────────────┘
```

---

## Component Design

### 1. Ingestion Pipeline

**Purpose**: Convert documents to searchable vectors

**Flow**:
```
Document Upload → Parse → Chunk → Embed → Index
```

**Components**:
- **Parser Service**: PDF, DOCX, TXT, MD support
- **Chunking Strategy**: Semantic chunking with overlap
- **Embedding**: Azure OpenAI text-embedding-3-large (3072 dims)
- **Indexer**: Azure AI Search with vector + hybrid search

**API Design**:
```typescript
POST /api/v1/documents
- Multipart upload
- Async processing with job queue
- Webhook callback on completion

GET /api/v1/documents/:id/status
- Polling endpoint for job status
```

### 2. Query Pipeline

**Purpose**: Retrieve relevant context and generate answers

**Flow**:
```
User Query → Embed → Vector Search → Rerank → Prompt → LLM → Stream Response
```

**Components**:
- **Query Embedder**: Same model as ingestion for consistency
- **Vector Search**: Azure AI Search with vector similarity
- **Hybrid Search**: Combine vector + keyword (BM25)
- **Reranker**: Cross-encoder for result refinement
- **Context Builder**: Token-aware context assembly
- **LLM Gateway**: Azure OpenAI with fallback, retries, caching

**API Design**:
```typescript
POST /api/v1/query
- Streaming SSE response
- Supports conversation history
- Configurable temperature/top-p

POST /api/v1/query/sync
- Synchronous response
- For simple integrations
```

### 3. Conversation Management

**Purpose**: Multi-turn conversations with context

**Design**:
- **Session Store**: Redis for conversation state
- **Context Window**: Sliding window with summarization
- **Memory**: Extract and store key facts across sessions

**API Design**:
```typescript
POST /api/v1/sessions
- Create new conversation

POST /api/v1/sessions/:id/messages
- Add message to session
- Returns streaming response

GET /api/v1/sessions/:id/history
- Retrieve conversation history
```

---

## Data Models

### Document
```typescript
interface Document {
  id: string;                    // UUID
  name: string;                  // Original filename
  mimeType: string;              // File type
  size: number;                  // Bytes
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks: DocumentChunk[];       // Generated chunks
  metadata: {
    source: string;              // Upload source
    uploadedBy: string;          // User ID
    uploadedAt: Date;
    tags: string[];              // User-defined tags
  };
  processingError?: string;      // Error message if failed
}

interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;               // Chunk text
  embedding: number[];           // Vector (3072 dims)
  metadata: {
    startIndex: number;          // Position in original doc
    endIndex: number;
    pageNumber?: number;
  };
}
```

### Search Result
```typescript
interface SearchResult {
  chunk: DocumentChunk;
  score: number;                 // Similarity score
  document: Document;            // Parent document
  highlight?: string;            // Relevant excerpt
}
```

### Query Request
```typescript
interface QueryRequest {
  query: string;
  sessionId?: string;            // Continue conversation
  filters?: {
    documentIds?: string[];      // Search specific docs
    tags?: string[];             // Filter by tags
    dateRange?: { start: Date; end: Date };
  };
  options?: {
    topK: number;                // Results to retrieve (default: 5)
    temperature: number;         // LLM creativity (default: 0.1)
    stream: boolean;             // Streaming response (default: true)
  };
}
```

---

## Azure Services Configuration

### Azure OpenAI
```yaml
Deployment: gpt-4o
  - Version: 2024-05-13
  - Capacity: 10K TPM
  
Deployment: text-embedding-3-large
  - Version: 1
  - Capacity: 100K TPM

Settings:
  - Content filtering: Enabled
  - Data residency: Sweden Central (EU)
```

### Azure AI Search
```yaml
Tier: Standard S1
  - Partitions: 1
  - Replicas: 2 (HA)
  
Index Configuration:
  - Vector search: HNSW algorithm
  - Semantic ranking: Enabled
  - Hybrid search: Vector + Text
```

### Azure Blob Storage
```yaml
Tier: Hot
  - Document store
  - Backup/Archive tier for old docs
```

---

## Security & Compliance

### Authentication
- **Primary**: Azure AD (Microsoft Entra)
- **API Keys**: For service-to-service (rotated monthly)
- **JWT**: Short-lived tokens (15 min expiry)

### Authorization (RBAC)
```typescript
interface Permissions {
  'document:read': boolean;
  'document:write': boolean;
  'document:delete': boolean;
  'query:execute': boolean;
  'admin:manage': boolean;
}

// Roles
const ROLES = {
  viewer: ['document:read', 'query:execute'],
  editor: ['document:read', 'document:write', 'query:execute'],
  admin: ['*']
};
```

### GDPR Compliance
- **Data Residency**: All data in EU (Sweden/Germany)
- **Encryption**: At-rest (Azure-managed) + in-transit (TLS 1.3)
- **Right to Deletion**: Document + embeddings + logs purged
- **Audit Logging**: All access logged with user ID, timestamp
- **Data Retention**: 30-day soft delete, then permanent
- **Privacy Policy**: Required for all deployments

---

## Scalability Strategy

### Horizontal Scaling
- **API Layer**: Azure Container Apps (auto-scale 2-10 instances)
- **Queue Workers**: Azure Functions (consumption plan)
- **Stateless Design**: Session in Redis, no local state

### Caching Strategy
- **Embedding Cache**: Redis (query → embedding)
- **Search Cache**: Azure AI Search (built-in)
- **LLM Cache**: Semantic caching (same query → same answer)

### Rate Limiting
```yaml
Tier: Free
  - 100 queries/day
  - 10 documents/day
  
Tier: Pro
  - 10,000 queries/day
  - 1,000 documents/day
  
Tier: Enterprise
  - Custom limits
```

---

## Observability

### Metrics (Azure Monitor)
- Query latency (p50, p95, p99)
- Document processing time
- Token usage (input/output)
- Error rates by component
- Active users/sessions

### Logging
- **Application Logs**: Structured JSON, correlated by request ID
- **Audit Logs**: User actions, data access
- **Error Logs**: Stack traces, context

### Alerting
- Error rate > 1% → PagerDuty
- Latency p95 > 2s → Slack alert
- Token quota > 80% → Email warning

---

## Development Workflow

### Local Development
```bash
# Prerequisites
docker-compose up -d  # Redis, Azurite (blob emulator)
npm install

# Development
npm run dev  # Hot reload, TypeScript watch

# Testing
npm run test  # Unit tests
npm run test:integration  # Integration tests with testcontainers

# Linting
npm run lint
npm run format
```

### Deployment Pipeline
```
Main Branch → PR Review → CI Tests → Docker Build → Staging → Production
```

---

## File Structure

```
rag-template-starter/
├── src/
│   ├── api/                    # Express routes
│   │   ├── routes/
│   │   │   ├── documents.ts
│   │   │   ├── query.ts
│   │   │   └── sessions.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rate-limit.ts
│   │       └── error-handler.ts
│   ├── services/               # Business logic
│   │   ├── document-service.ts
│   │   ├── query-service.ts
│   │   ├── embedding-service.ts
│   │   ├── search-service.ts
│   │   └── llm-service.ts
│   ├── models/                 # TypeScript interfaces
│   │   ├── document.ts
│   │   ├── query.ts
│   │   └── session.ts
│   ├── infrastructure/         # External services
│   │   ├── azure-openai.ts
│   │   ├── azure-search.ts
│   │   ├── blob-storage.ts
│   │   └── redis.ts
│   ├── utils/                  # Helpers
│   │   ├── chunking.ts
│   │   ├── token-counter.ts
│   │   └── validators.ts
│   └── index.ts                # Entry point
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── infra/
│   ├── bicep/                  # Azure deployment
│   └── scripts/
├── docs/
│   ├── api-reference.md
│   ├── deployment-guide.md
│   └── customization.md
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── README.md
├── ARCHITECTURE.md
├── PLANNING.md
└── package.json
```

---

## Implementation Phases

### Phase 1: Core RAG (Weeks 1-4)
- [ ] Basic API setup (Express + TypeScript)
- [ ] Document upload & storage
- [ ] Simple chunking
- [ ] Azure OpenAI integration
- [ ] Azure AI Search setup
- [ ] Basic query endpoint

### Phase 2: Production Hardening (Weeks 5-8)
- [ ] Authentication (Azure AD)
- [ ] RBAC implementation
- [ ] Rate limiting
- [ ] Error handling
- [ ] Observability
- [ ] Docker deployment

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] Conversation management
- [ ] Streaming responses
- [ ] Hybrid search
- [ ] Document preview
- [ ] Admin dashboard
- [ ] Documentation & examples

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Azure costs explode | Medium | High | Cost alerts, quotas, caching |
| Embedding quality poor | Low | High | Chunking strategy, overlap testing |
| GDPR compliance gaps | Medium | High | Legal review, audit logging |
| Performance at scale | Medium | Medium | Load testing, caching, CDN |
| Security vulnerabilities | Low | Critical | Security review, penetration testing |

---

## Success Metrics

- **Performance**: Query latency < 2s (p95)
- **Quality**: Answer relevance > 4.5/5 (user ratings)
- **Adoption**: 100+ downloads in first month
- **Revenue**: €10K in first quarter
- **Satisfaction**: NPS > 50

---

*Document Version: 1.0*
*Last Updated: February 8, 2026*
*Author: Software Architect (AI Assistant)*
