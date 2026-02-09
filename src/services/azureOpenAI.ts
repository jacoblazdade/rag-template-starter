import { AzureOpenAI } from 'openai';
import { env } from '../config/env.js';

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface CompletionResult {
  text: string;
  tokenCount: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class AzureOpenAIService {
  private client: AzureOpenAI;
  private deploymentName: string;
  private embeddingModel = 'text-embedding-3-large';

  constructor() {
    this.client = new AzureOpenAI({
      endpoint: env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: env.AZURE_OPENAI_API_KEY || '',
      apiVersion: '2024-10-21',
    });
    this.deploymentName = env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
  }

  /**
   * Generate embeddings for text chunks
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned');
      }

      const embedding = response.data[0].embedding;
      if (!embedding) {
        throw new Error('No embedding data');
      }

      return {
        embedding: Array.isArray(embedding) ? embedding : Object.values(embedding),
        tokenCount: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error('Embedding error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Batch embed multiple texts
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
      });

      return response.data.map((item) => {
        const embedding = item.embedding;
        return {
          embedding: Array.isArray(embedding) ? embedding : Object.values(embedding),
          tokenCount: response.usage?.total_tokens || 0,
        };
      });
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new Error('Failed to generate batch embeddings');
    }
  }

  /**
   * Generate chat completion
   */
  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    context?: string,
  ): Promise<CompletionResult> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user', content: userPrompt },
      ];

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No completion returned');
      }

      return {
        text: choice.message.content || '',
        tokenCount: {
          prompt: response.usage?.prompt_tokens || 0,
          completion: response.usage?.completion_tokens || 0,
          total: response.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      console.error('Completion error:', error);
      throw new Error('Failed to generate completion');
    }
  }

  /**
   * Generate streaming chat completion
   */
  async *generateStreamingCompletion(
    systemPrompt: string,
    userPrompt: string,
    context?: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user', content: userPrompt },
      ];

      const stream = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield delta;
        }
      }
    } catch (error) {
      console.error('Streaming completion error:', error);
      throw new Error('Failed to generate streaming completion');
    }
  }
}
