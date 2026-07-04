import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async checkHealth() {
    let dbStatus = 'healthy';
    let dbError = null;

    try {
      // Execute a quick, low-cost raw query to verify database connection
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      dbStatus = 'unhealthy';
      dbError = err.message || err;
    }

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        error: dbError,
      },
    };
  }
}
