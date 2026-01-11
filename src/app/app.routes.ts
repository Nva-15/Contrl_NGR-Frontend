import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { SolicitudesComponent } from './components/solicitudes/solicitudes';
import { authGuard } from './guards/auth-guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent, 
    title: 'Login - Control NGR' 
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { 
        path: '', 
        redirectTo: 'dashboard', 
        pathMatch: 'full' 
      },
      { 
        path: 'dashboard', 
        component: DashboardComponent, 
        title: 'Dashboard - Control NGR'
      },
      { 
        path: 'solicitudes', 
        component: SolicitudesComponent, 
        title: 'Solicitudes - Control NGR'
      }
    ]
  },
  { 
    path: '**', 
    redirectTo: '/login' 
  }
];