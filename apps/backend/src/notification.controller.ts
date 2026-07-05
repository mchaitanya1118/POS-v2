import { Controller, Sse, MessageEvent, Query } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { NotificationService } from './notification.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Sse('sse')
  sse(@Query('tenantId') tenantId: string): Observable<MessageEvent> {
    return this.notificationService.getEventStream().pipe(
      filter((event) => event.tenantId === tenantId),
      map((event) => ({
        data: {
          type: event.type,
          message: event.message,
          data: event.data,
        },
      } as MessageEvent)),
    );
  }
}
