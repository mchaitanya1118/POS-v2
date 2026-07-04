import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';

@Controller('api/v1/voice-ai')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('voice_ai')
export class VoiceAiController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // CALL LOGS
  // ==========================================
  @Get('calls')
  async getCalls(@TenantId() tenantId: string) {
    return this.prisma.voice_ai_calls.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('calls')
  async createCallLog(@TenantId() tenantId: string, @Body() body: any) {
    return this.prisma.voice_ai_calls.upsert({
      where: { id: body.id },
      update: {
        caller_number: body.callerNumber,
        status: body.status,
        transcription: body.transcription,
        duration_seconds: parseInt(body.durationSeconds) || 0,
        recording_url: body.recordingUrl,
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        caller_number: body.callerNumber,
        status: body.status || 'ringing',
        transcription: body.transcription,
        duration_seconds: parseInt(body.durationSeconds) || 0,
        recording_url: body.recordingUrl,
      },
    });
  }

  // ==========================================
  // VOICE SETTINGS
  // ==========================================
  @Get('settings')
  async getSettings(@TenantId() tenantId: string) {
    const settings = await this.prisma.voice_ai_settings.findUnique({
      where: { tenant_id: tenantId },
    });

    if (!settings) {
      return {
        greetingMessage: 'Welcome to our restaurant! How can I help you today?',
        voiceModel: 'en-US-Standard-C',
        bookingEnabled: true,
      };
    }

    return {
      greetingMessage: settings.greeting_message,
      voiceModel: settings.voice_model,
      bookingEnabled: settings.booking_enabled,
    };
  }

  @Post('settings')
  async saveSettings(@TenantId() tenantId: string, @Body() body: any) {
    const updated = await this.prisma.voice_ai_settings.upsert({
      where: { tenant_id: tenantId },
      update: {
        greeting_message: body.greetingMessage,
        voice_model: body.voiceModel,
        booking_enabled: body.bookingEnabled,
        updated_at: new Date(),
      },
      create: {
        tenant_id: tenantId,
        greeting_message: body.greetingMessage || 'Welcome to our restaurant! How can I help you today?',
        voice_model: body.voiceModel || 'en-US-Standard-C',
        booking_enabled: body.bookingEnabled !== false,
      },
    });

    return {
      success: true,
      settings: {
        greetingMessage: updated.greeting_message,
        voiceModel: updated.voice_model,
        bookingEnabled: updated.booking_enabled,
      },
    };
  }
}
