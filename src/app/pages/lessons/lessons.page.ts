import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';
import { switchMap, take, tap } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { Lesson, Task, FirstClassFileGroups, SecondClassFileGroups } from 'src/app/shared/interfaces/interfaces';
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

  lang = '';
  websiteLessons: Lesson[] = [];
  private thumbnailsLoaded = new BehaviorSubject<number>(0);
  Math = Math;

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

  selectedFiles: {
    firstBasedFiles: FirstClassFileGroups;
    secondBasedFiles: SecondClassFileGroups;
  } = {
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

  private sanitizedUrls = new Map<string, SafeResourceUrl>();

  constructor(
    private navService: ToggleNavVisibilityService,
    private crudService: CrudService,
    public dropboxService: DropboxService,
    private activatedRoute: ActivatedRoute,
    private i18n: i18nService,
    private loaderService: LoaderService,
    private sanitizer: DomSanitizer
  ) {}

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
    this.setLessonFiles('firstBasedFiles', 'taskExampleFiles');

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
    this.setLessonFiles('firstBasedFiles', 'taskExampleFiles');
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

  sanitizeUrl(url: string): SafeResourceUrl {
    if (!url) return '';
    if (this.sanitizedUrls.has(url)) {
      return this.sanitizedUrls.get(url)!;
    }

    url = url.replace("dl=0", "raw=1");
    const encodedUrl = encodeURIComponent(url);
    const viewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
    this.sanitizedUrls.set(url, safeUrl);
    return safeUrl;
  }

  setLessonFiles(category: 'firstBasedFiles' | 'secondBasedFiles', fileType: string): void {
    if (!this.selectedLesson?.tasks) return;

    // Clear the URL cache when changing files
    this.sanitizedUrls.clear();

    this.selectedFiles = {
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

    this.selectedLesson.tasks.forEach((task: Task) => {
      const files = task[category]?.[fileType];
      if (files) {
        if (category === 'firstBasedFiles') {
          this.selectedFiles.firstBasedFiles[fileType as keyof FirstClassFileGroups] = files;
        } else {
          this.selectedFiles.secondBasedFiles[fileType as keyof SecondClassFileGroups] = files;
        }
      }
    });
  }

  private updateFilesOnLanguageChange(): void {
    if (this.selectedLesson) {
      this.setLessonFiles('firstBasedFiles', 'taskExampleFiles');
    }
  }
}
