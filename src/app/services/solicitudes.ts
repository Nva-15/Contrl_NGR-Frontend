import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Solicitud, SolicitudResponse } from '../interfaces/solicitud';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/solicitudes';

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

  getMisSolicitudes(empleadoId: number): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/mis-solicitudes/${empleadoId}`);
  }

  getPendientes(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/pendientes`);
  }

  getTodas(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/todas`);
  }

  getHistorial(): Observable<SolicitudResponse[]> {
    return this.http.get<SolicitudResponse[]>(`${this.apiUrl}/historial`);
  }

  getSolicitudById(id: number): Observable<SolicitudResponse> {
    return this.http.get<SolicitudResponse>(`${this.apiUrl}/${id}`);
  }

  gestionarSolicitud(id: number, estado: string, usuarioId: number, comentarios?: string): Observable<SolicitudResponse> {
    const payload: any = { estado, usuarioId };
    if (comentarios) {
      payload.comentarios = comentarios;
    }
    return this.http.put<SolicitudResponse>(`${this.apiUrl}/gestionar/${id}`, payload);
  }

  editarSolicitud(id: number, datos: any): Observable<SolicitudResponse> {
    return this.http.put<SolicitudResponse>(`${this.apiUrl}/editar/${id}`, datos);
  }

  verificarConflictos(empleadoId: number, fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-conflictos`, {
      empleadoId,
      fechaInicio,
      fechaFin
    });
  }

  verificarDisponibilidadEquipo(fechaInicio: string, fechaFin: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verificar-disponibilidad-equipo`, {
      fechaInicio,
      fechaFin
    });
  }

  verificarConflictosCompletos(empleadoId: number, fechaInicio: string, fechaFin: string): Observable<any> {
    return forkJoin({
      conflictosPropios: this.verificarConflictos(empleadoId, fechaInicio, fechaFin),
      conflictosEquipo: this.verificarDisponibilidadEquipo(fechaInicio, fechaFin)
    }).pipe(
      map(resultado => ({
        conflictosPropios: resultado.conflictosPropios.conflictos || [],
        tieneConflictosPropios: resultado.conflictosPropios.tieneConflictos || false,
        conflictosGlobales: resultado.conflictosEquipo.conflictos || [],
        tieneConflictosGlobales: resultado.conflictosEquipo.tieneConflictos || false,
        tieneConflictosTotales: (resultado.conflictosPropios.tieneConflictos || false) || 
                               (resultado.conflictosEquipo.tieneConflictos || false)
      }))
    );
  }

  exportarSolicitudes(tipo: string, empleadoId?: number, formato: string = 'json'): Observable<any> {
    let params = new HttpParams().set('formato', formato);
    if (empleadoId) {
      params = params.set('empleadoId', empleadoId.toString());
    }
    return this.http.get(`${this.apiUrl}/exportar/${tipo}`, { params });
  }
}