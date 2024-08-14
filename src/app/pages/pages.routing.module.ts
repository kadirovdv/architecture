import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { PagesPage } from './pages.page';
import { ThemePage } from './theme/theme.page';
import { MainPage } from './main/main.page';

const routes: Routes = [
  {
    path: '',
    component: PagesPage,
    children: [
      { path: 'theme', component: ThemePage },
      {
        path: 'main',
        component: MainPage,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
