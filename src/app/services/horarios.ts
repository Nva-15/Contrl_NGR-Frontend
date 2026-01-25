import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Horario, HorarioResponse, HorarioSemanal } from '../interfaces/horario';

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/horarios';

  getHorarios(): Observable<HorarioResponse[]> {
    return this.http.get<HorarioResponse[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  // Vista consolidada de todos los empleados con sus horarios semanales
  getVistaConsolidada(rol?: string): Observable<HorarioSemanal[]> {
    let params = new HttpParams();
    if (rol) {
      params = params.set('rol', rol);
    }
    return this.http.get<HorarioSemanal[]>(`${this.apiUrl}/consolidado`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  // Crear o actualizar horario de un dia especifico
  guardarHorarioDia(empleadoId: number, diaSemana: string, horario: Partial<Horario>): Observable<HorarioResponse> {
    return this.http.put<HorarioResponse>(`${this.apiUrl}/empleado/${empleadoId}/dia/${diaSemana}`, horario).pipe(
      catchError(this.handleError)
    );
  }

  getHorarioById(id: number): Observable<HorarioResponse> {
    return this.http.get<HorarioResponse>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getHorariosPorEmpleado(empleadoId: number): Observable<HorarioResponse[]> {
    return this.http.get<HorarioResponse[]>(`${this.apiUrl}/empleado/${empleadoId}`).pipe(
      catchError(this.handleError)
    );
  }

  crearHorario(horario: Horario): Observable<HorarioResponse> {
    return this.http.post<HorarioResponse>(this.apiUrl, horario).pipe(
      catchError(this.handleError)
    );
  }

  crearHorarioSemana(empleadoId: number, plantilla: Partial<Horario>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/semana/${empleadoId}`, plantilla).pipe(
      catchError(this.handleError)
    );
  }

  actualizarHorario(id: number, horario: Partial<Horario>): Observable<HorarioResponse> {
    return this.http.put<HorarioResponse>(`${this.apiUrl}/${id}`, horario).pipe(
      catchError(this.handleError)
    );
  }

  eliminarHorario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  eliminarHorariosPorEmpleado(empleadoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/empleado/${empleadoId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Error desconocido';
    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => errorMessage);
  }
}
