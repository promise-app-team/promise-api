import { User } from '@prisma/client';

import { EventPayload } from '../../event.dto';

export namespace ShareLocationEvent {
  export class Param {
    pid: string;
  }

  export class Body {
    lat: number | string;
    lng: number | string;
  }

  export class Payload implements EventPayload {
    event: 'share-location';
    data: {
      param: Param;
      body: Body;
    };
  }

  export class Response {
    from: Pick<User, 'id' | 'username' | 'profileUrl'>;
    timestamp: number;
    data: Body;
  }
}
