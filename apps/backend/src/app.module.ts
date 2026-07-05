import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth.controller';
import { PosController } from './pos.controller';
import { ReservationController } from './reservation.controller';
import { VoiceAiController } from './voice-ai.controller';
import { PublicVoiceAiController } from './public-voice-ai.controller';
import { WhatsappController } from './whatsapp.controller';
import { LoyaltyController } from './loyalty.controller';
import { DeliveryController } from './delivery.controller';
import { AnalyticsController } from './analytics.controller';
import { HealthController } from './health.controller';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    PosController,
    ReservationController,
    VoiceAiController,
    PublicVoiceAiController,
    WhatsappController,
    LoyaltyController,
    DeliveryController,
    AnalyticsController,
    HealthController,
    NotificationController,
  ],
  providers: [AppService, PrismaService, NotificationService],
})
export class AppModule {}
