import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-news-modal',
  templateUrl: './add-news-modal.component.html',
  styleUrls: ['./add-news-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AddNewsModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{title: string, link: string}>();
  
  newsTitle: string = '';
  newsLink: string = '';
  
  onClose() {
    this.close.emit();
  }
  
  onSave() {
    if (this.newsTitle?.trim() && this.newsLink?.trim()) {
      this.save.emit({
        title: this.newsTitle.trim(),
        link: this.newsLink.trim()
      });
      this.newsTitle = '';
      this.newsLink = '';
    }
  }
}
