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

    // Ajustar tamaño de fuente según número de columnas
    const numColumns = columns.length;
    let defaultFontSize = 8;
    if (numColumns >= 10) {
      defaultFontSize = 6;
    } else if (numColumns >= 8) {
      defaultFontSize = 7;
    }

    const config = {
      title: options.title || 'Reporte',
      orientation: options.orientation || 'landscape',
      filename: options.filename || 'reporte',
      fontSize: options.fontSize || defaultFontSize,
      autoColumnWidth: options.autoColumnWidth ?? false
    };

    const doc = new jsPDF(config.orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(config.title, 10, 10);

    // Fecha
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 10, 15);

    const bodyData = data.map(item =>
      columns.map(col => item[col.dataKey] ?? '')
    );

    const headers = columns.map(col => col.header);

    // Calcular ancho disponible para la tabla
    const marginLeft = 5;
    const marginRight = 5;
    const availableWidth = pageWidth - marginLeft - marginRight;

    // Configurar estilos de columnas
    const tableConfig: any = {
      startY: 19,
      head: [headers],
      body: bodyData,
      theme: 'grid',
      styles: {
        fontSize: config.fontSize,
        cellPadding: 1,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: config.fontSize,
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: marginLeft, right: marginRight },
      tableWidth: availableWidth
    };

    // Calcular anchos de columna proporcionales
    if (!config.autoColumnWidth && columns.length > 0) {
      const columnWidths = this.calcProportionalWidths(columns, data, availableWidth);
      tableConfig.columnStyles = columns.reduce((acc: any, _, idx) => {
        acc[idx] = { cellWidth: columnWidths[idx] };
        return acc;
      }, {} as any);
    }

    autoTable(doc, tableConfig);

    doc.save(`${config.filename}.pdf`);
  }

  // Calcular anchos proporcionales para que quepan todas las columnas
  private calcProportionalWidths(columns: ColumnConfig[], data: any[], availableWidth: number): number[] {
    // Calcular "peso" de cada columna basado en su contenido
    const weights = columns.map(col => {
      if (col.width) return col.width;

      let maxLen = col.header.length;
      data.slice(0, 20).forEach(item => { // Solo revisar primeras 20 filas
        const val = item[col.dataKey];
        if (val) {
          const len = String(val).length;
          if (len > maxLen) maxLen = Math.min(len, 30); // Máximo 30 caracteres
        }
      });

      // Columnas cortas (ID, Días) tienen peso mínimo
      if (maxLen <= 5) return 8;
      if (maxLen <= 10) return 15;
      if (maxLen <= 15) return 22;
      return Math.min(maxLen * 1.5, 40);
    });

    // Calcular suma total de pesos
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Distribuir el ancho disponible proporcionalmente
    return weights.map(w => (w / totalWeight) * availableWidth);
  }

  // Calcular ancho de columna basado en contenido (método original)
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