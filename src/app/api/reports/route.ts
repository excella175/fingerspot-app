import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateStrFromDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayNameFromDate(date: Date) {
  return ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][date.getDay()];
}

function isWeekendFromDate(date: Date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function dateRangeFromParams(searchParams: URLSearchParams): { dates: Date[]; dateStrs: string[]; from: string; to: string; isMonth: boolean; month: number; year: number } {
  const f = searchParams.get("from");
  const t = searchParams.get("to");
  if (f && t) {
    const start = new Date(f + "T00:00:00+07:00");
    const end = new Date(t + "T00:00:00+07:00");
    const dates: Date[] = [];
    const dateStrs: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
      dateStrs.push(dateStrFromDate(d));
    }
    return { dates, dateStrs, from: f, to: t, isMonth: false, month: 0, year: 0 };
  }
  const month = parseInt(searchParams.get("month") || "");
  const year = parseInt(searchParams.get("year") || "");
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  const totalDays = new Date(y, m, 0).getDate();
  const dates: Date[] = [];
  const dateStrs: string[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(y, m - 1, day);
    dates.push(d);
    dateStrs.push(`${y}-${pad(m)}-${pad(day)}`);
  }
  return { dates, dateStrs, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(totalDays)}`, isMonth: true, month: m, year: y };
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

function localMin(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function employeeWhere(searchParams: URLSearchParams) {
  const where: any = {};
  const pin = searchParams.get("employeePin") || searchParams.get("pin") || "";
  const name = searchParams.get("name") || "";
  const kantorId = searchParams.get("kantorId") || "";
  const jabatanId = searchParams.get("jabatanId") || "";
  if (pin) where.pin = pin;
  if (name) where.name = { contains: name, mode: "insensitive" };
  if (kantorId) where.kantorId = kantorId;
  if (jabatanId) where.jabatanId = jabatanId;
  return where;
}

const employeeSelect = {
  pin: true,
  name: true,
  kantor: { select: { nama: true } },
  jabatan: { select: { nama: true } },
} as const;

interface ScheduleInfo {
  jamKerjaKode: string;
  startTime?: string;
  endTime?: string;
}

// Batch-fetch schedules (manual + auto) for many employees over a date range.
async function buildScheduleIndex(pins: string[], dates: Date[]): Promise<(pin: string, date: Date) => ScheduleInfo | null> {
  const start = dates[0];
  const end = dates[dates.length - 1];

  const manual = await prisma.jadwalManual.findMany({
    where: { employeePin: { in: pins }, date: { gte: start, lte: end } },
  });
  const manualMap: Record<string, Record<string, ScheduleInfo>> = {};
  for (const m of manual) {
    const k = dateStrFromDate(m.date);
    if (!manualMap[m.employeePin]) manualMap[m.employeePin] = {};
    manualMap[m.employeePin][k] = {
      jamKerjaKode: m.jamKerjaKode,
      startTime: m.startTime || undefined,
      endTime: m.endTime || undefined,
    };
  }

  const autoEmp = await prisma.jadwalAutoEmployee.findMany({
    where: { employeePin: { in: pins } },
    include: { jadwal: { include: { days: true } } },
  });
  const autoMap: Record<string, Record<number, string>> = {};
  for (const ae of autoEmp) {
    const days: Record<number, string> = {};
    for (const d of ae.jadwal.days) days[d.dayOfWeek] = d.jamKerjaKode;
    autoMap[ae.employeePin] = days;
  }

  return (pin: string, date: Date) => {
    const ds = dateStrFromDate(date);
    if (manualMap[pin] && manualMap[pin][ds]) return manualMap[pin][ds];
    const dayCode = autoMap[pin] && autoMap[pin][date.getDay()];
    return dayCode ? { jamKerjaKode: dayCode } : null;
  };
}

async function handleDetail(searchParams: URLSearchParams) {
  const { dates, dateStrs, from, to, isMonth, month, year } = dateRangeFromParams(searchParams);
  const employeePin = searchParams.get("employeePin") || "";

  const employees = employeePin
    ? [{ pin: employeePin }]
    : await prisma.userInfo.findMany({ where: employeeWhere(searchParams), select: employeeSelect });

  const pins = employees.map((e) => e.pin);

  // 1) Employee name/kantor/jabatan — ONE query
  const empRows = await prisma.userInfo.findMany({
    where: { pin: { in: pins } },
    select: { pin: true, name: true, kantor: { select: { nama: true } }, jabatan: { select: { nama: true } } },
  });
  const empMap = new Map(empRows.map((e) => [e.pin, e]));

  const rangeStart = new Date(`${dateStrs[0]}T00:00:00+07:00`);
  const rangeEnd = new Date(`${dateStrs[dateStrs.length - 1]}T23:59:59+07:00`);

  // 2) Approved leaves in range — ONE query
  const leaves = await prisma.riwayatIzinCuti.findMany({
    where: { employeePin: { in: pins }, status: "approved", startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
  });
  const leavesByPin: Record<string, typeof leaves> = {};
  for (const l of leaves) {
    if (!leavesByPin[l.employeePin]) leavesByPin[l.employeePin] = [];
    leavesByPin[l.employeePin].push(l);
  }

  // 3) Master izin — ONE query
  const masterIds = [...new Set(leaves.map((l) => l.masterIzinId))];
  const masters = masterIds.length ? await prisma.masterIzinCuti.findMany({ where: { id: { in: masterIds } } }) : [];
  const masterMap = new Map(masters.map((m) => [m.id, m]));

  // 4) Schedules — batched
  const scheduleFor = await buildScheduleIndex(pins, dates);

  // 5) Jam kerja + aturan kodes — pre-collect, then batch queries
  const jkCodes = new Set<string>();
  for (const emp of employees) {
    for (const date of dates) {
      const s = scheduleFor(emp.pin, date);
      if (s?.jamKerjaKode) jkCodes.add(s.jamKerjaKode);
    }
  }
  const jamKerjas = jkCodes.size ? await prisma.jamKerja.findMany({ where: { kode: { in: [...jkCodes] } } }) : [];
  const jkMap = new Map(jamKerjas.map((j) => [j.kode, j]));
  const aturanCodes = new Set<string>();
  for (const j of jamKerjas) if (j.aturanKode) aturanCodes.add(j.aturanKode);
  const aturans = aturanCodes.size ? await prisma.aturan.findMany({ where: { kode: { in: [...aturanCodes] } } }) : [];
  const aturanMap = new Map(aturans.map((a) => [a.kode, a]));

  const result: any[] = [];

  for (const emp of employees) {
    const info = empMap.get(emp.pin);
    const empName = info?.name || emp.pin;
    const empKantor = (emp as any).kantor?.nama || info?.kantor?.nama || "";
    const empJabatan = (emp as any).jabatan?.nama || info?.jabatan?.nama || "";

    // 6) Scans for the whole range — ONE query per employee
    const scans = await prisma.attendanceLog.findMany({
      where: { employeePin: emp.pin, scanTime: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { scanTime: "asc" },
    });
    const scansByDate: Record<string, typeof scans> = {};
    for (const s of scans) {
      const k = dateStrFromDate(s.scanTime);
      if (!scansByDate[k]) scansByDate[k] = [];
      scansByDate[k].push(s);
    }

    const empLeaves = leavesByPin[emp.pin] || [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateStr = dateStrs[i];

      // Leave/Izin check (in-memory)
      const leave = empLeaves.find((l) => l.startDate <= date && l.endDate >= date);

      if (leave) {
        const master = masterMap.get(leave.masterIzinId);
        const statusCode = master?.statusAbsensi || "I";
        result.push({ employeePin: emp.pin, employeeName: empName, employeeKantor: empKantor, employeeJabatan: empJabatan, date: dateStr, dayName: dayNameFromDate(date), status: statusCode, scanIn: null, scanOut: null, scheduledStart: null, scheduledEnd: null, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, workDurationMinutes: null, istirahatMinutes: null, overtimeStartMinutes: null, overtimeEndMinutes: null, note: master?.nama || "Izin" });
        continue;
      }

      if (isWeekendFromDate(date)) {
        result.push({ employeePin: emp.pin, employeeName: empName, employeeKantor: empKantor, employeeJabatan: empJabatan, date: dateStr, dayName: dayNameFromDate(date), status: "L", scanIn: null, scanOut: null, scheduledStart: null, scheduledEnd: null, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, workDurationMinutes: null, istirahatMinutes: null, overtimeStartMinutes: null, overtimeEndMinutes: null, note: "Libur" });
        continue;
      }

      // Get schedule
      const sched = scheduleFor(emp.pin, date);
      const jamKerja = sched?.jamKerjaKode ? jkMap.get(sched.jamKerjaKode) || null : null;

      const scheduledStart = sched?.startTime || jamKerja?.startTime || null;
      const scheduledEnd = sched?.endTime || jamKerja?.endTime || null;

      const dayScans = scansByDate[dateStr];

      if (!dayScans || dayScans.length === 0) {
        result.push({ employeePin: emp.pin, employeeName: empName, employeeKantor: empKantor, employeeJabatan: empJabatan, date: dateStr, dayName: dayNameFromDate(date), status: "A", scanIn: null, scanOut: null, scheduledStart, scheduledEnd, lateMinutes: null, earlyLeaveMinutes: null, overtimeMinutes: null, workDurationMinutes: null, istirahatMinutes: null, overtimeStartMinutes: null, overtimeEndMinutes: null, note: "Alpha" });
        continue;
      }

      const firstScan = dayScans[0].scanTime;
      const lastScan = dayScans[dayScans.length - 1].scanTime;

      let status = "H";
      let lateMinutes: number | null = null;
      let earlyLeaveMinutes: number | null = null;
      let overtimeMinutes: number | null = null;
      let note = "";

      if (scheduledStart) {
        const schedStartMin = toMinutes(scheduledStart);
        const localHours = firstScan.getHours();
        const localMinutes = firstScan.getMinutes();
        const scanInLocalMin = localHours * 60 + localMinutes;
        const diffLate = scanInLocalMin - schedStartMin;

        let tolerance = 0;
        if (jamKerja?.aturanKode) {
          const aturan = aturanMap.get(jamKerja.aturanKode);
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
          const aturan = aturanMap.get(jamKerja.aturanKode);
          tolerance = aturan?.toleransiPulangCepat || 0;
        }

        if (diffEarly > tolerance && !lateMinutes) {
          earlyLeaveMinutes = diffEarly;
          if (status === "H") { status = "PL"; note = `Pulang Cepat ${minutesToStr(diffEarly)}`; }
          else note += `, Pulang Cepat ${minutesToStr(diffEarly)}`;
        }
      }

      const schedStartMin = scheduledStart ? toMinutes(scheduledStart) : null;
      const schedEndMin = scheduledEnd ? toMinutes(scheduledEnd) : null;
      const workDurationMinutes = schedStartMin != null && schedEndMin != null ? Math.max(0, schedEndMin - schedStartMin) : null;
      let istirahatMinutes = 0;
      if (jamKerja?.istirahatAktif && jamKerja.istirahatStart && jamKerja.istirahatEnd) {
        istirahatMinutes = Math.max(0, toMinutes(jamKerja.istirahatEnd) - toMinutes(jamKerja.istirahatStart));
      }

      // Overtime (split awal/akhir)
      let overtimeStartMinutes = 0;
      let overtimeEndMinutes = 0;
      if (jamKerja?.lemburAktif) {
        const scanInMin = localMin(firstScan);
        const scanOutMin = localMin(lastScan);
        if (schedStartMin != null && scanInMin < schedStartMin) overtimeStartMinutes = schedStartMin - scanInMin;
        if (schedEndMin != null && scanOutMin > schedEndMin) overtimeEndMinutes = scanOutMin - schedEndMin;
        overtimeMinutes = overtimeStartMinutes + overtimeEndMinutes;
        if (overtimeMinutes > 0) note += `${note ? ", " : ""}Lembur ${minutesToStr(overtimeMinutes)}`;
      }

      result.push({
        employeePin: emp.pin,
        employeeName: empName,
        employeeKantor: empKantor,
        employeeJabatan: empJabatan,
        date: dateStr,
        dayName: dayNameFromDate(date),
        status,
        scanIn: firstScan.toISOString(),
        scanOut: lastScan.toISOString(),
        scheduledStart,
        scheduledEnd,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        workDurationMinutes,
        istirahatMinutes,
        overtimeStartMinutes,
        overtimeEndMinutes,
        note,
      });
    }
  }

  return NextResponse.json({ success: true, report: result, totalDays: dates.length });
}

async function handleAttendance(searchParams: URLSearchParams) {
  const { dates, dateStrs, from, to, isMonth, month, year } = dateRangeFromParams(searchParams);

  const employees = await prisma.userInfo.findMany({
    where: employeeWhere(searchParams),
    select: employeeSelect,
    orderBy: { name: "asc" },
  });

  const pins = employees.map((e) => e.pin);
  const rangeStart = new Date(`${dateStrs[0]}T00:00:00+07:00`);
  const rangeEnd = new Date(`${dateStrs[dateStrs.length - 1]}T23:59:59+07:00`);

  // Leaves — ONE query
  const leaves = await prisma.riwayatIzinCuti.findMany({
    where: { employeePin: { in: pins }, status: "approved", startDate: { lte: rangeEnd }, endDate: { gte: rangeStart } },
  });
  const leavesByPin: Record<string, typeof leaves> = {};
  for (const l of leaves) {
    if (!leavesByPin[l.employeePin]) leavesByPin[l.employeePin] = [];
    leavesByPin[l.employeePin].push(l);
  }

  const masterIds = [...new Set(leaves.map((l) => l.masterIzinId))];
  const masters = masterIds.length ? await prisma.masterIzinCuti.findMany({ where: { id: { in: masterIds } } }) : [];
  const masterMap = new Map(masters.map((m) => [m.id, m]));

  const scheduleFor = await buildScheduleIndex(pins, dates);

  const jkCodes = new Set<string>();
  for (const emp of employees) {
    for (const date of dates) {
      const s = scheduleFor(emp.pin, date);
      if (s?.jamKerjaKode) jkCodes.add(s.jamKerjaKode);
    }
  }
  const jamKerjas = jkCodes.size ? await prisma.jamKerja.findMany({ where: { kode: { in: [...jkCodes] } } }) : [];
  const jkMap = new Map(jamKerjas.map((j) => [j.kode, j]));
  const aturanCodes = new Set<string>();
  for (const j of jamKerjas) if (j.aturanKode) aturanCodes.add(j.aturanKode);
  const aturans = aturanCodes.size ? await prisma.aturan.findMany({ where: { kode: { in: [...aturanCodes] } } }) : [];
  const aturanMap = new Map(aturans.map((a) => [a.kode, a]));

  const report: any[] = [];

  for (const emp of employees) {
    const days: any[] = [];
    const totals: Record<string, number> = { H: 0, A: 0, I: 0, S: 0, C: 0, D: 0, TL: 0, PL: 0, L: 0 };

    // Scans — ONE query per employee
    const scans = await prisma.attendanceLog.findMany({
      where: { employeePin: emp.pin, scanTime: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { scanTime: "asc" },
    });
    const scansByDate: Record<string, typeof scans> = {};
    for (const s of scans) {
      const k = dateStrFromDate(s.scanTime);
      if (!scansByDate[k]) scansByDate[k] = [];
      scansByDate[k].push(s);
    }

    const empLeaves = leavesByPin[emp.pin] || [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateStr = dateStrs[i];

      let status = "H";
      let note = "";
      let lateM = 0;

      if (isWeekendFromDate(date)) {
        status = "L";
      } else {
        const leave = empLeaves.find((l) => l.startDate <= date && l.endDate >= date);
        if (leave) {
          const master = masterMap.get(leave.masterIzinId);
          status = master?.statusAbsensi || "I";
        } else {
          const dayScans = scansByDate[dateStr];
          if (!dayScans || dayScans.length === 0) {
            status = "A";
          } else {
            const sched = scheduleFor(emp.pin, date);
            const jamKerja = sched?.jamKerjaKode ? jkMap.get(sched.jamKerjaKode) || null : null;
            if (jamKerja?.startTime) {
              const firstScan = dayScans[0].scanTime;
              const scanInMin = firstScan.getHours() * 60 + firstScan.getMinutes();
              const schedMin = toMinutes(jamKerja.startTime);
              let tolerance = 0;
              if (jamKerja.aturanKode) {
                const aturan = aturanMap.get(jamKerja.aturanKode);
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
      totals[status] = (totals[status] || 0) + 1;
      days.push({ date: dateStr, day: date.getDate(), status, lateMinutes: lateM, note });
    }

    report.push({
      pin: emp.pin,
      name: emp.name,
      kantor: (emp as any).kantor?.nama || "",
      jabatan: (emp as any).jabatan?.nama || "",
      days,
      totals: { ...totals, total: dates.length },
    });
  }

  return NextResponse.json({ success: true, report, totalDays: dates.length });
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
