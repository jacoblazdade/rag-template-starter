import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
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
  private client: OpenAIClient;
  private deploymentName: string;
  private embeddingModel = 'text-embedding-3-large';

  constructor() {
    this.client = new OpenAIClient(
      env.AZURE_OPENAI_ENDPOINT,
      new AzureKeyCredential(env.AZURE_OPENAI_API_KEY),
    );
    this.deploymentName = env.AZURE_OPENAI_DEPLOYMENT_NAME;
  }

  /**
   * Generate embeddings for text chunks
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.getEmbeddings(this.embeddingModel, [text]);

      if (!response.data || response.data.length === 0) {
        throw new Error('No embeddings returned');
      }

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage?.totalTokens || 0,
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
      const response = await this.client.getEmbeddings(this.embeddingModel, texts);

      return response.data.map((item) => ({
        embedding: item.embedding,
        tokenCount: response.usage?.totalTokens || 0,
      }));
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
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user' as const, content: userPrompt },
      ];

      const response = await this.client.getChatCompletions(this.deploymentName, messages, {
        temperature: 0.7,
        maxTokens: 1000,
      });

      const choice = response.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No completion returned');
      }

      return {
        text: choice.message.content || '',
        tokenCount: {
          prompt: response.usage?.promptTokens || 0,
          completion: response.usage?.completionTokens || 0,
          total: response.usage?.totalTokens || 0,
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
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(context ? [{ role: 'system' as const, content: `Context:\n${context}` }] : []),
        { role: 'user' as const, content: userPrompt },
      ];

      const stream = await this.client.streamChatCompletions(this.deploymentName, messages, {
        temperature: 0.7,
        maxTokens: 1000,
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
