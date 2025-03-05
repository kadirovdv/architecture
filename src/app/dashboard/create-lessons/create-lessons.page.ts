import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-lessons-page',
  templateUrl: './create-lessons.page.html',
  styleUrls: ['./create-lessons.page.scss'],
})
export class CreateLessonsPage {
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

  constructor() {}

  //   save() {
  //     this.loaderItem = true;
  //     if (
  //       this.lessonNameUz.trim() === '' &&
  //       this.lessonNameRu.trim() === '' &&
  //       this.lessonNameEn.trim() === ''
  //     ) {
  //       this.toastr.warning('Fan nomini hamma tilda kiriting!');
  //       return;
  //     }

  //     const isLessonExists = this.lessons.some(
  //       (item) =>
  //         item.lessonTitle.uz === this.lessonNameUz &&
  //         item.lessonTitle.ru === this.lessonNameRu &&
  //         item.lessonTitle.en === this.lessonNameEn
  //     );

  //     if (isLessonExists && !this.isLessonEdit) {
  //       this.toastr.warning("Fan ro'yhatda mavjud!");
  //       this.exists = true;
  //       return;
  //     }

  //     if (!this.img) {
  //       this.toastr.warning('Rasmni tanlang!');
  //       return;
  //     }

  //     let thumbnailPath = '';

  //     const uploadFile$ = this.img
  //       ? this.dropboxService.uploadFile('/' + this.img.name, this.img)
  //       : null;

  //     const createSharedLink$ = (path: string) =>
  //       this.dropboxService.createSharedLink(path);

  //     const saveLesson$ = (thumbnailPath: string) => {
  //       const lessonData = {
  //         lessonTitle: {
  //           uz: this.lessonNameUz,
  //           ru: this.lessonNameRu,
  //           en: this.lessonNameEn,
  //         },
  //         lessonDesc: {
  //           uz: this.lessonDescriptionUz,
  //           ru: this.lessonDescriptionRu,
  //           en: this.lessonDescriptionEn,
  //         },
  //         thumbnail: thumbnailPath,
  //       };

  //       if (this.isLessonEdit && !this.exists && this.isLessonEdit) {
  //         return this.crudService.updateDocument(
  //           'lessons',
  //           this.lessonIdToEdit,
  //           lessonData
  //         );
  //       } else {
  //         return this.crudService.addDocument('lessons', {
  //           ...lessonData,
  //           createdAt: new Date().toISOString(),
  //           index: this.lessons.length + 1,
  //         });
  //       }
  //     };

  //     let request$: any = of(null);
  //     if (uploadFile$) {
  //       request$ = uploadFile$.pipe(
  //         switchMap((uploadResponse: any) => {
  //           thumbnailPath = uploadResponse.path_display;
  //           return createSharedLink$(uploadResponse.path_display);
  //         }),
  //         switchMap(() => saveLesson$(thumbnailPath))
  //       );
  //     } else {
  //       request$ = saveLesson$(thumbnailPath);
  //     }

  //     request$.subscribe({
  //       next: () => {
  //         if (this.isLessonEdit) {
  //           this.toastr.success('Fan muvaffaqiyatli yangilandi!');
  //         } else {
  //           this.toastr.success("Fan muvaffaqiyatli qo'shildi!");
  //         }
  //         this.loaderItem = false;
  //       },
  //       error: (err: any) => {
  //         this.toastr.error('Xatolik yuz berdi!');
  //         this.loaderItem = false;
  //       },
  //     });
  //   }

//   onFileSelected(event: any) {
//     const file = event.target.files[0];

//     if (file) {
//       this.img = file;
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.imgDisplay = reader.result;
//       };
//       reader.readAsDataURL(file);
//     }
//   }
}
