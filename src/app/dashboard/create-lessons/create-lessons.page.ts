import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { Lesson } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { LoadingService } from 'src/app/shared/services/loading.service';

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
  lessonIdToEdit: string = '';
  lessons: any[] = [];
  loader: boolean = false;

  showHelper = {
    uz: false,
    ru: false,
    en: false
  };

  lessonList: Array<LessonLangs> = [
    {
      uz: 'CHIZMA GEOMETRIYA VA MUHANDISLIK GRAFIKASI',
      ru: 'НАЧЕРТАТЕЛЬНАЯ ГЕОМЕТРИЯ И ИНЖЕНЕРНАЯ ГРАФИКА',
      en: 'DESCRIPTIVE GEOMETRY AND ENGINEERING GRAPHICS',
    },
    {
      uz: 'PERSPEKTIVA',
      ru: 'ПЕРСПЕКТИВА',
      en: 'PERSPECTIVE',
    },
    {
      uz: 'GEOMETRIK CHIZMACHILIK',
      ru: 'ГЕОМЕТРИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'GEOMETRICAL DRAWING'
    },
    {
      uz: 'PROYEKSION CHIZMACHILIK',
      ru: 'ПРОЕКЦИОННОЕ ЧЕРЧЕНИЕ',
      en: 'PROJECTION DRAWING'
    },
    {
      uz: 'MASHINASOZLIK CHIZMACHILIGI',
      ru: 'МАШИНОСТРОИТЕЛЬНОЕ ЧЕРЧЕНИЕ',
      en: 'MECHANICAL DRAWING'
    },
    {
      uz: 'TEXNIK CHIZMACHILIK',
      ru: 'ТЕХНИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'TECHNICAL DRAWING'
    },
    {
      uz: 'TOPOGRAFIK CHIZMACHILIK',
      ru: 'ТОПОГРАФИЧЕСКОЕ ЧЕРЧЕНИЕ',
      en: 'TOPOGRAPHICAL DRAWING'
    },
    {
      uz: 'ARXITEKTURA VA QURILISH CHIZMACHILIGI',
      ru: 'АРХИТЕКТУРНО- СТРОИТЕЛЬНОЕ ЧЕРЧЕНИЕ',
      en: 'ARCHITECTURE AND CONSTRUCTION DRAWING'
    },
    {
      uz: 'KOMPYUTER GRAFIKASI',
      ru: 'КОМПЬЮТЕРНАЯ ГРАФИКА',
      en: 'COMPUTER GRAPHICS'
    }
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
    private dropboxService: DropboxService,
    private crudService: CrudService,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res as Lesson[];
      this.lessons = this.lessons.sort((a: Lesson, b: Lesson) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
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

    const isLessonExists = this.lessons.some(
      (item) =>
        item.lessonTitle.uz === this.createLessonsForm.value.uz &&
        item.lessonTitle.ru === this.createLessonsForm.value.ru &&
        item.lessonTitle.en === this.createLessonsForm.value.en
    );

    if (isLessonExists && !this.isLessonEdit) {
      this.toastr.warning("Fan ro'yhatda mavjud!");
      this.exists = true;
      return;
    }

    if (!this.img) {
      this.toastr.warning('Rasmni tanlang!');
      return;
    }

    let thumbnailPath = '';

    const uploadFile$ = this.img
      ? this.dropboxService.uploadFile('/' + this.img.name, this.img)
      : null;

    const createSharedLink$ = (path: string) =>
      this.dropboxService.createSharedLink(path);

    const saveLesson$ = (thumbnailPath: string) => {
      const lessonData = {
        lessonTitle: {
          uz: this.createLessonsForm.value.uz,
          ru: this.createLessonsForm.value.ru,
          en: this.createLessonsForm.value.en,
        },
        thumbnail: thumbnailPath,
      };

      if (this.isLessonEdit && !this.exists && this.isLessonEdit) {
        return this.crudService.updateDocument(
          'lessons',
          this.lessonIdToEdit,
          lessonData
        );
      } else {
        return this.crudService.addDocument('lessons', {
          ...lessonData,
          createdAt: new Date().toISOString(),
          index: this.lessons.length + 1,
        });
      }
    };

    let request$: any = of(null);
    if (uploadFile$) {
      request$ = uploadFile$.pipe(
        switchMap((uploadResponse: any) => {
          thumbnailPath = uploadResponse.path_display;
          return createSharedLink$(uploadResponse.path_display);
        }),
        switchMap(() => saveLesson$(thumbnailPath))
      );
    } else {
      request$ = saveLesson$(thumbnailPath);
    }

    request$.subscribe({
      next: () => {
        if (this.isLessonEdit) {
          this.toastr.success('Fan muvaffaqiyatli yangilandi!');
        } else {
          this.toastr.success("Fan muvaffaqiyatli qo'shildi!");
        }
        this.loadingService.hide();
        this.router.navigate(['/dashboard/lessons']);
      },
      error: (err: any) => {
        this.toastr.error('Xatolik yuz berdi!');
        this.loadingService.hide();
      },
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      this.img = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imgDisplay = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  findLesson(event: any, lang: 'uz' | 'ru' | 'en') {
    const searchValue = event.target.value.toLowerCase();
    this.filteredLessonList = this.lessonList.filter(lesson => 
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
}
