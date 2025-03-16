import { NgModule } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer.component';
import { RouterModule } from '@angular/router';
import { HighlightPipe } from './pipes/highlight.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { LoaderComponent } from './components/loader/loader.component';

@NgModule({
  declarations: [
    NavbarComponent,
    FooterComponent,
    HighlightPipe,
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    TranslateModule,
    LoaderComponent,
  ],
  exports: [
    NavbarComponent,
    FooterComponent,
    LoaderComponent,
  ],
})
export class SharedModule {}
