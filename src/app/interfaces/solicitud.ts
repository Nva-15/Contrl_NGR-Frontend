export interface Solicitud {
    id?: number;
    empleadoId: number;
    tipo: string; // 'vacaciones', 'descanso', 'compensacion'
    fechaInicio: string;
    fechaFin: string;
    motivo: string;
    estado?: string; // 'pendiente', 'aprobado', 'rechazado'
    aprobadoPor?: number;
    fechaAprobacion?: string;
  }
  
  export interface SolicitudResponse extends Solicitud {
    empleadoNombre: string;
    aprobadorNombre?: string;
  }