import { Component, OnInit } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';
import {
  Lesson,
  Task,
  File,
  FirstClassFileGroups,
  SecondClassFileGroups,
  Files,
} from 'src/app/shared/interfaces/interfaces';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import {
  concatMap,
  delay,
  finalize,
  forkJoin,
  from,
  Observable,
  tap,
  timer,
} from 'rxjs';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  lessons: Lesson[] = [];
  lesson: Lesson | null = null;
  task: Task | any = null;
  uploadedFilesByCategory: any = {};
  loading: boolean = false;
  uploadedFiles: any;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private location: Location,
    private dropboxService: DropboxService
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
    language: 'uz' | 'ru' | 'en'
  ) {
    if (!this.task) return;

    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const filesArray = Array.from(input.files).map((file) => ({
      name: file.name,
      size: file.size,
    }));

    this.task.firstBasedFiles ??= {} as FirstClassFileGroups;
    this.task.secondBasedFiles ??= {} as SecondClassFileGroups;

    if (this.isFirstClassFileCategory(category)) {
      this.task.firstBasedFiles[category] ??= {} as Files;
      this.task.firstBasedFiles[category][language] ??= [];
      this.task.firstBasedFiles[category][language]!.push(...filesArray);
    } else if (this.isSecondClassFileCategory(category)) {
      this.task.secondBasedFiles[category] ??= {} as Files;
      this.task.secondBasedFiles[category][language] ??= [];
      this.task.secondBasedFiles[category][language]!.push(...filesArray);
    }
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

  // removeFile(
  //   category: keyof FirstClassFileGroups | keyof SecondClassFileGroups,
  //   lang: keyof Files,
  //   index: number
  // ): void {
  //   if (this.task?.firstBasedFiles && this.isFirstClassFileCategory(category)) {
  //     this.task.firstBasedFiles[category as keyof FirstClassFileGroups]?.[
  //       lang
  //     ]?.splice(index, 1);
  //     console.log(this.task);
  //   } else if (
  //     this.task?.secondBasedFiles &&
  //     this.isSecondClassFileCategory(category)
  //   ) {
  //     this.task.secondBasedFiles[category as keyof SecondClassFileGroups]?.[
  //       lang
  //     ]?.splice(index, 1);
  //   }
  // }

  removeFile(category: string, lang: string, index: number): void {
    this.task.firstBasedFiles[category][lang].splice(index, 1);
  }

  uploadAllFiles(): void {
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
      },
    };

    const uploadObservables: Observable<any>[] = [];
    const categoryStatus: Record<
      string,
      Record<string, { total: number; uploaded: number }>
    > = {};

    const uploadCategoryFiles = (categoryPath: string, categoryObj: any) => {
      for (const lang in categoryObj) {
        const files = categoryObj[lang].filter((file: any) => file !== null);
        if (!categoryStatus[categoryPath]) categoryStatus[categoryPath] = {};
        categoryStatus[categoryPath][lang] = {
          total: files.length,
          uploaded: 0,
        };

        files.forEach((file: any, index: number) => {
          const filePath = `/${file.name}`;
          const upload$ = this.dropboxService.uploadFile(filePath, file).pipe(
            tap((response) => {
              const categoryArray = categoryPath.split('.');
              let target: any = uploadedFiles;

              for (const key of categoryArray) {
                target = target[key];
              }

              target[lang].push(response);
              categoryStatus[categoryPath][lang].uploaded++;

              if (
                categoryStatus[categoryPath][lang].uploaded ===
                categoryStatus[categoryPath][lang].total
              ) {
                this.toastr.success(
                  `All files in ${categoryPath} (${lang}) uploaded successfully.`
                );
              }
            }),
            delay(1000 * index)
          );
          uploadObservables.push(upload$);
        });
      }
    };

    uploadCategoryFiles(
      'firstBasedFiles.taskExampleFiles',
      this.task.firstBasedFiles.taskExampleFiles
    );
    uploadCategoryFiles(
      'firstBasedFiles.taskSolutionFiles',
      this.task.firstBasedFiles.taskSolutionFiles
    );
    uploadCategoryFiles(
      'secondBasedFiles.taskTitleFiles',
      this.task.secondBasedFiles.taskTitleFiles
    );
    uploadCategoryFiles(
      'secondBasedFiles.taskPresentationFiles',
      this.task.secondBasedFiles.taskPresentationFiles
    );
    uploadCategoryFiles(
      'secondBasedFiles.taskLiteratureFiles',
      this.task.secondBasedFiles.taskLiteratureFiles
    );

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
          console.log('All files uploaded:', uploadedFiles);
          this.uploadedFiles = uploadedFiles;
        },
        error: (err) => {
          console.error('Error uploading files:', err);
        },
      });
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
