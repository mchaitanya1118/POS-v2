import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service';

export const RequireFeature = (feature: string) => SetMetadata('requiredFeature', feature);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>('requiredFeature', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] || 'default-tenant-id';

    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const features = (tenant.features as Record<string, boolean>) || {};
    if (!features[requiredFeature]) {
      throw new ForbiddenException(`Feature '${requiredFeature}' is not enabled for your subscription plan`);
    }

    return true;
  }
}
