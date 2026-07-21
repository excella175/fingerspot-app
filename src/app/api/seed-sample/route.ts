import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function pad(n: number) { return n.toString().padStart(2, "0"); }

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. Create Aturan
    await prisma.aturan.upsert({
      where: { kode: "S-001" },
      update: {},
      create: { kode: "S-001", name: "Standar", toleransiTerlambat: 15, toleransiPulangCepat: 15, batasAbsensiMasuk: 60, batasAbsensiPulang: 60 },
    });

    // 2. Create JamKerja
    await prisma.jamKerja.upsert({
      where: { kode: "JK-001" },
      update: {},
      create: { kode: "JK-001", name: "Reguler", type: "tetap", aturanKode: "S-001", hariKerja: 5, startTime: "08:00", endTime: "17:00" },
    });

    // 3. Create 2 employees
    const emp1 = { pin: "1001", name: "Ahmad Santoso" };
    const emp2 = { pin: "1002", name: "Siti Rahma" };

    for (const emp of [emp1, emp2]) {
      await prisma.userInfo.upsert({
        where: { pin: emp.pin },
        update: { name: emp.name },
        create: { pin: emp.pin, name: emp.name, privilege: 1 },
      });
    }

    // 4. Create JadwalAuto
    const existingAuto = await prisma.jadwalAuto.findFirst({ where: { name: "Standar" } });
    let jadwalId: string;
    if (existingAuto) {
      jadwalId = existingAuto.id;
      await prisma.jadwalAutoDay.deleteMany({ where: { jadwalId } });
      await prisma.jadwalAutoEmployee.deleteMany({ where: { jadwalId } });
    }

    const auto = await prisma.jadwalAuto.upsert({
      where: existingAuto ? { id: jadwalId! } : { id: "__none__" },
      update: { name: "Standar" },
      create: { name: "Standar" },
    });
    jadwalId = auto.id;

    // Add days (Mon-Fri)
    for (let d = 1; d <= 5; d++) {
      await prisma.jadwalAutoDay.upsert({
        where: { jadwalId_dayOfWeek: { jadwalId, dayOfWeek: d } },
        update: { jamKerjaKode: "JK-001" },
        create: { jadwalId, dayOfWeek: d, jamKerjaKode: "JK-001" },
      });
    }

    // Assign employees
    for (const pin of [emp1.pin, emp2.pin]) {
      await prisma.jadwalAutoEmployee.upsert({
        where: { jadwalId_employeePin: { jadwalId, employeePin: pin } },
        update: {},
        create: { jadwalId, employeePin: pin },
      });
    }

    // 5. Create AttendanceLog for current month
    // Employee 1: Hadir every weekday, on time
    // Employee 2: Hadir most days, some late (TL), some izin (I)
    let attCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // weekend

      const dateStr = `${year}-${pad(month)}-${pad(day)}`;

      // Employee 1: On time every day
      const scanIn1 = new Date(`${dateStr}T07:55:00+07:00`);
      const scanOut1 = new Date(`${dateStr}T17:05:00+07:00`);

      const existIn1 = await prisma.attendanceLog.findFirst({ where: { employeePin: emp1.pin, scanTime: scanIn1 } });
      if (!existIn1) {
        await prisma.attendanceLog.create({ data: { employeePin: emp1.pin, deviceCloudId: "sample", scanTime: scanIn1, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
        attCount++;
      }
      const existOut1 = await prisma.attendanceLog.findFirst({ where: { employeePin: emp1.pin, scanTime: scanOut1 } });
      if (!existOut1) {
        await prisma.attendanceLog.create({ data: { employeePin: emp1.pin, deviceCloudId: "sample", scanTime: scanOut1, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
        attCount++;
      }

      // Employee 2: Varies
      if (day % 7 === 3) {
        // Alpha — no scans
        continue;
      } else if (day % 7 === 5) {
        // Izin — no scans
        await prisma.riwayatIzinCuti.create({
          data: { employeePin: emp2.pin, masterIzinId: "seed", startDate: date, endDate: date, status: "approved", catatan: "Izin sample" },
        }).catch(() => {});
        continue;
      } else if (day % 10 === 0) {
        // Late (TL) — scan at 08:30
        const lateIn = new Date(`${dateStr}T08:30:00+07:00`);
        const lateOut = new Date(`${dateStr}T17:00:00+07:00`);
        const existLateIn = await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: lateIn } });
        if (!existLateIn) {
          await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "sample", scanTime: lateIn, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
          attCount++;
        }
        const existLateOut = await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: lateOut } });
        if (!existLateOut) {
          await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "sample", scanTime: lateOut, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
          attCount++;
        }
      } else {
        // Normal
        const scanIn2 = new Date(`${dateStr}T07:50:00+07:00`);
        const scanOut2 = new Date(`${dateStr}T17:10:00+07:00`);
        const existIn2 = await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: scanIn2 } });
        if (!existIn2) {
          await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "sample", scanTime: scanIn2, verifyMethod: 1, statusScan: 0, status: "IN", source: "seed" } });
          attCount++;
        }
        const existOut2 = await prisma.attendanceLog.findFirst({ where: { employeePin: emp2.pin, scanTime: scanOut2 } });
        if (!existOut2) {
          await prisma.attendanceLog.create({ data: { employeePin: emp2.pin, deviceCloudId: "sample", scanTime: scanOut2, verifyMethod: 1, statusScan: 1, status: "OUT", source: "seed" } });
          attCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sample data berhasil dibuat! ${attCount} data absensi untuk ${emp1.name} & ${emp2.name} untuk bulan ${month}/${year}.`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
