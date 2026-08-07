// Generate ERD drawio file for Fingerspot App
// Run: node scripts/generate-erd.js

const fs = require("fs");
const path = require("path");

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "&#xa;");
}

function tableHeader(tableName, color = "#2563eb") {
  return esc(`<b style="color:#fff">${tableName}</b>`);
}

function tableRow(col, type, pk = false, fk = false) {
  let icon = "";
  if (pk) icon = "🔑 ";
  else if (fk) icon = "🔗 ";
  return esc(`${icon}${col} : ${type}`);
}

// ============ LAYOUT ============
// Devices (center top)
// ApiLogs (left mid) | WebhookLogs (center mid) | PinLists (right mid)
//                         |
//                   UserInfos (center bot)
//                         |
//                   AttendanceLogs (bot)

const tables = [
  {
    id: "devices",
    label: "Devices",
    x: 380, y: 40, w: 190,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "cloudId", type: "String (UK)" },
      { col: "name", type: "String" },
      { col: "status", type: "String" },
      { col: "timezone", type: "String" },
      { col: "lastSync", type: "DateTime?" },
    ],
  },
  {
    id: "apiLogs",
    label: "ApiLogs",
    x: 60, y: 200, w: 220,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "command", type: "String" },
      { col: "deviceCloudId", type: "String (FK)" },
      { col: "transId", type: "String?" },
      { col: "status", type: "String" },
      { col: "requestPayload", type: "Json?" },
      { col: "responsePayload", type: "Json?" },
      { col: "errorMessage", type: "String?" },
      { col: "duration", type: "Int?" },
    ],
  },
  {
    id: "webhookLogs",
    label: "WebhookLogs",
    x: 370, y: 200, w: 220,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "type", type: "String" },
      { col: "deviceCloudId", type: "String (FK)" },
      { col: "transId", type: "String?" },
      { col: "status", type: "String" },
      { col: "payload", type: "Json?" },
    ],
  },
  {
    id: "pinLists",
    label: "PinLists",
    x: 680, y: 200, w: 200,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "deviceCloudId", type: "String (FK)" },
      { col: "pin", type: "String" },
      { col: "total", type: "Int?" },
      { col: "rawPayload", type: "Json?" },
    ],
  },
  {
    id: "userInfos",
    label: "UserInfos",
    x: 650, y: 420, w: 240,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "pin", type: "String (UK)" },
      { col: "name", type: "String" },
      { col: "privilege", type: "Int" },
      { col: "finger / face / rfid / vein", type: "Int" },
      { col: "template", type: "String?" },
      { col: "facePhoto", type: "String?" },
      { col: "deviceCloudId", type: "String? (FK)" },
      { col: "rawPayload", type: "Json?" },
    ],
  },
  {
    id: "attendanceLogs",
    label: "AttendanceLogs",
    x: 620, y: 640, w: 270,
    rows: [
      { col: "id", type: "String (PK)", pk: true },
      { col: "employeePin", type: "String (FK)" },
      { col: "deviceCloudId", type: "String (FK)" },
      { col: "scanTime", type: "DateTime" },
      { col: "verifyMethod", type: "Int?" },
      { col: "statusScan", type: "Int?" },
      { col: "status", type: "String" },
      { col: "source", type: "String" },
      { col: "rawPayload", type: "Json?" },
    ],
  },
];

// ============ RELATIONSHIPS ============
// [sourceId] -> [targetId]
const edges = [
  { from: "devices", to: "apiLogs", label: "deviceCloudId" },
  { from: "devices", to: "webhookLogs", label: "deviceCloudId" },
  { from: "devices", to: "pinLists", label: "deviceCloudId" },
  { from: "pinLists", to: "userInfos", label: "pin → pin" },
  { from: "userInfos", to: "attendanceLogs", label: "employeePin" },
];

// ============ GENERATE XML ============
let cellId = 10;
const cellIds = {};

function nextId() {
  return String(cellId++);
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net">
  <diagram name="ERD-Fingerspot" id="erd-1">
    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
`;

// Create table cells
for (const t of tables) {
  const headerH = 30;
  const rowH = 22;
  const totalH = headerH + t.rows.length * rowH + 8;

  const headerId = nextId();
  cellIds[t.id + "_header"] = headerId;

  // Table header
  xml += `        <mxCell id="${headerId}" value="${tableHeader(t.label)}" style="swimlane;fontStyle=0;childLayout=stackLayout;horizontalStack=0;startSize=${headerH};fillColor=${t.label === "Devices" ? "#1e40af" : "#2563eb"};swimlaneFillColor=${t.label === "Devices" ? "#1e40af" : "#2563eb"};rounded=1;shadow=0;labelBackgroundColor=none;strokeColor=#1e3a8a;fontSize=12;fontColor=#FFFFFF;align=center;overflow=hidden;" vertex="1" parent="1">
          <mxGeometry x="${t.x}" y="${t.y}" width="${t.w}" height="${totalH}" as="geometry" />
        </mxCell>\n`;

  // Table rows
  for (let i = 0; i < t.rows.length; i++) {
    const r = t.rows[i];
    const rowId = nextId();
    cellIds[t.id + "_row_" + i] = rowId;
    const yPos = t.y + headerH + i * rowH;
    const isEven = i % 2 === 0;
    const bgColor = isEven ? "#f8fafc" : "#ffffff";
    const val = tableRow(r.col, r.type, r.pk, r.fk);
    xml += `        <mxCell id="${rowId}" value="${val}" style="text;strokeColor=#e2e8f0;fillColor=${bgColor};fontSize=11;fontColor=#334155;align=left;spacingLeft=8;overflow=hidden;rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="${headerId}">
          <mxGeometry x="0" y="${i * rowH}" width="${t.w}" height="${rowH}" as="geometry" />
        </mxCell>\n`;
  }
}

// Create relationship edges
for (const e of edges) {
  const edgeId = nextId();
  const srcTable = tables.find((t) => t.id === e.from);
  const tgtTable = tables.find((t) => t.id === e.to);
  if (!srcTable || !tgtTable) continue;

  // Source is the header cell, target is the header cell
  const srcCell = cellIds[srcTable.id + "_header"];
  const tgtCell = cellIds[tgtTable.id + "_header"];

  // Determine entry/exit points
  // Devices->ApiLogs: exit=left, entry=top
  // Devices->WebhookLogs: exit=bottom, entry=top
  // Devices->PinLists: exit=right, entry=top
  // PinLists->UserInfos: exit=bottom, entry=top
  // UserInfos->AttendanceLogs: exit=bottom, entry=top

  let exitX = 0.5, exitY = 1, entryX = 0.5, entryY = 0;
  if (e.from === "devices" && e.to === "apiLogs") {
    exitX = 0; exitY = 1; entryX = 0.5; entryY = 0;
  } else if (e.from === "devices" && e.to === "webhookLogs") {
    exitX = 0.5; exitY = 1; entryX = 0.5; entryY = 0;
  } else if (e.from === "devices" && e.to === "pinLists") {
    exitX = 1; exitY = 1; entryX = 0.5; entryY = 0;
  }

  xml += `        <mxCell id="${edgeId}" value="${esc(e.label)}" style="edgeStyle=rounded;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontSize=10;fontColor=#64748b;strokeColor=#94a3b8;strokeWidth=1;endArrow=ERmany;endFill=0;startArrow=ERone;startFill=0;exitX=${exitX};exitY=${exitY};entryX=${entryX};entryY=${entryY};" edge="1" parent="1" source="${srcCell}" target="${tgtCell}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>\n`;
}

// Close XML
xml += `      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

const outPath = path.join(__dirname, "..", "docs", "erd.drawio");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, xml, "utf8");
console.log("✅ ERD generated: docs/erd.drawio");
