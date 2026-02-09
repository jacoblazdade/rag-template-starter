import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
  AZURE_OPENAI_API_KEY: z.string().min(1).optional(),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().min(1).optional(),

  // Azure AI Search
  AZURE_SEARCH_ENDPOINT: z.string().url().optional(),
  AZURE_SEARCH_API_KEY: z.string().min(1).optional(),
  AZURE_SEARCH_INDEX_NAME: z.string().min(1).default('documents'),

  // Azure Blob Storage
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1).optional(),
  AZURE_STORAGE_CONTAINER_NAME: z.string().min(1).default('documents'),

  // Azure Document Intelligence (OCR)
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: z.string().url().optional(),
  AZURE_DOCUMENT_INTELLIGENCE_KEY: z.string().optional(),

  // Redis (for BullMQ)
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Optional: Application Insights
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue: z.ZodIssue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
