import { Component, ElementRef, OnInit } from '@angular/core';
import DisableDevtool from 'disable-devtool';
import { SearchService } from './shared/services/search.global.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'architecture';
  constructor(
    private searchService: SearchService,
    private el: ElementRef,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    // DisableDevtool();
    const textContent = this.extractText(this.el.nativeElement);
    this.searchService.indexTextWithRoute(textContent, '/pages');


    if (!localStorage.getItem('language')?.length) {
      localStorage.setItem('language', 'uz');
    }
    this.translateService.setDefaultLang(localStorage.getItem('language') || 'uz');
    this.translateService.use(localStorage.getItem('language') || 'uz');

    console.log(window.innerWidth, window.innerHeight);
  }
  private extractText(element: HTMLElement): string {
    return element.innerText || '';
  }
}
