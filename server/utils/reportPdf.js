import PDFDocument from "pdfkit";

const money = (value) => `RS ${Number(value || 0).toFixed(2)}`;
const number = (value) => Number(value || 0).toLocaleString();
const dateText = (value) => (value ? new Date(value).toLocaleDateString() : "—");

function safeText(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function drawHeader(doc, title, subtitle) {
  doc.fontSize(20).font("Helvetica-Bold").text(title);
  doc.moveDown(0.25);
  doc.fontSize(9).font("Helvetica").fillColor("#666666").text(subtitle);
  doc.moveDown(1);
  doc.fillColor("#111111");
}

function drawSectionTitle(doc, title) {
  if (doc.y > 700) doc.addPage();
  doc.x = doc.page.margins.left; // drawTable leaves x at the last column; reset it
  doc.moveDown(0.6);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#111111").text(title);
  doc.moveDown(0.3);
}

function drawTable(doc, headers, rows, widths) {
  const startX = 45;
  const pageWidth = 522;
  const actualWidths = widths || headers.map(() => pageWidth / headers.length);
  let y = doc.y;
  const rowHeight = 20;

  const drawRow = (values, bold = false) => {
    let x = startX;
    doc.fontSize(8).font(bold ? "Helvetica-Bold" : "Helvetica");
    values.forEach((value, index) => {
      doc.text(safeText(value), x + 4, y + 5, {
        width: actualWidths[index] - 8,
        height: rowHeight,
        ellipsis: true,
      });
      x += actualWidths[index];
    });
    doc.moveTo(startX, y + rowHeight).lineTo(startX + pageWidth, y + rowHeight).strokeColor("#dddddd").stroke();
    y += rowHeight;
    doc.y = y;
  };

  drawRow(headers, true);
  rows.forEach((row) => {
    if (y > 750) {
      doc.addPage();
      y = 45;
      doc.y = y;
      drawRow(headers, true);
    }
    drawRow(row);
  });
  doc.x = startX;
  doc.y = y;
}

export function buildAdminReport(data, options = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 45, info: { Title: "Admin Sales Report" } });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(
    doc,
    "Admin Sales & Platform Report",
    `Period: ${dateText(options.startDate)} – ${dateText(options.endDate)} | Generated: ${new Date().toLocaleString()}`
  );

  drawSectionTitle(doc, "Platform summary");
  drawTable(doc, ["Metric", "Value"], [
    ["Total sales subtotal", money(data.summary.totalSalesSubtotal)],
    ["Total order value", money(data.summary.totalOrderValue)],
    ["Platform commission", money(data.summary.totalPlatformCommission)],
    ["Orders in period", number(data.summary.totalOrders)],
    ["Paid orders", number(data.summary.paidOrders)],
    ["Total users", number(data.summary.totalUsers)],
    ["Total products", number(data.summary.totalProducts)],
    ["Total vendors", number(data.summary.totalVendors)],
  ], [350, 172]);

  drawSectionTitle(doc, "Monthly sales");
  drawTable(doc, ["Month", "Sales", "Commission", "Orders"], (data.monthly || []).map((row) => [
    row.label,
    money(row.sales),
    money(row.commission),
    number(row.orders),
  ]), [160, 125, 125, 112]);

  drawSectionTitle(doc, "Order status");
  drawTable(doc, ["Status", "Orders", "Value"], (data.orderStatus || []).map((row) => [
    row.status,
    number(row.orders),
    money(row.value),
  ]), [210, 150, 162]);

  drawSectionTitle(doc, "Top products by sales");
  drawTable(doc, ["Product", "Units", "Sales"], (data.topProducts || []).map((row) => [
    row.title,
    number(row.units),
    money(row.sales),
  ]), [300, 100, 122]);

  doc.end();
  return done;
}

export function buildVendorReport(data, options = {}) {
  const doc = new PDFDocument({ size: "A4", margin: 45, info: { Title: "Vendor Sales Report" } });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(
    doc,
    `${safeText(data.storeName) || "Vendor"} — Sales Report`,
    `Period: ${dateText(options.startDate)} – ${dateText(options.endDate)} | Generated: ${new Date().toLocaleString()}`
  );

  drawSectionTitle(doc, "Vendor summary");
  drawTable(doc, ["Metric", "Value"], [
    ["Gross sales", money(data.summary.totalSales)],
    ["Vendor earnings", money(data.summary.totalEarnings)],
    ["Platform commission", money(data.summary.totalCommissionDeducted)],
    ["Orders", number(data.summary.totalOrders)],
    ["Units sold", number(data.summary.totalUnits)],
    ["Products", number(data.summary.totalProducts)],
    ["Low-stock products", number(data.summary.lowStock)],
  ], [350, 172]);

  drawSectionTitle(doc, "Monthly sales");
  drawTable(doc, ["Month", "Sales", "Earnings", "Orders"], (data.monthly || []).map((row) => [
    row.label,
    money(row.sales),
    money(row.earnings),
    number(row.orders),
  ]), [160, 125, 125, 112]);

  drawSectionTitle(doc, "Top products");
  drawTable(doc, ["Product", "Units", "Sales"], (data.topProducts || []).map((row) => [
    row.title,
    number(row.units),
    money(row.sales),
  ]), [300, 100, 122]);

  drawSectionTitle(doc, "Order status");
  drawTable(doc, ["Status", "Orders", "Value"], (data.orderStatus || []).map((row) => [
    row.status,
    number(row.orders),
    money(row.value),
  ]), [210, 150, 162]);

  doc.end();
  return done;
}
