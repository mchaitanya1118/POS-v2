import { Controller, Post, Body, Param, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('api/v1/public/voice-ai/:tenantId')
export class PublicVoiceAiController {
  constructor(private prisma: PrismaService) {}

  @Post('vapi')
  async handleVapiWebhook(
    @Param('tenantId') tenantId: string,
    @Body() payload: any
  ) {
    // 1. Verify tenant exists and has Voice AI feature enabled
    const tenant = await this.prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const features = (tenant.features as Record<string, boolean>) || {};
    if (!features.voice_ai) {
      throw new ForbiddenException('Voice AI feature is not enabled for this restaurant');
    }

    // 2. Parse the Vapi function call message
    const message = payload?.message;
    if (!message) {
      return {
        result: 'Invalid webhook payload structure. Message block is missing.'
      };
    }

    let name = '';
    let parameters: any = {};
    let toolCallId = null;

    if (message.type === 'function-call') {
      name = message.functionCall?.name;
      parameters = message.functionCall?.parameters || {};
      toolCallId = message.functionCall?.id || null;
    } else if (message.type === 'tool-calls' && Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
      const toolCall = message.toolCalls[0];
      toolCallId = toolCall.id;
      name = toolCall.function?.name;
      
      const rawArgs = toolCall.function?.arguments;
      if (typeof rawArgs === 'string') {
        try {
          parameters = JSON.parse(rawArgs);
        } catch (e) {
          parameters = {};
        }
      } else if (typeof rawArgs === 'object' && rawArgs !== null) {
        parameters = rawArgs;
      }
    } else {
      return {
        result: `Unsupported message type: ${message.type}`
      };
    }

    // Log the incoming voice interaction
    try {
      await this.prisma.voice_ai_calls.create({
        data: {
          id: `vapi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          tenant_id: tenantId,
          caller_number: payload?.customer?.number || 'Voice Agent System',
          status: 'completed',
          transcription: `AI Tool Call: ${name}. Arguments: ${JSON.stringify(parameters)}`,
          duration_seconds: 30,
        }
      });
    } catch (logErr) {
      console.error('Failed to log voice AI call:', logErr);
    }

    // Route to appropriate handler
    let resultObj: any;
    switch (name) {
      case 'getMenu':
        resultObj = await this.handleGetMenu(tenantId);
        break;
      case 'createReservation':
        resultObj = await this.handleCreateReservation(tenantId, parameters);
        break;
      case 'createOrder':
        resultObj = await this.handleCreateOrder(tenantId, parameters);
        break;
      default:
        resultObj = {
          result: `Function '${name}' is not recognized by the system.`
        };
    }

    // Wrap in Vapi results format if toolCallId is present
    if (toolCallId) {
      return {
        results: [
          {
            toolCallId: toolCallId,
            result: typeof resultObj?.result === 'string' ? resultObj.result : JSON.stringify(resultObj)
          }
        ]
      };
    }

    return resultObj;
  }

  // Helper: Get Menu
  private async handleGetMenu(tenantId: string) {
    const items = await this.prisma.menu_items.findMany({
      where: { tenant_id: tenantId, is_available: true },
      include: { menu_categories: true }
    });

    if (items.length === 0) {
      return { result: 'The menu is currently empty.' };
    }

    const menuString = items
      .map(item => `${item.name} ($${item.price.toFixed(2)}) - ${item.description || 'delicious'}`)
      .join(', ');

    return {
      result: `Here is our menu: ${menuString}.`
    };
  }

  // Helper: Parse time to 24h format e.g. "7:30 pm" -> "19:30"
  private parseTimeTo24h(timeStr: string): string {
    const cleaned = timeStr.trim().toLowerCase();
    
    // Match standard 12-hour format e.g. "7:30 pm", "7 pm", "12:00 am"
    const ampmRegex = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/;
    const match = cleaned.match(ampmRegex);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? match[2] : '00';
      const ampm = match[3];
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    // Match 24-hour format e.g. "19:30", "19:00", "07:30"
    const h24Regex = /^(\d{1,2})(?::(\d{2}))?$/;
    const match24 = cleaned.match(h24Regex);
    if (match24) {
      const hours = parseInt(match24[1]);
      const minutes = match24[2] ? match24[2] : '00';
      if (hours >= 0 && hours < 24) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
    
    return cleaned;
  }

  // Helper: Create Reservation
  private async handleCreateReservation(tenantId: string, params: any) {
    const customerName = params.customerName || params.guestName || 'Guest';
    const customerPhone = params.customerPhone || params.phone || '0000000000';
    const partySize = parseInt(params.partySize || params.guests) || 2;
    const reservationDate = params.reservationDate || params.date || new Date().toISOString().split('T')[0];
    const reservationTime = params.reservationTime || params.time || null;
    const notes = params.notes || 'Booked via AI Voice Receptionist';

    try {
      // Find all time slots for the tenant
      const slots = await this.prisma.time_slots.findMany({
        where: { tenant_id: tenantId },
        orderBy: { start_time: 'asc' }
      });

      let timeSlotId = null;
      let matchedSlotInfo = '';

      if (slots.length > 0) {
        if (reservationTime) {
          const requested24h = this.parseTimeTo24h(reservationTime);
          let bestSlot = slots[0];
          let minDiff = Infinity;

          for (const slot of slots) {
            const [sH, sM] = slot.start_time.split(':').map(Number);
            const [eH, eM] = slot.end_time.split(':').map(Number);
            const slotStartMin = sH * 60 + sM;
            const slotEndMin = eH * 60 + eM;

            const [rH, rM] = requested24h.split(':').map(Number);
            if (!isNaN(rH) && !isNaN(rM)) {
              const requestedMin = rH * 60 + rM;
              // Direct overlap check
              if (requestedMin >= slotStartMin && requestedMin <= slotEndMin) {
                bestSlot = slot;
                break;
              }
              // Minimum distance check
              const diff = Math.abs(requestedMin - slotStartMin);
              if (diff < minDiff) {
                minDiff = diff;
                bestSlot = slot;
              }
            }
          }
          timeSlotId = bestSlot.id;
          matchedSlotInfo = ` for slot ${bestSlot.start_time}-${bestSlot.end_time}`;
        } else {
          timeSlotId = slots[0].id;
          matchedSlotInfo = ` for slot ${slots[0].start_time}-${slots[0].end_time}`;
        }
      }

      // Find an available table for this party size
      const availableTable = await this.prisma.tables.findFirst({
        where: {
          tenant_id: tenantId,
          status: 'available',
          capacity: { gte: partySize }
        },
        orderBy: { capacity: 'asc' }
      });

      let assignedTableId = null;
      let matchedTableInfo = '';

      if (availableTable) {
        assignedTableId = availableTable.id;
        matchedTableInfo = ` (Table ${availableTable.table_number})`;
        await this.prisma.tables.update({
          where: { id: availableTable.id },
          data: { status: 'reserved' }
        });
      }

      const resId = `res_${Date.now()}`;
      await this.prisma.reservations.create({
        data: {
          id: resId,
          tenant_id: tenantId,
          customer_name: customerName,
          customer_phone: customerPhone,
          party_size: partySize,
          reservation_date: reservationDate,
          time_slot_id: timeSlotId,
          table_id: assignedTableId,
          status: 'confirmed',
          notes: notes + (reservationTime ? ` (Requested Time: ${reservationTime})` : ''),
          created_by: 'vapi-voice-ai'
        }
      });

      return {
        result: `Success! Table reserved for ${customerName} for ${partySize} guests on ${reservationDate}${matchedSlotInfo}${matchedTableInfo}.`
      };
    } catch (err: any) {
      return {
        result: `Failed to create reservation: ${err.message || 'database error'}`
      };
    }
  }

  // Helper: Create Order
  private async handleCreateOrder(tenantId: string, params: any) {
    const items = params.items || [];
    const tableId = params.tableId || null;

    if (!Array.isArray(items) || items.length === 0) {
      return { result: 'Your order list is empty.' };
    }

    try {
      // Get GST/Tax settings
      const settingsList = await this.prisma.settings.findMany({
        where: { tenant_id: tenantId }
      });
      const settingsObj: Record<string, any> = {};
      settingsList.forEach((row) => {
        if (row.key === 'taxPercentage') {
          settingsObj[row.key] = parseFloat(row.value);
        } else if (row.key === 'enableGst') {
          settingsObj[row.key] = row.value === 'true';
        } else {
          settingsObj[row.key] = row.value;
        }
      });
      const taxRate = (settingsObj.taxPercentage || 12.5) / 100;
      const enableGst = settingsObj.enableGst !== false;

      const orderItemsData: any[] = [];
      let subtotal = 0;

      for (const item of items) {
        const query = item.menuItemId 
          ? { id: item.menuItemId } 
          : { name: { equals: item.name, mode: 'insensitive' as const } };

        const matchedItem = await this.prisma.menu_items.findFirst({
          where: {
            tenant_id: tenantId,
            is_available: true,
            ...query
          }
        });

        if (matchedItem) {
          const qty = parseInt(item.quantity) || 1;
          const price = matchedItem.price;
          const itemSubtotal = price * qty;
          
          subtotal += itemSubtotal;
          orderItemsData.push({
            menuItemId: matchedItem.id,
            name: matchedItem.name,
            quantity: qty,
            price: price,
            subtotal: itemSubtotal
          });
        }
      }

      if (orderItemsData.length === 0) {
        return { result: 'None of the ordered items could be matched in the menu.' };
      }

      const tax = enableGst ? subtotal * taxRate : 0;
      const grandTotal = subtotal + tax;

      const orderId = `ord_${Date.now()}`;
      const orderNumber = `AI-${Date.now().toString().slice(-4)}`;

      // Create POS Order record
      await this.prisma.orders.create({
        data: {
          id: orderId,
          tenant_id: tenantId,
          order_number: orderNumber,
          table_id: tableId,
          subtotal: subtotal,
          tax: tax,
          discount: 0,
          grand_total: grandTotal,
          status: 'placed',
          payment_status: 'pending',
          created_by: 'vapi-voice-ai'
        }
      });

      // Create POS Order Items
      for (const item of orderItemsData) {
        await this.prisma.order_items.create({
          data: {
            id: `oi_${Math.random().toString(36).substring(2, 11)}`,
            tenant_id: tenantId,
            order_id: orderId,
            menu_item_id: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            created_by: 'vapi-voice-ai'
          }
        });
      }

      // Create Kitchen Ticket
      await this.prisma.kitchen_tickets.create({
        data: {
          id: `kt_${Date.now()}`,
          tenant_id: tenantId,
          order_id: orderId,
          table_id: tableId,
          status: 'new'
        }
      });

      return {
        result: `Success! Order ${orderNumber} placed for $${grandTotal.toFixed(2)}. The kitchen has received the ticket.`
      };
    } catch (err: any) {
      return {
        result: `Failed to place voice order: ${err.message || 'database error'}`
      };
    }
  }
}
