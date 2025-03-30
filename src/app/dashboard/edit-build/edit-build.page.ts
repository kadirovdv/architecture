import { Component, HostListener, OnInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { catchError, concatMap, from, tap, timer, Observable, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { Lesson, LessonTitle, Task, FirstClassFileGroups, SecondClassFileGroups, Files, Videos } from 'src/app/shared/interfaces/interfaces';
import { DomSanitizer, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VideoUploadComponent } from '../create-build/video-upload/video-upload.component';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { FirebaseError } from 'firebase/app';
import { LessonService } from 'src/app/shared/services/lesson.service';
import { StorageService } from 'src/app/shared/services/storage.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-edit-build',
  templateUrl: './edit-build.page.html',
  styleUrls: ['./edit-build.page.scss'],
})
export class EditBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  lessonIdToEdit: string = '';
  lesson: Lesson = {
    id: '',
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

  lessons: Lesson[] = [];
  websiteLessons: Lesson[] = [];
  task: Task | any = null;
  selectedLanguage: 'uz' | 'ru' | 'en' = 'uz';
  currentCategory: string = '';
  errorCategories: string[] = [];
  selectedLesson: Lesson | null = null;
  selectedTask: Task | null = null;
  originalTask: Task | null = null;
  fileUploads: { [key: string]: Observable<any>[] } = {};

  // Upload properties
  uploading: boolean = false;
  progress: number = 0;
  currentUploadFile: string = '';
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

  onFileSelected(
    event: Event,
    category: keyof FirstClassFileGroups | keyof SecondClassFileGroups,
    language: string
  ) {
    if (!this.selectedTask) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);
    console.log(`Number of files selected: ${files.length}`);

    const oversizedFiles = files.filter(
      (file) => file.size / (1024 * 1024) > 150
    ); 
    if (oversizedFiles.length > 0) {
      this.toastr.error("Fayl hajmi 150MB dan o'tib ketdi!");
      return;
    }

    const filesArray = files.map((file) => ({
      name: file.name,
      size: file.size,
      file: file,
    }));

    this.selectedTask.firstBasedFiles ??= {
      taskExampleFiles: { uz: [], ru: [], en: [] },
      taskSolutionFiles: { uz: [], ru: [], en: [] },
    } as FirstClassFileGroups;

    this.selectedTask.secondBasedFiles ??= {
      taskTitleFiles: { uz: [], ru: [], en: [] },
      taskPresentationFiles: { uz: [], ru: [], en: [] },
      taskLiteratureFiles: { uz: [], ru: [], en: [] },
      taskVideoUrls: [],
    } as SecondClassFileGroups;

    if (this.isFirstClassFileCategory(category)) {
      this.selectedTask.firstBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.selectedTask.firstBasedFiles[category][language] ??= [];
      this.selectedTask.firstBasedFiles[category][language] = [
        ...this.selectedTask.firstBasedFiles[category][language]!,
        ...filesArray,
      ];
    } else if (this.isSecondClassFileCategory(category)) {
      this.selectedTask.secondBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.selectedTask.secondBasedFiles[category][language] ??= [];
      this.selectedTask.secondBasedFiles[category][language] = [
        ...this.selectedTask.secondBasedFiles[category][language]!,
        ...filesArray,
      ];
    }

    input.value = '';

    this.uploadAndSaveFiles(category, language, filesArray);
  }

  private isFirstClassFileCategory(
    category: string
  ): category is keyof FirstClassFileGroups {
    return ['taskExampleFiles', 'taskSolutionFiles'].includes(category);
  }

  private isSecondClassFileCategory(
    category: string
  ): category is keyof SecondClassFileGroups {
    return [
      'taskTitleFiles',
      'taskPresentationFiles',
      'taskLiteratureFiles',
    ].includes(category);
  }

  onRemoveFile(event: { category: string; lang: string; index: number; autoSave?: boolean }): void {
    if (!this.selectedTask) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const { category, lang, index, autoSave = true } = event;

    if (this.isFirstClassFileCategory(category)) {
      if (this.selectedTask.firstBasedFiles?.[category]?.[lang]) {
        this.selectedTask.firstBasedFiles[category][lang].splice(index, 1);
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.selectedTask.secondBasedFiles?.[category]?.[lang]) {
        this.selectedTask.secondBasedFiles[category][lang].splice(index, 1);
      }
    }

    if (autoSave) {
      this.saveChanges();
    }
  }

  onFileTypeSelect(lang: string, category: string) {
    const input = this.hiddenInputs.find(
      (el) => el.nativeElement.dataset.category === category
    );
    
    if (input) {
      this.selectedLanguage = lang as 'uz' | 'ru' | 'en';
      this.currentCategory = category;
      input.nativeElement.click();
    }
  }

  addVideo() {
    if (!this.selectedTask) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const modalRef = this.modalService.open(VideoUploadComponent, {
      centered: true,
      size: 'lg',
    });

    modalRef.result.then(
      (result) => {
        if (result) {
          this.selectedTask.secondBasedFiles ??= {} as SecondClassFileGroups;
          this.selectedTask.secondBasedFiles.taskVideoUrls ??= [];
          
          this.selectedTask.secondBasedFiles.taskVideoUrls.push(result);
          
          this.saveChanges();
        }
      },
      (reason) => {
        console.log('Video upload modal dismissed', reason);
      }
    );
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
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

  async loadLesson(): Promise<void> {
    try {
      this.loading = true;
      const id = this.activatedRoute.snapshot.queryParams['id'];
      if (!id) {
        this.toastr.error('Invalid lesson ID');
        this.router.navigate(['/dashboard/build']);
        return;
      }

      const lessons = await firstValueFrom(this.crudService.getDocuments('website-lessons')) as Lesson[];
      const lesson = lessons.find(l => l.id === id);
      
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
          const thumbnailBlob = await firstValueFrom(this.dropboxService.getThumbnail(thumbnailUrl));
          this.imgDisplay = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(thumbnailBlob));
        }
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      this.toastr.error('Error loading lesson');
    } finally {
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

      const updatedLesson: Partial<Lesson> = {
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
        this.lessons = res as Lesson[];
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
      this.websiteLessons = res as Lesson[];
    });
  }

  isLessonDisabled(lesson: Lesson): boolean {
    return this.websiteLessons.some(websiteLesson => websiteLesson.lessonTitle?.uz === lesson.lessonTitle?.uz);
  }

  onReplaceFile(event: {
    category: string;
    lang: string;
    index: number;
    file: File;
  }): void {
    if (!this.selectedTask) {
      this.toastr.error('Please select a task first');
      return;
    }

    const { category, lang, index, file } = event;

    if (file.size / (1024 * 1024) > 150) {
      this.toastr.error("Fayl 150MB dan o'tib ketdi");
      return;
    }

    const newFile = {
      name: file.name,
      size: file.size,
      file: file,
    };

    if (this.isFirstClassFileCategory(category)) {
      if (this.selectedTask.firstBasedFiles[category]?.[lang]) {
        this.selectedTask.firstBasedFiles[category][lang][index] = newFile;
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.selectedTask.secondBasedFiles[category]?.[lang]) {
        this.selectedTask.secondBasedFiles[category][lang][index] = newFile;
      }
    }
  }

  onLessonSelect(selectedLesson: Lesson): void {
    if (!selectedLesson) {
      this.selectedTask = null;
      return;
    }
    
    this.loading = true;
    this.crudService.getDocumentById('lessons', selectedLesson.id || '').subscribe({
      next: (res: any) => {
        this.selectedLesson = res as Lesson;
        if (this.selectedLesson?.tasks) {
          this.selectedLesson.tasks.sort((a: Task, b: Task) => {
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

  onTaskSelect(selectedTask: Task): void {
    if (!selectedTask) {
      this.selectedTask = null;
      return;
    }

    this.loading = true;
    
    this.originalTask = JSON.parse(JSON.stringify(selectedTask));
    this.selectedTask = selectedTask;
    
    this.selectedTask.firstBasedFiles ??= {
      taskExampleFiles: { uz: [], ru: [], en: [] },
      taskSolutionFiles: { uz: [], ru: [], en: [] },
    } as FirstClassFileGroups;

    this.selectedTask.secondBasedFiles ??= {
      taskTitleFiles: { uz: [], ru: [], en: [] },
      taskPresentationFiles: { uz: [], ru: [], en: [] },
      taskLiteratureFiles: { uz: [], ru: [], en: [] },
      taskVideoUrls: [],
    } as SecondClassFileGroups;
    
    this.loading = false;
  }

  saveChanges(): void {
    if (!this.selectedLesson || !this.selectedTask) {
      this.toastr.error('Iltimos, fan va topshiriqni tanlang!');
      return;
    }

    if (!this.selectedTask.title || this.selectedTask.title.trim() === '') {
      this.toastr.error('Iltimos, topshiriq nomini kiriting!');
      return;
    }

    if (this.isTaskUnchanged()) {
      this.toastr.info('Hech qanday o\'zgarish kiritilmadi.');
      return;
    }

    this.loading = true;
    this.loadingService.show();
    
    const taskIndex = this.selectedLesson.tasks?.findIndex((t: Task) => t.id === this.selectedTask?.id) ?? -1;
    
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

  uploadAndSaveFiles(category: string, language: string, files: any[]): void {
    if (!this.selectedLesson || !this.selectedTask) {
      this.toastr.error('Iltimos, fan va topshiriqni tanlang!');
      return;
    }

    this.loading = true;
    this.loadingService.show();
    this.totalUploads = files.length;
    this.uploadedCount = 0;
    this.progress = 0;

    this.fileUploads[category] = this.fileUploads[category] || [];

    const uploads = files.map((fileItem, index) => {
      const file = fileItem.file;
      if (!file) return of(null);

      const filePath = `/${this.selectedLesson?.id}/${this.selectedTask?.id}/${category}/${language}/${file.name}`;
      
      return this.dropboxService.uploadFile(filePath, file).pipe(
        tap(() => {
          this.uploadedCount++;
          this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
          this.currentUploadFile = { name: file.name, size: file.size };
        }),
        switchMap(response => {
          return this.dropboxService.createSharedLink(response).pipe(
            map(shareUrl => {
              if (this.isFirstClassFileCategory(category)) {
                if (this.selectedTask?.firstBasedFiles?.[category]?.[language]?.[index + this.getExistingFileCount(category, language) - files.length]) {
                  this.selectedTask.firstBasedFiles[category][language][index + this.getExistingFileCount(category, language) - files.length].url = shareUrl;
                  this.selectedTask.firstBasedFiles[category][language][index + this.getExistingFileCount(category, language) - files.length].path = response;
                }
              } else if (this.isSecondClassFileCategory(category)) {
                if (this.selectedTask?.secondBasedFiles?.[category]?.[language]?.[index + this.getExistingFileCount(category, language) - files.length]) {
                  this.selectedTask.secondBasedFiles[category][language][index + this.getExistingFileCount(category, language) - files.length].url = shareUrl;
                  this.selectedTask.secondBasedFiles[category][language][index + this.getExistingFileCount(category, language) - files.length].path = response;
                }
              }
              
              return { shareUrl, path: response };
            })
          );
        }),
        catchError(error => {
          console.error(`Error uploading file ${file.name}:`, error);
          this.toastr.error(`Faylni yuklashda xatolik: ${file.name}`);
          return of(null);
        })
      );
    });

    this.fileUploads[category] = [...this.fileUploads[category], ...uploads];

    forkJoin(uploads).subscribe({
      next: (results) => {
        this.saveChanges();
        this.loading = false;
        this.loadingService.hide();
        this.toastr.success(`${language.toUpperCase()} tilidagi ${files.length} ta fayl muvaffaqiyatli yuklandi!`);
      },
      error: (error) => {
        console.error('Error during file uploads:', error);
        this.toastr.error('Fayllarni yuklashda xatolik yuz berdi!');
        this.loading = false;
        this.loadingService.hide();
      }
    });
  }

  getExistingFileCount(category: string, language: string): number {
    if (this.isFirstClassFileCategory(category)) {
      return this.selectedTask?.firstBasedFiles?.[category]?.[language]?.length || 0;
    } else if (this.isSecondClassFileCategory(category)) {
      return this.selectedTask?.secondBasedFiles?.[category]?.[language]?.length || 0;
    }
    return 0;
  }

  getLessonTitleString(lesson: Lesson): string {
    if (!lesson?.lessonTitle) return '';
    return `${lesson.lessonTitle.uz || ''} - ${lesson.lessonTitle.ru || ''} - ${lesson.lessonTitle.en || ''}`;
  }

  getTaskTitleString(task: Task): string {
    return task?.title || '';
  }

  loadLessons(): void {
    this.loading = true;
    this.lessonService.getLessons()
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        (data) => {
          this.lessons = data;
          if (this.selectedLessonId) {
            this.selectLessonById(this.selectedLessonId);
          }
        },
        (error) => {
          this.toastr.error('Failed to load lessons', 'Error');
          console.error('Error loading lessons:', error);
        }
      );
  }

  selectLessonById(lessonId: string): void {
    const lesson = this.lessons.find(l => l.id === lessonId);
    if (lesson) {
      this.selectedLesson = lesson;
      this.selectedLessonId = lesson.id;
    }
  }

  onLessonSelect(lesson: any): void {
    this.selectedLesson = lesson;
    this.selectedTask = null;
    this.selectedTaskId = '';
    this.originalTask = null;
  }

  onTaskSelect(task: any): void {
    this.loading = true;
    this.lessonService.getTaskById(this.selectedLesson.id, task.id)
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        (fullTask) => {
          this.selectedTask = fullTask;
          this.selectedTaskId = fullTask.id;
          // Create a deep copy of the task for change detection
          this.originalTask = JSON.parse(JSON.stringify(fullTask));
        },
        (error) => {
          this.toastr.error('Failed to load task details', 'Error');
          console.error('Error loading task details:', error);
        }
      );
  }

  hasChanges(): boolean {
    if (!this.selectedTask || !this.originalTask) return false;
    return JSON.stringify(this.selectedTask) !== JSON.stringify(this.originalTask);
  }

  saveChanges(): void {
    if (!this.selectedTask) return;
    
    this.loading = true;
    this.lessonService.updateTask(this.selectedLesson.id, this.selectedTask)
      .pipe(finalize(() => this.loading = false))
      .subscribe(
        () => {
          this.toastr.success('Task updated successfully', 'Success');
          // Update the original task to reflect the current state
          this.originalTask = JSON.parse(JSON.stringify(this.selectedTask));
        },
        (error) => {
          this.toastr.error('Failed to update task', 'Error');
          console.error('Error updating task:', error);
        }
      );
  }

  uploadNewFile(fileType: string, index?: number): void {
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

  handleFileUpload(fileData: any, fileType: string, index?: number): void {
    if (!this.selectedTask) return;
    
    this.uploading = true;
    this.progress = 0;
    this.currentUploadFile = fileData.file.name;
    this.totalUploads = 1;
    this.uploadedCount = 0;
    
    const path = `lessons/${this.selectedLesson.id}/tasks/${this.selectedTask.id}/${fileType}`;
    
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
            
            if (!this.selectedTask[fileType]) {
              this.selectedTask[fileType] = [];
            }
            
            if (index !== undefined && index >= 0 && index < this.selectedTask[fileType].length) {
              // Replace existing file
              this.selectedTask[fileType][index] = fileObj;
            } else {
              // Add new file
              this.selectedTask[fileType].push(fileObj);
            }
            
            this.uploading = false;
            this.saveChanges();
          }
        },
        (error) => {
          this.uploading = false;
          this.toastr.error('Failed to upload file', 'Error');
          console.error('Error uploading file:', error);
        }
      );
  }

  deleteFile(file: any, fileType: string, index: number): void {
    if (!this.selectedTask || !this.selectedTask[fileType]) return;
    
    if (confirm('Are you sure you want to delete this file?')) {
      this.loading = true;
      
      // First delete from storage if there's a URL
      if (file.url) {
        this.storageService.deleteFile(file.url)
          .pipe(finalize(() => {
            // Remove from the array regardless of storage deletion success
            this.selectedTask[fileType].splice(index, 1);
            this.saveChanges();
            this.loading = false;
          }))
          .subscribe(
            () => {
              this.toastr.success('File deleted successfully', 'Success');
            },
            (error) => {
              this.toastr.warning('File removed from task but may still exist in storage', 'Warning');
              console.error('Error deleting file from storage:', error);
            }
          );
      } else {
        // No URL to delete from storage, just remove from array
        this.selectedTask[fileType].splice(index, 1);
        this.saveChanges();
        this.loading = false;
      }
    }
  }
}
