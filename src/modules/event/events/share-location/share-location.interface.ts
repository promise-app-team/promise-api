import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

import { ConnectionID } from '../../connections';
import { AbstractEvent } from '../event.interface';

import { PrismaService } from '@/prisma';

export module ShareLocationEvent {
  export interface Body {
    lat: number;
    lng: number;
  }

  export interface Param {
    promiseIds: string[];
    _promiseIds: string[]; // decoded
  }

  export interface Data {
    param: Param;
    body: Body;
  }

  export interface Payload {
    event: 'share-location';
    data: Data;
  }

  export interface MessageData {
    lat: number;
    lng: number;
  }

  export interface MessageError {
    error: string;
  }

  export interface Message<TData = MessageData> {
    from: number;
    timestamp: number;
    data: TData;
  }

  export interface Response {
    message: string;
  }

  export interface Type {
    share: [to: ConnectionID, data: Message];
    error: [to: ConnectionID, data: Message<MessageError>];
  }

  export interface Context {
    prisma: PrismaService;
  }

  export module DTO {
    export class ShareLocationEventParamDTO {
      @ApiProperty({ example: 'userId' })
      id: number;

      @ApiProperty({ example: ['1234567890'] })
      promiseIds: string[];
    }

    export class ShareLocationEventBodyDTO {
      @ApiProperty({ example: 37.7749 })
      lat: number;

      @ApiProperty({ example: 122.4194 })
      lng: number;
    }

    export class ShareLocationEventDataDTO {
      @ApiProperty()
      param: ShareLocationEventParamDTO;

      @ApiProperty()
      body: ShareLocationEventBodyDTO;
    }

    export class ShareLocationEventMessageDataDTO {
      @ApiProperty({ example: 37.7749, description: 'Latitude' })
      lat: number;

      @ApiProperty({ example: 122.4194, description: 'Longitude' })
      lng: number;
    }

    export class ShareLocationEventMessageErrorDTO {
      @ApiProperty({ example: 'error message', description: 'Error message' })
      error: string;
    }

    export class ShareLocationEventMessageDTO {
      @ApiProperty({ example: 1, description: 'User ID' })
      from: number;

      @ApiProperty({ example: 1633488000 })
      timestamp: number;

      @ApiProperty({
        oneOf: [
          { type: 'object', $ref: '#/components/schemas/ShareLocationEventMessageErrorDTO' },
          { type: 'object', $ref: '#/components/schemas/ShareLocationEventMessageDataDTO' },
        ],
      })
      data: ShareLocationEventMessageDataDTO | ShareLocationEventMessageErrorDTO;
    }

    @ApiExtraModels(ShareLocationEventMessageDTO, ShareLocationEventMessageDataDTO, ShareLocationEventMessageErrorDTO)
    export class ShareLocationEventPayloadDTO {
      @ApiProperty({ example: 'share-location' })
      event: 'share-location';

      @ApiProperty()
      data: ShareLocationEventDataDTO;
    }
  }
}

export interface ShareLocationEvent extends AbstractEvent {
  Type: ShareLocationEvent.Type;
  Param: ShareLocationEvent.Param;
  Body: ShareLocationEvent.Body;
  Data: ShareLocationEvent.Data;
  Payload: ShareLocationEvent.Payload;
  Message: ShareLocationEvent.Message;
  Response: ShareLocationEvent.Response;
  Context: ShareLocationEvent.Context;
}
