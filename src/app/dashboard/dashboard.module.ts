import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { ManagePage } from './manage/manage.page';
import { SemesterPage } from './semester/semester.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemesPage } from './themes/themes.page';
import { BuildPage } from './build/build.page';
import { CreateBuildPage } from './create-build/create-build.page';
import { EditBuildPage } from './edit-build/edit-build.page';
import { UsersPage } from './users/users.page';
import { LessonsPage } from './lessons/lessons.page';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  declarations: [
    DashboardPage,
    ManagePage,
    SemesterPage,
    ThemesPage,
    BuildPage,
    CreateBuildPage,
    EditBuildPage,
    UsersPage,
    LessonsPage
  ],
  imports: [
    DashboardRoutingModule,
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule
  ],
  exports: [],
})
export class DashboardModule {}
