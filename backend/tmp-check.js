const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const agencies = await prisma.agency.findMany({
      select: { id: true, name: true, slug: true, address: true },
      orderBy: { createdAt: 'asc' }
    });
    console.log(JSON.stringify(agencies, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.();
  }
})();
