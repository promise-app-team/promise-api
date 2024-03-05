import { Global, Module } from '@nestjs/common';
import { HasherService } from './services/hasher.service';
import { PrismaService } from './services/prisma.service';

@Module({
  providers: [HasherService, PrismaService],
  exports: [HasherService, PrismaService],
})
@Global()
export class CommonModule {}
