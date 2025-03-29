import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LessonsPage } from './lessons.page';

const routes: Routes = [
  {
    path: '',
    component: LessonsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LessonsRoutingModule { } 