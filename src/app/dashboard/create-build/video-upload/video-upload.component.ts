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
    name: {
      uz: '',
      ru: '',
      en: ''
    },
    url: {
      uz: '',
      ru: '',
      en: ''
    }
  };

  constructor(public activeModal: NgbActiveModal) {}

  onSubmit() {
    if (this.isValid()) {
      this.activeModal.close(this.video);
    }
  }

  isValid(): boolean {
    return (
      this.video.name.uz.trim() !== '' &&
      this.video.name.ru.trim() !== '' &&
      this.video.name.en.trim() !== '' &&
      this.video.url.uz.trim() !== '' &&
      this.video.url.ru.trim() !== '' &&
      this.video.url.en.trim() !== ''
    );
  }
}
