import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-header">
      <h4 class="modal-title">{{ existingIndex !== undefined ? 'Replace' : 'Add' }} {{ getFileTypeDisplay() }}</h4>
      <button type="button" class="btn-close" aria-label="Close" (click)="activeModal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <div class="form-group mb-3">
        <label for="fileName" class="form-label">File Name (Optional)</label>
        <input 
          type="text" 
          id="fileName" 
          class="form-control" 
          [(ngModel)]="name"
          placeholder="Enter a name for the file">
      </div>
      
      <div class="form-group mb-3">
        <label for="fileLanguage" class="form-label">Language</label>
        <select class="form-select" id="fileLanguage" [(ngModel)]="language">
          <option value="en">English</option>
          <option value="ru">Russian</option>
          <option value="uz">Uzbek</option>
        </select>
      </div>
      
      <div class="form-group mb-3">
        <label for="fileUpload" class="form-label">Select File</label>
        <input 
          type="file" 
          id="fileUpload" 
          class="form-control" 
          (change)="onFileSelected($event)"
          [accept]="getAcceptTypes()">
        <div class="invalid-feedback" [class.d-block]="fileError">
          Please select a file
        </div>
      </div>
      
      <div *ngIf="selectedFile" class="selected-file mt-3">
        <p><strong>Selected File:</strong> {{ selectedFile.name }}</p>
        <p><strong>Size:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        <p><strong>Type:</strong> {{ selectedFile.type }}</p>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" (click)="activeModal.dismiss()">Cancel</button>
      <button 
        type="button" 
        class="btn btn-primary" 
        [disabled]="!selectedFile" 
        (click)="uploadFile()">
        {{ existingIndex !== undefined ? 'Replace' : 'Upload' }}
      </button>
    </div>
  `,
  styles: [`
    .selected-file {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
    }
  `]
})
export class VideoUploadComponent implements OnInit {
  @Input() fileType: string = 'videos';
  @Input() existingIndex?: number;
  
  name: string = '';
  language: string = 'en';
  selectedFile: File | null = null;
  fileError: boolean = false;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.fileError = false;
    } else {
      this.selectedFile = null;
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.fileError = true;
      return;
    }

    const result = {
      file: this.selectedFile,
      name: this.name,
      language: this.language,
      existingIndex: this.existingIndex
    };

    this.activeModal.close(result);
  }

  getFileTypeDisplay(): string {
    switch (this.fileType) {
      case 'videos':
        return 'Video';
      case 'audios':
        return 'Audio';
      case 'documents':
        return 'Document';
      default:
        return 'File';
    }
  }

  getAcceptTypes(): string {
    switch (this.fileType) {
      case 'videos':
        return 'video/*';
      case 'audios':
        return 'audio/*';
      case 'documents':
        return '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';
      default:
        return '*/*';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 