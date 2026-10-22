import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportarExcel(data: any[], nombre: string, hoja = 'Datos'): void {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, `${nombre}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportarPDF(columnas: string[], filas: any[][], titulo: string, nombre: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(titulo, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 14, 22);
  autoTable(doc, {
    head: [columnas],
    body: filas,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] }
  });
  doc.save(`${nombre}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
