import { Component } from '@angular/core';
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
  styleUrls: ['./styles/header.styles.scss', './styles/rest.styles.scss'],
})
export class MainPage {
  websiteLessons: any[] = [];
  lang = '';
  private thumbnailsLoaded = new BehaviorSubject<number>(0);

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

    this.thumbnailsLoaded.subscribe(count => {
      if (count > 0 && this.websiteLessons.length > 0 && count === this.websiteLessons.length) {
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
    this.crudService.getDocuments('website-lessons').pipe(
      switchMap((res: unknown) => {
        const lessons = res as Lesson[];

        if (lessons.length === 0) {
          this.websiteLessons = lessons;
          this.loaderService.hide();
          return of(null);
        }

        const thumbnailRequests = lessons.map((lesson, index) =>
          this.dropboxService.getThumbnail(lesson.thumbnail as string).pipe(
            tap(thumbnailRes => {
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
            this.websiteLessons = [...lessons].sort((a: Lesson, b: Lesson) => {
              const dateA = new Date(a.createdAt || '').getTime();
              const dateB = new Date(b.createdAt || '').getTime();
              return dateA - dateB;
            });
            this.loaderService.hide();
          })
        );
      })
    ).subscribe({
      error: (err) => {
        console.error('Error fetching lessons:', err);
        this.loaderService.hide();
      }
    });
  }
}
