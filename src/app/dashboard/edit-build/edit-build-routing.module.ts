import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditBuildPage } from './edit-build.page';

const routes: Routes = [
  {
    path: '',
    component: EditBuildPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EditBuildRoutingModule { } 