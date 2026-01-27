import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
import { AsistenciaService } from '../../services/asistencia';
import { EmpleadosService } from '../../services/empleados';
import { HorariosService } from '../../services/horarios';
import { HorarioSemanal, HorarioDia } from '../../interfaces/horario';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  @ViewChild('fileInputModal') fileInputModal!: ElementRef;

  private auth = inject(AuthService);
  private asistenciaService = inject(AsistenciaService);
  private empleadosService = inject(EmpleadosService);
  private horariosService = inject(HorariosService);
  private http = inject(HttpClient);
  private router = inject(Router);

  currentEmpleado: any;
  fotoUrl: string = '';

  fechaActual = new Date();
  asistenciaHoy: any = null;
  isLoading = true;

  tipoMarcaje: 'entrada' | 'salida' = 'entrada';
  observaciones = '';

  // Modal de actualización de datos
  mostrarModalPerfil = false;
  isUpdating = false;
  mensajeModal = '';
  mensajeErrorModal = '';

  // Campos editables del modal
  descripcionEdit = '';
  hobbyEdit = '';
  fotoPreviewModal: string | null = null;
  fotoFileModal: File | null = null;

  // Cambio de contraseña
  mostrarSeccionPassword = false;
  passwordActual = '';
  passwordNueva = '';
  passwordConfirmar = '';

  // Horario semanal del empleado
  horarioSemanal: HorarioSemanal | null = null;
  isLoadingHorario = false;
  diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  diasLabels: { [key: string]: string } = {
    'lunes': 'Lun', 'martes': 'Mar', 'miercoles': 'Mié',
    'jueves': 'Jue', 'viernes': 'Vie', 'sabado': 'Sáb', 'domingo': 'Dom'
  };

  ngOnInit() {
    this.currentEmpleado = this.auth.getCurrentEmpleado();
    
    if (!this.currentEmpleado) {
      this.router.navigate(['/login']);
      return;
    }

    // Generar URL de foto de perfil
    this.fotoUrl = this.getFotoUrl(
      this.currentEmpleado.foto,
      this.currentEmpleado.nombre
    );

    this.cargarAsistencia();
    this.cargarHorario();
  }

  private getFotoUrl(fotoPath: string | undefined, nombre: string): string {
    if (!fotoPath || fotoPath === 'img/perfil.png') {
      return this.getAvatarPlaceholder(nombre);
    }
    
    if (fotoPath.startsWith('http')) {
      return fotoPath;
    }
    
    const baseUrl = 'http://localhost:8080';
    return `${baseUrl}/${fotoPath}`;
  }

  private getAvatarPlaceholder(nombre: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0d6efd&color=fff&size=150`;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = this.getAvatarPlaceholder(this.currentEmpleado?.nombre || 'Usuario');
  }

  // Carga asistencia del día actual
  cargarAsistencia() {
    this.isLoading = true;
    this.asistenciaService.getAsistenciasPorEmpleado(this.currentEmpleado.id).subscribe({
      next: (data: any[]) => {
        // Fecha local YYYY-MM-DD
        const hoy = new Date().toLocaleDateString('en-CA'); 

        this.asistenciaHoy = data.find((a: any) => {
          return a.fecha && a.fecha.toString().substring(0, 10) === hoy;
        }) || null;
        
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.asistenciaHoy = null;
      }
    });
  }

  marcarAsistencia() {
    if (!this.currentEmpleado) return;

    const req = {
      empleadoId: this.currentEmpleado.id,
      tipo: this.tipoMarcaje,
      observaciones: this.observaciones.trim() || undefined
    };

    this.asistenciaService.registrarAsistencia(req).subscribe({
      next: (res: any) => {
        const hora = this.tipoMarcaje === 'entrada' ? res.horaEntrada : res.horaSalida;
        alert(`✅ Registrado: ${hora}`);
        this.observaciones = '';
        this.cargarAsistencia(); // Actualizar botones
      },
      error: (e: any) => {
        // Error desde backend (ej. ya marcó entrada)
        alert(`⚠️ ${e.error?.error || 'Error al registrar'}`);
        this.cargarAsistencia(); 
      }
    });
  }

  // Habilitar entrada si no existe registro
  puedeMarcarEntrada(): boolean {
    return !this.asistenciaHoy;
  }

  // Habilitar salida si hay entrada y no salida
  puedeMarcarSalida(): boolean {
    return this.asistenciaHoy && this.asistenciaHoy.horaEntrada && !this.asistenciaHoy.horaSalida;
  }

  getEstadoAsistencia(): string {
    if (!this.asistenciaHoy) return 'SIN REGISTRO';
    if (this.asistenciaHoy.horaEntrada && !this.asistenciaHoy.horaSalida) return 'EN TRABAJO';
    if (this.asistenciaHoy.horaEntrada && this.asistenciaHoy.horaSalida) return 'COMPLETADO';
    return '-';
  }

  getBadgeColor(): string {
    switch(this.getEstadoAsistencia()) {
      case 'EN TRABAJO': return 'success';
      case 'COMPLETADO': return 'primary';
      case 'SIN REGISTRO': return 'warning';
      default: return 'secondary';
    }
  }

  getHoraFormateada(hora: string | undefined): string {
    return hora ? hora.substring(0, 5) : '--:--';
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  isSupervisor(): boolean {
    return this.auth.isSupervisor();
  }
  
  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  irASolicitudes() {
    const tab = (this.isAdmin() || this.isSupervisor()) ? 'aprobar' : 'mis-solicitudes';
    this.router.navigate(['/solicitudes'], { queryParams: { tab } });
  }

  getUserRole(): string {
    return this.auth.getUserRole();
  }

  getRolDisplayName(): string {
    return this.auth.getRolDisplayName();
  }

  // ========== MODAL DE PERFIL ==========

  abrirModalPerfil() {
    this.descripcionEdit = this.currentEmpleado?.descripcion || '';
    this.hobbyEdit = this.currentEmpleado?.hobby || '';
    this.fotoPreviewModal = null;
    this.fotoFileModal = null;
    this.mostrarSeccionPassword = false;
    this.passwordActual = '';
    this.passwordNueva = '';
    this.passwordConfirmar = '';
    this.mensajeModal = '';
    this.mensajeErrorModal = '';
    this.mostrarModalPerfil = true;
  }

  cerrarModalPerfil() {
    this.mostrarModalPerfil = false;
    this.fotoPreviewModal = null;
    this.fotoFileModal = null;
    if (this.fileInputModal) {
      this.fileInputModal.nativeElement.value = '';
    }
  }

  onFileSelectedModal(event: any) {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        this.mostrarErrorModal('Solo se permiten imágenes (JPEG, PNG, GIF)');
        event.target.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.mostrarErrorModal('La imagen no debe superar los 5MB');
        event.target.value = '';
        return;
      }

      this.fotoFileModal = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreviewModal = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  cancelarFotoModal() {
    this.fotoPreviewModal = null;
    this.fotoFileModal = null;
    if (this.fileInputModal) {
      this.fileInputModal.nativeElement.value = '';
    }
  }

  guardarDatosPersonales() {
    if (!this.currentEmpleado?.id) return;

    this.isUpdating = true;
    this.mensajeErrorModal = '';

    const datos = {
      descripcion: this.descripcionEdit.trim(),
      hobby: this.hobbyEdit.trim()
    };

    // Usar endpoint de auth que está disponible para todos los usuarios
    this.http.put('http://localhost:8080/api/auth/perfil/actualizar', datos, {
      headers: { 'Authorization': `Bearer ${this.auth.getToken()}` }
    }).subscribe({
      next: () => {
        this.currentEmpleado.descripcion = this.descripcionEdit.trim();
        this.currentEmpleado.hobby = this.hobbyEdit.trim();
        localStorage.setItem('currentEmpleado', JSON.stringify(this.currentEmpleado));
        this.mostrarMensajeModal('Datos actualizados correctamente');
        this.isUpdating = false;
      },
      error: (e: any) => {
        this.mostrarErrorModal(e.error?.error || 'Error al actualizar datos');
        this.isUpdating = false;
      }
    });
  }

  guardarFoto() {
    if (!this.currentEmpleado?.id || !this.fotoFileModal) return;

    this.isUpdating = true;
    this.mensajeErrorModal = '';

    const formData = new FormData();
    formData.append('archivo', this.fotoFileModal);

    this.http.post(`http://localhost:8080/api/imagenes/upload/${this.currentEmpleado.id}`, formData, {
      headers: { 'Authorization': `Bearer ${this.auth.getToken()}` }
    }).subscribe({
      next: (response: any) => {
        if (response.success && response.ruta) {
          this.currentEmpleado.foto = response.ruta;
          localStorage.setItem('currentEmpleado', JSON.stringify(this.currentEmpleado));
          this.fotoUrl = this.getFotoUrl(response.ruta, this.currentEmpleado.nombre);
          this.mostrarMensajeModal('Foto actualizada correctamente');
          this.cancelarFotoModal();
        }
        this.isUpdating = false;
      },
      error: (e) => {
        this.mostrarErrorModal(e.error?.error || 'Error al subir la imagen');
        this.isUpdating = false;
      }
    });
  }

  cambiarPassword() {
    if (!this.currentEmpleado?.username) return;

    if (!this.passwordActual || !this.passwordNueva || !this.passwordConfirmar) {
      this.mostrarErrorModal('Todos los campos de contraseña son requeridos');
      return;
    }

    if (this.passwordNueva.length < 6) {
      this.mostrarErrorModal('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (this.passwordNueva !== this.passwordConfirmar) {
      this.mostrarErrorModal('Las contraseñas no coinciden');
      return;
    }

    this.isUpdating = true;
    this.mensajeErrorModal = '';

    this.auth.cambiarPassword(
      this.currentEmpleado.username,
      this.passwordActual,
      this.passwordNueva
    ).subscribe({
      next: () => {
        this.mostrarMensajeModal('Contraseña cambiada exitosamente');
        this.passwordActual = '';
        this.passwordNueva = '';
        this.passwordConfirmar = '';
        this.mostrarSeccionPassword = false;
        this.isUpdating = false;
      },
      error: (e) => {
        this.mostrarErrorModal(e.error?.error || 'Error al cambiar contraseña');
        this.isUpdating = false;
      }
    });
  }

  private mostrarMensajeModal(msg: string) {
    this.mensajeModal = msg;
    this.mensajeErrorModal = '';
    setTimeout(() => this.mensajeModal = '', 4000);
  }

  private mostrarErrorModal(msg: string) {
    this.mensajeErrorModal = msg;
    this.mensajeModal = '';
    setTimeout(() => this.mensajeErrorModal = '', 5000);
  }

  getNivelDisplay(nivel: string): string {
    switch (nivel?.toLowerCase()) {
      case 'jefe': return 'Jefe/Gerente';
      case 'supervisor': return 'Supervisor';
      case 'tecnico': return 'Técnico';
      case 'hd': return 'HD';
      case 'bo': return 'Back Office';
      case 'noc': return 'NOC';
      default: return nivel || 'Sin nivel';
    }
  }

  // ========== HORARIO SEMANAL ==========

  cargarHorario() {
    if (!this.currentEmpleado?.id) return;
    // Admin no tiene horarios
    if (this.currentEmpleado.rol === 'admin') return;

    this.isLoadingHorario = true;
    this.horariosService.getHorarioSemanalEmpleado(this.currentEmpleado.id).subscribe({
      next: (data) => {
        this.horarioSemanal = data;
        this.isLoadingHorario = false;
      },
      error: () => {
        this.isLoadingHorario = false;
        this.horarioSemanal = null;
      }
    });
  }

  getHorarioDia(dia: string): HorarioDia | null {
    if (!this.horarioSemanal) return null;
    const horarios = this.horarioSemanal.horariosSemana as any;
    return horarios[dia] || null;
  }

  getTipoDiaLabel(tipo: string | undefined): string {
    switch (tipo) {
      case 'descanso': return 'Descanso';
      case 'compensado': return 'Compensado';
      case 'vacaciones': return 'Vacaciones';
      default: return 'Normal';
    }
  }

  tieneHorarioAsignado(): boolean {
    if (!this.horarioSemanal) return false;
    return this.diasSemana.some(dia => this.getHorarioDia(dia) !== null);
  }

  getRolDisplay(rol: string): string {
    switch (rol?.toLowerCase()) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'tecnico': return 'Técnico';
      case 'hd': return 'HD';
      case 'noc': return 'NOC';
      default: return rol || 'Sin rol';
    }
  }
}