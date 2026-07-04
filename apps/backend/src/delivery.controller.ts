import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';

@Controller('api/v1')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('delivery')
export class DeliveryController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // DELIVERY AGENTS
  // ==========================================
  @Get('delivery/agents')
  async getAgents(@TenantId() tenantId: string) {
    return this.prisma.delivery_agents.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('delivery/agents')
  async saveAgent(@TenantId() tenantId: string, @Body() body: any) {
    return this.prisma.delivery_agents.upsert({
      where: { id: body.id },
      update: {
        name: body.name,
        phone: body.phone,
        vehicle_number: body.vehicleNumber,
        status: body.status,
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        name: body.name,
        phone: body.phone,
        vehicle_number: body.vehicleNumber,
        status: body.status || 'available',
      },
    });
  }

  // ==========================================
  // DELIVERY ORDERS
  // ==========================================
  @Get('delivery/orders')
  async getDeliveryOrders(@TenantId() tenantId: string) {
    return this.prisma.delivery_orders.findMany({
      where: { tenant_id: tenantId },
      orderBy: { status: 'asc' },
    });
  }

  @Post('delivery/orders')
  async saveDeliveryOrder(@TenantId() tenantId: string, @Body() body: any) {
    const updated = await this.prisma.delivery_orders.upsert({
      where: { order_id: body.orderId },
      update: {
        agent_id: body.agentId,
        status: body.status,
        customer_address: body.customerAddress,
        estimated_delivery_time: body.estimatedDeliveryTime,
        delivered_at: body.status === 'delivered' ? new Date() : undefined,
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        order_id: body.orderId,
        agent_id: body.agentId,
        status: body.status || 'pending',
        customer_address: body.customerAddress,
        estimated_delivery_time: body.estimatedDeliveryTime,
      },
    });

    // If order status is assigned, update delivery agent status to busy
    if (body.agentId && body.status === 'assigned') {
      await this.prisma.delivery_agents.update({
        where: { id: body.agentId },
        data: { status: 'busy' },
      });
    }

    return updated;
  }
}
