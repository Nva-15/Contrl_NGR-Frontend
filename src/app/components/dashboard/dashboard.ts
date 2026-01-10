import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AsistenciaService } from '../../services/asistencia';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private asistenciaService = inject(AsistenciaService);
  private router = inject(Router);

  currentEmpleado: any;
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

    this.cargarAsistenciaHoy();
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
        // Usar datos de ejemplo temporalmente
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
    return hora.substring(0, 5);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isSupervisor(): boolean {
    return this.authService.isSupervisor();
  }

  isTecnico(): boolean {
    return this.authService.isTecnico();
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}