import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Lesson } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
})
export class LessonsPage {
  lessons: Lesson[] = [];
  loader: boolean = false;
  selectedIndex: number = -1;
  selectedId: string = '';
  tasksInLesson: any[] = [];
  task: string = '';

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.getLessons();
  }

  getLessons() {
    this.lessons = [];
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res as Lesson[];
      this.lessons = this.lessons.sort((a: Lesson, b: Lesson) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    });
  }

  openDropdown(index: number, lesson: Lesson) {
    if (this.selectedIndex !== index) {
      this.selectedIndex = index;
      this.selectedId = lesson.id ? lesson.id : '';
      this.tasksInLesson = lesson.tasks ? lesson.tasks : [];
    } else {
      this.selectedIndex = -1;
      this.selectedId = '';
      this.tasksInLesson = [];
    }
  }

  addTaskToLesson() {
    if (!this.task) {
      this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }  
    if (this.tasksInLesson.includes(this.task)) {
      this.toastr.error('Bu grafik topshiriq mavjud');
      return;
    } else {
      this.crudService
        .updateDocument('lessons', this.selectedId, {
          tasks: [...this.tasksInLesson, this.task],
        })
        .subscribe(() => {
          this.toastr.success("Grafik topshiriq qo'shildi");
        });
    }
  }
}
