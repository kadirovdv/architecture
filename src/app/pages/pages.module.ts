import { NgModule } from '@angular/core';
import { PagesRoutingModule } from './pages.routing.module';
import { ThemePage } from './theme/theme.page';
import { PagesPage } from './pages.page';
import { MainPage } from './main/main.page';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [PagesPage, ThemePage, MainPage],
  imports: [PagesRoutingModule, SharedModule],
  exports: [ThemePage, PagesPage, MainPage],
})
export class PagesModule {}
