import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Solicitud, SolicitudResponse } from '../interfaces/solicitud';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/solicitudes';

  // Crear una nueva solicitud
  crearSolicitud(solicitud: any): Observable<SolicitudResponse> {
    return this.http.post<SolicitudResponse>(`${this.apiUrl}/crear`, solicitud).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409) {
          return throwError(() => error.error.error || 'Conflicto de fechas detectado');
        }
        return throwError(() => error.error?.error || 'Error al crear solicitud');
      })
    );
  }

  // Obtener historial de mis solicitudes
  getMisSolicitudes(empleadoId: number): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/mis-solicitudes/${empleadoId}`);
  }

  // Obtener solicitudes pendientes (Para Jefes/Supervisores)
  getPendientes(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/pendientes`);
  }

  // Obtener todas las solicitudes
  getTodas(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/todas`);
  }

  // Obtener historial (excluyendo pendientes)
  getHistorial(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/historial`);
  }

  // Obtener una solicitud por ID
  getSolicitudById(id: number): Observable<SolicitudResponse> {
    return this.http.get<SolicitudResponse>(`${this.apiUrl}/${id}`);
  }

  // Aprobar o Rechazar solicitud
  gestionarSolicitud(id: number, estado: string, usuarioId: number, comentarios?: string): Observable<SolicitudResponse> {
    const payload: any = { estado, usuarioId };
    if (comentarios) {
      payload.comentarios = comentarios;
    }
    return this.http.put<SolicitudResponse>(`${this.apiUrl}/gestionar/${id}`, payload);
  }

  // Editar solicitud
  editarSolicitud(id: number, datos: any): Observable<SolicitudResponse> {
    return this.http.put<SolicitudResponse>(`${this.apiUrl}/editar/${id}`, datos);
  }

  // Verificar conflictos de fechas
  verificarConflictos(empleadoId: number, fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-conflictos`, {
      empleadoId,
      fechaInicio,
      fechaFin
    });
  }

  // Exportar solicitudes
  exportarSolicitudes(tipo: string, empleadoId?: number, formato: string = 'json'): Observable<any> {
    let params = new HttpParams().set('formato', formato);
    if (empleadoId) {
      params = params.set('empleadoId', empleadoId.toString());
    }
    return this.http.get(`${this.apiUrl}/exportar/${tipo}`, { params });
  }
}