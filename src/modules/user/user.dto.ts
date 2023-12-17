import { PartialType, PickType } from '@nestjs/swagger';
import { Provider, UserEntity } from './user.entity';

// TODO: Swagger MappedType으로 변경
export class InputCreateUser {
  username!: string | null;
  profileUrl!: string | null;
  provider!: Provider | null;
  providerId!: string | null;
}

export class InputUpdateUser extends PartialType(
  PickType(UserEntity, ['username', 'profileUrl'])
) {}

export class InputDeleteUser {
  reason!: string;
}
