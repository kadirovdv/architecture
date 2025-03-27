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

  constructor(
    private crudService: CrudService,
    private dropboxService: DropboxService,
    private toastr: ToastrService,
    private activatedRoute: ActivatedRoute,
    private navigate: Location,
    private router: Router,
    private loadingService: LoadingService,
    private sanitizer: DomSanitizer,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadLesson();
    this.getLessons();
    this.getWebsiteLessons();
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
    if (!this.task) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const files = Array.from(input.files);

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

    this.task.firstBasedFiles ??= {
      taskExampleFiles: { uz: [], ru: [], en: [] },
      taskSolutionFiles: { uz: [], ru: [], en: [] },
    } as FirstClassFileGroups;

    this.task.secondBasedFiles ??= {
      taskTitleFiles: { uz: [], ru: [], en: [] },
      taskPresentationFiles: { uz: [], ru: [], en: [] },
      taskLiteratureFiles: { uz: [], ru: [], en: [] },
      taskVideoUrls: [],
    } as SecondClassFileGroups;

    if (this.isFirstClassFileCategory(category)) {
      this.task.firstBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.task.firstBasedFiles[category][language] ??= [];
      this.task.firstBasedFiles[category][language] = [
        ...this.task.firstBasedFiles[category][language]!,
        ...filesArray,
      ];
    } else if (this.isSecondClassFileCategory(category)) {
      this.task.secondBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.task.secondBasedFiles[category][language] ??= [];
      this.task.secondBasedFiles[category][language] = [
        ...this.task.secondBasedFiles[category][language]!,
        ...filesArray,
      ];
    }

    input.value = '';

    this.toastr.success(
      `Fayllar ${language.toUpperCase()} tilida muvaffaqiyatli qo'shildi`
    );
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

  onRemoveFile(event: { category: string; lang: string; index: number }): void {
    if (this.task) {
      if (event.category === 'taskVideoUrls') {
        // Handle video deletion
        if (this.task.secondBasedFiles?.taskVideoUrls) {
          this.task.secondBasedFiles.taskVideoUrls.splice(event.index, 1);
          this.toastr.success('Video muvaffaqiyatli o\'chirildi');
        }
      } else if (this.isFirstClassFileCategory(event.category)) {
        this.task.firstBasedFiles[event.category][event.lang]?.splice(
          event.index,
          1
        );
        this.toastr.success('Fayl muvaffaqiyatli o\'chirildi');
      } else if (this.isSecondClassFileCategory(event.category)) {
        this.task.secondBasedFiles[event.category][event.lang]?.splice(
          event.index,
          1
        );
        this.toastr.success('Fayl muvaffaqiyatli o\'chirildi');
      }
    }
  }

  onFileTypeSelect(lang: string, category: string) {
    this.selectedLanguage = lang as 'uz' | 'ru' | 'en';
    this.currentCategory = category;
    const inputs = this.hiddenInputs.toArray();
    const input = inputs.find(
      (input) => input.nativeElement.getAttribute('data-category') === category
    );
    if (input) {
      input.nativeElement.click();
    }
  }

  addVideo() {
    const modalRef = this.modalService.open(VideoUploadComponent);
    modalRef.result
      .then((result: Videos) => {
        if (!this.task.secondBasedFiles.taskVideoUrls) {
          this.task.secondBasedFiles.taskVideoUrls = [];
        }
        
        // Check if this video already exists to prevent duplicates
        const isDuplicate = this.task.secondBasedFiles.taskVideoUrls.some((video: Videos) => 
          (video.url.uz === result.url.uz && video.url.uz !== '') ||
          (video.url.ru === result.url.ru && video.url.ru !== '') ||
          (video.url.en === result.url.en && video.url.en !== '')
        );
        
        if (isDuplicate) {
          this.toastr.warning('Bu video allaqachon mavjud!');
          return;
        }
        
        // Add the video if it's not a duplicate
        this.task.secondBasedFiles.taskVideoUrls.push(result);
        this.toastr.success('Video muvaffaqiyatli qo\'shildi');
      })
      .catch(() => {});
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

      // Upload thumbnail if changed
      let thumbnailPath = typeof this.lesson.thumbnail === 'string' ? this.lesson.thumbnail : '';
      if (this.file) {
        const uploadPath = `/website-lessons/${this.lesson.id}/thumbnail`;
        thumbnailPath = await firstValueFrom(this.dropboxService.uploadFile(uploadPath, this.file));
      }

      // Update lesson data
      const updatedLesson: Partial<Lesson> = {
        lessonTitle: this.lesson.lessonTitle,
        thumbnail: thumbnailPath,
        tasks: this.lesson.tasks
      };

      // Update lesson document
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
    this.lessons = [];
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res as Lesson[];
      this.lessons.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
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
    if (!this.task) {
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
      if (this.task.firstBasedFiles[category]?.[lang]) {
        this.task.firstBasedFiles[category][lang][index] = newFile;
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles[category]?.[lang]) {
        this.task.secondBasedFiles[category][lang][index] = newFile;
      }
    }
  }
}
