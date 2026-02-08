import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Azure OpenAI
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_DEPLOYMENT_NAME: z.string().min(1),
  
  // Azure AI Search
  AZURE_SEARCH_ENDPOINT: z.string().url(),
  AZURE_SEARCH_API_KEY: z.string().min(1),
  AZURE_SEARCH_INDEX_NAME: z.string().min(1),
  
  // Azure Blob Storage
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  AZURE_STORAGE_CONTAINER_NAME: z.string().min(1),
  
  // Redis (for BullMQ)
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // Optional: Application Insights
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.errors.forEach((error) => {
    console.error(`  - ${error.path.join('.')}: ${error.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
