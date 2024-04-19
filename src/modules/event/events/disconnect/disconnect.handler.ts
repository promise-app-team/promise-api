import { ConnectionService } from '../../connection';
import { EventResponse } from '../../event.dto';
import { EventHandler } from '../event.handler';

export class DisconnectEventHandler implements EventHandler {
  constructor(private readonly connection: ConnectionService) {}

  async handle(id: string): Promise<EventResponse> {
    await this.connection.delConnection(id);
    return { message: `Disconnected from ${id}` };
  }
}
