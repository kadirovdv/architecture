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
  throwError,
} from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-edit-build',
  templateUrl: './edit-build.page.html',
  styleUrls: ['./edit-build.page.scss'],
})
export class EditBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  @ViewChildren('taskExampleInput, taskSolutionInput, taskTitleInput, taskPresentationInput, taskLiteratureInput') 
  fileInputs!: QueryList<ElementRef>;
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
    private loaderService: LoadingService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.getLessons();
    this.getWebsiteLessons();
    
    // Get the lesson ID from the query parameters
    this.route.queryParams.subscribe(params => {
      const lessonId = params['id'];
      if (lessonId) {
        this.setLessonFromId(lessonId);
      }
    });
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

  private prepareFilesForUpload(uploadedFiles: any): Observable<any>[] {
    console.log('Preparing files for upload');
    
    // Track existing files and files that need replacement
    const replacements = new Map<string, {
      categoryPath: string;
      category: string;
      lang: string;
      index: number;
      file: any;
    }>();
    
    // Collect all files that need to be uploaded and track replacements
    const allFilesToUpload: Array<{
      file: File;
      categoryPath: string;
      category: string;
      lang: string;
      index: number;
      metadata: any;
    }> = [];
    
    // Helper to collect files that need uploading
    const collectFilesForUpload = (categoryPath: string, category: string) => {
      ['uz', 'ru', 'en'].forEach(lang => {
        if (!this.task[categoryPath]?.[category]?.[lang]) return;
        
        this.task[categoryPath][category][lang].forEach((file: any, index: number) => {
          // Properly check if we have a valid File object
          if (file && file.file && file.file instanceof File) {
            // Get the actual File object, not the wrapper
            const fileObj = file.file;
            const fileName = file.name || fileObj.name;
            
            console.log(`Found uploadable file: ${fileName} (${fileObj.size} bytes, type: ${fileObj.type})`);
            
            // Check if this is a replacement
            if (file.isReplacement) {
              console.log(`Found replacement file ${fileName} in ${categoryPath}.${category}.${lang}`);
              
              // Create a unique key for the replacement to identify it later
              const replacementKey = `${categoryPath}_${category}_${lang}_${index}`;
              replacements.set(replacementKey, {
                categoryPath,
                category,
                lang,
                index,
                file
              });
              
              // If there's a URL of the file being replaced, track it
              if (file.replacedFileUrl) {
                console.log(`This file is replacing file with URL: ${file.replacedFileUrl}`);
              }
            }
            
            // Add to upload queue with the actual File object, not the wrapper
            allFilesToUpload.push({
              file: fileObj,  // This is the actual File object
              categoryPath,
              category,
              lang,
              index,
              metadata: {
                isReplacement: file.isReplacement || false,
                replacedFileUrl: file.replacedFileUrl,
                replacedFileId: file.replacedFileId,
                originalPath: file.path,
                originalId: file.id
              }
            });
          } else if (file && !file.url && !(file.file instanceof File)) {
            console.warn(`Found file entry without valid File object at ${categoryPath}.${category}.${lang}[${index}]:`, file);
          }
        });
      });
    };
    
    // Collect all files that need to be uploaded
    if (this.task.firstBasedFiles) {
      ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
        collectFilesForUpload('firstBasedFiles', category);
      });
    }
    
    if (this.task.secondBasedFiles) {
      ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
        collectFilesForUpload('secondBasedFiles', category);
      });
    }
    
    return allFilesToUpload.map(uploadInfo => {
      const { file, categoryPath, category, lang, index, metadata } = uploadInfo;
      const fileName = file.name;
      
      
      if (!(file instanceof File)) {
        console.error('Attempting to upload invalid file object:', file);
        return of(null);
      }
      
      return this.dropboxService.uploadFile(fileName, file).pipe(
        switchMap((response: any) => {
          console.log(`Successfully uploaded ${file.name} to Dropbox:`, response);
          return this.dropboxService.createSharedLink(response.path_display).pipe(
            map(linkResponse => ({
              linkResponse,
              dropboxResponse: response,
              uploadInfo
            }))
          );
        }),
        map((result: any) => {
          const { linkResponse, dropboxResponse, uploadInfo } = result;
          const { categoryPath, category, lang, index, metadata } = uploadInfo;
          
          let downloadUrl = '';
          if (typeof linkResponse === 'string') {
            downloadUrl = linkResponse.replace(/[\?&]dl=\d/g, '').concat('?dl=1');
          }
          
          // Ensure the file arrays exist
          if (!this.task[categoryPath][category]) {
            this.task[categoryPath][category] = { uz: [], ru: [], en: [] };
          }
          
          if (!this.task[categoryPath][category][lang]) {
            this.task[categoryPath][category][lang] = [];
          }
          
          // Get the file array to modify
          const fileArray = this.task[categoryPath][category][lang];
          
          const fileInfo = {
            name: file.name,
            url: downloadUrl,
            size: file.size,
            type: file.type,
            path: dropboxResponse.path_display,
            path_lower: dropboxResponse.path_lower,
            id: dropboxResponse.id,
            rev: dropboxResponse.rev,
            server_modified: dropboxResponse.server_modified,
            client_modified: dropboxResponse.client_modified,
            category: category,
            language: lang,
            isReplacement: metadata.isReplacement,
            replacedFileUrl: metadata.replacedFileUrl,
            replacedFileId: metadata.replacedFileId
          };
          
          console.log(`Complete file info for ${file.name}:`, fileInfo);
          
          // If this is a replacement, update the existing file
          if (metadata.isReplacement) {
            console.log(`Replacing file at index ${index} with new upload`);
            fileArray[index] = fileInfo;
          } else {
            const fileObjectIndex = fileArray.findIndex((f: any) => 
              f.name === file.name && f.file instanceof File && f.size === file.size
            );
            
            if (fileObjectIndex >= 0) {
              console.log(`Removing original File object entry at index ${fileObjectIndex}`);
              fileArray.splice(fileObjectIndex, 1);
            }
            console.log(`Adding new file to ${categoryPath}.${category}.${lang} array`);
            fileArray.push(fileInfo);
          }
          
          // Log the updated array state
          console.log(`${categoryPath}.${category}.${lang} array now has ${fileArray.length} files`);
          
          return {
            fileInfo,
            categoryPath,
            category,
            lang,
            index,
            isReplacement: metadata.isReplacement
          };
        }),
        catchError(error => {
          console.error(`Error uploading ${file.name}:`, error);
          return of(null);
        })
      );
    });
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

    // Log important state before starting upload
    console.log('Starting upload with lesson:', this.lesson?.id, this.lesson?.lessonTitle);
    console.log('Task to upload:', this.task?.id, this.task?.title);
    console.log('Existing website lesson:', this.existingLesson?.id);
    
    // Reset tracking fields
    this.uploadedCount = 0;
    this.totalUploads = 0;
    this.currentUploadFile = null;
    this.progress = 0;
    this.uploading = true; 
    this.loaderService.show();
    
    try {
      // Prepare and collect all files for upload
      const uploadObservables = this.prepareFilesForUpload(this.task);
      console.log(`Total files to upload: ${uploadObservables.length}`);

      if (uploadObservables.length === 0) {
        console.log('No new files to upload, saving directly to Firebase');
        this.saveToFirebase(this.task);
        return;
      }

      // Get the final count of uploads
      this.totalUploads = uploadObservables.length;

      // Create an array to track successful upload results
      const uploadResults: any[] = [];

      // Process uploads sequentially with a delay between each
      from(uploadObservables)
        .pipe(
          concatMap((obs, index) => {
            if (!obs) {
              console.log(`Observable at index ${index} is null, skipping`);
              this.uploadedCount++;
              this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
              return of(null);
            }
            
            return obs.pipe(
              tap((result) => {
                if (result) {
                  // Track successful upload
                  uploadResults.push(result);
                  
                  const { fileInfo } = result;
                  this.currentUploadFile = { name: fileInfo.name, size: fileInfo.size };
                  this.uploadedCount++;
                  this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
                } else {
                  // Handle null result (failed upload)
                  console.warn(`Upload at index ${index} failed or returned null`);
                  this.uploadedCount++;
                  this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
                }
              }),
              catchError(error => {
                console.error(`Error in upload at index ${index}:`, error);
                this.uploadedCount++;
                this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
                return of(null);
              }),
              delay(1000) // Add 1-second delay between each file upload
            );
          }),
          finalize(() => {
            this.uploading = false;
            this.currentUploadFile = null;
            
            if (this.uploadedCount < this.totalUploads) {
              console.warn(`Not all uploads completed: ${this.uploadedCount}/${this.totalUploads}`);
              this.loaderService.hide();
              this.toastr.warning('Some files may not have been uploaded successfully');
            }
          })
        )
        .subscribe({
          next: (result) => {
            if (result) {
              console.log(`Upload progress: ${this.progress}% (${this.uploadedCount}/${this.totalUploads})`);
            }
          },
          complete: () => {
            this.progress = 100;
            
            // Log summary of uploads
            console.log(`Upload completed: ${this.uploadedCount}/${this.totalUploads} files uploaded successfully`);
            console.log('Upload result summary:', 
              Object.entries(this.task.firstBasedFiles || {}).map(([category, langs]) => 
                `${category}: ${Object.entries(langs as any).map(([lang, files]) => 
                  `${lang}: ${(files as any[]).length} files`
                ).join(', ')}`
              ).join('; ') + '; ' +
              Object.entries(this.task.secondBasedFiles || {})
                .filter(([category]) => category !== 'taskVideoUrls')
                .map(([category, langs]) => 
                  `${category}: ${Object.entries(langs as any).map(([lang, files]) => 
                    `${lang}: ${(files as any[]).length} files`
                  ).join(', ')}`
                ).join('; ')
            );
            
            this.toastr.success('Fayllar muvaffaqiyatli yuklandi');
            
            // Save the task with the updated files
            this.saveToFirebase(this.task);
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

  private saveToFirebase(taskData: any): void {
    console.log('Saving to Firebase with task data:', taskData);
    
    if (!this.lesson) {
      this.toastr.error('Fan tanlanmagan!');
      this.loaderService.hide();
      return;
    }

    // Create a clean task copy to save (remove temporary upload fields)
    const taskCopy = JSON.parse(JSON.stringify(taskData));
    this.cleanupTaskData(taskCopy);

    // Ensure all files have been properly deduplicated 
    this.deduplicateTaskData(taskCopy);

    // Prepare the task data for saving
    const taskToSave = {
      id: taskCopy.id,
      title: taskCopy.title,
      index: taskCopy.index,
      createdAt: taskCopy.createdAt || new Date().toISOString(),
      firstBasedFiles: taskCopy.firstBasedFiles,
      secondBasedFiles: taskCopy.secondBasedFiles
    };

    // Determine which collection to save to based on task source
    const taskSource = (taskData as any).source || 'unknown';
    console.log(`Saving task from source: ${taskSource}`);
    
    // If task is from website collection, update it there; otherwise, save to lessons collection
    if (taskSource === 'website' && this.existingLesson) {
      console.log('Updating task in website-lessons collection');
      
      this.crudService
        .getDocuments('website-lessons')
        .pipe(
          take(1),
          switchMap((websiteData: any[]) => {
            console.log('Retrieved Website Lessons Data:', websiteData);
            
            const existingLesson = websiteData.find(
              (l: any) => 
                (this.existingLesson?.id && l.id === this.existingLesson.id) || 
                (this.existingLesson?.lessonTitle?.uz && l.lessonTitle?.uz === this.existingLesson.lessonTitle.uz)
            );
            
            console.log('Existing website lesson found:', existingLesson);
            
            if (existingLesson) {
              const existingTasks = existingLesson.tasks || [];
              
              const existingTaskIndex = existingTasks.findIndex(
                (t: any) => 
                  (taskToSave.id && t.id === taskToSave.id) || 
                              (taskToSave.title && t.title === taskToSave.title)
              );
              
              console.log('Existing task index:', existingTaskIndex);
              
              if (existingTaskIndex !== -1) {
                console.log('Found existing task, updating it');
                // Replace the task completely with our updated version
                existingTasks[existingTaskIndex] = taskToSave;
              } else {
                console.log('Task doesn\'t exist in this lesson, adding it');
                existingTasks.push(taskToSave);
              }
              
              const updatedLesson = {
                ...existingLesson,
                tasks: existingTasks
              };
              
              console.log('Updating existing website lesson:', updatedLesson);
              return this.crudService.updateDocument<Lesson>('website-lessons', existingLesson.id, updatedLesson);
            } else {
              console.error('Could not find the website lesson to update');
              return throwError(() => new Error('Website lesson not found'));
            }
          })
        )
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.uploading = false;
            this.toastr.success('Ma\'lumotlar saqlandi!');
            console.log('Data saved successfully to website-lessons');
            
            this.getWebsiteLessons();
          },
          error: (error: any) => {
            console.error('Error saving data to website-lessons:', error);
            this.loaderService.hide();
            this.uploading = false;
            this.toastr.error('Ma\'lumotlarni saqlashda xatolik!');
          }
        });
    } else {
      // Save to regular lessons collection
      console.log('Saving task to regular lessons collection');
      
      this.crudService
        .getDocuments('lessons')
        .pipe(
          take(1),
          switchMap((lessonsData: any[]) => {
            console.log('Retrieved Lessons Data:', lessonsData);
            
            // Find the lesson in the regular lessons collection
            const regularLesson = lessonsData.find(
              (l: any) => 
                (this.lesson?.id && l.id === this.lesson.id) || 
                (this.lesson?.lessonTitle?.uz && l.lessonTitle?.uz === this.lesson.lessonTitle.uz)
            );
            
            if (regularLesson) {
              console.log('Found existing lesson in lessons collection:', regularLesson);
              
              const existingTasks = regularLesson.tasks || [];
              
              const existingTaskIndex = existingTasks.findIndex(
                (t: any) => (taskToSave.id && t.id === taskToSave.id) || 
                            (taskToSave.title && t.title === taskToSave.title)
              );
              
              if (existingTaskIndex !== -1) {
                console.log('Found existing task, updating it');
                existingTasks[existingTaskIndex] = taskToSave;
              } else {
                console.log('Task doesn\'t exist in this lesson, adding it');
                existingTasks.push(taskToSave);
              }
              
              const updatedLesson = {
                ...regularLesson,
                tasks: existingTasks
              };
              
              console.log('Updating existing regular lesson:', updatedLesson);
              return this.crudService.updateDocument<Lesson>('lessons', regularLesson.id, updatedLesson);
            } else {
              // Create a new lesson in the lessons collection
              console.log('Creating new lesson in lessons collection');
              
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
              return this.crudService.addDocument('lessons', newLesson);
            }
          })
        )
        .subscribe({
          next: () => {
            this.loaderService.hide();
            this.uploading = false;
            this.toastr.success('Ma\'lumotlar saqlandi!');
            console.log('Data saved successfully to lessons collection');
            
            this.getLessons();
          },
          error: (error: any) => {
            console.error('Error saving data to lessons collection:', error);
            this.loaderService.hide();
            this.uploading = false;
            this.toastr.error('Ma\'lumotlarni saqlashda xatolik!');
          }
        });
    }
  }

  /**
   * Clean up task data by removing temporary upload fields
   */
  private cleanupTaskData(taskData: any): void {
    console.log('Cleaning up task data before save...');
    
    // Process first class files
    if (taskData.firstBasedFiles) {
      ['taskExampleFiles', 'taskSolutionFiles'].forEach(category => {
        ['uz', 'ru', 'en'].forEach(lang => {
          if (taskData.firstBasedFiles[category]?.[lang]) {
            console.log(`Processing ${category}.${lang}: ${taskData.firstBasedFiles[category][lang].length} files`);
            
            taskData.firstBasedFiles[category][lang] = 
              taskData.firstBasedFiles[category][lang]
                // Filter out files without URLs (they weren't uploaded) and not File objects
                .filter((file: any) => file && (file.url || (file.file instanceof File)))
                // Clean up temporary fields
                .map((file: any) => {
                  // If this is a file object that still needs uploading, skip cleanup
                  if (file.file instanceof File) {
                    console.warn(`File ${file.name} in ${category}.${lang} still has a File object but no URL`);
                    return file;
                  }
                  
                  return {
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
                    // Preserve any metadata
                    category: file.category || category,
                    language: file.language || lang
                  };
                });
                
            console.log(`After cleanup: ${taskData.firstBasedFiles[category][lang].length} files in ${category}.${lang}`);
          }
        });
      });
    }
    
    // Process second class files
    if (taskData.secondBasedFiles) {
      ['taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles'].forEach(category => {
        ['uz', 'ru', 'en'].forEach(lang => {
          if (taskData.secondBasedFiles[category]?.[lang]) {
            console.log(`Processing ${category}.${lang}: ${taskData.secondBasedFiles[category][lang].length} files`);
            
            taskData.secondBasedFiles[category][lang] = 
              taskData.secondBasedFiles[category][lang]
                // Filter out files without URLs (they weren't uploaded) and not File objects
                .filter((file: any) => file && (file.url || (file.file instanceof File)))
                // Clean up temporary fields
                .map((file: any) => {
                  // If this is a file object that still needs uploading, skip cleanup
                  if (file.file instanceof File) {
                    console.warn(`File ${file.name} in ${category}.${lang} still has a File object but no URL`);
                    return file;
                  }
                  
                  return {
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
                    // Preserve any metadata
                    category: file.category || category,
                    language: file.language || lang
                  };
                });
                
            console.log(`After cleanup: ${taskData.secondBasedFiles[category][lang].length} files in ${category}.${lang}`);
          }
        });
      });
    }
    
    // Log summary
    console.log('Task data cleanup complete');
  }

  /**
   * Deduplicate files in the task data
   */
  private deduplicateTaskData(taskData: any): void {
    // Create a wrapper to use with the deduplicateFiles method
    const wrapper = {
      firstBasedFiles: taskData.firstBasedFiles,
      secondBasedFiles: taskData.secondBasedFiles
    };
    
    this.deduplicateFiles(wrapper);
    
    // Copy back the deduplicated files
    taskData.firstBasedFiles = wrapper.firstBasedFiles;
    taskData.secondBasedFiles = wrapper.secondBasedFiles;
  }
  
  /**
   * Deduplicate files across all languages
   */
  private deduplicateFiles(uploadedFiles: any): void {
    console.log('Starting file deduplication');
    let totalDuplicatesRemoved = 0;
    
    // Helper function to deduplicate files across languages
    const deduplicateCategory = (categoryPath: string, category: string) => {
      // Create maps for unique tracking - the value is the file and its priority
      // Higher priority files will replace lower priority ones
      const urlMap = new Map<string, {lang: string, index: number, file: any, priority: number}>();
      const idMap = new Map<string, {lang: string, index: number, file: any, priority: number}>();
      const pathMap = new Map<string, {lang: string, index: number, file: any, priority: number}>();
      
      // First pass: collect all files and their unique identifiers
      ['uz', 'ru', 'en'].forEach(lang => {
        const files = uploadedFiles[categoryPath]?.[category]?.[lang] || [];
        files.forEach((file: any, index: number) => {
          if (!file) return;
          
          // Calculate priority - replacements and newer files get higher priority
          let priority = 0;
          if (file.isReplacement) priority += 100; // Highest priority for replacements
          if (!file.existing) priority += 50;     // Higher priority for new uploads
          if (file.server_modified) {
            // Add a small priority based on modification time
            const modTime = new Date(file.server_modified).getTime();
            priority += modTime / 1000000000; // Normalize to a reasonable number
          }
          
          // Track by URL (primary key)
          if (file.url) {
            if (urlMap.has(file.url)) {
              const existing = urlMap.get(file.url)!;
              // Only replace if the new file has higher priority
              if (priority > existing.priority) {
                console.log(`Replacing file with URL ${file.url} with higher priority file`);
                urlMap.set(file.url, {lang, index, file, priority});
              }
            } else {
              urlMap.set(file.url, {lang, index, file, priority});
            }
          }
          
          // Track by Dropbox ID if available
          if (file.id) {
            if (idMap.has(file.id)) {
              const existing = idMap.get(file.id)!;
              // Only replace if the new file has higher priority
              if (priority > existing.priority) {
                console.log(`Replacing file with ID ${file.id} with higher priority file`);
                idMap.set(file.id, {lang, index, file, priority});
              }
            } else {
              idMap.set(file.id, {lang, index, file, priority});
            }
          }
          
          // Track by path if available
          if (file.path) {
            if (pathMap.has(file.path)) {
              const existing = pathMap.get(file.path)!;
              // Only replace if the new file has higher priority
              if (priority > existing.priority) {
                console.log(`Replacing file with path ${file.path} with higher priority file`);
                pathMap.set(file.path, {lang, index, file, priority});
              }
            } else {
              pathMap.set(file.path, {lang, index, file, priority});
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
    
    const inputs = this.fileInputs.toArray();
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

    // Find the corresponding lesson in the website-lessons collection
    const existingWebsiteLesson = this.websiteLessons.find(
      (lesson) => 
        (lesson.id && selectedLesson.id && lesson.id === selectedLesson.id) ||
        (lesson.lessonTitle?.uz && 
         selectedLesson.lessonTitle?.uz && 
         lesson.lessonTitle.uz === selectedLesson.lessonTitle.uz)
    );

    // Process the selected lesson's tasks
    const regularLessonTasks = selectedLesson.tasks || [];
    const websiteLessonTasks = existingWebsiteLesson?.tasks || [];
    
    console.log('Regular lesson tasks:', regularLessonTasks);
    console.log('Website lesson tasks:', websiteLessonTasks);

    // Normalize all tasks to ensure they have proper structure
    const normalizedRegularTasks = regularLessonTasks.map((task: Task, index: number) => ({
      id: task.id || this.crudService.generateId(),
      title: task.title || `Task ${index + 1}`,
      index: task.index || index + 1,
      createdAt: task.createdAt || new Date().toISOString(),
      firstBasedFiles: task.firstBasedFiles || {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: task.secondBasedFiles || {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      },
      source: 'regular'
    }));

    const normalizedWebsiteTasks = websiteLessonTasks.map((task: Task, index: number) => ({
      id: task.id || this.crudService.generateId(),
      title: task.title || `Website Task ${index + 1}`,
      index: task.index || index + 1,
      createdAt: task.createdAt || new Date().toISOString(),
      firstBasedFiles: task.firstBasedFiles || {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: task.secondBasedFiles || {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      },
      source: 'website'
    }));

    // Create a set of task titles to track duplicates
    const taskTitles = new Set<string>();
    
    // Combine tasks from both sources, prioritizing tasks with data
    // and avoiding duplicates based on title
    const combinedTasks: any[] = [];
    
    // Helper function to check if a task has any data
    const hasData = (task: any): boolean => {
      if (!task) return false;
      
      // Check first-based files
      const hasFirstBasedFiles = Object.values(task.firstBasedFiles || {}).some(
        (fileGroup: any) => 
          Object.values(fileGroup || {}).some(
            (files: any) => files && files.length > 0
          )
      );
      
      // Check second-based files
      const hasSecondBasedFiles = Object.values(task.secondBasedFiles || {})
        .filter((group: any) => group !== undefined)
        .some(
          (fileGroup: any) => {
            if (Array.isArray(fileGroup)) {
              return fileGroup.length > 0;
            }
            return Object.values(fileGroup || {}).some(
              (files: any) => files && files.length > 0
            );
          }
        );
      
      return hasFirstBasedFiles || hasSecondBasedFiles;
    };
    
    // First add all tasks with data (from both sources)
    // Start with website tasks since they are likely to have more complete data
    normalizedWebsiteTasks.forEach(task => {
      if (hasData(task) && task.title) {
        taskTitles.add(task.title);
        combinedTasks.push({
          ...task,
          hasData: true
        });
      }
    });
    
    // Then add regular tasks with data, avoiding duplicates
    normalizedRegularTasks.forEach(task => {
      if (hasData(task) && task.title && !taskTitles.has(task.title)) {
        taskTitles.add(task.title);
        combinedTasks.push({
          ...task,
          hasData: true
        });
      }
    });
    
    // Then add all empty tasks from both sources (first website, then regular)
    // starting with website tasks
    normalizedWebsiteTasks.forEach(task => {
      if (!hasData(task) && task.title && !taskTitles.has(task.title)) {
        taskTitles.add(task.title);
        combinedTasks.push({
          ...task,
          hasData: false
        });
      }
    });
    
    // Finally add empty regular tasks
    normalizedRegularTasks.forEach(task => {
      if (!hasData(task) && task.title && !taskTitles.has(task.title)) {
        taskTitles.add(task.title);
        combinedTasks.push({
          ...task,
          hasData: false
        });
      }
    });
    
    // Sort combined tasks - first by hasData (true first), then by index
    combinedTasks.sort((a, b) => {
      if (a.hasData !== b.hasData) {
        return a.hasData ? -1 : 1; // Tasks with data come first
      }
      // If both have same data status, sort by index
      return (a.index || 0) - (b.index || 0);
    });
    
    console.log('Combined tasks:', combinedTasks);

    // Create the lesson object with the combined tasks
    this.lesson = {
      id: selectedLesson.id || this.crudService.generateId(),
      lessonTitle: selectedLesson.lessonTitle || { uz: '', ru: '', en: '' },
      thumbnail: selectedLesson.thumbnail,
      index: selectedLesson.index,
      createdAt: selectedLesson.createdAt || new Date().toISOString(),
      tasks: combinedTasks
    };
    
    if (existingWebsiteLesson) {
      console.log('Existing website lesson found:', existingWebsiteLesson);
      this.existingLesson = existingWebsiteLesson;
      this.toastr.info("Mavjud fan topildi. Topshiriq tanlang.");
      
      if (existingWebsiteLesson.lessonTitle?.uz !== selectedLesson.lessonTitle?.uz) {
        this.lesson.lessonTitle = existingWebsiteLesson.lessonTitle;
      }
    } else {
      console.log('New lesson will be created:', this.lesson);
      this.existingLesson = null;
      this.toastr.info("Yangi fan yaratilmoqda. Topshiriq tanlang.");
    }
    
    // Automatically select the first task if available
    if (combinedTasks.length > 0) {
      // Get the first task from combined tasks
      const firstTask = combinedTasks[0];
      console.log('Automatically selecting first task:', firstTask);
      
      // Set the task and call onTaskSelect
      this.task = firstTask;
      this.onTaskSelect(firstTask);
      
      // Only show a message if this wasn't triggered by setLessonFromId
      if (!this.route.snapshot.queryParams['id']) {
        this.toastr.success('Birinchi topshiriq avtomatik tarzda tanlandi');
      }
    } else {
      this.task = null;
    }
  }

  onTaskSelect(selectedTask: Task): void {
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
        (task: Task) =>
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
      source: taskSource // Preserve source information for proper saving
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
                
                console.log(`Copied ${this.task.secondBasedFiles[category][lang].length} files to ${category}.${lang}`);
              }
            });
          });
          
          // Copy videos if they exist
          if (existingTask.secondBasedFiles?.taskVideoUrls?.length) {
            this.task.secondBasedFiles.taskVideoUrls = existingTask.secondBasedFiles.taskVideoUrls.map(
              (video: any) => ({...video})
            );
            
            console.log(`Copied ${this.task.secondBasedFiles.taskVideoUrls.length} videos`);
          }
        }
      } catch (error) {
        console.error('Error copying files from existing task:', error);
        this.toastr.error('Error loading existing task data');
      }
    }
    
    console.log('Task Files Bound:');
    console.log('Example Files:', this.task.firstBasedFiles.taskExampleFiles);
    console.log('Solution Files:', this.task.firstBasedFiles.taskSolutionFiles);
    console.log('Title Files:', this.task.secondBasedFiles.taskTitleFiles);
    console.log('Presentation Files:', this.task.secondBasedFiles.taskPresentationFiles);
    console.log('Literature Files:', this.task.secondBasedFiles.taskLiteratureFiles);
    console.log('Video URLs:', this.task.secondBasedFiles.taskVideoUrls);

    if ((selectedTask as any).hasData) {
      console.log('Using existing task with data:', this.task);
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

  /**
   * Check if a task has any uploaded files or data
   */
  hasTaskData(task: any): boolean {
    if (!task) return false;
    
    // Check first-based files
    const hasFirstBasedFiles = Object.values(task.firstBasedFiles || {}).some(
      (fileGroup: any) => 
        Object.values(fileGroup || {}).some(
          (files: any) => files && files.length > 0
        )
    );
    
    // Check second-based files
    const hasSecondBasedFiles = Object.values(task.secondBasedFiles || {})
      .filter((group: any) => group !== undefined)
      .some(
        (fileGroup: any) => {
          if (Array.isArray(fileGroup)) {
            return fileGroup.length > 0;
          }
          return Object.values(fileGroup || {}).some(
            (files: any) => files && files.length > 0
          );
        }
      );
    
    return hasFirstBasedFiles || hasSecondBasedFiles;
  }
  
  isTaskDuplicate(task: Task): boolean {
    return !!(task && (task as any).isDuplicate);
  }

  /**
   * Find lesson by ID from website-lessons collection and set it as selected
   */
  private setLessonFromId(id: string): void {
    this.loaderService.show();
    
    this.crudService.getDocuments('website-lessons')
      .pipe(
        take(1),
        map(lessons => {
          const foundLesson = (lessons as Lesson[]).find(lesson => lesson.id === id);
          if (foundLesson) {
            console.log('Found lesson by ID:', foundLesson);
            return foundLesson;
          }
          throw new Error('Lesson not found');
        })
      )
      .subscribe({
        next: (lesson) => {
          // Once website lessons are loaded, we can select this lesson
          this.existingLesson = lesson;
          
          // Wait for the regular lessons to load as well
          const checkLessonsInterval = setInterval(() => {
            if (this.lessons.length > 0) {
              clearInterval(checkLessonsInterval);
              
              // Find the corresponding lesson in the regular lessons
              const regularLesson = this.lessons.find(l => 
                l.id === lesson.id || 
                (l.lessonTitle?.uz && lesson.lessonTitle?.uz && l.lessonTitle.uz === lesson.lessonTitle.uz)
              );
              
              if (regularLesson) {
                // Select the lesson from regular lessons which will trigger onLessonSelect
                this.lesson = regularLesson;
                this.onLessonSelect(regularLesson);
                this.toastr.success('Fan va birinchi topshiriq avtomatik tarzda tanlandi');
              } else {
                // If not found in regular lessons, use the website lesson directly
                this.lesson = lesson;
                this.onLessonSelect(lesson);
                this.toastr.success('Fan va birinchi topshiriq avtomatik tarzda tanlandi');
              }
            }
          }, 500);
          
          this.loaderService.hide();
        },
        error: (err) => {
          console.error('Error finding lesson by ID:', err);
          this.loaderService.hide();
          this.toastr.error('Darsni ID bo\'yicha topib bo\'lmadi');
        }
      });
  }
}
