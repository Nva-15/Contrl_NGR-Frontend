import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Obtener el token directamente del localStorage
  const token = localStorage.getItem('token');
  
  console.log('🔐 Interceptor - Token:', token ? 'Presente' : 'Ausente');
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('✅ Headers agregados:', authReq.headers.keys());
    return next(authReq);
  }
  
  console.log('❌ Sin token, request sin autenticación');
  return next(req);
};