import { Component, OnInit, HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { Lesson, Task } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TaskDeleteConfirmationComponent } from './delete-confirmation/delete-confirmation.component';

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
  isDropdownLoading: boolean = false;
  isSubmitting: boolean = false;
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
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.getLessons();
    this.getWebsiteLessons();
  }

  getLessons() {
    console.log('Getting lessons from collection: lessons');
    this.lessons = [];
    this.loadingService.show();
    this.crudService.getDocuments('lessons').subscribe({
      next: (res) => {
        this.lessons = res as Lesson[];
        this.lessons = this.lessons.sort((a: Lesson, b: Lesson) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        console.log(`Loaded ${this.lessons.length} lessons`, this.lessons);
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading lessons:', error);
        this.toastr.error(
          'Error loading lessons: ' + (error.message || 'Unknown error')
        );
        this.loadingService.hide();
      },
    });
  }

  getWebsiteLessons() {
    console.log('Getting lessons from collection: website-lessons');
    this.loadingService.show();
    this.crudService.getDocuments('website-lessons').subscribe({
      next: (res) => {
        this.websiteLessons = res as Lesson[];
        this.websiteLessons = this.websiteLessons.sort(
          (a: Lesson, b: Lesson) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          }
        );
        console.log(
          `Loaded ${this.websiteLessons.length} website lessons`,
          this.websiteLessons
        );
        this.loadingService.hide();
      },
      error: (error) => {
        console.error('Error loading website lessons:', error);
        this.toastr.error(
          'Error loading website lessons: ' + (error.message || 'Unknown error')
        );
        this.loadingService.hide();
      },
    });
  }

  openDropdown(lesson: Lesson, index: number, event: Event) {
    // Prevent event propagation
    event.stopPropagation();

    // If the same dropdown is already open, close it
    if (this.selectedIndex === index) {
      this.closeDropdown();
      return;
    }

    // Close any previously open dropdown
    this.closeDropdown();

    // Open the new dropdown with loading indicator
    this.isDropdownLoading = true;

    // Set the new selection
    this.selectedIndex = index;
    this.selectedId = lesson.id || '';

    if (!this.selectedId) {
      this.toastr.error('Invalid lesson: missing ID');
      this.isDropdownLoading = false;
      this.closeDropdown();
      return;
    }

    // If there are tasks, load them
    if (lesson.tasks && lesson.tasks.length > 0) {
      console.log('Using existing tasks', lesson.tasks);

      // Normalize tasks to ensure proper structure
      this.tasksInLesson = lesson.tasks.map((task: any) => {
        return {
          ...task,
          firstBasedFiles: {
            taskExampleFiles: task.firstBasedFiles?.taskExampleFiles || {
              uz: [],
              ru: [],
              en: [],
            },
            taskSolutionFiles: task.firstBasedFiles?.taskSolutionFiles || {
              uz: [],
              ru: [],
              en: [],
            },
          },
          secondBasedFiles: {
            taskTitleFiles: task.secondBasedFiles?.taskTitleFiles || {
              uz: [],
              ru: [],
              en: [],
            },
            taskPresentationFiles: task.secondBasedFiles
              ?.taskPresentationFiles || { uz: [], ru: [], en: [] },
            taskLiteratureFiles: task.secondBasedFiles?.taskLiteratureFiles || {
              uz: [],
              ru: [],
              en: [],
            },
            taskVideoUrls: task.secondBasedFiles?.taskVideoUrls || [],
          },
        };
      });

      this.isDropdownLoading = false;
    } else {
      // Load tasks from the server if they don't exist
      const collectionName =
        this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';

      console.log(
        `Loading tasks from server for ${collectionName} with ID: ${this.selectedId}`
      );

      this.crudService
        .getDocumentById(collectionName, this.selectedId)
        .subscribe({
          next: (retrievedLesson: any) => {
            if (retrievedLesson && retrievedLesson.tasks) {
              console.log('Retrieved tasks from server', retrievedLesson.tasks);

              // Normalize tasks to ensure proper structure
              this.tasksInLesson = retrievedLesson.tasks.map((task: any) => {
                return {
                  ...task,
                  firstBasedFiles: {
                    taskExampleFiles: task.firstBasedFiles
                      ?.taskExampleFiles || { uz: [], ru: [], en: [] },
                    taskSolutionFiles: task.firstBasedFiles
                      ?.taskSolutionFiles || { uz: [], ru: [], en: [] },
                  },
                  secondBasedFiles: {
                    taskTitleFiles: task.secondBasedFiles?.taskTitleFiles || {
                      uz: [],
                      ru: [],
                      en: [],
                    },
                    taskPresentationFiles: task.secondBasedFiles
                      ?.taskPresentationFiles || { uz: [], ru: [], en: [] },
                    taskLiteratureFiles: task.secondBasedFiles
                      ?.taskLiteratureFiles || { uz: [], ru: [], en: [] },
                    taskVideoUrls: task.secondBasedFiles?.taskVideoUrls || [],
                  },
                };
              });
            } else {
              console.log('No tasks found for this lesson or lesson not found');
              this.tasksInLesson = [];
            }
            this.isDropdownLoading = false;
          },
          error: (error) => {
            console.error('Error loading lesson tasks:', error);
            this.toastr.error(
              'Error loading tasks: ' + (error.message || 'Unknown error')
            );
            this.isDropdownLoading = false;
            this.closeDropdown();
          },
        });
    }
  }

  closeDropdown() {
    // Don't do anything if no dropdown is open
    if (this.selectedIndex === -1) return;

    // Get all open dropdowns
    const dropdowns = document.querySelectorAll('.action-dropdown');

    // Add the exit animation class to all open dropdowns
    dropdowns.forEach((dropdown) => {
      dropdown.classList.add('dropdown-exit');
    });

    // After animation completes, reset the state
    setTimeout(() => {
      this.selectedIndex = -1;
      this.selectedId = '';
      this.tasksInLesson = [];

      // Clear any editing
      if (this.editingTaskId) {
        this.cancelTaskEdit();
      }

      // Remove the animation class (in case dropdown is re-opened quickly)
      dropdowns.forEach((dropdown) => {
        dropdown.classList.remove('dropdown-exit');
      });
    }, 200); // Match this to your animation duration
  }

  addTaskToLesson(event?: Event) {
    // Prevent event from bubbling up
    event?.stopPropagation();

    // Prevent multiple submissions
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();

    if (!this.task.title) {
      this.toastr.warning('Grafik topshiriqni kiriting');
      this.loadingService.hide();
      this.isSubmitting = false;
      return;
    }

    if (!this.selectedId) {
      this.toastr.error('No lesson selected');
      this.loadingService.hide();
      this.isSubmitting = false;
      return;
    }

    const titleExists = this.tasksInLesson.some(
      (t) => t.title === this.task.title
    );
    if (titleExists) {
      this.toastr.error('Bu grafik topshiriq mavjud');
      this.loadingService.hide();
      this.isSubmitting = false;
      return;
    }

    // Prepare new task with proper structure
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

    const collectionName =
      this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';

    // Create a copy of the current tasks and add the new one
    const updatedTasks = [...this.tasksInLesson, newTask];

    // Update the document directly
    this.crudService
      .updateDocument(collectionName, this.selectedId, {
        tasks: updatedTasks,
      })
      .subscribe(
        (res) => {
          console.log('Task added successfully');
          this.toastr.success("Grafik topshiriq qo'shildi");

          // Reset task input
          this.task = {
            title: '',
            id: '',
            index: 0,
            createdAt: '',
            firstBasedFiles: {},
            secondBasedFiles: {},
          };

          // Reset submission flag and hide loader
          this.isSubmitting = false;
          this.loadingService.hide();

          // Close the dropdown
          this.closeDropdown();
        },
        (error) => {
          console.error('Error adding task:', error);
          this.toastr.error(
            'Error adding task: ' + (error.message || 'Unknown error')
          );
          this.isSubmitting = false;
          this.loadingService.hide();
        }
      );
  }

  deleteTaskFromLesson(task: Task, event?: Event) {
    // Prevent event from bubbling up
    event?.stopPropagation();

    // Prevent multiple operations while processing
    if (this.isSubmitting) {
      return;
    }

    // Open confirmation modal
    const modalRef = this.modalService.open(TaskDeleteConfirmationComponent);
    modalRef.componentInstance.taskTitle = task.title;

    modalRef.result.then(
      (result) => {
        if (result === 'confirm') {
          this.isSubmitting = true;
          this.loadingService.show();

          console.log('Deleting task', {
            taskId: task.id,
            taskTitle: task.title,
            selectedId: this.selectedId,
          });

          const collectionName =
            this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';

          // First get the current document to ensure we have the latest data
          this.crudService
            .getDocumentById(collectionName, this.selectedId)
            .subscribe({
              next: (currentLesson: any) => {
                if (!currentLesson) {
                  this.toastr.error('Lesson not found');
                  this.isSubmitting = false;
                  this.loadingService.hide();
                  return;
                }

                // Filter out the task to delete
                const existingTasks = currentLesson.tasks || [];
                const updatedTasks = existingTasks.filter(
                  (t: any) => t.id !== task.id
                );

                console.log('Current lesson:', currentLesson);
                console.log('Updated tasks:', updatedTasks);

                // Update the document with the new tasks array
                this.crudService
                  .updateDocument(collectionName, this.selectedId, {
                    tasks: updatedTasks,
                  })
                  .subscribe({
                    next: () => {
                      console.log('Task deleted successfully');
                      this.toastr.success(
                        "Topshiriq muvaffaqiyatli o'chirildi"
                      );

                      // Update local state
                      this.tasksInLesson = updatedTasks;

                      // Reset task input if we were editing this task
                      if (this.editingTaskId === task.id) {
                        this.cancelTaskEdit();
                      }

                      // Reset submission flag and hide loader
                      this.isSubmitting = false;
                      this.loadingService.hide();
                    },
                    error: (error) => {
                      console.error('Error updating document:', error);
                      this.toastr.error(
                        'Error deleting task: ' +
                          (error.message || 'Unknown error')
                      );
                      this.isSubmitting = false;
                      this.loadingService.hide();
                    },
                  });
              },
              error: (error) => {
                console.error('Error getting lesson document:', error);
                this.toastr.error(
                  'Error getting lesson: ' + (error.message || 'Unknown error')
                );
                this.isSubmitting = false;
                this.loadingService.hide();
              },
            });
        }
      },
      () => {
        // Modal dismissed, do nothing
      }
    );
  }

  editTask(task: Task, event?: Event) {
    // Prevent event from bubbling up to document
    event?.stopPropagation();

    this.editingTaskId = task.id || '';
    this.task.title = task.title || '';
  }

  saveTaskEdit(event?: Event) {
    // Prevent event from bubbling up
    event?.stopPropagation();

    // Prevent multiple operations while processing
    if (this.isSubmitting) {
      return;
    }

    if (!this.task.title) {
      this.toastr.warning('Grafik topshiriqni kiriting');
      return;
    }

    this.isSubmitting = true;
    this.loadingService.show();
    const collectionName =
      this.activeTab === 'lessons' ? 'lessons' : 'website-lessons';

    console.log('Saving edited task', {
      taskId: this.editingTaskId,
      taskTitle: this.task.title,
      selectedId: this.selectedId,
    });

    // First get the current document to ensure we have the latest data
    this.crudService
      .getDocumentById(collectionName, this.selectedId)
      .subscribe({
        next: (currentLesson: any) => {
          if (!currentLesson) {
            this.toastr.error('Lesson not found');
            this.isSubmitting = false;
            this.loadingService.hide();
            return;
          }

          // Find and update the task
          const existingTasks = currentLesson.tasks || [];
          const taskIndex = existingTasks.findIndex(
            (t: any) => t.id === this.editingTaskId
          );

          if (taskIndex === -1) {
            this.toastr.error('Task not found');
            this.isSubmitting = false;
            this.loadingService.hide();
            return;
          }

          // Get the existing task to preserve its structure
          const existingTask = existingTasks[taskIndex];

          // Create updated tasks array
          const updatedTasks = [...existingTasks];
          updatedTasks[taskIndex] = {
            ...existingTask,
            title: this.task.title,
            // Ensure proper structure for firstBasedFiles and secondBasedFiles
            firstBasedFiles: {
              taskExampleFiles: existingTask.firstBasedFiles
                ?.taskExampleFiles || { uz: [], ru: [], en: [] },
              taskSolutionFiles: existingTask.firstBasedFiles
                ?.taskSolutionFiles || { uz: [], ru: [], en: [] },
            },
            secondBasedFiles: {
              taskTitleFiles: existingTask.secondBasedFiles?.taskTitleFiles || {
                uz: [],
                ru: [],
                en: [],
              },
              taskPresentationFiles: existingTask.secondBasedFiles
                ?.taskPresentationFiles || { uz: [], ru: [], en: [] },
              taskLiteratureFiles: existingTask.secondBasedFiles
                ?.taskLiteratureFiles || { uz: [], ru: [], en: [] },
              taskVideoUrls: existingTask.secondBasedFiles?.taskVideoUrls || [],
            },
          };

          console.log('Current lesson:', currentLesson);
          console.log('Updated tasks:', updatedTasks);

          // Update the document with the new tasks array
          this.crudService
            .updateDocument(collectionName, this.selectedId, {
              tasks: updatedTasks,
            })
            .subscribe({
              next: () => {
                console.log('Task updated successfully');
                this.toastr.success('Task updated successfully');

                // Update local state
                this.tasksInLesson = updatedTasks;

                // Reset task editing state
                this.editingTaskId = null;
                this.task.title = '';

                // Reset submission flag and hide loader
                this.isSubmitting = false;
                this.loadingService.hide();
              },
              error: (error) => {
                console.error('Error updating document:', error);
                this.toastr.error(
                  'Error updating task: ' + (error.message || 'Unknown error')
                );
                this.isSubmitting = false;
                this.loadingService.hide();
              },
            });
        },
        error: (error) => {
          console.error('Error getting lesson document:', error);
          this.toastr.error(
            'Error getting lesson: ' + (error.message || 'Unknown error')
          );
          this.isSubmitting = false;
          this.loadingService.hide();
        },
      });
  }

  cancelTaskEdit(event?: Event) {
    // Prevent event from bubbling up
    event?.stopPropagation();

    this.editingTaskId = null;
    this.task.title = '';
  }

  editLesson(lesson: Lesson) {
    this.router.navigate(['/dashboard/create-lesson'], {
      queryParams: { id: lesson.id },
    });
  }

  editCreatedLesson(lesson: Lesson) {
    this.router.navigate(['/dashboard/edit-build'], {
      queryParams: { id: lesson.id },
    });
  }

  switchTab(tab: 'lessons' | 'website-lessons') {
    this.activeTab = tab;
    this.selectedIndex = -1;
    this.selectedId = '';
    this.tasksInLesson = [];
  }

  // Toggle lesson visibility in website
  toggleLessonActive(lesson: Lesson, event?: Event): void {
    if (!lesson.id) return;

    // Prevent event from bubbling up
    event?.stopPropagation();

    this.loadingService.show();

    // Toggle the active state
    const updatedActive = !lesson.active;

    this.crudService
      .updateDocument('website-lessons', lesson.id, {
        active: updatedActive,
      })
      .subscribe(() => {
        this.toastr.success(
          updatedActive ? "Dars saytda ko'rinadi" : "Dars saytda ko'rinmaydi"
        );

        // Update local state
        lesson.active = updatedActive;
        this.loadingService.hide();
      });
  }

  // Handle clicks outside the dropdown
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent) {
    // Get the element that was clicked
    const clickedElement = event.target as HTMLElement;

    // Check if the click was inside a dropdown, action button, toggle switch, or edit button
    const isInsideDropdown = clickedElement.closest('.action-dropdown');
    const isActionButton = clickedElement.closest('.action-btn');
    const isToggleSwitch = clickedElement.closest('.toggle-switch');
    const isToggleInput = clickedElement.closest('input[type="checkbox"]');
    const isEditButton = clickedElement.closest(
      '.action-btn img[src*="edit.png"]'
    );

    // If the click was outside all of these elements, close the dropdown
    if (
      !isInsideDropdown &&
      !isActionButton &&
      !isToggleSwitch &&
      !isToggleInput &&
      !isEditButton
    ) {
      this.closeDropdown();
    }
  }
}
