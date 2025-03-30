import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';
import { DropboxLoginComponent } from './shared/components/dropbox-login/dropbox-login.component';
import { DropboxAuthGuard } from './shared/guards/dropbox-auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/pages/main',
    pathMatch: 'full',
  },
  {
    path: 'pages',
    loadChildren: () =>
      import('./pages/pages.module').then((module) => module.PagesModule),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./auth/auth.module').then((module) => module.AuthModule),
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () =>
      import('./dashboard/dashboard.module').then(
        (module) => module.DashboardModule
      ),
  },
  {
    path: 'dropbox-login',
    component: DropboxLoginComponent
  },
  {
    path: '**',
    redirectTo: '/pages/main',
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
