import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Lesson } from 'src/app/shared/interfaces/interfaces';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { SwiperService } from 'src/app/shared/services/swiper.service';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';

interface News {
  id: string;
  title: {
    uz: string;
    ru: string;
    en: string;
  };
  link: {
    uz: string;
    ru: string;
    en: string;
  };
  createdAt: string;
}

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: [
    './styles/header.styles.scss',
    './styles/rest.styles.scss',
    './styles/swiper.styles.scss',
  ],
})
export class MainPage {
  websiteLessons: any[] = [];
  skeletonLessons: any[] = [];
  isLoadingThumbnails = true;
  public lang = '';
  private thumbnailsLoaded = new BehaviorSubject<number>(0);
  newsList: News[] = [];

  // Main carousel
  currentSlide = 0;
  loading = false;
  private startX = 0;
  private endX = 0;

  @ViewChild('carousel') carousel!: ElementRef;

  // Add a property to store the swiper instance
  private lessonsSwiper: any = null;

  constructor(
    private swiperService: SwiperService,
    private navService: ToggleNavVisibilityService,
    private crudService: CrudService,
    private i18n: i18nService,
    private loaderService: LoadingService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {
    window.scroll(0, 0);
  }

  ngOnInit() {
    this.navService.updateNavState(false);
    // this.loaderService.show();
    this.getData();
    this.loadNews();

    this.i18n.currentData.subscribe((lang) => {
      this.lang = lang;
    });

    this.thumbnailsLoaded.subscribe((count) => {
      if (
        count > 0 &&
        this.websiteLessons.length > 0 &&
        count === this.websiteLessons.length
      ) {
        this.websiteLessons = [...this.websiteLessons].sort((a, b) => {
          // Use the index property for sorting (default to 0 if not present)
          const indexA = typeof a.index === 'number' ? a.index : 0;
          const indexB = typeof b.index === 'number' ? b.index : 0;
          return indexA - indexB;
        });
        this.isLoadingThumbnails = false;
      }
    });
  }

  ngAfterViewInit(): void {
    // Main carousel swiper config
    const swiperConfig = {
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    };
    this.swiperService.initializeSwiper('.mySwiper', swiperConfig);
    
    // Lessons carousel swiper config - starting from left
    const lessonsSwiperConfig = {
      slidesPerView: 'auto',
      centeredSlides: false,
      spaceBetween: 80,
      slidesOffsetBefore: 50,
      slidesOffsetAfter: 50,
      normalizeSlideIndex: true,
      watchSlidesProgress: true,
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
          spaceBetween: 70,
        },
        480: {
          slidesPerView: 'auto',
          spaceBetween: 75,
        },
        768: {
          slidesPerView: 'auto',
          spaceBetween: 80,
        }
      },
      on: {
        slideChange: (swiper: any) => {
          // Use the helper method to update alignment
          this.swiperService.updateSwiperAlignment(swiper, 0.25);
        },
        init: (swiper: any) => {
          // Force update layout after initialization
          setTimeout(() => {
            swiper.updateSize();
            swiper.updateSlides();
          }, 100);
        }
      }
    };
    
    // Initialize the lessons swiper after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.lessonsSwiper = this.swiperService.initializeSwiper('.lessonsSwiper', lessonsSwiperConfig);
    }, 100);
  }

  ngOnDestroy() {
    // Clean up event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize() {
    // Update swiper on resize to ensure proper layout
    if (this.lessonsSwiper) {
      this.lessonsSwiper.update();
    }
  }

  getData() {
    this.crudService
      .getDocuments('website-lessons')
      .pipe(
        switchMap((res: unknown) => {
          const allLessons = res as Lesson[];
          // Filter for active lessons only
          const lessons = allLessons.filter((lesson) => lesson.active);

          // Hide loader regardless of whether we have lessons or not
          this.loaderService.hide();

          if (lessons.length === 0) {
            this.websiteLessons = [];
            this.skeletonLessons = [];
            this.isLoadingThumbnails = false;
            return of(null);
          }
          
          // Create skeleton loaders immediately based on lesson count
          this.skeletonLessons = Array(lessons.length).fill(null).map((_, i) => ({
            id: `skeleton-${i}`,
            lessonTitle: { uz: 'Loading...', ru: 'Loading...', en: 'Loading...' },
            thumbnail: null
          }));
          
          // Store the lessons without thumbnails
          this.websiteLessons = [...lessons];
          
          const thumbnailRequests = lessons.map((lesson, index) =>
            this.dropboxService.getThumbnail(lesson.thumbnail as string).pipe(
              tap((thumbnailRes) => {
                this.websiteLessons[index].thumbnail =
                  this.sanitizer.bypassSecurityTrustUrl(
                    URL.createObjectURL(thumbnailRes)
                  );
                this.thumbnailsLoaded.next(this.thumbnailsLoaded.value + 1);
              })
            )
          );

          return forkJoin(thumbnailRequests).pipe(
            tap(() => {
              // Sort by index instead of createdAt
              this.websiteLessons = [...this.websiteLessons].sort(
                (a: Lesson, b: Lesson) => {
                  // Use the index property for sorting (default to 0 if not present)
                  const indexA = typeof a.index === 'number' ? a.index : 0;
                  const indexB = typeof b.index === 'number' ? b.index : 0;
                  return indexA - indexB;
                }
              );
              this.isLoadingThumbnails = false;
              this.loaderService.hide();
            })
          );
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Error fetching lessons:', err);
          this.isLoadingThumbnails = false;
          this.loaderService.hide();
        },
      });
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % 3;
  }

  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + 3) % 3;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  goToSlideByItemTitle(title: string): void {
    // const index = Object.keys(this.theme.files).findIndex(
    //   (key) => this.theme.files[key].title === title
    // );
    // this.currentSlide = index;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (
      (event.target as HTMLElement).classList.contains('overflow-x-scroll') ||
      (event.target as HTMLElement).classList.contains('open-btn') ||
      (event.target as HTMLElement).classList.contains('download-btn') ||
      (event.target as HTMLElement).classList.contains('media-item-body') ||
      (event.target as HTMLElement).classList.contains('media-item') ||
      (event.target as HTMLElement).classList.contains('position-relative') ||
      (event.target as HTMLElement).classList.contains('d-flex') ||
      (event.target as HTMLElement).nodeName === 'I' ||
      (event.target as HTMLElement).nodeName === 'IMG'
    ) {
      return;
    }
    this.startX = event.touches[0].clientX;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (
      (event.target as HTMLElement).classList.contains('overflow-x-scroll') ||
      (event.target as HTMLElement).classList.contains('open-btn') ||
      (event.target as HTMLElement).classList.contains('download-btn') ||
      (event.target as HTMLElement).classList.contains('media-item-body') ||
      (event.target as HTMLElement).classList.contains('media-item') ||
      (event.target as HTMLElement).classList.contains('position-relative') ||
      (event.target as HTMLElement).classList.contains('d-flex') ||
      (event.target as HTMLElement).nodeName === 'I' ||
      (event.target as HTMLElement).nodeName === 'IMG'
    ) {
      return;
    }
    this.endX = event.changedTouches[0].clientX;
    this.handleSwipe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      (event.target as HTMLElement).classList.contains('news-card-dropdown') ||
      (event.target as HTMLElement).classList.contains('news-card') ||
      (event.target as HTMLElement).classList.contains('news-card-body') ||
      (event.target as HTMLElement).classList.contains(
        'news-card-dropdown-body-item'
      ) ||
      (event.target as HTMLElement).classList.contains(
        'news-card-title'
      ) ||
      (event.target as HTMLElement).classList.contains(
        'dropdown-icon'
      )
    ) {
      this.isNewsDropdownVisible = true;
    } else {
      this.isNewsDropdownVisible = false;
    }
  }

  private handleSwipe(): void {
    const threshold = 50;
    const diffX = this.startX - this.endX;

    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
  }

  // Load news for the main page
  loadNews() {
    this.crudService.getDocuments('news').subscribe({
      next: (data) => {
        this.newsList = data as News[];
        // Sort by date (newest first)
        this.newsList.sort((a, b) => {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        // Limit to 5 most recent news items
        this.newsList = this.newsList.slice(0, 5);
      },
      error: (error) => {
        console.error('Error loading news:', error);
      },
    });
  }

  // Helper methods for multilingual content
  getNewsTitle(news: News): string {
    if (!news?.title) return '';
    return (
      news.title[this.lang as keyof typeof news.title] ||
      news.title.uz ||
      news.title.ru ||
      news.title.en ||
      ''
    );
  }

  getNewsLink(news: News): string {
    if (!news?.link) return '';
    return (
      news.link[this.lang as keyof typeof news.link] ||
      news.link.uz ||
      news.link.ru ||
      news.link.en ||
      ''
    );
  }

  isNewsDropdownVisible = false;

  toggleNewsCardDropdown() {
    this.isNewsDropdownVisible = !this.isNewsDropdownVisible;
  }
}
