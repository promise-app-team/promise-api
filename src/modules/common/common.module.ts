import { Global, Module } from '@nestjs/common';
import { HasherService } from './services/HasherService.service';

@Module({
  providers: [HasherService],
  exports: [HasherService],
})
@Global()
export class CommonModule {}
