import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { AsistenciaService } from '../../services/asistencia';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], 
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private asistenciaService = inject(AsistenciaService);
  private router = inject(Router);

  currentEmpleado: any;
  fotoUrl: string = '';
  
  fechaActual = new Date();
  asistenciaHoy: any = null;
  isLoading = true;
  
  tipoMarcaje: 'entrada' | 'salida' = 'entrada';
  observaciones = '';

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
}