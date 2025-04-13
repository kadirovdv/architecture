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
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { FirebaseError } from 'firebase/app';
import { LessonService } from 'src/app/shared/services/lesson.service';
import { StorageService } from 'src/app/shared/services/storage.service';
import { EditTitlesModalComponent } from '../../shared/components/edit-titles-modal/edit-titles-modal.component';

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
  styleUrls: ['./edit-build.page.scss']
})
export class EditBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  @ViewChildren('fileInput') fileInputs!: QueryList<ElementRef>;
  @ViewChildren('taskExampleInput, taskSolutionInput, taskTitleInput, taskPresentationInput, taskLiteratureInput') 
  taskInputs!: QueryList<ElementRef>;
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
  task: ITask | any = {
    id: '',
    title: { uz: '', ru: '', en: '' },
    firstBasedFiles: {
      taskExampleFiles: { uz: [], ru: [], en: [] },
      taskSolutionFiles: { uz: [], ru: [], en: [] }
    },
    secondBasedFiles: {
      taskTitleFiles: { uz: [], ru: [], en: [] },
      taskPresentationFiles: { uz: [], ru: [], en: [] },
      taskLiteratureFiles: { uz: [], ru: [], en: [] },
      taskVideoUrls: []
    }
  };
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
  currentUploadFile: { name: string; size: number } = { name: '', size: 0 };
  uploadedCount: number = 0;
  totalUploads: number = 0;

  // Properties needed for template compatibility
  existingLesson: ILesson | null = null;

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
    // Get both website lessons and regular lessons for task selection
    this.getLessons();
    this.getWebsiteLessons();

    // Get the lesson ID from query params
    this.activatedRoute.queryParams.subscribe(params => {
      const lessonId = params['id'];
      
      if (lessonId) {
        this.selectedLessonId = lessonId;
        this.loadLessonById(lessonId);
      } else {
        // If no lesson ID provided, use the first available website lesson
        this.crudService.getDocuments('website-lessons').pipe(
          tap((lessons: any[]) => {
            if (lessons && lessons.length > 0) {
              const firstLesson = lessons[0] as ILesson;
              this.selectedLesson = firstLesson;
              this.lesson = firstLesson;
              this.existingLesson = firstLesson;
              
              // Prepare tasks from both website and regular lessons with appropriate labels
              this.prepareTasksWithLabels();
              
              // If this lesson has tasks, select the first one
              if (this.lesson.tasks && this.lesson.tasks.length > 0) {
                const firstTask = this.lesson.tasks[0];
                this.onTaskSelect(firstTask);
              }
            }
          })
        ).subscribe();
        
        this.toastr.info('No lesson ID provided, using first available website lesson');
      }
    });
  }

  private loadLessonById(lessonId: string): void {
    this.loading = true;
    this.loadingService.show();
    
    // Only check in website-lessons
    this.crudService.getDocumentById('website-lessons', lessonId).subscribe({
      next: (lessonData) => {
        if (lessonData) {
          console.log('Found lesson in website-lessons:', lessonData);
          this.existingLesson = lessonData as ILesson;
          this.lesson = { ...lessonData as ILesson };
          
          // Set as the only item in lessons array for the dropdown
          this.lessons = [this.lesson];
          
          // Also set the selectedLesson for compatibility
          this.selectedLesson = this.lesson;
          
          // Prepare tasks from both website and regular lessons with appropriate labels
          this.prepareTasksWithLabels();
          
          // If this lesson has tasks, automatically select the first one
          if (this.lesson.tasks && this.lesson.tasks.length > 0) {
            console.log('Auto-selecting first task:', this.lesson.tasks[0]);
            this.onTaskSelect(this.lesson.tasks[0]);
          } else {
            console.log('No tasks available in the lesson');
            // Initialize an empty task with proper structure
            this.task = {
              id: '',
              title: { uz: '', ru: '', en: '' },
              firstBasedFiles: {
                taskExampleFiles: { uz: [], ru: [], en: [] },
                taskSolutionFiles: { uz: [], ru: [], en: [] }
              },
              secondBasedFiles: {
                taskTitleFiles: { uz: [], ru: [], en: [] },
                taskPresentationFiles: { uz: [], ru: [], en: [] },
                taskLiteratureFiles: { uz: [], ru: [], en: [] },
                taskVideoUrls: []
              }
            };
          }
          
          this.loading = false;
          this.loadingService.hide();
          this.toastr.success('Lesson loaded successfully');
        } else {
          this.loading = false;
          this.loadingService.hide();
          this.toastr.error('Lesson not found in website-lessons');
          this.router.navigate(['/dashboard/lessons']);
        }
      },
      error: (error) => {
        console.error('Error fetching lesson from website-lessons:', error);
        this.loading = false;
        this.loadingService.hide();
        this.toastr.error('Error loading lesson');
        this.router.navigate(['/dashboard/lessons']);
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

  onFileTypeSelect(lang: string, category: string) {
    console.log(`Selecting file for language: ${lang}, category: ${category}`);
    this.selectedLanguage = lang as 'uz' | 'ru' | 'en';
    this.currentCategory = category;
    
    const inputs = this.taskInputs.toArray();
    const input = inputs.find(
      (input) => input.nativeElement.getAttribute('data-category') === category
    );
    
    if (input) {
      console.log(`Found input for category: ${category}`);
      input.nativeElement.click();
    } else {
      console.error(`No input found for category: ${category}`);
      this.toastr.error(`No input found for category: ${category}`);
    }
  }

  onFileSelected(
    event: Event,
    category: keyof FirstClassFileGroups | keyof SecondClassFileGroups,
    language: string
  ) {
    console.log(`File selected for category: ${category}, language: ${language}`);
    
    if (!this.task) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.log('No files selected');
      return;
    }

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
      type: file.type
    }));

    // Ensure task data structures exist
    if (!this.task.firstBasedFiles) {
      this.task.firstBasedFiles = {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      } as FirstClassFileGroups;
    }

    if (!this.task.secondBasedFiles) {
      this.task.secondBasedFiles = {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      } as SecondClassFileGroups;
    }

    // Add files to the appropriate category and language
    if (this.isFirstClassFileCategory(category)) {
      // Ensure category and language arrays exist
      if (!this.task.firstBasedFiles[category]) {
        this.task.firstBasedFiles[category] = { uz: [], ru: [], en: [] };
      }
      
      if (!this.task.firstBasedFiles[category][language]) {
        this.task.firstBasedFiles[category][language] = [];
      }
      
      // Append new files to existing array
      this.task.firstBasedFiles[category][language] = [
        ...(this.task.firstBasedFiles[category][language] || []),
        ...filesArray
      ];
      
      console.log(`Added ${filesArray.length} files to ${category}.${language}`);
      console.log(`Total files in category now: ${this.task.firstBasedFiles[category][language].length}`);
    } else if (this.isSecondClassFileCategory(category)) {
      // Ensure category and language arrays exist
      if (!this.task.secondBasedFiles[category]) {
        this.task.secondBasedFiles[category] = { uz: [], ru: [], en: [] };
      }
      
      if (!this.task.secondBasedFiles[category][language]) {
        this.task.secondBasedFiles[category][language] = [];
      }
      
      // Append new files to existing array
      this.task.secondBasedFiles[category][language] = [
        ...(this.task.secondBasedFiles[category][language] || []),
        ...filesArray
      ];
      
      console.log(`Added ${filesArray.length} files to ${category}.${language}`);
      console.log(`Total files in category now: ${this.task.secondBasedFiles[category][language].length}`);
    }

    // Reset the input
    input.value = '';

    this.toastr.success(
      `Fayllar ${language.toUpperCase()} tilida muvaffaqiyatli qo'shildi`
    );
  }

  onDirectFileSelected(
    file: File,
    category: keyof FirstClassFileGroups | keyof SecondClassFileGroups,
    language: string
  ) {
    console.log(`Direct file selected for ${category} in ${language}:`, file.name);
    
    if (!this.task) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }

    if (file.size / (1024 * 1024) > 150) {
      this.toastr.error("Fayl hajmi 150MB dan o'tib ketdi!");
      return;
    }

    const fileObj = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file, // This is a proper File object
    };

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
      this.task.firstBasedFiles[category][language].push(fileObj);
      
      console.log(`Added file to ${category}.${language}`);
      console.log(`Total files now: ${this.task.firstBasedFiles[category][language].length}`);
    } else if (this.isSecondClassFileCategory(category)) {
      this.task.secondBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.task.secondBasedFiles[category][language] ??= [];
      this.task.secondBasedFiles[category][language].push(fileObj);
      
      console.log(`Added file to ${category}.${language}`);
      console.log(`Total files now: ${this.task.secondBasedFiles[category][language].length}`);
    }

    this.toastr.success(
      `Fayl ${language.toUpperCase()} tilida muvaffaqiyatli qo'shildi`
    );
  }

  onRemoveFile(event: { category: string; lang: string; index: number; autoSave?: boolean }): void {
    if (!this.task) {
      this.toastr.error('Iltimos, topshiriqni tanlang!');
      return;
    }
    
    const { category, lang, index, autoSave = false } = event;
    console.log(`Removing file at index ${index} from ${category}.${lang}`);
    
    // Try to get the file being removed to show info and check if it has a URL (existing file)
    let fileToRemove = null;
    
    if (category === 'taskVideoUrls') {
      // Handle video deletion
      if (this.task.secondBasedFiles?.taskVideoUrls?.[index]) {
        fileToRemove = this.task.secondBasedFiles.taskVideoUrls[index];
        
        // Remove the video from the array
        this.task.secondBasedFiles.taskVideoUrls.splice(index, 1);
        
        // Log success message
        console.log(`Removed video at index ${index}`, fileToRemove);
        this.toastr.success('Video muvaffaqiyatli o\'chirildi');
      }
    } else if (this.isFirstClassFileCategory(category)) {
      if (this.task.firstBasedFiles[category]?.[lang]?.[index]) {
        fileToRemove = this.task.firstBasedFiles[category][lang][index];
        
        // Remove the file from the array
        this.task.firstBasedFiles[category][lang].splice(index, 1);
        
        // Log success message
        console.log(`Removed file from firstBasedFiles.${category}.${lang}`, fileToRemove);
        this.toastr.success('Fayl muvaffaqiyatli o\'chirildi');
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles[category]?.[lang]?.[index]) {
        fileToRemove = this.task.secondBasedFiles[category][lang][index];
        
        // Remove the file from the array
        this.task.secondBasedFiles[category][lang].splice(index, 1);
        
        // Log success message
        console.log(`Removed file from secondBasedFiles.${category}.${lang}`, fileToRemove);
        this.toastr.success('Fayl muvaffaqiyatli o\'chirildi');
      }
    }
    
    // Show additional info if we removed an existing file (one with a URL)
    if (fileToRemove && fileToRemove.url) {
      console.log(`Removed existing file: ${fileToRemove.name} with URL: ${fileToRemove.url}`);
    }
    
    // Auto-save changes to Firebase if requested
    if (autoSave && this.existingLesson) {
      console.log('Auto-saving changes after file removal');
      this.saveChanges();
    }
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

    // Get the existing file to preserve metadata when possible
    let existingFile: any = null;
    let fileCategory: 'firstBasedFiles' | 'secondBasedFiles' = 
      this.isFirstClassFileCategory(category) ? 'firstBasedFiles' : 'secondBasedFiles';

    if (this.isFirstClassFileCategory(category)) {
      existingFile = this.task.firstBasedFiles[category]?.[lang]?.[index];
    } else if (this.isSecondClassFileCategory(category)) {
      existingFile = this.task.secondBasedFiles[category]?.[lang]?.[index];
    }

    // Create the new file object, preserving existing metadata
    const newFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file, // This is a proper File object
      // Preserve these fields from the existing file if they exist
      id: existingFile?.id,
      path: existingFile?.path,
      path_lower: existingFile?.path_lower,
      rev: existingFile?.rev,
      // Add a flag to indicate this is a replacement
      isReplacement: true,
      replacedFileUrl: existingFile?.url,
      replacedFileId: existingFile?.id
    };

    // Replace the file in the appropriate category
    if (this.isFirstClassFileCategory(category)) {
      if (this.task.firstBasedFiles[category]?.[lang]) {
        // Remove the URL to trigger a new upload
        if (existingFile) delete existingFile.url;
        // Replace the existing file with the new one
        this.task.firstBasedFiles[category][lang][index] = newFile;
      }
      this.toastr.success('Fayl muvaffaqiyatli o\'zgartirildi');
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles[category]?.[lang]) {
        // Remove the URL to trigger a new upload
        if (existingFile) delete existingFile.url;
        // Replace the existing file with the new one
        this.task.secondBasedFiles[category][lang][index] = newFile;
      }
      this.toastr.success('Fayl muvaffaqiyatli o\'zgartirildi');
    }
    
    console.log(`File replaced in ${category}.${lang} at index ${index}:`, newFile);
  }

  addVideo() {
    const modalRef = this.modalService.open(VideoUploadComponent);
    modalRef.result
      .then((result: Videos) => {
        if (!this.task.secondBasedFiles.taskVideoUrls) {
          this.task.secondBasedFiles.taskVideoUrls = [];
        }
        
        const isDuplicate = this.task.secondBasedFiles.taskVideoUrls.some((video: Videos) => 
          (video.url.uz === result.url.uz && video.url.uz !== '') ||
          (video.url.ru === result.url.ru && video.url.ru !== '') ||
          (video.url.en === result.url.en && video.url.en !== '')
        );
        
        if (isDuplicate) {
          this.toastr.warning('Bu video allaqachon mavjud!');
          return;
        }
        
        this.task.secondBasedFiles.taskVideoUrls.push(result);
        this.toastr.success('Video muvaffaqiyatli qo\'shildi');
      })
      .catch(() => {});
  }

  goBack(): void {
    this.navigate.back();
  }

  uploadAllFilesAndSaveData(): void {
    // For edit-build, we'll just call the saveChanges method
    this.saveChanges();
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
  }

  isFirstClassFileCategory(category: string): boolean {
    return ['taskExampleFiles', 'taskSolutionFiles'].includes(category);
  }

  isSecondClassFileCategory(category: string): boolean {
    return [
      'taskTitleFiles',
      'taskPresentationFiles',
      'taskLiteratureFiles',
    ].includes(category);
  }

  getExistingFileCount(category: string, language: string): number {
    if (!this.task) return 0;
    
    if (this.isFirstClassFileCategory(category)) {
      if (this.task.firstBasedFiles && this.task.firstBasedFiles[category] && this.task.firstBasedFiles[category][language]) {
        return this.task.firstBasedFiles[category][language].length || 0;
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles && this.task.secondBasedFiles[category] && this.task.secondBasedFiles[category][language]) {
        return this.task.secondBasedFiles[category][language].length || 0;
      }
    }
    
    return 0;
  }

  uploadAndSaveFiles(category: string, language: string, files: any[], replaceFile?: any): void {
    if (!this.task) {
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
      if (!this.task.firstBasedFiles) {
        this.task.firstBasedFiles = {} as any;
      }
      
      const firstBasedFiles = this.task.firstBasedFiles as any;
      
      if (!firstBasedFiles[category]) {
        firstBasedFiles[category] = { uz: [], ru: [], en: [] };
      }
      
      if (!firstBasedFiles[category][language]) {
        firstBasedFiles[category][language] = [];
      }
    } else if (this.isSecondClassFileCategory(category)) {
      if (!this.task.secondBasedFiles) {
        this.task.secondBasedFiles = {} as any;
      }
      
      const secondBasedFiles = this.task.secondBasedFiles as any;
      
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
    if (!this.currentUploadFile) {
      this.currentUploadFile = { name: '', size: 0 };
    }
    
    this.currentUploadFile.name = file.name;
    this.currentUploadFile.size = file.size;
    
    // Define the storage path
    const path = `lessons/${this.selectedLesson?.id || 'unknown'}/${this.selectedTask?.id || 'unknown'}/${category}/${language}`;
    
    // Use the StorageService to upload the file
    return this.storageService.uploadFile(file, path).pipe(
      tap(progress => {
        if (typeof progress === 'number') {
          this.progress = progress;
        } else if (progress && progress.url) {
          this.uploadedCount++;
          
          // Create a file object with the URL from Firebase Storage
          const fileObj = {
            name: file.name,
            url: progress.url,
            size: file.size,
            type: file.type,
            language: language
          };
          
          // Add or replace the file in the task
          if (this.isFirstClassFileCategory(category) && this.task) {
            if (!this.task.firstBasedFiles) {
              this.task.firstBasedFiles = {} as any;
            }
            
            const firstBasedFiles = this.task.firstBasedFiles as any;
            
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
          } else if (this.isSecondClassFileCategory(category) && this.task) {
            if (!this.task.secondBasedFiles) {
              this.task.secondBasedFiles = {} as any;
            }
            
            const secondBasedFiles = this.task.secondBasedFiles as any;
            
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
        }
      }),
      catchError(error => {
        console.error('Error uploading file:', error);
        this.toastr.error(`Error uploading file: ${file.name}`);
        return throwError(() => error);
      })
    );
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

  getLessons() {
    this.crudService.getDocuments('lessons').subscribe((res) => {
      const regularLessons = (res as ILesson[]).map(lesson => {
        // Mark tasks from regular lessons
        if (lesson.tasks) {
          lesson.tasks = lesson.tasks.map(task => {
            return { ...task, source: 'regular' };
          });
        }
        return lesson;
      });
      
      this.lessons = regularLessons;
      
      console.log('Regular lessons loaded:', this.lessons.length);
    });
  }

  getWebsiteLessons() {
    this.crudService.getDocuments('website-lessons').subscribe((res) => {
      const websiteLessons = (res as ILesson[]).map(lesson => {
        // Mark tasks from website lessons
        if (lesson.tasks) {
          lesson.tasks = lesson.tasks.map(task => {
            // Check if the task has associated files
            const hasFiles = this.checkIfTaskHasFiles(task);
            return { ...task, source: 'website', hasData: hasFiles };
          });
        }
        return lesson;
      });
      
      this.websiteLessons = websiteLessons;
      
      console.log('Website lessons loaded:', this.websiteLessons.length);
    });
  }
  
  // Check if a task has any associated files
  private checkIfTaskHasFiles(task: ITask): boolean {
    // Check first class files
    if (task.firstBasedFiles) {
      for (const category of ['taskExampleFiles', 'taskSolutionFiles']) {
        for (const lang of ['uz', 'ru', 'en']) {
          if (task.firstBasedFiles[category]?.[lang]?.length > 0) {
            return true;
          }
        }
      }
    }
    
    // Check second class files
    if (task.secondBasedFiles) {
      for (const category of ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles']) {
        for (const lang of ['uz', 'ru', 'en']) {
          if (task.secondBasedFiles[category]?.[lang]?.length > 0) {
            return true;
          }
        }
      }
      
      // Check videos
      if (task.secondBasedFiles.taskVideoUrls && task.secondBasedFiles.taskVideoUrls.length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  // Prepare tasks from both website and regular lessons with appropriate labels
  private prepareTasksWithLabels() {
    if (this.selectedLesson) {
      // Find the corresponding regular lesson to get its tasks
      const regularLesson = this.lessons.find(lesson => 
        lesson.lessonTitle?.uz === this.selectedLesson?.lessonTitle?.uz
      );
      
      if (regularLesson?.tasks) {
        // Create a combined list of tasks with appropriate source labels
        const regularTasks = regularLesson.tasks.map(task => ({
          ...task,
          source: 'regular',
          hasData: false // Regular tasks don't have files initially
        }));
        
        // If the selected lesson already has tasks, ensure they're marked as website tasks
        if (this.selectedLesson.tasks) {
          this.selectedLesson.tasks = this.selectedLesson.tasks.map(task => {
            const hasFiles = this.checkIfTaskHasFiles(task);
            return { ...task, source: 'website', hasData: hasFiles };
          });
          
          // Combine the tasks, with website tasks coming first
          this.selectedLesson.tasks = [
            ...this.selectedLesson.tasks,
            ...regularTasks
          ];
        } else {
          // If no tasks yet, use the regular tasks
          this.selectedLesson.tasks = regularTasks;
        }
        
        console.log('Combined tasks:', this.selectedLesson.tasks.length);
      }
    }
  }

  isLessonDisabled(lesson: ILesson): boolean {
    // Since we're only using website lessons, this method is no longer needed
    return false;
  }

  onLessonSelect(selectedLesson: ILesson): void {
    console.log('Selected Lesson:', selectedLesson);
    
    if (!selectedLesson) {
      this.lesson = {
        lessonTitle: { uz: '', ru: '', en: '' },
        tasks: [],
        createdAt: new Date().toISOString()
      };
      this.existingLesson = null;
      this.task = null;
      return;
    }
    
    // Use the selected lesson
    this.lesson = selectedLesson;
    
    // Since we only work with website lessons, set it as existingLesson
    this.existingLesson = selectedLesson;
    
    // If this lesson has tasks, automatically select the first one
    if (this.lesson.tasks && this.lesson.tasks.length > 0) {
      this.onTaskSelect(this.lesson.tasks[0]);
    } else {
      this.task = null;
    }
  }

  onTaskSelect(selectedTask: ITask): void {
    console.log('Selected Task Input:', selectedTask);
    
    if (!selectedTask || !this.lesson) {
      this.task = null;
      return;
    }

    // Determine the source of the task
    const taskSource = (selectedTask as any).source || 'unknown';
    console.log(`Task source: ${taskSource}`);
    
    // Find the existing task based on the source
    let existingTask = null;
    
    if (taskSource === 'website' && this.existingLesson?.tasks) {
      // Look for the task in the website-lessons collection
      existingTask = this.existingLesson.tasks.find(
        (task: ITask) =>
          (task.id && selectedTask.id && task.id === selectedTask.id) ||
          (task.title && selectedTask.title && task.title === selectedTask.title)
      );
      console.log('Found existing task in website collection:', existingTask);
    } else if (taskSource === 'regular') {
      // For regular tasks, we already have the data in the selectedTask
      existingTask = selectedTask;
      console.log('Using regular task:', existingTask);
    }

    console.log('Task files:', existingTask?.firstBasedFiles, existingTask?.secondBasedFiles);
    
    // Initialize task with default structure
    this.task = {
      id: selectedTask.id || this.crudService.generateId(),
      title: selectedTask.title || '',
      index: selectedTask.index || 0,
      createdAt: selectedTask.createdAt || new Date().toISOString(),
      firstBasedFiles: {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      },
      source: taskSource, // Preserve source information for proper labeling
      hasData: false // Will be set to true if files are found
    };
    
    // Copy file data from the existing task if available
    if (existingTask) {
      try {
        // Create a deep copy of the firstBasedFiles structure
        if (existingTask.firstBasedFiles) {
          ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
            ['uz', 'ru', 'en'].forEach(lang => {
              if (existingTask.firstBasedFiles?.[category]?.[lang]?.length) {
                // Make sure the structure exists
                this.task.firstBasedFiles[category] = this.task.firstBasedFiles[category] || { uz: [], ru: [], en: [] };
                this.task.firstBasedFiles[category][lang] = this.task.firstBasedFiles[category][lang] || [];
                
                // Deep copy each file
                this.task.firstBasedFiles[category][lang] = existingTask.firstBasedFiles[category][lang].map(
                  (file: any) => ({...file})
                );
                
                // Set hasData to true if files are found
                if (this.task.firstBasedFiles[category][lang].length > 0) {
                  this.task.hasData = true;
                }
                
                console.log(`Copied ${this.task.firstBasedFiles[category][lang].length} files to ${category}.${lang}`);
              }
            });
          });
        }
        
        // Create a deep copy of the secondBasedFiles structure
        if (existingTask.secondBasedFiles) {
          ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
            ['uz', 'ru', 'en'].forEach(lang => {
              if (existingTask.secondBasedFiles?.[category]?.[lang]?.length) {
                // Make sure the structure exists
                this.task.secondBasedFiles[category] = this.task.secondBasedFiles[category] || { uz: [], ru: [], en: [] };
                this.task.secondBasedFiles[category][lang] = this.task.secondBasedFiles[category][lang] || [];
                
                // Deep copy each file
                this.task.secondBasedFiles[category][lang] = existingTask.secondBasedFiles[category][lang].map(
                  (file: any) => ({...file})
                );
                
                // Set hasData to true if files are found
                if (this.task.secondBasedFiles[category][lang].length > 0) {
                  this.task.hasData = true;
                }
                
                console.log(`Copied ${this.task.secondBasedFiles[category][lang].length} files to ${category}.${lang}`);
              }
            });
          });
          
          // Copy videos if they exist
          if (existingTask.secondBasedFiles?.taskVideoUrls?.length) {
            this.task.secondBasedFiles.taskVideoUrls = existingTask.secondBasedFiles.taskVideoUrls.map(
              (video: any) => ({...video})
            );
            
            // Set hasData to true if videos are found
            if (this.task.secondBasedFiles.taskVideoUrls.length > 0) {
              this.task.hasData = true;
            }
            
            console.log(`Copied ${this.task.secondBasedFiles.taskVideoUrls.length} videos`);
          }
        }
      } catch (error) {
        console.error('Error copying files from existing task:', error);
        this.toastr.error('Error loading existing task data');
      }
    } else {
      console.log('No existing task found. Using default empty file arrays.');
    }
    
    // Log the current state of the task files
    console.log('Task Files Bound:');
    console.log('Example Files:', this.task.firstBasedFiles.taskExampleFiles);
    console.log('Solution Files:', this.task.firstBasedFiles.taskSolutionFiles);
    console.log('Title Files:', this.task.secondBasedFiles.taskTitleFiles);
    console.log('Presentation Files:', this.task.secondBasedFiles.taskPresentationFiles);
    console.log('Literature Files:', this.task.secondBasedFiles.taskLiteratureFiles);
    console.log('Video URLs:', this.task.secondBasedFiles.taskVideoUrls);

    if (this.task.hasData) {
      console.log('Using existing task with data:', this.task);
      this.toastr.info('Mavjud topshiriq ma\'lumotlari bilan ishlayapsiz.');
    } else {
      console.log('Creating new task structure:', this.task);
      this.toastr.info("Yangi topshiriq qo'shilmoqda.");
    }
    
    // Keep track of the original task for comparison
    this.originalTask = JSON.parse(JSON.stringify(this.task));
    // Also set selectedTask for compatibility
    this.selectedTask = this.task;
    
    console.log('Task initialization complete:', this.task);
  }

  saveChanges(): void {
    if (!this.selectedLesson || !this.selectedTask) {
      this.toastr.error('Fan va topshiriq tanlanmagan');
      return;
    }
    
    this.loadingService.show();
    
    // First, upload all files that need to be uploaded
    const filesToUpload: Observable<any>[] = [];
    
    // Upload first class files
    if (this.selectedTask.firstBasedFiles) {
      const firstBasedFiles = this.selectedTask.firstBasedFiles;
      
      const uploadFirstClassFiles = (category: keyof FirstClassFileGroups) => {
        for (const lang of ['uz', 'ru', 'en'] as const) {
          const langFiles = firstBasedFiles[category]?.[lang];
          if (langFiles) {
            for (let i = 0; i < langFiles.length; i++) {
              const file = langFiles[i];
              // Only upload files that have a File object
              if (file.file && !file.url) {
                const lessonId = this.selectedLesson?.id || 'unknown';
                const taskId = this.selectedTask?.id || 'unknown';
                const path = `lessons/${lessonId}/${taskId}/${category}/${lang}`;
                const uploadObs = this.storageService.uploadFile(file.file, path).pipe(
                  tap(progress => {
                    if (typeof progress !== 'number' && progress?.url) {
                      // Update the file object with the URL
                      file.url = progress.url;
                      delete file.file; // Remove the File object to avoid circular references
                    }
                  })
                );
                filesToUpload.push(uploadObs);
              }
            }
          }
        }
      };
      
      uploadFirstClassFiles('taskExampleFiles');
      uploadFirstClassFiles('taskSolutionFiles');
    }
    
    // Upload second class files
    if (this.selectedTask.secondBasedFiles) {
      const secondBasedFiles = this.selectedTask.secondBasedFiles;
      
      const uploadSecondClassFiles = (category: keyof SecondClassFileGroups) => {
        if (category !== 'taskVideoUrls') {
          for (const lang of ['uz', 'ru', 'en'] as const) {
            const langFiles = secondBasedFiles[category]?.[lang];
            if (langFiles) {
              for (let i = 0; i < langFiles.length; i++) {
                const file = langFiles[i];
                // Only upload files that have a File object
                if (file.file && !file.url) {
                  const lessonId = this.selectedLesson?.id || 'unknown';
                  const taskId = this.selectedTask?.id || 'unknown';
                  const path = `lessons/${lessonId}/${taskId}/${category}/${lang}`;
                  const uploadObs = this.storageService.uploadFile(file.file, path).pipe(
                    tap(progress => {
                      if (typeof progress !== 'number' && progress?.url) {
                        // Update the file object with the URL
                        file.url = progress.url;
                        delete file.file; // Remove the File object to avoid circular references
                      }
                    })
                  );
                  filesToUpload.push(uploadObs);
                }
              }
            }
          }
        }
      };
      
      uploadSecondClassFiles('taskTitleFiles');
      uploadSecondClassFiles('taskPresentationFiles');
      uploadSecondClassFiles('taskLiteratureFiles');
    }
    
    // Now process all uploads and then save the data
    if (filesToUpload.length > 0) {
      this.uploading = true;
      this.totalUploads = filesToUpload.length;
      this.uploadedCount = 0;
      this.progress = 0;
      
      forkJoin(filesToUpload).pipe(
        finalize(() => {
          this.uploading = false;
          this.saveTaskAndLessonData();
        })
      ).subscribe({
        next: () => {
          this.toastr.success(`${filesToUpload.length} files uploaded successfully`);
        },
        error: (error) => {
          console.error('Error uploading files:', error);
          this.toastr.error('Error uploading some files');
          // Still try to save the data even if some uploads failed
          this.saveTaskAndLessonData();
        }
      });
    } else {
      // No files to upload, just save the data
      this.saveTaskAndLessonData();
    }
  }
  
  private saveTaskAndLessonData(): void {
    if (!this.selectedLesson || !this.selectedLesson.id || !this.selectedTask || !this.selectedTask.id) {
      this.toastr.error('Lesson or task not found');
      this.loadingService.hide();
      return;
    }
    
    const lessonId = this.selectedLesson.id;
    
    // Make a copy of the task data without File objects to avoid circular references
    const cleanTask = JSON.parse(JSON.stringify(this.selectedTask));
    
    // Start by updating the lesson document with the new title
    this.crudService.updateDocument('website-lessons', lessonId, {
      lessonTitle: this.selectedLesson.lessonTitle
    }).pipe(
      switchMap(() => {
        // Now update the task within the lesson
        const taskIndex = this.selectedLesson?.tasks?.findIndex(t => t.id === this.selectedTask?.id) ?? -1;
        
        if (taskIndex !== -1 && this.selectedLesson?.tasks) {
          const tasks = [...this.selectedLesson.tasks]; // Create a copy
          
          // Update the task in the tasks array
          tasks[taskIndex] = {
            ...tasks[taskIndex],
            title: cleanTask.title,
            firstBasedFiles: cleanTask.firstBasedFiles,
            secondBasedFiles: cleanTask.secondBasedFiles
          };
          
          // Update the entire tasks array in the lesson document
          return this.crudService.updateDocument('website-lessons', lessonId, {
            tasks: tasks
          });
        } else {
          return throwError(() => new Error('Task not found in lesson'));
        }
      })
    ).subscribe({
      next: () => {
        this.toastr.success('O\'zgarishlar muvaffaqiyatli saqlandi');
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error saving changes:', error);
        this.toastr.error('O\'zgarishlarni saqlashda xatolik yuz berdi');
        this.loadingService.hide();
      }
    });
  }

  isTaskUnchanged(): boolean {
    if (!this.originalTask || !this.selectedTask) {
      return true; // Consider unchanged if either is null
    }
    
    return JSON.stringify(this.originalTask) === JSON.stringify(this.selectedTask);
  }

  getLessonTitleString(lesson: ILesson): string {
    if (!lesson || !lesson.lessonTitle) return 'Untitled';
    return `${lesson.lessonTitle?.uz || 'Untitled'} (UZ) - ${lesson.lessonTitle?.ru || 'Untitled'} (RU) - ${lesson.lessonTitle?.en || 'Untitled'} (EN)`;
  }

  getTaskTitleString(task: ITask): string {
    if (!task || !task.title) return 'Untitled';
    
    // If title is a string (old format)
    if (typeof task.title === 'string') {
      return task.title;
    }
    
    // If title is an object with language keys (new format)
    if (typeof task.title === 'object') {
      return `${task.title?.uz || ''} (UZ) - ${task.title?.ru || ''} (RU) - ${task.title?.en || ''} (EN)`;
    }
    
    return 'Untitled';
  }

  public compareLessonById(lesson1: ILesson, lesson2: ILesson): boolean {
    return lesson1 && lesson2 ? lesson1.id === lesson2.id : lesson1 === lesson2;
  }

  public compareTaskById(task1: ITask, task2: ITask): boolean {
    return task1 && task2 ? task1.id === task2.id : task1 === task2;
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
    this.loadingService.show();
    this.progress = 0;
    this.currentUploadFile = fileData.file.name;
    this.totalUploads = 1;
    this.uploadedCount = 0;
    
    const path = `lessons/${this.selectedLesson?.id || ''}/${this.selectedTask?.id || ''}/${fileType}`;
    
    this.storageService.uploadFile(fileData.file, path)
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.loadingService.hide();
        })
      )
      .subscribe({
        next: (progress) => {
          if (typeof progress === 'number') {
            this.progress = Math.round(progress);
          } else if (progress && progress.url) {
            // Upload complete, add file to task
            this.uploadedCount++;
            
            const fileObj = {
              name: fileData.name || fileData.file.name,
              url: progress.url,
              language: fileData.language || 'en',
              type: fileData.file.type,
              size: fileData.file.size
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
              
              this.saveChanges();
            }
          }
        },
        error: (error) => {
          this.toastr.error('Faylni yuklashda xatolik yuz berdi', 'Xato');
          console.error('Error uploading file:', error);
        }
      });
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
      } else if (this.currentUploadFile && typeof this.currentUploadFile === 'object') {
        // Check if it has a name property
        return (this.currentUploadFile as any).name || 'Uploading file...';
      }
      return '';
    }
    
    // If argument provided, handle file
    if (!file) return 'Unknown';
    
    if (typeof file === 'string') return file;
    
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
  getShortUrl(url: any): string {
    if (!url) return '';
    
    // If url is an object with language properties
    if (typeof url === 'object' && (url.uz || url.ru || url.en)) {
      url = url.uz || url.ru || url.en || '';
    }
    
    try {
      return typeof url === 'string' && url.length > 30 
        ? url.substring(0, 30) + '...' 
        : String(url);
    } catch (error) {
      return '';
    }
  }

  isStringUrl(url: any): boolean {
    return typeof url === 'string';
  }

  // Helper methods for handling video properties
  getVideoUrl(video: any): string {
    if (!video) return '';
    
    // Handle string URL
    if (typeof video.url === 'string') {
      return video.url;
    }
    
    // Handle object URL with language properties
    if (video.url && typeof video.url === 'object') {
      // Use the URL for the currently selected language if available
      const languageUrl = video.url[this.selectedLanguage];
      if (languageUrl) {
        return languageUrl;
      }
      
      // Otherwise use any available URL
      return video.url.uz || video.url.ru || video.url.en || '';
    }
    
    return '';
  }
  
  getVideoName(video: any): string {
    if (!video) return '';
    
    // Handle string name
    if (typeof video.name === 'string') {
      return video.name;
    }
    
    // Handle object name with language properties
    if (video.name && typeof video.name === 'object') {
      // Use the name for the currently selected language if available
      const languageName = video.name[this.selectedLanguage];
      if (languageName) {
        return languageName;
      }
      
      // Otherwise use any available name
      return video.name.uz || video.name.ru || video.name.en || '';
    }
    
    return '';
  }

  openEditTitlesModal(event: Event, type: 'lesson' | 'task'): void {
    // Prevent the event from triggering the ng-select
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.selectedLesson || (type === 'task' && !this.selectedTask)) {
      this.toastr.error('Nothing selected to edit');
      return;
    }
    
    // Open the modal for editing titles
    const modalRef = this.modalService.open(EditTitlesModalComponent, {
      centered: true,
      size: 'lg'
    });
    
    // Pass the current titles to the modal
    if (type === 'lesson' && this.selectedLesson) {
      modalRef.componentInstance.isLessonEdit = true;
      modalRef.componentInstance.isTaskEdit = false;
      modalRef.componentInstance.lessonTitle = this.selectedLesson.lessonTitle || { uz: '', ru: '', en: '' };
      modalRef.componentInstance.modalTitle = 'Edit Lesson Title';
    } else if (type === 'task' && this.selectedTask) {
      modalRef.componentInstance.isLessonEdit = false;
      modalRef.componentInstance.isTaskEdit = true;
      modalRef.componentInstance.taskTitle = this.selectedTask.title || { uz: '', ru: '', en: '' };
      modalRef.componentInstance.modalTitle = 'Edit Task Title';
    }
    
    // Handle the result when the modal is closed
    modalRef.result.then(
      (result) => {
        if (result) {
          // Update the titles based on the edit type
          if (type === 'lesson' && result.lessonTitle && this.selectedLesson) {
            this.selectedLesson.lessonTitle = result.lessonTitle;
            this.toastr.success('Lesson title updated');
          } else if (type === 'task' && result.taskTitle && this.selectedTask) {
            this.selectedTask.title = result.taskTitle;
            this.toastr.success('Task title updated');
          }
          
          // Save the changes
          this.saveChanges();
        }
      },
      () => {
        // Modal dismissed
      }
    );
  }

  hasTaskData(task: ITask): boolean {
    if (!task) return false;

    // Check for files in first class files
    const hasFirstClassFiles = !!task.firstBasedFiles && (
      this.hasFilesInCategory(task.firstBasedFiles.taskExampleFiles) ||
      this.hasFilesInCategory(task.firstBasedFiles.taskSolutionFiles)
    );

    // Check for files in second class files
    const hasSecondClassFiles = !!task.secondBasedFiles && (
      this.hasFilesInCategory(task.secondBasedFiles.taskTitleFiles) ||
      this.hasFilesInCategory(task.secondBasedFiles.taskPresentationFiles) ||
      this.hasFilesInCategory(task.secondBasedFiles.taskLiteratureFiles) ||
      (!!task.secondBasedFiles.taskVideoUrls && task.secondBasedFiles.taskVideoUrls.length > 0)
    );

    return !!hasFirstClassFiles || !!hasSecondClassFiles;
  }

  private hasFilesInCategory(category: any): boolean {
    if (!category) return false;
    
    return (
      (category.uz && category.uz.length > 0) ||
      (category.ru && category.ru.length > 0) ||
      (category.en && category.en.length > 0)
    );
  }
}
