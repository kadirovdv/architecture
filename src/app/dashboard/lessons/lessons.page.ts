import { Component, OnInit, HostListener } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AddNewsModalComponent } from '../add-news-modal/add-news-modal.component';
import { LessonDeleteConfirmationComponent } from './lesson-delete-confirmation/lesson-delete-confirmation.component';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LessonsApiService } from 'src/app/shared/services/lessons-api.service';
import { AdminLessonsApiService } from 'src/app/shared/services/admin-lessons-api.service';
import type { LessonListItemDto, LessonTaskDto } from 'src/app/shared/models/backend.dto';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss']
})
export class LessonsPage implements OnInit {
  // Collection data
  lessons: LessonListItemDto[] = [];
  websiteLessons: LessonListItemDto[] = [];
  
  // Cached task data
  allLessonTasks = new Map<string, LessonTaskDto[]>();
  allWebsiteLessonTasks = new Map<string, LessonTaskDto[]>();
  
  // UI state
  activeTab: 'lessons' | 'website-lessons' = 'lessons';
  dropdownVisible = false;
  selectedIndex = -1;
  selectedId = ''; // slug
  tasksInLesson: LessonTaskDto[] = [];
  editingTaskId: string | null = null;
  isSubmitting = false;
  
  // Form data
  taskTitle: string = '';

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
    private toastr: ToastrService,
    private loadingService: LoadingService,
    private router: Router,
    private modalService: NgbModal,
    public i18n: i18nService,
    private lessonsApi: LessonsApiService,
    private adminLessonsApi: AdminLessonsApiService
  ) {}

  ngOnInit() {
    this.loadAllData();
    this.loadNews();
  }

  // Data Loading -------------------------------------------

  loadAllData() {
    this.loadingService.show();
    
    this.lessonsApi.listLessons({ activeOnly: true }).pipe(take(1)).subscribe({
      next: (data) => {
        // Backend has a single Lessons list; keep both tabs wired without duplicating data sources.
        this.lessons = [...data].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.websiteLessons = [...this.lessons];
        this.allLessonTasks.clear();
        this.allWebsiteLessonTasks.clear();
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error(`Error loading lessons: ${error.message || 'Unknown error'}`);
        this.lessons = [];
        this.websiteLessons = [];
        this.allLessonTasks.clear();
        this.allWebsiteLessonTasks.clear();
        this.loadingService.hide();
      },
    });
  }

  // Dropdown Management -------------------------------------------

  toggleDropdown(lesson: LessonListItemDto, index: number, event?: Event) {
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
    this.selectedId = (lesson as any).slug || '';
    this.dropdownVisible = true;
    
    if (!this.selectedId) return;

    // Load tasks from cache (by slug). If missing, fetch admin detail.
    const taskMap = this.activeTab === 'lessons' ? this.allLessonTasks : this.allWebsiteLessonTasks;
    const cached = taskMap.get(this.selectedId);
    if (cached) {
      this.tasksInLesson = cached;
      return;
    }

    this.loadingService.show();
    this.adminLessonsApi.getLessonDetail(this.selectedId).pipe(take(1)).subscribe({
      next: (detail) => {
        taskMap.set(this.selectedId, detail.tasks || []);
        this.tasksInLesson = detail.tasks || [];
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error('Error loading tasks: ' + (error?.message || 'Unknown error'));
        this.tasksInLesson = [];
        this.loadingService.hide();
      },
    });
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
    
    if (this.isSubmitting || !this.taskTitle || !this.selectedId) {
      this.taskTitle ? null : this.toastr.warning('Grafik topshiriqni kiriting');
      this.selectedId ? null : this.toastr.error('No lesson selected');
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    this.adminLessonsApi.createTask(this.selectedId, { title: this.taskTitle }).pipe(take(1)).subscribe({
      next: () => {
        this.refreshSelectedLessonTasks().then(() => {
          this.toastr.success("Topshiriq qo'shildi");
          this.resetTaskForm();
        });
      },
      error: (error) => {
        this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
        this.isSubmitting = false;
        this.loadingService.hide();
      },
    });
  }

  editTask(task: LessonTaskDto, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    this.editingTaskId = task.id || '';
    this.taskTitle = task.title || '';
  }

  saveEdit(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    if (this.isSubmitting || !this.taskTitle || !this.selectedId || !this.editingTaskId) {
      this.taskTitle ? null : this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    this.adminLessonsApi
      .updateTask(this.selectedId, this.editingTaskId, { title: this.taskTitle })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.refreshSelectedLessonTasks().then(() => {
            this.toastr.success('Topshiriq yangilandi');
            this.resetTaskForm();
          });
        },
        error: (error) => {
          this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
          this.isSubmitting = false;
          this.loadingService.hide();
        },
      });
  }

  deleteTask(task: LessonTaskDto, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    if (this.isSubmitting || !this.selectedId || !task.id) {
      return;
    }
    
    this.isSubmitting = true;
    this.loadingService.show();

    this.adminLessonsApi.deleteTask(this.selectedId, task.id).pipe(take(1)).subscribe({
      next: () => {
        this.refreshSelectedLessonTasks().then(() => {
          this.toastr.success("Topshiriq muvaffaqiyatli o'chirildi");
        });
      },
      error: (error) => {
        this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
        this.isSubmitting = false;
        this.loadingService.hide();
      },
    });
  }

  cancelEdit(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    
    this.resetTaskForm();
  }

  resetTaskForm() {
    this.editingTaskId = null;
    this.taskTitle = '';
  }

  private async refreshSelectedLessonTasks(): Promise<void> {
    if (!this.selectedId) return;

    const taskMap = this.activeTab === 'lessons' ? this.allLessonTasks : this.allWebsiteLessonTasks;

    return new Promise<void>((resolve) => {
      this.adminLessonsApi.getLessonDetail(this.selectedId).pipe(take(1)).subscribe({
        next: (detail) => {
          taskMap.set(this.selectedId, detail.tasks || []);
          this.tasksInLesson = detail.tasks || [];
          this.isSubmitting = false;
          this.loadingService.hide();
          resolve();
        },
        error: (error) => {
          console.error('Error refreshing tasks:', error);
          this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
          this.isSubmitting = false;
          this.loadingService.hide();
          resolve();
        },
      });
    });
  }

  // Navigation -------------------------------------------

  editLesson(lesson: LessonListItemDto) {
    this.router.navigate(['/dashboard/create-lesson'], {
      queryParams: { slug: lesson.slug },
    });
  }

  editCreatedLesson(lesson: LessonListItemDto) {
    if (!lesson || !lesson.slug) {
      this.toastr.error('Lesson ID is missing');
      return;
    }
    
    this.router.navigate(['/dashboard/edit-build'], {
      queryParams: { slug: lesson.slug },
    });
  }

  // Toggle lesson visibility -------------------------------------------

  toggleLessonActive(lesson: LessonListItemDto, event?: Event): void {
    if (!lesson.slug) return;
    
    event?.preventDefault();
    event?.stopPropagation();
    
    this.loadingService.show();
    
    const updatedActive = !lesson.active;
    this.adminLessonsApi.updateLesson(lesson.slug, { active: updatedActive }).pipe(take(1)).subscribe({
      next: () => {
        lesson.active = updatedActive;
        this.toastr.success(updatedActive ? "Dars saytda ko'rinadi" : "Dars saytda ko'rinmaydi");
        this.loadingService.hide();
      },
      error: (error) => {
        this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
        this.loadingService.hide();
      },
    });
  }

  deleteLesson(lesson: LessonListItemDto, event?: Event): void {
    if (!lesson.slug) return;
    
    event?.preventDefault();
    event?.stopPropagation();
    
    // Open confirmation modal
    const modalRef = this.modalService.open(LessonDeleteConfirmationComponent);
    modalRef.componentInstance.lessonTitle = lesson.title;
    
    // Handle the result
    modalRef.result.then((result) => {
      if (result === 'confirm') {
        this.loadingService.show();
        
        this.adminLessonsApi.deleteLesson(lesson.slug).pipe(take(1)).subscribe({
          next: () => {
            this.toastr.success("Fan muvaffaqiyatli o'chirildi");
            this.loadAllData(); // Reload the lessons list
            this.loadingService.hide();
          },
          error: (error) => {
            this.toastr.error('Error: ' + (error?.message || 'Unknown error'));
            this.loadingService.hide();
          },
        });
      }
    }, () => {
      // Modal dismissed - do nothing
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
      target.closest('img[src*="edit.png"]') ||
      target.closest('.modal');
    
    if (!isDropdownRelated) {
      this.closeDropdown();
    }
  }

  // News Management (localStorage) -------------------------------------------
  
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

    const news = {
      title: newsData.title,
      link: newsData.link,
      createdAt: new Date().toISOString(),
      id: this.generateId(),
    };

    this.newsList.push(news);
    this.sortNewsList();
    this.persistNews();
    this.toastr.success('Yangilik muvaffaqiyatli qo\'shildi');
    this.closeNewsModal();
    this.loadingService.hide();
  }
  
  loadNews() {
    try {
      const raw = localStorage.getItem('news');
      const parsed = raw ? JSON.parse(raw) : [];
      this.newsList = Array.isArray(parsed) ? parsed : [];
      this.sortNewsList();
    } catch (error: any) {
      this.newsList = [];
      this.toastr.error('Yangiliklar yuklanmadi');
    }
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
      
      this.newsList = this.newsList.filter((item) => item.id !== newsId);
      this.persistNews();
      this.toastr.success('Yangilik muvaffaqiyatli o\'chirildi');
      this.loadingService.hide();
    }
  }

  private persistNews(): void {
    try {
      localStorage.setItem('news', JSON.stringify(this.newsList));
    } catch {
      // ignore
    }
  }

  private generateId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
