import { Injectable } from '@angular/core';
import { DropboxAuthService } from './dropbox.auth.service';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { DropboxService } from './dropbox.service';

@Injectable({
  providedIn: 'root'
})
export class DropboxTokenManagerService {
  
  constructor(
    private dropboxAuthService: DropboxAuthService,
    private dropboxService: DropboxService
  ) {}

  /**
   * Check if the Dropbox token is valid and redirect to login if not
   * @returns Observable<boolean> - true if token is valid, redirects if not
   */
  public ensureValidToken(): Observable<boolean> {
    // If token is already known to be expired, redirect immediately
    if (this.dropboxAuthService.isTokenExpired()) {
      this.dropboxAuthService.redirectToLogin();
      return throwError(() => new Error('Token expired'));
    }
    
    // If we have a token, verify it with a lightweight API call
    return this.dropboxService.listFiles('/').pipe(
      tap(() => {
        console.log('Dropbox token verified successfully');
      }),
      catchError(error => {
        console.error('Dropbox token validation failed:', error);
        
        // If API call failed with 401, redirect to login
        if (error.status === 401) {
          this.dropboxAuthService.clearToken();
          this.dropboxAuthService.redirectToLogin();
        }
        
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Check token before component initialization
   * @returns Promise<boolean> - Promise that resolves to true if token is valid
   */
  public validateTokenOnInit(): Promise<boolean> {
    // For components to use in route guards or resolvers
    return new Promise((resolve, reject) => {
      if (this.dropboxAuthService.isTokenExpired()) {
        this.dropboxAuthService.redirectToLogin();
        reject('Token expired');
        return;
      }
      
      resolve(true);
    });
  }
} 