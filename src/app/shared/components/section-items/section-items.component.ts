import { AfterViewInit, Component, Inject, LOCALE_ID } from '@angular/core';
import { SwiperService } from '../../services/swiper.service';
import { CrudService } from '../../services/crud.service';
import { i18nService } from '../../services/i18n.service';
import { LoaderService } from '../../services/loader.service';
import { DropboxService } from '../../services/dropbox.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-section-items',
  templateUrl: './section-items.component.html',
  styleUrls: ['./section-items.component.scss'],
})
export class SectionItemsComponent implements AfterViewInit {
  globalVar: any[] = [];
  lang = '';

  constructor(
    private swiperService: SwiperService,
    private crudService: CrudService,
    private i18n: i18nService,
    private loaderService: LoaderService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.getData();
    this.i18n.currentData.subscribe((data) => {
      this.lang = data;
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
    this.loaderService.showLoader();
    this.crudService.getDocuments('globalVar').subscribe(
      (res) => {
        this.globalVar = res || [];
        this.globalVar = this.globalVar.sort((a, b) => {
          const dateA: any = new Date(a.createdAt);
          const dateB: any = new Date(b.createdAt);
          return dateA - dateB;
        });
        if (this.globalVar.length === 0) {
          this.loaderService.hideLoader(true);
        }
        for (let i = 0; i < this.globalVar.length; i++) {
          this.dropboxService
            .getThumbnail(this.globalVar[i].thumbnail)
            .subscribe((res) => {
              this.loaderService.hideLoader(true);
              this.globalVar[i].thumbnail =
                this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(res));
            });
        }
      },
      (err) => {
        this.loaderService.hideLoader(true);
      }
    );
  }
}
