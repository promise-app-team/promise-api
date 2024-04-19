import { IsNotEmpty, IsString } from 'class-validator';

export enum ConnectionTo {
  Self = 'self',
  Broadcast = 'broadcast',
}

export class Connection {
  id!: string;
  to!: ConnectionTo | string;
}

export class EventBody<T = any> {
  @IsString({ message: '이벤트 이름을 전달해야 합니다.' })
  event: string;

  @IsNotEmpty({ message: '데이터를 전달해야 합니다.' })
  data: T;
}

export class EventResponse<T = any> {
  from: string;
  timestamp: number;
  data: T;
}
