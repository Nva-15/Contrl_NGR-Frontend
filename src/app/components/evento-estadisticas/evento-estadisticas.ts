import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EventosService } from '../../services/eventos';
import { ExportService } from '../../services/export';
import { NotificationService } from '../../services/notification.service';
import { ApiConfigService } from '../../services/api-config.service';
import { Evento, EstadisticasEvento, RespuestaEvento, ComentarioEvento } from '../../interfaces/evento';

@Component({
  selector: 'app-evento-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evento-estadisticas.html',
  styleUrls: ['./evento-estadisticas.css']
})
export class EventoEstadisticasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private eventosService = inject(EventosService);
  private exportService = inject(ExportService);
  private notification = inject(NotificationService);
  private apiConfig = inject(ApiConfigService);

  eventoId: number = 0;
  evento: Evento | null = null;
  estadisticas: EstadisticasEvento | null = null;
  respuestas: RespuestaEvento[] = [];
  comentarios: ComentarioEvento[] = [];

  isLoading = true;
  activeTab: 'resumen' | 'respuestas' | 'comentarios' = 'resumen';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.eventoId = parseInt(id);
      this.cargarDatos();
    } else {
      this.router.navigate(['/eventos']);
    }
  }

  cargarDatos() {
    this.isLoading = true;

    // Cargar evento
    this.eventosService.getEventoPorId(this.eventoId).subscribe({
      next: (evento) => {
        this.evento = evento;
      },
      error: (err) => {
        this.notification.error(err, 'Error al cargar evento');
        this.router.navigate(['/eventos']);
      }
    });

    // Cargar estadisticas
    this.eventosService.getEstadisticas(this.eventoId).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
      },
      error: (err) => {
        this.notification.error(err, 'Error al cargar estadisticas');
      }
    });

    // Cargar respuestas
    this.eventosService.getRespuestasEvento(this.eventoId).subscribe({
      next: (respuestas) => {
        this.respuestas = respuestas;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Cargar comentarios
    this.eventosService.getComentarios(this.eventoId).subscribe({
      next: (comentarios) => {
        this.comentarios = comentarios;
      }
    });
  }

  volver() {
    this.router.navigate(['/eventos']);
  }

  getTipoEventoLabel(tipo: string): string {
    return this.eventosService.getTipoEventoLabel(tipo);
  }

  getTipoEventoIcon(tipo: string): string {
    return this.eventosService.getTipoEventoIcon(tipo);
  }

  getTipoEventoColor(tipo: string): string {
    return this.eventosService.getTipoEventoColor(tipo);
  }

  getEstadoLabel(estado: string): string {
    return this.eventosService.getEstadoLabel(estado);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'ACTIVO': return 'success';
      case 'FINALIZADO': return 'primary';
      case 'BORRADOR': return 'secondary';
      case 'CANCELADO': return 'danger';
      default: return 'secondary';
    }
  }

  getFechaFormateada(fecha: string | undefined): string {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  getRespuestaTexto(r: RespuestaEvento): string {
    if (r.respuestaSiNo !== undefined && r.respuestaSiNo !== null) {
      return r.respuestaSiNo ? 'SI' : 'NO';
    }
    if (r.confirmacionAsistencia) {
      switch (r.confirmacionAsistencia) {
        case 'CONFIRMADO': return 'Confirmado';
        case 'NO_ASISTIRE': return 'No asistira';
        case 'PENDIENTE': return 'Pendiente';
        default: return r.confirmacionAsistencia;
      }
    }
    if (r.opcionTexto) {
      return r.opcionTexto;
    }
    return 'Visto';
  }

  getFotoUrl(foto: string | undefined): string {
    if (!foto) return 'https://ui-avatars.com/api/?name=U&background=6c757d&color=fff';
    if (foto.startsWith('http')) return foto;
    return `${this.apiConfig.baseUrl}/${foto}`;
  }

  // ==================== EXPORTACION ====================

  exportarExcel() {
    if (!this.evento || !this.estadisticas) return;

    const datos = this.prepararDatosExport();

    this.exportService.exportToExcel(
      datos,
      `Estadisticas_${this.evento.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      'Respuestas'
    );

    this.notification.success('Archivo Excel generado', 'Exportacion');
  }

  exportarPDF() {
    if (!this.evento || !this.estadisticas) return;

    const datos = this.prepararDatosExport();

    const columns = [
      { header: 'Empleado', dataKey: 'empleado', width: 25 },
      { header: 'Respuesta', dataKey: 'respuesta', width: 20 },
      { header: 'Comentario', dataKey: 'comentario', width: 30 },
      { header: 'Fecha', dataKey: 'fecha', width: 20 }
    ];

    this.exportService.exportToPDF(datos, columns, {
      title: `Estadisticas: ${this.evento.titulo}`,
      filename: `Estadisticas_${this.evento.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      orientation: 'landscape'
    });

    this.notification.success('Archivo PDF generado', 'Exportacion');
  }

  private prepararDatosExport(): any[] {
    return this.respuestas.map(r => ({
      empleado: r.empleadoNombre || 'Sin nombre',
      respuesta: this.getRespuestaTexto(r),
      comentario: r.comentario || '-',
      fecha: this.getFechaFormateada(r.fechaRespuesta)
    }));
  }

  exportarResumenPDF() {
    if (!this.evento || !this.estadisticas) return;

    const datos = this.prepararResumenExport();

    const columns = [
      { header: 'Metrica', dataKey: 'metrica', width: 40 },
      { header: 'Valor', dataKey: 'valor', width: 30 }
    ];

    this.exportService.exportToPDF(datos, columns, {
      title: `Resumen: ${this.evento.titulo}`,
      filename: `Resumen_${this.evento.titulo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      orientation: 'portrait'
    });

    this.notification.success('Resumen PDF generado', 'Exportacion');
  }

  private prepararResumenExport(): any[] {
    if (!this.estadisticas || !this.evento) return [];

    const datos: any[] = [
      { metrica: 'Titulo del Evento', valor: this.evento.titulo },
      { metrica: 'Tipo de Evento', valor: this.getTipoEventoLabel(this.evento.tipoEvento) },
      { metrica: 'Estado', valor: this.getEstadoLabel(this.evento.estado) },
      { metrica: 'Total Respuestas', valor: this.estadisticas.totalRespuestas },
      { metrica: 'Total Empleados', valor: this.estadisticas.totalEmpleados },
      { metrica: 'Porcentaje Participacion', valor: `${this.estadisticas.porcentajeParticipacion.toFixed(1)}%` }
    ];

    if (this.estadisticas.tipoEvento === 'SI_NO') {
      datos.push({ metrica: 'Respuestas SI', valor: this.estadisticas.respuestasSi || 0 });
      datos.push({ metrica: 'Respuestas NO', valor: this.estadisticas.respuestasNo || 0 });
    }

    if (this.estadisticas.tipoEvento === 'ASISTENCIA') {
      datos.push({ metrica: 'Confirmados', valor: this.estadisticas.confirmados || 0 });
      datos.push({ metrica: 'No Asistiran', valor: this.estadisticas.noAsistiran || 0 });
      datos.push({ metrica: 'Pendientes', valor: this.estadisticas.pendientes || 0 });
    }

    if (this.estadisticas.tipoEvento === 'ENCUESTA' && this.estadisticas.opcionesEstadisticas) {
      this.estadisticas.opcionesEstadisticas.forEach(op => {
        datos.push({
          metrica: `Opcion: ${op.textoOpcion}`,
          valor: `${op.votos} votos (${op.porcentaje.toFixed(1)}%)`
        });
      });
    }

    return datos;
  }
}
