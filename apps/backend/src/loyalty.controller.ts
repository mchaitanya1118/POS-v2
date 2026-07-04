import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';

@Controller('api/v1/loyalty')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('loyalty')
export class LoyaltyController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // RULES
  // ==========================================
  @Get('rules')
  async getRules(@TenantId() tenantId: string) {
    return this.prisma.loyalty_rules.findMany({
      where: { tenant_id: tenantId },
    });
  }

  @Post('rules')
  async saveRules(@TenantId() tenantId: string, @Body() body: any) {
    return this.prisma.loyalty_rules.upsert({
      where: { id: body.id },
      update: {
        earn_ratio: parseFloat(body.earnRatio),
        redeem_value: parseFloat(body.redeemValue),
        min_points_to_redeem: parseInt(body.minPointsToRedeem),
        updated_at: new Date(),
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        earn_ratio: parseFloat(body.earnRatio) || 0.1,
        redeem_value: parseFloat(body.redeemValue) || 1.0,
        min_points_to_redeem: parseInt(body.minPointsToRedeem) || 50,
      },
    });
  }

  // ==========================================
  // PROFILES
  // ==========================================
  @Get('profile/:customerId')
  async getProfile(@TenantId() tenantId: string, @Param('customerId') customerId: string) {
    let profile = await this.prisma.loyalty_profiles.findUnique({
      where: { customer_id: customerId },
    });

    if (!profile) {
      // Auto-create bronze profile if it doesn't exist
      profile = await this.prisma.loyalty_profiles.create({
        data: {
          id: `prof-${customerId}`,
          tenant_id: tenantId,
          customer_id: customerId,
          points_balance: 0,
          tier: 'Bronze',
        },
      });
    }

    return profile;
  }

  // ==========================================
  // TRANSACTIONS
  // ==========================================
  @Get('transactions')
  async getTransactions(@TenantId() tenantId: string) {
    return this.prisma.loyalty_transactions.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('transactions')
  async recordTransaction(@TenantId() tenantId: string, @Body() body: any) {
    const { customerId, type, points, amount, notes, id } = body;

    return this.prisma.$transaction(async (tx) => {
      // 1. Get or create profile
      let profile = await tx.loyalty_profiles.findUnique({
        where: { customer_id: customerId },
      });

      if (!profile) {
        profile = await tx.loyalty_profiles.create({
          data: {
            id: `prof-${customerId}`,
            tenant_id: tenantId,
            customer_id: customerId,
            points_balance: 0,
            tier: 'Bronze',
          },
        });
      }

      // 2. Adjust points
      let newBalance = profile.points_balance;
      const pts = parseInt(points) || 0;
      if (type === 'earn') {
        newBalance += pts;
      } else if (type === 'redeem') {
        newBalance -= pts;
      } else if (type === 'adjustment') {
        newBalance = pts;
      }

      // 3. Determine tier
      let tier = 'Bronze';
      if (newBalance >= 1000) tier = 'Platinum';
      else if (newBalance >= 500) tier = 'Gold';
      else if (newBalance >= 200) tier = 'Silver';

      // 4. Update profile
      await tx.loyalty_profiles.update({
        where: { id: profile.id },
        data: {
          points_balance: newBalance,
          tier,
          updated_at: new Date(),
        },
      });

      // 5. Create transaction log
      return tx.loyalty_transactions.create({
        data: {
          id: id,
          tenant_id: tenantId,
          loyalty_profile_id: profile.id,
          type,
          points: pts,
          amount: amount ? parseFloat(amount) : null,
          notes,
        },
      });
    });
  }
}
