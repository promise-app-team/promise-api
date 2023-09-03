import { Provider } from './user.entity';

export class InputCreateUser {
  username!: string | null;
  profileUrl!: string | null;
  provider!: Provider | null;
  providerId!: string | null;
}
