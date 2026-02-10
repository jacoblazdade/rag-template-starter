import 'dotenv/config';
import { AzureSearchService } from '../services/azureSearch.js';

async function main(): Promise<void> {
  try {
    const searchService = new AzureSearchService();
    await searchService.createIndex();
    console.log('✅ Search index created successfully');
  } catch (error) {
    console.error('❌ Failed to create search index:', error);
    process.exit(1);
  }
}

main();
