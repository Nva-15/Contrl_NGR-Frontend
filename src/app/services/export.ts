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
  fontSize?: number;
  autoColumnWidth?: boolean;
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
      filename: options.filename || 'reporte',
      fontSize: options.fontSize || 8,
      autoColumnWidth: options.autoColumnWidth ?? false
    };

    const doc = new jsPDF(config.orientation, 'mm', 'a4');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(config.title, 10, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 10, 18);

    const bodyData = data.map(item =>
      columns.map(col => item[col.dataKey] ?? '')
    );

    const headers = columns.map(col => col.header);

    // Configurar estilos de columnas
    const tableConfig: any = {
      startY: 23,
      head: [headers],
      body: bodyData,
      theme: 'grid',
      styles: { fontSize: config.fontSize, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: config.fontSize },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto'
    };

    // Si no es auto, calcular anchos manuales
    if (!config.autoColumnWidth) {
      const columnWidths = columns.map(col => col.width || this.calcWidth(col.header, data, col.dataKey));
      tableConfig.columnStyles = columns.reduce((acc: any, _, idx) => {
        acc[idx] = { cellWidth: columnWidths[idx] };
        return acc;
      }, {} as any);
    }

    autoTable(doc, tableConfig);

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