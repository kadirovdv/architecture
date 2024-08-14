import { NgModule } from '@angular/core';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardPage } from './dashboard.page';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { ManagePage } from './manage/manage.page';
import { SectionsPage } from './sections/sections.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SeasonsPage } from './seasons/seasons.page';

@NgModule({
  declarations: [DashboardPage, ManagePage, SectionsPage, SeasonsPage],
  imports: [DashboardRoutingModule, CommonModule, SharedModule, ReactiveFormsModule, FormsModule],
  exports: [],
})
export class DashboardModule {}
