import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonsPage } from './lessons.page';
import { LessonsRoutingModule } from './lessons-routing.module';
import { FormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { TaskDeleteConfirmationComponent } from './delete-confirmation/delete-confirmation.component';
import { AddNewsModalComponent } from '../add-news-modal/add-news-modal.component';

@NgModule({
  declarations: [
    LessonsPage,
    TaskDeleteConfirmationComponent
  ],
  imports: [
    CommonModule,
    LessonsRoutingModule,
    FormsModule,
    NgbModalModule,
    AddNewsModalComponent
  ],
})
export class LessonsModule { } 