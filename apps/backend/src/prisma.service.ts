import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    // Attach global query retry interceptor as a Prisma Client Extension
    const client = this.$extends({
      query: {
        $allOperations: async ({ operation, model, args, query }) => {
          let retries = 3;
          let delay = 1000;
          while (true) {
            try {
              return await query(args);
            } catch (err: any) {
              if (
                retries > 0 &&
                (err.code === 'P1001' ||
                  err.code === 'P1017' ||
                  err.message?.includes('closed the connection') ||
                  err.message?.includes('reach database') ||
                  err.message?.includes('Can\'t reach database') ||
                  err.message?.includes('Server has closed the connection'))
              ) {
                console.warn(
                  `[Prisma] Database connection dropped during ${model || 'raw'}.${operation}. Retrying in ${delay}ms... (${retries} attempts left)`,
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                retries--;
                delay *= 2;
              } else {
                throw err;
              }
            }
          }
        },
      },
    });

    return client as any;
  }

  async onModuleInit() {
    let retries = 5;
    let delay = 1000;
    while (retries > 0) {
      try {
        await this.$connect();
        console.log('[Prisma] Successfully connected to database.');
        return;
      } catch (err: any) {
        console.warn(`[Prisma] Failed to connect to database. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries--;
        delay *= 2;
      }
    }
    // Final attempt to connect, letting the exception bubble up if it still fails
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
