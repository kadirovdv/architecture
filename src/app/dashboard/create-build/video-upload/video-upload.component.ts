import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Videos } from 'src/app/shared/interfaces/interfaces';

@Component({
  selector: 'app-video-upload',
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.scss'],
})
export class VideoUploadComponent {
  video: Videos = {
    url: '',
    name: ''
  };

  constructor(public activeModal: NgbActiveModal) {}

  onSubmit() {
    if (this.video.url && this.video.name) {
      this.activeModal.close(this.video);
    }
  }
}
