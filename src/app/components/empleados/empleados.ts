import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EmpleadosService } from '../../services/empleados';
import { EmpleadoResponse } from '../../interfaces/empleado';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './empleados.html',
  styleUrls: ['./empleados.css']
})
export class EmpleadosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private empService = inject(EmpleadosService);
  private router = inject(Router);

  empForm: FormGroup;
  
  empleados: EmpleadoResponse[] = [];
  empleadosFiltrados: EmpleadoResponse[] = [];
  
  vista: 'lista' | 'formulario' = 'lista';
  isEditing = false;
  isLoading = false;
  mensaje = '';
  filtroBusqueda = '';
  
  // Variable que controla el límite de caracteres en el HTML
  tipoDocumento: 'DNI' | 'CE' = 'DNI'; 

  constructor() {
    this.empForm = this.initForm();
  }

  ngOnInit() {
    this.cargarEmpleados();
    this.setupListeners();
  }

  initForm(): FormGroup {
    const hoy = new Date().toISOString().split('T')[0];
    
    return this.fb.group({
      id: [null],
      tipoDoc: ['DNI'],
      // Validaciones iniciales para DNI
      dni: ['', [Validators.required, Validators.pattern(/^[0-9]*$/), Validators.minLength(8), Validators.maxLength(8)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      cumpleanos: [hoy, Validators.required],
      ingreso: [hoy, Validators.required],
      hobby: [''],
      descripcion: [''],
      cargo: [''],
      nivel: ['tecnico'],
      username: [''],
      password: [''],
      rol: ['tecnico'],
      foto: ['img/perfil.png'],
      usuarioActivo: [true]
    });
  }

  setupListeners() {
    // 1. Sincronizar DNI -> Usuario automáticamente
    this.empForm.get('dni')?.valueChanges.subscribe(value => {
      if (value) {
        this.empForm.patchValue({ username: value }, { emitEvent: false });
      }
    });

    // 2. Controlar Validaciones y Límite al cambiar Tipo Doc
    this.empForm.get('tipoDoc')?.valueChanges.subscribe(tipo => {
      this.tipoDocumento = tipo; // Actualiza la variable para el HTML [maxlength]
      
      const dniControl = this.empForm.get('dni');
      dniControl?.setValue(''); // Limpiar campo al cambiar tipo para evitar errores
      
      if (tipo === 'DNI') {
        dniControl?.setValidators([
          Validators.required, 
          Validators.pattern(/^[0-9]*$/), 
          Validators.minLength(8), 
          Validators.maxLength(8)
        ]);
      } else {
        dniControl?.setValidators([
          Validators.required, 
          Validators.pattern(/^[0-9]*$/), 
          Validators.minLength(11), 
          Validators.maxLength(11)
        ]);
      }
      dniControl?.updateValueAndValidity();
    });
  }

  guardar() {
    if (this.empForm.invalid) {
      this.empForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const empleadoData = this.empForm.getRawValue();
    delete empleadoData.tipoDoc; // No enviamos este campo auxiliar al backend

    if (this.isEditing && empleadoData.id) {
      this.empService.updateEmpleado(empleadoData.id, empleadoData).subscribe({
        next: () => {
          this.mostrarMsg('Empleado actualizado correctamente');
          this.cambiarVista('lista');
        },
        error: (e: any) => this.handleError(e)
      });
    } else {
      this.empService.createEmpleado(empleadoData).subscribe({
        next: () => {
          this.mostrarMsg('Empleado creado exitosamente');
          this.cambiarVista('lista');
        },
        error: (e: any) => this.handleError(e)
      });
    }
  }

  editar(emp: EmpleadoResponse) {
    this.isEditing = true;
    this.vista = 'formulario';
    
    // Detectar tipo según longitud
    const tipo = (emp.dni.length > 8) ? 'CE' : 'DNI';
    this.tipoDocumento = tipo;

    this.empForm.reset({
      id: emp.id,
      tipoDoc: tipo,
      dni: emp.dni,
      nombre: emp.nombre,
      cumpleanos: emp.cumpleanos || '',
      ingreso: emp.ingreso || '',
      hobby: emp.hobby || '',
      descripcion: emp.descripcion || '',
      cargo: emp.cargo,
      nivel: emp.nivel,
      username: emp.username,
      password: '',
      rol: emp.rol,
      foto: emp.foto,
      usuarioActivo: emp.usuarioActivo
    });
  }

  // --- Funciones auxiliares ---

  cargarEmpleados() {
    this.isLoading = true;
    this.empService.getEmpleados().subscribe({
      next: (data) => {
        this.empleados = data.filter(e => e.activo !== false);
        this.filtrar();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  eliminar(id: number) {
    if (!confirm('¿Desactivar usuario?')) return;
    this.empService.deleteEmpleado(id).subscribe({
      next: () => {
        this.mostrarMsg('Usuario desactivado');
        this.cargarEmpleados();
      },
      error: () => alert('Error al eliminar')
    });
  }

  filtrar() {
    const term = this.filtroBusqueda.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(e => 
      e.nombre.toLowerCase().includes(term) || 
      e.dni.includes(term) || 
      e.cargo.toLowerCase().includes(term)
    );
  }

  cambiarVista(v: 'lista' | 'formulario') {
    this.vista = v;
    if (v === 'lista') {
      this.cargarEmpleados();
      this.isEditing = false;
      // Reiniciar formulario con valores por defecto
      this.empForm.reset(this.initForm().value);
      this.tipoDocumento = 'DNI'; // Resetear tipo visual
    }
  }

  volverAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  mostrarMsg(msg: string) {
    this.mensaje = msg;
    setTimeout(() => this.mensaje = '', 3000);
  }

  handleError(e: any) {
    this.isLoading = false;
    alert('Error: ' + (e.error?.error || 'Desconocido'));
  }

  esInvalido(campo: string): boolean {
    const control = this.empForm.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}