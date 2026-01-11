import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Solicitud, SolicitudResponse } from '../interfaces/solicitud';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/solicitudes';

  // Crear una nueva solicitud
  crearSolicitud(solicitud: any): Observable<SolicitudResponse> {
    return this.http.post<SolicitudResponse>(`${this.apiUrl}/crear`, solicitud);
  }

  // Obtener historial de mis solicitudes
  getMisSolicitudes(empleadoId: number): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/mis-solicitudes/${empleadoId}`);
  }

  // Obtener solicitudes pendientes (Para Jefes/Supervisores)
  getPendientes(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/pendientes`);
  }

  // Obtener historial completo (Para Admin)
  getTodas(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/todas`);
  }

  // Aprobar o Rechazar solicitud
  gestionarSolicitud(id: number, estado: string, usuarioId: number): Observable<SolicitudResponse> {
    return this.http.put<SolicitudResponse>(`${this.apiUrl}/gestionar/${id}`, { estado, usuarioId });
  }
}