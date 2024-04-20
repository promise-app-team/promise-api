import { ApiProperty } from '@nestjs/swagger';

export class EventData<TParam = any, TBody = any> {
  @ApiProperty()
  param?: TParam;

  @ApiProperty()
  body: TBody;
}

export class EventPayload<TParam = any, TBody = any> {
  @ApiProperty()
  event: string;

  @ApiProperty()
  data: EventData<TParam, TBody>;
}

export class EventResponse {
  message: string;
}
