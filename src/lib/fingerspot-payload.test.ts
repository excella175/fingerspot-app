import test from "node:test";
import assert from "node:assert/strict";
import { extractAttlogRows, parseScanTime } from "./fingerspot-payload";

test("extractAttlogRows handles nested Fingerspot payloads", () => {
  const payload = {
    data: {
      result: {
        rows: [
          {
            employee_pin: "1001",
            scan_date: "2026-07-16 10:20:30",
            verify: 0,
            status_scan: 0,
          },
        ],
      },
    },
  };

  const rows = extractAttlogRows(payload);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].employee_pin, "1001");
  assert.equal(rows[0].scan_date, "2026-07-16 10:20:30");
});

test("parseScanTime handles space-separated timestamps", () => {
  const parsed = parseScanTime("2026-07-16 10:20:30");
  assert.ok(parsed);
  assert.equal(parsed?.toISOString(), "2026-07-16T03:20:30.000Z");
});
