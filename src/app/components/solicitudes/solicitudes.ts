// components/solicitudes/solicitudes.ts - SOLO MEJORA EN MANEJO DE CONFLICTOS
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SolicitudesService } from '../../services/solicitudes';
import { AuthService } from '../../services/auth';
import { ExportService } from '../../services/export';
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
  private exportService = inject(ExportService);
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

  // Variables para conflictos
  tieneConflictos: boolean = false;
  conflictosDetectados: any[] = [];
  mostrarConfirmacionConflictos: boolean = false;

  activeTab: string = 'mis-solicitudes';
  isLoading = false;
  mensaje = '';
  exportando = false;
  mostrarOpcionesExportacion = false;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentEmpleado();
    
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      } else if (this.esJefe()) {
        this.activeTab = 'aprobar';
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
      next: (data) => {
        this.solicitudesPendientes = data;
      }
    });
  }

  cargarHistorialGlobal() {
    this.solicitudesService.getTodas().subscribe({
      next: (data) => {
        this.historialGlobal = data.filter(s => s.estado !== 'pendiente');
      }
    });
  }

  // --- CREAR SOLICITUD ---
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

    this.isLoading = true;
    
    // Primero verificar conflictos
    this.solicitudesService.verificarConflictos(
      this.currentUser.id,
      this.nuevaSolicitud.fechaInicio,
      this.nuevaSolicitud.fechaFin
    ).subscribe({
      next: (response) => {
        if (response.tieneConflictos) {
          // Mostrar confirmación de conflictos
          this.tieneConflictos = true;
          this.conflictosDetectados = response.conflictos || [];
          this.mostrarConfirmacionConflictos = true;
          this.isLoading = false;
        } else {
          // Enviar solicitud directamente
          this.enviarSolicitud();
        }
      },
      error: (err) => {
        console.error('Error verificando conflictos:', err);
        // Si falla la verificación, enviar de todos modos
        this.enviarSolicitud();
      }
    });
  }

  confirmarSolicitudConConflictos() {
    this.mostrarConfirmacionConflictos = false;
    this.enviarSolicitud();
  }

  cancelarSolicitudConConflictos() {
    this.mostrarConfirmacionConflictos = false;
    this.tieneConflictos = false;
    this.conflictosDetectados = [];
  }

  private enviarSolicitud() {
    const payload = {
      empleadoId: this.currentUser.id,
      ...this.nuevaSolicitud
    };

    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: (response) => {
        this.mensaje = 'Solicitud enviada correctamente';
        
        // Recargar datos
        this.cargarMisSolicitudes();
        if (this.esJefe()) {
          this.cargarPendientes();
        }
        
        this.limpiarFormulario();
        
        // Cambiar a mis solicitudes
        if (this.activeTab === 'crear') this.activeTab = 'mis-solicitudes';
        
        this.tieneConflictos = false;
        this.conflictosDetectados = [];
        
        setTimeout(() => this.mensaje = '', 3000);
        this.isLoading = false;
      },
      error: (err) => {
        // Si es error de conflicto (409), mostrar alerta
        if (err.includes && err.includes('CONFLICTO_FECHAS')) {
          alert(err);
        } else {
          alert(err || 'Error al procesar solicitud');
        }
        this.isLoading = false;
      }
    });
  }

  // --- TODOS LOS DEMÁS MÉTODOS SE MANTIENEN IGUAL ---
  get misSolicitudesFiltradas() {
    return this.aplicarFiltros(this.misSolicitudes, false); 
  }

  get historialGlobalFiltrado() {
    return this.aplicarFiltros(this.historialGlobal, true);
  }

  private aplicarFiltros(lista: SolicitudResponse[], filtrarPorNombre: boolean): SolicitudResponse[] {
    return lista.filter(sol => {
      const matchNombre = !filtrarPorNombre || 
                          this.filtroNombre === '' || 
                          sol.empleadoNombre.toLowerCase().includes(this.filtroNombre.toLowerCase());

      let matchFecha = true;
      if (this.filtroFechaInicio) {
        matchFecha = matchFecha && sol.fechaInicio >= this.filtroFechaInicio;
      }
      if (this.filtroFechaFin) {
        matchFecha = matchFecha && sol.fechaInicio <= this.filtroFechaFin;
      }

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

  // --- EXPORTACIÓN ---
  toggleExportacion() {
    this.mostrarOpcionesExportacion = !this.mostrarOpcionesExportacion;
  }

  exportarExcel() {
    this.exportando = true;
    const datos = this.obtenerDatosParaExportar();
    const nombreArchivo = this.getNombreArchivoExportacion();
    
    this.exportService.exportToExcel(datos, nombreArchivo, 'Solicitudes');
    this.exportando = false;
    this.mostrarOpcionesExportacion = false;
  }

  exportarPDF() {
    this.exportando = true;
    const datos = this.obtenerDatosParaExportar();
    
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      this.exportando = false;
      return;
    }
    
    const nombreArchivo = this.getNombreArchivoExportacion();
    const titulo = this.getTituloExportacion();
    
    const columnas = [
      { header: 'ID', dataKey: 'id', width: 15 },
      { header: 'Empleado', dataKey: 'empleadoNombre', width: 40 },
      { header: 'Tipo', dataKey: 'tipo', width: 25 },
      { header: 'Fecha Inicio', dataKey: 'fechaInicio', width: 25 },
      { header: 'Fecha Fin', dataKey: 'fechaFin', width: 25 },
      { header: 'Días', dataKey: 'dias', width: 15 },
      { header: 'Estado', dataKey: 'estado', width: 20 }
    ];
    
    this.exportService.exportToPDF(
      datos, 
      columnas, 
      titulo, 
      nombreArchivo,
      'landscape'
    );
    
    this.exportando = false;
    this.mostrarOpcionesExportacion = false;
  }

  exportarJSON() {
    this.exportando = true;
    const datos = this.obtenerDatosParaExportar();
    const nombreArchivo = this.getNombreArchivoExportacion();
    
    this.exportService.exportToJSON(datos, nombreArchivo);
    this.exportando = false;
    this.mostrarOpcionesExportacion = false;
  }

  exportarCSV() {
    this.exportando = true;
    const datos = this.obtenerDatosParaExportar();
    const nombreArchivo = this.getNombreArchivoExportacion();
    
    this.exportService.exportToCSV(datos, nombreArchivo);
    this.exportando = false;
    this.mostrarOpcionesExportacion = false;
  }

  private obtenerDatosParaExportar(): any[] {
    let datosOriginales: SolicitudResponse[];
    
    switch(this.activeTab) {
      case 'mis-solicitudes':
        datosOriginales = this.misSolicitudesFiltradas;
        break;
      case 'aprobar':
        datosOriginales = this.solicitudesPendientes;
        break;
      case 'historial':
        datosOriginales = this.historialGlobalFiltrado;
        break;
      default:
        datosOriginales = [];
    }
    
    return datosOriginales.map(sol => ({
      id: sol.id,
      empleadoNombre: sol.empleadoNombre,
      tipo: this.capitalizar(sol.tipo || ''),
      fechaInicio: sol.fechaInicio ? formatDate(new Date(sol.fechaInicio), 'dd/MM/yyyy', 'en-US') : '',
      fechaFin: sol.fechaFin ? formatDate(new Date(sol.fechaFin), 'dd/MM/yyyy', 'en-US') : '',
      dias: this.calcularDias(sol.fechaInicio, sol.fechaFin),
      estado: this.capitalizar(sol.estado || ''),
      aprobadoPor: sol.nombreAprobador || sol.aprobadoPor || 'Pendiente',
      fechaSolicitud: sol.fechaSolicitud ? formatDate(new Date(sol.fechaSolicitud), 'dd/MM/yyyy HH:mm', 'en-US') : '',
      fechaAprobacion: sol.fechaAprobacion ? formatDate(new Date(sol.fechaAprobacion), 'dd/MM/yyyy HH:mm', 'en-US') : '',
      motivo: sol.motivo ? this.truncarTexto(sol.motivo, 100) : ''
    }));
  }

  private getNombreArchivoExportacion(): string {
    const tipoMap: {[key: string]: string} = {
      'mis-solicitudes': 'mis_solicitudes',
      'aprobar': 'solicitudes_pendientes',
      'historial': 'historial_solicitudes'
    };
    
    return `solicitudes_${tipoMap[this.activeTab] || this.activeTab}`;
  }

  private getTituloExportacion(): string {
    const tituloMap: {[key: string]: string} = {
      'mis-solicitudes': 'Mis Solicitudes',
      'aprobar': 'Solicitudes Pendientes de Aprobación',
      'historial': 'Historial de Solicitudes'
    };
    
    return `Reporte - ${tituloMap[this.activeTab] || 'Solicitudes'}`;
  }

  private calcularDias(inicio: string, fin: string): number {
    if (!inicio || !fin) return 0;
    const start = new Date(inicio);
    const end = new Date(fin);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private capitalizar(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  }

  private truncarTexto(texto: string, maxLength: number): string {
    if (!texto) return '';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
  }

  getFechaActual(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  procesar(id: number, estado: string) {
    if (!confirm(`¿Confirma que desea marcar esta solicitud como ${estado.toUpperCase()}?`)) return;

    this.solicitudesService.gestionarSolicitud(id, estado, this.currentUser.id).subscribe({
      next: () => {
        this.cargarPendientes();
        this.cargarHistorialGlobal();
        this.cargarMisSolicitudes();
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
    this.tieneConflictos = false;
    this.conflictosDetectados = [];
    this.mostrarConfirmacionConflictos = false;
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