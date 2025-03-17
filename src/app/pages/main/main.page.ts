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
  lang = '';
  private thumbnailsLoaded = new BehaviorSubject<number>(0);

  currentSlide = 0;
  loading = false;
  private startX = 0;
  private endX = 0;

  @ViewChild('carousel') carousel!: ElementRef;
  @ViewChild('semesterRef') semesterRef!: ElementRef;

  constructor(
    private swiperService: SwiperService,
    private crudService: CrudService,
    private i18n: i18nService,
    private loaderService: LoadingService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {
    window.scroll(0, 0);
  }

  ngOnInit() {
    this.loaderService.show();
    this.getData();
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
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        this.loaderService.hide();
      }
    });
  }

  ngAfterViewInit(): void {
    const swiperConfig = {
      pagination: {
        el: '.swiper-pagination',
        clickable: true,
      },
    };
    this.swiperService.initializeSwiper('.mySwiper', swiperConfig);
  }

  getData() {
    this.crudService
      .getDocuments('website-lessons')
      .pipe(
        switchMap((res: unknown) => {
          const lessons = res as Lesson[];

          if (lessons.length === 0) {
            this.websiteLessons = lessons;
            this.loaderService.hide();
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
              this.websiteLessons = [...lessons].sort(
                (a: Lesson, b: Lesson) => {
                  const dateA = new Date(a.createdAt || '').getTime();
                  const dateB = new Date(b.createdAt || '').getTime();
                  return dateA - dateB;
                }
              );
              this.loaderService.hide();
            })
          );
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Error fetching lessons:', err);
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
}
