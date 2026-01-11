import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ImagenService } from '../../services/imagen'; // <-- NUEVO IMPORT

@Component({
  selector: 'app-main-layout',
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private imagenService = inject(ImagenService); // <-- NUEVA INYECCIÓN
  private router = inject(Router);

  currentEmpleado: any;

  ngOnInit() {
    this.currentEmpleado = this.authService.getCurrentEmpleado();
    
    if (!this.currentEmpleado) {
      this.router.navigate(['/login']);
    }
  }

  // NUEVO MÉTODO PARA FOTO
  getFotoUrl(): string {
    return this.imagenService.getEmpleadoFotoUrl(
      this.currentEmpleado?.foto,
      this.currentEmpleado?.nombre
    );
  }

  // NUEVO MÉTODO PARA ERRORES
  onImageError(event: Event): void {
    this.imagenService.handleImageError(event);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isSupervisor(): boolean {
    return this.authService.isSupervisor();
  }
}