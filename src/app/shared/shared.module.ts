import { NgModule } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer/footer.component';
import { RouterModule } from '@angular/router';
import { HighlightPipe } from './pipes/highlight.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { LoaderComponent } from './components/loader/loader.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { LessonService } from './services/lesson.service';
import { StorageService } from './services/storage.service';
import { VideoUploadComponent } from './components/video-upload/video-upload.component';

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
    NgbModule,
    VideoUploadComponent,
  ],
  exports: [
    NavbarComponent,
    FooterComponent,
    LoaderComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    VideoUploadComponent,
  ],
  providers: [
    LessonService,
    StorageService,
  ]
})
export class SharedModule {}
