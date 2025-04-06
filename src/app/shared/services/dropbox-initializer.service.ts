import { Injectable } from '@angular/core';
import { DropboxAuthService } from './dropbox.auth.service';
import { DropboxService } from './dropbox.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class DropboxInitializerService {
  private initialized = false;
  
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private dropboxService: DropboxService,
    private router: Router
  ) {}

  /**
   * Initialize Dropbox authentication
   * This will be called during app initialization
   */
  public async initializeDropbox(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }
    
    console.log('Initializing Dropbox authentication...');
    
    // Check for access token in URL hash first
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      console.log('Found access token in URL hash during initialization');
      const tokenFound = this.dropboxAuthService.setTokenFromUrl(window.location.href);
      
      if (tokenFound) {
        console.log('Successfully set token from URL hash');
        // Clean the URL
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }
    
    // Check if we have a valid token
    if (this.dropboxAuthService.isAuthenticated()) {
      try {
        // Validate the token with a single API call
        await firstValueFrom(this.dropboxService.validateToken());
        console.log('Token validation successful');
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear the token
        this.dropboxAuthService.clearToken();
        // Redirect to login unless we're already there
        if (!window.location.pathname.includes('/auth/dropbox-login')) {
          this.router.navigate(['/auth/dropbox-login']);
        }
        return false;
      }
    } else {
      // No token available
      console.warn('No token available');
      // Redirect to login unless we're already there
      if (!window.location.pathname.includes('/auth/dropbox-login')) {
        this.router.navigate(['/auth/dropbox-login']);
      }
      return false;
    }
  }
} 