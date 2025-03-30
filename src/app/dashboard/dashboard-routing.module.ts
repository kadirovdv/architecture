import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { DashboardPage } from './dashboard.page';
// import { ManagePage } from './manage/manage.page';
// import { SemesterPage } from './semester/semester.page';
// import { ThemesPage } from './themes/themes.page';
// import { BuildPage } from './build/build.page';
import { CreateBuildPage } from './create-build/create-build.page';
import { EditBuildPage } from './edit-build/edit-build.page';
// import { UsersPage } from './users/users.page';
import { LessonsPage } from './lessons/lessons.page';
import { CreateLessonsPage } from './create-lessons/create-lessons.page';
import { AuthGuard } from '../shared/guards/auth.guard';
import { DropboxAuthGuard } from '../shared/guards/dropbox-auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard/lessons', pathMatch: 'full' },
  {
    path: '',
    component: DashboardPage,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'lessons',
        loadChildren: () => import('./lessons/lessons.module').then(m => m.LessonsModule),
        canActivate: [DropboxAuthGuard]
      },
      {
        path: 'create-lesson',
        component: CreateLessonsPage,
        canActivate: [DropboxAuthGuard]
      },
      {
        path: 'create-build',
        component: CreateBuildPage,
        canActivate: [DropboxAuthGuard]
      },
      {
        path: 'edit-build',
        component: EditBuildPage,
        canActivate: [DropboxAuthGuard]
      },
      // {
      //   path: 'edit-build/:id',
      //   component: EditBuildPage,
      // },
      {
        path: '**',
        redirectTo: 'lessons',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
