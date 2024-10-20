import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsLatitude, IsLongitude, ValidateNested } from 'class-validator'

import { Location } from '@/utils/geometric'

export class DevPointDTO implements Location {
  @IsLatitude()
  @ApiProperty({ example: 37.7749 })
  latitude!: number

  @IsLongitude()
  @ApiProperty({ example: 127.4194 })
  longitude!: number
}

export class InputMidpointDTO {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DevPointDTO)
  @ApiProperty({ type: [DevPointDTO] })
  points!: DevPointDTO[]
}
