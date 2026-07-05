import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantId } from './common/tenant.decorator';
import { AuthGuard } from './auth.guard';
import { FeatureFlagGuard, RequireFeature } from './common/features.guard';
import { NotificationService } from './notification.service';

@Controller('api/v1')
@UseGuards(AuthGuard, FeatureFlagGuard)
@RequireFeature('reservations')
export class ReservationController {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // ==========================================
  // RESERVATIONS
  // ==========================================
  @Get('reservations')
  async getReservations(
    @TenantId() tenantId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const where: any = { tenant_id: tenantId };
    if (date) {
      where.reservation_date = date;
    }
    if (status) {
      where.status = status;
    }
    return this.prisma.reservations.findMany({
      where,
      include: { time_slots: true },
      orderBy: { reservation_date: 'asc' },
    });
  }

  @Post('reservations')
  async createReservation(@TenantId() tenantId: string, @Body() body: any) {
    const partySize = parseInt(body.partySize) || 2;
    let tableId = body.tableId || null;

    // If no table_id was provided, find an available table
    if (!tableId) {
      const availableTable = await this.prisma.tables.findFirst({
        where: {
          tenant_id: tenantId,
          status: 'available',
          capacity: { gte: partySize }
        },
        orderBy: { capacity: 'asc' }
      });
      if (availableTable) {
        tableId = availableTable.id;
      }
    }

    // Mark the table as reserved
    if (tableId) {
      await this.prisma.tables.update({
        where: { id: tableId },
        data: { status: 'reserved' }
      });
    }

    const result = await this.prisma.reservations.upsert({
      where: { id: body.id },
      update: {
        customer_id: body.customerId,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        table_id: tableId,
        party_size: partySize,
        reservation_date: body.reservationDate,
        time_slot_id: body.timeSlotId,
        status: body.status,
        notes: body.notes,
        updated_at: new Date(),
      },
      create: {
        id: body.id,
        tenant_id: tenantId,
        customer_id: body.customerId,
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        table_id: tableId,
        party_size: partySize,
        reservation_date: body.reservationDate,
        time_slot_id: body.timeSlotId,
        status: body.status || 'confirmed',
        notes: body.notes,
      },
    });

    this.notificationService.emit({
      type: 'booking',
      tenantId,
      message: `New Booking: ${result.customer_name} for ${result.party_size} guests on ${result.reservation_date}`,
      data: {
        id: result.id,
        customerName: result.customer_name,
        partySize: result.party_size,
        reservationDate: result.reservation_date,
      },
    });

    return result;
  }

  @Put('reservations/:id')
  async updateReservation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // Find the current reservation first to handle table statuses
    const currentRes = await this.prisma.reservations.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (currentRes && body.status) {
      const targetTableId = currentRes.table_id || body.table_id || body.tableId;
      if (targetTableId) {
        let tableStatus = 'available';
        if (body.status === 'seated') {
          tableStatus = 'occupied';
        } else if (body.status === 'confirmed') {
          tableStatus = 'reserved';
        }
        await this.prisma.tables.update({
          where: { id: targetTableId },
          data: { status: tableStatus }
        });
      }
    }

    return this.prisma.reservations.updateMany({
      where: { id, tenant_id: tenantId },
      data: {
        ...body,
        updated_at: new Date(),
      },
    });
  }

  @Delete('reservations/:id')
  async deleteReservation(@TenantId() tenantId: string, @Param('id') id: string) {
    // Find the reservation first to release the table status
    const resEntry = await this.prisma.reservations.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (resEntry && resEntry.table_id) {
      await this.prisma.tables.update({
        where: { id: resEntry.table_id },
        data: { status: 'available' }
      });
    }

    return this.prisma.reservations.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  @Get('reservations/availability')
  async getAvailability(
    @TenantId() tenantId: string,
    @Query('date') date: string,
    @Query('partySize') partySizeArg: string,
  ) {
    const partySize = parseInt(partySizeArg) || 2;

    // 1. Get all active time slots
    const slots = await this.prisma.time_slots.findMany({
      where: { tenant_id: tenantId },
    });

    // 2. Check if date is blocked
    const blocked = await this.prisma.blocked_dates.findFirst({
      where: { tenant_id: tenantId, date },
    });

    if (blocked) {
      return slots.map(slot => ({
        ...slot,
        available: false,
        reason: `Date blocked: ${blocked.reason || 'No reason provided'}`,
      }));
    }

    // 3. For each slot, calculate active covers
    const reservations = await this.prisma.reservations.findMany({
      where: {
        tenant_id: tenantId,
        reservation_date: date,
        status: { in: ['confirmed', 'seated'] },
      },
    });

    return slots.map(slot => {
      const activeCovers = reservations
        .filter(r => r.time_slot_id === slot.id)
        .reduce((sum, r) => sum + r.party_size, 0);

      const available = activeCovers + partySize <= slot.max_covers;
      return {
        ...slot,
        activeCovers,
        availableCoversLeft: slot.max_covers - activeCovers,
        available,
      };
    });
  }

  // ==========================================
  // TABLE GROUPS
  // ==========================================
  @Get('table-groups')
  async getTableGroups(@TenantId() tenantId: string) {
    return this.prisma.table_groups.findMany({
      where: { tenant_id: tenantId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('table-groups')
  async saveTableGroup(@TenantId() tenantId: string, @Body() group: any) {
    return this.prisma.table_groups.upsert({
      where: { id: group.id },
      update: {
        name: group.name,
        updated_at: new Date(),
      },
      create: {
        id: group.id,
        tenant_id: tenantId,
        name: group.name,
      },
    });
  }

  @Delete('table-groups/:id')
  async deleteTableGroup(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.table_groups.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // TIME SLOTS
  // ==========================================
  @Get('time-slots')
  async getTimeSlots(@TenantId() tenantId: string) {
    return this.prisma.time_slots.findMany({
      where: { tenant_id: tenantId },
      orderBy: { start_time: 'asc' },
    });
  }

  @Post('time-slots')
  async saveTimeSlot(@TenantId() tenantId: string, @Body() slot: any) {
    return this.prisma.time_slots.upsert({
      where: { id: slot.id },
      update: {
        start_time: slot.startTime,
        end_time: slot.endTime,
        max_covers: parseInt(slot.maxCovers),
        updated_at: new Date(),
      },
      create: {
        id: slot.id,
        tenant_id: tenantId,
        start_time: slot.startTime,
        end_time: slot.endTime,
        max_covers: parseInt(slot.maxCovers),
      },
    });
  }

  @Delete('time-slots/:id')
  async deleteTimeSlot(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.time_slots.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }

  // ==========================================
  // BLOCKED DATES
  // ==========================================
  @Get('blocked-dates')
  async getBlockedDates(@TenantId() tenantId: string) {
    return this.prisma.blocked_dates.findMany({
      where: { tenant_id: tenantId },
      orderBy: { date: 'asc' },
    });
  }

  @Post('blocked-dates')
  async saveBlockedDate(@TenantId() tenantId: string, @Body() bd: any) {
    return this.prisma.blocked_dates.create({
      data: {
        id: bd.id,
        tenant_id: tenantId,
        date: bd.date,
        reason: bd.reason,
      },
    });
  }

  @Delete('blocked-dates/:id')
  async deleteBlockedDate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.prisma.blocked_dates.deleteMany({
      where: { id, tenant_id: tenantId },
    });
  }
}
