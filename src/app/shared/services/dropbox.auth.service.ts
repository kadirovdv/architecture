import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthService {
  private accessTokenKey = 'access_token'; // Simplified to just use one key
  private originalPathKey = 'originalPath';

  constructor(private router: Router) {}

  /**
   * Check if user is authenticated with any valid token
   */
  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
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
   * Redirect to Dropbox OAuth for authentication
   */
  public loginWithRedirect(): void {
    // Store current path for return after auth
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem(this.originalPathKey, currentPath);
    
    // Clear any existing token first
    this.clearToken();
    
    // Generate authorization URL with correct redirect URI
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    
    // Create authentication URL with the redirect URI
    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${environment.appKEY}&redirect_uri=${redirectUri}`;
    
    console.log('Opening Dropbox Auth URL:', authUrl);
    
    // Open in a new window instead of redirecting the current window
    // This works better in some environments where redirects might be blocked
    const authWindow = window.open(authUrl, '_blank');
    
    if (!authWindow) {
      console.error('Failed to open Dropbox authentication window. Popup might be blocked.');
      alert('Please allow popups for this site to login with Dropbox.');
    }
  }

  /**
   * Set access token
   */
  public setToken(token: string): void {
    if (!token) return;
    console.log('Setting access token');
    sessionStorage.setItem(this.accessTokenKey, token);
  }

  /**
   * Extract and set token from URL hash
   * @returns boolean True if token was found and set
   */
  public setTokenFromUrl(url: string): boolean {
    if (!url.includes('#access_token=')) {
      return false;
    }
    
    console.log('URL contains access token');
    const hash = url.substring(url.indexOf('#') + 1);
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    
    if (token) {
      this.setToken(token);
      return true;
    }
    
    return false;
  }

  /**
   * Get the current access token:
   * 1. First try session storage
   * 2. If not found in session, try environment (except when loginRedirect=true)
   */
  public getAccessToken(loginRedirect = false): string | null {
    // First try session storage
    const sessionToken = sessionStorage.getItem(this.accessTokenKey);
    if (sessionToken) {
      return sessionToken;
    }
    
    // If we're redirecting to login, don't return the environment token
    // This prevents trying to use an expired environment token during login
    if (loginRedirect) {
      return null;
    }
    
    // Fallback to environment token
    return environment.dropboxToken || null;
  }

  public clearToken(): void {
    sessionStorage.removeItem(this.accessTokenKey);
  }
}
