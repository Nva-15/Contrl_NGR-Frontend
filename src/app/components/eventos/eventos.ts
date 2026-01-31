import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { EventosService } from '../../services/eventos';
import { NotificationService } from '../../services/notification.service';
import { Evento, EventoRequest, EstadisticasEvento, RespuestaEvento } from '../../interfaces/evento';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './eventos.html',
  styleUrls: ['./eventos.css']
})
export class EventosComponent implements OnInit {
  private auth = inject(AuthService);
  private eventosService = inject(EventosService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  eventos: Evento[] = [];
  isLoading = false;
  filtroEstado = 'todos';

  // Modal crear/editar
  mostrarModalEvento = false;
  eventoEdit: EventoRequest = this.nuevoEvento();
  eventoEditId: number | null = null;
  isGuardando = false;
  opcionNueva = '';

  // Modal estadisticas
  mostrarModalStats = false;
  estadisticas: EstadisticasEvento | null = null;
  respuestasEvento: RespuestaEvento[] = [];
  isLoadingStats = false;
  eventoStats: Evento | null = null;

  rolesDisponibles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'tecnico', label: 'Tecnico' },
    { value: 'hd', label: 'HD' },
    { value: 'noc', label: 'NOC' }
  ];

  tiposEvento = [
    { value: 'ENCUESTA', label: 'Encuesta' },
    { value: 'SI_NO', label: 'SI/NO' },
    { value: 'ASISTENCIA', label: 'Asistencia' },
    { value: 'INFORMATIVO', label: 'Informativo' }
  ];

  ngOnInit() {
    if (!this.auth.isAdmin() && !this.auth.isSupervisor()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.cargarEventos();
  }

  cargarEventos() {
    this.isLoading = true;
    this.eventosService.getTodosEventos().subscribe({
      next: (eventos) => {
        this.eventos = eventos;
        this.isLoading = false;
      },
      error: (err) => {
        this.notification.error(err, 'Error al cargar eventos');
        this.isLoading = false;
      }
    });
  }

  get eventosFiltrados(): Evento[] {
    if (this.filtroEstado === 'todos') {
      return this.eventos;
    }
    return this.eventos.filter(e => e.estado === this.filtroEstado);
  }

  nuevoEvento(): EventoRequest {
    return {
      titulo: '',
      descripcion: '',
      tipoEvento: 'INFORMATIVO',
      fechaInicio: '',
      fechaFin: '',
      rolesVisibles: ['admin', 'supervisor', 'tecnico', 'hd', 'noc'],
      permiteComentarios: true,
      requiereRespuesta: true,
      opciones: []
    };
  }

  abrirModalCrear() {
    this.eventoEdit = this.nuevoEvento();
    this.eventoEditId = null;
    this.mostrarModalEvento = true;
  }

  abrirModalEditar(evento: Evento) {
    this.eventoEdit = {
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      tipoEvento: evento.tipoEvento,
      fechaInicio: evento.fechaInicio?.substring(0, 16) || '',
      fechaFin: evento.fechaFin?.substring(0, 16) || '',
      rolesVisibles: evento.rolesVisibles || [],
      permiteComentarios: evento.permiteComentarios,
      requiereRespuesta: evento.requiereRespuesta,
      opciones: evento.opciones?.map(o => o.textoOpcion) || []
    };
    this.eventoEditId = evento.id || null;
    this.mostrarModalEvento = true;
  }

  cerrarModalEvento() {
    this.mostrarModalEvento = false;
    this.eventoEdit = this.nuevoEvento();
    this.eventoEditId = null;
    this.opcionNueva = '';
  }

  toggleRol(rol: string) {
    const index = this.eventoEdit.rolesVisibles.indexOf(rol);
    if (index > -1) {
      this.eventoEdit.rolesVisibles.splice(index, 1);
    } else {
      this.eventoEdit.rolesVisibles.push(rol);
    }
  }

  isRolSeleccionado(rol: string): boolean {
    return this.eventoEdit.rolesVisibles.includes(rol);
  }

  agregarOpcion() {
    if (this.opcionNueva.trim()) {
      if (!this.eventoEdit.opciones) {
        this.eventoEdit.opciones = [];
      }
      this.eventoEdit.opciones.push(this.opcionNueva.trim());
      this.opcionNueva = '';
    }
  }

  eliminarOpcion(index: number) {
    this.eventoEdit.opciones?.splice(index, 1);
  }

  async guardarEvento() {
    if (!this.eventoEdit.titulo.trim()) {
      this.notification.error('El titulo es requerido', 'Validacion');
      return;
    }
    if (!this.eventoEdit.descripcion.trim()) {
      this.notification.error('La descripcion es requerida', 'Validacion');
      return;
    }
    if (this.eventoEdit.rolesVisibles.length === 0) {
      this.notification.error('Debe seleccionar al menos un rol', 'Validacion');
      return;
    }
    if (this.eventoEdit.tipoEvento === 'ENCUESTA' && (!this.eventoEdit.opciones || this.eventoEdit.opciones.length < 2)) {
      this.notification.error('Las encuestas requieren al menos 2 opciones', 'Validacion');
      return;
    }

    this.isGuardando = true;

    const observable = this.eventoEditId
      ? this.eventosService.actualizarEvento(this.eventoEditId, this.eventoEdit)
      : this.eventosService.crearEvento(this.eventoEdit);

    observable.subscribe({
      next: () => {
        this.notification.success(
          this.eventoEditId ? 'Evento actualizado' : 'Evento creado',
          'Exitoso'
        );
        this.cargarEventos();
        this.cerrarModalEvento();
        this.isGuardando = false;
      },
      error: (err) => {
        this.notification.error(err, 'Error');
        this.isGuardando = false;
      }
    });
  }

  async cambiarEstado(evento: Evento, nuevoEstado: string) {
    const labels: { [key: string]: string } = {
      'ACTIVO': 'activar',
      'FINALIZADO': 'finalizar',
      'CANCELADO': 'cancelar',
      'BORRADOR': 'pasar a borrador'
    };

    const confirmado = await this.notification.confirm({
      title: `Cambiar estado`,
      message: `Desea ${labels[nuevoEstado] || nuevoEstado} el evento "${evento.titulo}"?`,
      confirmText: 'Si, cambiar',
      cancelText: 'Cancelar',
      type: nuevoEstado === 'ACTIVO' ? 'success' : 'warning'
    });

    if (!confirmado) return;

    this.eventosService.cambiarEstado(evento.id!, nuevoEstado).subscribe({
      next: () => {
        this.notification.success(`Estado cambiado a ${nuevoEstado}`, 'Exitoso');
        this.cargarEventos();
      },
      error: (err) => {
        this.notification.error(err, 'Error');
      }
    });
  }

  async eliminarEvento(evento: Evento) {
    const confirmado = await this.notification.confirm({
      title: 'Eliminar evento',
      message: `Desea eliminar permanentemente "${evento.titulo}"? Esta accion no se puede deshacer.`,
      confirmText: 'Si, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!confirmado) return;

    this.eventosService.eliminarEvento(evento.id!).subscribe({
      next: () => {
        this.notification.success('Evento eliminado', 'Exitoso');
        this.cargarEventos();
      },
      error: (err) => {
        this.notification.error(err, 'Error');
      }
    });
  }

  verEstadisticas(evento: Evento) {
    this.eventoStats = evento;
    this.isLoadingStats = true;
    this.mostrarModalStats = true;

    this.eventosService.getEstadisticas(evento.id!).subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.eventosService.getRespuestasEvento(evento.id!).subscribe({
          next: (respuestas) => {
            this.respuestasEvento = respuestas;
            this.isLoadingStats = false;
          },
          error: () => {
            this.isLoadingStats = false;
          }
        });
      },
      error: (err) => {
        this.notification.error(err, 'Error');
        this.isLoadingStats = false;
      }
    });
  }

  cerrarModalStats() {
    this.mostrarModalStats = false;
    this.estadisticas = null;
    this.respuestasEvento = [];
    this.eventoStats = null;
  }

  getTipoEventoIcon(tipo: string): string {
    return this.eventosService.getTipoEventoIcon(tipo);
  }

  getTipoEventoColor(tipo: string): string {
    return this.eventosService.getTipoEventoColor(tipo);
  }

  getTipoEventoLabel(tipo: string): string {
    return this.eventosService.getTipoEventoLabel(tipo);
  }

  getEstadoLabel(estado: string): string {
    return this.eventosService.getEstadoLabel(estado);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'BORRADOR': return 'secondary';
      case 'ACTIVO': return 'success';
      case 'FINALIZADO': return 'primary';
      case 'CANCELADO': return 'danger';
      default: return 'secondary';
    }
  }

  getFechaFormateada(fecha: string | undefined): string {
    if (!fecha) return '-';
    try {
      return new Date(fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }
}
