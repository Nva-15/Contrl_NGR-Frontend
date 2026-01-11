import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImagenService {
  // Asegúrate de que este puerto coincida con tu backend
  private backendUrl = 'http://localhost:8080';
  
  constructor() { }
  
  getEmpleadoFotoUrl(fotoPath: string | undefined, empleadoNombre?: string): string {
    // 1. Si no hay foto, retornar avatar
    if (!fotoPath || fotoPath.trim() === '') {
      return this.generateAvatar(empleadoNombre || 'Usuario');
    }
    
    // 2. Limpieza agresiva de la ruta que viene de la BD
    // Convertir backslashes (\) a slashes (/)
    let cleanPath = fotoPath.replace(/\\/g, '/');
    
    // Si la ruta contiene "img/", limpiarlo para evitar duplicados
    // Ejemplo: si viene "img/andres.png" o "NVA/img/andres.png"
    if (cleanPath.includes('/')) {
        // Obtenemos solo el nombre del archivo final (ej. "andres.png")
        // Esto asume que todas tus imágenes están planas en /static/img/ del backend
        const parts = cleanPath.split('/');
        cleanPath = parts[parts.length - 1]; 
    }

    // 3. Construir la URL final apuntando al endpoint estático configurado en Java
    // El backend sirve "classpath:/static/img/" en la url "/img/**"
    const url = `${this.backendUrl}/img/${cleanPath}`;
    
    // 4. Agregar timestamp para evitar caché del navegador
    // Nota: El componente debe guardar este valor, no llamar a esta función en el HTML
    return `${url}?t=${new Date().getTime()}`;
  }
  
  handleImageError(event: Event, empleadoNombre?: string): void {
    const img = event.target as HTMLImageElement;
    // Evitar bucle infinito si el avatar también falla
    if (img.getAttribute('data-error-handled')) return;
    
    img.setAttribute('data-error-handled', 'true');
    img.src = this.generateAvatar(empleadoNombre || 'U');
  }
  
  private generateAvatar(nombre: string): string {
    const inicial = nombre.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${inicial}&background=007bff&color=fff&size=100`;
  }
}