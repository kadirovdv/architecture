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

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  lessons: Lesson[] = [];
  lesson: Lesson | null = null;
  task: Task | null = null;
  loading: boolean = false;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.getLessons();
    console.log(this.task);
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

    console.log(this.task);
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
}
