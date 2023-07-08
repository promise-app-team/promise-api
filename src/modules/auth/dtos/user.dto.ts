import { Provider } from '../entities/user.entity';

export class CreateUserDto {
  user!: string | null;
  profileUrl!: string | null;
  provider!: Provider | null;
  providerId!: string | null;
}

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
}
