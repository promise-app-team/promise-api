import { EventPayload, EventResponse } from '../event.dto';

export interface EventHandler {
  handle(id: string, data: EventPayload['data']): Promise<EventResponse>;
}
