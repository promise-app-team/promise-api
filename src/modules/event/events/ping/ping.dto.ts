import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Connection } from '../../connection';

export module PingEvent {
  export enum Strategy {
    Self = 'self',
    Specific = 'specific',
    Broadcast = 'broadcast',
  }

  class ParamSelf {
    strategy: Strategy.Self;
  }

  class ParamSpecific {
    strategy: Strategy.Specific;
    to: string;
  }

  class ParamBroadcast {
    strategy: Strategy.Broadcast;
  }

  export class Params {
    [Strategy.Self]: ParamSelf;
    [Strategy.Specific]: ParamSpecific;
    [Strategy.Broadcast]: ParamBroadcast;
  }

  export class Body {
    message: string;
  }

  export class Data<P = any, T = any> {
    param?: P;
    body: T;
  }

  export class Payload<S extends Strategy = Strategy, T = Body> {
    @ApiProperty({ type: String })
    event: 'ping';

    @ApiProperty()
    data: Data<Params[S], T>;
  }

  export class Response<T = any> {
    from: string;
    timestamp: number;
    data: T;
  }

  export interface Type {
    send: [connection: Pick<Connection, 'id'>, data: Response];
  }

  export module DTO {
    export class PingEventParamDTO {
      @ApiProperty({ example: Object.values(Strategy).join('/') })
      strategy: Strategy;

      @ApiPropertyOptional({ nullable: true, example: 'connectionId (only for specific strategy)' })
      to?: string;
    }

    export class PingEventBodyDTO {
      @ApiProperty({ example: 'pong' })
      message: string;
    }

    export class PingEventDataDTO {
      @ApiProperty()
      param: PingEventParamDTO;

      @ApiProperty()
      body: PingEventBodyDTO;
    }

    export class PingEventPayloadDTO {
      @ApiProperty({ example: 'ping' })
      event: 'ping';

      @ApiProperty()
      data: PingEventDataDTO;
    }
  }
}
