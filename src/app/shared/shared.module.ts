import { NgModule } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LandingContentComponent } from './components/lading-content/landing-content.component';
import { SectionItemsComponent } from './components/section-items/section-items.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoaderComponent } from './components/loader/loader.component';

@NgModule({
  declarations: [
    NavbarComponent,
    LandingContentComponent,
    SectionItemsComponent,
    LoaderComponent
  ],
  imports: [ReactiveFormsModule, FormsModule],
  exports: [NavbarComponent, LandingContentComponent, SectionItemsComponent, LoaderComponent],
})
export class SharedModule {}
 