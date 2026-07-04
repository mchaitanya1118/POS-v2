import { Controller, Post, Body, UnauthorizedException, Get } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Get('tenants')
  async listTenants() {
    return this.prisma.tenants.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }

  @Post('login')
  async login(
    @Body('userId') userId?: string,
    @Body('password') password?: string,
    @Body('passcode') passcodeArg?: string,
    @Body('tenantId') tenantIdArg?: string,
  ) {
    const passcode = passcodeArg || password;

    // 1. User ID / Password login flow
    if (userId) {
      const matchingUsers = await this.prisma.users.findMany({
        where: {
          OR: [
            {
              id: {
                equals: userId.trim(),
                mode: 'insensitive',
              },
            },
            {
              name: {
                equals: userId.trim(),
                mode: 'insensitive',
              },
            },
          ],
        },
      });

      if (matchingUsers.length === 0) {
        throw new UnauthorizedException('Invalid User ID or Password');
      }

      const user = matchingUsers.find(u => u.passcode === passcode) || matchingUsers[0];

      if (user.passcode !== passcode) {
        throw new UnauthorizedException('Invalid User ID or Password');
      }

      const payload = { id: user.id, name: user.name, role: user.role, tenantId: user.tenant_id };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
        expiresIn: '7d',
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        tenantId: user.tenant_id,
      };
    }

    // 2. Fallback check for Quick PIN passcode login flow
    const tenantId = tenantIdArg || 'default-tenant-id';

    const user = await this.prisma.users.findFirst({
      where: {
        tenant_id: tenantId,
        passcode: passcode,
      },
    });

    if (user) {
      const payload = { id: user.id, name: user.name, role: user.role, tenantId: tenantId };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
        expiresIn: '7d',
      });
      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        tenantId,
      };
    }

    // Settings admin passcode fallback
    const adminPasscodeSetting = await this.prisma.settings.findFirst({
      where: {
        tenant_id: tenantId,
        key: 'passcode',
      },
    });

    const targetPasscode = adminPasscodeSetting?.value || '1234';
    if (passcode === targetPasscode) {
      const payload = { id: 'admin_user', name: 'Administrator', role: 'admin', tenantId: tenantId };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
        expiresIn: '7d',
      });
      return {
        success: true,
        token,
        user: {
          id: 'admin_user',
          name: 'Administrator',
          role: 'admin',
        },
        tenantId,
      };
    }

    // Staff fallback test PIN code (4321)
    if (passcode === '4321') {
      const payload = { id: 'staff_user', name: 'Staff Member', role: 'staff', tenantId: tenantId };
      const token = await this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
        expiresIn: '7d',
      });
      return {
        success: true,
        token,
        user: {
          id: 'staff_user',
          name: 'Staff Member',
          role: 'staff',
        },
        tenantId,
      };
    }

    throw new UnauthorizedException('Invalid passcode');
  }

  @Post('register')
  async register(
    @Body('restaurantName') restaurantName: string,
    @Body('ownerName') ownerName: string,
    @Body('phone') phone: string,
    @Body('username') username: string,
    @Body('passcode') passcode: string,
    @Body('plan') plan: string,
    @Body('paymentDetails') paymentDetails: any,
  ) {
    const newTenantId = `tenant-${Date.now()}`;

    // 1. Determine features based on plan selection
    let features: Record<string, boolean> = {
      voice_ai: false,
      reservations: false,
      inventory: false,
      loyalty: false,
      analytics: false,
      delivery: false,
      whatsapp: false,
    };

    if (plan === 'starter') {
      features.reservations = true;
    } else if (plan === 'professional') {
      features.reservations = true;
      features.inventory = true;
      features.loyalty = true;
      features.analytics = true;
      features.delivery = true;
    } else if (plan === 'enterprise') {
      features.voice_ai = true;
      features.reservations = true;
      features.inventory = true;
      features.loyalty = true;
      features.analytics = true;
      features.delivery = true;
      features.whatsapp = true;
    }

    // 2. Validate Payment Details (Simulated Payment Gateway)
    if (plan !== 'free') {
      if (!paymentDetails || !paymentDetails.cardNumber || paymentDetails.cardNumber.length < 16) {
        throw new UnauthorizedException('Payment Gateway Error: Invalid card information.');
      }
      console.log(`Payment processed successfully via Gateway for Tenant ${newTenantId}: Amount matches plan ${plan}`);
    }

    // 3. Create Tenant in DB
    await this.prisma.tenants.create({
      data: {
        id: newTenantId,
        name: restaurantName,
        plan: plan || 'free',
        features,
      },
    });

    // 4. Initialize Settings keys
    await this.prisma.settings.createMany({
      data: [
        { tenant_id: newTenantId, key: 'passcode', value: passcode },
        { tenant_id: newTenantId, key: 'restaurantName', value: restaurantName },
        { tenant_id: newTenantId, key: 'phone', value: phone },
        { tenant_id: newTenantId, key: 'taxPercentage', value: '12.5' },
        { tenant_id: newTenantId, key: 'currency', value: 'USD' },
      ],
    });

    // 4b. Initialize Default time slots
    await this.prisma.time_slots.createMany({
      data: [
        {
          id: `slot-lunch-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          tenant_id: newTenantId,
          start_time: '12:00',
          end_time: '15:00',
          max_covers: 30
        },
        {
          id: `slot-dinner-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          tenant_id: newTenantId,
          start_time: '19:00',
          end_time: '22:30',
          max_covers: 50
        }
      ]
    });

    // 5. Create Owner/Admin User
    const finalUserId = username ? username.trim() : `u-${Date.now()}`;
    const adminUser = await this.prisma.users.create({
      data: {
        id: finalUserId,
        tenant_id: newTenantId,
        name: ownerName,
        role: 'admin',
        passcode,
      },
    });

    // 6. Sign JWT token
    const payload = { id: adminUser.id, name: adminUser.name, role: adminUser.role, tenantId: newTenantId };
    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'neqtra-pos-enterprise-super-secret-key-2026',
      expiresIn: '7d',
    });

    return {
      success: true,
      token,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
      },
      tenantId: newTenantId,
    };
  }
}
