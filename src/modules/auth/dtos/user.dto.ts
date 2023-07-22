import { Provider } from '../entities/user.entity';

export class InputCreateUser {
  user!: string | null;
  profileUrl!: string | null;
  provider!: Provider | null;
  providerId!: string | null;
}
