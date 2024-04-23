import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { getUnixTime } from 'date-fns';

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

  export module DTO {
    export class PingEventParamDTO {
      @ApiProperty({ example: Object.values(Strategy).join('/') })
      strategy: Strategy;

      @ApiPropertyOptional({ nullable: true, example: 'connectionId (only for specific strategy)' })
      to?: string;
    }

    export class PingEventDataDTO {
      @ApiProperty()
      param: PingEventParamDTO;

      @ApiProperty({ type: 'any' })
      body: any;
    }

    export class PingEventPayloadDTO {
      @ApiProperty({ example: 'ping' })
      event: 'ping';

      @ApiProperty()
      data: PingEventDataDTO;
    }

    export class PingEventMessageDTO {
      @ApiProperty({ example: 'connectionId' })
      from: string;

      @ApiProperty({ example: getUnixTime(Date.now()) })
      timestamp: number;

      @ApiProperty()
      data: any;
    }
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
