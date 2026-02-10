import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { env } from '../config/env.js';

 
type PdfParseResult = { text: string; numpages: number; info?: { Title?: string; Author?: string; CreationDate?: string } };

// Dynamic import for pdf-parse to handle ESM/CJS compatibility
async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import('pdf-parse') as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;
  return pdfParse(buffer) as Promise<PdfParseResult>;
}

export interface ParsedDocument {
  text: string;
  method: 'native' | 'azure-ocr';
  pageCount: number;
  confidence?: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

export class DocumentParserService {
  private azureClient: DocumentAnalysisClient | null = null;

  constructor() {
    if (env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT && env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
      this.azureClient = new DocumentAnalysisClient(
        env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
        new AzureKeyCredential(env.AZURE_DOCUMENT_INTELLIGENCE_KEY),
      );
    }
  }

  async parseDocument(buffer: Buffer): Promise<ParsedDocument> {
    try {
      // First, try native PDF parsing
      const nativeResult = await this.tryNativeParse(buffer);

      // If we got substantial text, return it
      if (nativeResult.text.trim().length > 200) {
        return nativeResult;
      }

      // If minimal text and Azure OCR is available, fallback
      if (this.azureClient) {
        return this.tryAzureOCR(buffer);
      }

      // Return native result even if minimal
      return nativeResult;
    } catch (error) {
      // Native parsing failed, try Azure OCR if available
      if (this.azureClient) {
        console.log('Native parsing failed, falling back to Azure OCR...');
        return this.tryAzureOCR(buffer);
      }
      // No Azure OCR configured, rethrow the error
      throw error;
    }
  }

  private async tryNativeParse(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const result = await parsePdf(buffer);

      return {
        text: result.text,
        method: 'native',
        pageCount: result.numpages,
        metadata: {
          title: result.info?.Title,
          author: result.info?.Author,
          creationDate: result.info?.CreationDate ? new Date(result.info.CreationDate) : undefined,
        },
      };
    } catch (error) {
      console.error('Native PDF parsing failed:', error);
      throw new Error('Failed to parse PDF natively');
    }
  }

  private async tryAzureOCR(buffer: Buffer): Promise<ParsedDocument> {
    if (!this.azureClient) {
      throw new Error('Azure Document Intelligence not configured');
    }

    try {
      const poller = await this.azureClient.beginAnalyzeDocument('prebuilt-read', buffer);
      const result = await poller.pollUntilDone();

      let extractedText = '';
      let totalConfidence = 0;
      let confidenceCount = 0;

      if (result.pages) {
        for (const page of result.pages) {
          if (page.words) {
            for (const word of page.words) {
              extractedText += word.content + ' ';
              if (word.confidence) {
                totalConfidence += word.confidence;
                confidenceCount++;
              }
            }
            extractedText += '\n';
          }
        }
      }

      const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : undefined;

      return {
        text: extractedText.trim(),
        method: 'azure-ocr',
        pageCount: result.pages?.length || 0,
        confidence: avgConfidence,
        metadata: {},
      };
    } catch (error) {
      console.error('Azure OCR failed:', error);
      throw new Error('Failed to parse PDF with Azure OCR');
    }
  }
}
