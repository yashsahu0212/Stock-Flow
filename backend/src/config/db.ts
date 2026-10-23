import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const checkDatabaseConnection = async (): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      connected: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: error.message || 'Database connection error',
    };
  }
};

export default prisma;
