import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpleadosService } from '../../services/empleados';
import { EmpleadoResponse } from '../../interfaces/empleado';

@Component({
  selector: 'app-organigrama',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './organigrama.html',
  styleUrls: ['./organigrama.css']
})
export class OrganigramaComponent implements OnInit {
  private empService = inject(EmpleadosService);

  nivelJefes: EmpleadoResponse[] = [];
  nivelSupervisores: EmpleadoResponse[] = [];
  nivelOperativo: EmpleadoResponse[] = [];

  isLoading = true;
  private apiUrl = 'http://localhost:8080';

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.isLoading = true;
    this.empService.getEmpleados().subscribe({
      next: (data) => {
        const activos = data.filter(e => e.activo !== false);
        this.clasificarPersonal(activos);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando organigrama:', err);
        this.isLoading = false;
      }
    });
  }

  clasificarPersonal(empleados: EmpleadoResponse[]) {
    this.nivelJefes = empleados.filter(e =>
      (e.nivel && (e.nivel.toLowerCase().includes('jefe') || e.nivel.toLowerCase().includes('gerente'))) ||
      (e.cargo && e.cargo.toLowerCase().includes('jefe'))
    );

    this.nivelSupervisores = empleados.filter(e =>
      (e.nivel && e.nivel.toLowerCase().includes('supervisor')) ||
      (e.cargo && e.cargo.toLowerCase().includes('supervisor'))
    );

    this.nivelOperativo = empleados.filter(e =>
      !this.nivelJefes.includes(e) &&
      !this.nivelSupervisores.includes(e)
    );

    this.nivelOperativo.sort((a, b) =>
      (a.cargo || '').localeCompare(b.cargo || '')
    );
  }

  getFoto(emp: EmpleadoResponse): string {
    if (!emp.foto || emp.foto.trim() === '') {
      return `${this.apiUrl}/img/perfil.png`;
    }

    if (emp.foto.startsWith('http')) {
      return emp.foto;
    }

    const rutaLimpia = emp.foto.startsWith('/') ? emp.foto.substring(1) : emp.foto;
    return `${this.apiUrl}/${rutaLimpia}`;
  }

  onImageError(event: any) {
    event.target.src = `${this.apiUrl}/img/perfil.png`;
  }
}
