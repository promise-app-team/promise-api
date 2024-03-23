import { PrismaClient } from '@prisma/client';

export default async function () {
  await new PrismaClient().$transaction(async (prisma) => {
    await prisma.promiseTheme.deleteMany();
    await prisma.promiseUser.deleteMany();
    await prisma.location.deleteMany();
    // await prisma.theme.deleteMany();
    await prisma.user.deleteMany();
    await prisma.promise.deleteMany();

    await prisma.$queryRaw`ALTER TABLE pm_locations AUTO_INCREMENT = 1`;
    await prisma.$queryRaw`ALTER TABLE pm_promises AUTO_INCREMENT = 1`;
    // await prisma.$queryRaw`ALTER TABLE pm_themes AUTO_INCREMENT = 1`;
    await prisma.$queryRaw`ALTER TABLE pm_users AUTO_INCREMENT = 1`;
  });
}
