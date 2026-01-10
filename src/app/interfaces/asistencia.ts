export interface AsistenciaRequest {
    empleadoId: number;
    tipo: string; // 'entrada' | 'salida'
    fecha?: string;
    hora?: string;
    observaciones?: string;
  }
  
  export interface AsistenciaResponse {
    id: number;
    empleadoId: number;
    empleadoNombre: string;
    fecha: string;
    horaEntrada: string;
    horaSalida: string;
    estado: string;
    observaciones: string;
    salidaAutomatica: boolean;
  }