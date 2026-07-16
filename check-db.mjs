import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const logs = await prisma.attendanceLog.findMany({
    where: { deviceCloudId: "demo-device" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const users = await prisma.userInfo.findMany({
    where: { deviceCloudId: "demo-device" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log(JSON.stringify({ logs, users }, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
