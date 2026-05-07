import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of, switchMap, take, map } from 'rxjs';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { LessonsApiService } from 'src/app/shared/services/lessons-api.service';
import { AdminLessonsApiService } from 'src/app/shared/services/admin-lessons-api.service';
import type { LessonDetailDto, LessonListItemDto } from 'src/app/shared/models/backend.dto';

interface LessonLangs {
  uz: string;
  ru: string;
  en: string;
}

@Component({
  selector: 'app-create-lessons-page',
  templateUrl: './create-lessons.page.html',
  styleUrls: ['./create-lessons.page.scss'],
})
export class CreateLessonsPage implements OnInit, OnDestroy {
  img: File | null = null;
  imgDisplay: any = null;
  exists: boolean = false;
  loaderItem: boolean = false;
  isLessonEdit: boolean = false;
  lessonSlugToEdit: string = '';
  lessons: LessonListItemDto[] = [];
  private existingThumbnailResourceIds: string[] = [];
  loader: boolean = false;

  showHelper = {
    uz: false,
    ru: false,
    en: false,
  };

  lessonList: Array<LessonLangs> = [
    {
      uz: 'GEOMETRIK CHIZMACHILIK',
      ru: 'ГЕОМЕТРИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'GEOMETRICAL DRAWING',
    },
    {
      uz: 'PROYEKSION CHIZMACHILIK',
      ru: 'ПРОЕКЦИОННОЕ ЧЕРЧЕНИЕ',
      en: 'PROJECTION DRAWING',
    },
    {
      uz: 'CHIZMA GEOMETRIYA',
      ru: 'ГЕОМЕТРИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'GEOMETRICAL DRAWING',
    },
    {
      uz: 'PERSPЕKTIVA',
      ru: 'ПЕРСПЕКТИВА',
      en: 'PERSPECTIVE',
    },
    {
      uz: 'MASHINASOZLIK CHIZMACHILIGI',
      ru: 'МАШИНОСТРОИТЕЛЬНОЕ ЧЕРЧЕНИЕ',
      en: 'MECHANICAL DRAWING',
    },
    {
      uz: 'TEXNIK CHIZMACHILIK',
      ru: 'ТЕХНИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'TECHNICAL DRAWING',
    },
    {
      uz: 'ARXITEKTURA VA QURILISH CHIZMACHILIGI',
      ru: 'АРХИТЕКТУРНО - СТРОИТЕЛЬНОЕ ЧЕРЧЕНИЕ',
      en: 'ARCHITECTURE AND CONSTRUCTION DRAWING',
    },
    {
      uz: 'TOPOGRAFIK CHIZMACHILIK',
      ru: 'ТОПОГРАФИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'TOPOGRAPHICAL DRAWING',
    },
    {
      uz: 'KOMPYUTER GRAFIKASI',
      ru: 'КОМПЬЮТЕРНАЯ ГРАФИКА',
      en: 'COMPUTER GRAPHICS',
    },
  ];

  filteredLessonList: Array<LessonLangs> = this.lessonList;

  public createLessonsForm = new FormGroup({
    uz: new FormControl('', [
      Validators.required,
      Validators.pattern("^[a-zA-Z -']+"),
    ]),
    ru: new FormControl('', [
      Validators.required,
      Validators.pattern("^[а-яА-ЯёЁ -']+"),
    ]),
    en: new FormControl('', [
      Validators.required,
      Validators.pattern("^[a-zA-Z -']+"),
    ]),
  });

  constructor(
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private router: Router,
    private route: ActivatedRoute,
    private lessonsApi: LessonsApiService,
    private adminLessonsApi: AdminLessonsApiService
  ) {}

  ngOnInit(): void {
    this.lessonsApi
      .listLessons({ activeOnly: true })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.lessons = [...res].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

      // Check if we're in edit mode using query params
          this.route.queryParams.subscribe((params) => {
            const slug = params['slug'];
            if (!slug) return;

          this.isLessonEdit = true;
            this.lessonSlugToEdit = slug;

            this.adminLessonsApi
              .getLessonDetail(slug)
              .pipe(take(1))
              .subscribe({
                next: (detail: LessonDetailDto) => {
            this.createLessonsForm.patchValue({
                    uz: detail.title || '',
                    ru: detail.title || '',
                    en: detail.title || '',
            });
            
                  // Prefer explicit thumbnail category; fallback to any image resource
                  const thumbnail =
                    detail.resources?.find(
                      (r) => r.category === 'thumbnail' && r.mimeType?.startsWith('image/')
                    ) ||
                    detail.resources?.find((r) => r.mimeType?.startsWith('image/'));

                  if (thumbnail) {
                    this.imgDisplay = thumbnail.publicUrl;
                    this.existingThumbnailResourceIds = detail.resources
                      .filter(
                        (r) =>
                          r.mimeType?.startsWith('image/') &&
                          (r.category === 'thumbnail' || r.id === thumbnail.id)
                      )
                      .map((r) => r.id);
                  }
                },
                error: () => {
                  this.toastr.error('Fan maʼlumotlarini yuklab bo‘lmadi');
                },
              });
          });
        },
        error: () => {
          this.lessons = [];
        },
    });
  }

  ngOnDestroy(): void {
    // this.loadingService.hide();
    // this.img = null;
    // this.imgDisplay = null;
    // this.exists = false;
    // this.loaderItem = false;
    // this.isLessonEdit = false;
    // this.lessonIdToEdit = '';
    // this.lessons = [];
    // this.loader = false;
    // this.createLessonsForm.reset();
  }

  save() {
    this.loadingService.show();

    if (
      this.createLessonsForm.value.uz?.trim() === '' &&
      this.createLessonsForm.value.ru?.trim() === '' &&
      this.createLessonsForm.value.en?.trim() === ''
    ) {
      this.toastr.warning('Fan nomini hamma tilda kiriting!');
      return;
    }

    const title = (this.createLessonsForm.value.uz || '').trim();
    if (!title) {
      this.toastr.warning('Fan nomini kiriting!');
      this.loadingService.hide();
      return;
    }

    // Keep RU/EN inputs filled for UI consistency, but backend stores a single title.
    if (!this.createLessonsForm.value.ru) this.createLessonsForm.get('ru')?.setValue(title);
    if (!this.createLessonsForm.value.en) this.createLessonsForm.get('en')?.setValue(title);

    const slug = this.isLessonEdit ? this.lessonSlugToEdit : this.slugify(title);

    const upsert$ = this.isLessonEdit
      ? this.adminLessonsApi.updateLesson(slug, { title })
      : this.adminLessonsApi.createLesson({ slug, title, active: true, language: 'UZ' });

    upsert$
      .pipe(
        switchMap(() => {
          if (!this.img) return of(null);

          // If editing and we have old thumbnails, remove them before uploading the new one.
          const deletions$ =
            this.isLessonEdit && this.existingThumbnailResourceIds.length
              ? forkJoin(
                  this.existingThumbnailResourceIds.map((id) =>
                    this.adminLessonsApi.deleteResource(id),
                  ),
                ).pipe(map(() => null))
              : of(null);

          return deletions$.pipe(
            switchMap(() =>
              this.adminLessonsApi.uploadLessonResource(slug, this.img as File, {
                category: 'thumbnail',
              })
            )
          );
        })
      )
      .subscribe({
      next: () => {
          this.toastr.success(this.isLessonEdit ? 'Fan muvaffaqiyatli yangilandi!' : "Fan muvaffaqiyatli qo'shildi!");
        this.loadingService.hide();
        this.router.navigate(['/dashboard/lessons']);
      },
        error: () => {
        this.toastr.error('Xatolik yuz berdi!');
        this.loadingService.hide();
      },
    });
  }

  findLesson(event: any, lang: 'uz' | 'ru' | 'en') {
    const searchValue = event.target.value.toLowerCase();
    this.filteredLessonList = this.lessonList.filter((lesson) =>
      lesson[lang].toLowerCase().includes(searchValue)
    );
  }

  selectLesson(lesson: LessonLangs, lang: 'uz' | 'ru' | 'en') {
    this.createLessonsForm.get(lang)?.setValue(lesson[lang]);
    this.showHelper[lang] = false;
  }

  objectKeys(obj: any) {
    return Object.keys(obj);
  }

  openHelper(lang: 'uz' | 'ru' | 'en') {
    this.showHelper[lang] = true;
  }

  closeHelper(lang: 'uz' | 'ru' | 'en') {
    setTimeout(() => {
      this.showHelper[lang] = false;
    }, 200);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.img = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imgDisplay = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  private slugify(input: string): string {
    const base = input
      .toLowerCase()
      .trim()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (base) return base;
    return `lesson-${Date.now()}`;
  }
}
