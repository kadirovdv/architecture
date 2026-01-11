import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { SwiperService } from 'src/app/shared/services/swiper.service';
import { LoadingService } from 'src/app/shared/services/loading.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';
import { LessonsApiService } from 'src/app/shared/services/lessons-api.service';
import type { LessonListItemDto } from 'src/app/shared/models/backend.dto';

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
  websiteLessons: Array<LessonListItemDto & { thumbnail?: string | null }> = [];
  skeletonLessons: any[] = [];
  isLoadingThumbnails = true;
  public lang = '';
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
    private i18n: i18nService,
    private loaderService: LoadingService,
    private lessonsApi: LessonsApiService
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
    this.loaderService.show();
    this.isLoadingThumbnails = true;

    this.lessonsApi.listLessons({ activeOnly: true }).subscribe({
      next: (lessons) => {
        this.websiteLessons = lessons
          .filter((l) => l.active)
          .map((l) => ({
            ...l,
            thumbnail:
              l.thumbnailUrl ||
              l.exampleResources?.find((r) => r.mimeType?.startsWith('image/'))
                ?.publicUrl ||
              null,
          }))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        this.skeletonLessons = Array(this.websiteLessons.length)
          .fill(null)
          .map((_, i) => ({
            id: `skeleton-${i}`,
            title: 'Loading...',
            thumbnail: null,
          }));

              this.isLoadingThumbnails = false;
              this.loaderService.hide();
      },
        error: (err) => {
          console.error('Error fetching lessons:', err);
        this.websiteLessons = [];
        this.skeletonLessons = [];
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
    try {
      const raw = localStorage.getItem('news');
      const parsed = raw ? (JSON.parse(raw) as News[]) : [];
      this.newsList = Array.isArray(parsed) ? parsed : [];
      this.newsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.newsList = this.newsList.slice(0, 5);
    } catch (error) {
      console.error('Error loading news from localStorage:', error);
      this.newsList = [];
    }
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
