import { EventPayload } from '../event.dto';

export namespace ShareLocationEvent {
  export class Body {
    lat: number;
    lng: number;
  }

  export class Param {
    uid: number;
  }

  export class Data {
    param: Param;
    body: Body;
  }

  export class Payload implements EventPayload {
    event: 'share-location';
    data: Data;
  }

  export class Response {
    from: string;
    timestamp: number;
    data: Body;
  }

  export interface Type {
    share: [to: string, data: Response];
  }
}
