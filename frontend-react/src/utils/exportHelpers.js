import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Consolidates the ~6 near-identical SheetJS export functions from the old admin.html.
export function exportToExcel(rows, colWidths, sheetName, filename) {
  const ws = XLSX.utils.json_to_sheet(rows)
  if (colWidths) ws['!cols'] = colWidths.map((wch) => ({ wch }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}

// Consolidates the ~4 near-identical jsPDF/autotable export functions.
export function exportToPDF({ title, totalLabel, totalCount, head, body, filename, startY }) {
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text('Generated: ' + new Date().toLocaleString('en-PK'), 14, 25)
  if (totalLabel) doc.text(`${totalLabel}: ${totalCount}`, 14, 30)

  autoTable(doc, {
    startY: startY ?? (totalLabel ? 36 : 30),
    head: [head],
    body,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [127, 156, 245], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    margin: { left: 14, right: 14 },
  })

  doc.save(filename)
}

// A real paid-fee receipt (not a stub) — student-facing, one fee record at a time.
export function generateFeeReceipt(fee, student) {
  const doc = new jsPDF()
  doc.setFontSize(20); doc.setTextColor(40)
  doc.text('SmartHostel ERP', 14, 20)
  doc.setFontSize(12); doc.setTextColor(90)
  doc.text('Fee Payment Receipt', 14, 28)

  autoTable(doc, {
    startY: 38,
    head: [['Field', 'Details']],
    body: [
      ['Student', student?.name || '—'],
      ['Roll No', student?.rollNo || '—'],
      ['Fee Type', fee.type],
      ['Billing Period', `${fee.month} ${fee.year}`],
      ['Amount Paid', `Rs ${Number(fee.amount).toLocaleString('en-PK')}`],
      ['Transaction ID', fee.transactionId || '—'],
      ['Paid On', fee.paidAt ? new Date(fee.paidAt).toLocaleDateString('en-PK') : '—'],
    ],
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fillColor: [127, 156, 245], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  })

  doc.setFontSize(9); doc.setTextColor(150)
  doc.text('This is a system-generated receipt.', 14, doc.lastAutoTable.finalY + 12)
  doc.save(`Fee_Receipt_${fee.month}_${fee.year}.pdf`)
}
