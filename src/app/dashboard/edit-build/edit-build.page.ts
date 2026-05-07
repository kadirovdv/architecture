import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, from, of } from 'rxjs';
import { catchError, concatMap, finalize, map, switchMap, take, tap } from 'rxjs/operators';
import type { LessonDetailDto, LessonListItemDto, LangKey } from 'src/app/shared/models/backend.dto';
import { AdminLessonsApiService } from 'src/app/shared/services/admin-lessons-api.service';
import { LessonsApiService } from 'src/app/shared/services/lessons-api.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { Videos } from 'src/app/shared/interfaces/interfaces';

type UploadCategory =
  | 'taskExampleFiles'
  | 'taskSolutionFiles'
  | 'taskTitleFiles'
  | 'taskPresentationFiles'
  | 'taskLiteratureFiles';

function isFile(obj: unknown): obj is File {
  return typeof File !== 'undefined' && obj instanceof File;
}

@Component({
  selector: 'app-edit-build-page',
  templateUrl: './edit-build.page.html',
  styleUrls: ['./edit-build.page.scss'],
})
export class EditBuildPage implements OnInit {
  loading = false;

  // Upload progress indicator
  uploading = false;
  progress = 0;
  currentUploadFile: { name: string; size?: number } | null = null;
  uploadedCount = 0;
  totalUploads = 0;

  lessons: LessonListItemDto[] = [];
  lesson: LessonDetailDto | null = null;
  existingLesson: LessonDetailDto | null = null;
  task: any = null;

  selectedLanguage: LangKey = 'uz';
  errorCategories: string[] = [];

  // Lesson thumbnail replacement
  img: File | null = null;
  imgDisplay: any = null;
  private existingThumbnailResourceIds: string[] = [];

  lessonForm = new FormGroup({
    uz: new FormControl('', [Validators.required]),
    ru: new FormControl('', [Validators.required]),
    en: new FormControl('', [Validators.required]),
    index: new FormControl(0, [Validators.min(0)]),
  });

  constructor(
    private lessonsApi: LessonsApiService,
    private adminLessonsApi: AdminLessonsApiService,
    private toastr: ToastrService,
    private loaderService: LoaderService,
    private route: ActivatedRoute,
    private location: Location,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    this.fetchLessons();
    this.route.queryParams.subscribe((params) => {
      const slug = params['slug'];
      if (slug) {
        // Preselect by slug if provided
        this.onLessonSelect({ slug } as any);
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  fetchLessons(): void {
    this.loading = true;
    this.lessonsApi
      .listLessons({ activeOnly: true })
      .pipe(take(1))
      .subscribe({
        next: (lessons) => {
          this.lessons = [...lessons].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
          this.loading = false;
        },
        error: () => {
          this.toastr.error('Fanlar yuklanmadi');
          this.lessons = [];
          this.loading = false;
        },
      });
  }

  compareLessonById = (a: any, b: any) => {
    return (a?.slug || a?.id) === (b?.slug || b?.id);
  };

  compareTaskById = (a: any, b: any) => {
    return (a?.id || '') === (b?.id || '');
  };

  getLessonTitleString(lesson: any): string {
    return lesson?.title || lesson?.slug || 'Untitled';
  }

  getTaskTitleString(task: any): string {
    if (!task) return '';
    const idx = typeof task.index === 'number' ? `${task.index}. ` : '';
    return `${idx}${task.title || 'Task'}`;
  }

  onLessonSelect(selected: LessonListItemDto | LessonDetailDto | null): void {
    this.task = null;
    this.lesson = null;
    this.existingLesson = null;
    this.errorCategories = [];
    this.img = null;
    this.existingThumbnailResourceIds = [];

    const slug = (selected as any)?.slug;
    if (!slug) return;

    this.loading = true;
    this.adminLessonsApi
      .getLessonDetail(slug)
      .pipe(take(1))
      .subscribe({
        next: (detail) => {
          this.lesson = detail;
          this.existingLesson = detail;
          this.loading = false;

          // Patch form (backend stores single title)
          this.lessonForm.patchValue({
            uz: detail.title || '',
            ru: detail.title || '',
            en: detail.title || '',
          });

          const thumbnail =
            detail.resources?.find(
              (r) => r.category === 'thumbnail' && r.mimeType?.startsWith('image/'),
            ) || detail.resources?.find((r) => r.mimeType?.startsWith('image/'));

          if (thumbnail) {
            this.imgDisplay = thumbnail.publicUrl;
            this.existingThumbnailResourceIds = detail.resources
              .filter(
                (r) =>
                  r.mimeType?.startsWith('image/') &&
                  (r.category === 'thumbnail' || r.id === thumbnail.id),
              )
              .map((r) => r.id);
          } else {
            this.imgDisplay = null;
          }
        },
        error: () => {
          this.toastr.error('Fan maʼlumotlarini yuklab bo‘lmadi');
          this.loading = false;
        },
      });
  }

  onTaskSelect(selected: any): void {
    this.task = selected || null;
    if (!this.task) return;

    if (!this.task.firstBasedFiles) {
      this.task.firstBasedFiles = {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] },
      };
    }

    if (!this.task.secondBasedFiles) {
      this.task.secondBasedFiles = {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: [],
      };
    }
  }

  hasError(category: string): boolean {
    return this.errorCategories.includes(category);
  }

  onReplaceSelected(): void {
    // File input change handler is wired in template; we read the file from the event target via template ref.
    // The template passes no args, so we rely on DOM query.
    const input = document.querySelector('input[type="file"][accept^="image"]') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    this.img = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imgDisplay = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  saveLessonChanges(): void {
    if (!this.lesson?.slug) return;
    if (this.lessonForm.invalid) {
      this.toastr.warning('Fan nomini kiriting');
      return;
    }

    const slug = this.lesson.slug;
    const title = (this.lessonForm.value.uz || '').trim();
    if (!title) {
      this.toastr.warning('Fan nomini kiriting');
      return;
    }
    
    this.loaderService.showLoader();
    
    this.adminLessonsApi
      .updateLesson(slug, { title })
      .pipe(
        switchMap(() => {
          if (!this.img) return of(null);

          const deletions$ =
            this.existingThumbnailResourceIds.length > 0
              ? forkJoin(
                  this.existingThumbnailResourceIds.map((id) =>
                    this.adminLessonsApi.deleteResource(id),
                  ),
                ).pipe(map(() => null))
              : of(null);

          return deletions$.pipe(
            switchMap(() =>
              this.adminLessonsApi.uploadLessonResource(slug, this.img as File, { category: 'thumbnail' }),
            ),
          );
        }),
        switchMap(() => this.refreshLessonDetail()),
        finalize(() => this.loaderService.hideLoader(true)),
        take(1),
      )
      .subscribe({
        next: () => this.toastr.success('Fan yangilandi'),
        error: () => this.toastr.error('Fan yangilanmadi'),
      });
  }

  onFileTypeSelect(lang: string, category: string): void {
    this.selectedLanguage = (lang as LangKey) || 'uz';

    const input = document.querySelector(
      `input[type="file"][data-category="${category}"]`,
    ) as HTMLInputElement | null;

    if (!input) return;
    input.click();
  }

  onFileSelected(event: any, category: UploadCategory, language: LangKey): void {
    const input = event?.target as HTMLInputElement;
    const files = input?.files ? Array.from(input.files) : [];
    if (!files.length) return;
    this.addFilesToTask(category, language, files);
    input.value = '';
  }

  onDirectFileSelected(file: File, category: UploadCategory, language: LangKey): void {
    if (!file) return;
    this.addFilesToTask(category, language, [file]);
  }

  private addFilesToTask(category: UploadCategory, language: LangKey, files: File[]): void {
    if (!this.task) {
      this.toastr.error('Grafik topshiriqni tanlang');
      return;
    }

    const isFirst = this.isFirstBasedCategory(category);
    const container = isFirst ? this.task.firstBasedFiles : this.task.secondBasedFiles;
    if (!container[category]) container[category] = { uz: [], ru: [], en: [] };
    if (!container[category][language]) container[category][language] = [];

    for (const f of files) {
      container[category][language].push({
        name: f.name,
        size: f.size,
        file: f,
      } as any);
    }
  }

  onRemoveFile(params: { category: string; lang: string; index: number; autoSave?: boolean }): void {
    if (!this.task) return;

    const { category, lang, index } = params;
    
    if (category === 'taskVideoUrls') {
      if (Array.isArray(this.task?.secondBasedFiles?.taskVideoUrls)) {
        this.task.secondBasedFiles.taskVideoUrls.splice(index, 1);
      }
      return;
    }
    
    const language = (lang || 'uz') as LangKey;
    const isFirst = this.isFirstBasedCategory(category);
    const container = isFirst ? this.task.firstBasedFiles : this.task.secondBasedFiles;
    const arr = container?.[category]?.[language] as any[] | undefined;
    if (!arr || index < 0 || index >= arr.length) return;

    const item = arr[index] as any;
    const resourceId = item?.id as string | undefined;

    if (resourceId && !item?.file) {
      this.loaderService.showLoader();
      this.adminLessonsApi
        .deleteResource(resourceId)
        .pipe(
          take(1),
          switchMap(() => this.refreshLessonDetail()),
          finalize(() => this.loaderService.hideLoader(true)),
        )
        .subscribe({
          next: () => this.toastr.success("Fayl o'chirildi"),
          error: () => this.toastr.error("Faylni o'chirib bo‘lmadi"),
        });
      return;
    }

    arr.splice(index, 1);
  }

  onReplaceFile(params: { category: string; lang: string; index: number; file: File }): void {
    if (!this.task) return;
    const { category, lang, index, file } = params;
    if (!file) return;

    const language = (lang || 'uz') as LangKey;
    const isFirst = this.isFirstBasedCategory(category);
    const container = isFirst ? this.task.firstBasedFiles : this.task.secondBasedFiles;
    const arr = container?.[category]?.[language] as any[] | undefined;
    if (!arr || index < 0 || index >= arr.length) return;

    const prev = arr[index] as any;
    const replacedFileId = prev?.id as string | undefined;

    arr[index] = {
            name: file.name,
            size: file.size,
      file,
      isReplacement: true,
      replacedFileId,
    } as any;
  }

  addVideo(): void {
    if (!this.lesson?.slug || !this.task?.id) {
      this.toastr.error('Fanni va topshiriqni tanlang');
      return;
    }

    const modalRef = this.modalService.open(VideoUploadComponent);
    
    modalRef.result.then((video: Videos) => {
      if (!video) return;

      this.loaderService.showLoader();
      
      const apiCalls: any[] = [];
      const langKeys: LangKey[] = ['uz', 'ru', 'en'];
      
      langKeys.forEach((lang) => {
        const url = video.url[lang]?.trim();
        const title = video.name[lang]?.trim() || undefined;
        
        if (url) {
          apiCalls.push(
            this.adminLessonsApi
              .addVideoUrl(this.lesson!.slug, this.task.id, { url, title })
              .pipe(
                catchError((error) => {
                  this.toastr.error(`Error adding ${lang} video: ${error?.message || 'Unknown error'}`);
                  return of(null);
                })
              )
          );
        }
      });

      if (apiCalls.length === 0) {
        this.toastr.warning('Hech bo\'lmaganda bitta video URL kiriting');
        this.loaderService.hideLoader(true);
        return;
      }

      forkJoin(apiCalls)
        .pipe(
          switchMap((results) => {
            const successCount = results.filter((r) => r !== null).length;
            if (successCount > 0) {
              this.toastr.success(`${successCount} ta video URL qo'shildi`);
              return this.refreshLessonDetail();
            }
            return of(null);
          }),
          take(1),
          finalize(() => this.loaderService.hideLoader(true)),
        )
        .subscribe({
          next: () => {
          },
          error: (error) => {
            this.toastr.error('Error adding videos: ' + (error?.message || 'Unknown error'));
          },
        });
    }, () => {
    });
  }

  uploadAllFilesAndSaveData(): void {
    if (!this.lesson?.slug) {
      this.toastr.error('Fanni tanlang');
      return;
    }
    if (!this.task?.id) {
      this.toastr.error('Grafik topshiriqni tanlang');
      return;
    }

    const slug = this.lesson.slug;
    const taskId = this.task.id as string;

    const pending = this.collectPendingUploads();
    if (pending.length === 0) {
      this.toastr.info('Yangi fayl tanlanmagan');
      return;
    }

    this.uploading = true; 
    this.progress = 0;
    this.currentUploadFile = null;
    this.uploadedCount = 0;
    this.totalUploads = pending.length;
    this.loaderService.showLoader();
    
    from(pending)
        .pipe(
        concatMap((item) => {
          this.currentUploadFile = { name: item.file.name, size: item.file.size };
          return this.adminLessonsApi
            .uploadTaskResource(slug, taskId, item.file, {
              category: this.mapCategory(item.category),
              language: item.language,
            })
            .pipe(
              switchMap(() => {
                if (item.replacedFileId) {
                  return this.adminLessonsApi.deleteResource(item.replacedFileId).pipe(
                    catchError(() => of(null)),
                    map(() => null),
                  );
                }
                return of(null);
              }),
              tap(() => {
                  this.uploadedCount++;
                  this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
              }),
              catchError((err) => {
                console.error('Upload error:', err);
                this.uploadedCount++;
                this.progress = Math.round((this.uploadedCount / this.totalUploads) * 100);
                return of(null);
              }),
            );
          }),
          finalize(() => {
            this.uploading = false;
            this.currentUploadFile = null;
          this.loaderService.hideLoader(true);
        }),
        switchMap(() => this.refreshLessonDetail()),
        )
        .subscribe({
        next: () => this.toastr.success('Fayllar muvaffaqiyatli yuklandi'),
        error: () => this.toastr.error('Fayllar yuklanishda xatolik'),
      });
  }

  private refreshLessonDetail() {
    if (!this.lesson?.slug) return of(null);
    const slug = this.lesson.slug;

    return this.adminLessonsApi.getLessonDetail(slug).pipe(
      tap((detail) => {
        this.lesson = detail;
        this.existingLesson = detail;

        // Update form values from backend
        this.lessonForm.patchValue({
          uz: detail.title || '',
          ru: detail.title || '',
          en: detail.title || '',
        });

        const thumbnail =
          detail.resources?.find(
            (r) => r.category === 'thumbnail' && r.mimeType?.startsWith('image/'),
          ) || detail.resources?.find((r) => r.mimeType?.startsWith('image/'));

        if (thumbnail) {
          this.imgDisplay = thumbnail.publicUrl;
          this.existingThumbnailResourceIds = detail.resources
            .filter(
              (r) =>
                r.mimeType?.startsWith('image/') &&
                (r.category === 'thumbnail' || r.id === thumbnail.id),
            )
            .map((r) => r.id);
            } else {
          this.imgDisplay = null;
          this.existingThumbnailResourceIds = [];
        }

        const currentTaskId = this.task?.id;
        if (currentTaskId) {
          this.task = detail.tasks.find((t) => t.id === currentTaskId) || null;
    } else {
      this.task = null;
    }
      }),
      map(() => null),
    );
  }

  private collectPendingUploads(): Array<{
    category: UploadCategory;
    language: LangKey;
    file: File;
    replacedFileId?: string;
  }> {
    const result: Array<{
      category: UploadCategory;
      language: LangKey;
      file: File;
      replacedFileId?: string;
    }> = [];

    if (!this.task) return result;

    const categories: UploadCategory[] = [
      'taskExampleFiles',
      'taskSolutionFiles',
      'taskTitleFiles',
      'taskPresentationFiles',
      'taskLiteratureFiles',
    ];

    for (const category of categories) {
      const isFirst = this.isFirstBasedCategory(category);
      const container = isFirst ? this.task.firstBasedFiles : this.task.secondBasedFiles;
      const bucket = container?.[category] as any;
      if (!bucket) continue;

      (['uz', 'ru', 'en'] as LangKey[]).forEach((language) => {
        const arr = (bucket?.[language] as any[]) || [];
        for (const entry of arr) {
          const file = entry?.file;
          if (!isFile(file)) continue;
          result.push({
            category,
            language,
            file,
            replacedFileId: entry?.replacedFileId,
          });
        }
      });
    }

    return result;
  }

  private isFirstBasedCategory(category: string): boolean {
    return category === 'taskExampleFiles' || category === 'taskSolutionFiles';
  }

  private mapCategory(category: UploadCategory): string {
    if (category === 'taskExampleFiles') return 'example';
    if (category === 'taskSolutionFiles') return 'solution';
    if (category === 'taskTitleFiles') return 'title';
    if (category === 'taskPresentationFiles') return 'presentation';
    return 'literature';
  }
}


