export interface Horario {
  id?: number;
  empleadoId: number;
  diaSemana: string;
  horaEntrada: string;
  horaSalida: string;
  horaAlmuerzoInicio?: string;
  horaAlmuerzoFin?: string;
  tipoDia?: string; // normal, descanso, compensado, vacaciones
  turno?: string; // manana, tarde
}

export interface HorarioResponse extends Horario {
  empleadoNombre: string;
  empleadoRol?: string;
}

export interface HorarioDia {
  id?: number;
  horaEntrada?: string;
  horaSalida?: string;
  horaAlmuerzoInicio?: string;
  horaAlmuerzoFin?: string;
  tipoDia?: string;
  turno?: string; // manana, tarde
}

export interface HorarioSemanal {
  empleadoId: number;
  empleadoNombre: string;
  empleadoRol: string;
  empleadoCargo: string;
  horariosSemana: {
    lunes?: HorarioDia;
    martes?: HorarioDia;
    miercoles?: HorarioDia;
    jueves?: HorarioDia;
    viernes?: HorarioDia;
    sabado?: HorarioDia;
    domingo?: HorarioDia;
  };
}
