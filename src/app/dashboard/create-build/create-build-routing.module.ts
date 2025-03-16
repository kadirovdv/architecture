import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateBuildPage } from './create-build.page';

const routes: Routes = [
  {
    path: '',
    component: CreateBuildPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CreateBuildRoutingModule { } 