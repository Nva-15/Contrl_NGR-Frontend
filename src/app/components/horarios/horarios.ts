import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HorariosService } from '../../services/horarios';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification.service';
import { ExportService } from '../../services/export';
import { HorarioSemanal, HorarioDia } from '../../interfaces/horario';

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './horarios.html',
  styleUrls: ['./horarios.css']
})
export class HorariosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private horariosService = inject(HorariosService);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);
  private exportService = inject(ExportService);

  horarioForm: FormGroup;

  horariosSemanales: HorarioSemanal[] = [];
  horariosFiltrados: HorarioSemanal[] = [];

  isLoading = false;
  filtroRol = '';
  filtroBusqueda = '';

  // Modal de edicion
  mostrarModal = false;
  empleadoEditando: HorarioSemanal | null = null;
  diaEditando: string = '';
  horarioActual: HorarioDia | null = null;

  // Aplicar a multiples dias
  aplicarAOtrosDias = false;
  diasSeleccionados: { [key: string]: boolean } = {};

  diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

  diasLabels: { [key: string]: string } = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo'
  };

  // Admin no tiene horarios, solo supervisor, tecnico, hd, noc
  roles = [
    { value: '', label: 'Todos los roles' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'hd', label: 'HD' },
    { value: 'noc', label: 'NOC' }
  ];

  tiposDia = [
    { value: 'normal', label: 'Normal', color: 'success' },
    { value: 'descanso', label: 'Descanso', color: 'secondary' },
    { value: 'compensado', label: 'Dia Compensado', color: 'info' },
    { value: 'vacaciones', label: 'Vacaciones', color: 'warning' }
  ];

  constructor() {
    this.horarioForm = this.initForm();
  }

  ngOnInit() {
    this.cargarDatos();
  }

  initForm(): FormGroup {
    return this.fb.group({
      tipoDia: ['normal', Validators.required],
      horaEntrada: ['08:00'],
      horaSalida: ['17:00'],
      horaAlmuerzoInicio: ['12:00'],
      horaAlmuerzoFin: ['13:00']
    });
  }

  cargarDatos() {
    this.isLoading = true;
    const rol = this.filtroRol || undefined;

    this.horariosService.getVistaConsolidada(rol).subscribe({
      next: (data) => {
        this.horariosSemanales = data;
        this.aplicarFiltros();
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Error al cargar horarios', 'Error');
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros() {
    this.horariosFiltrados = this.horariosSemanales.filter(h => {
      if (this.filtroBusqueda) {
        return h.empleadoNombre.toLowerCase().includes(this.filtroBusqueda.toLowerCase());
      }
      return true;
    });
  }

  onFiltroRolChange() {
    this.cargarDatos();
  }

  getHorarioDia(empleado: HorarioSemanal, dia: string): HorarioDia | null {
    const horarios = empleado.horariosSemana as any;
    return horarios[dia] || null;
  }

  getTipoDiaClass(horario: HorarioDia | null): string {
    if (!horario) return 'sin-horario';
    const tipo = horario.tipoDia || 'normal';
    switch (tipo) {
      case 'descanso': return 'bg-secondary text-white';
      case 'compensado': return 'bg-info text-white';
      case 'vacaciones': return 'bg-warning text-dark';
      default: return 'bg-light';
    }
  }

  getTipoDiaLabel(tipo: string | undefined): string {
    if (!tipo) return 'Normal';
    const tipoObj = this.tiposDia.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  getRolLabel(rol: string): string {
    const rolUpper = rol?.toUpperCase() || '';
    switch (rolUpper) {
      case 'ADMIN': return 'Admin';
      case 'SUPERVISOR': return 'Supervisor';
      case 'TECNICO': return 'Tecnico';
      case 'HD': return 'HD';
      case 'NOC': return 'NOC';
      default: return rol;
    }
  }

  getRolClass(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin': return 'badge bg-danger';
      case 'supervisor': return 'badge bg-primary';
      case 'tecnico': return 'badge bg-success';
      case 'hd': return 'badge bg-info';
      case 'noc': return 'badge bg-warning text-dark';
      default: return 'badge bg-secondary';
    }
  }

  // ========== EXPORTAR ==========

  exportarExcel() {
    if (this.horariosFiltrados.length === 0) {
      this.notification.warning('No hay datos para exportar', 'Aviso');
      return;
    }

    const data = this.prepararDatosExport();
    const nombre = this.filtroRol
      ? `horario_semanal_${this.filtroRol}`
      : 'horario_semanal';

    this.exportService.exportToExcel(data, nombre, 'Horarios');
    this.notification.success('Archivo Excel generado', 'Exportar');
  }

  exportarPdf() {
    if (this.horariosFiltrados.length === 0) {
      this.notification.warning('No hay datos para exportar', 'Aviso');
      return;
    }

    const data = this.prepararDatosExport();
    const columns = [
      { header: 'Empleado', dataKey: 'empleado' },
      { header: 'Cargo', dataKey: 'cargo' },
      { header: 'Lunes', dataKey: 'lunes' },
      { header: 'Martes', dataKey: 'martes' },
      { header: 'Miércoles', dataKey: 'miercoles' },
      { header: 'Jueves', dataKey: 'jueves' },
      { header: 'Viernes', dataKey: 'viernes' },
      { header: 'Sábado', dataKey: 'sabado' },
      { header: 'Domingo', dataKey: 'domingo' }
    ];

    const titulo = this.filtroRol
      ? `Horario Semanal - ${this.getRolLabel(this.filtroRol)}`
      : 'Horario Semanal';

    this.exportService.exportToPDF(data, columns, {
      title: titulo,
      orientation: 'landscape',
      filename: this.filtroRol ? `horario_semanal_${this.filtroRol}` : 'horario_semanal',
      fontSize: 7,
      autoColumnWidth: true
    });
    this.notification.success('Archivo PDF generado', 'Exportar');
  }

  private prepararDatosExport(): any[] {
    return this.horariosFiltrados.map(emp => {
      const row: any = {
        empleado: emp.empleadoNombre,
        cargo: emp.empleadoCargo || ''
      };

      this.diasSemana.forEach(dia => {
        const horario = this.getHorarioDia(emp, dia);
        if (!horario) {
          row[dia] = 'Sin horario';
        } else if (horario.tipoDia === 'descanso') {
          row[dia] = 'DESCANSO';
        } else if (horario.tipoDia === 'vacaciones') {
          row[dia] = 'VACACIONES';
        } else if (horario.tipoDia === 'compensado') {
          row[dia] = 'COMPENSADO';
        } else {
          const entrada = horario.horaEntrada || '--';
          const salida = horario.horaSalida || '--';
          row[dia] = `${entrada} - ${salida}`;
          if (horario.horaAlmuerzoInicio && horario.horaAlmuerzoFin) {
            row[dia] += ` (Alm: ${horario.horaAlmuerzoInicio}-${horario.horaAlmuerzoFin})`;
          }
        }
      });

      return row;
    });
  }

  // ========== MODAL EDITAR ==========

  editarHorario(empleado: HorarioSemanal, dia: string) {
    if (!this.tienePermiso()) return;

    this.empleadoEditando = empleado;
    this.diaEditando = dia;
    this.horarioActual = this.getHorarioDia(empleado, dia);

    // Reset dias seleccionados
    this.aplicarAOtrosDias = false;
    this.diasSeleccionados = {};
    this.diasSemana.forEach(d => {
      this.diasSeleccionados[d] = false;
    });

    if (this.horarioActual) {
      this.horarioForm.patchValue({
        tipoDia: this.horarioActual.tipoDia || 'normal',
        horaEntrada: this.horarioActual.horaEntrada || '08:00',
        horaSalida: this.horarioActual.horaSalida || '17:00',
        horaAlmuerzoInicio: this.horarioActual.horaAlmuerzoInicio || '12:00',
        horaAlmuerzoFin: this.horarioActual.horaAlmuerzoFin || '13:00'
      });
    } else {
      this.horarioForm.reset({
        tipoDia: 'normal',
        horaEntrada: '08:00',
        horaSalida: '17:00',
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin: '13:00'
      });
    }

    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.empleadoEditando = null;
    this.diaEditando = '';
    this.horarioActual = null;
    this.aplicarAOtrosDias = false;
    this.diasSeleccionados = {};
  }

  getDiasParaAplicar(): string[] {
    if (!this.aplicarAOtrosDias) return [];
    return this.diasSemana.filter(d => d !== this.diaEditando && this.diasSeleccionados[d]);
  }

  guardarHorario() {
    if (!this.empleadoEditando || !this.diaEditando) return;

    const formValue = this.horarioForm.value;
    this.isLoading = true;

    const payload: any = {
      tipoDia: formValue.tipoDia
    };

    // Solo enviar horas si el tipo es normal
    if (formValue.tipoDia === 'normal') {
      payload.horaEntrada = formValue.horaEntrada;
      payload.horaSalida = formValue.horaSalida;
      payload.horaAlmuerzoInicio = formValue.horaAlmuerzoInicio;
      payload.horaAlmuerzoFin = formValue.horaAlmuerzoFin;
    } else {
      payload.horaEntrada = null;
      payload.horaSalida = null;
      payload.horaAlmuerzoInicio = null;
      payload.horaAlmuerzoFin = null;
    }

    // Si hay dias adicionales seleccionados, usar endpoint de multiples dias
    const diasExtras = this.getDiasParaAplicar();
    if (diasExtras.length > 0) {
      const todosLosDias = [this.diaEditando, ...diasExtras];
      const multiPayload = {
        ...payload,
        dias: todosLosDias
      };

      this.horariosService.aplicarHorarioMultiplesDias(
        this.empleadoEditando.empleadoId,
        multiPayload
      ).subscribe({
        next: () => {
          this.notification.success(
            `Horario aplicado a ${todosLosDias.length} dia(s) correctamente`,
            'Exito'
          );
          this.cerrarModal();
          this.cargarDatos();
        },
        error: (error) => {
          this.notification.error(error || 'Error al aplicar horario', 'Error');
          this.isLoading = false;
        }
      });
    } else {
      // Guardar solo el dia actual
      this.horariosService.guardarHorarioDia(
        this.empleadoEditando.empleadoId,
        this.diaEditando,
        payload
      ).subscribe({
        next: () => {
          this.notification.success('Horario guardado correctamente', 'Exito');
          this.cerrarModal();
          this.cargarDatos();
        },
        error: (error) => {
          this.notification.error(error || 'Error al guardar horario', 'Error');
          this.isLoading = false;
        }
      });
    }
  }

  onTipoDiaChange() {
    const tipoDia = this.horarioForm.get('tipoDia')?.value;
    const esNormal = tipoDia === 'normal';

    if (!esNormal) {
      this.horarioForm.patchValue({
        horaEntrada: '',
        horaSalida: '',
        horaAlmuerzoInicio: '',
        horaAlmuerzoFin: ''
      });
    } else {
      this.horarioForm.patchValue({
        horaEntrada: '08:00',
        horaSalida: '17:00',
        horaAlmuerzoInicio: '12:00',
        horaAlmuerzoFin: '13:00'
      });
    }
  }

  tienePermiso(): boolean {
    const rol = this.authService.getUserRole();
    return rol === 'admin' || rol === 'supervisor';
  }
}
