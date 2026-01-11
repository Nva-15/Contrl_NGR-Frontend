import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudesService } from '../../services/solicitudes';
import { AuthService } from '../../services/auth';
import { SolicitudResponse } from '../../interfaces/solicitud';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.html',
  styleUrls: ['./solicitudes.css']
})
export class SolicitudesComponent implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  currentUser: any;
  
  // Datos Originales
  misSolicitudes: SolicitudResponse[] = [];
  solicitudesPendientes: SolicitudResponse[] = [];
  historialGlobal: SolicitudResponse[] = [];

  // Filtros
  filtroNombre: string = '';
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';
  filtroEstado: string = ''; // '' = Todos

  // Formulario Crear
  nuevaSolicitud = {
    tipo: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    motivo: ''
  };

  activeTab: string = 'mis-solicitudes';
  isLoading = false;
  mensaje = '';

  ngOnInit() {
    this.currentUser = this.authService.getCurrentEmpleado();
    
    // Navegación inteligente desde Dashboard
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      } else if (this.esJefe()) {
        this.activeTab = 'aprobar'; // Jefes ven pendientes primero
      }
    });

    this.cargarDatos();
  }

  esJefe(): boolean {
    return this.authService.isAdmin() || this.authService.isSupervisor();
  }

  cargarDatos() {
    this.cargarMisSolicitudes();
    if (this.esJefe()) {
      this.cargarPendientes();
      this.cargarHistorialGlobal();
    }
  }

  // --- CARGA DE DATOS ---

  cargarMisSolicitudes() {
    this.isLoading = true;
    this.solicitudesService.getMisSolicitudes(this.currentUser.id).subscribe({
      next: (data) => {
        this.misSolicitudes = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  cargarPendientes() {
    this.solicitudesService.getPendientes().subscribe({
      next: (data) => this.solicitudesPendientes = data
    });
  }

  cargarHistorialGlobal() {
    this.solicitudesService.getTodas().subscribe({
      next: (data) => {
        // Solo mostramos lo que NO está pendiente (Aprobado/Rechazado)
        this.historialGlobal = data.filter(s => s.estado !== 'pendiente');
      }
    });
  }

  // --- GETTERS FILTRADOS ---

  get misSolicitudesFiltradas() {
    // El técnico filtra sus propias solicitudes por fecha y estado
    return this.aplicarFiltros(this.misSolicitudes, false); 
  }

  get historialGlobalFiltrado() {
    // El jefe filtra el historial global por nombre, fecha y estado
    return this.aplicarFiltros(this.historialGlobal, true);
  }

  private aplicarFiltros(lista: SolicitudResponse[], filtrarPorNombre: boolean): SolicitudResponse[] {
    return lista.filter(sol => {
      // 1. Filtro Nombre (Solo para historial global)
      const matchNombre = !filtrarPorNombre || 
                          this.filtroNombre === '' || 
                          sol.empleadoNombre.toLowerCase().includes(this.filtroNombre.toLowerCase());

      // 2. Filtro Fechas (Rango)
      let matchFecha = true;
      if (this.filtroFechaInicio) {
        matchFecha = matchFecha && sol.fechaInicio >= this.filtroFechaInicio;
      }
      if (this.filtroFechaFin) {
        matchFecha = matchFecha && sol.fechaInicio <= this.filtroFechaFin;
      }

      // 3. Filtro Estado
      const matchEstado = this.filtroEstado === '' || sol.estado === this.filtroEstado;

      return matchNombre && matchFecha && matchEstado;
    });
  }

  validarFechasFiltro() {
    if (this.filtroFechaInicio && this.filtroFechaFin && this.filtroFechaFin < this.filtroFechaInicio) {
      this.filtroFechaFin = this.filtroFechaInicio;
    }
  }

  limpiarFiltros() {
    this.filtroNombre = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtroEstado = '';
  }

  // --- ACCIONES ---

  crearSolicitud() {
    if (!this.nuevaSolicitud.fechaInicio || !this.nuevaSolicitud.fechaFin) {
      alert('Por favor selecciona las fechas de inicio y fin');
      return;
    }
    
    // Validación básica fecha inicio <= fecha fin
    if (this.nuevaSolicitud.fechaInicio > this.nuevaSolicitud.fechaFin) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    const payload = {
      empleadoId: this.currentUser.id,
      ...this.nuevaSolicitud
    };

    this.isLoading = true;
    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: () => {
        this.mensaje = 'Solicitud enviada correctamente';
        this.cargarMisSolicitudes();
        this.limpiarFormulario();
        // Cambiar a la pestaña de mis solicitudes para verla
        if (this.activeTab === 'crear') this.activeTab = 'mis-solicitudes';
        setTimeout(() => this.mensaje = '', 3000);
      },
      error: (err) => {
        alert(err.error?.error || 'Error al procesar solicitud');
        this.isLoading = false;
      }
    });
  }

  procesar(id: number, estado: string) {
    if (!confirm(`¿Confirma que desea marcar esta solicitud como ${estado.toUpperCase()}?`)) return;

    this.solicitudesService.gestionarSolicitud(id, estado, this.currentUser.id).subscribe({
      next: () => {
        this.cargarPendientes();
        this.cargarHistorialGlobal();
        alert(`Solicitud ${estado} correctamente`);
      },
      error: () => alert('Error al procesar la solicitud')
    });
  }

  limpiarFormulario() {
    this.nuevaSolicitud = {
      tipo: 'vacaciones',
      fechaInicio: '',
      fechaFin: '',
      motivo: ''
    };
  }

  getEstadoClass(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'aprobado': return 'bg-success';
      case 'rechazado': return 'bg-danger';
      case 'pendiente': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }
}