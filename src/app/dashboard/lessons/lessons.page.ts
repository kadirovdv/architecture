import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Lesson, Task } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
})
export class LessonsPage implements OnInit {
  lessons: Lesson[] = [];
  websiteLessons: Lesson[] = [];
  loader: boolean = false;
  selectedIndex: number = -1;
  selectedId: string = '';
  tasksInLesson: any[] = [];
  activeTab: 'lessons' | 'website-lessons' = 'lessons';
  editingTaskId: string | null = null;
  task: Task = {
    title: '',
    id: '',
    index: 0,
    createdAt: '',
    firstBasedFiles: {},
    secondBasedFiles: {},
  };
  editingTask: Task = {
    title: '',
    index: 0,
    id: '',
  };

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer,
    private loadingService: LoadingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.getLessons();
    this.getWebsiteLessons();
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

  getWebsiteLessons() {
    this.crudService.getDocuments('website-lessons').subscribe((res) => {
      this.websiteLessons = res as Lesson[];
      this.websiteLessons = this.websiteLessons.sort((a: Lesson, b: Lesson) => {
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
    this.loadingService.show();
    if (!this.task) {
      this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }
    if (this.tasksInLesson.includes(this.task.title)) {
      this.toastr.error('Bu grafik topshiriq mavjud');
      return;
    } else {
      this.task.index = this.tasksInLesson.length + 1;
      this.task.createdAt = new Date().toISOString();
      this.task.id = this.crudService.generateId();
      const collectionName = this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';
      
      this.crudService
        .updateDocument(collectionName, this.selectedId, {
          tasks: [...this.tasksInLesson, this.task],
        })
        .subscribe(() => {
          this.toastr.success("Grafik topshiriq qo'shildi");
          this.task.title = '';
          if (this.activeTab === 'lessons') {
            this.getLessons();
          } else {
            this.getWebsiteLessons();
          }
          this.tasksInLesson = [];
          this.selectedIndex = -1;
          this.selectedId = '';
          this.loadingService.hide();
        });
    }
  }

  deleteTaskFromLesson(task: Task) {
    const updatedTasks = this.tasksInLesson.filter((t) => t.id !== task.id);
    const collectionName = this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';

    this.crudService
      .updateDocument(collectionName, this.selectedId, {
        tasks: updatedTasks,
      })
      .subscribe(() => {
        this.task.title = '';
        if (this.activeTab === 'lessons') {
          this.getLessons();
        } else {
          this.getWebsiteLessons();
        }
        this.selectedIndex = -1;
        this.selectedId = '';
        this.tasksInLesson = [];
      });
  }

  editTask(task: Task) {
    this.editingTaskId = task.id || '';
    this.task.title = task.title;
    console.log(this.task);
  }

  saveTaskEdit() {
    if (!this.task.title) {
      this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }

    const collectionName = this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';
    
    if (this.activeTab === 'website-lessons') {
      const currentLesson = this.websiteLessons.find(l => l.id === this.selectedId);
      if (!currentLesson || !currentLesson.tasks) return;

      const taskToUpdate = currentLesson.tasks.find(t => t.id === this.editingTaskId);
      if (!taskToUpdate) return;

      const updatedTasks = currentLesson.tasks.map(t => 
        t.id === this.editingTaskId 
          ? { ...taskToUpdate, title: this.task.title }
          : t
      );

      this.crudService
        .updateDocument(collectionName, this.selectedId, {
          ...currentLesson,
          tasks: updatedTasks
        })
        .subscribe(() => {
          this.getWebsiteLessons();
          this.tasksInLesson = updatedTasks;
          this.editingTaskId = null;
          this.task.title = '';
        });
    } else {
      const updatedTasks = this.tasksInLesson.map(t => 
        t.id === this.editingTaskId ? { ...t, title: this.task.title } : t
      );

      this.crudService
        .updateDocument(collectionName, this.selectedId, {
          tasks: updatedTasks,
        })
        .subscribe(() => {
          this.getLessons();
          this.tasksInLesson = updatedTasks;
          this.editingTaskId = null;
          this.task.title = '';
        });
    }
  }

  cancelTaskEdit() {
    this.editingTaskId = null;
    this.task.title = '';
  }

  editLesson(lesson: Lesson) {
    this.router.navigate(['/dashboard/create-lesson'], { queryParams: { id: lesson.id } });
  }

  editCreatedLesson(lesson: Lesson) {
    this.router.navigate(['/dashboard/edit-build'], { queryParams: { id: lesson.id } });
  }

  switchTab(tab: 'lessons' | 'website-lessons') {
    this.activeTab = tab;
    this.selectedIndex = -1;
    this.selectedId = '';
    this.tasksInLesson = [];
  }
}
