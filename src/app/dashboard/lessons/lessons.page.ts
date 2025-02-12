import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { of, switchMap } from 'rxjs';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
})
export class LessonsPage {
  lessons: any[] = [];
  lessonNameUz: string = '';
  lessonNameRu: string = '';
  lessonNameEn: string = '';

  lessonDescriptionUz: string = '';
  lessonDescriptionRu: string = '';
  lessonDescriptionEn: string = '';

  isNewLesson: boolean = false;
  isLessonEdit: boolean = false;
  lessonIdToEdit: string = '';
  loader: boolean = false;
  loaderItem: boolean = false;
  loaderImg: boolean = false;
  exists: boolean = false;
  imgDisplay: any = '';
  img: any = null;
  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.getLessons();
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && this.isNewLesson) {
        this.save();
      }
    });
  }

  getLessons() {
    this.loader = true;
    this.lessons = [];
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res;
      this.loader = false;
      this.lessons = this.lessons.sort((a, b) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
  }

  addSeason() {
    this.isNewLesson = true;
  }

  cancel() {
    this.isNewLesson = false;
    this.lessonIdToEdit = '';
    this.lessonNameUz = '';
    this.lessonNameRu = '';
    this.lessonNameEn = '';
    this.lessonDescriptionUz = '';
    this.lessonDescriptionRu = '';
    this.lessonDescriptionEn = '';
    this.isLessonEdit = false;
    this.imgDisplay = null;
    this.img = null;
    this.exists = false;
    this.loaderImg = false;
  }

  deleteLesson(id: string) {
    this.loader = true;
    this.crudService.deleteDocument('lessons', id).then((res) => {
      this.getLessons();
      this.loader = false;
    });
  }

  editLesson(id: string, name: any) {
    this.loaderImg = true;
    this.isLessonEdit = true;
    this.lessonIdToEdit = id;
    this.lessonNameUz = name.lessonTitle.uz;
    this.lessonNameRu = name.lessonTitle.ru;
    this.lessonNameEn = name.lessonTitle.en;
    this.lessonDescriptionUz = name.lessonDesc.uz;
    this.lessonDescriptionRu = name.lessonDesc.ru;
    this.lessonDescriptionEn = name.lessonDesc.en;
    this.dropboxService.getThumbnail(name.thumbnail).subscribe((res) => {
      this.imgDisplay = this.sanitizer.bypassSecurityTrustUrl(
        URL.createObjectURL(res)
      );
      this.loaderImg = false;
    });
  }

  save() {
    this.loaderItem = true;
    if (
      this.lessonNameUz.trim() === '' &&
      this.lessonNameRu.trim() === '' &&
      this.lessonNameEn.trim() === ''
    ) {
      this.toastr.warning('Fan nomini hamma tilda kiriting!');
      return;
    }

    const isLessonExists = this.lessons.some(
      (item) =>
        item.lessonTitle.uz === this.lessonNameUz &&
        item.lessonTitle.ru === this.lessonNameRu &&
        item.lessonTitle.en === this.lessonNameEn
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
          uz: this.lessonNameUz,
          ru: this.lessonNameRu,
          en: this.lessonNameEn,
        },
        lessonDesc: {
          uz: this.lessonDescriptionUz,
          ru: this.lessonDescriptionRu,
          en: this.lessonDescriptionEn,
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
        this.resetForm();
        this.loaderItem = false;
      },
      error: (err: any) => {
        this.toastr.error('Xatolik yuz berdi!');
        this.loaderItem = false;
      },
    });
  }

  resetForm() {
    this.isNewLesson = false;
    this.lessonNameUz = '';
    this.lessonNameRu = '';
    this.lessonNameEn = '';
    this.img = null;
    this.getLessons();
    this.isLessonEdit = false;
    this.exists = false;
    this.lessonIdToEdit = '';
    this.lessonDescriptionUz = '';
    this.lessonDescriptionRu = '';
    this.lessonDescriptionEn = '';
    this.imgDisplay = null;
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
}
