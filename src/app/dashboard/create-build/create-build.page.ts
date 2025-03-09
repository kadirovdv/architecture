import { Component, HostListener, OnInit } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { concatMap, from, Observable, tap, timer } from 'rxjs';
import { Location } from '@angular/common';
import { FileGroups, Lesson } from 'src/app/shared/interfaces/interfaces';

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  lessons: Lesson[] | any = [];
  lesson: Lesson | null = null;

  semester: any = {
    id: '',
    semesterTitle: {},
  };
  theme: any = {
    id: '',
    themeTitle: {},
  };
  loader = false;
  loading: boolean = false;

  lessonFileGroups: FileGroups | any = {};
  themeFileGroups: FileGroups | any = {};
  uploadedFilesByCategory: FileGroups | any = {};

  uploadedFiles: any[] = [];
  totalSize: number | any = 0;
  sizeExceeded: boolean = false;
  error = false;

  public themes: any[] = [];
  public files: any[] = [];
  public globalVar: any = {};
  public globalVarCompare: any = [];

  constructor(
    private crudService: CrudService,
    private dropboxService: DropboxService,
    private toastr: ToastrService,
    private navigate: Location
  ) {}

  ngOnInit(): void {
    this.getAll();
  }
  getAll() {
    this.crudService.getDocuments('globalVar').subscribe((res) => {
      this.globalVarCompare = res;
    });
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res;
      this.lessons = this.lessons.sort((a: any, b: any) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
    this.crudService.getDocuments('themes').subscribe((res) => {
      this.themes = res;
      this.themes = this.themes.sort((a, b) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
  }
  build() {
    if (!this.error) {
      const lessonExists = this.globalVarCompare.find(
        (item: any) => item.lessonTitle.uz === this.lesson?.lessonTitle?.uz
      );

      if (lessonExists) {
        let checkIfExitsInLesson = lessonExists.semesters.some(
          (item: any) =>
            item.semesterTitle.uz === this.semester.semesterTitle.uz
        );

        if (!checkIfExitsInLesson) {
          lessonExists.semesters = [
            ...lessonExists.semesters,
            ...this.globalVar.semesters,
          ];
        } else {
          lessonExists.semesters.forEach((semesterItem: any) => {
            if (
              semesterItem.semesterTitle.uz === this.semester.semesterTitle.uz
            ) {
              semesterItem.themes = [
                ...semesterItem.themes,
                ...this.globalVar.semesters[0].themes,
              ];
            }
          });
        }

        const updatedLesson = { ...lessonExists };

        this.crudService
          .updateDocument('globalVar', lessonExists.id, updatedLesson)
          .subscribe(
            () => {
              this.loading = false;
              this.toastr.success(
                'All files across categories were uploaded and updated successfully.'
              );
              this.navigate.historyGo(-1);
            },
            (e) => {
              console.log(e);
            }
          );
      } else {
        this.crudService
          .addDocument('globalVar', this.globalVar)
          .then(() => {
            this.loading = false;
            this.toastr.success(
              'All files across categories were uploaded successfully.'
            );
            this.navigate.historyGo(-1);
          })
          .catch((e) => {
            console.error(e);
          });
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: Event): void {
    if (this.loading) {
      this.toastr.warning('Iltimos kuting, fayllar yuklanmoqda!');
      $event.preventDefault();
    }
  }

  onFileSelected(event: Event, category: string, lang: string): void {
    const fileInput: any = event.target as HTMLInputElement;
    if (
      !this.lessonFileGroups[category] ||
      !this.lessonFileGroups[category][lang]
    ) {
      this.toastr.error('Invalid category or language');
      return;
    }

    for (let i = 0; i < fileInput?.files?.length; i++) {
      const file = fileInput.files[i];
      if (file.size / 1024 > 150000) {
        this.sizeExceeded = true;
        file.sizeExceeded = true;
        this.toastr.error('File size is too big');
      } else {
        this.lessonFileGroups[category][lang].push(file);
      }
    }

    this.calculateTotalSize();
  }

  removeFile(category: string, lang: string, index: number): void {
    if (
      this.lessonFileGroups[category] &&
      this.lessonFileGroups[category][lang]
    ) {
      this.lessonFileGroups[category][lang].splice(index, 1);
      this.calculateTotalSize();
      this.toastr.success('File removed successfully.');
    } else {
      this.toastr.error('Invalid category or language');
    }
  }

  replaceFile(
    event: Event,
    category: string,
    lang: string,
    index: number
  ): void {
    const fileInput: any = event.target as HTMLInputElement;
    if (fileInput?.files?.length > 0) {
      const newFile = fileInput.files[0];

      if (newFile.size / 1024 > 150000) {
        this.sizeExceeded = true;
        newFile.sizeExceeded = true;
        this.toastr.error('File size is too big');
      } else {
        this.lessonFileGroups[category][lang][index] = newFile;
        this.calculateTotalSize();
        this.toastr.success('File replaced successfully.');
      }
    }
  }

  saveAll(): void {
    this.error = false;

    if (!this.lesson?.lessonTitle) {
      this.error = true;
      this.toastr.error('Iltimos, fanlardan birni tanlang!');
      return;
    }

    if (!this.semester.semesterTitle) {
      this.error = true;
      this.toastr.error('Iltimos, semestrlardan birni tanlang!');
      return;
    }

    if (!this.theme.themeTitle) {
      this.error = true;
      this.toastr.error('Iltimos, mavzulardan birni tanlang!');
      return;
    }

    this.loading = true;
    const categoryStatus: any = {};

    // Count total files for each category and language
    for (const category in this.lessonFileGroups) {
      categoryStatus[category] = {};
      for (const lang in this.lessonFileGroups[category]) {
        const files = this.lessonFileGroups[category][lang].filter(
          (file: any) => file !== null
        );
        categoryStatus[category][lang] = {
          total: files.length,
          uploaded: 0,
        };

        // Check if any category-language combination is empty
        // if (files.length === 0) {
        //   this.error = true;
        //   this.toastr.error(`Iltimos, ${category} (${lang}) kategoriyasidan fayllarni tanlang!`);
        //   return;
        // }
      }
    }

    const uploadObservables: any = [];

    for (const category in this.lessonFileGroups) {
      for (const lang in this.lessonFileGroups[category]) {
        this.lessonFileGroups[category][lang]
          .filter((file: any) => file !== null)
          .forEach((file: any) => {
            uploadObservables.push(
              this.dropboxService.uploadFile('/' + file.name, file).pipe(
                tap((response) => {
                  console.log(this.uploadedFilesByCategory[category][lang]);
                  this.uploadedFilesByCategory[category][lang].push(response);
                  categoryStatus[category][lang].uploaded++;
                  if (
                    categoryStatus[category][lang].uploaded ===
                    categoryStatus[category][lang].total
                  ) {
                    this.toastr.success(
                      `All files in ${category} (${lang}) uploaded successfully.`
                    );
                  }
                })
              )
            );
          });
      }
    }

    from(uploadObservables)
      .pipe(
        concatMap((observable: any, index) => {
          const delayTime = index === 0 ? 0 : 1000;
          return timer(delayTime).pipe(concatMap(() => observable));
        })
      )
      .subscribe({
        next: (results: any) => {
          this.uploadedFiles.push(results);
          this.dropboxService
            .createSharedLink(results.path_display)
            .subscribe(() => {});
        },
        complete: () => {
          this.globalVar = {
            lessonTitle: this.lesson?.lessonTitle,
            thumbnail: this.lesson?.thumbnail,
            id: this.lesson?.id,
            createdAt: new Date().toISOString(),
            semesters: [
              {
                semesterTitle: this.semester.semesterTitle,
                id: this.semester.id,
                createdAt: new Date().toISOString(),
                themes: [
                  {
                    themeTitle: this.theme.themeTitle,
                    id: this.theme.id,
                    files: this.uploadedFilesByCategory,
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          };
          setTimeout(() => {
            this.build();
          }, 1000);
        },
        error: (error) => {
          console.error(error);
          this.loading = false;
          this.toastr.error('An error occurred during file upload.');
        },
      });
  }

  formatFileSize(sizeInBytes: number): string {
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;

    if (sizeInMB >= 1) {
      return `${sizeInMB.toFixed(2)} MB`;
    } else {
      return `${sizeInKB.toFixed(2)} KB`;
    }
  }

  calculateTotalSize(): void {
    this.totalSize = 0;
    for (const category in this.lessonFileGroups) {
      for (const lang in this.lessonFileGroups[category]) {
        this.lessonFileGroups[category][lang].forEach((file: any) => {
          if (file) {
            this.totalSize += file.size;
          }
        });
      }
    }
  }

  helperKeys(group: any): string[] {
    return Object.keys(group);
  }

  removeAllFromGroup(category: string, lang: string): void {
    this.lessonFileGroups[category][lang] = [null];
  }

  goBack() {
    this.navigate.historyGo(-1);
  }

  changeObjectKeyName(group: any): any {
    switch (group) {
      case 'materials':
        return 'Nazariy malumotlar';
      case 'presentations':
        return 'Prezintatsiyalar';
      case 'discussions':
        return 'Grafik topshiriq variantlari';
      case 'videos':
        return 'Video darslar';
      default:
        return group;
    }
  }

  getLessons() {
    console.log(this.lesson);
  }
}
