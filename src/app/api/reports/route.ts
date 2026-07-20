import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dayName(year: number, month: number, day: number) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][new Date(year, month - 1, day).getDay()];
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 || d === 6;
}

function toMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

function minutesToStr(m: number): string {
  const h = Math.floor(Math.abs(m) / 60);
  const min = Math.abs(m) % 60;
  return `${m < 0 ? "-" : ""}${h}h ${min}m`;
}

async function getScheduleForEmployee(pin: string, date: Date, dayOfWeek: number): Promise<{ jamKerjaKode: string; startTime?: string; endTime?: string } | null> {
  // 1. Check manual schedule first
  const manual = await prisma.jadwalManual.findUnique({
    where: { employeePin_date: { employeePin: pin, date } },
  });
  if (manual) return { jamKerjaKode: manual.jamKerjaKode, startTime: manual.startTime || undefined, endTime: manual.endTime || undefined };

  // 2. Check auto schedule
  const autoEmp = await prisma.jadwalAutoEmployee.findFirst({
    where: { employeePin: pin },
    include: {
      jadwal: {
        include: { days: true },
      },
    },
  });
  if (autoEmp) {
    const day = autoEmp.jadwal.days.find((d: { dayOfWeek: number; jamKerjaKode: string }) => d.dayOfWeek === dayOfWeek);
    if (day && day.jamKerjaKode) return { jamKerjaKode: day.jamKerjaKode };
  }
  return null;
}

async function handleDetail(searchParams: URLSearchParams) {
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");
  const employeePin = searchParams.get("employeePin") || "";
  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ success: false, error: "month (1-12) dan year wajib" }, { status: 400 });
  }

  const employees = employeePin
    ? [{ pin: employeePin }]
    : await prisma.userInfo.findMany({ select: { pin: true, name: true } });

  const totalDays = getDaysInMonth(year, month);
  const result: any[] = [];

  for (const emp of employees) {
    const empData = await prisma.userInfo.findUnique({ where: { pin: emp.pin }, select: { name: true } });
    const empName = empData?.name || emp.pin;

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay();
      const dateStr = `${year}-${pad(month)}-${pad(day)}`;

      // Leave/Izin check
      const leave = await prisma.riwayatIzinCuti.findFirst({
        where: {
          employeePin: emp.pin,
          status: "approved",
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });

      if (leave) {
        const master = await prisma.masterIzinCuti.findUnique({ where: { id: leave.masterIzinId } });
        const statusCode = master?.statusAbsensi || "I";
        result.push({ employeePin: emp.pin, employeeName: empName, date: dateStr, dayName: dayName(year, month, day), status: statusCode, scanIn: null, scanOut: null, scheduledStart: null, scheduledEnd: null, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, note: master?.nama || "Izin" });
        continue;
      }

      if (isWeekend(year, month, day)) {
        result.push({ employeePin: emp.pin, employeeName: empName, date: dateStr, dayName: dayName(year, month, day), status: "L", scanIn: null, scanOut: null, scheduledStart: null, scheduledEnd: null, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, note: "Libur" });
        continue;
      }

      // Get schedule
      const sched = await getScheduleForEmployee(emp.pin, date, dow);
      const jamKerja = sched?.jamKerjaKode
        ? await prisma.jamKerja.findUnique({ where: { kode: sched.jamKerjaKode } })
        : null;

      const scheduledStart = sched?.startTime || jamKerja?.startTime || null;
      const scheduledEnd = sched?.endTime || jamKerja?.endTime || null;

      // Get scans
      const scans = await prisma.attendanceLog.findMany({
        where: {
          employeePin: emp.pin,
          scanTime: {
            gte: new Date(`${dateStr}T00:00:00+07:00`),
            lte: new Date(`${dateStr}T23:59:59+07:00`),
          },
        },
        orderBy: { scanTime: "asc" },
      });

      if (scans.length === 0) {
        result.push({ employeePin: emp.pin, employeeName: empName, date: dateStr, dayName: dayName(year, month, day), status: "A", scanIn: null, scanOut: null, scheduledStart, scheduledEnd, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, note: "Alpha" });
        continue;
      }

      const firstScan = scans[0].scanTime;
      const lastScan = scans[scans.length - 1].scanTime;

      let status = "H";
      let lateMinutes: number | null = null;
      let earlyLeaveMinutes: number | null = null;
      let overtimeMinutes: number | null = null;
      let note = "";

      if (scheduledStart) {
        const schedStartMin = toMinutes(scheduledStart);
        const scanInMin = firstScan.getUTCHours() * 60 + firstScan.getUTCMinutes() + firstScan.getTimezoneOffset() + 420; // +07:00 offset
        // Adjust for timezone
        const localHours = firstScan.getHours();
        const localMinutes = firstScan.getMinutes();
        const scanInLocalMin = localHours * 60 + localMinutes;
        const diffLate = scanInLocalMin - schedStartMin;

        // Get aturan tolerance
        let tolerance = 0;
        if (jamKerja?.aturanKode) {
          const aturan = await prisma.aturan.findUnique({ where: { kode: jamKerja.aturanKode } });
          tolerance = aturan?.toleransiTerlambat || 0;
        }

        if (diffLate > tolerance) {
          lateMinutes = diffLate;
          status = "TL";
          note = `Terlambat ${minutesToStr(diffLate)}`;
        }
      }

      if (scheduledEnd) {
        const schedEndMin = toMinutes(scheduledEnd);
        const scanOutLocalMin = lastScan.getHours() * 60 + lastScan.getMinutes();
        const diffEarly = schedEndMin - scanOutLocalMin;

        let tolerance = 0;
        if (jamKerja?.aturanKode) {
          const aturan = await prisma.aturan.findUnique({ where: { kode: jamKerja.aturanKode } });
          tolerance = aturan?.toleransiPulangCepat || 0;
        }

        if (diffEarly > tolerance && !lateMinutes) {
          earlyLeaveMinutes = diffEarly;
          if (status === "H") { status = "PL"; note = `Pulang Cepat ${minutesToStr(diffEarly)}`; }
          else note += `, Pulang Cepat ${minutesToStr(diffEarly)}`;
        }

        // Overtime
        if (jamKerja?.lemburAktif && scheduledEnd) {
          const scanOutMin = scanOutLocalMin;
          const schedEnd = schedEndMin;
          const overtime = scanOutMin - schedEnd;
          if (overtime > 0) {
            overtimeMinutes = overtime;
            note += `${note ? ", " : ""}Lembur ${minutesToStr(overtime)}`;
          }
        }
      }

      result.push({
        employeePin: emp.pin,
        employeeName: empName,
        date: dateStr,
        dayName: dayName(year, month, day),
        status,
        scanIn: firstScan.toISOString(),
        scanOut: lastScan.toISOString(),
        scheduledStart,
        scheduledEnd,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        note,
      });
    }
  }

  return NextResponse.json({ success: true, report: result, totalDays });
}

async function handleAttendance(searchParams: URLSearchParams) {
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");
  if (!month || !year || month < 1 || month > 12) {
    return NextResponse.json({ success: false, error: "month (1-12) dan year wajib" }, { status: 400 });
  }

  const totalDays = getDaysInMonth(year, month);
  const employees = await prisma.userInfo.findMany({ select: { pin: true, name: true }, orderBy: { name: "asc" } });
  const report: any[] = [];

  for (const emp of employees) {
    const days: any[] = [];
    const totals: Record<string, number> = { H: 0, A: 0, I: 0, S: 0, C: 0, D: 0, TL: 0, PL: 0, L: 0 };

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay();
      const dateStr = `${year}-${pad(month)}-${pad(day)}`;

      let status = "H";
      let note = "";
      let lateM = 0;

      if (isWeekend(year, month, day)) {
        status = "L";
      } else {
        const leave = await prisma.riwayatIzinCuti.findFirst({
          where: { employeePin: emp.pin, status: "approved", startDate: { lte: date }, endDate: { gte: date } },
        });
        if (leave) {
          const master = await prisma.masterIzinCuti.findUnique({ where: { id: leave.masterIzinId } });
          status = master?.statusAbsensi || "I";
        } else {
          const scans = await prisma.attendanceLog.count({
            where: {
              employeePin: emp.pin,
              scanTime: { gte: new Date(`${dateStr}T00:00:00+07:00`), lte: new Date(`${dateStr}T23:59:59+07:00`) },
            },
          });
          if (scans === 0) {
            status = "A";
          } else {
            const sched = await getScheduleForEmployee(emp.pin, date, dow);
            const jamKerja = sched?.jamKerjaKode ? await prisma.jamKerja.findUnique({ where: { kode: sched.jamKerjaKode } }) : null;
            if (jamKerja?.startTime) {
              const firstScan = await prisma.attendanceLog.findFirst({
                where: { employeePin: emp.pin, scanTime: { gte: new Date(`${dateStr}T00:00:00+07:00`), lte: new Date(`${dateStr}T23:59:59+07:00`) } },
                orderBy: { scanTime: "asc" },
              });
              if (firstScan) {
                const scanInMin = firstScan.scanTime.getHours() * 60 + firstScan.scanTime.getMinutes();
                const schedMin = toMinutes(jamKerja.startTime);
                let tolerance = 0;
                if (jamKerja.aturanKode) {
                  const aturan = await prisma.aturan.findUnique({ where: { kode: jamKerja.aturanKode } });
                  tolerance = aturan?.toleransiTerlambat || 0;
                }
                const diff = scanInMin - schedMin;
                if (diff > tolerance) {
                  status = "TL";
                  lateM = diff;
                  note = `+${diff}mnt`;
                }
              }
            }
          }
        }
      }
      totals[status] = (totals[status] || 0) + 1;
      days.push({ date: dateStr, day, status, lateMinutes: lateM, note });
    }

    report.push({
      pin: emp.pin,
      name: emp.name,
      days,
      totals: { ...totals, total: totalDays },
    });
  }

  return NextResponse.json({ success: true, report, totalDays });
}

async function handleGenerate(searchParams: URLSearchParams) {
  const result = await handleAttendance(searchParams);
  const data = await result.json();
  if (!data.success) return result;

  for (const emp of data.report) {
    for (const day of emp.days) {
      const date = new Date(day.date + "T00:00:00+07:00");
      try {
        await prisma.attendanceReport.upsert({
          where: { employeePin_date: { employeePin: emp.pin, date } },
          update: { status: day.status },
          create: { employeePin: emp.pin, date, status: day.status },
        });
      } catch { /* skip dupes */ }
    }
  }
  return NextResponse.json({ success: true, message: "Laporan kehadiran berhasil digenerate" });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const command = searchParams.get("command") || "detail";

    switch (command) {
      case "detail": return handleDetail(searchParams);
      case "attendance": return handleAttendance(searchParams);
      case "generate": return handleGenerate(searchParams);
      default: return NextResponse.json({ success: false, error: "Unknown command" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
