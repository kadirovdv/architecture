import { Component, ElementRef, OnInit } from '@angular/core';
import DisableDevtool from 'disable-devtool';
import { SearchService } from './shared/services/search.global.service';
import { TranslateService } from '@ngx-translate/core';
import { DropboxAuthService } from './shared/services/dropbox.auth.service';
import { Router } from '@angular/router';

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
    private dropboxAuthService: DropboxAuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // DisableDevtool();
    // Check for access token in URL hash (typically after OAuth redirect)
    this.checkForDropboxToken();
    
    const textContent = this.extractText(this.el.nativeElement);
    this.searchService.indexTextWithRoute(textContent, '/pages');

    if (!localStorage.getItem('language')?.length) {
      localStorage.setItem('language', 'uz');
    }
    this.translateService.setDefaultLang(localStorage.getItem('language') || 'uz');
    this.translateService.use(localStorage.getItem('language') || 'uz');

    console.log(window.innerWidth, window.innerHeight);
  }

  /**
   * Check for Dropbox access token in URL hash
   */
  private checkForDropboxToken(): void {
    // Only check if there's a hash in the URL
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      console.log('Access token found in URL hash');
      
      // Extract and save the token
      const tokenFound = this.dropboxAuthService.setTokenFromUrl(window.location.href);
      
      if (tokenFound) {
        console.log('Successfully set access token from URL');
        
        // Clean up the URL to remove the token (for security)
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        // Redirect to the original path if one was saved
        const originalPath = this.dropboxAuthService.getOriginalPath();
        if (originalPath && originalPath !== window.location.pathname) {
          console.log('Redirecting to original path:', originalPath);
          this.dropboxAuthService.clearOriginalPath();
          this.router.navigateByUrl(originalPath);
        }
      }
    }
  }
  
  private extractText(element: HTMLElement): string {
    return element.innerText || '';
  }
}
