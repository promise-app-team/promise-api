import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger'

import { PrismaService } from '@/prisma'

import { ConnectionID } from '../../connections'
import { AbstractEvent } from '../event.interface'

export namespace ShareLocationEvent {
  export type Body = {
    lat: number
    lng: number
  }

  export type Param = {
    promiseIds: string[]
    __promiseIds?: string[] // decoded
  }

  export type Data = {
    param: Param
    body: Body
  }

  export type Payload = {
    event: 'share-location'
    data: Data
  }

  export type MessageData = {
    lat: number
    lng: number
  }

  export type MessageError = {
    error: string
  }

  export type Message<TData = MessageData, TError = MessageError> = {
    from: number
    timestamp: number
    data: TData | TError
  }

  export type Response = {
    message: string
  }

  export type Type = {
    share: [to: ConnectionID, data: Message]
    error: [to: ConnectionID, data: Message<MessageError>]
  }

  export type Context = {
    prisma: PrismaService
  }

  export namespace DTO {
    export class ShareLocationEventParamDTO implements Param {
      @ApiProperty({ example: ['1234567890'] })
      promiseIds!: string[]
    }

    export class ShareLocationEventBodyDTO implements Body {
      @ApiProperty({ example: 37.7749 })
      lat!: number

      @ApiProperty({ example: 122.4194 })
      lng!: number
    }

    export class ShareLocationEventDataDTO implements Data {
      @ApiProperty()
      param!: ShareLocationEventParamDTO

      @ApiProperty()
      body!: ShareLocationEventBodyDTO
    }

    export class ShareLocationEventMessageDataDTO implements MessageData {
      @ApiProperty({ example: 37.7749, description: 'Latitude' })
      lat!: number

      @ApiProperty({ example: 122.4194, description: 'Longitude' })
      lng!: number
    }

    export class ShareLocationEventMessageErrorDTO implements MessageError {
      @ApiProperty({ example: 'error message', description: 'Error message' })
      error!: string
    }

    export class ShareLocationEventMessageDTO implements Message {
      @ApiProperty({ example: 1, description: 'User ID' })
      from!: number

      @ApiProperty({ example: 1633488000 })
      timestamp!: number

      @ApiProperty({
        oneOf: [
          { $ref: getSchemaPath(ShareLocationEventMessageDataDTO) },
          { $ref: getSchemaPath(ShareLocationEventMessageErrorDTO) },
        ],
      })
      data!: ShareLocationEventMessageDataDTO | ShareLocationEventMessageErrorDTO
    }

    @ApiExtraModels(ShareLocationEventMessageDTO, ShareLocationEventMessageDataDTO, ShareLocationEventMessageErrorDTO)
    export class ShareLocationEventPayloadDTO implements Payload {
      @ApiProperty({ example: 'share-location' })
      event!: 'share-location'

      @ApiProperty()
      data!: ShareLocationEventDataDTO
    }
  }
}

export interface ShareLocationEvent extends AbstractEvent {
  Type: ShareLocationEvent.Type
  Param: ShareLocationEvent.Param
  Body: ShareLocationEvent.Body
  Data: ShareLocationEvent.Data
  Payload: ShareLocationEvent.Payload
  Message: ShareLocationEvent.Message
  Response: ShareLocationEvent.Response
  Context: ShareLocationEvent.Context
}
