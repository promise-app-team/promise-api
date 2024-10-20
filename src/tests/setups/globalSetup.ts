import { PrismaClient } from '@prisma/client'

export default async function () {
  const prisma = new PrismaClient()
  await prisma.$transaction([
    prisma.location.deleteMany(),
    prisma.theme.deleteMany(),
    prisma.user.deleteMany(),
    prisma.promise.deleteMany(),
  ])
}
