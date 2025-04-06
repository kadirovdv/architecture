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
  map,
  catchError,
  of,
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
  uploading = false;
  progress = 0;
  uploadedCount = 0;
  totalUploads = 0;
  currentUploadFile: { name: string; size: number } | null = null;
  categoryStatus: Record<string, Record<string, { total: number; uploaded: number }>> = {};
  username: string = '';
  title: string = '';

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
    console.log(`File selected for category: ${category}, language: ${language}`);
    
    if (!this.task) {
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

    // Initialize file structures if they don't exist
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

    // Add files to the appropriate category and language
    if (this.isFirstClassFileCategory(category)) {
      // Ensure category and language arrays exist
      this.task.firstBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.task.firstBasedFiles[category][language] ??= [];
      
      // Append new files to existing array (don't replace)
      const existingFiles = this.task.firstBasedFiles[category][language] || [];
      this.task.firstBasedFiles[category][language] = [
        ...existingFiles,
        ...filesArray,
      ];
      
      console.log(`Added ${filesArray.length} files to ${category}.${language}`);
      console.log(`Total files in category now: ${this.task.firstBasedFiles[category][language].length}`);
    } else if (this.isSecondClassFileCategory(category)) {
      // Ensure category and language arrays exist
      this.task.secondBasedFiles[category] ??= { uz: [], ru: [], en: [] };
      this.task.secondBasedFiles[category][language] ??= [];
      
      // Append new files to existing array (don't replace)
      const existingFiles = this.task.secondBasedFiles[category][language] || [];
      this.task.secondBasedFiles[category][language] = [
        ...existingFiles,
        ...filesArray,
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
      this.saveChangesAfterFileRemoval();
    }
  }

  /**
   * Save task changes after file removal for existing lessons
   * This is a lighter version of uploadAllFilesAndSaveData that skips the file upload
   */
  private saveChangesAfterFileRemoval(): void {
    if (!this.lesson || !this.task || !this.existingLesson) {
      this.toastr.error('Lesson or task not found');
      return;
    }
    
    try {
      this.loaderService.show();
      
      // Create a deep copy of the task to use for saving
      const taskCopy = JSON.parse(JSON.stringify(this.task));
      
      // Prepare the task structure
      const taskToSave = {
        id: taskCopy.id,
        title: taskCopy.title,
        index: taskCopy.index,
        createdAt: taskCopy.createdAt || new Date().toISOString(),
        firstBasedFiles: taskCopy.firstBasedFiles,
        secondBasedFiles: taskCopy.secondBasedFiles
      };
      
      console.log('Saving task after file removal:', taskToSave);
      
      // Get existing website lessons and update
      this.crudService.getDocuments('website-lessons')
        .pipe(
          take(1),
          switchMap((websiteData: any[]) => {
            // Find our lesson
            const existingLesson = websiteData.find(
              (l: any) => 
                (this.lesson?.id && l.id === this.lesson.id) || 
                (this.lesson?.lessonTitle?.uz && l.lessonTitle?.uz === this.lesson.lessonTitle.uz)
            );
            
            if (!existingLesson) {
              throw new Error('Existing lesson not found');
            }
            
            // Find the task in the lesson
            const existingTasks = existingLesson.tasks || [];
            const existingTaskIndex = existingTasks.findIndex(
              (t: any) => t.id === taskToSave.id
            );
            
            if (existingTaskIndex === -1) {
              throw new Error('Existing task not found');
            }
            
            // Replace the task
            existingTasks[existingTaskIndex] = taskToSave;
            
            // Update the lesson
            const updatedLesson = {
              ...existingLesson,
              tasks: existingTasks
            };
            
            return this.crudService.updateDocument<Lesson>('website-lessons', existingLesson.id, updatedLesson);
          })
        )
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.toastr.success('O\'zgartishlar saqlandi');
            
            // Refresh website lessons data
            this.getWebsiteLessons();
          },
          error: (error) => {
            console.error('Error saving changes after file removal:', error);
            this.loaderService.hide();
            this.toastr.error('O\'zgartishlarni saqlashda xatolik');
          }
        });
    } catch (error) {
      console.error('Error in save after file removal:', error);
      this.loaderService.hide();
      this.toastr.error('Xatolik yuz berdi');
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

    // Reset tracking fields
    this.uploadedCount = 0;
    this.totalUploads = 0;
    this.currentUploadFile = null;
    this.progress = 0;
    this.uploading = true; 
    this.loaderService.show();
    
    try {
      // Create a deep copy of the task to preserve existing files
      const taskCopy = JSON.parse(JSON.stringify(this.task));
      
      // Create a new object to track all files, both existing and new
      // @ts-ignore: Complex nested object type
      const uploadedFiles = {
        title: taskCopy.title,
        id: taskCopy.id,
        index: taskCopy.index,
        createdAt: taskCopy.createdAt,
        firstBasedFiles: {
          taskExampleFiles: { uz: [], ru: [], en: [] },
          taskSolutionFiles: { uz: [], ru: [], en: [] }
        },
        secondBasedFiles: {
          taskTitleFiles: { uz: [], ru: [], en: [] },
          taskPresentationFiles: { uz: [], ru: [], en: [] },
          taskLiteratureFiles: { uz: [], ru: [], en: [] },
          taskVideoUrls: taskCopy.secondBasedFiles?.taskVideoUrls || []
        }
      };
      
      console.log('Initial uploadedFiles structure created');
      
      // Create a map to track files by unique identifiers to prevent duplicates
      const fileTracker = {
        urls: new Set<string>(),
        ids: new Set<string>(),
        paths: new Set<string>()
      };
      
      // Helper function to track file identifiers
      const trackFile = (file: any): boolean => {
        if (!file) return false;
        
        // Check if we've already seen this file
        if (file.url && fileTracker.urls.has(file.url)) return false;
        if (file.id && fileTracker.ids.has(file.id)) return false;
        if (file.path && fileTracker.paths.has(file.path)) return false;
        
        // If not, add to tracking sets
        if (file.url) fileTracker.urls.add(file.url);
        if (file.id) fileTracker.ids.add(file.id);
        if (file.path) fileTracker.paths.add(file.path);
        
        return true; // File is unique
      };
      
      // First add all existing files that already have URLs to our tracking
      const addExistingFiles = (categoryPath: 'firstBasedFiles' | 'secondBasedFiles', category: string) => {
        ['uz', 'ru', 'en'].forEach(lang => {
          const files = taskCopy[categoryPath]?.[category]?.[lang] || [];
          const existingFiles = files.filter((file: any) => file && file.url);
          
          console.log(`Found ${existingFiles.length} existing files with URLs in ${category}.${lang}`);
          
          existingFiles.forEach((file: any) => {
            if (trackFile(file)) {
              // Get the right category object with type assertion
              const categoryObj = uploadedFiles[categoryPath as keyof typeof uploadedFiles] as any;
              // Make sure the category exists in the object
              if (category in categoryObj && 
                  (lang === 'uz' || lang === 'ru' || lang === 'en')) {
                // Push file directly using any type
                categoryObj[category][lang].push({
                  name: file.name,
                  url: file.url,
                  size: file.size,
                  type: file.type || '',
                  path: file.path || '',
                  path_lower: file.path_lower || '',
                  id: file.id || '',
                  rev: file.rev || '',
                  server_modified: file.server_modified || null,
                  client_modified: file.client_modified || null,
                  existing: true // Mark as existing file
                });
              }
            }
          });
        });
      };
      
      // Add all existing files with URLs
      if (taskCopy.firstBasedFiles) {
        ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
          addExistingFiles('firstBasedFiles', category);
        });
      }
      
      if (taskCopy.secondBasedFiles) {
        ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
          addExistingFiles('secondBasedFiles', category);
        });
      }
      
      // Check each file category and prepare file uploads
      const allUploadObservables: Observable<any>[] = [];
      
      // Helper to create upload observables
      const createUploadObservables = (categoryPath: string, category: string) => {
        const observables: Observable<any>[] = [];
        
        ['uz', 'ru', 'en'].forEach(lang => {
          const files = taskCopy[categoryPath]?.[category]?.[lang] || [];
          // Only get files that need to be uploaded (have a file property but no URL)
          const filesToUpload = files.filter((file: any) => file && file.file && !file.url);
          
          console.log(`Found ${filesToUpload.length} new files to upload for ${category} in ${lang} language`);
          
          filesToUpload.forEach((file: any) => {
            if (!file.file) return;
            
            const fileObj = file.file;
            const fileName = file.name || fileObj.name;
            console.log(`Preparing to upload ${fileName}`);
            
            const folderName = this.lesson?.lessonTitle?.uz || 'untitled';
            const filePath = `/${folderName}/${category}/${lang}/${fileName}`;
            
            const uploadObservable = this.dropboxService.uploadFile(filePath, fileObj).pipe(
              switchMap((response: any) => {
                console.log(`Successfully uploaded ${fileName} to Dropbox:`, response);
                
                // Extract all metadata from the Dropbox response
                const pathDisplay = response.path_display;
                
                return this.dropboxService.createSharedLink(pathDisplay).pipe(
                  map(linkResponse => ({
                    linkResponse,
                    dropboxResponse: response
                  }))
                );
              }),
              map((result: any) => {
                console.log(`Created shared link for ${fileName}:`, result);
                
                const sharedLinkUrl = result.linkResponse;
                const dropboxResponse = result.dropboxResponse;
                
                let downloadUrl = '';
                if (typeof sharedLinkUrl === 'string') {
                  downloadUrl = sharedLinkUrl.replace(/[\?&]dl=\d/g, '').concat('?dl=1');
                }
                
                const fileInfo = {
                  name: fileName,
                  url: downloadUrl,
                  size: fileObj.size,
                  type: fileObj.type,
                  path: dropboxResponse.path_display,
                  path_lower: dropboxResponse.path_lower,
                  id: dropboxResponse.id,
                  rev: dropboxResponse.rev,
                  server_modified: dropboxResponse.server_modified,
                  client_modified: dropboxResponse.client_modified,
                  categoryPath,
                  category,
                  lang
                };
                
                console.log(`Complete file info for ${fileName}:`, fileInfo);
                
                return fileInfo;
              }),
              catchError(error => {
                console.error(`Error uploading ${fileName}:`, error);
                return of(null);
              })
            );
            
            observables.push(uploadObservable);
          });
        });
        
        return observables;
      };
      
      // Create upload observables for each category
      if (taskCopy.firstBasedFiles) {
        ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
          const observables = createUploadObservables('firstBasedFiles', category);
          allUploadObservables.push(...observables);
        });
      }
      
      if (taskCopy.secondBasedFiles) {
        ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
          const observables = createUploadObservables('secondBasedFiles', category);
          allUploadObservables.push(...observables);
        });
      }

      console.log(`Total files to upload: ${allUploadObservables.length}`);

      if (allUploadObservables.length === 0) {
        console.log('No new files to upload, saving directly to Firebase');
        this.saveToFirebase(uploadedFiles);
        return;
      }

      // Get the final count of uploads
      this.totalUploads = allUploadObservables.length;

      // Process uploads sequentially with a delay between each
      from(allUploadObservables)
        .pipe(
          concatMap((obs, index) => {
            // Extract file info from the original task data to show in UI
            const fileInfo = this.extractFileInfoFromObservable(index);
            
            return obs.pipe(
              tap((result) => {
                this.currentUploadFile = fileInfo;
                
                if (result) {
                  // Add the uploaded file to our uploadedFiles object if it's unique
                  const { categoryPath, category, lang, ...fileData } = result;
                  if (trackFile(fileData)) {
                    // Use type assertions to handle dynamic property access
                    if (categoryPath === 'firstBasedFiles' || categoryPath === 'secondBasedFiles') {
                      // Get the right category object with type assertion
                      const categoryObj = uploadedFiles[categoryPath as keyof typeof uploadedFiles] as any;
                      // Make sure the category exists in the object
                      if (category in categoryObj && 
                          typeof lang === 'string' && 
                          (lang === 'uz' || lang === 'ru' || lang === 'en')) {
                        // Use type assertion to access the nested property
                        categoryObj[category][lang].push(fileData);
                      }
                    }
                  }
                }
              }),
              delay(1000) // Add 1-second delay between each file upload
            );
          }),
          finalize(() => {
            this.uploading = false;
            this.currentUploadFile = null;
            this.loaderService.hide();
          })
        )
        .subscribe({
          next: () => {
            this.uploadedCount++;
            this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
            console.log(`Upload progress: ${this.progress}% (${this.uploadedCount}/${this.totalUploads})`);
          },
          complete: () => {
            this.progress = 100;
            this.toastr.success('Fayllar muvaffaqiyatli yuklandi');
            // Final deduplication step to ensure no duplicates
            this.deduplicateFiles(uploadedFiles);
            this.saveToFirebase(uploadedFiles);
          },
          error: (error: any) => {
            console.error('Error uploading files:', error);
            this.toastr.error('Fayllar yuklanishda xatolik');
            this.loaderService.hide();
            this.uploading = false;
          },
        });
    } catch (error) {
      console.error('Error in upload process:', error);
      this.toastr.error('Fayl yuklash jarayonida xatolik yuz berdi');
      this.loaderService.hide();
      this.uploading = false;
    }
  }

  private saveToFirebase(uploadedFiles: any): void {
    console.log('Saving to Firebase with files:', uploadedFiles);
    
    if (!this.lesson) {
      this.toastr.error('Fan tanlanmagan!');
      this.loaderService.hide();
      return;
    }

    this.deduplicateFiles(uploadedFiles);

    // Ensure all file objects have consistent properties before saving
    this.normalizeFileObjects(uploadedFiles);

    const taskToSave = {
      id: this.task?.id || uploadedFiles.id,
      title: this.task?.title || uploadedFiles.title,
      index: this.task?.index || uploadedFiles.index,
      createdAt: this.task?.createdAt || uploadedFiles.createdAt || new Date().toISOString(),
      firstBasedFiles: uploadedFiles.firstBasedFiles,
      secondBasedFiles: uploadedFiles.secondBasedFiles
    };

    console.log('Task prepared for saving:', taskToSave);

    this.crudService
      .getDocuments('website-lessons')
      .pipe(
        take(1),
        switchMap((websiteData: any[]) => {
          console.log('Retrieved Website Lessons Data:', websiteData);
          
          const existingLesson = websiteData.find(
            (l: any) => 
              (this.lesson?.id && l.id === this.lesson.id) || 
              (this.lesson?.lessonTitle?.uz && l.lessonTitle?.uz === this.lesson.lessonTitle.uz)
          );
          
          console.log('Existing lesson found:', existingLesson);
          
          if (existingLesson) {
            const existingTasks = existingLesson.tasks || [];
            
            const existingTaskIndex = existingTasks.findIndex(
              (t: any) => (taskToSave.id && t.id === taskToSave.id) || 
                          (taskToSave.title && t.title === taskToSave.title)
            );
            
            console.log('Existing task index:', existingTaskIndex);
            
            if (existingTaskIndex !== -1) {
              console.log('Found existing task, merging files');
              const existingTask = existingTasks[existingTaskIndex];
              
              const mergedTask = {
                ...existingTask,
                id: taskToSave.id || existingTask.id,
                title: taskToSave.title || existingTask.title,
                index: taskToSave.index || existingTask.index,
                createdAt: existingTask.createdAt || taskToSave.createdAt,
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
              
              ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
                ['uz', 'ru', 'en'].forEach(lang => {
                  mergedTask.firstBasedFiles[category][lang] = 
                    [...(taskToSave.firstBasedFiles[category][lang] || [])];
                  
                  if (existingTask.firstBasedFiles?.[category]?.[lang]) {
                    existingTask.firstBasedFiles[category][lang].forEach((file: any) => {
                      if (!mergedTask.firstBasedFiles[category][lang].some(
                          (f: any) => (f.url && f.url === file.url) || 
                                      (f.id && f.id === file.id) ||
                                      (f.path && f.path === file.path)
                      )) {
                        mergedTask.firstBasedFiles[category][lang].push(file);
                      }
                    });
                  }
                });
              });
              
              ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
                ['uz', 'ru', 'en'].forEach(lang => {
                  mergedTask.secondBasedFiles[category][lang] = 
                    [...(taskToSave.secondBasedFiles[category][lang] || [])];
                  
                  if (existingTask.secondBasedFiles?.[category]?.[lang]) {
                    existingTask.secondBasedFiles[category][lang].forEach((file: any) => {
                      if (!mergedTask.secondBasedFiles[category][lang].some(
                          (f: any) => (f.url && f.url === file.url) || 
                                      (f.id && f.id === file.id) ||
                                      (f.path && f.path === file.path)
                      )) {
                        mergedTask.secondBasedFiles[category][lang].push(file);
                      }
                    });
                  }
                });
              });
              
              mergedTask.secondBasedFiles.taskVideoUrls = [
                ...(taskToSave.secondBasedFiles.taskVideoUrls || [])
              ];
              
              if (existingTask.secondBasedFiles?.taskVideoUrls) {
                existingTask.secondBasedFiles.taskVideoUrls.forEach((video: Videos) => {
                  const isDuplicate = mergedTask.secondBasedFiles.taskVideoUrls.some((v: Videos) => 
                    (v.url.uz === video.url.uz && v.url.uz !== '') ||
                    (v.url.ru === video.url.ru && v.url.ru !== '') ||
                    (v.url.en === video.url.en && v.url.en !== '')
                  );
                  
                  if (!isDuplicate) {
                    mergedTask.secondBasedFiles.taskVideoUrls.push(video);
                  }
                });
              }
              
              // Final deduplication to ensure no duplicates in merged task
              this.deduplicateTaskFiles(mergedTask);
              
              existingTasks[existingTaskIndex] = mergedTask;
            } else {
              console.log('Task doesn\'t exist in this lesson, adding it');
              existingTasks.push(taskToSave);
            }
            
            const updatedLesson = {
              ...existingLesson,
              tasks: existingTasks
            };
            
            console.log('Updating existing lesson:', updatedLesson);
            return this.crudService.updateDocument<Lesson>('website-lessons', existingLesson.id, updatedLesson);
          } else {
            const newLesson = {
              id: this.lesson?.id || this.crudService.generateId(),
              lessonTitle: this.lesson?.lessonTitle || { uz: '', ru: '', en: '' },
              thumbnail: this.lesson?.thumbnail || '',
              index: this.lesson?.index || 0,
              createdAt: this.lesson?.createdAt || new Date().toISOString(),
              tasks: [taskToSave],
              active: true
            };
            
            console.log('Creating new lesson:', newLesson);
            return this.crudService.addDocument('website-lessons', newLesson);
          }
        })
      )
      .subscribe({
        next: () => {
          this.loaderService.hide();
          this.uploading = false;
          this.toastr.success('Ma\'lumotlar saqlandi!');
          console.log('Data saved successfully');
          
          this.getWebsiteLessons();
        },
        error: (error: any) => {
          console.error('Error saving data:', error);
          this.loaderService.hide();
          this.uploading = false;
          this.toastr.error('Ma\'lumotlarni saqlashda xatolik!');
        }
      });
  }

  /**
   * Make sure all file objects have consistent properties
   */
  private normalizeFileObjects(uploadedFiles: any): void {
    console.log('Normalizing file objects for consistency');
    
    // Process first class files
    if (uploadedFiles.firstBasedFiles) {
      ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
        ['uz', 'ru', 'en'].forEach(lang => {
          if (uploadedFiles.firstBasedFiles[category]?.[lang]) {
            uploadedFiles.firstBasedFiles[category][lang] = 
              uploadedFiles.firstBasedFiles[category][lang].map((file: any) => {
                if (!file) return null;
                return {
                  name: file.name || '',
                  url: file.url || '',
                  size: file.size || 0,
                  type: file.type || '',
                  path: file.path || '',
                  path_lower: file.path_lower || '',
                  id: file.id || '',
                  rev: file.rev || '',
                  server_modified: file.server_modified || null,
                  client_modified: file.client_modified || null
                };
              }).filter(Boolean);
          }
        });
      });
    }
    
    // Process second class files
    if (uploadedFiles.secondBasedFiles) {
      ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
        ['uz', 'ru', 'en'].forEach(lang => {
          if (uploadedFiles.secondBasedFiles[category]?.[lang]) {
            uploadedFiles.secondBasedFiles[category][lang] = 
              uploadedFiles.secondBasedFiles[category][lang].map((file: any) => {
                if (!file) return null;
                return {
                  name: file.name || '',
                  url: file.url || '',
                  size: file.size || 0,
                  type: file.type || '',
                  path: file.path || '',
                  path_lower: file.path_lower || '',
                  id: file.id || '',
                  rev: file.rev || '',
                  server_modified: file.server_modified || null,
                  client_modified: file.client_modified || null
                };
              }).filter(Boolean);
          }
        });
      });
    }
  }

  /**
   * Deduplicate files within a single task
   */
  private deduplicateTaskFiles(task: any): void {
    const taskWrapper = {
      firstBasedFiles: task.firstBasedFiles,
      secondBasedFiles: task.secondBasedFiles
    };
    
    this.deduplicateFiles(taskWrapper);
    
    task.firstBasedFiles = taskWrapper.firstBasedFiles;
    task.secondBasedFiles = taskWrapper.secondBasedFiles;
  }

  /**
   * Deduplicate files across all languages
   */
  private deduplicateFiles(uploadedFiles: any): void {
    console.log('Starting file deduplication');
    let totalDuplicatesRemoved = 0;
    
    // Helper function to deduplicate files across languages
    const deduplicateCategory = (categoryPath: string, category: string) => {
      // Create maps for unique tracking
      const urlMap = new Map<string, {lang: string, index: number, file: any}>();
      const idMap = new Map<string, {lang: string, index: number, file: any}>();
      const pathMap = new Map<string, {lang: string, index: number, file: any}>();
      
      // First pass: collect all files and their unique identifiers
      ['uz', 'ru', 'en'].forEach(lang => {
        const files = uploadedFiles[categoryPath]?.[category]?.[lang] || [];
        files.forEach((file: any, index: number) => {
          if (!file) return;
          
          // Track by URL (primary key)
          if (file.url) {
            if (urlMap.has(file.url)) {
              console.log(`Found duplicate URL across languages in ${category}: ${file.url}`);
            } else {
              urlMap.set(file.url, {lang, index, file});
            }
          }
          
          // Track by Dropbox ID if available
          if (file.id) {
            if (idMap.has(file.id)) {
              console.log(`Found duplicate Dropbox ID across languages in ${category}: ${file.id}`);
            } else {
              idMap.set(file.id, {lang, index, file});
            }
          }
          
          // Track by path if available
          if (file.path) {
            if (pathMap.has(file.path)) {
              console.log(`Found duplicate path across languages in ${category}: ${file.path}`);
            } else {
              pathMap.set(file.path, {lang, index, file});
            }
          }
        });
      });
      
      // Second pass: filter out duplicates
      ['uz', 'ru', 'en'].forEach(lang => {
        if (uploadedFiles[categoryPath]?.[category]?.[lang]?.length) {
          const originalLength = uploadedFiles[categoryPath][category][lang].length;
          
          // Keep only files with unique identifiers
          uploadedFiles[categoryPath][category][lang] = 
            uploadedFiles[categoryPath][category][lang].filter((file: any, index: number) => {
              if (!file) return false;
              
              // If no identifiers at all, keep it
              if (!file.url && !file.id && !file.path) return true;
              
              // Check URL duplication (primary method)
              if (file.url) {
                const mapEntry = urlMap.get(file.url);
                if (mapEntry && (mapEntry.lang !== lang || mapEntry.index !== index)) {
                  return false; // Duplicate by URL
                }
              }
              
              // If we have an ID but no URL, check ID duplication
              if (!file.url && file.id) {
                const mapEntry = idMap.get(file.id);
                if (mapEntry && (mapEntry.lang !== lang || mapEntry.index !== index)) {
                  return false; // Duplicate by ID
                }
              }
              
              // If we only have path, check path duplication
              if (!file.url && !file.id && file.path) {
                const mapEntry = pathMap.get(file.path);
                if (mapEntry && (mapEntry.lang !== lang || mapEntry.index !== index)) {
                  return false; // Duplicate by path
                }
              }
              
              return true; // Not a duplicate
            });
          
          const newLength = uploadedFiles[categoryPath][category][lang].length;
          const duplicatesRemoved = originalLength - newLength;
          totalDuplicatesRemoved += duplicatesRemoved;
          
          if (duplicatesRemoved > 0) {
            console.log(`Removed ${duplicatesRemoved} duplicate files from ${category}.${lang}`);
          }
        }
      });
    };
    
    // Deduplicate first class files
    if (uploadedFiles.firstBasedFiles) {
      ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
        deduplicateCategory('firstBasedFiles', category);
      });
    }
    
    // Deduplicate second class files
    if (uploadedFiles.secondBasedFiles) {
      ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
        deduplicateCategory('secondBasedFiles', category);
      });
      
      // Handle videos specially since they have a different structure
      if (uploadedFiles.secondBasedFiles.taskVideoUrls?.length) {
        const originalLength = uploadedFiles.secondBasedFiles.taskVideoUrls.length;
        
        const uniqueVideos: Videos[] = [];
        const urlSet = new Set<string>();
        
        uploadedFiles.secondBasedFiles.taskVideoUrls.forEach((video: Videos) => {
          // Skip empty videos
          if (!video.url.uz && !video.url.ru && !video.url.en) {
            return;
          }
          
          // Create a unique key using all language URLs
          const videoKey = [
            video.url.uz || '',
            video.url.ru || '',
            video.url.en || ''
          ].filter(u => u !== '').join('|');
          
          if (videoKey && !urlSet.has(videoKey)) {
            urlSet.add(videoKey);
            uniqueVideos.push(video);
          }
        });
        
        uploadedFiles.secondBasedFiles.taskVideoUrls = uniqueVideos;
        
        const newLength = uploadedFiles.secondBasedFiles.taskVideoUrls.length;
        const duplicatesRemoved = originalLength - newLength;
        totalDuplicatesRemoved += duplicatesRemoved;
        
        if (duplicatesRemoved > 0) {
          console.log(`Removed ${duplicatesRemoved} duplicate videos from taskVideoUrls`);
        }
      }
    }
    
    console.log(`Deduplication complete. Removed ${totalDuplicatesRemoved} duplicate files in total.`);
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  onFileTypeSelect(lang: string, category: string) {
    console.log(`Selecting file for language: ${lang}, category: ${category}`);
    this.selectedLanguage = lang as 'uz' | 'ru' | 'en';
    this.currentCategory = category;
    
    const inputs = this.hiddenInputs.toArray();
    const input = inputs.find(
      (input) => input.nativeElement.getAttribute('data-category') === category
    );
    
    if (input) {
      input.nativeElement.click();
    } else {
      console.error(`No input found for category: ${category}`);
    }
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

    const existingLesson = this.websiteLessons.find(
      (lesson) => 
        (lesson.id && selectedLesson.id && lesson.id === selectedLesson.id) ||
        (lesson.lessonTitle?.uz && 
         selectedLesson.lessonTitle?.uz && 
         lesson.lessonTitle.uz === selectedLesson.lessonTitle.uz)
    );

    this.lesson = {
      id: selectedLesson.id || this.crudService.generateId(),
      lessonTitle: selectedLesson.lessonTitle || { uz: '', ru: '', en: '' },
      thumbnail: selectedLesson.thumbnail,
      index: selectedLesson.index,
      createdAt: selectedLesson.createdAt || new Date().toISOString(),
      tasks: selectedLesson.tasks || []
    };
    
    if (existingLesson) {
      console.log('Existing website lesson found:', existingLesson);
      this.existingLesson = existingLesson;
      this.toastr.info("Mavjud fan topildi. Topshiriq tanlang.");
      
      if (existingLesson.lessonTitle?.uz !== selectedLesson.lessonTitle?.uz) {
        this.lesson.lessonTitle = existingLesson.lessonTitle;
      }
    } else {
      console.log('New lesson will be created:', this.lesson);
      this.existingLesson = null;
      this.toastr.info("Yangi fan yaratilmoqda. Topshiriq tanlang.");
    }
    this.task = null;
  }

  onTaskSelect(selectedTask: Task): void {
    console.log('Selected Task Input:', selectedTask);
    
    if (!selectedTask || !this.lesson) {
      this.task = null;
      return;
    }

    let existingTask = null;
    if (this.existingLesson?.tasks) {
      console.log('Looking in existing lesson tasks:', this.existingLesson.tasks);
      existingTask = this.existingLesson.tasks.find(
        (task: Task) =>
          (task.id && selectedTask.id && task.id === selectedTask.id) ||
          (task.title && selectedTask.title && task.title === selectedTask.title)
      );
    }

    console.log('Found existing task:', existingTask);
    console.log('Existing task files:', existingTask?.firstBasedFiles, existingTask?.secondBasedFiles);
    
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
    
    if (existingTask) {
      try {
        ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
          ['uz', 'ru', 'en'].forEach(lang => {
            if (existingTask.firstBasedFiles?.[category]?.[lang]?.length) {
              this.task.firstBasedFiles[category][lang] = 
                [...existingTask.firstBasedFiles[category][lang]];
            }
          });
        });
        
        ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
          ['uz', 'ru', 'en'].forEach(lang => {
            if (existingTask.secondBasedFiles?.[category]?.[lang]?.length) {
              this.task.secondBasedFiles[category][lang] = 
                [...existingTask.secondBasedFiles[category][lang]];
            }
          });
        });
        
        if (existingTask.secondBasedFiles?.taskVideoUrls?.length) {
          this.task.secondBasedFiles.taskVideoUrls = 
            [...existingTask.secondBasedFiles.taskVideoUrls];
        }
      } catch (error) {
        console.error('Error copying files from existing task:', error);
      }
    }
    
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
      file: file,
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

  extractFileInfoFromObservable(index: number): { name: string; size: number } {
    let fileInfo = { name: `File ${index + 1}`, size: 0 };
    
    let currentIndex = 0;
    const searchInCategory = (category: string, files: any) => {
      for (const lang in files) {
        const filesList = files[lang].filter((f: any) => f && f.file);
        for (const file of filesList) {
          if (currentIndex === index) {
            fileInfo = { name: file.name, size: file.size };
            return true;
          }
          currentIndex++;
        }
      }
      return false;
    };
    
    if (this.task.firstBasedFiles) {
      for (const category in this.task.firstBasedFiles) {
        if (searchInCategory(category, this.task.firstBasedFiles[category])) {
          return fileInfo;
        }
      }
    }
    
    if (this.task.secondBasedFiles) {
      for (const category in this.task.secondBasedFiles) {
        if (category !== 'taskVideoUrls' && searchInCategory(category, this.task.secondBasedFiles[category])) {
          return fileInfo;
        }
      }
    }
    
    return fileInfo;
  }
}
