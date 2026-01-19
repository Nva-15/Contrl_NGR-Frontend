import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudesService } from '../../services/solicitudes';
import { AuthService } from '../../services/auth';
import { ExportService } from '../../services/export';
import { SolicitudResponse } from '../../interfaces/solicitud';
import { ActivatedRoute } from '@angular/router';
import { EmpleadosService } from '../../services/empleados';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './solicitudes.html'
})
export class SolicitudesComponent implements OnInit {
  private solicitudesService = inject(SolicitudesService);
  private authService = inject(AuthService);
  private exportService = inject(ExportService);
  private empleadosService = inject(EmpleadosService);
  private route = inject(ActivatedRoute);

  currentUser: any;
  misSolicitudes: SolicitudResponse[] = [];
  solicitudesPendientes: SolicitudResponse[] = [];
  historialGlobal: SolicitudResponse[] = [];
  todosEmpleados: any[] = [];
  
  // Filtros para MIS SOLICITUDES
  filtroEstadoMisSolicitudes = '';
  filtroTipoMisSolicitudes = '';
  filtroFechaInicioMisSolicitudes = '';
  filtroFechaFinMisSolicitudes = '';
  
  // Filtros para PENDIENTES (solo jefes/supervisores)
  filtroTipoPendientes = '';
  filtroRolPendientes = '';
  filtroEmpleadoPendientes = '';
  filtroFechaInicioPendientes = '';
  filtroFechaFinPendientes = '';
  
  // Filtros para HISTORIAL GLOBAL
  filtroRolHistorial = '';
  filtroTipoHistorial = '';
  filtroEstadoHistorial = '';
  filtroEmpleadoHistorial = '';
  filtroFechaInicioHistorial = '';
  filtroFechaFinHistorial = '';
  
  nuevaSolicitud = {
    tipo: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    motivo: ''
  };

  tieneConflictos = false;
  mensajeConflictos = '';
  conflictosDetectados: any[] = [];
  mostrarConfirmacionConflictos = false;

  solicitudEditando: SolicitudResponse | null = null;
  editandoSolicitud = {
    id: 0,
    tipo: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
    estado: 'pendiente'
  };
  modoEdicion = false;

  activeTab = 'mis-solicitudes';
  isLoading = false;
  mensaje = '';
  exportando = false;

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
    if (this.esJefe()) {
      this.cargarTodosEmpleados();
    }
  }

  esAdmin(): boolean {
    return this.authService.isAdmin();
  }

  esSupervisor(): boolean {
    return this.authService.isSupervisor();
  }

  esJefe(): boolean {
    return this.esAdmin() || this.esSupervisor();
  }

  puedeEditarSolicitud(solicitud: SolicitudResponse): boolean {
    if (!solicitud.estado || !this.currentUser) return false;
    
    const esMiSolicitud = solicitud.empleadoId === this.currentUser.id;
    const solicitudRol = this.obtenerRolEmpleado(solicitud.empleadoId);
    
    if (solicitud.estado === 'pendiente') {
      return esMiSolicitud || this.esJefe();
    }
    
    if (['aprobada', 'rechazada', 'cancelada'].includes(solicitud.estado)) {
      if (esMiSolicitud) return false;
      
      if (['tecnico', 'hd', 'noc'].includes(solicitudRol)) {
        return this.esJefe();
      }
      
      if (solicitudRol === 'supervisor') {
        return this.esAdmin();
      }
      
      return this.esAdmin();
    }
    
    return false;
  }

  cargarDatos() {
    this.cargarMisSolicitudes();
    if (this.esJefe()) {
      this.cargarPendientes();
      this.cargarHistorialGlobal();
    }
  }

  cargarTodosEmpleados() {
    this.empleadosService.getEmpleados().subscribe({
      next: (data) => {
        this.todosEmpleados = data;
        if (this.esAdmin()) {
          this.filtroRolPendientes = 'supervisor';
          this.filtroRolHistorial = 'supervisor';
        } else if (this.esSupervisor()) {
          this.filtroRolPendientes = 'tecnico';
          this.filtroRolHistorial = 'tecnico';
        }
      }
    });
  }

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
    this.solicitudesService.getHistorial().subscribe({
      next: (data) => {
        this.historialGlobal = data;
      }
    });
  }

  crearSolicitud() {
    if (!this.nuevaSolicitud.fechaInicio || !this.nuevaSolicitud.fechaFin) {
      alert('Por favor selecciona las fechas de inicio y fin');
      return;
    }
    
    if (this.nuevaSolicitud.fechaInicio > this.nuevaSolicitud.fechaFin) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }
  
    this.isLoading = true;
    
    this.solicitudesService.verificarConflictosPorRol(
      this.currentUser.id,
      this.currentUser.rol,
      this.nuevaSolicitud.fechaInicio,
      this.nuevaSolicitud.fechaFin
    ).subscribe({
      next: (response) => {
        if (response.tieneConflictos) {
          alert(response.mensaje);
        }
        this.enviarSolicitud();
      },
      error: (err) => {
        console.error('Error verificando conflictos:', err);
        this.enviarSolicitud();
      }
    });
  }
  
  private enviarSolicitud() {
    const payload = {
      empleadoId: this.currentUser.id,
      ...this.nuevaSolicitud
    };
  
    this.solicitudesService.crearSolicitud(payload).subscribe({
      next: (response) => {
        if (response.tieneNotaConflicto) {
          this.mensaje = '✅ Solicitud enviada. Se detectaron conflictos de fechas, se ha agregado una nota informativa en el motivo.';
          alert('✅ Solicitud enviada. Se detectaron conflictos de fechas, se ha agregado una nota informativa en el motivo.');
        } else {
          this.mensaje = '✅ Solicitud enviada correctamente.';
        }
        
        this.cargarDatos();
        this.limpiarFormulario();
        if (this.activeTab === 'crear') this.activeTab = 'mis-solicitudes';
        this.tieneConflictos = false;
        this.mensajeConflictos = '';
        this.conflictosDetectados = [];
        setTimeout(() => this.mensaje = '', 5000);
        this.isLoading = false;
      },
      error: (err) => {
        alert(err || 'Error al procesar solicitud');
        this.isLoading = false;
      }
    });
  }

  cancelarCreacion() {
    this.limpiarFormulario();
    this.activeTab = this.esJefe() ? 'aprobar' : 'mis-solicitudes';
  }

  cargarSolicitudParaEditar(solicitud: SolicitudResponse) {
    if (!this.puedeEditarSolicitud(solicitud)) {
      alert('No tiene permisos para editar esta solicitud');
      return;
    }
    
    this.modoEdicion = true;
    this.solicitudEditando = solicitud;
    
    const fechaInicioRaw = solicitud.fechaInicio || '';
    const fechaFinRaw = solicitud.fechaFin || '';
    
    const fechaInicio = fechaInicioRaw.split('T')[0];
    const fechaFin = fechaFinRaw.split('T')[0];
    
    this.editandoSolicitud = {
      id: solicitud.id || 0,
      tipo: solicitud.tipo || 'vacaciones',
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      motivo: solicitud.motivo || '',
      estado: solicitud.estado || 'pendiente'
    };
    
    this.activeTab = 'crear';
  }

  guardarEdicion() {
    if (!this.editandoSolicitud.fechaInicio || !this.editandoSolicitud.fechaFin) {
      alert('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    if (this.editandoSolicitud.fechaInicio > this.editandoSolicitud.fechaFin) {
      alert('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    this.isLoading = true;
    
    this.solicitudesService.verificarConflictosPorRol(
      this.currentUser.id,
      this.currentUser.rol,
      this.editandoSolicitud.fechaInicio,
      this.editandoSolicitud.fechaFin
    ).subscribe({
      next: (response) => {
        if (response.tieneConflictos) {
          const conflictosFiltrados = response.conflictos.filter((c: any) => c.id !== this.editandoSolicitud.id);
          if (conflictosFiltrados.length > 0) {
            alert(response.mensaje);
          }
        }
        this.actualizarSolicitud();
      },
      error: () => this.actualizarSolicitud()
    });
  }

  private actualizarSolicitud() {
    const payload: any = {
      tipo: this.editandoSolicitud.tipo,
      fechaInicio: this.editandoSolicitud.fechaInicio,
      fechaFin: this.editandoSolicitud.fechaFin,
      motivo: this.editandoSolicitud.motivo
    };
  
    // Si es jefe y NO es su solicitud, incluir el estado
    if (this.esJefe() && this.editandoSolicitud.id) {
      const esMiSolicitud = this.misSolicitudes.some(s => s.id === this.editandoSolicitud.id);
      if (!esMiSolicitud) {
        payload.estado = this.editandoSolicitud.estado;
      }
    }
  
    this.solicitudesService.editarSolicitud(this.editandoSolicitud.id, payload).subscribe({
      next: (response) => {
        this.mensaje = 'Solicitud actualizada correctamente';
        this.cargarDatos();
        this.cancelarEdicion();
        setTimeout(() => this.mensaje = '', 3000);
        this.isLoading = false;
      },
      error: (err) => {
        alert(err || 'Error al actualizar solicitud');
        this.isLoading = false;
      }
    });
  }

  cancelarEdicion() {
    this.modoEdicion = false;
    this.solicitudEditando = null;
    this.editandoSolicitud = {
      id: 0,
      tipo: 'vacaciones',
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
      estado: 'pendiente'
    };
    this.tieneConflictos = false;
    this.mensajeConflictos = '';
    this.conflictosDetectados = [];
    this.limpiarFormulario();
    this.activeTab = this.esJefe() ? 'aprobar' : 'mis-solicitudes';
  }

  // GETTERS FILTRADOS
  get misSolicitudesFiltradas() {
    return this.misSolicitudes.filter(sol => {
      let matchEstado = true;
      let matchTipo = true;
      let matchFecha = true;

      if (this.filtroEstadoMisSolicitudes) {
        matchEstado = sol.estado === this.filtroEstadoMisSolicitudes;
      }

      if (this.filtroTipoMisSolicitudes) {
        matchTipo = sol.tipo === this.filtroTipoMisSolicitudes;
      }

      if (this.filtroFechaInicioMisSolicitudes && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = fechaSol >= this.filtroFechaInicioMisSolicitudes;
      }

      if (this.filtroFechaFinMisSolicitudes && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = matchFecha && fechaSol <= this.filtroFechaFinMisSolicitudes;
      }

      return matchEstado && matchTipo && matchFecha;
    });
  }

  get pendientesFiltradas() {
    if (!this.esJefe()) return [];
    
    return this.solicitudesPendientes.filter(sol => {
      let matchTipo = true;
      let matchRol = true;
      let matchEmpleado = true;
      let matchFecha = true;

      if (this.filtroTipoPendientes) {
        matchTipo = sol.tipo === this.filtroTipoPendientes;
      }

      if (this.filtroRolPendientes) {
        const empleado = this.todosEmpleados.find(e => e.id === sol.empleadoId);
        if (empleado) {
          matchRol = empleado.rol === this.filtroRolPendientes;
        }
      }

      if (this.filtroEmpleadoPendientes) {
        matchEmpleado = sol.empleadoNombre.toLowerCase().includes(this.filtroEmpleadoPendientes.toLowerCase());
      }

      if (this.filtroFechaInicioPendientes && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = fechaSol >= this.filtroFechaInicioPendientes;
      }

      if (this.filtroFechaFinPendientes && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = matchFecha && fechaSol <= this.filtroFechaFinPendientes;
      }

      return matchTipo && matchRol && matchEmpleado && matchFecha;
    });
  }

  get historialGlobalFiltrado() {
    if (!this.esJefe()) return [];
    
    return this.historialGlobal.filter(sol => {
      let matchRol = true;
      let matchTipo = true;
      let matchEstado = true;
      let matchEmpleado = true;
      let matchFecha = true;

      if (this.filtroRolHistorial) {
        const empleado = this.todosEmpleados.find(e => e.id === sol.empleadoId);
        if (empleado) {
          matchRol = empleado.rol === this.filtroRolHistorial;
        }
      }

      if (this.filtroTipoHistorial) {
        matchTipo = sol.tipo === this.filtroTipoHistorial;
      }

      if (this.filtroEstadoHistorial) {
        matchEstado = sol.estado === this.filtroEstadoHistorial;
      }

      if (this.filtroEmpleadoHistorial) {
        matchEmpleado = sol.empleadoNombre.toLowerCase().includes(this.filtroEmpleadoHistorial.toLowerCase());
      }

      if (this.filtroFechaInicioHistorial && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = fechaSol >= this.filtroFechaInicioHistorial;
      }

      if (this.filtroFechaFinHistorial && sol.fechaInicio) {
        const fechaSol = sol.fechaInicio.split('T')[0];
        matchFecha = matchFecha && fechaSol <= this.filtroFechaFinHistorial;
      }

      return matchRol && matchTipo && matchEstado && matchEmpleado && matchFecha;
    });
  }

  get empleadosFiltrados() {
    if (!this.esJefe()) return [];
    
    let empleados = this.todosEmpleados;
    
    if (this.filtroRolPendientes) {
      empleados = empleados.filter(e => e.rol === this.filtroRolPendientes);
    }
    
    return empleados;
  }

  validarFechasFiltro() {
    if (this.filtroFechaInicioMisSolicitudes && this.filtroFechaFinMisSolicitudes && 
        this.filtroFechaFinMisSolicitudes < this.filtroFechaInicioMisSolicitudes) {
      this.filtroFechaFinMisSolicitudes = this.filtroFechaInicioMisSolicitudes;
    }
    
    if (this.filtroFechaInicioPendientes && this.filtroFechaFinPendientes && 
        this.filtroFechaFinPendientes < this.filtroFechaInicioPendientes) {
      this.filtroFechaFinPendientes = this.filtroFechaInicioPendientes;
    }
    
    if (this.filtroFechaInicioHistorial && this.filtroFechaFinHistorial && 
        this.filtroFechaFinHistorial < this.filtroFechaInicioHistorial) {
      this.filtroFechaFinHistorial = this.filtroFechaInicioHistorial;
    }
  }

  limpiarFiltros() {
    switch(this.activeTab) {
      case 'mis-solicitudes':
        this.filtroEstadoMisSolicitudes = '';
        this.filtroTipoMisSolicitudes = '';
        this.filtroFechaInicioMisSolicitudes = '';
        this.filtroFechaFinMisSolicitudes = '';
        break;
      case 'aprobar':
        this.filtroTipoPendientes = '';
        this.filtroEmpleadoPendientes = '';
        this.filtroFechaInicioPendientes = '';
        this.filtroFechaFinPendientes = '';
        if (this.esAdmin()) {
          this.filtroRolPendientes = 'supervisor';
        } else if (this.esSupervisor()) {
          this.filtroRolPendientes = 'tecnico';
        } else {
          this.filtroRolPendientes = '';
        }
        break;
      case 'historial':
        this.filtroTipoHistorial = '';
        this.filtroEstadoHistorial = '';
        this.filtroEmpleadoHistorial = '';
        this.filtroFechaInicioHistorial = '';
        this.filtroFechaFinHistorial = '';
        if (this.esAdmin()) {
          this.filtroRolHistorial = 'supervisor';
        } else if (this.esSupervisor()) {
          this.filtroRolHistorial = 'tecnico';
        } else {
          this.filtroRolHistorial = '';
        }
        break;
    }
  }

  exportarExcel() {
    this.exportando = true;
    const datos = this.obtenerDatosParaExportar();
    
    if (datos.length === 0) {
      alert('No hay datos para exportar');
      this.exportando = false;
      return;
    }
    
    const nombreArchivo = this.getNombreArchivoExportacion();
    this.exportService.exportToExcel(datos, nombreArchivo);
    this.exportando = false;
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
    const columnas = this.getColumnasExportacion();
    
    this.exportService.exportToPDF(datos, columnas, {
      title: titulo,
      filename: nombreArchivo,
      orientation: 'landscape'
    });
    this.exportando = false;
  }

  private getColumnasExportacion(): any[] {
    if (this.activeTab === 'mis-solicitudes') {
      return [
        { header: 'ID', dataKey: 'id' },
        { header: 'Tipo', dataKey: 'tipo' },
        { header: 'Fecha Solicitud', dataKey: 'fechaSolicitud' },
        { header: 'Fecha Inicio', dataKey: 'fechaInicio' },
        { header: 'Fecha Fin', dataKey: 'fechaFin' },
        { header: 'Días', dataKey: 'dias' },
        { header: 'Estado', dataKey: 'estado' },
        { header: 'Aprobado Por', dataKey: 'aprobadoPor' },
        { header: 'Fecha Aprobación', dataKey: 'fechaAprobacion' }
      ];
    } else if (this.activeTab === 'aprobar') {
      return [
        { header: 'ID', dataKey: 'id' },
        { header: 'Empleado', dataKey: 'empleadoNombre' },
        { header: 'Rol', dataKey: 'rol' },
        { header: 'Tipo', dataKey: 'tipo' },
        { header: 'Fecha Inicio', dataKey: 'fechaInicio' },
        { header: 'Fecha Fin', dataKey: 'fechaFin' },
        { header: 'Días', dataKey: 'dias' },
        { header: 'Fecha Solicitud', dataKey: 'fechaSolicitud' },
        { header: 'Motivo', dataKey: 'motivo' }
      ];
    } else {
      return [
        { header: 'ID', dataKey: 'id' },
        { header: 'Empleado', dataKey: 'empleadoNombre' },
        { header: 'Rol', dataKey: 'rol' },
        { header: 'Tipo', dataKey: 'tipo' },
        { header: 'Fecha Inicio', dataKey: 'fechaInicio' },
        { header: 'Fecha Fin', dataKey: 'fechaFin' },
        { header: 'Días', dataKey: 'dias' },
        { header: 'Estado', dataKey: 'estado' },
        { header: 'Aprobado Por', dataKey: 'aprobadoPor' },
        { header: 'Fecha Solicitud', dataKey: 'fechaSolicitud' },
        { header: 'Fecha Aprobación', dataKey: 'fechaAprobacion' }
      ];
    }
  }

  private obtenerDatosParaExportar(): any[] {
    let datosOriginales: SolicitudResponse[] = [];
    
    switch(this.activeTab) {
      case 'mis-solicitudes':
        datosOriginales = this.misSolicitudesFiltradas;
        break;
      case 'aprobar':
        datosOriginales = this.pendientesFiltradas;
        break;
      case 'historial':
        datosOriginales = this.historialGlobalFiltrado;
        break;
      default:
        datosOriginales = [];
    }
    
    return datosOriginales.map(sol => {
      const empleado = this.todosEmpleados.find(e => e.id === sol.empleadoId);
      return {
        id: sol.id || '',
        empleadoNombre: sol.empleadoNombre || '',
        rol: empleado?.rol || '',
        tipo: sol.tipo || '',
        fechaInicio: this.formatFechaExport(sol.fechaInicio || ''),
        fechaFin: this.formatFechaExport(sol.fechaFin || ''),
        dias: this.calcularDias(sol.fechaInicio || '', sol.fechaFin || ''),
        estado: sol.estado || '',
        aprobadoPor: sol.aprobadoPor || (sol.nombreAprobador || 'Pendiente'),
        fechaSolicitud: this.formatFechaHora(sol.fechaSolicitud || ''),
        fechaAprobacion: this.formatFechaHora(sol.fechaAprobacion || ''),
        motivo: sol.motivo || ''
      };
    });
  }

  private getNombreArchivoExportacion(): string {
    const tipoMap: {[key: string]: string} = {
      'mis-solicitudes': 'mis_solicitudes',
      'aprobar': 'solicitudes_pendientes',
      'historial': 'historial_solicitudes'
    };
    
    const fecha = new Date().toISOString().split('T')[0];
    return `${tipoMap[this.activeTab] || 'solicitudes'}_${fecha}`;
  }

  private getTituloExportacion(): string {
    const tituloMap: {[key: string]: string} = {
      'mis-solicitudes': 'Mis Solicitudes',
      'aprobar': 'Solicitudes Pendientes de Aprobación',
      'historial': 'Historial de Solicitudes'
    };
    
    return tituloMap[this.activeTab] || 'Reporte de Solicitudes';
  }

  private formatFechaExport(fecha: string): string {
    if (!fecha) return '';
    try {
      return fecha.split('T')[0];
    } catch {
      return fecha;
    }
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    try {
      const fechaISO = fecha.split('T')[0];
      const [anio, mes, dia] = fechaISO.split('-');
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fecha.split('T')[0] || fecha;
    }
  }

  private formatearFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    try {
      const [fechaPart, horaPart] = fechaHora.split('T');
      const [anio, mes, dia] = fechaPart.split('-');
      
      if (horaPart) {
        const [hora, minutos] = horaPart.split(':');
        return `${dia}/${mes}/${anio} ${hora}:${minutos}`;
      }
      
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fechaHora;
    }
  }

  private calcularDias(inicio: string, fin: string): number {
    if (!inicio || !fin) return 0;
    try {
      const fechaInicio = inicio.split('T')[0];
      const fechaFin = fin.split('T')[0];
      
      const start = new Date(fechaInicio);
      const end = new Date(fechaFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {
      return 0;
    }
  }

  procesar(id: number, estado: string) {
    if (!confirm(`¿Confirma que desea marcar esta solicitud como ${estado.toUpperCase()}?`)) return;

    this.solicitudesService.gestionarSolicitud(id, estado, this.currentUser.id).subscribe({
      next: () => {
        this.cargarDatos();
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
    this.mensajeConflictos = '';
    this.conflictosDetectados = [];
    this.mostrarConfirmacionConflictos = false;
  }

  getEstadoClass(estado: string): string {
    if (!estado) return 'bg-secondary';
    
    switch (estado.toLowerCase()) {
      case 'aprobado': return 'bg-success';
      case 'rechazado': return 'bg-danger';
      case 'pendiente': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  }

  getRolClass(rol: string): string {
    if (!rol) return 'bg-secondary';
    
    switch (rol.toLowerCase()) {
      case 'admin': return 'bg-dark text-white';
      case 'supervisor': return 'bg-primary text-white';
      case 'tecnico': return 'bg-info text-white';
      default: return 'bg-secondary';
    }
  }

  getFechaActual(): string {
    const hoy = new Date();
    const offset = -5 * 60 * 60 * 1000;
    const fechaPeru = new Date(hoy.getTime() + offset);
    return fechaPeru.toISOString().split('T')[0];
  }

  formatFecha(fecha: string): string {
    return this.formatearFecha(fecha);
  }

  formatFechaHora(fechaHora: string): string {
    return this.formatearFechaHora(fechaHora);
  }

  obtenerRolEmpleado(empleadoId: number): string {
    if (!this.todosEmpleados || this.todosEmpleados.length === 0) {
      return '';
    }
    
    const empleado = this.todosEmpleados.find(e => e.id === empleadoId);
    return empleado?.rol || '';
  }

  get todosEmpleadosFiltrados() {
    return this.todosEmpleados || [];
  }
}