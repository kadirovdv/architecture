import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
  Renderer2,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';
import { switchMap, take, tap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import {
  Lesson,
  Task,
  FirstClassFileGroups,
  SecondClassFileGroups,
  Videos,
} from 'src/app/shared/interfaces/interfaces';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SwiperService } from 'src/app/shared/services/swiper.service';
import { LessonsApiService } from 'src/app/shared/services/lessons-api.service';
import type { LessonDetailDto, LessonListItemDto } from 'src/app/shared/models/backend.dto';

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./styles/lessons.page.scss', './styles/swiper.styles.scss'],
})
export class LessonsPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private swiperService = inject(SwiperService);

  @ViewChild('carousel') carousel!: ElementRef;
  @ViewChildren('pdfViewer') pdfViewers!: QueryList<ElementRef>;

  lang = '';
  websiteLessons: Array<LessonListItemDto & { thumbnail?: string }> = [];
  Math = Math;
  iframeErrors: { [key: string]: boolean } = {};
  loadingFiles: { [key: string]: boolean } = {}; // Track loading state for each file

  currentSlideIndex = 0;
  slideWidth = 200;
  activeSlideWidth = 220;
  slideGap = 30;
  currentTranslate = 0;
  visibleItems = 4;
  private startX = 0;
  private endX = 0;
  private isDragging = false;
  selectedLesson: Lesson | null = null;

  currentFileUrl: SafeResourceUrl | null = null;
  isLoadingFile = false;

  private selectedFilesSubject = new BehaviorSubject<{
    firstBasedFiles: FirstClassFileGroups;
    secondBasedFiles: SecondClassFileGroups;
  }>({
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
  });

  selectedFiles$ = this.selectedFilesSubject.asObservable();
  selectedFiles = this.selectedFilesSubject.value;

  private currentFileTypeSubject = new BehaviorSubject<string>(
    'taskExampleFiles'
  );
  currentFileType$ = this.currentFileTypeSubject.asObservable();
  currentFileType = this.currentFileTypeSubject.value;

  // Add property to track selected file index
  currentSelectedFileIndex: number = 0;
  showFileDropdown: boolean = false;

  private sanitizedUrls = new Map<string, SafeResourceUrl>();

  isTaskModalVisible = false;
  selectedTaskId: string | null = null;
  isLiteratureDropdownVisible = false;

  filesQueue: Array<{ type: string; url: string; index: number }> = [];
  currentLoadingIndex = 0;
  filesLoaded: boolean = false;
  loadingInProgress: boolean = false;

  // Add a property to store the swiper instance
  private lessonsSwiper: any = null;

  constructor(
    private navService: ToggleNavVisibilityService,
    private activatedRoute: ActivatedRoute,
    private i18n: i18nService,
    private loaderService: LoaderService,
    private loadingService: LoadingService,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2,
    private lessonsApi: LessonsApiService
  ) {
    // Subscribe to selectedFiles changes
    this.selectedFiles$.pipe(takeUntil(this.destroy$)).subscribe((files) => {
      this.selectedFiles = files;
    });

    // Subscribe to currentFileType changes
    this.currentFileType$.pipe(takeUntil(this.destroy$)).subscribe((type) => {
      this.currentFileType = type;
    });
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngAfterViewInit(): void {
    // Initialize Swiper for lessons carousel
    const lessonsSwiperConfig = {
      slidesPerView: 'auto',
      centeredSlides: false,
      spaceBetween: 20,
      slidesOffsetBefore: 20, // Add space at beginning
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      breakpoints: {
        320: {
          slidesPerView: 'auto',
          spaceBetween: 20,
        },
        480: {
          slidesPerView: 'auto',
          spaceBetween: 20,
        },
        768: {
          slidesPerView: 'auto',
          spaceBetween: 20,
        }
      },
      on: {
        slideChange: (swiper: any) => {
          // Setup slide selection handling
          if (this.websiteLessons && this.websiteLessons.length > 0) {
            this.selectSlide(swiper.activeIndex);
          }
          
          // Use the helper method to update alignment
          this.swiperService.updateSwiperAlignment(swiper, 0.25);
        }
      }
    };
    
    setTimeout(() => {
      this.lessonsSwiper = this.swiperService.initializeSwiper('.lessonsSwiper', lessonsSwiperConfig);
    }, 100);
    
    // Also listen to window resize events
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.navService.updateNavState(true);
    this.loadWebsiteLessons();
    window.scrollTo(0, 0);

    this.i18n.currentData.pipe(takeUntil(this.destroy$)).subscribe((lang) => {
      this.lang = lang;
      this.updateFilesOnLanguageChange();
    });

  }

  loadWebsiteLessons(): void {
    // Show both loaders
    this.loadingService.show();

    this.lessonsApi
      .listLessons({ activeOnly: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lessons) => {
          this.websiteLessons = lessons
            .filter((l) => l.active)
            .map((l) => ({
              ...l,
              thumbnail:
                l.thumbnailUrl ||
                l.exampleResources?.find((r) => r.mimeType?.startsWith('image/'))
                  ?.publicUrl ||
                undefined,
            }))
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          if (this.websiteLessons.length === 0) {
            this.selectedLesson = null;
            this.loaderService.hideLoader(true);
            this.loadingService.hide();
            return;
          }

          this.activatedRoute.params.pipe(take(1)).subscribe((params) => {
            const slug = params['slug'] || params['id'];
            const idx = slug
              ? this.websiteLessons.findIndex((l) => l.slug === slug)
              : 0;
            this.selectSlide(idx >= 0 ? idx : 0);
          });

          this.loaderService.hideLoader(true);
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Error fetching lessons:', err);
          this.websiteLessons = [];
          this.selectedLesson = null;
          this.loaderService.hideLoader(true);
          this.loadingService.hide();
        },
      });
  }

  selectSlide(index: number): void {
    if (
      this.websiteLessons &&
      this.websiteLessons.length > 0 &&
      index >= 0 &&
      index < this.websiteLessons.length
    ) {
      this.currentSlideIndex = index;
      const listLesson = this.websiteLessons[index];
      // set basic selection immediately for header rendering
      this.selectedLesson = listLesson as any;
      
      // Update the URL without reloading the page
      const url = `/pages/lessons/${listLesson.slug}`;
      window.history.replaceState({}, '', url);
      
      // Reset the selected file type and index
      this.currentFileTypeSubject.next('taskExampleFiles');
      this.currentSelectedFileIndex = 0;
      
      // Fetch full lesson detail (tasks + bucketed resources)
      this.isLoadingFile = true;
      this.loadingService.show();
      this.lessonsApi
        .getLesson(listLesson.slug)
        .pipe(take(1), takeUntil(this.destroy$))
        .subscribe({
          next: (detail: LessonDetailDto) => {
            this.selectedLesson = {
              ...listLesson,
              ...detail,
              thumbnail: listLesson.thumbnail,
            } as any;

            this.selectedTaskId = null;
            this.setLessonFiles('firstBasedFiles', 'taskExampleFiles');
            this.isLoadingFile = false;
            this.loadingService.hide();
          },
          error: (err) => {
            console.error('Error fetching lesson detail:', err);
            this.isLoadingFile = false;
            this.loadingService.hide();
          },
        });
      
      // Scroll to top of the content area
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  isActiveSlide(index: number): boolean {
    return index === this.currentSlideIndex;
  }

  isHiddenSlide(index: number): boolean {
    return false; // No slides are hidden with Swiper
  }

  getTitle(lesson: any): string {
    return lesson?.title || '';
  }

  openFileInNewTab(filePath: string): void {
    if (!filePath) return;
    this.loaderService.showLoader();
    this.loadingService.show();
    window.open(this.sanitizeDropboxUrl(filePath), '_blank');
    this.loaderService.hideLoader(true);
    this.loadingService.hide();
  }

  sanitizeDropboxUrl(url: string): string {
    if (!url) return '';

    // Replace 'www.dropbox.com' with 'dl.dropboxusercontent.com'
    let sanitizedUrl = url.replace(
      'www.dropbox.com',
      'dl.dropboxusercontent.com'
    );

    // Ensure correct query parameters
    sanitizedUrl = sanitizedUrl
      .replace(/\?dl=0/, '?raw=1')
      .replace(/&dl=0/, '&raw=1');

    return sanitizedUrl;
  }

  sanitizePdfUrl(url: string): string {
    if (!url) return '';

    // Fixing Dropbox URL formatting
    let sanitizedUrl = this.sanitizeDropboxUrl(url);
    sanitizedUrl = sanitizedUrl.replace(/\?([^=]+=[^&]*)\?/g, '?$1&'); // Fix multiple '?'

    if (sanitizedUrl.toLowerCase().endsWith('.pdf')) {
      return sanitizedUrl;
    }
    return sanitizedUrl;
  }

  sanitizeUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;

    if (this.sanitizedUrls.has(url)) {
      return this.sanitizedUrls.get(url) as SafeResourceUrl;
    }

    try {
      const sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.sanitizedUrls.set(url, sanitizedUrl);
      return sanitizedUrl;
    } catch (error) {
      console.error('Error sanitizing URL:', error);
      return null;
    }
  }

  getRawUrl(url: string, type = 'pdf'): string {
    return this.sanitizePdfUrl(url) || '';
  }

  getVideoUrl(video: Videos): string {
    if (!video?.url || !this.lang) return '';
    return video.url[this.lang as keyof typeof video.url] || '';
  }

  getVideoName(video: Videos): string {
    if (!video?.name || !this.lang) return '';
    return video.name[this.lang as keyof typeof video.name] || '';
  }

  getEmbeddedVideoUrl(url: string): SafeResourceUrl {
    if (!url) return '';

    const videoId = this.extractYoutubeId(url);
    if (!videoId) return '';

    const embeddedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (this.sanitizedUrls.has(embeddedUrl)) {
      return this.sanitizedUrls.get(embeddedUrl)!;
    }
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embeddedUrl);
    this.sanitizedUrls.set(embeddedUrl, safeUrl);
    return safeUrl;
  }

  private extractYoutubeId(url: string): string | null {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  }

  isYoutubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  setLessonFiles(
    category: 'firstBasedFiles' | 'secondBasedFiles',
    fileType: string
  ): void {
    if (!this.selectedLesson?.tasks) return;

    this.isLoadingFile = true;
    this.currentFileTypeSubject.next(fileType);
    this.currentSelectedFileIndex = 0; // Reset the selected file index
    this.showFileDropdown = false; // Hide dropdown when changing file type
    this.sanitizedUrls.clear(); // Clear cache when changing files
    this.filesQueue = []; // Reset files queue
    this.currentLoadingIndex = 0;
    this.filesLoaded = false;
    this.loadingInProgress = false;

    // Create empty files structure with all empty collections
    const newFiles = {
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

    // Find the selected task
    const selectedTask = this.selectedTaskId
      ? this.selectedLesson.tasks.find(
          (task) => task.id === this.selectedTaskId
        )
      : this.selectedLesson.tasks[0]; // Default to first task if none selected

    if (selectedTask) {
      // Only set the files for the specific category and file type requested
      if (category === 'firstBasedFiles') {
        if (
          fileType === 'taskExampleFiles' &&
          selectedTask.firstBasedFiles?.taskExampleFiles
        ) {
          newFiles.firstBasedFiles.taskExampleFiles =
            selectedTask.firstBasedFiles.taskExampleFiles;
        } else if (
          fileType === 'taskSolutionFiles' &&
          selectedTask.firstBasedFiles?.taskSolutionFiles
        ) {
          newFiles.firstBasedFiles.taskSolutionFiles =
            selectedTask.firstBasedFiles.taskSolutionFiles;
        }
      } else if (category === 'secondBasedFiles') {
        if (
          fileType === 'taskTitleFiles' &&
          selectedTask.secondBasedFiles?.taskTitleFiles
        ) {
          newFiles.secondBasedFiles.taskTitleFiles =
            selectedTask.secondBasedFiles.taskTitleFiles;
        } else if (
          fileType === 'taskPresentationFiles' &&
          selectedTask.secondBasedFiles?.taskPresentationFiles
        ) {
          newFiles.secondBasedFiles.taskPresentationFiles =
            selectedTask.secondBasedFiles.taskPresentationFiles;
        } else if (
          fileType === 'taskLiteratureFiles' &&
          selectedTask.secondBasedFiles?.taskLiteratureFiles
        ) {
          newFiles.secondBasedFiles.taskLiteratureFiles =
            selectedTask.secondBasedFiles.taskLiteratureFiles;
        } else if (
          fileType === 'taskVideoUrls' &&
          selectedTask.secondBasedFiles?.taskVideoUrls
        ) {
          newFiles.secondBasedFiles.taskVideoUrls =
            selectedTask.secondBasedFiles.taskVideoUrls;
        }
      }

      console.log(
        `Setting files for ${category}.${fileType} from task ${selectedTask.id}`
      );
    }

    this.selectedFilesSubject.next(newFiles);

    // Build the files queue for the specific category and file type
    this.buildFilesQueue(category, fileType, newFiles);

    // Start loading files after a short delay
    setTimeout(() => {
      this.isLoadingFile = false;
      this.loadNextFile();
    }, 100);
  }

  // Build a queue of files to load
  private buildFilesQueue(
    category: 'firstBasedFiles' | 'secondBasedFiles',
    fileType: string,
    newFiles: any
  ): void {
    // Clear existing queue first
    this.filesQueue = [];

    console.log(`Building files queue for ${category}.${fileType}`);

    if (category === 'firstBasedFiles') {
      if (
        fileType === 'taskExampleFiles' &&
        newFiles.firstBasedFiles.taskExampleFiles
      ) {
        const filesObj = newFiles.firstBasedFiles.taskExampleFiles;
        if (this.lang in filesObj && Array.isArray(filesObj[this.lang])) {
          filesObj[this.lang].forEach((file: any, index: number) => {
            if (file && file.url) {
              this.filesQueue.push({
                type: 'pdf',
                url: file.url,
                index,
              });
            }
          });
        }
      } else if (
        fileType === 'taskSolutionFiles' &&
        newFiles.firstBasedFiles.taskSolutionFiles
      ) {
        const filesObj = newFiles.firstBasedFiles.taskSolutionFiles;
        if (this.lang in filesObj && Array.isArray(filesObj[this.lang])) {
          filesObj[this.lang].forEach((file: any, index: number) => {
            if (file && file.url) {
              this.filesQueue.push({
                type: 'pdf',
                url: file.url,
                index,
              });
            }
          });
        }
      }
    } else if (category === 'secondBasedFiles') {
      if (
        fileType === 'taskVideoUrls' &&
        Array.isArray(newFiles.secondBasedFiles.taskVideoUrls)
      ) {
        const videos = newFiles.secondBasedFiles.taskVideoUrls;
        videos.forEach((video: any, index: number) => {
          const url = this.getVideoUrl(video);
          if (url) {
            this.filesQueue.push({
              type: 'video',
              url: url,
              index,
            });
          }
        });
      } else {
        // Handle all other secondBasedFiles types (taskTitleFiles, taskPresentationFiles, taskLiteratureFiles)
        const filesObj = newFiles.secondBasedFiles[
          fileType as keyof SecondClassFileGroups
        ] as any;
        if (
          filesObj &&
          this.lang in filesObj &&
          Array.isArray(filesObj[this.lang])
        ) {
          filesObj[this.lang].forEach((file: any, index: number) => {
            if (file && file.url) {
              this.filesQueue.push({
                type: 'pdf',
                url: file.url,
                index,
              });
            }
          });
        }
      }
    }

    console.log(`Added ${this.filesQueue.length} files to the queue`);
  }

  // Load the next file in the queue
  loadNextFile(): void {
    if (this.currentLoadingIndex >= this.filesQueue.length) {
      console.log('All files loaded');
      this.filesLoaded = true;
      return;
    }

    if (this.loadingInProgress) {
      console.log('Loading in progress, waiting...');
      // If loading is stuck for some reason, set a timeout to force continue
      setTimeout(() => {
        console.log('Force continuing load sequence after timeout');
        this.loadingInProgress = false;
        this.loadNextFile();
      }, 5000); // 5 second backup timeout
      return;
    }

    this.loadingInProgress = true;

    const fileInfo = this.filesQueue[this.currentLoadingIndex];
    console.log(
      `Loading file ${this.currentLoadingIndex + 1}/${
        this.filesQueue.length
      }: ${fileInfo.url}`
    );

    // Set the loading state for this file to true
    if (fileInfo.url) {
      this.loadingFiles[fileInfo.url] = true;
    }

    // Increment the index to show the next file
    this.currentLoadingIndex++;

    // Set a fallback timer in case the iframe load/error events don't fire
    // This ensures the sequence continues even if there are issues
    setTimeout(() => {
      if (this.loadingInProgress) {
        console.log(`Fallback timer triggered for file: ${fileInfo.url}`);
        this.loadingInProgress = false;
        this.loadNextFile();
      }
    }, 10000); // 10 second fallback
  }

  // Check if a file should be visible based on its index
  shouldShowFile(index: number): boolean {
    return index < this.currentLoadingIndex;
  }

  // Check if a file is currently loading
  isFileLoading(url: string | undefined): boolean {
    return url ? this.loadingFiles[url] === true : false;
  }

  onIframeLoad(fileId: string | undefined) {
    if (!fileId) {
      console.log('Warning: iframe loaded but fileId is undefined');
      setTimeout(() => {
        this.loadingInProgress = false;
        this.loadNextFile();
      }, 1000);
      return;
    }

    console.log(`✅ PDF loaded successfully: ${fileId}`);
    this.iframeErrors[fileId] = false;
    this.loadingFiles[fileId] = false; // Set loading state to false

    // Mark the current file as loaded and load the next one
    this.loadingInProgress = false;

    // Use setTimeout to give the browser a chance to finish rendering
    setTimeout(() => {
      this.loadNextFile();
    }, 1000); // 1000ms (1 second) delay between loading files
  }

  onIframeError(fileId: string | undefined) {
    if (!fileId) {
      console.log('Warning: iframe error but fileId is undefined');
      setTimeout(() => {
        this.loadingInProgress = false;
        this.loadNextFile();
      }, 1000);
      return;
    }

    console.log(`❌ Error loading PDF: ${fileId}`);
    this.iframeErrors[fileId] = true;
    this.loadingFiles[fileId] = false; // Set loading state to false

    // Even if there's an error, we should move on to the next file
    this.loadingInProgress = false;
    setTimeout(() => {
      this.loadNextFile();
    }, 1000);
  }

  onDocViewerLoad(fileId: string | undefined) {
    if (fileId) {
      // Mark the file as loaded
      this.iframeErrors[fileId] = false;
      this.loadingFiles[fileId] = false; // Set loading state to false
    }
  }

  onDocViewerError(event: any, fileId: string | undefined) {
    console.error('Doc viewer error:', event);
    if (fileId) {
      // Mark the file as having an error
      this.iframeErrors[fileId] = true;
      this.loadingFiles[fileId] = false; // Set loading state to false
    }
  }

  hasIframeError(url: string | undefined): boolean {
    return url ? this.iframeErrors[url] === true : false;
  }

  toggleTaskModal(event: Event): void {
    event.stopPropagation();
    this.isTaskModalVisible = !this.isTaskModalVisible;
    if (!this.isTaskModalVisible) {
      this.selectedTaskId = null;
    }
  }

  selectTask(event: Event, task: Task): void {
    event.stopPropagation();
    if (!task.id) return;

    this.selectedTaskId = task.id;
    this.isTaskModalVisible = false;

    // Reset loading states and clear queues
    this.filesQueue = [];
    this.currentLoadingIndex = 0;
    this.filesLoaded = false;
    this.loadingInProgress = false;

    // Set the file type to taskExampleFiles by default
    this.currentFileTypeSubject.next('taskExampleFiles');

    // Only load the taskExampleFiles for this task
    const exampleFiles = task.firstBasedFiles?.taskExampleFiles || {
      uz: [],
      ru: [],
      en: [],
    };

    // Create new files object with only the selected task's default file type
    const newFiles = {
      firstBasedFiles: {
        taskExampleFiles: exampleFiles,
        taskSolutionFiles: { uz: [], ru: [], en: [] },
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: [],
      },
    };

    // Update the selected files
    this.selectedFilesSubject.next(newFiles);

    // Build the files queue for just the taskExampleFiles
    this.buildFilesQueue('firstBasedFiles', 'taskExampleFiles', newFiles);

    // Start loading files after a short delay
    setTimeout(() => {
      this.loadNextFile();
    }, 100);
  }

  isTaskSelected(task: Task): boolean {
    return task.id === this.selectedTaskId;
  }

  getTaskTitle(task: Task, index: number): string {
    return task.title || `Task ${index + 1}`;
  }

  getSelectedFilesTitle(): string {
    const titles: { [key: string]: { [key: string]: string } } = {
      taskExampleFiles: {
        uz: 'Grafik topshiriq variantlari',
        ru: 'Варианты графического задания',
        en: 'Graphic task variants',
      },
      taskSolutionFiles: {
        uz: 'Grafik topshiriq yechimi namunasi',
        ru: 'Пример решения графического задания',
        en: 'Graphic task solution example',
      },
      taskTitleFiles: {
        uz: "Ma'ruza matni",
        ru: 'Текст лекции',
        en: 'Lecture text',
      },
      taskPresentationFiles: {
        uz: 'Prezentasiya',
        ru: 'Презентация',
        en: 'Presentation',
      },
      taskVideoUrls: {
        uz: 'Video material',
        ru: 'Видео материал',
        en: 'Video material',
      },
      taskLiteratureFiles: {
        uz: 'Adabiyotlar',
        ru: 'Литература',
        en: 'Literature',
      },
    };
    return titles[this.currentFileType]?.[this.lang] || '';
  }

  @HostListener('document:click')
  closeTaskModal(): void {
    this.isTaskModalVisible = false;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;
    const literatureSection = clickedElement.closest(
      '.file-selection-card-item'
    );
    const insideLiteratureDropdown = clickedElement.closest(
      '.literature-dropdown'
    );
    const fileDropdown = clickedElement.closest('.file-selector-dropdown');
    const isButton =
      clickedElement.closest('button') ||
      clickedElement.tagName === 'BUTTON' ||
      clickedElement.tagName === 'I' ||
      clickedElement.parentElement?.tagName === 'BUTTON';

    if (!literatureSection && !insideLiteratureDropdown && !isButton) {
      this.isTaskModalVisible = false;
      this.isLiteratureDropdownVisible = false;
    }

    if (!fileDropdown && this.showFileDropdown) {
      this.showFileDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.showFileDropdown = false;
    this.isTaskModalVisible = false;
    this.isLiteratureDropdownVisible = false;
  }

  formatFileSize(sizeInBytes: number): string {
    if (!sizeInBytes) return '2.2 MB';

    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;

    if (sizeInMB >= 1) {
      return `${sizeInMB.toFixed(2)} MB`;
    } else {
      return `${sizeInKB.toFixed(2)} KB`;
    }
  }

  handleFileClick(event: Event, url?: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (url) {
      const downloadUrl = this.sanitizeDropboxUrl(url);
      window.open(downloadUrl, '_blank');
    }
  }

  openInNewTab(event: Event, url?: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (!url) return;

    this.loaderService.showLoader();
    this.loadingService.show();
    window.open(this.sanitizeDropboxUrl(url), '_blank');
    this.loaderService.hideLoader(true);
    this.loadingService.hide();
  }

  downloadFile(event: Event, url?: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (!url) return;

    this.loaderService.showLoader();
    this.loadingService.show();
    window.open(this.sanitizeDropboxUrl(url), '_blank');
    this.loaderService.hideLoader(true);
    this.loadingService.hide();
  }
  toggleLiteratureDropdown(event: Event): void {
    event.stopPropagation();

    this.isLiteratureDropdownVisible = !this.isLiteratureDropdownVisible;

    if (this.isLiteratureDropdownVisible) {
      this.setLessonFiles('secondBasedFiles', 'taskLiteratureFiles');
    }
  }

  // Add a reloadFile method to allow retrying failed loads
  reloadFile(index: number): void {
    console.log(`Attempting to reload file at index ${index}`);

    if (index >= 0 && index < this.filesQueue.length) {
      const fileInfo = this.filesQueue[index];

      // Clear the error flag for this file
      if (fileInfo.url) {
        console.log(`Clearing error for file: ${fileInfo.url}`);
        this.iframeErrors[fileInfo.url] = false;
        this.loadingFiles[fileInfo.url] = true; // Set loading state to true for reload
      }

      // Force re-render of the iframe
      // We'll use a workaround by temporarily removing the file from visible files
      const currentIndex = this.currentLoadingIndex;

      // If we're trying to reload a file that's already been shown
      if (index < currentIndex) {
        // Temporarily hide all files after this one
        this.currentLoadingIndex = index;

        // Then after a short delay, restore them
        setTimeout(() => {
          this.currentLoadingIndex = currentIndex;
        }, 100);
      }
    } else {
      console.error(`Invalid file index for reload: ${index}`);
    }
  }

  // Update other methods
  private updateFilesOnLanguageChange(): void {
    if (this.selectedLesson) {
      this.filesQueue = []; // Clear files queue
      this.currentLoadingIndex = 0;
      this.filesLoaded = false;
      this.loadingInProgress = false;
      this.setLessonFiles('firstBasedFiles', this.currentFileType);
    }
  }

  getSelectedTaskTitle(): string {
    if (!this.selectedLesson?.tasks) return '';

    const selectedTask = this.selectedTaskId
      ? this.selectedLesson.tasks.find(
          (task) => task.id === this.selectedTaskId
        )
      : this.selectedLesson.tasks[0];

    if (!selectedTask) return '';

    const index = this.selectedLesson.tasks.indexOf(selectedTask);
    return selectedTask.title || `Task ${index + 1}`;
  }

  // Get the current file URL for download
  getCurrentFileUrl(): string | undefined {
    try {
      if (this.currentFileType === 'taskVideoUrls') {
        const videos = this.selectedFiles.secondBasedFiles.taskVideoUrls;
        if (videos && videos.length > this.currentSelectedFileIndex) {
          const video = videos[this.currentSelectedFileIndex];
          return this.getVideoUrl(video);
        }
        return undefined;
      }

      if (
        this.currentFileType === 'taskExampleFiles' ||
        this.currentFileType === 'taskSolutionFiles'
      ) {
        const files =
          this.selectedFiles.firstBasedFiles[this.currentFileType]?.[this.lang];
        if (files && files.length > this.currentSelectedFileIndex) {
          return files[this.currentSelectedFileIndex].path || files[this.currentSelectedFileIndex].url;
        }
      }
      else if (
        this.currentFileType === 'taskTitleFiles' ||
        this.currentFileType === 'taskPresentationFiles' ||
        this.currentFileType === 'taskLiteratureFiles'
      ) {
        const files =
          this.selectedFiles.secondBasedFiles[this.currentFileType]?.[
            this.lang
          ];
        if (files && files.length > this.currentSelectedFileIndex) {
          return files[this.currentSelectedFileIndex].path || files[this.currentSelectedFileIndex].url;
        }
      }

      return undefined;
    } catch (error) {
      console.error('Error getting current file URL:', error);
      return undefined;
    }
  }

  // Add this method to toggle the file dropdown
  toggleFileDropdown(event: Event): void {
    event.stopPropagation();
    this.showFileDropdown = !this.showFileDropdown;
  }

  // Add this method to select a specific file from the dropdown
  selectFile(event: Event, index: number): void {
    event.stopPropagation();
    this.currentSelectedFileIndex = index;
    this.showFileDropdown = false;
  }

  // Add this method to check if there are multiple files for the current type
  hasMultipleFiles(): boolean {
    if (this.currentFileType === 'taskExampleFiles' || this.currentFileType === 'taskSolutionFiles') {
      const files = this.selectedFiles.firstBasedFiles[this.currentFileType]?.[this.lang];
      return !!files && files.length > 1;
    } else if (
      this.currentFileType === 'taskTitleFiles' || 
      this.currentFileType === 'taskPresentationFiles' || 
      this.currentFileType === 'taskLiteratureFiles'
    ) {
      const files = this.selectedFiles.secondBasedFiles[this.currentFileType]?.[this.lang];
      return !!files && files.length > 1;
    } else if (this.currentFileType === 'taskVideoUrls') {
      const videos = this.selectedFiles.secondBasedFiles.taskVideoUrls;
      return !!videos && videos.length > 1;
    }
    return false;
  }

  // Add this method to get the current file name
  getCurrentFileName(): string {
    try {
      if (this.currentFileType === 'taskVideoUrls') {
        const videos = this.selectedFiles.secondBasedFiles.taskVideoUrls;
        if (videos && videos.length > this.currentSelectedFileIndex) {
          return this.getVideoName(videos[this.currentSelectedFileIndex]);
        }
        return '';
      }

      if (this.currentFileType === 'taskExampleFiles' || this.currentFileType === 'taskSolutionFiles') {
        const files = this.selectedFiles.firstBasedFiles[this.currentFileType]?.[this.lang];
        if (files && files.length > this.currentSelectedFileIndex) {
          return files[this.currentSelectedFileIndex].name || `File ${this.currentSelectedFileIndex + 1}`;
        }
      } else if (
        this.currentFileType === 'taskTitleFiles' ||
        this.currentFileType === 'taskPresentationFiles' ||
        this.currentFileType === 'taskLiteratureFiles'
      ) {
        const files = this.selectedFiles.secondBasedFiles[this.currentFileType]?.[this.lang];
        if (files && files.length > this.currentSelectedFileIndex) {
          return files[this.currentSelectedFileIndex].name || `File ${this.currentSelectedFileIndex + 1}`;
        }
      }
      return '';
    } catch (error) {
      console.error('Error getting current file name:', error);
      return '';
    }
  }

  // Add this method to get the number of files
  getFileCount(): number {
    if (this.currentFileType === 'taskExampleFiles' || this.currentFileType === 'taskSolutionFiles') {
      const files = this.selectedFiles.firstBasedFiles[this.currentFileType]?.[this.lang];
      return files ? files.length : 0;
    } else if (
      this.currentFileType === 'taskTitleFiles' ||
      this.currentFileType === 'taskPresentationFiles' ||
      this.currentFileType === 'taskLiteratureFiles'
    ) {
      const files = this.selectedFiles.secondBasedFiles[this.currentFileType]?.[this.lang];
      return files ? files.length : 0;
    } else if (this.currentFileType === 'taskVideoUrls') {
      return this.selectedFiles.secondBasedFiles.taskVideoUrls?.length || 0;
    }
    return 0;
  }

  // Add this method to get all files for the current type
  getAllFilesForCurrentType(): any[] {
    if (this.currentFileType === 'taskExampleFiles' || this.currentFileType === 'taskSolutionFiles') {
      return this.selectedFiles.firstBasedFiles[this.currentFileType]?.[this.lang] || [];
    } else if (
      this.currentFileType === 'taskTitleFiles' ||
      this.currentFileType === 'taskPresentationFiles' ||
      this.currentFileType === 'taskLiteratureFiles'
    ) {
      return this.selectedFiles.secondBasedFiles[this.currentFileType]?.[this.lang] || [];
    } else if (this.currentFileType === 'taskVideoUrls') {
      return this.selectedFiles.secondBasedFiles.taskVideoUrls || [];
    }
    return [];
  }

  private handleResize() {
    // Update swiper on resize to ensure proper layout
    if (this.lessonsSwiper) {
      this.lessonsSwiper.update();
    }
  }
}
