import { jsPDF } from 'jspdf';

export function crearReportePdf(titulo: string): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('PrestaYa', 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text(titulo, 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 14, 32);

  doc.setDrawColor(220, 220, 220);
  doc.line(14, 36, 196, 36);

  return doc;
}

export function agregarCampos(doc: jsPDF, campos: [string, string][], startY: number): number {
  let y = startY;
  doc.setFontSize(10);
  for (const [label, value] of campos) {
    doc.setTextColor(120, 120, 120);
    doc.text(`${label}:`, 14, y);
    doc.setTextColor(30, 30, 30);
    doc.text(value, 60, y);
    y += 7;
  }
  return y;
}
