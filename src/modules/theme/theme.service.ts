import { Injectable } from '@nestjs/common'

import { PrismaService, ThemeModel } from '@/prisma'

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async getThemes(): Promise<ThemeModel[]> {
    return this.prisma.theme.findMany()
  }
}
