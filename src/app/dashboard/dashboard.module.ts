import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
// import { ManagePage } from './manage/manage.page';
// import { SemesterPage } from './semester/semester.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// import { ThemesPage } from './themes/themes.page';
// import { BuildPage } from './build/build.page';
import { CreateBuildModule } from './create-build/create-build.module';
// import { EditBuildPage } from './edit-build/edit-build.page';
// import { UsersPage } from './users/users.page';
import { LessonsPage } from './lessons/lessons.page';
import { NgSelectModule } from '@ng-select/ng-select';
import { CreateLessonsPage } from './create-lessons/create-lessons.page';
import { NgbActiveModal, NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { LoaderComponent } from "../shared/components/loader/loader.component";
import { EditBuildModule } from './edit-build/edit-build.module';
@NgModule({
  declarations: [
    DashboardPage,
    // ManagePage,
    // SemesterPage,
    // ThemesPage,
    // BuildPage,
    LessonsPage,
    CreateLessonsPage,
  ],
  imports: [
    DashboardRoutingModule,
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule,
    NgbDropdownModule,
    NgbModalModule,
    CreateBuildModule,
    EditBuildModule,
    LoaderComponent
],
  providers: [NgbActiveModal],
  exports: [],
})
export class DashboardModule {}
