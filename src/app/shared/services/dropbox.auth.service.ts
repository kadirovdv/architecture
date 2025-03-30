import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private clientId = environment.appKEY;
  private authUrl = 'https://www.dropbox.com/oauth2/authorize';
  private accessToken: string | null = null;

  accessTokenSubject = new BehaviorSubject<string | null>(null);
  accessToken$ = this.accessTokenSubject.asObservable();

  constructor(private router: Router) {
    // Check for token in session storage on initialization
    this.accessToken = sessionStorage.getItem('accessToken');
    if (this.accessToken) {
      console.log('Token found in session storage on initialization');
      this.accessTokenSubject.next(this.accessToken);
    } else {
      console.log('No token found in session storage');
    }
  }

  /**
   * Get the current host as the redirect URI
   * This ensures authentication works on any domain (localhost, production, etc.)
   */
  private getRedirectUri(): string {
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }

  signInWithPopup(): Promise<string | null> {
    const redirectUri = this.getRedirectUri();
    const storedRoute = sessionStorage.getItem('route');
    
    // Construct the OAuth URL with proper redirect
    const oauthUrl = `${this.authUrl}?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log('Auth URL:', oauthUrl);
    
    return new Promise((resolve, reject) => {
      const popup = window.open(
        oauthUrl,
        'DropboxOAuth',
        'width=600,height=600'
      );

      if (!popup) {
        console.error('Popup blocked by browser');
        reject('Popup blocked by browser. Please allow popups for this site.');
        return;
      }

      const interval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(interval);
            reject('Popup closed by user');
            return;
          }

          if (popup?.location?.hash) {
            const params = new URLSearchParams(popup.location.hash.substring(1));
            this.accessToken = params.get('access_token');
            popup.close();
            clearInterval(interval);
            
            if (this.accessToken) {
              sessionStorage.setItem('accessToken', this.accessToken);
              this.accessTokenSubject.next(this.accessToken);
              console.log('Authentication successful, token saved:', this.accessToken.substring(0, 5) + '...');
            } else {
              console.warn('No access token found in redirect');
            }
            
            resolve(this.accessToken);
          }
        } catch (error) {
          // Ignore cross-origin errors while waiting for auth
          // This happens when checking popup.location while on the OAuth provider domain
        }
      }, 500);
    });
  }

  getAccessToken(): string | null {
    // Check memory first (fastest)
    if (this.accessToken) {
      return this.accessToken;
    }
    
    // Then check session storage (in case it was set in another tab/component)
    const sessionToken = sessionStorage.getItem('accessToken');
    if (sessionToken) {
      this.accessToken = sessionToken;
      this.accessTokenSubject.next(sessionToken);
      return sessionToken;
    }
    
    return null;
  }

  setAccessTokenFromUrl(url: string): void {
    try {
      const fragment = new URL(url).hash.substring(1);
      const params = new URLSearchParams(fragment);
      this.accessToken = params.get('access_token');
      
      if (this.accessToken) {
        console.log('Setting access token from URL redirect:', this.accessToken.substring(0, 5) + '...');
        sessionStorage.setItem('accessToken', this.accessToken);
        this.accessTokenSubject.next(this.accessToken);
      } else {
        console.warn('No access token found in URL fragment');
      }
    } catch (error) {
      console.error('Error parsing access token from URL:', error);
    }
  }

  /**
   * Check if the user is authenticated with Dropbox
   */
  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const hasToken = !!token;
    console.log('isAuthenticated check:', hasToken);
    return hasToken;
  }
  
  /**
   * Initiate authentication from any component
   */
  initiateAuth(returnUrl: string = '/dashboard'): void {
    // Store current route for redirect after auth
    sessionStorage.setItem('route', returnUrl);
    console.log('Initiating auth, return URL set to:', returnUrl);
    this.router.navigate(['/dropbox-login'], { queryParams: { returnUrl } });
  }
  
  /**
   * Sign out from Dropbox
   */
  signOut(): void {
    this.accessToken = null;
    sessionStorage.removeItem('accessToken');
    this.accessTokenSubject.next(null);
    console.log('Signed out from Dropbox');
  }
}
