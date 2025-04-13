import { Component, Input, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FileItem, Videos, Files } from '../../../shared/interfaces/interfaces';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DeleteConfirmationComponent } from '../delete-confirmation/delete-confirmation.component';

@Component({
  selector: 'app-file-list',
  templateUrl: './file-list.component.html',
  styleUrls: ['./file-list.component.scss']
})
export class FileListComponent {
  constructor(
    private toast: ToastrService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal
  ) {}
  @Input() files: Files | Videos[] = {};
  @Input() placeholder: string = '';
  @Input() category: string = '';
  @Input() isLoading: boolean = false;
  @Input() hasError: boolean = false;
  @Input() selectedLang: 'uz' | 'ru' | 'en' = 'uz';
  @Input() autoSaveOnDelete: boolean = false;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() removeFile = new EventEmitter<{ category: string; lang: string; index: number; autoSave?: boolean }>();
  @Output() replaceFile = new EventEmitter<{category: string, lang: string, index: number, file: File}>();
  @Output() addFile = new EventEmitter<{ category: string, lang: string }>();
  
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

  hasNoFiles(): boolean {
    if (!this.files) return true;
    
    if (this.isVideos(this.files)) {
      return (this.files as Videos[]).length === 0;
    }
    
    return this.getTotalFiles() === 0;
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
    const isExistingFile = this.isExistingFile(lang, index);
    
    if (isExistingFile) {
      // Open confirmation modal instead of using window.confirm
      const modalRef = this.modalService.open(DeleteConfirmationComponent);
      
      // Get the file name to show in the modal
      let fileName = '';
      if (this.isVideos(this.files)) {
        const videos = this.files as Videos[];
        if (index < videos.length) {
          fileName = videos[index].name[this.selectedLang] || '';
        }
      } else {
        const fileObj = this.files as Files;
        if (fileObj[lang] && index < fileObj[lang].length) {
          fileName = fileObj[lang][index].name || '';
        }
      }
      
      // Set modal data
      modalRef.componentInstance.fileName = fileName;
      
      // Handle the result
      modalRef.result.then((result) => {
        if (result === 'confirm') {
          if (this.isVideos(this.files)) {
            // For videos, we need to pass the correct category
            this.removeFile.emit({ 
              category: 'taskVideoUrls', 
              lang: '', 
              index,
              autoSave: this.autoSaveOnDelete
            });
          } else {
            // For regular files
            this.removeFile.emit({ 
              category: this.category, 
              lang, 
              index,
              autoSave: this.autoSaveOnDelete
            });
          }
          this.toast.success('Fayl o\'chirildi va o\'zgarishlar saqlandi');
        }
      }, () => {
        // Modal dismissed
      });
    } else {
      // For non-existing files, just remove without confirmation
      if (this.isVideos(this.files)) {
        // For videos, we need to pass the correct category
        this.removeFile.emit({ 
          category: 'taskVideoUrls', 
          lang: '', 
          index 
        });
      } else {
        this.removeFile.emit({ category: this.category, lang, index });
      }
    }
  }

  isExistingFile(lang: string, index: number): boolean {
    if (this.isVideos(this.files)) {
      const videos = this.files as Videos[];
      return index < videos.length && !!videos[index].url;
    } else {
      const fileObj = this.files as Files;
      if (!fileObj[lang] || index >= fileObj[lang].length) {
        return false;
      }
      
      // Check if the file has a URL (existing file from DB) 
      // and doesn't have a File object (which would indicate a newly added file)
      const item = fileObj[lang][index];
      return !!item.url && !(item as any).file;
    }
  }

  getFileStatusClass(lang: string, index: number): string {
    if (this.isExistingFile(lang, index)) {
      return 'file-existing';
    } else {
      return 'file-new';
    }
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
      console.log('File selected in file-list component');
      
      // Get the selected files
      const files = Array.from(input.files);
      
      if (this.currentReplaceInfo) {
        // Handle file replacement
        this.replaceFile.emit({
          category: this.category,
          lang: this.currentReplaceInfo.lang,
          index: this.currentReplaceInfo.index,
          file: files[0]
        });
        this.currentReplaceInfo = null;
      } else {
        // Handle new file addition - emit only the first file
        // We rely on the parent component to add it to the right language
        this.fileSelected.emit(files[0]);
      }
      
      // Reset the input
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

  private sanitizeDropboxUrl(url: string): string {
    if (!url) return '';
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('dl=0', 'raw=1');
  }

  private sanitizeUrl(url: string): SafeResourceUrl {
    if (!url) return '';
    const encodedUrl = encodeURIComponent(this.sanitizeDropboxUrl(url));
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`);
  }

  getFileUrl(file: FileItem): SafeResourceUrl {
    if (!file.url) return '';
    return this.sanitizeUrl(file.url);
  }

  onAddFile(lang: string, event: Event): void {
    event.stopPropagation();
    this.selectedLang = lang as 'uz' | 'ru' | 'en';
    
    // Emit the event to add a file with the current category and language
    this.addFile.emit({ 
      category: this.category, 
      lang: this.selectedLang 
    });
  }
}
