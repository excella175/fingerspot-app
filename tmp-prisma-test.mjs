import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const attendance = await prisma.attendanceLog.create({
    data: {
      employeePin: "1001",
      deviceCloudId: "demo-device",
      scanTime: new Date(),
      verifyMethod: 0,
      statusScan: 0,
      status: "IN",
      source: "manual-test",
      rawPayload: { test: true },
    },
  });

  const user = await prisma.userInfo.create({
    data: {
      pin: "1001",
      name: "Test User",
      password: null,
      privilege: 1,
      finger: 0,
      face: 0,
      rfid: 0,
      vein: 0,
      template: null,
      deviceCloudId: "demo-device",
      rawPayload: { test: true },
    },
  });

  console.log(
    JSON.stringify({ attendanceId: attendance.id, userId: user.id }, null, 2),
  );
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
