import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ImagenService } from '../../services/imagen';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private imagenService = inject(ImagenService);
  private router = inject(Router);

  currentEmpleado: any;
  fotoUrl: string = ''; // Variable para URL fija

  ngOnInit() {
    this.currentEmpleado = this.auth.getCurrentEmpleado();
    
    if (!this.currentEmpleado) {
      this.router.navigate(['/login']);
      return;
    }

    // Generar URL una sola vez al inicio
    this.fotoUrl = this.imagenService.getEmpleadoFotoUrl(
      this.currentEmpleado?.foto,
      this.currentEmpleado?.nombre
    );
  }

  onImageError(event: Event): void {
    this.imagenService.handleImageError(event);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  isSupervisor(): boolean {
    return this.auth.isSupervisor();
  }
}