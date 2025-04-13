import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface MultiLangNews {
  title: {
    uz: string;
    ru: string;
    en: string;
  };
  link: {
    uz: string;
    ru: string;
    en: string;
  };
}

@Component({
  selector: 'app-add-news-modal',
  templateUrl: './add-news-modal.component.html',
  styleUrls: ['./add-news-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AddNewsModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<MultiLangNews>();
  
  news: MultiLangNews = {
    title: {
      uz: '',
      ru: '',
      en: ''
    },
    link: {
      uz: '',
      ru: '',
      en: ''
    }
  };

  activeTab: 'uz' | 'ru' | 'en' = 'uz';
  
  onClose() {
    this.close.emit();
  }
  
  onSave() {
    // Check if at least one language has both title and link
    const hasContent = 
      (this.news.title.uz && this.news.link.uz) || 
      (this.news.title.ru && this.news.link.ru) ||
      (this.news.title.en && this.news.link.en);
      
    if (hasContent) {
      this.save.emit(this.news);
      this.news = {
        title: { uz: '', ru: '', en: '' },
        link: { uz: '', ru: '', en: '' }
      };
    }
  }

  setActiveTab(tab: 'uz' | 'ru' | 'en', event: Event) {
    event.preventDefault(); // Prevent default link behavior
    this.activeTab = tab;
  }
}
