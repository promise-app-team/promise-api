import { ApiProperty } from '@nestjs/swagger';
import { formatISO } from 'date-fns';

export class EntryDTO {
  @ApiProperty({ example: 'pong' })
  message!: string;

  @ApiProperty({ example: '1.0.0' })
  version!: string;

  @ApiProperty({ example: formatISO(new Date()) })
  build!: string;

  @ApiProperty({ example: formatISO(new Date()) })
  deploy!: string;

  @ApiProperty({ example: 'prod' })
  stage!: string;

  @ApiProperty({ example: process.env.NODE_ENV })
  env!: string;

  @ApiProperty({ example: Intl.DateTimeFormat().resolvedOptions().timeZone })
  tz!: string;
}
