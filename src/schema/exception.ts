import { ApiProperty } from '@nestjs/swagger';

export class HttpException {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  error!: string;

  @ApiProperty()
  statusCode!: number;

  constructor(args?: { message: string; error: string; statusCode: number }) {
    Object.assign(this, args);
  }
}
