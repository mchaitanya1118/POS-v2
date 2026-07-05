import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface NotificationEvent {
  type: 'order' | 'booking';
  tenantId: string;
  message: string;
  data: any;
}

@Injectable()
export class NotificationService {
  private events$ = new Subject<NotificationEvent>();

  getEventStream() {
    return this.events$.asObservable();
  }

  emit(event: NotificationEvent) {
    this.events$.next(event);
  }
}
