import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { SwiperService } from 'src/app/shared/services/swiper.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
  styleUrls: ['./styles/header.styles.scss', './styles/rest.styles.scss'],
})
export class MainPage {
  websiteLessons: any[] = [];
  lang = '';
  constructor(
    private swiperService: SwiperService,
    private crudService: CrudService,
    private i18n: i18nService,
    private loaderService: LoaderService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {
    window.scroll(0, 0);
  }

  ngOnInit() {
    this.loaderService.showLoader();
    this.getData();
    this.i18n.currentData.subscribe((lang) => {
      this.lang = lang;
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
    this.crudService.getDocuments('website-lessons').subscribe(
      (res) => {
        this.websiteLessons = res || [];
        this.websiteLessons = this.websiteLessons.sort((a, b) => {
          const dateA: any = new Date(a.createdAt);
          const dateB: any = new Date(b.createdAt);
          return dateA - dateB;
        });
        console.log(this.websiteLessons);
        if (this.websiteLessons.length === 0) {
          this.loaderService.hideLoader(true);
        }
        for (let i = 0; i < this.websiteLessons.length; i++) {
          this.dropboxService
            .getThumbnail(this.websiteLessons[i].thumbnail)
            .subscribe((res) => {
              this.loaderService.hideLoader(true);
              this.websiteLessons[i].thumbnail =
                this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(res));
            });
        }
      },
      (err) => {
        this.loaderService.hideLoader(true);
        this.loaderService.hideLoader();
      }
    );
  }
}
