import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface MultiLangText {
  uz?: string;
  ru?: string;
  en?: string;
}

@Component({
  selector: 'app-edit-titles-modal',
  templateUrl: './edit-titles-modal.component.html',
  styleUrls: ['./edit-titles-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditTitlesModalComponent implements OnInit {
  @Input() lessonTitle: MultiLangText = { uz: '', ru: '', en: '' };
  @Input() taskTitle: MultiLangText = { uz: '', ru: '', en: '' };
  @Input() isLessonEdit: boolean = true;
  @Input() isTaskEdit: boolean = true;
  @Input() modalTitle: string = 'Nomlarni tahrirlash';

  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    // Ensure all language properties exist
    this.lessonTitle = {
      uz: this.lessonTitle?.uz || '',
      ru: this.lessonTitle?.ru || '',
      en: this.lessonTitle?.en || ''
    };
    
    this.taskTitle = {
      uz: this.taskTitle?.uz || '',
      ru: this.taskTitle?.ru || '',
      en: this.taskTitle?.en || ''
    };
  }

  save(): void {
    // Validate at least one title is not empty
    if (!this.isValid()) {
      return;
    }
    
    this.activeModal.close({
      lessonTitle: this.isLessonEdit ? this.lessonTitle : undefined,
      taskTitle: this.isTaskEdit ? this.taskTitle : undefined
    });
  }

  cancel(): void {
    this.activeModal.dismiss();
  }

  private isValid(): boolean {
    // Only validate titles that are being edited
    let isValid = true;
    
    if (this.isLessonEdit) {
      const lessonHasTitle = this.lessonTitle.uz?.trim() || 
                           this.lessonTitle.ru?.trim() || 
                           this.lessonTitle.en?.trim();
      isValid = isValid && !!lessonHasTitle;
    }
    
    if (this.isTaskEdit) {
      const taskHasTitle = this.taskTitle.uz?.trim() || 
                         this.taskTitle.ru?.trim() || 
                         this.taskTitle.en?.trim();
      isValid = isValid && !!taskHasTitle;
    }
    
    return isValid;
  }
}
