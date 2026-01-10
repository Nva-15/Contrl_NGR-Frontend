import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { LoginRequest, AuthResponse, TokenVerifyResponse } from '../interfaces/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {
    this.initializeAuthState();
  }

  initializeAuthState() {
    const token = localStorage.getItem('token');
    if (token && this.isTokenExpired(token)) {
      this.logout();
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('currentEmpleado', JSON.stringify(response.empleado));
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentEmpleado');
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentEmpleado(): any {
    const empleado = localStorage.getItem('currentEmpleado');
    return empleado ? JSON.parse(empleado) : null;
  }

  hasRole(role: string): boolean {
    const empleado = this.getCurrentEmpleado();
    if (!empleado) return false;
    
    const userRole = 'ROLE_' + empleado.rol.toUpperCase();
    const requestedRole = role.toUpperCase();
    
    return userRole === requestedRole || 
           requestedRole.includes(userRole.replace('ROLE_', '')) ||
           userRole.includes(requestedRole.replace('ROLE_', ''));
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isSupervisor(): boolean {
    return this.hasRole('SUPERVISOR');
  }

  isTecnico(): boolean {
    return this.hasRole('TECNICO');
  }

  verifyToken(): Observable<TokenVerifyResponse> {
    return this.http.post<TokenVerifyResponse>(`${this.apiUrl}/verify`, {});
  }

  cambiarPassword(username: string, passwordActual: string, passwordNueva: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/cambiar-password`, {
      username,
      passwordActual,
      passwordNueva
    });
  }
}