import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FileItem, Videos, Files } from '../../../shared/interfaces/interfaces';

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent {
  constructor(private toast: ToastrService) {}
  @Input() files: Files | Videos[] = {};
  @Input() placeholder: string = '';
  @Input() category: string = '';
  @Input() isLoading: boolean = false;
  @Input() hasError: boolean = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() removeFile = new EventEmitter<{ category: string; lang: string; index: number }>();
  @Output() replaceFile = new EventEmitter<{category: string, lang: string, index: number, file: File}>();
  
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  isOpen = false;
  currentReplaceInfo: { lang: string; index: number } | null = null;
  errorTimeout: any;

  @HostListener('document:click')
  onDocumentClick() {
    this.isOpen = false;
  }

  ngOnChanges() {
    if (this.hasError) {
      // Clear any existing timeout
      if (this.errorTimeout) {
        clearTimeout(this.errorTimeout);
      }
      // Remove error state after animation completes
      this.errorTimeout = setTimeout(() => {
        this.hasError = false;
      }, 400); // Match animation duration
    }
  }

  ngOnDestroy() {
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
  }

  getTotalFiles(): number {
    if (!this.files) return 0;
    
    if (this.category === 'taskVideoUrls') {
      return (this.files as Videos[]).length;
    }
    
    const filesObj = this.files as Files;
    return Object.values(filesObj).reduce((total, arr) => total + (arr?.length || 0), 0);
  }

  objectKeys(obj: any): string[] {
    if (this.category === 'taskVideoUrls') return [];
    return Object.keys(obj || {});
  }

  getFilesForLang(lang: string): FileItem[] {
    if (this.isVideos(this.files)) return [];
    return ((this.files as Files)[lang] || []) as FileItem[];
  }

  onRemoveFile(lang: string, index: number): void {
    this.removeFile.emit({ category: this.category, lang, index });
  }

  onReplaceFile(lang: string, index: number, event: Event) {
    event.stopPropagation();
    this.currentReplaceInfo = { lang, index };
    this.fileInput.nativeElement.click();
  }

  isReplacing(lang: string, index: number): boolean {
    return this.currentReplaceInfo?.lang === lang && this.currentReplaceInfo?.index === index;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      if (this.currentReplaceInfo) {
        // Handle file replacement
        this.replaceFile.emit({
          category: this.category,
          lang: this.currentReplaceInfo.lang,
          index: this.currentReplaceInfo.index,
          file: file
        });
        this.currentReplaceInfo = null;
      } else {
        // Handle new file addition
        this.fileSelected.emit(file);
      }
      
      input.value = '';
    }
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  isVideos(files: Files | Videos[]): files is Videos[] {
    return this.category === 'taskVideoUrls';
  }
}
