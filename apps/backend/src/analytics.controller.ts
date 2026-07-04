import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';

@Controller('api/v1')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('analytics')
export class AnalyticsController {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // ANALYTICS & PERFORMANCE REPORTING
  // ==========================================
  @Get('analytics/sales-report')
  async getSalesReport(@TenantId() tenantId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { tenant_id: tenantId, status: 'completed' },
      select: { grand_total: true, subtotal: true },
    });

    const expenses = await this.prisma.expenses.findMany({
      where: { tenant_id: tenantId },
      select: { amount: true },
    });

    const totalSales = orders.reduce((sum, o) => sum + o.grand_total, 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalSales - totalExpenses;

    return {
      success: true,
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
      orderCount: orders.length,
      averageOrderValue: orders.length ? parseFloat((totalSales / orders.length).toFixed(2)) : 0,
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
    };
  }

  @Get('analytics/menu-performance')
  async getMenuPerformance(@TenantId() tenantId: string) {
    const orderItems = await this.prisma.order_items.findMany({
      where: { tenant_id: tenantId },
      select: { menu_item_id: true, quantity: true, price: true },
    });

    const menuItems = await this.prisma.menu_items.findMany({
      where: { tenant_id: tenantId },
      select: { id: true, name: true },
    });

    const performanceMap: Record<string, { name: string; quantitySold: number; revenue: number }> = {};
    menuItems.forEach(item => {
      performanceMap[item.id] = { name: item.name, quantitySold: 0, revenue: 0 };
    });

    orderItems.forEach(item => {
      if (item.menu_item_id && performanceMap[item.menu_item_id]) {
        performanceMap[item.menu_item_id].quantitySold += item.quantity;
        performanceMap[item.menu_item_id].revenue += item.quantity * item.price;
      }
    });

    return Object.values(performanceMap).sort((a, b) => b.quantitySold - a.quantitySold);
  }

  // ==========================================
  // MARKETING CAMPAIGNS
  // ==========================================
  @Get('marketing/campaigns')
  async getCampaigns(@TenantId() tenantId: string) {
    return this.prisma.marketing_campaigns.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  @Post('marketing/campaigns')
  async createCampaign(@TenantId() tenantId: string, @Body() body: any) {
    return this.prisma.marketing_campaigns.create({
      data: {
        id: body.id,
        tenant_id: tenantId,
        name: body.name,
        channel: body.channel,
        subject: body.subject,
        content: body.content,
        scheduled_at: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: body.status || 'pending',
      },
    });
  }
}
