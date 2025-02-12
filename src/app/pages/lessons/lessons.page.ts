import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnChanges,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { SwiperService } from 'src/app/shared/services/swiper.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';
import { take } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';

@Component({
  selector: 'app-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
})
export class LessonsPage implements OnInit, AfterViewInit, OnChanges {
  lang = '';
  isOpen = 0;
  globalVar: any;
  chosenSemester: any = null;
  chosenTheme: any = null;

  semester: any = {};
  theme: any = {};
  lessonSelected: string = '';
  lessonSelectedDesc: string = '';
  semesterSelected: string = '';
  themeSelected: string = '';

  currentSlide = 0;
  loading = false;
  private startX = 0;
  private endX = 0;

  @ViewChild('carousel') carousel!: ElementRef;
  @ViewChild('semesterRef') semesterRef!: ElementRef;

  constructor(
    private navService: ToggleNavVisibilityService,
    private crudService: CrudService,
    private swiperService: SwiperService,
    public dropboxService: DropboxService,
    private activatedRoute: ActivatedRoute,
    private i18n: i18nService,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.navService.updateNavState(true);
    this.loadGlobalVars();
    window.scrollTo(0, 0);

    this.i18n.currentData.subscribe((data) => {
      this.lang = data;
      if (this.globalVar) {
        this.lessonSelected = this.globalVar?.lessonTitle[this.lang];
        this.lessonSelectedDesc = this.globalVar?.lessonDesc[this.lang];
        this.themeSelected = this.semester?.themes[0]?.themeTitle[this.lang];
      }
    });
  }

  ngAfterViewInit(): void {
    const swiperConfig: any = {
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
    };
    this.swiperService.initializeSwiper('.mySwiper', swiperConfig);
  }

  ngOnChanges() {}

  toggleDropdown(index: number, event: any = {}): void {
    this.isOpen = index;

    // if(!event.target?.classList.contains('custom')) {}
  }

  loadGlobalVars(): void {
    this.loaderService.showLoader();

    this.crudService
      .getDocumentById('globalVar', this.activatedRoute.snapshot.params['id'])
      .subscribe((res: any) => {
        console.log(res);
        this.globalVar = res;
        this.lessonSelected = this.globalVar?.lessonTitle[this.lang];
        this.lessonSelectedDesc = this.globalVar?.lessonDesc[this.lang];
        this.semester = this.globalVar?.semesters[0];
        this.theme = this.semester.themes[0];

        this.semesterSelected = this.semester?.semester;
        this.themeSelected = this.semester?.themes[0]?.themeTitle[this.lang];

        this.loaderService.hideLoader(true);
      });
  }

  changeData(id: string, mode = false): void {
    this.chosenSemester.globalVar.forEach((item: any) => {
      if (item.id === id) {
        this.chosenTheme = item;
        this.themeSelected = item?.theme || '';
        this.loading = false;
      }
    });

    if (mode) {
      this.carousel.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }

  get fileKeys(): string[] {
    return this.theme ? Object.keys(this.theme.files || {}) : [];
  }

  downloadFile(filePath: string): void {
    this.loaderService.showLoader();
    if (!filePath) return;
    this.dropboxService
      .downloadFile(filePath)
      .pipe(take(1))
      .subscribe({
        next: () => this.loaderService.hideLoader(true),
        error: () => this.loaderService.hideLoader(true),
      });
  }

  nextSlide(): void {
    this.currentSlide =
      (this.currentSlide + 1) % Object.keys(this.theme.files).length;
  }

  prevSlide(): void {
    this.currentSlide =
      (this.currentSlide - 1 + Object.keys(this.theme.files).length) %
      Object.keys(this.theme.files).length;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
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

  sort(data: any[]): any[] {
    return data.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  openFileInNewTab(filePath: any): void {
    this.loaderService.showLoader();
    this.dropboxService.openFileInNewTab(filePath).subscribe(() => {
      this.loaderService.hideLoader(true);
    });
  }
}
