import { AbstractEvent } from '../event.interface';

import { PrismaService } from '@/prisma';

export module ShareLocationEvent {
  export interface Body {
    lat: number;
    lng: number;
  }

  export interface Param {
    uid: number;
  }

  export interface Data {
    param: Param;
    body: Body;
  }

  export interface Payload {
    event: 'share-location';
    data: Data;
  }

  export interface Message {
    from: number;
    timestamp: number;
    data: {
      lat: number;
      lng: number;
    };
  }

  export interface Response {
    message: string;
  }

  export interface Type {
    share: [to: string, data: Message];
  }

  export interface Context {
    prisma: PrismaService;
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
