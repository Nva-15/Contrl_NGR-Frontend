import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AsistenciaService } from '../../services/asistencia';
import { ImagenService } from '../../services/imagen';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true, // Asumo que es standalone por los imports
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private asistenciaService = inject(AsistenciaService);
  private imagenService = inject(ImagenService);
  private router = inject(Router);

  currentEmpleado: any;
  // Variable para guardar la URL estable de la foto
  fotoUrl: string = '';
  
  fechaActual = new Date();
  asistenciaHoy: any = null;
  isLoading = true;
  
  tipoMarcaje: 'entrada' | 'salida' = 'entrada';
  observaciones = '';

  ngOnInit() {
    this.currentEmpleado = this.authService.getCurrentEmpleado();
    
    if (!this.currentEmpleado) {
      this.router.navigate(['/login']);
      return;
    }

    // CALCULAR LA URL DE LA FOTO UNA ÚNICA VEZ AQUÍ
    // Esto evita el error NG0100
    this.fotoUrl = this.imagenService.getEmpleadoFotoUrl(
      this.currentEmpleado.foto, 
      this.currentEmpleado.nombre
    );
    
    console.log('🖼️ URL Foto generada:', this.fotoUrl);
    
    this.cargarAsistenciaHoy();
  }

  // Método para manejar error de carga de imagen
  onImageError(event: Event): void {
    this.imagenService.handleImageError(event, this.currentEmpleado?.nombre);
  }

  cargarAsistenciaHoy() {
    this.isLoading = true;
    this.asistenciaService.getAsistenciasPorEmpleado(this.currentEmpleado.id).subscribe({
      next: (asistencias: any[]) => {
        const hoy = new Date().toISOString().split('T')[0];
        this.asistenciaHoy = asistencias.find((a: any) => {
          if (!a.fecha) return false;
          const fechaAsistencia = new Date(a.fecha).toISOString().split('T')[0];
          return fechaAsistencia === hoy;
        }) || null;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error cargando asistencia:', error);
        this.isLoading = false;
        this.asistenciaHoy = null;
      }
    });
  }

  marcarAsistencia() {
    if (!this.currentEmpleado) return;

    const request = {
      empleadoId: this.currentEmpleado.id,
      tipo: this.tipoMarcaje,
      observaciones: this.observaciones.trim() || undefined
    };

    this.asistenciaService.registrarAsistencia(request).subscribe({
      next: (response: any) => {
        alert(`Asistencia registrada exitosamente\nHora: ${this.tipoMarcaje === 'entrada' ? response.horaEntrada : response.horaSalida}`);
        this.observaciones = '';
        this.cargarAsistenciaHoy();
      },
      error: (error: any) => {
        alert(`Error: ${error.error?.error || 'No se pudo registrar la asistencia'}`);
      }
    });
  }

  puedeMarcarSalida(): boolean {
    return this.asistenciaHoy?.horaEntrada && !this.asistenciaHoy?.horaSalida;
  }

  puedeMarcarEntrada(): boolean {
    return !this.asistenciaHoy?.horaEntrada;
  }

  getEstadoAsistencia(): string {
    if (!this.asistenciaHoy) return 'SIN REGISTRO';
    if (this.asistenciaHoy.horaEntrada && !this.asistenciaHoy.horaSalida) return 'EN TRABAJO';
    if (this.asistenciaHoy.horaEntrada && this.asistenciaHoy.horaSalida) return 'COMPLETADO';
    return 'AUSENTE';
  }

  getBadgeColor(): string {
    const estado = this.getEstadoAsistencia();
    switch(estado) {
      case 'EN TRABAJO': return 'success';
      case 'COMPLETADO': return 'primary';
      case 'AUSENTE': return 'secondary';
      default: return 'warning';
    }
  }

  getHoraFormateada(hora: string | undefined): string {
    if (!hora) return '--:--';
    // Asegurar formato HH:mm
    return hora.length > 5 ? hora.substring(0, 5) : hora;
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isSupervisor(): boolean {
    return this.authService.isSupervisor();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}