import { NgModule } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LandingContentComponent } from './components/lading-content/landing-content.component';
import { SectionItemsComponent } from './components/section-items/section-items.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from './components/loader/loader.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer.component';
import { RouterModule } from '@angular/router';
import { HighlightPipe } from './pipes/highlight.pipe';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    NavbarComponent,
    LandingContentComponent,
    SectionItemsComponent,
    LoaderComponent,
    FooterComponent,
    HighlightPipe,
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    TranslateModule
  ],
  exports: [
    NavbarComponent,
    LandingContentComponent,
    SectionItemsComponent,
    LoaderComponent,
    FooterComponent,
  ],
})
export class SharedModule {}
