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
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';
import { switchMap, take, tap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { Lesson, Task, FirstClassFileGroups, SecondClassFileGroups, Videos } from 'src/app/shared/interfaces/interfaces';
import { BehaviorSubject, forkJoin, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./styles/lessons.page.scss', './styles/swiper.styles.scss'],
})
export class LessonsPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @ViewChild('carousel') carousel!: ElementRef;
  @ViewChildren('pdfViewer') pdfViewers!: QueryList<ElementRef>;

  lang = '';
  websiteLessons: Lesson[] = [];
  private thumbnailsLoaded = new BehaviorSubject<number>(0);
  Math = Math;
  iframeErrors: { [key: string]: boolean } = {};

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
      taskSolutionFiles: { uz: [], ru: [], en: [] }
    },
    secondBasedFiles: {
      taskTitleFiles: { uz: [], ru: [], en: [] },
      taskPresentationFiles: { uz: [], ru: [], en: [] },
      taskLiteratureFiles: { uz: [], ru: [], en: [] },
      taskVideoUrls: []
    }
  });

  selectedFiles$ = this.selectedFilesSubject.asObservable();
  selectedFiles = this.selectedFilesSubject.value;

  private currentFileTypeSubject = new BehaviorSubject<string>('taskExampleFiles');
  currentFileType$ = this.currentFileTypeSubject.asObservable();
  currentFileType = this.currentFileTypeSubject.value;

  private sanitizedUrls = new Map<string, SafeResourceUrl>();

  isTaskModalVisible = false;
  selectedTaskId: string | null = null;
  isLiteratureDropdownVisible = false;

  constructor(
    private navService: ToggleNavVisibilityService,
    private crudService: CrudService,
    public dropboxService: DropboxService,
    private activatedRoute: ActivatedRoute,
    private i18n: i18nService,
    private loaderService: LoaderService,
    private sanitizer: DomSanitizer
  ) {
    // Subscribe to selectedFiles changes
    this.selectedFiles$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(files => {
      this.selectedFiles = files;
    });

    // Subscribe to currentFileType changes
    this.currentFileType$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(type => {
      this.currentFileType = type;
    });
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.navService.updateNavState(true);
    this.loadWebsiteLessons();
    window.scrollTo(0, 0);

    this.i18n.currentData
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.lang = lang;
        this.updateFilesOnLanguageChange();
      });

    this.thumbnailsLoaded
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.handleThumbnailsLoaded.bind(this));
  }

  private setupResizeObserver(): void {
    const resizeObserver = new ResizeObserver(() => {
      this.updateSlidePosition();
    });

    const container = document.querySelector('.slides-container');
    if (container) {
      resizeObserver.observe(container);
    }
  }

  private handleThumbnailsLoaded(count: number): void {
    if (
      count > 0 &&
      this.websiteLessons.length > 0 &&
      count === this.websiteLessons.length
    ) {
      this.websiteLessons = [...this.websiteLessons].sort((a, b) => {
        const dateA = new Date(a.createdAt || '').getTime();
        const dateB = new Date(b.createdAt || '').getTime();
        return dateA - dateB;
      });
      this.loaderService.hideLoader();
    }
  }

  loadWebsiteLessons(): void {
    this.crudService
      .getDocuments('website-lessons')
      .pipe(
        switchMap((res: unknown) => {
          const lessons = res as Lesson[];
          if (lessons.length === 0) {
            this.websiteLessons = lessons;
            this.loaderService.hideLoader();
            return of(null);
          }

          const thumbnailRequests = lessons.map((lesson, index) =>
            this.dropboxService.getThumbnail(lesson.thumbnail as string).pipe(
              tap((thumbnailRes) => {
                lessons[index].thumbnail =
                  this.sanitizer.bypassSecurityTrustUrl(
                    URL.createObjectURL(thumbnailRes)
                  );
                this.thumbnailsLoaded.next(this.thumbnailsLoaded.value + 1);
              })
            )
          );

          return forkJoin(thumbnailRequests).pipe(
            tap(() => {
              this.websiteLessons = [...lessons].sort((a, b) => {
                if (a.index && b.index) return a.index - b.index;
                const dateA = new Date(a.createdAt || '').getTime();
                const dateB = new Date(b.createdAt || '').getTime();
                return dateA - dateB;
              });
              this.activatedRoute.params.subscribe((params) => {
                this.selectedLesson =
                  this.websiteLessons.find(
                    (lesson) => lesson.id === params['id']
                  ) || null;
                if (this.selectedLesson) {
                  this.selectSlide(
                    this.websiteLessons.indexOf(this.selectedLesson)
                  );
                  this.setLessonFiles('firstBasedFiles', this.currentFileType);
                }
              });

              this.loaderService.hideLoader();
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        error: (err) => {
          console.error('Error fetching lessons:', err);
          this.loaderService.hideLoader();
        },
      });
  }

  nextSlide(): void {
    const maxIndex = this.websiteLessons.length - 1;
    if (this.currentSlideIndex >= maxIndex) return;
    this.selectSlide(this.currentSlideIndex + 1);
  }

  prevSlide(): void {
    if (this.currentSlideIndex <= 0) return;
    this.selectSlide(this.currentSlideIndex - 1);
  }

  selectSlide(index: number): void {
    if (
      index === this.currentSlideIndex ||
      index < 0 ||
      index >= this.websiteLessons.length
    )
      return;

    this.selectedLesson = this.websiteLessons[index];
    this.currentSlideIndex = index;
    this.currentFileTypeSubject.next('taskExampleFiles');
    
    // Reset and load files immediately
    const newFiles = {
      firstBasedFiles: {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      }
    };

    // Load files for the selected lesson
    if (this.selectedLesson?.tasks) {
      this.selectedLesson.tasks.forEach((task: Task) => {
        const files = task.firstBasedFiles?.taskExampleFiles;
        if (files) {
          newFiles.firstBasedFiles.taskExampleFiles = files;
        }
      });
    }

    this.selectedFilesSubject.next(newFiles);

    // Update carousel position
    this.visibleItems = Math.min(4, this.websiteLessons.length);
    const maxTranslateIndex = Math.max(
      0,
      this.websiteLessons.length - this.visibleItems
    );
    const centerOffset = Math.floor(this.visibleItems / 2);

    if (this.websiteLessons.length <= this.visibleItems) {
      this.currentTranslate = 0;
    } else {
      let idealTranslate =
        -(index - centerOffset) * (this.slideWidth + this.slideGap);
      const minTranslate = -(
        maxTranslateIndex *
        (this.slideWidth + this.slideGap)
      );
      const maxTranslate = 0;
      this.currentTranslate = Math.max(
        minTranslate,
        Math.min(maxTranslate, idealTranslate)
      );
    }

    this.updateSlidePosition();
  }

  private updateSlidePosition(): void {
    requestAnimationFrame(() => {
      const slideContainer = document.querySelector(
        '.slides-wrapper'
      ) as HTMLElement;
      if (slideContainer) {
        slideContainer.style.transform = `translateX(${this.currentTranslate}px)`;
      }
    });
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.isClickableElement(event.target as HTMLElement)) return;
    this.isDragging = true;
    this.startX = event.touches[0].clientX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.endX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  private isClickableElement(element: HTMLElement): boolean {
    const clickableClasses = [
      'overflow-x-scroll',
      'open-btn',
      'download-btn',
      'media-item-body',
      'media-item',
      'position-relative',
      'd-flex',
    ];
    const clickableTags = ['I', 'IMG'];

    return (
      clickableClasses.some((className) =>
        element.classList.contains(className)
      ) || clickableTags.includes(element.nodeName)
    );
  }

  private handleSwipe(): void {
    const threshold = 50;
    const diffX = this.startX - this.endX;

    if (Math.abs(diffX) > threshold) {
      if (
        diffX > 0 &&
        this.currentSlideIndex < this.websiteLessons.length - 1
      ) {
        this.selectSlide(this.currentSlideIndex + 1);
      } else if (diffX < 0 && this.currentSlideIndex > 0) {
        this.selectSlide(this.currentSlideIndex - 1);
      }
    }
  }

  isActiveSlide(index: number): boolean {
    return index === this.currentSlideIndex;
  }

  getTitle(lesson: Lesson): string {
    if (!lesson.lessonTitle || !this.lang) return '';
    return lesson.lessonTitle[this.lang as keyof typeof lesson.lessonTitle] || '';
  }

  openFileInNewTab(filePath: string): void {
    if (!filePath) return;
    this.loaderService.showLoader();
    this.dropboxService
      .openFileInNewTab(filePath)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loaderService.hideLoader(true);
      });
  }

  sanitizeDropboxUrl(url: string): string {
    if (!url) return '';
  
    // Replace 'www.dropbox.com' with 'dl.dropboxusercontent.com'
    let sanitizedUrl = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  
    // Ensure correct query parameters
    sanitizedUrl = sanitizedUrl.replace(/\?dl=0/, '?raw=1').replace(/&dl=0/, '&raw=1');
  
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
      return this.sanitizedUrls.get(url)!;
    }
  
    const sanitizedUrl = this.sanitizePdfUrl(url);
    const encodedUrl = encodeURIComponent(sanitizedUrl);
  
    // Ensure it remains a proper URL
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`
    );
  
    this.sanitizedUrls.set(url, safeUrl);
    console.log('safeUrl', safeUrl);
    return safeUrl;
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
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  setLessonFiles(category: 'firstBasedFiles' | 'secondBasedFiles', fileType: string): void {
    if (!this.selectedLesson?.tasks) return;

    this.isLoadingFile = true;
    this.currentFileTypeSubject.next(fileType);
    this.sanitizedUrls.clear(); // Clear cache when changing files

    const newFiles = {
      firstBasedFiles: {
        taskExampleFiles: { uz: [], ru: [], en: [] },
        taskSolutionFiles: { uz: [], ru: [], en: [] }
      },
      secondBasedFiles: {
        taskTitleFiles: { uz: [], ru: [], en: [] },
        taskPresentationFiles: { uz: [], ru: [], en: [] },
        taskLiteratureFiles: { uz: [], ru: [], en: [] },
        taskVideoUrls: []
      }
    };

    // Find the selected task
    const selectedTask = this.selectedTaskId 
      ? this.selectedLesson.tasks.find(task => task.id === this.selectedTaskId)
      : this.selectedLesson.tasks[0]; // Default to first task if none selected

    if (selectedTask) {
      const files = selectedTask[category]?.[fileType];
      if (files) {
        if (category === 'firstBasedFiles') {
          newFiles.firstBasedFiles[fileType as keyof FirstClassFileGroups] = files;
        } else {
          newFiles.secondBasedFiles[fileType as keyof SecondClassFileGroups] = files;
        }
      }

      console.log('newFiles', newFiles);
    }

    this.selectedFilesSubject.next(newFiles);
    setTimeout(() => {
      this.isLoadingFile = false;
    }, Math.abs(this.currentSlideIndex - this.websiteLessons.length) * 1000);
  }

  private updateFilesOnLanguageChange(): void {
    if (this.selectedLesson) {
      this.setLessonFiles('firstBasedFiles', this.currentFileType);
    }
  }

  onIframeLoad(fileId: string | undefined) {
    if (!fileId) return;
    console.log('✅ PDF loaded successfully!');
    this.iframeErrors[fileId] = false;
  }

  onIframeError(fileId: string | undefined) {
    if (!fileId) return;
    console.log('❌ Error loading PDF');
    this.iframeErrors[fileId] = true;
  }

  hasIframeError(url: string | undefined): boolean {
    if (!url) return false;
    return this.iframeErrors[url] || false;
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
    
    if (this.selectedLesson?.tasks) {
      const newFiles = {
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
      };
      this.selectedFilesSubject.next(newFiles);
    }
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
        en: 'Graphic task variants'
      },
      taskSolutionFiles: {
        uz: 'Grafik topshiriq yechimi namunasi',
        ru: 'Пример решения графического задания',
        en: 'Graphic task solution example'
      },
      taskTitleFiles: {
        uz: 'Ma\'ruza matni',
        ru: 'Текст лекции',
        en: 'Lecture text'
      },
      taskPresentationFiles: {
        uz: 'Prezentasiya',
        ru: 'Презентация',
        en: 'Presentation'
      },
      taskVideoUrls: {
        uz: 'Video material',
        ru: 'Видео материал',
        en: 'Video material'
      },
      taskLiteratureFiles: {
        uz: 'Adabiyotlar',
        ru: 'Литература',
        en: 'Literature'
      }
    };
    return titles[this.currentFileType]?.[this.lang] || '';
  }

  @HostListener('document:click')
  closeTaskModal(): void {
    this.isTaskModalVisible = false;
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const literatureSection = (event.target as HTMLElement).closest('.file-selection-card-item');
    if (!literatureSection) {
      this.isTaskModalVisible = false;
      this.isLiteratureDropdownVisible = false;
    }
  }
}
