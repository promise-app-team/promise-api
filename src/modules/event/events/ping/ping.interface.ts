import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { getUnixTime } from 'date-fns';

import { ConnectionID } from '../../connections';
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

  export type MessageData = any;
  export type MessageError = { error: string };

  export interface Message<TData = MessageData> {
    from: string;
    timestamp: number;
    data: TData;
  }

  export interface Type {
    send: [to: ConnectionID, data: Message];
    error: [to: ConnectionID, error: Message<MessageError>];
  }

  export module DTO {
    export class PingEventParamDTO {
      @ApiProperty({ example: Object.values(Strategy).join('|') })
      strategy: Strategy;

      @ApiPropertyOptional({
        nullable: true,
        example: '1234567890',
        description: 'ConnectionId to send message to (required if strategy is specific)',
      })
      to?: string;
    }

    export class PingEventDataDTO {
      @ApiProperty()
      param: PingEventParamDTO;

      @ApiProperty()
      body: any;
    }

    export class PingEventMessageDTO {
      @ApiProperty({ example: 'connectionId' })
      from: string;

      @ApiProperty({ example: getUnixTime(Date.now()) })
      timestamp: number;

      @ApiProperty()
      data: any;
    }

    @ApiExtraModels(PingEventMessageDTO)
    export class PingEventPayloadDTO {
      @ApiProperty({ example: 'ping' })
      event: 'ping';

      @ApiProperty()
      data: PingEventDataDTO;
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
