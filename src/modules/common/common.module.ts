import { Global, Logger, Module } from '@nestjs/common';
import { HasherService } from './services/hasher.service';
import { PrismaService } from './services/prisma.service';

@Global()
@Module({
  providers: [HasherService, PrismaService, Logger],
  exports: [HasherService, PrismaService, Logger],
})
export class CommonModule {}
