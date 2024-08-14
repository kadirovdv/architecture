import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { DashboardPage } from './dashboard.page';
import { ManagePage } from './manage/manage.page';
import { SectionsPage } from './sections/sections.page';
import { SeasonsPage } from './seasons/seasons.page';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard/manage', pathMatch: 'full' },
  {
    path: '',
    component: DashboardPage,
    children: [
      {
        path: 'manage',
        component: ManagePage,
        children: [
            {
                path: 'sections',
                component: SectionsPage
            },
            {
              path: 'seasons',
              component: SeasonsPage
            }
        ]
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
