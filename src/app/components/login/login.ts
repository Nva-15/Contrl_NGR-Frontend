import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
// Cambiar: importar LoginRequest desde interfaces/auth.ts
import { LoginRequest } from '../../interfaces/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  isLoading = false;
  errorMessage = '';
  showPassword = false;

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📤 Enviando credenciales:', this.credentials.username);
    
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('✅ Login exitoso, redirigiendo...');
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ Error en login:', error);
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Error en el inicio de sesión. Verifica tus credenciales.';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}