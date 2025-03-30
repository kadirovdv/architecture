import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private clientId = environment.appKEY
  private redirectUri = `http://localhost:4200${sessionStorage.getItem('route')}`; // Replace with your redirect URI
  private authUrl = 'https://www.dropbox.com/oauth2/authorize';
  private accessToken: string | null = null;

  accessTokenSubject = new BehaviorSubject<string | null>(null);
  accessToken$ = this.accessTokenSubject.asObservable();

  constructor(private router: Router) {
    // Check for token in session storage on initialization
    this.accessToken = sessionStorage.getItem('accessToken');
    if (this.accessToken) {
      this.accessTokenSubject.next(this.accessToken);
    }
  }

  signInWithPopup(): Promise<string | null> {
    if(!sessionStorage.getItem('route')) {
      this.redirectUri = `http://localhost:4200/dashboard/manage/sub-themes`;
    }
    const oauthUrl = `${this.authUrl}?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(
      this.redirectUri
    )}`;

    return new Promise((resolve, reject) => {
      const popup = window.open(
        oauthUrl,
        'DropboxOAuth',
        'width=600,height=600'
      );

      const interval = setInterval(() => {
        try {
          if (popup?.location?.hash) {
            const params = new URLSearchParams(popup.location.hash.substring(1));
            this.accessToken = params.get('access_token');
            popup.close();
            clearInterval(interval);
            
            if (this.accessToken) {
              sessionStorage.setItem('accessToken', this.accessToken);
              this.accessTokenSubject.next(this.accessToken);
            }
            
            resolve(this.accessToken);
          }
        } catch (error) {
        }

        if (popup?.closed) {
          clearInterval(interval);
          reject('Popup closed by user');
        }
      }, 500);
    });
  }

  getAccessToken(): string | null {
    return this.accessToken || sessionStorage.getItem('accessToken');
  }

  setAccessTokenFromUrl(url: string): void {
    const fragment = new URL(url).hash.substring(1);
    const params = new URLSearchParams(fragment);
    this.accessToken = params.get('access_token');
    
    if(this.accessToken?.length) {
      sessionStorage.setItem('accessToken', this.accessToken || '');
      this.accessTokenSubject.next(this.accessToken);
    }
  }
  
  /**
   * Check if the user is authenticated with Dropbox
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token;
  }
  
  /**
   * Initiate authentication from any component
   */
  initiateAuth(returnUrl: string = '/dashboard'): void {
    // Store current route for redirect after auth
    sessionStorage.setItem('route', returnUrl);
    this.router.navigate(['/dropbox-login'], { queryParams: { returnUrl } });
  }
  
  /**
   * Sign out from Dropbox
   */
  signOut(): void {
    this.accessToken = null;
    sessionStorage.removeItem('accessToken');
    this.accessTokenSubject.next(null);
  }
}
