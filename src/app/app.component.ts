import { Component, ElementRef, OnInit } from '@angular/core';
import DisableDevtool from 'disable-devtool';
import { SearchService } from './shared/services/search.global.service';
import { TranslateService } from '@ngx-translate/core';
import { DropboxAuthService } from './shared/services/dropbox.auth.service';

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
    private translateService: TranslateService,
    private dropboxAuthService: DropboxAuthService
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

    // Handle access token in URL hash when not on login page
    const fragment = window.location.hash;
    if (fragment && fragment.includes('access_token=') && !window.location.pathname.includes('dropbox-login')) {
      console.log('Found access token in URL while not on login page, processing...');
      this.dropboxAuthService.setAccessTokenFromUrl(window.location.href);
      
      // Clean up the URL
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.href.split('#')[0];
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }
  private extractText(element: HTMLElement): string {
    return element.innerText || '';
  }
}
