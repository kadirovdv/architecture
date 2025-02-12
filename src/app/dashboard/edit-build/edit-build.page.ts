import { Component, HostListener, OnInit } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { concatMap, from, tap, timer } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-edit-build',
  templateUrl: './edit-build.page.html',
  styleUrls: ['./edit-build.page.scss'],
})
export class EditBuildPage implements OnInit {
  lessonIdToEdit: any;
  lesson: any = {
    id: '',
    lessonTitle: {},
  };
  semester: any = {
    id: '',
    semesterTitle: {},
    themes: [],
  };
  theme: any = {
    id: '',
    themeTitle: {},
    files: {},
  };

  newSemesterTitle: any = {
    uz: '',
    ru: '',
    en: '',
  };

  newThemeTitle: any = {
    uz: '',
    ru: '',
    en: '',
  };

  loader = false;
  loading: boolean = false;
  exists: boolean = false;
  fileReplaced: boolean = false;
  fileGroups: any = {
    materials: {
      ru: [],
      uz: [],
      en: [],
    },
    presentations: {
      ru: [],
      uz: [],
      en: [],
    },
    discussions: {
      ru: [],
      uz: [],
      en: [],
    },
    videos: {
      ru: [],
      uz: [],
      en: [],
    },
  };
  uploadedFilesByCategory: any = {
    materials: {
      ru: [],
      uz: [],
      en: [],
    },
    presentations: {
      ru: [],
      uz: [],
      en: [],
    },
    discussions: {
      ru: [],
      uz: [],
      en: [],
    },
    videos: {
      ru: [],
      uz: [],
      en: [],
    },
  };
  uploadedFiles: any[] = [];
  totalSize: number | any = 0;
  sizeExceeded: boolean = false;

  public globalVarHold: any = [];

  constructor(
    private crudService: CrudService,
    private dropboxService: DropboxService,
    private toastr: ToastrService,
    private activatedRoute: ActivatedRoute,
    private navigate: Location
  ) {}

  ngOnInit(): void {
    this.getAll();
  }
  getAll() {
    this.loading = true;
    this.activatedRoute.params.subscribe((params) => {
      this.lessonIdToEdit = params['id'];
      this.crudService
        .getDocumentById('globalVar', this.lessonIdToEdit)
        .subscribe((res: any) => {
          this.globalVarHold = res;
          this.lesson.id = this.globalVarHold?.id;
          this.semester = this.globalVarHold?.semesters[0];
          this.theme = this.semester.themes[0];

          Object.keys(this.globalVarHold?.lessonTitle).forEach((key: any) => {
            this.lesson.lessonTitle[key] = this.globalVarHold?.lessonTitle[key];
          });
          Object.keys(this.globalVarHold?.semesters[0].semesterTitle).forEach(
            (key: any) => {
              this.semester.semesterTitle[key] =
                this.globalVarHold?.semesters[0].semesterTitle[key];
              this.newSemesterTitle[key] =
                this.globalVarHold?.semesters[0].semesterTitle[key];
            }
          );

          Object.keys(this.theme.themeTitle).forEach((key: any) => {
            this.theme.themeTitle[key] =
              this.semester.themes[0].themeTitle[key];
            this.newThemeTitle[key] = this.semester.themes[0].themeTitle[key];
          });
          Object.keys(this.theme.files).forEach((key) => {
            this.fileGroups[key] = this.theme.files[key];
          });

          this.calculateTotalSize();
          this.loading = false;
        });
    });
  }

  build() {
    this.globalVarHold.lessonTitle = this.lesson.lessonTitle;
    if (!this.exists) {
      console.log(this.globalVarHold);
      this.crudService
        .updateDocument('globalVar', this.lessonIdToEdit, this.globalVarHold)
        .then(() => {
          this.loading = false;
          this.toastr.success(
            'All files across categories were uploaded and updated successfully.'
          );
          this.uploadedFiles = [];
          this.uploadedFilesByCategory = {
            materials: [],
            presentations: [],
            discussions: [],
            videos: [],
          };
          this.sizeExceeded = false;
          this.fileGroups = {
            materials: {
              ru: [],
              uz: [],
              en: [],
            },
            presentations: {
              ru: [],
              uz: [],
              en: [],
            },
            discussions: {
              ru: [],
              uz: [],
              en: [],
            },
            videos: {
              ru: [],
              uz: [],
              en: [],
            },
          };
          this.totalSize = 0;
        })
        .catch((e) => {
          console.error(e);
        });
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
    if (!this.fileGroups[category] || !this.fileGroups[category][lang]) {
      this.toastr.error('Invalid category or language');
      return;
    }

    for (let i = 0; i < fileInput?.files?.length; i++) {
      const file = fileInput.files[i];
      file.customType = 'file';
      if (file.size / 1024 > 150000) {
        this.sizeExceeded = true;
        file.sizeExceeded = true;
        this.toastr.error('File size is too big');
      } else {
        this.fileGroups[category][lang].push(file);
      }
    }

    this.calculateTotalSize();
  }

  removeFile(category: string, lang: string, index: number): void {
    if (this.fileGroups[category] && this.fileGroups[category][lang]) {
      this.fileGroups[category][lang].splice(index, 1);
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
      newFile.customType = 'file';
      this.fileReplaced = true;
      if (newFile.size / 1024 > 150000) {
        this.sizeExceeded = true;
        newFile.sizeExceeded = true;
        this.toastr.error('File size is too big');
      } else {
        this.fileGroups[category][lang][index] = newFile;
        this.calculateTotalSize();
        this.toastr.success('File replaced successfully.');
      }
    }
  }

  saveAll(): void {
    this.exists = false;

    Object.keys(this.lesson.lessonTitle).forEach((key: any) => {
      if (this.lesson.lessonTitle[key] === '' && !this.fileReplaced) {
        this.toastr.error("Lesson qatori bo'sh!");
        this.exists = true;
        return;
      }
    });

    if (!this.exists) {
      this.loading = true;
    }

    const categoryStatus: any = {};

    for (const category in this.fileGroups) {
      categoryStatus[category] = { total: 0, uploaded: 0 };

      for (const lang in this.fileGroups[category]) {
        const validFiles = this.fileGroups[category][lang].filter(
          (file: any) => file !== null && file.customType === 'file'
        );

        categoryStatus[category].total += validFiles.length;
      }
    }

    const uploadObservables: any = [];

    for (const category in this.fileGroups) {
      for (const lang in this.fileGroups[category]) {
        this.fileGroups[category][lang]
          .filter((file: any) => file !== null && file.customType === 'file')
          .forEach((file: any) => {
            uploadObservables.push(
              this.dropboxService.uploadFile('/' + file.name, file).pipe(
                tap((response) => {
                  this.uploadedFilesByCategory[category][lang].push(response);
                  categoryStatus[category].uploaded++;

                  if (
                    categoryStatus[category].uploaded ===
                    categoryStatus[category].total
                  ) {
                    this.toastr.success(
                      `All files in ${category} uploaded successfully.`
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
          // Update existing themes with uploaded files
          this.globalVarHold.semesters
            .find((semester: any) => semester.id === this.semester.id)
            ?.themes.some((theme: any) => {
              if (theme.id === this.theme.id) {
                // Object.keys(theme.files).forEach((key) => {
                //   theme.files[key] = [
                //     ...theme.files[key].filter(
                //       (file: any) => file?.customType !== 'file'
                //     ),
                //     ...this.uploadedFilesByCategory[key],
                //   ];
                // });
                this.helperKeys(theme.files).forEach((key) => {
                  this.helperKeys(theme.files[key]).forEach((lang) => {
                    theme.files[key][lang] = [
                      ...(theme.files[key][lang] || []).filter(
                        (file: any) => file?.customType !== 'file'
                      ),
                      ...(this.uploadedFilesByCategory[key]?.[lang] ?? []),
                    ];
                  });
                });
              }
            });

          // Update semester and theme titles
          const semester = this.globalVarHold.semesters.find(
            (s: any) => s.id === this.semester.id
          );
          if (semester) {
            Object.keys(semester.semesterTitle).forEach(
              (key) =>
                (semester.semesterTitle[key] = this.newSemesterTitle[key])
            );

            const theme = semester.themes.find(
              (t: any) => t.id === this.theme.id
            );
            if (theme) {
              Object.keys(theme.themeTitle).forEach(
                (key) => (theme.themeTitle[key] = this.newThemeTitle[key])
              );
            }
          }

          setTimeout(() => {
            this.build();
          }, 1000);
        },
        error: () => {
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
    for (const category in this.fileGroups) {
      for (const lang in this.fileGroups[category]) {
        this.fileGroups[category][lang].forEach((file: any) => {
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
    this.fileGroups[category][lang] = [null];
    this.theme.files[category][lang] = [null];
  }

  changeSemester(semester: any): void {
    this.semester = semester;
    this.changeTheme(this.semester.themes[0]);

    Object.keys(this.semester.semesterTitle).forEach((key: any) => {
      this.newSemesterTitle[key] = this.semester.semesterTitle[key];
    });
    Object.keys(this.theme.themeTitle).forEach((key: any) => {
      this.newThemeTitle[key] = this.theme.themeTitle[key];
    });
  }

  changeTheme(theme: any): void {
    this.theme = theme;
    Object.keys(this.theme.themeTitle).forEach((key: any) => {
      this.newThemeTitle[key] = this.theme.themeTitle[key];
    });
    this.helperKeys(this.theme.files).forEach((key) => {
      this.helperKeys(this.theme.files[key]).forEach((lang) => {
        this.fileGroups[key][lang] = this.theme.files[key][lang];
      });
    });
    this.calculateTotalSize();
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
}
