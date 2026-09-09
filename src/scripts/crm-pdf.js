import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function pdfText(value) {
  return String(value ?? '')
    .replace(/₹/g, 'INR ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2022]/g, '-')
    .replace(/[^\x20-\x7E\n]/g, '');
}

export function buildCrmReportPdf({ report, from, to, companyName = 'TechMigos' }) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const generatedAt = new Date().toLocaleString('en-IN');
  const title = pdfText(report.title || 'CRM report');
  const metrics = (report.metrics || []).map(([label, value]) => `${pdfText(label)}: ${pdfText(value)}`).join('   |   ');
  document.setFillColor(15, 118, 110);
  document.rect(0, 0, 842, 66, 'F');
  document.setTextColor(255, 255, 255);
  document.setFont('helvetica', 'bold');
  document.setFontSize(20);
  document.text(title, 42, 37);
  document.setFontSize(9);
  document.text(`${pdfText(companyName).toUpperCase()} CRM - INTERNAL`, 800, 37, { align: 'right' });
  document.setTextColor(30, 41, 59);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(pdfText(report.subtitle || 'Live CRM report'), 42, 91);
  document.setTextColor(71, 85, 105);
  document.setFontSize(8);
  document.text(`Period: ${pdfText(from)} to ${pdfText(to)}  |  Generated: ${pdfText(generatedAt)}`, 42, 110);
  document.text(metrics || 'No metrics available for this report.', 42, 128, { maxWidth: 758 });
  autoTable(document, {
    startY: 150,
    head: [report.columns.map(([, label]) => pdfText(label))],
    body: report.rows.map((row) => report.columns.map(([key]) => pdfText(row[key] ?? '-'))),
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: [30, 41, 59], fontSize: 8, cellPadding: 5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 42, right: 42, bottom: 38 },
    didDrawPage: () => {
      document.setFontSize(7);
      document.setTextColor(100, 116, 139);
      document.text(`${pdfText(companyName)} - Confidential`, 42, 574);
      document.text(`Page ${document.getNumberOfPages()}`, 800, 574, { align: 'right' });
    },
  });
  const fileName = `techmigos-${String(report.key || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${from}-to-${to}.pdf`;
  return { document, fileName };
}

export function downloadCrmReportPdf(options) {
  const { document, fileName } = buildCrmReportPdf(options);
  document.save(fileName);
  return fileName;
}
