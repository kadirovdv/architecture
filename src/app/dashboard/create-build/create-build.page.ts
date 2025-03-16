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
import { concatMap, delay, from, Observable, tap, timer } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VideoUploadComponent } from './video-upload/video-upload.component';

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  @ViewChildren('hiddenInput') hiddenInputs!: QueryList<ElementRef>;
  lessons: Lesson[] = [];
  lesson: Lesson | null = null;
  task: Task | any = null;
  uploadedFilesByCategory: any = {};
  loading: boolean = false;
  uploadedFiles: any;
  selectedLanguage: string = 'uz';
  currentCategory: string = '';

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private modalService: NgbModal,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.getLessons();
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

    // Check file sizes
    const oversizedFiles = files.filter(
      (file) => file.size / (1024 * 1024) > 150
    ); // 150MB limit
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

  uploadAllFilesAndSaveData(): void {
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
          // Use the actual File object stored in the file property
          const actualFile = fileItem.file;
          const filePath = `/${fileItem.name}`;
          
          const upload$ = this.dropboxService.uploadFile(filePath, actualFile).pipe(
            tap((response: any) => {
              const categoryArray = categoryPath.split('.');
              let target: any = uploadedFiles;

              for (const key of categoryArray) {
                target = target[key];
              }

              // Store the response metadata without the file object
              target[lang].push({
                name: fileItem.name,
                size: fileItem.size,
                url: response.url || '',
                path: response.path || '',
                id: response.id || ''
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
            }),
            delay(1000 * index)
          );
          uploadObservables.push(upload$);
        });
      }
    };

    // Upload all files except videos
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
        },
        error: (err) => {
          console.error('Error uploading files:', err);
          this.toastr.error('Fayllar yuklanishda xatolik');
          this.loading = false;
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
    this.selectedLanguage = lang;
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
}
