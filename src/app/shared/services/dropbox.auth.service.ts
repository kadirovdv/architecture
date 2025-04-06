import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private accessTokenKey = 'accessToken';
  private tokenTypeKey = 'token_type';
  private originalPathKey = 'originalPath';
  private tokenSourceKey = 'tokenSource'; // Track where the token came from

  constructor(private router: Router) {
    // Check for environment token on service initialization
    this.checkEnvironmentToken();
  }

  /**
   * Check if environment token exists and set it if no token is present
   */
  private checkEnvironmentToken(): void {
    if (!this.isAuthenticated() && environment.dropboxToken) {
      this.setToken(environment.dropboxToken, 'environment');
    }
  }

  /**
   * Check if user is authenticated with any valid token
   */
  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Check if token is expired or invalid
   */
  public isTokenExpired(): boolean {
    const token = this.getAccessToken();
    return !token || token === 'INITIAL_TOKEN_FROM_DROPBOX';
  }

  /**
   * Redirect to login page, storing original path
   */
  public redirectToLogin(originalPath?: string): void {
    // Store the current path for return after authentication
    if (originalPath) {
      sessionStorage.setItem(this.originalPathKey, originalPath);
    } else {
      sessionStorage.setItem(this.originalPathKey, window.location.pathname + window.location.search);
    }
    
    // Navigate to the Dropbox login page
    this.router.navigate(['/auth/dropbox-login']);
  }

  /**
   * Get the original path that was requested before authentication
   */
  public getOriginalPath(): string {
    return sessionStorage.getItem(this.originalPathKey) || '/dashboard';
  }

  /**
   * Clear the stored original path
   */
  public clearOriginalPath(): void {
    sessionStorage.removeItem(this.originalPathKey);
  }

  /**
   * Open Dropbox login in a new tab
   */
  public loginWithRedirect(): void {
    // Store current path for return after auth
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem('returnPath', currentPath);
    
    // Generate authorization URL
    const validRedirectUri = `${encodeURIComponent(window.location.origin)}/auth/dropbox-login`;
    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${environment.appKEY}&redirect_uri=${validRedirectUri}`;
    
    // Open in new tab
    window.open(authUrl, '_blank');
  }

  /**
   * Set token with optional source tracking
   */
  public setToken(token: string, source: 'environment' | 'user' = 'user'): void {
    sessionStorage.setItem(this.accessTokenKey, token);
    sessionStorage.setItem(this.tokenSourceKey, source);
  }

  /**
   * Extract and set token from URL hash
   */
  public setTokenFromUrlHash(hash: string): void {
    const params = new URLSearchParams(hash.replace('#', ''));
    const accessToken = params.get('access_token');
    const tokenType = params.get('token_type');

    if (accessToken && tokenType) {
      sessionStorage.setItem(this.accessTokenKey, accessToken);
      sessionStorage.setItem(this.tokenTypeKey, tokenType);
      sessionStorage.setItem(this.tokenSourceKey, 'user'); // User provided token
    }
  }

  /**
   * Extract token from full URL
   */
  public setAccessTokenFromUrl(url: string): void {
    if (url.includes('#access_token=')) {
      const hash = url.substring(url.indexOf('#') + 1);
      this.setTokenFromUrlHash(hash);
    }
  }

  /**
   * Get the current access token
   */
  public getAccessToken(): string | null {
    return sessionStorage.getItem(this.accessTokenKey);
  }

  /**
   * Get the token type
   */
  public getTokenType(): string | null {
    return sessionStorage.getItem(this.tokenTypeKey);
  }

  /**
   * Get the source of the current token
   */
  public getTokenSource(): 'environment' | 'user' | null {
    return sessionStorage.getItem(this.tokenSourceKey) as 'environment' | 'user' | null;
  }

  /**
   * Clear all token information
   */
  public clearToken(): void {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.tokenTypeKey);
    sessionStorage.removeItem(this.tokenSourceKey);
  }

  /**
   * Open Dropbox home in a new tab
   */
  public openDropboxInNewTab(): void {
    const url = 'https://www.dropbox.com/home';
    window.open(url, '_blank');
  }
}
