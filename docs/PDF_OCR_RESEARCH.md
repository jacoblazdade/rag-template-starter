# PDF OCR Research for RAG Template

## Problem Statement

PDF parsing libraries often fail when:
- PDFs are scanned images (no extractable text layer)
- PDFs have corrupted or missing text metadata
- Complex layouts with tables, columns, or mixed content
- Handwritten annotations

## OCR Solutions Overview

### 1. Azure AI Vision (Recommended for Azure Stack)

**Model**: Azure AI Vision OCR / Document Intelligence (formerly Form Recognizer)

**Pros**:
- Native Azure integration
- GDPR compliant with Sweden Central region
- High accuracy for printed text
- Supports multiple languages
- Layout preservation (tables, columns)
- Pre-built models for invoices, receipts, IDs

**Cons**:
- Cost per page
- Rate limits apply

**Pricing**: ~€0.015-0.05 per page (depending on model)

**Integration**:
```typescript
import { DocumentAnalysisClient } from '@azure/ai-form-recognizer';

const client = new DocumentAnalysisClient(
  env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
  new AzureKeyCredential(env.AZURE_DOCUMENT_INTELLIGENCE_KEY)
);

const poller = await client.beginAnalyzeDocument('prebuilt-read', pdfBuffer);
const result = await poller.pollUntilDone();
```

### 2. Tesseract OCR (Open Source)

**Model**: Tesseract 5.x (LSTM-based)

**Pros**:
- Free and open source
- Works offline
- Good for printed text
- Supports 100+ languages

**Cons**:
- Lower accuracy than cloud services
- Requires manual preprocessing (deskew, denoise)
- No native table/layout understanding
- Requires additional dependencies

**Node.js Integration**:
```typescript
import { createWorker } from 'tesseract.js';

const worker = await createWorker('eng');
const result = await worker.recognize(pdfImageBuffer);
await worker.terminate();
```

### 3. GPT-4 Vision / Claude 3 Vision (LLM-based OCR)

**Models**: 
- GPT-4o Vision (OpenAI)
- Claude 3.5 Sonnet / 3 Opus (Anthropic)
- Gemini Pro Vision (Google)

**Pros**:
- Exceptional accuracy
- Understands context and layout
- Can extract structured data
- Handles handwriting well
- Can summarize while extracting

**Cons**:
- Higher cost per page
- Slower processing
- Token limits for large documents
- Need to convert PDF to images first

**Cost**: ~€0.01-0.03 per page (depending on resolution)

**Integration**:
```typescript
// Convert PDF page to image, then:
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract all text from this document.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } }
      ]
    }
  ]
});
```

### 4. Specialized OCR Services

#### PaddleOCR (Open Source)
- Best for Asian languages
- Good accuracy
- Requires Python runtime

#### EasyOCR
- Python-based
- Good balance of accuracy and speed
- GPU acceleration supported

#### Amazon Textract
- AWS-only
- Excellent table extraction
- Higher cost than Azure

## Recommendation for RAG Template

### Tiered Approach

1. **Primary**: Try standard PDF parsing (pdf-parse, pdfjs)
2. **Fallback 1**: Azure Document Intelligence (Read model)
3. **Fallback 2**: Tesseract.js (for offline/air-gapped environments)
4. **Fallback 3**: GPT-4 Vision (for complex layouts/handwriting)

### Implementation Strategy

```typescript
// src/services/pdfParser.ts
interface PDFParseResult {
  text: string;
  method: 'native' | 'azure-ocr' | 'tesseract' | 'llm-vision';
  confidence?: number;
  pages: number;
}

class PDFParserService {
  async parse(pdfBuffer: Buffer): Promise<PDFParseResult> {
    // 1. Try native parsing first
    const nativeResult = await this.tryNativeParse(pdfBuffer);
    if (nativeResult.text.length > 100) {
      return { ...nativeResult, method: 'native' };
    }
    
    // 2. Fallback to Azure OCR
    const azureResult = await this.tryAzureOCR(pdfBuffer);
    if (azureResult.confidence > 0.8) {
      return { ...azureResult, method: 'azure-ocr' };
    }
    
    // 3. Final fallback to Tesseract
    return this.tryTesseract(pdfBuffer);
  }
}
```

### Packages to Install

```bash
# Primary PDF parsing
pnpm add pdf-parse

# Azure Document Intelligence
pnpm add @azure/ai-form-recognizer

# Tesseract (optional fallback)
pnpm add tesseract.js

# PDF to image conversion (for vision models)
pnpm add pdf2pic
```

## Cost Comparison (per 1000 pages)

| Method | Cost | Accuracy | Speed | GDPR |
|--------|------|----------|-------|------|
| Native (pdf-parse) | Free | Low (text only) | Fast | Yes |
| Azure OCR | €15-50 | High | Medium | Yes (EU region) |
| Tesseract | Free (compute) | Medium | Slow | Yes |
| GPT-4 Vision | €10-30 | Very High | Slow | Check provider |

## Next Steps

1. Implement Azure Document Intelligence integration
2. Add Tesseract.js as offline fallback
3. Create PDF-to-image converter for vision models
4. Build confidence scoring to auto-select best method
5. Cache OCR results to avoid re-processing

## References

- [Azure AI Document Intelligence](https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
