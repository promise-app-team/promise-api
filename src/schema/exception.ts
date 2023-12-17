import { ApiProperty } from '@nestjs/swagger';

export class HttpException {
  @ApiProperty()
  message!: string;

  @ApiProperty()
  error!: string;

  @ApiProperty()
  statusCode!: number;
}
