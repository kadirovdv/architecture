import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { PagesPage } from './pages.page';
import { ThemePage } from './theme/theme.page';
import { MainPage } from './main/main.page';
import { AboutPage } from './about/about.page';
import { LessonsPage } from './lessons/lessons.page';
import { PrivacyPolicyPage } from './privacy-policy/privacy-policy.page';

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
      {
        path: 'about',
        component: AboutPage
      },
      {
        path: 'lessons/:id',
        component: LessonsPage,
      },
      {
        path: 'privacy-policy',
        component: PrivacyPolicyPage
      }
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
