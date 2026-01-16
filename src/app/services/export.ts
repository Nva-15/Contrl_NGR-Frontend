import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDate } from '@angular/common';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  // Exportar a Excel usando SheetJS
  exportToExcel(data: any[], filename: string = 'reporte', sheetName: string = 'Datos'): void {
    try {
      // Convertir datos a worksheet
      const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
      
      // Crear workbook
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generar Excel
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Guardar archivo
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, `${filename}_${this.getFechaActual()}.xlsx`);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
    }
  }

  // Exportar a PDF usando jsPDF
  exportToPDF(
    data: any[], 
    columns: { header: string, dataKey: string, width?: number }[], 
    title: string, 
    filename: string = 'reporte',
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): void {
    try {
      const doc = new jsPDF(orientation, 'mm', 'a4');
      
      // Título
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text(title, 14, 20);
      
      // Fecha de generación
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${this.getFechaHoraActual()}`, 14, 30);
      
      // Preparar datos para la tabla
      const tableData = data.map(row => columns.map(col => row[col.dataKey] || ''));
      
      // Configurar tabla
      (doc as any).autoTable({
        startY: 40,
        head: [columns.map(col => col.header)],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: columns.reduce((acc, col, index) => {
          if (col.width) {
            acc[index] = { cellWidth: col.width };
          }
          return acc;
        }, {} as any),
        margin: { top: 40 }
      });
      
      // Guardar PDF
      doc.save(`${filename}_${this.getFechaActual()}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    }
  }

  // Exportar a JSON
  exportToJSON(data: any[], filename: string = 'reporte'): void {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      saveAs(blob, `${filename}_${this.getFechaActual()}.json`);
    } catch (error) {
      console.error('Error al exportar JSON:', error);
    }
  }

  // Exportar a CSV
  exportToCSV(data: any[], filename: string = 'reporte'): void {
    try {
      if (data.length === 0) return;
      
      // Obtener headers
      const headers = Object.keys(data[0]);
      
      // Convertir datos a CSV
      const csvRows = [
        headers.join(','), // Encabezados
        ...data.map(row => 
          headers.map(header => {
            const cell = row[header];
            return typeof cell === 'string' && cell.includes(',') 
              ? `"${cell}"` 
              : cell;
          }).join(',')
        )
      ];
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${filename}_${this.getFechaActual()}.csv`);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
    }
  }

  // Métodos auxiliares
  private getFechaActual(): string {
    return formatDate(new Date(), 'yyyy-MM-dd', 'en-US');
  }

  private getFechaHoraActual(): string {
    return formatDate(new Date(), 'dd/MM/yyyy HH:mm', 'en-US');
  }

  // Formatear texto
  capitalize(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Limitar texto largo
  truncateText(text: string, maxLength: number = 50): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}