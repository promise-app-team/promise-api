import { PrismaClient } from '@prisma/client';

export default async function () {
  await new PrismaClient().$transaction(async (prisma) => {
    await prisma.promiseTheme.deleteMany();
    await prisma.promiseUser.deleteMany();
    await prisma.location.deleteMany();
    // await prisma.theme.deleteMany();
    await prisma.user.deleteMany();
    await prisma.promise.deleteMany();
  });
}
