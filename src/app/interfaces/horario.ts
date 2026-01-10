export interface Horario {
    id?: number;
    empleadoId: number;
    diaSemana: string; // 'lunes', 'martes', etc.
    horaEntrada: string;
    horaSalida: string;
    horaAlmuerzoInicio?: string;
    horaAlmuerzoFin?: string;
  }
  
  export interface HorarioResponse extends Horario {
    empleadoNombre: string;
  }