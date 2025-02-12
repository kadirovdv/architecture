import { NgModule } from '@angular/core';
import { PagesRoutingModule } from './pages.routing.module';
import { ThemePage } from './theme/theme.page';
import { PagesPage } from './pages.page';
import { MainPage } from './main/main.page';
import { SharedModule } from '../shared/shared.module';
import { AboutPage } from './about/about.page';
import { LessonsPage } from './lessons/lessons.page';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TooltipDirective } from '../shared/directives/tooltip.directive';

@NgModule({
  declarations: [PagesPage, ThemePage, MainPage, AboutPage, LessonsPage, TooltipDirective],
  imports: [PagesRoutingModule, SharedModule, CommonModule, NgSelectModule, FormsModule, TranslateModule],
  exports: [ThemePage, PagesPage, MainPage],
})
export class PagesModule {}
