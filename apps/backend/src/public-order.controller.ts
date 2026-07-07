import { Controller, Get, Post, Param, NotFoundException, Res } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as fs from 'fs';
import { join } from 'path';

@Controller('api/v1/public/orders')
export class PublicOrderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: any) {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    return res.sendFile(filePath);
  }

  @Get(':orderId')
  async getOrderDetails(@Param('orderId') orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            menu_items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const tenant = await this.prisma.tenants.findUnique({
      where: { id: order.tenant_id },
      select: {
        name: true,
      },
    });

    return {
      order,
      restaurantName: tenant?.name || 'Infinity POS Cafe',
    };
  }

  @Post(':orderId/pay')
  async payOrder(@Param('orderId') orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // 1. Update the order payment status to paid and overall status to placed
    const updatedOrder = await this.prisma.orders.update({
      where: { id: orderId },
      data: {
        payment_status: 'paid',
        status: 'placed',
        updated_at: new Date(),
      },
    });

    // 2. Log payment in payments table
    await this.prisma.payments.create({
      data: {
        id: `pay_${Date.now()}`,
        tenant_id: order.tenant_id,
        order_id: orderId,
        payment_type: 'card',
        amount_paid: order.grand_total,
        payment_method: 'card',
        created_by: 'public-checkout',
      },
    });

    // 3. Update Kitchen Ticket status to new/active so kitchen displays it
    await this.prisma.kitchen_tickets.updateMany({
      where: { order_id: orderId, tenant_id: order.tenant_id },
      data: {
        status: 'new',
      },
    });

    return {
      success: true,
      order: updatedOrder,
    };
  }
}
