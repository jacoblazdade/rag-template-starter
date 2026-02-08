# RAG Template Starter

A production-ready, enterprise-grade RAG (Retrieval-Augmented Generation) system built on Azure-native services with TypeScript. Designed for GDPR compliance, horizontal scalability, and developer experience.

## Features

- 🚀 **TypeScript** - Full type safety with strict mode
- ☁️ **Azure-Native** - OpenAI, AI Search, Blob Storage, Container Apps
- 🔒 **GDPR Compliant** - EU data residency (Sweden Central), encryption, audit logging
- 📄 **Document Processing** - PDF, DOCX, TXT, MD with OCR fallback
- 🔍 **Vector Search** - Semantic + hybrid search with Azure AI Search
- 💬 **Streaming Responses** - Real-time LLM responses via SSE
- 📊 **Observability** - Application Insights, structured logging, distributed tracing
- 🧪 **Testing** - Vitest for unit and integration tests

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Azure credentials

# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript 5
- **Framework**: Express.js
- **AI/ML**: Azure OpenAI (GPT 5.1, text-embedding-3-large)
- **Search**: Azure AI Search (vector + hybrid)
- **Storage**: Azure Blob Storage
- **Queue**: BullMQ with Redis
- **Validation**: Zod
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Project Structure

```
src/
├── config/         # Environment configuration
├── middleware/     # Express middleware
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## API Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/documents` - Upload document (coming soon)
- `GET /api/v1/documents/:id/status` - Check document status (coming soon)
- `POST /api/v1/query` - Query with streaming (coming soon)

## License

MIT

## Author

Jacob Lazda
