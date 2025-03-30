import { Component, HostListener, OnInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { catchError, concatMap, finalize, from, tap, timer, Observable, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { LessonTitle, FirstClassFileGroups, SecondClassFileGroups, Files, Videos } from 'src/app/shared/interfaces/interfaces';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VideoUploadComponent } from '../../shared/components/video-upload/video-upload.component';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { FirebaseError } from 'firebase/app';
import { LessonService } from 'src/app/shared/services/lesson.service';
import { StorageService } from 'src/app/shared/services/storage.service';

// Define our own non-conflicting interfaces
interface MultiLangText {
  uz?: string;
  ru?: string;
  en?: string;
}

// Define local interfaces with expanded properties
interface ILesson {
  id?: string;
  lessonTitle?: MultiLangText;
  thumbnail?: string;
  tasks?: ITask[];
  createdAt?: string;
  [key: string]: any; // Add index signature
}

interface ITask {
  id?: string;
  title?: MultiLangText;
  description?: string;
  duration?: number;
  index?: number;
  createdAt?: string;
  firstBasedFiles?: {
    taskExampleFiles?: {
      uz: any[];
      ru: any[];
      en: any[];
      [key: string]: any[];
    };
    taskSolutionFiles?: {
      uz: any[];
      ru: any[];
      en: any[];
      [key: string]: any[];
    };
    [key: string]: any;
  };
  secondBasedFiles?: {
    taskTitleFiles?: {
      uz: any[];
      ru: any[];
      en: any[];
      [key: string]: any[];
    };
    taskPresentationFiles?: {
      uz: any[];
      ru: any[];
      en: any[];
      [key: string]: any[];
    };
    taskLiteratureFiles?: {
      uz: any[];
      ru: any[];
      en: any[];
      [key: string]: any[];
    };
    taskVideoUrls?: any[];
    [key: string]: any;
  };
  videos?: any[];
  audios?: any[];
  documents?: any[];
  [key: string]: any; // Add index signature
}

@Component({
  selector: 'app-edit-build',
  templateUrl: './edit-build.page.html',
  styleUrls: ['./edit-build.page.scss'],
})
export class EditBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  @ViewChildren('fileInput') fileInputs!: QueryList<ElementRef>;
  lessonIdToEdit: string = '';
  lesson: ILesson = {
    lessonTitle: {
      uz: '',
      ru: '',
      en: ''
    },
    tasks: [],
    thumbnail: '',
    createdAt: new Date().toISOString()
  };
  semester: any = {
    id: '',
    semesterTitle: {},
    themes: [],
  };
  theme: any = {
    id: '',
    themeTitle: {},
    files: {},
  };

  newSemesterTitle: any = {
    uz: '',
    ru: '',
    en: '',
  };

  newThemeTitle: any = {
    uz: '',
    ru: '',
    en: '',
  };

  loader = false;
  loading: boolean = false;
  exists: boolean = false;
  fileReplaced: boolean = false;
  fileGroups: any = {
    materials: {
      ru: [],
      uz: [],
      en: [],
    },
    presentations: {
      ru: [],
      uz: [],
      en: [],
    },
    discussions: {
      ru: [],
      uz: [],
      en: [],
    },
    videos: {
      ru: [],
      uz: [],
      en: [],
    },
  };
  uploadedFilesByCategory: any = {
    materials: {
      ru: [],
      uz: [],
      en: [],
    },
    presentations: {
      ru: [],
      uz: [],
      en: [],
    },
    discussions: {
      ru: [],
      uz: [],
      en: [],
    },
    videos: {
      ru: [],
      uz: [],
      en: [],
    },
  };
  uploadedFiles: any[] = [];
  totalSize: number | any = 0;
  sizeExceeded: boolean = false;

  public globalVarHold: any = [];

  imgDisplay: SafeUrl | null = null;
  file: File | null = null;

  lessons: ILesson[] = [];
  websiteLessons: ILesson[] = [];
  task: ITask | any = null;
  selectedLanguage: 'uz' | 'ru' | 'en' = 'uz';
  currentCategory: string = '';
  errorCategories: string[] = [];
  selectedLesson: ILesson | null = null;
  selectedLessonId: string = '';
  selectedTask: ITask | null = null;
  selectedTaskId: string = '';
  originalTask: ITask | null = null;
  fileUploads: { [key: string]: Observable<any>[] } = {};

  // Upload properties
  uploading: boolean = false;
  progress: number = 0;
  currentUploadFile: string | { name: string; size: number } = '';
  uploadedCount: number = 0;
  totalUploads: number = 0;

  constructor(
    private crudService: CrudService,
    private dropboxService: DropboxService,
    private toastr: ToastrService,
    private activatedRoute: ActivatedRoute,
    private navigate: Location,
    private router: Router,
    private loadingService: LoadingService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal,
    private lessonService: LessonService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    this.loadLesson();
    this.getLessons();
    this.getWebsiteLessons();
    
    // If there's a lesson ID in the route, select it
    this.activatedRoute.params.subscribe(params => {
      const lessonId = params['id'];
      if (lessonId) {
        this.selectedLessonId = lessonId;
      }
    });
  }

  // Compare functions for ng-select
  compareLessonById(item1: any, item2: any): boolean {
    return item1 && item2 && item1.id === item2.id;
  }

  compareTaskById(item1: any, item2: any): boolean {
    return item1 && item2 && item1.id === item2.id;
  }

  getAll() {
    this.loading = true;
    this.activatedRoute.params.subscribe((params) => {
      this.lessonIdToEdit = params['id'];
      this.crudService
        .getDocumentById('globalVar', this.lessonIdToEdit)
        .subscribe((res: any) => {
          if (res?.lessonTitle && res?.semesters?.[0]) {
            this.globalVarHold = res;
            this.lesson.id = this.globalVarHold.id;
            this.semester = this.globalVarHold.semesters[0];
            this.theme = this.semester.themes[0];

            Object.keys(this.globalVarHold.lessonTitle).forEach((key: string) => {
              if (this.lesson.lessonTitle && this.globalVarHold.lessonTitle) {
                this.lesson.lessonTitle[key as keyof LessonTitle] = this.globalVarHold.lessonTitle[key as keyof LessonTitle];
              }
            });
            Object.keys(this.globalVarHold?.semesters[0].semesterTitle).forEach(
              (key: any) => {
                this.semester.semesterTitle[key] =
                  this.globalVarHold?.semesters[0].semesterTitle[key];
                this.newSemesterTitle[key] =
                  this.globalVarHold?.semesters[0].semesterTitle[key];
              }
            );

            Object.keys(this.theme.themeTitle).forEach((key: any) => {
              this.theme.themeTitle[key] =
                this.semester.themes[0].themeTitle[key];
              this.newThemeTitle[key] = this.semester.themes[0].themeTitle[key];
            });
            Object.keys(this.theme.files).forEach((key) => {
              this.fileGroups[key] = this.theme.files[key];
            });

            this.calculateTotalSize();
            this.loading = false;
          }
        });
    });
  }

  build() {
    this.globalVarHold.lessonTitle = this.lesson.lessonTitle;
    if (!this.exists) {
      console.log(this.globalVarHold);
      this.crudService
        .updateDocument('globalVar', this.lessonIdToEdit, this.globalVarHold)
        .pipe(
          catchError((error: Error) => {
            console.error(error);
            throw error;
          })
        )
        .subscribe(() => {
          this.loading = false;
          this.toastr.success('All files across categories were uploaded and updated successfully.');
          this.uploadedFiles = [];
          this.uploadedFilesByCategory = {
            materials: [],
            presentations: [],
            discussions: [],
            videos: [],
          };
          this.sizeExceeded = false;
          this.fileGroups = {
            materials: {
              ru: [],
              uz: [],
              en: [],
            },
            presentations: {
              ru: [],
              uz: [],
              en: [],
            },
            discussions: {
              ru: [],
              uz: [],
              en: [],
            },
            videos: {
              ru: [],
              uz: [],
              en: [],
            },
          };
          this.totalSize = 0;
        });
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: Event): void {
    if (this.loading) {
      this.toastr.warning('Iltimos kuting, fayllar yuklanmoqda!');
      $event.preventDefault();
    }
  }

  onFileTypeSelect(language: 'uz' | 'ru' | 'en', category: string): void {
    this.selectedLanguage = language;
    
    // Find and trigger the hidden input for this category
    setTimeout(() => {
      const input = this.hiddenInputs.find(el => 
        el.nativeElement.getAttribute('data-category') === category
      );
      if (input) {
        input.nativeElement.click();
      }
    }, 0);
  }

  onFileSelected(event: any, category: string, language: 'uz' | 'ru' | 'en'): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const fileItems = Array.from(files).map((file: any) => ({ file }));
    this.uploadAndSaveFiles(category, language, fileItems);
    
    // Reset the input
    event.target.value = '';
  }

  onDirectFileSelected(event: any, category: string, language: 'uz' | 'ru' | 'en'): void {
    if (!event.files || event.files.length === 0) return;
    
    const fileItems = Array.from(event.files).map((file: any) => ({ file }));
    this.uploadAndSaveFiles(category, language, fileItems);
  }

  onRemoveFile(event: any): void {
    if (!this.selectedTask) return;
    
    const { file, category, language } = event;
    
    if (this.isFirstClassFileCategory(category)) {
      if (this.selectedTask.firstBasedFiles && this.selectedTask.firstBasedFiles[category] && this.selectedTask.firstBasedFiles[category][language]) {
        const index = this.selectedTask.firstBasedFiles[category][language].findIndex(
          (f: any) => f.path === file.path || f.url === file.url
        );
        
        if (index !== -1) {
          this.selectedTask.firstBasedFiles[category][language].splice(index, 1);
          this.saveChanges();
        }
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.selectedTask.secondBasedFiles && this.selectedTask.secondBasedFiles[category] && this.selectedTask.secondBasedFiles[category][language]) {
        const index = this.selectedTask.secondBasedFiles[category][language].findIndex(
          (f: any) => f.path === file.path || f.url === file.url
        );
        
        if (index !== -1) {
          this.selectedTask.secondBasedFiles[category][language].splice(index, 1);
          this.saveChanges();
        }
      }
    }
  }

  onReplaceFile(event: any): void {
    if (!this.selectedTask) return;
    
    const { file, category, language, replacementFile } = event;
    
    if (!replacementFile) return;
    
    // Upload the new file
    this.uploadAndSaveFiles(category, language, [{ file: replacementFile }], file);
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
  }

  isFirstClassFileCategory(category: string): boolean {
    return ['taskExampleFiles', 'taskSolutionFiles'].includes(category);
  }

  isSecondClassFileCategory(category: string): boolean {
    return ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].includes(category);
  }

  getExistingFileCount(category: string, language: string): number {
    if (!this.selectedTask) return 0;
    
    if (this.isFirstClassFileCategory(category)) {
      if (this.selectedTask.firstBasedFiles && this.selectedTask.firstBasedFiles[category] && this.selectedTask.firstBasedFiles[category][language]) {
        return this.selectedTask.firstBasedFiles[category][language].length || 0;
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.selectedTask.secondBasedFiles && this.selectedTask.secondBasedFiles[category] && this.selectedTask.secondBasedFiles[category][language]) {
        return this.selectedTask.secondBasedFiles[category][language].length || 0;
      }
    }
    
    return 0;
  }

  uploadAndSaveFiles(category: string, language: string, files: any[], replaceFile?: any): void {
    if (!this.selectedTask) {
      this.toastr.error('Please select a task first');
      return;
    }
    
    this.uploading = true;
    this.loadingService.show();
    this.totalUploads = files.length;
    this.uploadedCount = 0;
    this.progress = 0;
    
    // Ensure the file arrays are initialized with type assertions
    if (this.isFirstClassFileCategory(category)) {
      if (!this.selectedTask.firstBasedFiles) {
        this.selectedTask.firstBasedFiles = {} as any;
      }
      
      const firstBasedFiles = this.selectedTask.firstBasedFiles as any;
      
      if (!firstBasedFiles[category]) {
        firstBasedFiles[category] = { uz: [], ru: [], en: [] };
      }
      
      if (!firstBasedFiles[category][language]) {
        firstBasedFiles[category][language] = [];
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (!this.selectedTask.secondBasedFiles) {
        this.selectedTask.secondBasedFiles = {} as any;
      }
      
      const secondBasedFiles = this.selectedTask.secondBasedFiles as any;
      
      if (!secondBasedFiles[category]) {
        secondBasedFiles[category] = { uz: [], ru: [], en: [] };
      }
      
      if (!secondBasedFiles[category][language]) {
        secondBasedFiles[category][language] = [];
      }
    }
    
    // Upload files one by one
    let uploadObservables: Observable<any>[] = [];
    
    files.forEach((fileItem, index) => {
      const file = fileItem.file;
      if (!file) return;
      
      const uploadObs = this.uploadFile(file, category, language, index, replaceFile);
      uploadObservables.push(uploadObs);
    });
    
    // Process uploads
    forkJoin(uploadObservables)
      .pipe(finalize(() => {
        this.uploading = false;
        this.loadingService.hide();
      }))
      .subscribe({
        next: () => {
          this.toastr.success(`Successfully uploaded ${files.length} files`);
          this.saveChanges();
        },
        error: (error) => {
          this.toastr.error('Failed to upload files');
          console.error('File upload error:', error);
        }
      });
  }

  uploadFile(file: File, category: string, language: string, index: number, replaceFile?: any): Observable<any> {
    return new Observable((observer) => {
      this.currentUploadFile = file.name;
      
      // Simulate upload progress
      const interval = setInterval(() => {
        this.progress = Math.min(this.progress + 5, 95);
      }, 100);
      
      // Simulate a file upload with a delay
      setTimeout(() => {
        clearInterval(interval);
        this.progress = 100;
        this.uploadedCount++;
        
        // Create a mock file object
        const fileObj = {
          name: file.name,
          url: URL.createObjectURL(file),  // Local URL for demo
          path: `mock/path/${file.name}`,
          size: file.size,
          type: file.type,
          language: language
        };
        
        // Add or replace the file safely with null checks
        if (this.isFirstClassFileCategory(category) && this.selectedTask) {
          if (!this.selectedTask.firstBasedFiles) {
            this.selectedTask.firstBasedFiles = {} as any;
          }
          
          const firstBasedFiles = this.selectedTask.firstBasedFiles as any;
          
          if (!firstBasedFiles[category]) {
            firstBasedFiles[category] = { uz: [], ru: [], en: [] };
          }
          
          if (!firstBasedFiles[category][language]) {
            firstBasedFiles[category][language] = [];
          }
          
          if (replaceFile) {
            // Find the index safely
            let fileIndex = -1;
            if (firstBasedFiles[category] && 
                firstBasedFiles[category][language] && 
                Array.isArray(firstBasedFiles[category][language])) {
              fileIndex = firstBasedFiles[category][language].findIndex(
                (f: any) => f.path === replaceFile.path || f.url === replaceFile.url
              );
            }
            
            if (fileIndex !== -1) {
              firstBasedFiles[category][language][fileIndex] = fileObj;
            }
          } else {
            // Push safely
            if (firstBasedFiles[category] && 
                firstBasedFiles[category][language] && 
                Array.isArray(firstBasedFiles[category][language])) {
              firstBasedFiles[category][language].push(fileObj);
            }
          }
        } else if (this.isSecondClassFileCategory(category) && this.selectedTask) {
          if (!this.selectedTask.secondBasedFiles) {
            this.selectedTask.secondBasedFiles = {} as any;
          }
          
          const secondBasedFiles = this.selectedTask.secondBasedFiles as any;
          
          if (!secondBasedFiles[category]) {
            secondBasedFiles[category] = { uz: [], ru: [], en: [] };
          }
          
          if (!secondBasedFiles[category][language]) {
            secondBasedFiles[category][language] = [];
          }
          
          if (replaceFile) {
            // Find the index safely
            let fileIndex = -1;
            if (secondBasedFiles[category] && 
                secondBasedFiles[category][language] && 
                Array.isArray(secondBasedFiles[category][language])) {
              fileIndex = secondBasedFiles[category][language].findIndex(
                (f: any) => f.path === replaceFile.path || f.url === replaceFile.url
              );
            }
            
            if (fileIndex !== -1) {
              secondBasedFiles[category][language][fileIndex] = fileObj;
            }
          } else {
            // Push safely
            if (secondBasedFiles[category] && 
                secondBasedFiles[category][language] && 
                Array.isArray(secondBasedFiles[category][language])) {
              secondBasedFiles[category][language].push(fileObj);
            }
          }
        }
        
        observer.next(fileObj);
        observer.complete();
      }, 1000);
    });
  }

  addVideo(): void {
    if (!this.selectedTask) {
      this.toastr.error('Please select a task first');
      return;
    }
    
    const modalRef = this.modalService.open(VideoUploadComponent, {
      centered: true,
      size: 'lg',
    });
    
    modalRef.result.then(
      (result) => {
        if (result && this.selectedTask) {
          // Ensure secondBasedFiles and taskVideoUrls are initialized safely
          if (!this.selectedTask.secondBasedFiles) {
            this.selectedTask.secondBasedFiles = {} as any;
          }
          
          const secondBasedFiles = this.selectedTask.secondBasedFiles as any;
          
          if (!secondBasedFiles.taskVideoUrls) {
            secondBasedFiles.taskVideoUrls = [];
          }
          
          if (Array.isArray(secondBasedFiles.taskVideoUrls)) {
            secondBasedFiles.taskVideoUrls.push(result);
            this.saveChanges();
          }
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  removeVideo(index: number): void {
    if (!this.selectedTask || !this.selectedTask.secondBasedFiles?.taskVideoUrls) return;
    
    if (confirm('Are you sure you want to remove this video?')) {
      this.selectedTask.secondBasedFiles.taskVideoUrls.splice(index, 1);
      this.saveChanges();
    }
  }

  formatFileSize(sizeInBytes: number): string {
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;

    if (sizeInMB >= 1) {
      return `${sizeInMB.toFixed(2)} MB`;
    } else {
      return `${sizeInKB.toFixed(2)} KB`;
    }
  }

  calculateTotalSize(): void {
    this.totalSize = 0;
    for (const category in this.fileGroups) {
      for (const lang in this.fileGroups[category]) {
        this.fileGroups[category][lang].forEach((file: any) => {
          if (file) {
            this.totalSize += file.size;
          }
        });
      }
    }
  }

  helperKeys(group: any): string[] {
    return Object.keys(group);
  }

  removeAllFromGroup(category: string, lang: string): void {
    this.fileGroups[category][lang] = [null];
    this.theme.files[category][lang] = [null];
  }

  changeSemester(semester: any): void {
    this.semester = semester;
    this.changeTheme(this.semester.themes[0]);

    Object.keys(this.semester.semesterTitle).forEach((key: any) => {
      this.newSemesterTitle[key] = this.semester.semesterTitle[key];
    });
    Object.keys(this.theme.themeTitle).forEach((key: any) => {
      this.newThemeTitle[key] = this.theme.themeTitle[key];
    });
  }

  changeTheme(theme: any): void {
    this.theme = theme;
    Object.keys(this.theme.themeTitle).forEach((key: any) => {
      this.newThemeTitle[key] = this.theme.themeTitle[key];
    });
    this.helperKeys(this.theme.files).forEach((key) => {
      this.helperKeys(this.theme.files[key]).forEach((lang) => {
        this.fileGroups[key][lang] = this.theme.files[key][lang];
      });
    });
    this.calculateTotalSize();
  }

  goBack() {
    this.navigate.back();
  }

  changeObjectKeyName(group: any): any {
    switch (group) {
      case 'materials':
        return 'Nazariy malumotlar';
      case 'presentations':
        return 'Prezintatsiyalar';
      case 'discussions':
        return 'Grafik topshiriq variantlari';
      case 'videos':
        return 'Video darslar';
      default:
        return group;
    }
  }

  loadLesson(): void {
    try {
      this.loading = true;
      const id = this.activatedRoute.snapshot.queryParams['id'];
      if (!id) {
        this.toastr.error('Invalid lesson ID');
        this.router.navigate(['/dashboard/build']);
        return;
      }

      this.crudService.getDocuments('website-lessons').subscribe(
        (lessons) => {
          const lessonsArray = lessons as ILesson[];
          const lesson = lessonsArray.find(l => l.id === id);
          
          if (!lesson) {
            this.toastr.error('Lesson not found');
            this.router.navigate(['/dashboard/build']);
            return;
          }

          this.lesson = {
            ...lesson,
            lessonTitle: {
              uz: lesson.lessonTitle?.uz || '',
              ru: lesson.lessonTitle?.ru || '',
              en: lesson.lessonTitle?.en || ''
            }
          };

          if (this.lesson.thumbnail) {
            const thumbnailUrl = typeof this.lesson.thumbnail === 'string' ? this.lesson.thumbnail : '';
            if (thumbnailUrl) {
              this.dropboxService.getThumbnail(thumbnailUrl).subscribe(
                (thumbnailBlob) => {
                  this.imgDisplay = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(thumbnailBlob));
                  this.loading = false;
                },
                (error) => {
                  console.error('Error loading thumbnail:', error);
                  this.loading = false;
                }
              );
            } else {
              this.loading = false;
            }
          } else {
            this.loading = false;
          }
        },
        (error) => {
          console.error('Error loading lesson:', error);
          this.toastr.error('Error loading lesson');
          this.loading = false;
        }
      );
    } catch (error) {
      console.error('Error in loadLesson:', error);
      this.toastr.error('Error loading lesson');
      this.loading = false;
    }
  }

  handleFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.file = input.files[0];
      this.imgDisplay = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(this.file));
    }
  }

  async uploadAllFilesAndSaveData(): Promise<void> {
    try {
      this.loading = true;
      this.loadingService.show();

      let thumbnailPath = typeof this.lesson.thumbnail === 'string' ? this.lesson.thumbnail : '';
      if (this.file) {
        const uploadPath = `/website-lessons/${this.lesson.id}/thumbnail`;
        thumbnailPath = await firstValueFrom(this.dropboxService.uploadFile(uploadPath, this.file));
      }

      const updatedLesson: Partial<ILesson> = {
        lessonTitle: this.lesson.lessonTitle,
        thumbnail: thumbnailPath,
        tasks: this.lesson.tasks
      };

      await firstValueFrom(this.crudService.updateDocument('website-lessons', this.lesson.id || '', updatedLesson));

      this.toastr.success('Lesson updated successfully');
      this.router.navigate(['/dashboard/build']);
    } catch (error) {
      console.error('Error saving lesson:', error);
      this.toastr.error('Error saving lesson');
    } finally {
      this.loading = false;
      this.loadingService.hide();
    }
  }

  cancel(): void {
    this.router.navigate(['/dashboard/build']);
  }

  getLessons() {
    this.loading = true;
    this.crudService.getDocuments('lessons').subscribe({
      next: (res) => {
        this.lessons = res as ILesson[];
        this.lessons.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.toastr.error('Fanlarni yuklashda xatolik yuz berdi');
        this.loading = false;
      }
    });
  }

  getWebsiteLessons() {
    this.crudService.getDocuments('website-lessons').subscribe((res) => {
      this.websiteLessons = res as ILesson[];
    });
  }

  isLessonDisabled(lesson: ILesson): boolean {
    return this.websiteLessons.some(websiteLesson => websiteLesson.lessonTitle?.uz === lesson.lessonTitle?.uz);
  }

  onLessonSelect(selectedLesson: ILesson): void {
    if (!selectedLesson) {
      this.selectedTask = null;
      return;
    }
    
    this.loading = true;
    this.crudService.getDocumentById('lessons', selectedLesson.id || '').subscribe({
      next: (res: any) => {
        this.selectedLesson = res as ILesson;
        if (this.selectedLesson?.tasks) {
          this.selectedLesson.tasks.sort((a: ITask, b: ITask) => {
            if (a.index !== undefined && b.index !== undefined) {
              return a.index - b.index;
            }
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });
        }
        this.loading = false;
        this.selectedTask = null;
      },
      error: (error) => {
        console.error('Error loading lesson details:', error);
        this.toastr.error('Fan ma\'lumotlarini yuklashda xatolik yuz berdi');
        this.loading = false;
      }
    });
  }

  onTaskSelect(selectedTask: ITask): void {
    if (!selectedTask) {
      this.selectedTask = null;
      this.errorCategories = [];
      return;
    }
    
    this.originalTask = JSON.parse(JSON.stringify(selectedTask));
    this.selectedTask = selectedTask;
    
    // Use proper type casting to avoid type errors
    if (!this.selectedTask.firstBasedFiles) {
      this.selectedTask.firstBasedFiles = {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      };
    }
    
    if (!this.selectedTask.secondBasedFiles) {
      this.selectedTask.secondBasedFiles = {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      };
    }
    
    this.loading = false;
  }

  saveChanges(): void {
    if (!this.selectedLesson || !this.selectedTask) {
      this.toastr.error('Iltimos, fan va topshiriqni tanlang!');
      return;
    }

    // Check if title exists and is not empty
    if (!this.selectedTask.title) {
      this.toastr.error('Iltimos, topshiriq nomini kiriting!');
      return;
    }
    
    // Handle different title types
    if (typeof this.selectedTask.title === 'string') {
      if ((this.selectedTask.title as string).trim() === '') {
        this.toastr.error('Iltimos, topshiriq nomini kiriting!');
        return;
      }
    } else if (typeof this.selectedTask.title === 'object') {
      const titleObj = this.selectedTask.title as MultiLangText;
      const allEmpty = (!titleObj.uz || titleObj.uz.trim() === '') && 
                       (!titleObj.ru || titleObj.ru.trim() === '') && 
                       (!titleObj.en || titleObj.en.trim() === '');
      if (allEmpty) {
        this.toastr.error('Iltimos, topshiriq nomini kiriting!');
        return;
      }
    }

    if (this.isTaskUnchanged()) {
      this.toastr.info('Hech qanday o\'zgarish kiritilmadi.');
      return;
    }

    this.loading = true;
    this.loadingService.show();
    
    const taskIndex = this.selectedLesson.tasks?.findIndex((t: ITask) => t.id === this.selectedTask?.id) ?? -1;
    
    if (taskIndex === -1) {
      this.toastr.error('Topshiriq topilmadi! Iltimos sahifani yangilang.');
      this.loading = false;
      this.loadingService.hide();
      return;
    }

    if (this.selectedLesson.tasks && taskIndex !== -1) {
      this.selectedLesson.tasks[taskIndex] = { ...this.selectedTask };
    }

    this.crudService.updateDocument('lessons', this.selectedLesson.id || '', this.selectedLesson)
      .pipe(
        catchError((error) => {
          console.error('Error saving task changes:', error);
          this.toastr.error('O\'zgarishlarni saqlashda xatolik yuz berdi.');
          throw error;
        })
      )
      .subscribe(() => {
        this.toastr.success('O\'zgarishlar muvaffaqiyatli saqlandi.');
        this.loading = false;
        this.loadingService.hide();
        
        this.originalTask = JSON.parse(JSON.stringify(this.selectedTask));
      });
  }

  isTaskUnchanged(): boolean {
    return JSON.stringify(this.originalTask) === JSON.stringify(this.selectedTask);
  }

  getLessonTitleString(lesson: ILesson): string {
    if (!lesson?.lessonTitle) return '';
    return `${lesson.lessonTitle.uz || ''} - ${lesson.lessonTitle.ru || ''} - ${lesson.lessonTitle.en || ''}`;
  }

  getTaskTitleString(task: ITask): string {
    if (!task?.title) return '';
    
    // Handle both string and MultiLangText types safely
    if (typeof task.title === 'string') {
      return task.title;
    }
    
    // Handle MultiLangText type
    if (task.title && typeof task.title === 'object') {
      return task.title.uz || task.title.ru || task.title.en || '';
    }
    
    return '';
  }

  // Method to handle file uploads and replacements
  uploadNewFile(fileType: string, index?: number): void {
    if (!this.selectedTask) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const modalRef = this.modalService.open(VideoUploadComponent, {
      centered: true,
      size: 'lg'
    });
    
    modalRef.componentInstance.fileType = fileType;
    modalRef.componentInstance.existingIndex = index;
    
    modalRef.result.then(
      (result) => {
        if (result) {
          this.handleFileUpload(result, fileType, index);
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  // Method to handle the file upload result
  handleFileUpload(fileData: any, fileType: string, index?: number): void {
    if (!this.selectedTask) return;
    
    this.uploading = true;
    this.progress = 0;
    this.currentUploadFile = fileData.file.name;
    this.totalUploads = 1;
    this.uploadedCount = 0;
    
    const path = `lessons/${this.selectedLesson?.id || ''}/${this.selectedTask?.id || ''}/${fileType}`;
    
    this.storageService.uploadFile(fileData.file, path)
      .subscribe(
        (progress) => {
          if (typeof progress === 'number') {
            this.progress = Math.round(progress);
          } else {
            // Upload complete, add file to task
            this.uploadedCount++;
            
            const fileObj = {
              name: fileData.name || fileData.file.name,
              url: progress.url,
              language: fileData.language || 'en',
              type: fileData.file.type
            };
            
            // Make sure we have a task and it's safe to proceed
            if (this.selectedTask) {
              // Initialize file array if it doesn't exist
              if (!this.selectedTask[fileType]) {
                this.selectedTask[fileType] = [];
              }
              
              // Make sure the array exists before trying to access or modify it
              if (Array.isArray(this.selectedTask[fileType])) {
                if (index !== undefined && index >= 0 && index < this.selectedTask[fileType].length) {
                  // Replace existing file
                  this.selectedTask[fileType][index] = fileObj;
                } else {
                  // Add new file
                  this.selectedTask[fileType].push(fileObj);
                }
              }
              
              this.uploading = false;
              this.saveChanges();
            }
          }
        },
        (error) => {
          this.uploading = false;
          this.toastr.error('Faylni yuklashda xatolik yuz berdi', 'Xato');
          console.error('Error uploading file:', error);
        }
      );
  }

  // Method to delete a file
  deleteFile(file: any, fileType: string, index: number): void {
    if (!this.selectedTask) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }
    
    // Check if the file type array exists
    if (!this.selectedTask[fileType] || !Array.isArray(this.selectedTask[fileType])) {
      this.toastr.error('Fayl turi mavjud emas!');
      return;
    }
    
    if (confirm("Siz rostdan ham bu faylni o'chirmoqchimisiz?")) {
      this.loading = true;
      
      // First delete from storage if there's a URL
      if (file && file.url) {
        this.storageService.deleteFile(file.url)
          .pipe(finalize(() => {
            // Remove from the array regardless of storage deletion success
            if (this.selectedTask && 
                this.selectedTask[fileType] && 
                Array.isArray(this.selectedTask[fileType]) && 
                index >= 0 && 
                index < this.selectedTask[fileType].length) {
              this.selectedTask[fileType].splice(index, 1);
              this.saveChanges();
            }
            this.loading = false;
          }))
          .subscribe(
            () => {
              this.toastr.success('Fayl muvaffaqiyatli o\'chirildi', 'Muvaffaqiyat');
            },
            (error) => {
              this.toastr.warning('Fayl topshiriqdan olib tashlandi, lekin saqlash joyida hali ham mavjud bo\'lishi mumkin', 'Ogohlantirish');
              console.error('Error deleting file from storage:', error);
            }
          );
      } else {
        // No URL to delete from storage, just remove from array
        if (this.selectedTask && 
            this.selectedTask[fileType] && 
            Array.isArray(this.selectedTask[fileType]) && 
            index >= 0 && 
            index < this.selectedTask[fileType].length) {
          this.selectedTask[fileType].splice(index, 1);
          this.saveChanges();
        }
        this.loading = false;
      }
    }
  }

  // Helper method to get the filename from currentUploadFile
  getFileName(file?: any): string {
    // If no argument provided, handle currentUploadFile
    if (file === undefined) {
      if (typeof this.currentUploadFile === 'string') {
        return this.currentUploadFile;
      } else if (this.currentUploadFile && typeof this.currentUploadFile === 'object' && 'name' in this.currentUploadFile) {
        return (this.currentUploadFile as any).name;
      }
      return '';
    }
    
    // If argument provided, handle file
    if (!file) return 'Unknown';
    
    if (file.name) return file.name;
    
    if (file.path) {
      // Extract filename from path
      const parts = file.path.split('/');
      return parts[parts.length - 1];
    }
    
    if (file.url) {
      // Try to extract from URL
      const urlParts = file.url.split('/');
      return urlParts[urlParts.length - 1];
    }
    
    return 'Unknown file';
  }

  // Helper functions to check if user has made changes
  hasChanges(): boolean {
    return !this.isTaskUnchanged();
  }

  // Add a helper method to format URLs for display
  getShortUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Try to extract domain and path
      const urlObj = new URL(url);
      let display = urlObj.hostname;
      
      // Add path but limit length
      if (urlObj.pathname && urlObj.pathname !== '/') {
        const path = urlObj.pathname.length > 15 
          ? urlObj.pathname.substring(0, 12) + '...' 
          : urlObj.pathname;
        display += path;
      }
      
      return display;
    } catch (e) {
      // If URL parsing fails, just return a truncated version
      if (url.length > 30) {
        return url.substring(0, 27) + '...';
      }
      return url;
    }
  }
}
