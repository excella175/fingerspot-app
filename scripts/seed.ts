import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

function pad(n: number) { return n.toString().padStart(2, "0"); }

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // 1. Aturan
  await prisma.aturan.upsert({
    where: { kode: "S-001" },
    update: {},
    create: { kode: "S-001", name: "Standar", toleransiTerlambat: 15, toleransiPulangCepat: 15, batasAbsensiMasuk: 60, batasAbsensiPulang: 60 },
  });

  // 2. JamKerja
  await prisma.jamKerja.upsert({
    where: { kode: "JK-001" },
    update: {},
    create: { kode: "JK-001", name: "Reguler", type: "tetap", aturanKode: "S-001", hariKerja: 5, startTime: "08:00", endTime: "17:00" },
  });

  // 3. Employees
  const emp1 = { pin: "1001", name: "Ahmad Santoso" };
  const emp2 = { pin: "1002", name: "Siti Rahma" };
  for (const emp of [emp1, emp2]) {
    await prisma.userInfo.upsert({
      where: { pin: emp.pin },
      update: { name: emp.name },
      create: { pin: emp.pin, name: emp.name, privilege: 1 },
    });
  }

  // 4. JadwalAuto
  const auto = await prisma.jadwalAuto.upsert({
    where: { id: "__unused__" },
    update: {},
    create: { name: "Standar" },
  });

  for (let d = 1; d <= 5; d++) {
    await prisma.jadwalAutoDay.upsert({
      where: { jadwalId_dayOfWeek: { jadwalId: auto.id, dayOfWeek: d } },
      update: { jamKerjaKode: "JK-001" },
      create: { jadwalId: auto.id, dayOfWeek: d, jamKerjaKode: "JK-001" },
    });
  }
  for (const pin of [emp1.pin, emp2.pin]) {
    await prisma.jadwalAutoEmployee.upsert({
      where: { jadwalId_employeePin: { jadwalId: auto.id, employeePin: pin } },
      update: {},
      create: { jadwalId: auto.id, employeePin: pin },
    });
  }

  // 5. AttendanceLogs
  let attCount = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;

    // Emp1: on time
    const s1in = new Date(`${dateStr}T07:55:00+07:00`);
    const s1out = new Date(`${dateStr}T17:05:00+07:00`);
    if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp1.pin, scanTime: s1in } }))) {
      await prisma.attendanceLog.create({ data: { employeePin: emp1.pin, deviceCloudId: "seed", scanTime: s1in, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
      attCount++;
    }
    if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp1.pin, scanTime: s1out } }))) {
      await prisma.attendanceLog.create({ data: { employeePin: emp1.pin, deviceCloudId: "seed", scanTime: s1out, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
      attCount++;
    }

    // Emp2: varies
    if (day % 7 === 3) continue; // alpha
    if (day % 7 === 5) { // izin
      await prisma.riwayatIzinCuti.create({ data: { employeePin: emp2.pin, masterIzinId: "seed", startDate: date, endDate: date, status: "approved", catatan: "Izin" } }).catch(() => {});
      continue;
    }
    if (day % 10 === 0) { // late
      const lin = new Date(`${dateStr}T08:30:00+07:00`);
      const lout = new Date(`${dateStr}T17:00:00+07:00`);
      if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: lin } }))) {
        await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "seed", scanTime: lin, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
        attCount++;
      }
      if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: lout } }))) {
        await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "seed", scanTime: lout, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
        attCount++;
      }
    } else { // normal
      const s2in = new Date(`${dateStr}T07:50:00+07:00`);
      const s2out = new Date(`${dateStr}T17:10:00+07:00`);
      if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: s2in } }))) {
        await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "seed", scanTime: s2in, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
        attCount++;
      }
      if (!(await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: s2out } }))) {
        await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "seed", scanTime: s2out, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
        attCount++;
      }
    }
  }

  console.log(`\n✅ Seed selesai! ${attCount} data absensi untuk ${emp1.name} & ${emp2.name} bulan ${month}/${year}.`);
  console.log(`   Buka Laporan Detail atau Laporan Kehadiran untuk lihat hasil.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
