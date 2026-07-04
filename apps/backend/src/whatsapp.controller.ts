import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';

@Controller('api/v1/whatsapp')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('whatsapp')
export class WhatsappController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // MESSAGE LOGS
  // ==========================================
  @Get('logs')
  async getLogs(@TenantId() tenantId: string) {
    return this.prisma.whatsapp_logs.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('send')
  async sendMessage(@TenantId() tenantId: string, @Body() body: any) {
    // 1. Simulate sending message through WhatsApp Business API
    console.log(`Sending WhatsApp message to ${body.recipientNumber}: ${body.messageText}`);

    // 2. Save log record
    return this.prisma.whatsapp_logs.create({
      data: {
        id: body.id,
        tenant_id: tenantId,
        recipient_number: body.recipientNumber,
        direction: 'outbound',
        message_text: body.messageText,
        status: 'sent',
      },
    });
  }

  // ==========================================
  // TEMPLATE MANAGEMENT
  // ==========================================
  @Get('templates')
  async getTemplates(@TenantId() tenantId: string) {
    return this.prisma.whatsapp_templates.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('templates')
  async saveTemplate(@TenantId() tenantId: string, @Body() body: any) {
    return this.prisma.whatsapp_templates.upsert({
      where: { id: body.id },
      update: {
        name: body.name,
        category: body.category,
        language: body.language,
        body_text: body.bodyText,
        status: body.status,
        updated_at: new Date(),
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        name: body.name,
        category: body.category || 'utility',
        language: body.language || 'en',
        body_text: body.bodyText,
        status: body.status || 'approved',
      },
    });
  }
}
