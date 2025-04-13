import { Component, OnInit, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Lesson, Task } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { Router } from '@angular/router';
import { AddNewsModalComponent } from '../add-news-modal/add-news-modal.component';
import { i18nService } from 'src/app/shared/services/i18n.service';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss']
})
export class LessonsPage implements OnInit {
  // Collection data
  lessons: Lesson[] = [];
  websiteLessons: Lesson[] = [];
  
  // Cached task data
  allLessonTasks = new Map<string, Task[]>();
  allWebsiteLessonTasks = new Map<string, Task[]>();
  
  // UI state
  activeTab: 'lessons' | 'website-lessons' = 'lessons';
  dropdownVisible = false;
  selectedIndex = -1;
  selectedId = '';
  tasksInLesson: Task[] = [];
  editingTaskId: string | null = null;
  isSubmitting = false;
  
  // Form data
  task: Task = {
    title: '',
    id: '',
    index: 0,
    createdAt: '',
    firstBasedFiles: {},
    secondBasedFiles: {},
  };

  // News Management -------------------------------------------
  
  showNewsModal = false;
  newsList: {
    id: string,
    title: {
      uz: string,
      ru: string,
      en: string
    },
    link: {
      uz: string,
      ru: string,
      en: string
    },
    createdAt: string
  }[] = [];

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private router: Router,
    public i18n: i18nService
  ) {}

  ngOnInit() {
    this.loadAllData();
    this.loadNews();
  }

  // Data Loading -------------------------------------------

  loadAllData() {
    this.loadingService.show();
    
    // Use Promise.all to load both collections in parallel
    Promise.all([
      this.fetchCollection('lessons'),
      this.fetchCollection('website-lessons')
    ]).finally(() => {
      this.loadingService.hide();
    });
  }

  fetchCollection(collectionName: 'lessons' | 'website-lessons') {
    return new Promise<void>((resolve) => {
      this.crudService.getDocuments(collectionName).subscribe({
        next: (data) => {
          const sortedData = (data as Lesson[]).sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });
          
          if (collectionName === 'lessons') {
            this.lessons = sortedData;
            this.cacheTasks(sortedData, this.allLessonTasks);
          } else {
            this.websiteLessons = sortedData;
            this.cacheTasks(sortedData, this.allWebsiteLessonTasks);
          }
          
          resolve();
        },
        error: (error) => {
          this.toastr.error(`Error loading ${collectionName}: ${error.message || 'Unknown error'}`);
          resolve();
        }
      });
    });
  }

  cacheTasks(lessons: Lesson[], targetMap: Map<string, Task[]>) {
    targetMap.clear();
    lessons.forEach(lesson => {
      if (lesson.id && lesson.tasks) {
        const normalizedTasks = this.normalizeTasks(lesson.tasks);
        targetMap.set(lesson.id, normalizedTasks);
      }
    });
  }

  normalizeTasks(tasks: any[]): Task[] {
    return tasks.map((task: any) => ({
      ...task,
      firstBasedFiles: {
        taskExampleFiles: task.firstBasedFiles?.taskExampleFiles || { uz: [], ru: [], en: [] },
        taskSolutionFiles: task.firstBasedFiles?.taskSolutionFiles || { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: {
        taskTitleFiles: task.secondBasedFiles?.taskTitleFiles || { uz: [], ru: [], en: [] },
        taskPresentationFiles: task.secondBasedFiles?.taskPresentationFiles || { uz: [], ru: [], en: [] },
        taskLiteratureFiles: task.secondBasedFiles?.taskLiteratureFiles || { uz: [], ru: [], en: [] },
        taskVideoUrls: task.secondBasedFiles?.taskVideoUrls || []
      }
    }));
  }

  // Dropdown Management -------------------------------------------

  toggleDropdown(lesson: Lesson, index: number, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    // If clicking the same dropdown, toggle it
    if (this.selectedIndex === index && this.dropdownVisible) {
      this.closeDropdown();
      return;
    }
    
    // Close any open dropdown
    this.closeDropdown();
    
    // Open the new dropdown
    this.selectedIndex = index;
    this.selectedId = lesson.id || '';
    this.dropdownVisible = true;
    
    // Load tasks from cache
    if (this.selectedId) {
      const taskMap = this.activeTab === 'lessons' ? this.allLessonTasks : this.allWebsiteLessonTasks;
      this.tasksInLesson = taskMap.get(this.selectedId) || [];
    }
  }

  closeDropdown() {
    this.dropdownVisible = false;
    this.selectedIndex = -1;
    this.selectedId = '';
    this.tasksInLesson = [];
    this.resetTaskForm();
  }

  // Tab Management -------------------------------------------

  switchTab(tab: 'lessons' | 'website-lessons') {
    this.activeTab = tab;
    this.closeDropdown();
  }

  // Task Operations -------------------------------------------

  addTask(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    if (this.isSubmitting || !this.task.title || !this.selectedId) {
      this.task.title ? null : this.toastr.warning('Grafik topshiriqni kiriting');
      this.selectedId ? null : this.toastr.error('No lesson selected');
      return;
    }
    
    // Check for duplicates in current lesson
    if (this.tasksInLesson.some(t => t.title === this.task.title)) {
      this.toastr.error('Bu grafik topshiriq mavjud');
      return;
    }
    
    // Check for duplicates in the opposite collection
    const oppositeCollection = this.activeTab === 'lessons' ? this.allWebsiteLessonTasks : this.allLessonTasks;
    let duplicateLessonName = '';
    
    // Find any task with the same title in the opposite collection
    for (const [lessonId, tasks] of oppositeCollection.entries()) {
      if (tasks.some(t => t.title === this.task.title)) {
        const lessonList = this.activeTab === 'lessons' ? this.websiteLessons : this.lessons;
        const lesson = lessonList.find(l => l.id === lessonId);
        duplicateLessonName = lesson?.lessonTitle?.uz || 'unknown lesson';
        break;
      }
    }
    
    if (duplicateLessonName) {
      const message = this.activeTab === 'lessons' 
        ? `Bu grafik topshiriq sayt bo'limida mavjud: ${duplicateLessonName}` 
        : `Bu grafik topshiriq asosiy bo'limda mavjud: ${duplicateLessonName}`;
      this.toastr.error(message);
      return;
    }
    
    // Create new task
    this.isSubmitting = true;
    this.loadingService.show();
    
    const newTask: Task = {
      title: this.task.title,
      index: this.tasksInLesson.length + 1,
      id: this.crudService.generateId(),
      createdAt: new Date().toISOString(),
      firstBasedFiles: {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] },
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: [],
      },
    };
    
    // Update UI immediately
    const updatedTasks = [...this.tasksInLesson, newTask];
    this.updateTasksEverywhere(updatedTasks);
    
    // Save to database
    this.saveTasksToDatabase(updatedTasks);
  }

  editTask(task: Task, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    this.editingTaskId = task.id || '';
    this.task.title = task.title || '';
  }

  saveEdit(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    if (this.isSubmitting || !this.task.title || !this.selectedId || !this.editingTaskId) {
      this.task.title ? null : this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }
    
    // Check for duplicates in current lesson (excluding the task being edited)
    if (this.tasksInLesson.some(t => t.title === this.task.title && t.id !== this.editingTaskId)) {
      this.toastr.error('Bu grafik topshiriq mavjud');
      return;
    }
    
    // Check for duplicates in the opposite collection
    const oppositeCollection = this.activeTab === 'lessons' ? this.allWebsiteLessonTasks : this.allLessonTasks;
    let duplicateLessonName = '';
    
    // Find any task with the same title in the opposite collection
    for (const [lessonId, tasks] of oppositeCollection.entries()) {
      if (tasks.some(t => t.title === this.task.title)) {
        const lessonList = this.activeTab === 'lessons' ? this.websiteLessons : this.lessons;
        const lesson = lessonList.find(l => l.id === lessonId);
        duplicateLessonName = lesson?.lessonTitle?.uz || 'unknown lesson';
        break;
      }
    }
    
    if (duplicateLessonName) {
      const message = this.activeTab === 'lessons' 
        ? `Bu grafik topshiriq sayt bo'limida mavjud: ${duplicateLessonName}` 
        : `Bu grafik topshiriq asosiy bo'limda mavjud: ${duplicateLessonName}`;
      this.toastr.error(message);
      return;
    }
    
    // Update task
    this.isSubmitting = true;
    this.loadingService.show();
    
    // Find and update the task
    const taskIndex = this.tasksInLesson.findIndex(t => t.id === this.editingTaskId);
    if (taskIndex === -1) {
      this.toastr.error('Task not found');
      this.isSubmitting = false;
      this.loadingService.hide();
      return;
    }
    
    const updatedTasks = [...this.tasksInLesson];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      title: this.task.title
    };
    
    // Update UI immediately
    this.updateTasksEverywhere(updatedTasks);
    this.resetTaskForm();
    
    // Save to database
    this.saveTasksToDatabase(updatedTasks);
  }

  deleteTask(task: Task, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    if (this.isSubmitting || !this.selectedId || !task.id) {
      return;
    }
    
    this.isSubmitting = true;
    this.loadingService.show();
    
    // Remove the task
    const updatedTasks = this.tasksInLesson.filter(t => t.id !== task.id);
    
    // Update UI immediately
    this.updateTasksEverywhere(updatedTasks);
    
    // Reset editing if we were editing this task
    if (this.editingTaskId === task.id) {
      this.resetTaskForm();
    }
    
    // Save to database
    this.saveTasksToDatabase(updatedTasks)
      .then(() => {
        this.toastr.success("Topshiriq muvaffaqiyatli o'chirildi");
      });
  }

  cancelEdit(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    this.resetTaskForm();
  }

  resetTaskForm() {
    this.editingTaskId = null;
    this.task = {
      title: '',
      id: '',
      index: 0,
      createdAt: '',
      firstBasedFiles: {},
      secondBasedFiles: {},
    };
  }

  // Update UI and database -------------------------------------------

  updateTasksEverywhere(tasks: Task[]) {
    if (!this.selectedId) return;
    
    // Update tasks in the dropdown
    this.tasksInLesson = tasks;
    
    // Update tasks in cache
    const taskMap = this.activeTab === 'lessons' ? this.allLessonTasks : this.allWebsiteLessonTasks;
    taskMap.set(this.selectedId, [...tasks]);
    
    // Update tasks in the original lesson object
    const lessonsList = this.activeTab === 'lessons' ? this.lessons : this.websiteLessons;
    const lessonIndex = lessonsList.findIndex(l => l.id === this.selectedId);
    if (lessonIndex !== -1) {
      lessonsList[lessonIndex].tasks = tasks;
    }
  }

  saveTasksToDatabase(tasks: Task[]) {
    if (!this.selectedId) {
      this.isSubmitting = false;
      this.loadingService.hide();
      return Promise.reject('No lesson selected');
    }
    
    const collectionName = this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';
    
    return new Promise<void>((resolve, reject) => {
      this.crudService
        .updateDocument(collectionName, this.selectedId, { tasks })
        .subscribe({
          next: () => {
            this.isSubmitting = false;
            this.loadingService.hide();
            resolve();
          },
          error: (error) => {
            console.error('Error updating tasks:', error);
            this.toastr.error('Error: ' + (error.message || 'Unknown error'));
            this.isSubmitting = false;
            this.loadingService.hide();
            reject(error);
          }
        });
    });
  }

  // Navigation -------------------------------------------

  editLesson(lesson: Lesson) {
    this.router.navigate(['/dashboard/create-lesson'], {
      queryParams: { id: lesson.id },
    });
  }

  editCreatedLesson(lesson: Lesson) {
    if (!lesson || !lesson.id) {
      this.toastr.error('Lesson ID is missing');
      return;
    }
    
    this.router.navigate(['/dashboard/edit-build'], {
      queryParams: { id: lesson.id },
    });
  }

  // Toggle lesson visibility -------------------------------------------

  toggleLessonActive(lesson: Lesson, event?: Event): void {
    if (!lesson.id) return;
    
    event?.preventDefault();
    event?.stopPropagation();
    
    this.loadingService.show();
    
    const updatedActive = !lesson.active;
    this.crudService
      .updateDocument('website-lessons', lesson.id, { active: updatedActive })
      .subscribe({
        next: () => {
          lesson.active = updatedActive;
          this.toastr.success(
            updatedActive ? "Dars saytda ko'rinadi" : "Dars saytda ko'rinmaydi"
          );
          this.loadingService.hide();
        },
        error: (error) => {
          this.toastr.error('Error: ' + (error.message || 'Unknown error'));
          this.loadingService.hide();
        }
      });
  }

  // Document click handler -------------------------------------------

  @HostListener('document:click')
  handleDocumentClick(event: MouseEvent) {
    if (!this.dropdownVisible) return;
    
    const target = event.target as HTMLElement;
    const isDropdownRelated = 
      target.closest('.action-dropdown') || 
      target.closest('.action-btn') || 
      target.closest('.toggle-switch') ||
      target.closest('img[src*="plus.svg"]') ||
      target.closest('img[src*="save.svg"]') ||
      target.closest('img[src*="cancel.svg"]') ||
      target.closest('img[src*="trash.svg"]') ||
      target.closest('img[src*="edit.png"]');
    
    if (!isDropdownRelated) {
      this.closeDropdown();
    }
  }

  // News Management -------------------------------------------
  
  openAddNewsModal() {
    this.showNewsModal = true;
  }
  
  closeNewsModal() {
    this.showNewsModal = false;
  }
  
  saveNews(newsData: {
    title: { uz: string, ru: string, en: string },
    link: { uz: string, ru: string, en: string }
  }) {
    // Check if at least one language has both title and link
    const hasContent = 
      (newsData.title.uz && newsData.link.uz) || 
      (newsData.title.ru && newsData.link.ru) ||
      (newsData.title.en && newsData.link.en);
    
    if (!hasContent) {
      this.toastr.warning('At least one language must have both title and link');
      return;
    }
    
    this.loadingService.show();
    
    // Create news object
    const news = {
      title: newsData.title,
      link: newsData.link,
      createdAt: new Date().toISOString(),
      id: this.crudService.generateId()
    };
    
    // Save to Firebase
    this.crudService.addDocument('news', news).subscribe({
      next: () => {
        this.toastr.success('Yangilik muvaffaqiyatli qo\'shildi');
        this.closeNewsModal();
        this.loadingService.hide();
        // Add to local list and re-sort
        this.newsList.push(news);
        this.sortNewsList();
      },
      error: (error) => {
        this.toastr.error('Xatolik yuz berdi: ' + (error.message || 'Noma\'lum xato'));
        this.loadingService.hide();
      }
    });
  }
  
  loadNews() {
    this.crudService.getDocuments('news').subscribe({
      next: (data) => {
        this.newsList = data as {
          id: string,
          title: { uz: string, ru: string, en: string },
          link: { uz: string, ru: string, en: string },
          createdAt: string
        }[];
        this.sortNewsList();
      },
      error: (error) => {
        this.toastr.error('Yangiliklar yuklanmadi: ' + (error.message || 'Noma\'lum xato'));
      }
    });
  }
  
  sortNewsList() {
    this.newsList.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  deleteNews(newsId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (confirm('Rostdan ham bu yangilikni o\'chirmoqchimisiz?')) {
      this.loadingService.show();
      
      this.crudService.deleteDocument('news', newsId).subscribe({
        next: () => {
          this.toastr.success('Yangilik muvaffaqiyatli o\'chirildi');
          this.newsList = this.newsList.filter(item => item.id !== newsId);
          this.loadingService.hide();
        },
        error: (error) => {
          this.toastr.error('Xatolik yuz berdi: ' + (error.message || 'Noma\'lum xato'));
          this.loadingService.hide();
        }
      });
    }
  }

  // Helper methods for multilingual content
  getNewsTitle(news: any): string {
    const lang = this.i18n.getLang();
    if (news.title && typeof news.title === 'object') {
      return news.title[lang] || news.title.uz || news.title.ru || news.title.en || '';
    }
    return news.title || '';
  }

  getNewsLink(news: any): string {
    const lang = this.i18n.getLang();
    if (news.link && typeof news.link === 'object') {
      return news.link[lang] || news.link.uz || news.link.ru || news.link.en || '';
    }
    return news.link || '';
  }
}
