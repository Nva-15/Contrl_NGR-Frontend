import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolicitudesService } from '../../services/solicitudes';
import { AuthService } from '../../services/auth';
import { ExportService } from '../../services/export';
import { SolicitudResponse } from '../../interfaces/solicitud';
import { ActivatedRoute } from '@angular/router';
import { EmpleadosService } from '../../services/empleados';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

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
  private notification = inject(NotificationService);

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
  mostrarModalConflictos = false;
  accionPendiente: 'crear' | 'editar' | null = null;

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

    // Solo el dueño puede editar su solicitud y solo si está pendiente
    return esMiSolicitud && solicitud.estado === 'pendiente';
  }

  // Verificar si el jefe puede corregir el estado de una solicitud ya procesada
  puedeCorregirEstado(solicitud: SolicitudResponse): boolean {
    if (!solicitud.estado || !this.currentUser) return false;

    // Solo para solicitudes aprobadas o rechazadas
    if (!['aprobado', 'rechazado'].includes(solicitud.estado)) return false;

    // No puede corregir su propia solicitud
    const esMiSolicitud = solicitud.empleadoId === this.currentUser.id;
    if (esMiSolicitud) return false;

    // Verificar permisos según rol del empleado de la solicitud
    const rolSolicitud = this.obtenerRolEmpleado(solicitud.empleadoId);

    if (['tecnico', 'hd', 'noc'].includes(rolSolicitud)) {
      return this.esJefe(); // Supervisor o Admin
    }

    if (rolSolicitud === 'supervisor') {
      return this.esAdmin(); // Solo Admin
    }

    return this.esAdmin();
  }

  // Corregir el estado de una solicitud (en caso de error)
  async corregirEstado(id: number, nuevoEstado: string) {
    const estadoTexto = nuevoEstado === 'aprobado' ? 'APROBADO' : 'RECHAZADO';
    const tipo = nuevoEstado === 'aprobado' ? 'success' : 'danger';

    const confirmado = await this.notification.confirm({
      title: 'Corregir estado',
      message: `¿Confirma que desea cambiar el estado de esta solicitud a ${estadoTexto}?`,
      confirmText: 'Sí, corregir',
      cancelText: 'Cancelar',
      type: tipo as 'success' | 'danger'
    });

    if (!confirmado) return;

    this.solicitudesService.gestionarSolicitud(id, nuevoEstado, this.currentUser.id).subscribe({
      next: () => {
        this.cargarDatos();
        this.notification.success(`Estado corregido a ${estadoTexto} correctamente`, 'Estado corregido');
      },
      error: (err) => this.notification.error(err || 'Error al corregir el estado', 'Error')
    });
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
      this.notification.warning('Por favor selecciona las fechas de inicio y fin', 'Campos requeridos');
      return;
    }

    if (this.nuevaSolicitud.fechaInicio > this.nuevaSolicitud.fechaFin) {
      this.notification.warning('La fecha de fin no puede ser anterior a la fecha de inicio', 'Fechas inválidas');
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
        if (response.tieneConflictos && response.conflictos && response.conflictos.length > 0) {
          // Mostrar modal de confirmación con información de conflictos
          this.tieneConflictos = true;
          this.mensajeConflictos = response.mensaje;
          this.conflictosDetectados = response.conflictos;
          this.accionPendiente = 'crear';
          this.mostrarModalConflictos = true;
          this.isLoading = false;
        } else {
          // No hay conflictos, proceder directamente
          this.enviarSolicitud();
        }
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
          this.notification.info('Se detectaron conflictos de fechas. Se ha agregado una nota informativa en el motivo.', 'Solicitud enviada');
        } else {
          this.notification.success('Tu solicitud ha sido registrada correctamente.', 'Solicitud enviada');
        }

        this.cargarDatos();
        this.limpiarFormulario();
        if (this.activeTab === 'crear') this.activeTab = 'mis-solicitudes';
        this.tieneConflictos = false;
        this.mensajeConflictos = '';
        this.conflictosDetectados = [];
        this.isLoading = false;
      },
      error: (err) => {
        this.notification.error(err || 'Error al procesar solicitud', 'Error');
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
      this.notification.error('No tiene permisos para editar esta solicitud', 'Acceso denegado');
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
      this.notification.warning('Por favor selecciona las fechas de inicio y fin', 'Campos requeridos');
      return;
    }

    if (this.editandoSolicitud.fechaInicio > this.editandoSolicitud.fechaFin) {
      this.notification.warning('La fecha de fin no puede ser anterior a la fecha de inicio', 'Fechas inválidas');
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
        if (response.tieneConflictos && response.conflictos) {
          // Filtrar la solicitud actual (no es conflicto consigo misma)
          const conflictosFiltrados = response.conflictos.filter((c: any) => c.id !== this.editandoSolicitud.id);
          if (conflictosFiltrados.length > 0) {
            // Mostrar modal de confirmación con información de conflictos
            this.tieneConflictos = true;
            this.mensajeConflictos = response.mensaje;
            this.conflictosDetectados = conflictosFiltrados;
            this.accionPendiente = 'editar';
            this.mostrarModalConflictos = true;
            this.isLoading = false;
          } else {
            // No hay conflictos reales, proceder
            this.actualizarSolicitud();
          }
        } else {
          // No hay conflictos, proceder directamente
          this.actualizarSolicitud();
        }
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
        this.notification.success('La solicitud ha sido actualizada correctamente.', 'Solicitud actualizada');
        this.cargarDatos();
        this.cancelarEdicion();
        this.isLoading = false;
      },
      error: (err) => {
        this.notification.error(err || 'Error al actualizar solicitud', 'Error');
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
      this.notification.warning('No hay datos para exportar', 'Sin datos');
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
      this.notification.warning('No hay datos para exportar', 'Sin datos');
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
        { header: 'ID', dataKey: 'id', width: 10 },
        { header: 'Tipo', dataKey: 'tipo', width: 25 },
        { header: 'F. Solicitud', dataKey: 'fechaSolicitud', width: 28 },
        { header: 'Inicio', dataKey: 'fechaInicio', width: 25 },
        { header: 'Fin', dataKey: 'fechaFin', width: 25 },
        { header: 'Días', dataKey: 'dias', width: 12 },
        { header: 'Estado', dataKey: 'estado', width: 22 },
        { header: 'Aprobó', dataKey: 'aprobadoPor', width: 35 },
        { header: 'F. Aprobación', dataKey: 'fechaAprobacion', width: 28 }
      ];
    } else if (this.activeTab === 'aprobar') {
      return [
        { header: 'ID', dataKey: 'id', width: 10 },
        { header: 'Empleado', dataKey: 'empleadoNombre', width: 40 },
        { header: 'Rol', dataKey: 'rol', width: 20 },
        { header: 'Tipo', dataKey: 'tipo', width: 25 },
        { header: 'Inicio', dataKey: 'fechaInicio', width: 25 },
        { header: 'Fin', dataKey: 'fechaFin', width: 25 },
        { header: 'Días', dataKey: 'dias', width: 12 },
        { header: 'F. Solicitud', dataKey: 'fechaSolicitud', width: 28 },
        { header: 'Motivo', dataKey: 'motivo', width: 50 }
      ];
    } else {
      // Historial - usar headers cortos para que quepan todas las columnas
      return [
        { header: 'ID', dataKey: 'id', width: 8 },
        { header: 'Empleado', dataKey: 'empleadoNombre', width: 35 },
        { header: 'Rol', dataKey: 'rol', width: 18 },
        { header: 'Tipo', dataKey: 'tipo', width: 22 },
        { header: 'Inicio', dataKey: 'fechaInicio', width: 22 },
        { header: 'Fin', dataKey: 'fechaFin', width: 22 },
        { header: 'Días', dataKey: 'dias', width: 10 },
        { header: 'Estado', dataKey: 'estado', width: 18 },
        { header: 'Aprobó', dataKey: 'aprobadoPor', width: 30 },
        { header: 'F. Solicitud', dataKey: 'fechaSolicitud', width: 25 },
        { header: 'F. Aprobación', dataKey: 'fechaAprobacion', width: 25 }
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
        empleadoNombre: this.truncarTexto(sol.empleadoNombre || '', 25),
        rol: this.formatRolExport(empleado?.rol || ''),
        tipo: this.formatTipoExport(sol.tipo || ''),
        fechaInicio: this.formatFechaExport(sol.fechaInicio || ''),
        fechaFin: this.formatFechaExport(sol.fechaFin || ''),
        dias: this.calcularDias(sol.fechaInicio || '', sol.fechaFin || ''),
        estado: this.formatEstadoExport(sol.estado || ''),
        aprobadoPor: this.truncarTexto(String(sol.aprobadoPor || sol.nombreAprobador || 'Pendiente'), 20),
        fechaSolicitud: this.formatFechaExport(sol.fechaSolicitud || ''),
        fechaAprobacion: this.formatFechaExport(sol.fechaAprobacion || ''),
        motivo: this.truncarTexto(sol.motivo || '', 40)
      };
    });
  }

  private truncarTexto(texto: string, maxLength: number): string {
    if (!texto) return '';
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
  }

  private formatRolExport(rol: string): string {
    const roles: { [key: string]: string } = {
      'admin': 'Admin',
      'supervisor': 'Supervisor',
      'tecnico': 'Técnico',
      'hd': 'HD',
      'noc': 'NOC'
    };
    return roles[rol?.toLowerCase()] || rol;
  }

  private formatTipoExport(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'vacaciones': 'Vacaciones',
      'permiso': 'Permiso',
      'descanso': 'Descanso',
      'compensacion': 'Compensación',
      'licencia': 'Licencia'
    };
    return tipos[tipo?.toLowerCase()] || tipo;
  }

  private formatEstadoExport(estado: string): string {
    const estados: { [key: string]: string } = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado'
    };
    return estados[estado?.toLowerCase()] || estado;
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

  async procesar(id: number, estado: string) {
    const estadoTexto = estado === 'aprobado' ? 'APROBAR' : 'RECHAZAR';
    const tipo = estado === 'aprobado' ? 'success' : 'danger';

    const confirmado = await this.notification.confirm({
      title: `${estadoTexto} Solicitud`,
      message: `¿Confirma que desea ${estadoTexto.toLowerCase()} esta solicitud?`,
      confirmText: estadoTexto,
      cancelText: 'Cancelar',
      type: tipo
    });

    if (!confirmado) return;

    this.solicitudesService.gestionarSolicitud(id, estado, this.currentUser.id).subscribe({
      next: () => {
        this.cargarDatos();
        if (estado === 'aprobado') {
          this.notification.success('La solicitud ha sido aprobada correctamente.', 'Solicitud aprobada');
        } else {
          this.notification.info('La solicitud ha sido rechazada.', 'Solicitud rechazada');
        }
      },
      error: () => this.notification.error('Error al procesar la solicitud', 'Error')
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
    this.mostrarModalConflictos = false;
    this.accionPendiente = null;
  }

  // Confirmar continuar a pesar de los conflictos
  confirmarConflictos() {
    this.mostrarModalConflictos = false;
    this.isLoading = true;

    if (this.accionPendiente === 'crear') {
      this.enviarSolicitud();
    } else if (this.accionPendiente === 'editar') {
      this.actualizarSolicitud();
    }

    this.accionPendiente = null;
  }

  // Cancelar la acción debido a conflictos
  cancelarConflictos() {
    this.mostrarModalConflictos = false;
    this.tieneConflictos = false;
    this.mensajeConflictos = '';
    this.conflictosDetectados = [];
    this.accionPendiente = null;
    this.isLoading = false;
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