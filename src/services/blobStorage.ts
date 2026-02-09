import type { ContainerClient } from '@azure/storage-blob';
import { BlobServiceClient } from '@azure/storage-blob';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';

export interface UploadResult {
  blobName: string;
  url: string;
  size: number;
}

export class BlobStorageService {
  private containerClient: ContainerClient | null = null;

  constructor() {
    if (env.AZURE_STORAGE_CONNECTION_STRING) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        env.AZURE_STORAGE_CONNECTION_STRING,
      );
      this.containerClient = blobServiceClient.getContainerClient(env.AZURE_STORAGE_CONTAINER_NAME);
    }
  }

  async uploadDocument(buffer: Buffer, filename: string): Promise<UploadResult> {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    // Ensure container exists
    await this.containerClient.createIfNotExists();

    // Generate unique blob name
    const blobName = `${randomUUID()}-${filename}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    // Upload
    await blockBlobClient.upload(buffer, buffer.length);

    return {
      blobName,
      url: blockBlobClient.url,
      size: buffer.length,
    };
  }

  async downloadDocument(blobName: string): Promise<Buffer> {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download(0);

    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download blob');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  async deleteDocument(blobName: string): Promise<void> {
    if (!this.containerClient) {
      throw new Error('Azure Blob Storage not configured');
    }

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
  }
}
