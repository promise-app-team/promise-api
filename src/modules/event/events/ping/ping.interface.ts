import { AbstractEvent } from '../event.interface';

export module PingEvent {
  export enum Strategy {
    Self = 'self',
    Specific = 'specific',
    Broadcast = 'broadcast',
  }

  interface ParamSelf {
    strategy: Strategy.Self;
  }

  interface ParamSpecific {
    strategy: Strategy.Specific;
    to: string;
  }

  interface ParamBroadcast {
    strategy: Strategy.Broadcast;
  }

  export interface Param {
    [Strategy.Self]: ParamSelf;
    [Strategy.Specific]: ParamSpecific;
    [Strategy.Broadcast]: ParamBroadcast;
  }

  export type Body = any;

  export interface Data<TParam = Param[Strategy], TBody = Body> {
    param?: TParam;
    body: TBody;
  }

  export interface Payload<S extends Strategy = Strategy, TBody = Body> {
    event: 'ping';
    data: Data<Param[S], TBody>;
  }

  export interface Response {
    message: string;
  }

  export interface Message<T = any> {
    from: string;
    timestamp: number;
    data: T;
  }

  export interface Type {
    send: [to: string, data: Message];
  }
}

export interface PingEvent extends AbstractEvent {
  Type: PingEvent.Type;
  Param: PingEvent.Param;
  Body: PingEvent.Body;
  Data: PingEvent.Data;
  Payload: PingEvent.Payload;
  Response: PingEvent.Response;
  Strategy: PingEvent.Strategy;
}

// export module DTO {
//   export class PingEventParamDTO {
//     @ApiProperty({ example: Object.values(Strategy).join('/') })
//     strategy: Strategy;

//     @ApiPropertyOptional({ nullable: true, example: 'connectionId (only for specific strategy)' })
//     to?: string;
//   }

//   export class PingEventBodyDTO {
//     @ApiProperty({ example: 'pong' })
//     message: string;
//   }

//   export class PingEventDataDTO {
//     @ApiProperty()
//     param: PingEventParamDTO;

//     @ApiProperty()
//     body: PingEventBodyDTO;
//   }

//   export class PingEventPayloadDTO {
//     @ApiProperty({ example: 'ping' })
//     event: 'ping';

//     @ApiProperty()
//     data: PingEventDataDTO;
//   }
// }
