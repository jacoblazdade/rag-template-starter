import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development due to hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Initialize PrismaClient
// Prisma 7.x uses prisma.config.ts for configuration
function createPrismaClient(): PrismaClient {
  return new PrismaClient({});
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
