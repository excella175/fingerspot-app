export function parseScanTime(scanDate: unknown): Date | null {
  if (scanDate == null) return null;

  try {
    const scanStr = String(scanDate).trim();
    if (!scanStr) return null;

    const normalized = scanStr.includes("T")
      ? scanStr
      : scanStr.replace(" ", "T");
    const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(scanStr);

    if (/^\d+$/.test(scanStr)) {
      const n = Number(scanStr);
      return new Date(n < 1e12 ? n * 1000 : n);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(scanStr)) {
      return new Date(`${scanStr}T00:00:00+07:00`);
    }

    const dt = hasTz ? new Date(normalized) : new Date(`${normalized}+07:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

export function extractAttlogRows(
  payload: unknown,
): Array<Record<string, any>> {
  const rows = Array.isArray(payload)
    ? payload.filter(
        (item): item is Record<string, any> =>
          typeof item === "object" && item !== null,
      )
    : [];

  if (rows.length > 0) return rows;

  if (typeof payload !== "object" || payload === null) return [];

  const record = payload as Record<string, any>;

  const directKeys = [
    "pin",
    "employee_pin",
    "employeePin",
    "scan",
    "scan_time",
    "scanTime",
    "scan_date",
    "scanDate",
  ];
  if (directKeys.some((key) => key in record)) {
    return [record];
  }

  for (const key of [
    "data",
    "result",
    "response",
    "rows",
    "list",
    "userinfo",
    "user",
    "users",
  ]) {
    if (key in record) {
      const nested = extractAttlogRows(record[key]);
      if (nested.length > 0) return nested;
    }
  }

  return [];
}

export function extractPinArray(payload: unknown): string[] {
  if (Array.isArray(payload)) return payload.map(String);
  if (typeof payload !== "object" || payload === null) return [];

  const record = payload as Record<string, any>;
  // common keys
  for (const key of [
    "pin_arr",
    "pinArr",
    "pins",
    "users",
    "list",
    "data",
    "rows",
  ]) {
    if (key in record) {
      const nested = extractPinArray(record[key]);
      if (nested.length) return nested;
    }
  }

  // if object maps pin->info, collect keys
  const possible = Object.values(record).filter(
    (v) => typeof v === "string" || typeof v === "number",
  );
  if (possible.length && Object.keys(record).length <= 100) {
    // try collect values that look like pins
    const vals = Object.values(record)
      .filter((v) => typeof v === "string" || typeof v === "number")
      .map(String);
    if (vals.length) return vals;
  }

  return [];
}
