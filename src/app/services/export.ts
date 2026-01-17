import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

interface ColumnConfig {
  header: string;
  dataKey: string;
  width?: number;
}

interface ExportOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  filename?: string;
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  // Exportar datos a Excel
  exportToExcel(data: any[], fileName: string, sheetName: string = 'Datos'): void {
    if (!data.length) {
      alert('No hay datos para exportar');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { [sheetName]: worksheet }, SheetNames: [sheetName] };
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    saveAs(blob, `${fileName}.xlsx`);
  }
  // Exportar datos a PDF
  exportToPDF(data: any[], columns: ColumnConfig[], options: ExportOptions = {}): void {
    if (!data.length) {
      alert('No hay datos para exportar');
      return;
    }

    const config = {
      title: options.title || 'Reporte',
      orientation: options.orientation || 'landscape',
      filename: options.filename || 'reporte'
    };

    const doc = new jsPDF(config.orientation, 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(config.title, 14, 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    const bodyData = data.map(item => 
      columns.map(col => item[col.dataKey] ?? '')
    );

    const headers = columns.map(col => col.header);
    const columnWidths = columns.map(col => col.width || this.calcWidth(col.header, data, col.dataKey));

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: columns.reduce((acc, _, idx) => {
        acc[idx] = { cellWidth: columnWidths[idx] };
        return acc;
      }, {} as any),
      margin: { horizontal: 14 }
    });

    doc.save(`${config.filename}.pdf`);
  }
  // Calcular ancho de columna basado en contenido
  private calcWidth(header: string, data: any[], dataKey: string): number {
    let maxLen = header.length;
    data.forEach(item => {
      const val = item[dataKey];
      if (val && String(val).length > maxLen) {
        maxLen = String(val).length;
      }
    });
    return Math.min(Math.max(maxLen * 2, 15), 60);
  }
}