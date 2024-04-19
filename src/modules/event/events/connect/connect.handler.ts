import { ConnectionService } from '../../connection';
import { EventResponse } from '../../event.dto';
import { EventHandler } from '../event.handler';

export class ConnectEventHandler implements EventHandler {
  constructor(private readonly connection: ConnectionService) {}

  async handle(id: string): Promise<EventResponse> {
    await this.connection.setConnection({ id });
    return { message: `Connected to ${id}` };
  }
}
