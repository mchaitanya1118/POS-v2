import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('api/v1/whatsapp')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('whatsapp')
export class WhatsappController {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsappService
  ) {}

  // ==========================================
  // MESSAGE LOGS
  // ==========================================
  @Get('logs')
  async getLogs(@TenantId() tenantId: string) {
    const logs = await this.prisma.whatsapp_logs.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
    return logs.map(log => ({
      id: log.id,
      recipient_phone: log.recipient_number,
      direction: log.direction,
      message_body: log.message_text,
      status: log.status,
      created_at: log.created_at,
    }));
  }

  @Post('send')
  async sendMessage(@TenantId() tenantId: string, @Body() body: any) {
    const recipient = body.recipientPhone || body.recipientNumber;
    const text = body.messageBody || body.messageText;
    const id = body.id || `log_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Perform actual sending via WhatsappService
    const dispatch = await this.whatsappService.sendMessage(recipient, text);

    const log = await this.prisma.whatsapp_logs.create({
      data: {
        id,
        tenant_id: tenantId,
        recipient_number: recipient,
        direction: 'outbound',
        message_text: text,
        status: dispatch.status,
      },
    });

    return {
      id: log.id,
      recipient_phone: log.recipient_number,
      direction: log.direction,
      message_body: log.message_text,
      status: log.status,
      created_at: log.created_at,
      error: dispatch.error,
    };
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
    const id = body.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return this.prisma.whatsapp_templates.upsert({
      where: { id },
      update: {
        name: body.name,
        category: body.category,
        language: body.language,
        body_text: body.bodyText,
        status: body.status,
        updated_at: new Date(),
      },
      create: {
        id,
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
