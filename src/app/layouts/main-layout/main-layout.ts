import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ApiConfigService } from '../../services/api-config.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private apiConfig = inject(ApiConfigService);

  currentEmpleado: any;
  fotoUrl: string = '';
  isMenuCollapsed = false;

  ngOnInit() {
    this.currentEmpleado = this.auth.getCurrentEmpleado();
    
    if (!this.currentEmpleado) {
      this.router.navigate(['/login']);
      return;
    }

    // Generar URL de foto de perfil
    this.fotoUrl = this.getFotoUrl(
      this.currentEmpleado?.foto,
      this.currentEmpleado?.nombre
    );
  }

  private getFotoUrl(fotoPath: string | undefined, nombre: string): string {
    if (!fotoPath || fotoPath === 'img/perfil.png') {
      return this.getAvatarPlaceholder(nombre);
    }

    if (fotoPath.startsWith('http')) {
      return fotoPath;
    }

    return `${this.apiConfig.baseUrl}/${fotoPath}`;
  }

  private getAvatarPlaceholder(nombre: string): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=0d6efd&color=fff&size=40`;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = this.getAvatarPlaceholder(this.currentEmpleado?.nombre || 'Usuario');
  }

  toggleMenu() {
    this.isMenuCollapsed = !this.isMenuCollapsed;
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

  isTecnico(): boolean {
    return this.auth.isTecnico();
  }

  isHD(): boolean {
    return this.auth.isHD();
  }

  isNOC(): boolean {
    return this.auth.isNOC();
  }

  getRolDisplayName(): string {
    return this.auth.getRolDisplayName();
  }

  puedeGestionarEmpleados(): boolean {
    return this.auth.puedeGestionarEmpleados();
  }

  getUserRole(): string {
    return this.auth.getUserRole();
  }
}