import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-lesson-delete-confirmation',
  templateUrl: './lesson-delete-confirmation.component.html',
  styleUrls: ['./lesson-delete-confirmation.component.scss']
})
export class LessonDeleteConfirmationComponent {
  @Input() lessonTitle: string = '';

  constructor(public activeModal: NgbActiveModal) {}

  confirm() {
    this.activeModal.close('confirm');
  }

  dismiss() {
    this.activeModal.dismiss('cancel');
  }
}
