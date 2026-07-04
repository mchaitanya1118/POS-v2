import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // In production, we require x-tenant-id. Fallback to 'default-tenant-id' for local dev/migration convenience.
    return request.headers['x-tenant-id'] || 'default-tenant-id';
  },
);
