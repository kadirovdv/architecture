import { Injectable } from '@angular/core';
import { DropboxAuthService } from './dropbox.auth.service';
import { DropboxService } from './dropbox.service';
import { environment } from 'src/environments/environment';
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
    
    // Check if we already have a token from previous login
    const existingToken = this.dropboxAuthService.getAccessToken();
    const tokenSource = this.dropboxAuthService.getTokenSource();
    
    if (existingToken) {
      console.log(`Using existing token from ${tokenSource || 'unknown'} source`);
      
      // Verify if the existing token is valid using the account endpoint
      try {
        await firstValueFrom(this.dropboxService.validateToken());
        console.log('Existing token is valid');
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Existing token is invalid, will try environment token');
        this.dropboxAuthService.clearToken();
      }
    }
    
    // Try to use the environment token
    const envToken = environment.dropboxToken;
    if (envToken) {
      // Set the token from environment
      this.dropboxAuthService.setToken(envToken, 'environment');
      
      try {
        // Verify the token with the account endpoint
        await firstValueFrom(this.dropboxService.validateToken());
        console.log('Environment token is valid');
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Environment token is invalid:', error);
        
        // Clear the invalid token
        this.dropboxAuthService.clearToken();
        
        // If we're not already on the login page, redirect there
        if (!window.location.pathname.includes('/auth/dropbox-login')) {
          this.router.navigate(['/auth/dropbox-login']);
        }
        
        return false;
      }
    } else {
      console.warn('No environment token found');
      
      // If we're not already on the login page, redirect there
      if (!window.location.pathname.includes('/auth/dropbox-login')) {
        this.router.navigate(['/auth/dropbox-login']);
      }
      
      return false;
    }
  }
} 