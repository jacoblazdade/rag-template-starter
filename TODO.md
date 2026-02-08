# RAG Template Starter - Implementation Tasks

## Phase 1: Foundation & Setup (Week 1) ✅

### Day 1-2: Project Bootstrap ✅
- [x] Initialize TypeScript project with strict mode (using pnpm)
- [x] Setup ESLint + Prettier configuration
- [x] Configure Vitest for testing
- [x] Setup GitHub Actions CI pipeline
- [ ] Create development environment (Docker Compose)

### Day 3-4: Azure Infrastructure 🚧
- [x] Terraform configuration created (main.tf)
- [ ] Create Azure resource group (Terraform apply pending)
- [ ] Deploy Azure OpenAI service (Sweden Central)
- [ ] Deploy Azure AI Search service
- [ ] Deploy Azure Blob Storage account
- [ ] Setup Azure Container Registry
- [ ] Configure Azure AD app registration

### Day 5-7: Core API Skeleton ✅
- [x] Setup Express.js with TypeScript
- [x] Implement middleware pipeline (logging, error handling)
- [x] Create health check endpoint
- [ ] Setup OpenAPI/Swagger documentation
- [x] Configure environment variables (.env schema with Zod)

## Phase 2: Document Ingestion (Week 2) 🚧

### Week 2: Document Pipeline
- [x] Implement PDF parser (pdf-parse with Azure OCR fallback)
- [x] Research PDF OCR models (Azure Document Intelligence recommended)
- [ ] Implement DOCX parser (mammoth)
- [x] Implement TXT/MD parser (basic support)
- [x] Create document upload endpoint (multipart with multer)
- [x] Setup Azure Blob Storage integration
- [x] Implement chunking service (semantic + fixed)
- [x] Create chunk overlap logic
- [ ] Build document status tracking (skeleton created)
- [ ] Add async job queue (BullMQ + Redis)

## Phase 3: Vector Search (Week 3)

### Week 3: Search Infrastructure
- [ ] Create Azure AI Search index schema
- [ ] Implement embedding service (Azure OpenAI)
- [ ] Build document indexer (chunk → embedding → index)
- [ ] Implement vector search endpoint
- [ ] Add hybrid search (vector + BM25)
- [ ] Create search result ranking
- [ ] Add search filters (tags, date, document)

## Phase 4: Query & LLM (Week 4)

### Week 4: RAG Pipeline
- [ ] Build context assembler (token-aware)
- [ ] Create prompt templates
- [ ] Implement LLM service with streaming
- [ ] Build query endpoint (sync + streaming)
- [ ] Add conversation memory (Redis)
- [ ] Implement session management
- [ ] Add citation/sources to responses

## Phase 5: Security & Auth (Week 5-6)

### Week 5-6: Production Hardening
- [ ] Implement Azure AD authentication
- [ ] Build RBAC middleware
- [ ] Add API key authentication (service-to-service)
- [ ] Implement rate limiting (tier-based)
- [ ] Add request validation (Zod)
- [ ] Setup audit logging
- [ ] Add CORS configuration
- [ ] Implement input sanitization

## Phase 6: Observability (Week 7)

### Week 7: Monitoring
- [ ] Setup Azure Application Insights
- [ ] Add custom metrics (query latency, token usage)
- [ ] Create structured logging (Pino)
- [ ] Implement distributed tracing
- [ ] Setup alert rules (errors, latency)
- [ ] Create health check dashboard

## Phase 7: Deployment (Week 8)

### Week 8: Production Deploy
- [ ] Create Docker multi-stage build
- [ ] Setup Azure Container Apps
- [ ] Configure GitHub Actions CD pipeline
- [ ] Add staging environment
- [ ] Implement blue-green deployment
- [ ] Setup SSL/TLS certificates
- [ ] Configure CDN (Azure Front Door)

## Phase 8: Documentation & Polish (Week 9-10)

### Week 9-10: Developer Experience
- [ ] Write comprehensive README
- [ ] Create API documentation
- [ ] Write deployment guide
- [ ] Add customization guide
- [ ] Create example use cases (3x)
- [ ] Record video walkthrough
- [ ] Build admin dashboard (basic)

## Phase 9: Launch Prep (Week 11-12)

### Week 11-12: Go-to-Market
- [ ] Create landing page
- [ ] Setup Gumroad/Lemonsqueezy
- [ ] Write pricing page
- [ ] Create demo video
- [ ] Prepare Product Hunt launch
- [ ] Write launch blog post
- [ ] Build email list (50 signups)

## Current Priority

**Next 3 Tasks:**
1. [ ] Initialize TypeScript project with tooling
2. [ ] Setup Azure OpenAI & AI Search
3. [ ] Build document upload endpoint

## Notes

- Focus on **Azure-native** services
- Keep **GDPR compliance** in mind throughout
- Test each component with integration tests
- Document as you build
- Build in public on Twitter

---

*Last Updated: February 8, 2026*
