import {
  Component,
  OnInit,
  ElementRef,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import {
  Lesson,
  Task,
  FirstClassFileGroups,
  SecondClassFileGroups,
  Files,
  Videos,
} from 'src/app/shared/interfaces/interfaces';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import {
  concatMap,
  delay,
  from,
  Observable,
  tap,
  timer,
  forkJoin,
  switchMap,
  finalize,
  take,
} from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { LoadingService } from 'src/app/shared/services/loading.service';

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  lessons: Lesson[] = [];
  websiteLessons: Lesson[] = [];
  lesson: Lesson | null = null;
  task: Task | any = null;
  uploadedFilesByCategory: any = {};
  loading: boolean = false;
  uploadedFiles: any;
  selectedLanguage: 'uz' | 'ru' | 'en' = 'uz';
  currentCategory: string = '';
  errorCategories: string[] = [];
  existingLesson: Lesson | null = null;
  lessonTitleString = 'lessonTitleString';
  uploading: boolean = false;
  progress: number = 0;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private modalService: NgbModal,
    private location: Location,
    private loaderService: LoadingService
  ) {}

  ngOnInit(): void {
    this.getLessons();
    this.getWebsiteLessons();
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
    return this.websiteLessons.some(
      (websiteLesson) =>
        websiteLesson.lessonTitle?.uz === lesson.lessonTitle?.uz
    );
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
      if (this.isFirstClassFileCategory(event.category)) {
        this.task.firstBasedFiles[event.category][event.lang]?.splice(
          event.index,
          1
        );
      } else if (this.isSecondClassFileCategory(event.category)) {
        this.task.secondBasedFiles[event.category][event.lang]?.splice(
          event.index,
          1
        );
      }
    }
  }

  private validateUpload(): {
    isValid: boolean;
    message: string;
    errorCategories?: string[];
  } {
    const errorCategories: string[] = [];

    if (!this.lesson) {
      return { isValid: false, message: 'Iltimos, fanni tanlang!' };
    }

    if (!this.task) {
      return { isValid: false, message: 'Iltimos, topshiriqni tanlang!' };
    }

    if (!this.task.title || !this.task.id) {
      return { isValid: false, message: "Topshiriq ma'lumotlari to'liq emas!" };
    }

    if (!this.task.firstBasedFiles) {
      errorCategories.push('taskExampleFiles', 'taskSolutionFiles');
      return {
        isValid: false,
        message: "Birinchi bo'lim fayllari topilmadi!",
        errorCategories,
      };
    }

    if (!this.task.secondBasedFiles) {
      errorCategories.push(
        'taskTitleFiles',
        'taskPresentationFiles',
        'taskLiteratureFiles',
        'taskVideoUrls'
      );
      return {
        isValid: false,
        message: "Ikkinchi bo'lim fayllari topilmadi!",
        errorCategories,
      };
    }

    const hasFirstBasedFiles = Object.values(this.task.firstBasedFiles).some(
      (fileGroup: any) =>
        Object.values(fileGroup || {}).some(
          (files: any) => files && files.length > 0
        )
    );

    const hasSecondBasedFiles = Object.values(this.task.secondBasedFiles).some(
      (fileGroup: any) =>
        fileGroup &&
        (Array.isArray(fileGroup)
          ? fileGroup.length > 0
          : Object.values(fileGroup).some(
              (files: any) => files && files.length > 0
            ))
    );

    if (!hasFirstBasedFiles && !hasSecondBasedFiles) {
      errorCategories.push(
        'taskExampleFiles',
        'taskSolutionFiles',
        'taskTitleFiles',
        'taskPresentationFiles',
        'taskLiteratureFiles',
        'taskVideoUrls'
      );
      return {
        isValid: false,
        message: "Kamida bitta fayl yoki video qo'shing!",
        errorCategories,
      };
    }

    const checkFileSizes = (files: any, category: string): boolean => {
      if (!files) return true;

      if (Array.isArray(files)) {
        if (
          files.some((file) => file.size && file.size / (1024 * 1024) > 150)
        ) {
          errorCategories.push(category);
          return false;
        }
        return true;
      }

      const hasOversizedFiles = Object.values(files).some((langFiles: any) =>
        langFiles
          ? langFiles.some(
              (file: any) => file.size && file.size / (1024 * 1024) > 150
            )
          : false
      );

      if (hasOversizedFiles) {
        errorCategories.push(category);
        return false;
      }
      return true;
    };

    Object.entries(this.task.firstBasedFiles).forEach(([category, files]) => {
      checkFileSizes(files, category);
    });

    Object.entries(this.task.secondBasedFiles)
      .filter(([category]) => category !== 'taskVideoUrls')
      .forEach(([category, files]) => {
        checkFileSizes(files, category);
      });

    if (errorCategories.length > 0) {
      return {
        isValid: false,
        message: "Ba'zi fayllar hajmi 150MB dan oshib ketdi!",
        errorCategories,
      };
    }

    return { isValid: true, message: '' };
  }

  uploadAllFilesAndSaveData(): void {
    const validation = this.validateUpload();
    if (!validation.isValid) {
      this.toastr.error(validation.message);

      if (validation.errorCategories) {
        this.errorCategories = validation.errorCategories;
        setTimeout(() => {
          this.errorCategories = [];
        }, 400);
      }
      return;
    }

    this.loaderService.show();
    this.uploading = true;
    this.progress = 0;
    
    // Create a deep copy of the task to preserve existing files
    const taskCopy = JSON.parse(JSON.stringify(this.task));
    
    // Initialize uploadedFiles structure with existing files
    const uploadedFiles = {
      title: taskCopy.title,
      id: taskCopy.id,
      index: taskCopy.index,
      createdAt: taskCopy.createdAt,
      firstBasedFiles: {
        taskExampleFiles: taskCopy.firstBasedFiles?.taskExampleFiles || { uz: [], ru: [], en: [] },
        taskSolutionFiles: taskCopy.firstBasedFiles?.taskSolutionFiles || { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: {
        taskTitleFiles: taskCopy.secondBasedFiles?.taskTitleFiles || { uz: [], ru: [], en: [] },
        taskPresentationFiles: taskCopy.secondBasedFiles?.taskPresentationFiles || { uz: [], ru: [], en: [] },
        taskLiteratureFiles: taskCopy.secondBasedFiles?.taskLiteratureFiles || { uz: [], ru: [], en: [] },
        taskVideoUrls: taskCopy.secondBasedFiles?.taskVideoUrls || []
      }
    };
    
    console.log('Initial uploadedFiles with existing files:', uploadedFiles);
    
    const uploadObservables: Observable<any>[] = [];
    const categoryStatus: Record<string, Record<string, { total: number; uploaded: number }>> = {};
    
    const uploadCategoryFiles = (categoryPath: string, categoryObj: any) => {
      for (const lang in categoryObj) {
        // Only upload files that don't already have a URL (new files)
        const files = categoryObj[lang].filter(
          (file: any) => file !== null && file.file && !file.url
        );
        if (!categoryStatus[categoryPath]) categoryStatus[categoryPath] = {};
        categoryStatus[categoryPath][lang] = {
          total: files.length,
          uploaded: 0,
        };

        // Skip if there are no files to upload for this language
        if (files.length === 0) {
          console.log(`No new files to upload for ${categoryPath}.${lang}`);
          
          // Make sure existing files are preserved
          const categoryArray = categoryPath.split('.');
          let target: any = uploadedFiles;
          for (const key of categoryArray) {
            target = target[key];
          }
          
          // Copy existing files that already have URLs
          const existingFiles = categoryObj[lang].filter(
            (file: any) => file !== null && file.url
          );
          if (existingFiles.length > 0) {
            if (!target[lang]) {
              target[lang] = [];
            }
            existingFiles.forEach((fileItem: any) => {
              if (!target[lang].some((f: any) => f.url === fileItem.url)) {
                target[lang].push(fileItem);
              }
            });
          }
          continue;
        }

        files.forEach((fileItem: any, index: number) => {
          const actualFile = fileItem.file;
          const filePath = `/${fileItem.name}`;

          const upload$ = this.dropboxService
            .uploadFile(filePath, actualFile)
            .pipe(
              switchMap((response: any) => {
                const categoryArray = categoryPath.split('.');
                let target: any = uploadedFiles;

                for (const key of categoryArray) {
                  target = target[key];
                }

                // Make sure the target array exists
                if (!target[lang]) {
                  target[lang] = [];
                }

                return this.dropboxService
                  .createSharedLink(response.path_display)
                  .pipe(
                    tap((link: any) => {
                      // Find index of the file in the original array, not just the filtered array
                      const originalIndex = categoryObj[lang].findIndex(
                        (item: any) => item === fileItem
                      );
                      
                      if (originalIndex !== -1) {
                        // Replace the file object with the uploaded file data
                        categoryObj[lang][originalIndex] = {
                          name: fileItem.name,
                          size: fileItem.size,
                          url: link || '',
                          path: response.path_display || '',
                          id: response || '',
                        };
                        
                        // Also update the uploadedFiles object to match
                        target[lang][originalIndex] = categoryObj[lang][originalIndex];
                      } else {
                        // If not found (shouldn't happen), just push to the array
                        target[lang].push({
                          name: fileItem.name,
                          size: fileItem.size,
                          url: link || '',
                          path: response.path_display || '',
                          id: response || '',
                        });
                      }
                      
                      categoryStatus[categoryPath][lang].uploaded++;

                      if (
                        categoryStatus[categoryPath][lang].uploaded ===
                        categoryStatus[categoryPath][lang].total
                      ) {
                        this.toastr.success(
                          `${categoryPath} (${lang}) da fayllar muvaffaqiyatli yuklandi.`
                        );
                      }
                    })
                  );
              }),
              delay(1000 * index)
            );
          uploadObservables.push(upload$);
        });
      }
    };

    // Check each file category and upload only if files exist
    if (this.task.firstBasedFiles?.taskExampleFiles) {
      uploadCategoryFiles(
        'firstBasedFiles.taskExampleFiles',
        this.task.firstBasedFiles.taskExampleFiles
      );
    }
    
    if (this.task.firstBasedFiles?.taskSolutionFiles) {
      uploadCategoryFiles(
        'firstBasedFiles.taskSolutionFiles',
        this.task.firstBasedFiles.taskSolutionFiles
      );
    }
    
    if (this.task.secondBasedFiles?.taskTitleFiles) {
      uploadCategoryFiles(
        'secondBasedFiles.taskTitleFiles',
        this.task.secondBasedFiles.taskTitleFiles
      );
    }
    
    if (this.task.secondBasedFiles?.taskPresentationFiles) {
      uploadCategoryFiles(
        'secondBasedFiles.taskPresentationFiles',
        this.task.secondBasedFiles.taskPresentationFiles
      );
    }
    
    if (this.task.secondBasedFiles?.taskLiteratureFiles) {
      uploadCategoryFiles(
        'secondBasedFiles.taskLiteratureFiles',
        this.task.secondBasedFiles.taskLiteratureFiles
      );
    }

    // Handle video URLs separately (no file upload needed)
    if (this.task.secondBasedFiles?.taskVideoUrls && this.task.secondBasedFiles.taskVideoUrls.length > 0) {
      uploadedFiles.secondBasedFiles.taskVideoUrls = this.task.secondBasedFiles.taskVideoUrls;
    }

    console.log('Final uploadedFiles before saving:', uploadedFiles);

    if (uploadObservables.length === 0) {
      console.log('No new files to upload, saving directly to Firebase');
      // If no new files to upload, just save with the existing files
      this.saveToFirebase(uploadedFiles);
      return;
    }

    forkJoin(uploadObservables)
      .pipe(
        finalize(() => {
          this.uploading = false;
          this.loaderService.hide();
        })
      )
      .subscribe({
        next: () => {
          this.progress = 100;
          this.toastr.success('Fayllar muvaffaqiyatli yuklandi');
          this.saveToFirebase(uploadedFiles);
        },
        error: (error) => {
          console.error('Error uploading files:', error);
          this.toastr.error('Fayllar yuklanishda xatolik');
          this.loaderService.hide();
        },
      });
  }

  private saveToFirebase(uploadedFiles: any): void {
    console.log('Saving to Firebase with files:', uploadedFiles);
    
    // If no lesson is selected, show an error
    if (!this.lesson) {
      this.toastr.error('Fan tanlanmagan!');
      this.loaderService.hide();
      return;
    }

    // Create a copy of the current task with the uploaded files
    const taskToSave = {
      id: this.task?.id || uploadedFiles.id,
      title: this.task?.title || uploadedFiles.title,
      index: this.task?.index || uploadedFiles.index,
      createdAt: this.task?.createdAt || uploadedFiles.createdAt || new Date().toISOString(),
      firstBasedFiles: uploadedFiles.firstBasedFiles,
      secondBasedFiles: uploadedFiles.secondBasedFiles
    };

    console.log('Task prepared for saving:', taskToSave);

    // Check if we have data for the current website
    this.crudService
      .getDocuments('website-lessons')
      .pipe(
        take(1),
        switchMap((websiteData: any[]) => {
          console.log('Retrieved Website Lessons Data:', websiteData);
          
          // Create a new website data object if none exists
          if (!websiteData || websiteData.length === 0) {
            const newLessonData = {
              ...this.lesson,
              tasks: [taskToSave]
            };
            
            return this.crudService.addDocument('website-lessons', newLessonData);
          }
          
          // Find the existing lesson if it exists
          const existingLesson = websiteData.find(
            (l: any) => l.id === this.lesson?.id
          );
          
          console.log('Existing lesson:', existingLesson);
          
          if (existingLesson) {
            // Lesson exists, check if the task exists within it
            const existingTasks = existingLesson.tasks || [];
            const existingTaskIndex = existingTasks.findIndex(
              (t: any) => t.id === taskToSave.id
            );
            
            console.log('Existing task index:', existingTaskIndex);
            
            if (existingTaskIndex !== -1) {
              // Task exists, merge with existing task data (keeping existing files that aren't in the upload)
              console.log('Found existing task, merging files');
              const existingTask = existingTasks[existingTaskIndex];
              
              // Merge first-based files
              if (existingTask.firstBasedFiles) {
                // For each file category in firstBasedFiles
                for (const category in existingTask.firstBasedFiles) {
                  if (!taskToSave.firstBasedFiles[category]) {
                    taskToSave.firstBasedFiles[category] = {};
                  }
                  
                  // For each language in the category
                  for (const lang in existingTask.firstBasedFiles[category]) {
                    if (!taskToSave.firstBasedFiles[category][lang]) {
                      taskToSave.firstBasedFiles[category][lang] = [];
                    }
                    
                    // Only add files from existing task that don't exist in the new task
                    if (existingTask.firstBasedFiles[category][lang]) {
                      existingTask.firstBasedFiles[category][lang].forEach((file: any) => {
                        const fileExists = taskToSave.firstBasedFiles[category][lang].some(
                          (f: any) => f.url === file.url
                        );
                        
                        if (!fileExists) {
                          taskToSave.firstBasedFiles[category][lang].push(file);
                        }
                      });
                    }
                  }
                }
              }
              
              // Merge second-based files (same logic as above)
              if (existingTask.secondBasedFiles) {
                // For non-video categories
                for (const category of ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles']) {
                  if (!taskToSave.secondBasedFiles[category]) {
                    taskToSave.secondBasedFiles[category] = {};
                  }
                  
                  if (existingTask.secondBasedFiles[category]) {
                    for (const lang in existingTask.secondBasedFiles[category]) {
                      if (!taskToSave.secondBasedFiles[category][lang]) {
                        taskToSave.secondBasedFiles[category][lang] = [];
                      }
                      
                      // Only add files from existing task that don't exist in the new task
                      if (existingTask.secondBasedFiles[category][lang]) {
                        existingTask.secondBasedFiles[category][lang].forEach((file: any) => {
                          const fileExists = taskToSave.secondBasedFiles[category][lang].some(
                            (f: any) => f.url === file.url
                          );
                          
                          if (!fileExists) {
                            taskToSave.secondBasedFiles[category][lang].push(file);
                          }
                        });
                      }
                    }
                  }
                }
                
                // Special handling for video URLs
                if (existingTask.secondBasedFiles.taskVideoUrls) {
                  if (!taskToSave.secondBasedFiles.taskVideoUrls) {
                    taskToSave.secondBasedFiles.taskVideoUrls = [];
                  }
                  
                  // Only add videos that don't exist in the new task
                  existingTask.secondBasedFiles.taskVideoUrls.forEach((video: any) => {
                    const videoExists = taskToSave.secondBasedFiles.taskVideoUrls.some(
                      (v: any) => v.url === video.url
                    );
                    
                    if (!videoExists) {
                      taskToSave.secondBasedFiles.taskVideoUrls.push(video);
                    }
                  });
                }
              }
              
              // Update the task in the array
              existingTasks[existingTaskIndex] = taskToSave;
            } else {
              // Task doesn't exist, add it to the tasks array
              console.log('Task doesn\'t exist, adding it');
              existingTasks.push(taskToSave);
            }
            
            // Update the lesson's tasks
            const updatedLesson = {
              ...existingLesson,
              tasks: existingTasks
            };
            
            return this.crudService.updateDocument<Lesson>('website-lessons', existingLesson.id, updatedLesson);
          } else {
            // Lesson doesn't exist, create a new one with this task
            const newLesson = {
              ...this.lesson,
              tasks: [taskToSave]
            };
            
            console.log('Lesson doesn\'t exist, creating new lesson:', newLesson);
            
            return this.crudService.addDocument('website-lessons', newLesson);
          }
        })
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.toastr.success('Ma\'lumotlar saqlandi!');
          console.log('Data saved successfully');
        },
        error: (error: any) => {
          console.error('Error saving data:', error);
          this.loaderService.hide();
          this.toastr.error('Ma\'lumotlarni saqlashda xatolik!');
        }
      });
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
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
        this.task.secondBasedFiles.taskVideoUrls.push(result);
      })
      .catch(() => {});
  }

  removeVideo(index: number) {
    if (this.task?.secondBasedFiles?.taskVideoUrls) {
      this.task.secondBasedFiles.taskVideoUrls.splice(index, 1);
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

    const newFile = {
      name: file.name,
      size: file.size,
      file: file,
    };

    if (this.isFirstClassFileCategory(category)) {
      if (this.task.firstBasedFiles[category]?.[lang]) {
        this.task.firstBasedFiles[category][lang][index] = newFile;
      }
      this.toastr.success('Fayl muvaffaqiyatli o\'zgartirildi');
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles[category]?.[lang]) {
        this.task.secondBasedFiles[category][lang][index] = newFile;
      }
      this.toastr.success('Fayl muvaffaqiyatli o\'zgartirildi');
    }
  }

  goBack(): void {
    this.location.back();
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
  }

  compareTaskById(task1: Task, task2: Task): boolean {
    return task1?.id === task2?.id;
  }

  compareLessonById(lesson1: Lesson, lesson2: Lesson): boolean {
    return lesson1?.id === lesson2?.id;
  }

  onLessonSelect(selectedLesson: Lesson): void {
    console.log('Selected Lesson:', selectedLesson);
    
    if (!selectedLesson) {
      this.lesson = null;
      this.existingLesson = null;
      this.task = null;
      return;
    }

    // Store the potential existing lesson but don't set it yet
    const potentialExistingLesson = this.websiteLessons.find(
      (lesson) =>
        (lesson.id && selectedLesson.id && lesson.id === selectedLesson.id) ||
        (lesson.lessonTitle?.uz &&
          selectedLesson.lessonTitle?.uz &&
          lesson.lessonTitle.uz === selectedLesson.lessonTitle.uz)
    );

    // Always set as new lesson initially
    this.lesson = {
      id: selectedLesson.id,
      lessonTitle: selectedLesson.lessonTitle || {
        uz: '',
        ru: '',
        en: ''
      },
      thumbnail: selectedLesson.thumbnail,
      index: selectedLesson.index,
      createdAt: selectedLesson.createdAt,
      tasks: selectedLesson.tasks || []
    };
    
    // Store potential existing lesson in a separate variable
    this._tempExistingLesson = potentialExistingLesson || null;
    
    // Reset existingLesson until a task is selected
    this.existingLesson = null;
    this.task = null;
    
    if (potentialExistingLesson) {
      console.log('Potential existing lesson found:', potentialExistingLesson);
      this.toastr.info("Mavjud fan topildi. Topshiriq tanlang.");
    } else {
      console.log('New lesson initialized:', this.lesson);
      this.toastr.info("Yangi fan yaratilmoqda. Topshiriq tanlang.");
    }
  }

  // Add a private variable to store the potential existing lesson
  private _tempExistingLesson: Lesson | null = null;

  onTaskSelect(selectedTask: Task): void {
    console.log('Selected Task Input:', selectedTask);
    
    if (!selectedTask || !this.lesson) {
      this.task = null;
      return;
    }

    // Now check if we need to use the potential existing lesson
    if (this._tempExistingLesson) {
      this.existingLesson = this._tempExistingLesson;
      console.log('Setting existing lesson:', this.existingLesson);
    }

    let existingTask = null;
    if (this.existingLesson?.tasks) {
      console.log('Existing lesson tasks:', this.existingLesson.tasks);
      existingTask = this.existingLesson.tasks.find(
        (task) =>
          (task.id && selectedTask.id && task.id === selectedTask.id) ||
          (task.title && selectedTask.title && task.title === selectedTask.title)
      );
    }

    console.log('Found existing task:', existingTask);
    console.log('Existing task files:', existingTask?.firstBasedFiles, existingTask?.secondBasedFiles);
    
    // Create a properly structured task object with all necessary file structures
    this.task = {
      id: existingTask?.id || selectedTask.id || this.crudService.generateId(),
      title: existingTask?.title || selectedTask.title || '',
      index: existingTask?.index || selectedTask.index || (this.lesson.tasks?.length || 0) + 1,
      createdAt: existingTask?.createdAt || selectedTask.createdAt || new Date().toISOString(),
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
    
    // Copy files from the existing task if available
    if (existingTask) {
      try {
        // Copy first based files
        if (existingTask.firstBasedFiles?.taskExampleFiles?.uz?.length) {
          this.task.firstBasedFiles.taskExampleFiles.uz = [...existingTask.firstBasedFiles.taskExampleFiles.uz];
        }
        if (existingTask.firstBasedFiles?.taskExampleFiles?.ru?.length) {
          this.task.firstBasedFiles.taskExampleFiles.ru = [...existingTask.firstBasedFiles.taskExampleFiles.ru];
        }
        if (existingTask.firstBasedFiles?.taskExampleFiles?.en?.length) {
          this.task.firstBasedFiles.taskExampleFiles.en = [...existingTask.firstBasedFiles.taskExampleFiles.en];
        }
        
        if (existingTask.firstBasedFiles?.taskSolutionFiles?.uz?.length) {
          this.task.firstBasedFiles.taskSolutionFiles.uz = [...existingTask.firstBasedFiles.taskSolutionFiles.uz];
        }
        if (existingTask.firstBasedFiles?.taskSolutionFiles?.ru?.length) {
          this.task.firstBasedFiles.taskSolutionFiles.ru = [...existingTask.firstBasedFiles.taskSolutionFiles.ru];
        }
        if (existingTask.firstBasedFiles?.taskSolutionFiles?.en?.length) {
          this.task.firstBasedFiles.taskSolutionFiles.en = [...existingTask.firstBasedFiles.taskSolutionFiles.en];
        }
        
        // Copy second based files
        if (existingTask.secondBasedFiles?.taskTitleFiles?.uz?.length) {
          this.task.secondBasedFiles.taskTitleFiles.uz = [...existingTask.secondBasedFiles.taskTitleFiles.uz];
        }
        if (existingTask.secondBasedFiles?.taskTitleFiles?.ru?.length) {
          this.task.secondBasedFiles.taskTitleFiles.ru = [...existingTask.secondBasedFiles.taskTitleFiles.ru];
        }
        if (existingTask.secondBasedFiles?.taskTitleFiles?.en?.length) {
          this.task.secondBasedFiles.taskTitleFiles.en = [...existingTask.secondBasedFiles.taskTitleFiles.en];
        }
        
        if (existingTask.secondBasedFiles?.taskPresentationFiles?.uz?.length) {
          this.task.secondBasedFiles.taskPresentationFiles.uz = [...existingTask.secondBasedFiles.taskPresentationFiles.uz];
        }
        if (existingTask.secondBasedFiles?.taskPresentationFiles?.ru?.length) {
          this.task.secondBasedFiles.taskPresentationFiles.ru = [...existingTask.secondBasedFiles.taskPresentationFiles.ru];
        }
        if (existingTask.secondBasedFiles?.taskPresentationFiles?.en?.length) {
          this.task.secondBasedFiles.taskPresentationFiles.en = [...existingTask.secondBasedFiles.taskPresentationFiles.en];
        }
        
        if (existingTask.secondBasedFiles?.taskLiteratureFiles?.uz?.length) {
          this.task.secondBasedFiles.taskLiteratureFiles.uz = [...existingTask.secondBasedFiles.taskLiteratureFiles.uz];
        }
        if (existingTask.secondBasedFiles?.taskLiteratureFiles?.ru?.length) {
          this.task.secondBasedFiles.taskLiteratureFiles.ru = [...existingTask.secondBasedFiles.taskLiteratureFiles.ru];
        }
        if (existingTask.secondBasedFiles?.taskLiteratureFiles?.en?.length) {
          this.task.secondBasedFiles.taskLiteratureFiles.en = [...existingTask.secondBasedFiles.taskLiteratureFiles.en];
        }
        
        if (existingTask.secondBasedFiles?.taskVideoUrls?.length) {
          this.task.secondBasedFiles.taskVideoUrls = [...existingTask.secondBasedFiles.taskVideoUrls];
        }
      } catch (error) {
        console.error('Error copying files from existing task:', error);
      }
    }
    
    // Log the file structures to verify they're properly bound
    console.log('Task Files Bound:');
    console.log('Example Files:', this.task.firstBasedFiles.taskExampleFiles);
    console.log('Solution Files:', this.task.firstBasedFiles.taskSolutionFiles);
    console.log('Title Files:', this.task.secondBasedFiles.taskTitleFiles);
    console.log('Presentation Files:', this.task.secondBasedFiles.taskPresentationFiles);
    console.log('Literature Files:', this.task.secondBasedFiles.taskLiteratureFiles);
    console.log('Video URLs:', this.task.secondBasedFiles.taskVideoUrls);

    if (existingTask) {
      console.log('Using existing task with files:', this.task);
      this.toastr.info('Mavjud topshiriq ma\'lumotlari bilan ishlayapsiz.');
    } else {
      console.log('Creating new task structure:', this.task);
      this.toastr.info("Yangi topshiriq qo'shilmoqda.");
    }

    console.log('Final Task State:', {
      id: this.task.id,
      title: this.task.title,
      firstBasedFiles: this.task.firstBasedFiles,
      secondBasedFiles: this.task.secondBasedFiles
    });
  }

  getLessonTitleString(lesson: Lesson): string {
    if (!lesson || !lesson.lessonTitle) return 'Untitled';
    return `${lesson.lessonTitle?.uz || 'Untitled'} (UZ) - ${lesson.lessonTitle?.ru || 'Untitled'} (RU) - ${lesson.lessonTitle?.en || 'Untitled'} (EN)`;
  }

  getTaskTitleString(task: Task): string {
    if (!task || !task.title) return 'Untitled';
    return task.title;
  }
}
