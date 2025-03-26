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
import { concatMap, delay, from, Observable, tap, timer, forkJoin, switchMap } from 'rxjs';
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
    return this.websiteLessons.some(websiteLesson => websiteLesson.lessonTitle?.uz === lesson.lessonTitle?.uz);
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

  private validateUpload(): { isValid: boolean; message: string; errorCategories?: string[] } {
    const errorCategories: string[] = [];

    if (!this.lesson) {
      return { isValid: false, message: 'Iltimos, fanni tanlang!' };
    }

    if (!this.task) {
      return { isValid: false, message: 'Iltimos, topshiriqni tanlang!' };
    }

    if (!this.task.title || !this.task.id) {
      return { isValid: false, message: 'Topshiriq ma\'lumotlari to\'liq emas!' };
    }

    if (!this.task.firstBasedFiles) {
      errorCategories.push('taskExampleFiles', 'taskSolutionFiles');
      return { 
        isValid: false, 
        message: 'Birinchi bo\'lim fayllari topilmadi!',
        errorCategories 
      };
    }

    if (!this.task.secondBasedFiles) {
      errorCategories.push('taskTitleFiles', 'taskPresentationFiles', 'taskLiteratureFiles', 'taskVideoUrls');
      return { 
        isValid: false, 
        message: 'Ikkinchi bo\'lim fayllari topilmadi!',
        errorCategories 
      };
    }

    const hasFirstBasedFiles = Object.values(this.task.firstBasedFiles).some(
      (fileGroup: any) =>
        Object.values(fileGroup || {}).some((files: any) => files && files.length > 0)
    );

    const hasSecondBasedFiles = Object.values(this.task.secondBasedFiles).some(
      (fileGroup: any) =>
        fileGroup && 
        (Array.isArray(fileGroup) ? fileGroup.length > 0 : 
         Object.values(fileGroup).some((files: any) => files && files.length > 0))
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
        message: 'Kamida bitta fayl yoki video qo\'shing!',
        errorCategories 
      };
    }

    const checkFileSizes = (files: any, category: string): boolean => {
      if (!files) return true;
      
      if (Array.isArray(files)) {
        if (files.some(file => file.size && file.size / (1024 * 1024) > 150)) {
          errorCategories.push(category);
          return false;
        }
        return true;
      }

      const hasOversizedFiles = Object.values(files).some((langFiles: any) =>
        langFiles ? langFiles.some((file: any) => file.size && file.size / (1024 * 1024) > 150) : false
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
        message: 'Ba\'zi fayllar hajmi 150MB dan oshib ketdi!',
        errorCategories 
      };
    }

    return { isValid: true, message: '' };
  }

  uploadAllFilesAndSaveData(): void {
    const validation = this.validateUpload();
    // if (!validation.isValid) {
    //   this.toastr.error(validation.message);
      
    //   if (validation.errorCategories) {
    //     this.errorCategories = validation.errorCategories;
    //     setTimeout(() => {
    //       this.errorCategories = [];
    //     }, 400);
    //   }
    //   return;
    // }

    this.loaderService.show();
    const uploadedFiles: Task = {
      title: this.task.title,
      id: this.task.id,
      index: this.task.index,
      createdAt: this.task.createdAt,
      firstBasedFiles: {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] },
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: this.task.secondBasedFiles?.taskVideoUrls || [],
      },
    };

    const uploadObservables: Observable<any>[] = [];
    const categoryStatus: Record<
      string,
      Record<string, { total: number; uploaded: number }>
    > = {};

    const uploadCategoryFiles = (categoryPath: string, categoryObj: any) => {
      for (const lang in categoryObj) {
        const files = categoryObj[lang].filter((file: any) => file !== null && file.file);
        if (!categoryStatus[categoryPath]) categoryStatus[categoryPath] = {};
        categoryStatus[categoryPath][lang] = {
          total: files.length,
          uploaded: 0,
        };

        files.forEach((fileItem: any, index: number) => {
          const actualFile = fileItem.file;
          const filePath = `/${fileItem.name}`;
          
          const upload$ = this.dropboxService.uploadFile(filePath, actualFile).pipe(
            switchMap((response: any) => {
              const categoryArray = categoryPath.split('.');
              let target: any = uploadedFiles;

              for (const key of categoryArray) {
                target = target[key];
              }

              return this.dropboxService.createSharedLink(response.path_display).pipe(
                tap((link: any) => {
                  target[lang].push({
                    name: fileItem.name,
                    size: fileItem.size,
                    url: link || '',
                    path: response.path_display || '',
                    id: response || ''
                  });
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

    if (uploadObservables.length === 0) {
      this.saveToFirebase(uploadedFiles);
      return;
    }

    from(uploadObservables)
      .pipe(
        concatMap((obs, index) =>
          timer(index * 1000).pipe(concatMap(() => obs))
        )
      )
      .subscribe({
        next: () => {
          console.log('File uploaded successfully');
        },
        complete: () => {
          this.toastr.success('Fayllar muvaffaqiyatli yuklandi');
          this.saveToFirebase(uploadedFiles);
          this.loaderService.hide();
        },
        error: (err) => {
          console.error('Error uploading files:', err);
          this.toastr.error('Fayllar yuklanishda xatolik');
          this.loaderService.hide();
        },
      });
  }

  private saveToFirebase(uploadedFiles: Task): void {
    const newLesson: Lesson = {
      lessonTitle: {
        uz: this.lesson?.lessonTitle?.uz || '',
        ru: this.lesson?.lessonTitle?.ru || '',
        en: this.lesson?.lessonTitle?.en || '',
      },
      tasks: [uploadedFiles],
      id: this.task.id,
      thumbnail: this.lesson?.thumbnail || '',
      index: this.lesson?.index || 0,
      createdAt: this.lesson?.createdAt || new Date().toISOString(),
    };

    this.crudService.addDocument<Lesson>('website-lessons', newLesson)
      .subscribe({
        next: () => {
          this.toastr.success('Fan muvaffaqiyatli qo\'shildi!');
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating lesson:', error);
          this.toastr.error('Fanni qo\'shishda xatolik yuz berdi!');
          this.loading = false;
        },
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
    } else if (this.isSecondClassFileCategory(category)) {
      if (this.task.secondBasedFiles[category]?.[lang]) {
        this.task.secondBasedFiles[category][lang][index] = newFile;
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
  }
}
