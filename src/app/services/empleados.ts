import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Empleado, EmpleadoResponse } from '../interfaces/empleado';

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private apiUrl = 'http://localhost:8080/api/empleados';

  constructor(private http: HttpClient) {}

  getEmpleados(): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(this.apiUrl);
  }

  getEmpleadoById(id: number): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(`${this.apiUrl}/${id}`);
  }

  getEmpleadoByDni(dni: string): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(`${this.apiUrl}/dni/${dni}`);
  }

  createEmpleado(empleado: Empleado): Observable<EmpleadoResponse> {
    return this.http.post<EmpleadoResponse>(this.apiUrl, empleado);
  }

  updateEmpleado(id: number, empleado: Empleado): Observable<EmpleadoResponse> {
    return this.http.put<EmpleadoResponse>(`${this.apiUrl}/${id}`, empleado);
  }

  deleteEmpleado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getEmpleadosByRol(rol: string): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(`${this.apiUrl}/rol/${rol}`);
  }

  getMiPerfil(): Observable<EmpleadoResponse> {
    return this.http.get<EmpleadoResponse>(`${this.apiUrl}/mi-perfil`);
  }

  buscarEmpleados(nombre: string): Observable<EmpleadoResponse[]> {
    return this.http.get<EmpleadoResponse[]>(`${this.apiUrl}/buscar?nombre=${nombre}`);
  }
}