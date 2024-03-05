import { Global, Logger, Module } from '@nestjs/common';
import { HasherService } from './services/hasher.service';

@Global()
@Module({
  providers: [HasherService, Logger],
  exports: [HasherService, Logger],
})
export class CommonModule {}
