import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { getUnixTime } from 'date-fns';

import { ConnectionID } from '../../connections';
import { AbstractEvent } from '../event.interface';

export module PingEvent {
  export enum Strategy {
    Self = 'self',
    Specific = 'specific',
    Broadcast = 'broadcast',
  }

  type ParamSelf = {
    strategy: Strategy.Self;
  };

  type ParamSpecific = {
    strategy: Strategy.Specific;
    to: string;
  };

  type ParamBroadcast = {
    strategy: Strategy.Broadcast;
    channel?: string;
  };

  export type Param = ParamSelf | ParamSpecific | ParamBroadcast;

  export type ParamMap = {
    [Strategy.Self]: ParamSelf;
    [Strategy.Specific]: ParamSpecific;
    [Strategy.Broadcast]: ParamBroadcast;
  };

  export type Body = any;

  export type Data<TParam = ParamMap[Strategy], TBody = Body> = {
    param?: TParam;
    body: TBody;
  };

  export type Payload<S extends Strategy = Strategy, TBody = Body> = {
    event: 'ping';
    data: Data<ParamMap[S], TBody>;
  };

  export type Response = {
    message: string;
  };

  export type MessageData = any;
  export type MessageError = { error: string };

  export type Message<TData = MessageData> = {
    from: string;
    timestamp: number;
    data: TData;
  };

  export type Type = {
    send: [to: ConnectionID, data: Message];
    error: [to: ConnectionID, error: Message<MessageError>];
  };

  export module DTO {
    export class PingEventParamSelfDTO implements ParamSelf {
      @ApiProperty({ example: Strategy.Self })
      strategy: Strategy.Self;
    }

    export class PingEventParamSpecificDTO implements ParamSpecific {
      @ApiProperty({ example: Strategy.Specific })
      strategy: Strategy.Specific;

      @ApiProperty({ example: '1234567890', description: 'ConnectionID to send message' })
      to: string;
    }

    export class PingEventParamBroadcastDTO implements ParamBroadcast {
      @ApiProperty({ example: Strategy.Broadcast })
      strategy: Strategy.Broadcast;

      @ApiPropertyOptional({
        example: 'channel',
        description: 'Channel to send message',
        default: 'public',
      })
      channel?: string;
    }

    @ApiExtraModels(PingEventParamSelfDTO, PingEventParamSpecificDTO, PingEventParamBroadcastDTO)
    export class PingEventDataDTO implements Data {
      @ApiProperty({
        oneOf: [
          { $ref: getSchemaPath(PingEventParamSelfDTO) },
          { $ref: getSchemaPath(PingEventParamSpecificDTO) },
          { $ref: getSchemaPath(PingEventParamBroadcastDTO) },
        ],
      })
      param: PingEventParamSelfDTO | PingEventParamSpecificDTO | PingEventParamBroadcastDTO;

      @ApiProperty()
      body: any;
    }

    export class PingEventMessageDTO implements Message {
      @ApiProperty({ example: 'connectionId' })
      from: string;

      @ApiProperty({ example: getUnixTime(Date.now()) })
      timestamp: number;

      @ApiProperty()
      data: any;
    }

    @ApiExtraModels(PingEventMessageDTO)
    export class PingEventPayloadDTO implements Payload {
      @ApiProperty({ example: 'ping' })
      event: 'ping';

      @ApiProperty()
      data: PingEventDataDTO;
    }
  }
}

export interface PingEvent extends AbstractEvent {
  Type: PingEvent.Type;
  Param: PingEvent.ParamMap;
  Body: PingEvent.Body;
  Data: PingEvent.Data;
  Payload: PingEvent.Payload;
  Response: PingEvent.Response;
  Strategy: PingEvent.Strategy;
}
