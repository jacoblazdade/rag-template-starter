# API Examples

This document provides examples of how to use the RAG Template API endpoints.

## Health Check

```bash
curl http://localhost:3000/api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-08T20:00:00.000Z",
    "environment": "development",
    "version": "1.0.0"
  }
}
```

## Upload Document

```bash
curl -X POST http://localhost:3000/api/v1/documents \
  -F "file=@./my-document.pdf"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "my-document.pdf",
    "size": 204800,
    "blobName": "550e8400-e29b-41d4-a716-446655440000-my-document.pdf",
    "parseMethod": "native",
    "pageCount": 10,
    "chunkCount": 42,
    "status": "processing"
  }
}
```

## Check Document Status

```bash
curl http://localhost:3000/api/v1/documents/550e8400-e29b-41d4-a716-446655440000/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 1.0
  }
}
```

## Query Documents (Synchronous)

```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main topics discussed in the document?",
    "topK": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the provided context, the main topics discussed include [1] machine learning fundamentals, [2] neural network architectures, and [3] deep learning applications in computer vision.",
    "sources": [
      {
        "documentId": "550e8400-e29b-41d4-a716-446655440000",
        "text": "Machine learning is a subset of artificial intelligence...",
        "score": 0.92,
        "pageNumber": 3
      }
    ],
    "tokenUsage": {
      "prompt": 850,
      "completion": 65,
      "total": 915
    }
  }
}
```

## Query Documents (Streaming)

```bash
curl -X POST http://localhost:3000/api/v1/query/stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain the concept of transfer learning",
    "topK": 3
  }'
```

**Response (Server-Sent Events):**
```
data: {"type":"sources","sources":[{"documentId":"550e8400...","score":0.95,"pageNumber":12}]}

data: {"type":"answer","content":"Transfer"}

data: {"type":"answer","content":" learning"}

data: {"type":"answer","content":" is a"}

data: {"type":"done"}
```

## Query Specific Document

```bash
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is mentioned about neural networks?",
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "topK": 3
  }'
```

## List Documents

```bash
curl http://localhost:3000/api/v1/documents
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [],
    "total": 0
  }
}
```

## Delete Document

```bash
curl -X DELETE http://localhost:3000/api/v1/documents/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true
  }
}
```

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (validation error)
- `404` - Not found
- `500` - Server error

## Rate Limiting

The API includes rate limiting to prevent abuse. Default limits:
- 100 requests per minute per IP
- 1000 requests per hour per API key

When rate limited, you'll receive:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

## Authentication (Coming Soon)

API key authentication:
```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/v1/documents
```

Azure AD OAuth 2.0:
```bash
curl -H "Authorization: Bearer your-token-here" \
  http://localhost:3000/api/v1/documents
```

## Postman Collection

Import this into Postman for easy testing:

```json
{
  "info": {
    "name": "RAG Template API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/v1/health"
      }
    },
    {
      "name": "Upload Document",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/v1/documents",
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file"
            }
          ]
        }
      }
    },
    {
      "name": "Query",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/v1/query",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"query\": \"Your question here\",\n  \"topK\": 5\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```
